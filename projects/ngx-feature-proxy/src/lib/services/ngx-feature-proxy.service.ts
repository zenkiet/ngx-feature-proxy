import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { defer } from 'rxjs';
import { EVENTS, IContext, UnleashClient } from 'unleash-proxy-client';
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

  constructor() {
    this._listenToEvents();
    this._initialize();
  }

  ngOnDestroy(): void {
    this._client.stop();
    this._cache.clear();
  }

  /**
   * Check if feature is enabled (sync)
   */
  isEnabled = (feature: string): boolean => this._client.isEnabled(feature);

  /**
   * Check if feature is disabled (sync)
   */
  isDisabled = (feature: string): boolean => !this.isEnabled(feature);

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
  features(names: string[], operator: 'and' | 'or' = 'or'): boolean {
    if (names.length === 0) return false;
    if (names.length === 1) return this.feature(names[0]);

    const states = names.map((name) => this.feature(name));
    return operator === 'and' ? states.every(Boolean) : states.some(Boolean);
  }

  /**
   * Get feature variant
   */
  getVariant(feature: string) {
    return this._client.getVariant(feature);
  }

  /**
   * Update context
   */
  updateContext(context: Record<string, string | number | boolean>) {
    return defer(() => this._client.updateContext(context));
  }

  /**
   * Force refresh toggles
   * */
  refresh() {
    return defer(() => this._client.updateToggles());
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private Methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Initialize the client
   */
  private _initialize() {
    this._client
      .start()
      .then(() => this.$state.set({ ...this.$state(), initialized: true, ready: true }))
      .catch((error) => this.$state.set({ ...this.$state(), error }));
  }

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
