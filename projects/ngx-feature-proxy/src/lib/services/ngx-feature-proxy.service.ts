import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { defer } from 'rxjs';
import { EVENTS, IContext, IVariant, UnleashClient } from 'unleash-proxy-client';
import { UNLEASH_TOKEN } from '../tokens';
import { ImpressionEvent } from '../types';

@Injectable({ providedIn: 'root' })
export class NgxFeatureProxyService implements OnDestroy {
  /** States */
  $state = signal({
    initialized: false,
    ready: false,
    error: null as unknown,
    lastUpdate: 0,
  });
  $impression = signal<ImpressionEvent>({
    eventType: '',
    eventId: '',
    context: {} as IContext,
    enabled: false,
    featureName: '',
    impressionData: false,
  });

  private _cache = new Map<string, boolean>();

  /** Services */
  private _config = inject(UNLEASH_TOKEN);
  private _client = new UnleashClient(this._config);

  // -----------------------------------------------------------------------------------------------------
  // @ LifeCycle Hooks
  // -----------------------------------------------------------------------------------------------------

  constructor() {
    this._listenToEvents();
  }

  ngOnDestroy(): void {
    this._client.stop();
    this._cache.clear();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public Methods
  // -----------------------------------------------------------------------------------------------------

  isEnabled = (feature: string): boolean => this._client.isEnabled(feature);

  isDisabled = (feature: string): boolean => !this.isEnabled(feature);

  getVariant = (feature: string): IVariant => this._client.getVariant(feature);

  updateContext = (context: Record<string, string | number | boolean>) =>
    defer(() => this._client.updateContext(context));

  refresh = () => defer(() => this._client.updateToggles());

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
  features(expression: string): boolean {
    if (typeof expression !== 'string' || !expression.trim()) {
      console.error('Expression is not a valid non-empty string:', expression);
      return false;
    }

    if (/[^\\w\\s()&|!]/.test(expression.trim())) {
      console.error('Expression contains invalid characters:', expression);
      return false;
    }

    const prepared = expression.trim().replace(/\b([A-Za-z0-9_]+)\b/g, (_, name) => {
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

    if (/[^\w\s()&|!]/.test(expr)) {
      console.error('Invalid expression:', expr);
      return false;
    }
    try {
      const prepared = expr
        .trim()
        .replace(/\b([A-Za-z0-9_]+)\b/g, (_, flag) => `this.isEnabled('${flag}')`);
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
      .then(() => this.$state.set({ ...this.$state(), initialized: true, ready: true }))
      .catch((error) => this.$state.set({ ...this.$state(), error }));
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private Methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Listen to client events
   */
  private _listenToEvents() {
    // Listen to client events
    this._client.on(EVENTS.INIT, () => this.$state.set({ ...this.$state(), initialized: true }));
    this._client.on(EVENTS.READY, () =>
      this.$state.set({ ...this.$state(), ready: true, lastUpdate: Date.now() })
    );
    this._client.on(EVENTS.UPDATE, () =>
      this.$state.set({ ...this.$state(), lastUpdate: Date.now() })
    );
    this._client.on(EVENTS.ERROR, (error: unknown) => this.$state.set({ ...this.$state(), error }));
    this._client.on(EVENTS.IMPRESSION, (event: ImpressionEvent) => this.$impression.set(event));
  }
}
