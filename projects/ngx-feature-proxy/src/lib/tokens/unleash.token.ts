import { InjectionToken } from '@angular/core';
import { IConfig } from 'unleash-proxy-client';

export interface FeatureProxyConfig extends IConfig {
  debug?: boolean;
}

export const UNLEASH_TOKEN = new InjectionToken<FeatureProxyConfig>('', {
  factory: () => {
    throw new Error('UNLEASH_TOKEN not provided. Use provideFeatureProxy() in your app config.');
  },
});
