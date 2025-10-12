import {
  EnvironmentProviders,
  inject,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { IConfig } from 'unleash-proxy-client';
import { NgxFeatureProxyService } from '../services';
import { UNLEASH_TOKEN } from '../tokens';

export interface NgxFeatureProxyConfig extends IConfig {
  devMode?: boolean;
}

export function provideFeatureProxy(config: NgxFeatureProxyConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: UNLEASH_TOKEN,
      useValue: {
        refreshInterval: 30,
        metricsInterval: 60,
        disableMetrics: false,
        bootstrap: [],
        bootstrapOverride: true,
        devMode: isDevMode(),
        ...config,
      },
    },
    provideAppInitializer(() => {
      const service = inject(NgxFeatureProxyService);
      return service.initialize();
    }),
  ]);
}
