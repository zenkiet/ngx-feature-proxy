import {
  APP_INITIALIZER,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { IConfig } from 'unleash-proxy-client';
import { AngularHelper } from '../helpers';
import { NgxFeatureProxyService } from '../services';
import { UNLEASH_TOKEN } from '../tokens';

export interface NgxFeatureProxyConfig extends IConfig {
  debug?: boolean;
}

export function provideFeatureProxy(config: NgxFeatureProxyConfig): EnvironmentProviders {
  const version = AngularHelper.version();

  const providers = [];

  if (version >= 19) {
    providers.push(provideAppInitializer(() => inject(NgxFeatureProxyService).initialize()));
  } else if (version >= 14) {
    providers.push({
      provide: APP_INITIALIZER,
      useFactory: (service: NgxFeatureProxyService) => () => service.initialize(),
      deps: [NgxFeatureProxyService],
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
