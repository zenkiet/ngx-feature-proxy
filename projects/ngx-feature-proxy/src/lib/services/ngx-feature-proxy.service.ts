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
  private initPromise: Promise<void> | null = null;

  /** Services */
  private _config = inject(UNLEASH_TOKEN);
  private _client = new UnleashClient(this._config);

  constructor() {
    // Listen to client events
    const events = [
      [EVENTS.INIT, () => this.$state.set({ ...this.$state(), initialized: true })],
      [
        EVENTS.READY,
        () =>
          this.$state.set({
            ...this.$state(),
            ready: true,
            lastUpdate: Date.now(),
          }),
      ],
      [
        EVENTS.UPDATE,
        () =>
          this.$state.set({
            ...this.$state(),
            lastUpdate: Date.now(),
          }),
      ],
      [
        EVENTS.ERROR,
        (error: unknown) =>
          this.$state.set({
            ...this.$state(),
            error,
          }),
      ],
      [EVENTS.IMPRESSION, (event: ImpressionEvent) => this.$impression.set(event)],
    ] as const;
    events.forEach(([event, handler]) => {
      this._client.on(event, handler);
    });

    // Auto-initialize
    void this.initialize();
  }

  ngOnDestroy(): void {
    this._client.stop();
    this._cache.clear();
  }

  /**
   * Initialize the client
   */
  initialize() {
    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        defer(() => this._client.start()).subscribe({
          next: () => {
            this.$state.set({ ...this.$state(), initialized: true, ready: true });
            resolve();
          },
          error: (error) => {
            this.$state.set({ ...this.$state(), error });
            reject(error);
          },
        });
      });
    }
    return this.initPromise;
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
}
