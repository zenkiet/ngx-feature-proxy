import {
  ApplicationRef,
  ComponentRef,
  createComponent,
  DestroyRef,
  EmbeddedViewRef,
  EnvironmentInjector,
  inject,
  Injectable,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer, delay, skipWhile, Subject, tap } from 'rxjs';
import { EVENTS, IContext, IToggle, IVariant, UnleashClient } from 'unleash-proxy-client';
import { FeatureProxyDebugComponent } from '../components';
import { FeatureProxyConfig, UNLEASH_TOKEN } from '../tokens';

export interface FeatureProxyDebugSnapshot {
  config: FeatureProxyConfig;
  context: IContext;
  toggles: IToggle[];
  cachedFlags: string[];
  updated: number;
}

@Injectable({ providedIn: 'root' })
export class FeatureProxyService implements OnDestroy {
  /** States */
  $state = signal({
    ready: false,
    error: null as unknown,
    updated: Date.now(),
  });
  $debug = signal<FeatureProxyDebugSnapshot>({
    config: {} as FeatureProxyConfig,
    context: {} as IContext,
    toggles: [],
    cachedFlags: [],
    updated: Date.now(),
  });

  /** Services */
  config = inject(UNLEASH_TOKEN);
  private _appRef = inject(ApplicationRef);
  private _injector = inject(EnvironmentInjector);
  private _destroyRef = inject(DestroyRef);

  private _client = new UnleashClient(this.config);
  private _componentDebugRef?: ComponentRef<FeatureProxyDebugComponent>;
  private _cache = new Map<string, boolean>();

  refreshing = signal(false);
  refreshDebug$ = new Subject<void>();

  // -----------------------------------------------------------------------------------------------------
  // @ LifeCycle Hooks
  // -----------------------------------------------------------------------------------------------------

  constructor() {
    this._listenToEvents();

    if (this.config.debug) {
      import('../components/debug/feature-proxy-debug.component').then(
        ({ FeatureProxyDebugComponent }) => {
          this._componentDebugRef = createComponent(FeatureProxyDebugComponent, {
            environmentInjector: this._injector,
          });

          this._appRef.attachView(this._componentDebugRef.hostView);

          const domElem = (
            this._componentDebugRef.hostView as EmbeddedViewRef<FeatureProxyDebugComponent>
          ).rootNodes[0] as HTMLElement;
          document.body.appendChild(domElem);

          this._componentDebugRef.onDestroy(() => {
            this._appRef.detachView(this._componentDebugRef!.hostView);
          });
        }
      );
    }

    this.refreshDebug$
      .pipe(
        skipWhile(() => !this._client.isReady() || this.config.debug === false),
        tap(() => {
          this.refreshing.set(true);
          this.$debug.update((s) => ({
            ...s,
            config: this.config,
            context: this._client.getContext(),
            toggles: this._client.getAllToggles(),
            cachedFlags: Array.from(this._cache.keys()),
            updated: Date.now(),
          }));
        }),
        delay(300),
        tap(() => this.refreshing.set(false)),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this._client.stop();
    this._cache.clear();
    this._componentDebugRef?.destroy();
    this.refreshDebug$.complete();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public Methods
  // -----------------------------------------------------------------------------------------------------

  isEnabled = (feature: string): boolean => this._client.isEnabled(feature);

  isDisabled = (feature: string): boolean => !this.isEnabled(feature);

  getVariant = (feature: string): IVariant => this._client.getVariant(feature);

  updateContext = (context: Record<string, string | number | boolean>) =>
    defer(() => this._client.updateContext({ ...this._client.getContext(), ...context })).pipe(
      tap(() => this.refreshDebug$.next())
    );

  refresh = () =>
    defer(() => this._client.updateToggles()).pipe(tap(() => this.refreshDebug$.next()));

  /**
   * Get reactive signal
   */
  feature(name: string): boolean {
    if (!this._cache.has(name)) {
      this._client.isEnabled(name);
      this._cache.set(name, this._client.isEnabled(name));
    }
    return this._cache.get(name) ?? false;
  }

  /**
   * Get multiple features
   */
  features(expression: string | string[]): boolean {
    if (Array.isArray(expression)) {
      return expression.every((flag) => this.isEnabled(flag));
    }

    if (typeof expression !== 'string' || !expression.trim()) {
      console.error('Expression is not a valid non-empty string:', expression);
      return false;
    }

    if (/^(?!.*(?:(?<![&])[&](?![&])|(?<!\|)\|(?!\|)))[\w\s()\-!&|]+$/.test(expression) === false) {
      console.error('Expression contains invalid characters:', expression);
      return false;
    }

    const prepared = expression.trim().replace(/[A-Za-z_][\w-]*/g, (name) => {
      return `this.feature('${name}')`;
    });

    try {
      return new Function(`return (${prepared});`).call(this);
    } catch {
      console.error('Error evaluating expression:', expression);
      return false;
    }
  }

  /**
   * Evaluate expression
   */
  eval(expr: string): boolean {
    if (typeof expr !== 'string' || !expr.trim()) {
      console.error('Expression is not a valid non-empty string:', expr);
      return false;
    }

    if (/^(?!.*(?:(?<![&])[&](?![&])|(?<!\|)\|(?!\|)))[\w\s()\-!&|]+$/.test(expr) === false) {
      console.error('Invalid expression:', expr);
      return false;
    }

    try {
      const prepared = expr
        .trim()
        .replace(/[A-Za-z_][\w-]*/g, (_, flag) => `this.isEnabled('${flag}')`);
      return new Function(`return (${prepared});`).call(this);
    } catch {
      console.error('Error evaluating expression:', expr);
      return false;
    }
  }

  /**
   * Initialize the client
   */
  initialize() {
    this._client
      .start()
      .then(() =>
        this.$state.update((s) => ({
          ...s,
          init: true,
          ready: this._client.isReady(),
          updated: Date.now(),
        }))
      )
      .catch((error) => this.$state.update((s) => ({ ...s, error })));
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private Methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Listen to client events
   */
  private _listenToEvents() {
    // Listen to client events
    this._client.on(EVENTS.INIT, () => {
      this.$state.update((s) => ({ ...s, initialized: true, updated: Date.now() }));
    });
    this._client.on(EVENTS.READY, () => {
      this.$state.update((s) => ({ ...s, ready: true, updated: Date.now() }));
    });
    this._client.on(EVENTS.UPDATE, () => {
      this.$state.set({ ...this.$state(), updated: Date.now() });
    });
    this._client.on(EVENTS.ERROR, (error: unknown) => {
      this.$state.update((s) => ({ ...s, error }));
    });
  }
}
