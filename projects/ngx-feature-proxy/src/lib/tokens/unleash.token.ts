import { InjectionToken } from '@angular/core';
import { IConfig } from 'unleash-proxy-client';

export const UNLEASH_TOKEN = new InjectionToken<IConfig>('', {
  factory: () => {
    throw new Error('UNLEASH_TOKEN not provided. Use provideFeatureProxy() in your app config.');
  },
});
