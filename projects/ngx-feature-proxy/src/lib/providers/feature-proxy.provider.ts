import {
  APP_INITIALIZER,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { AngularHelper } from '../helpers';
import { FeatureProxyService } from '../services';
import { FeatureProxyConfig, UNLEASH_TOKEN } from '../tokens';

export function provideFeatureProxy(config: FeatureProxyConfig): EnvironmentProviders {
  const version = AngularHelper.version();

  const providers = [];

  if (version >= 19) {
    providers.push(provideAppInitializer(() => inject(FeatureProxyService).initialize()));
  } else if (version >= 14) {
    providers.push({
      provide: APP_INITIALIZER,
      useFactory: (service: FeatureProxyService) => () => service.initialize(),
      deps: [FeatureProxyService],
      multi: true,
    });
  }

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
    ...providers,
  ]);
}
