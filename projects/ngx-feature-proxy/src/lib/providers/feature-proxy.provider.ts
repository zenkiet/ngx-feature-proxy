import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { FeatureProxyService } from '../services';
import { FeatureProxyConfig, UNLEASH_TOKEN } from '../tokens';

export function provideFeatureProxy(config: FeatureProxyConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UNLEASH_TOKEN,
      useValue: {
        refreshInterval: 30,
        metricsInterval: 60,
        disableMetrics: false,
        bootstrap: [],
        bootstrapOverride: true,
        debug: false,
        ...config,
      },
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (service: FeatureProxyService) => () => service.initialize(),
      deps: [FeatureProxyService],
      multi: true,
    },
  ]);
}
