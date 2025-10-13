import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { IConfig } from 'unleash-proxy-client';
import { NgxFeatureProxyService } from '../services';
import { UNLEASH_TOKEN } from '../tokens';

export type NgxFeatureProxyConfig = IConfig;

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
        ...config,
      },
    },
    provideAppInitializer(() => void inject(NgxFeatureProxyService)),
  ]);
}
