import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { NgxFeatureProxyService } from '../services';

export function featureProxyGuard(
  predicate: (service: NgxFeatureProxyService) => boolean,
  redirectTo?: string | UrlTree
): CanActivateFn {
  return () => {
    const service = inject(NgxFeatureProxyService);
    const router = inject(Router);
    const allow = predicate(service);

    if (allow) return true;
    if (!redirectTo) return false;

    return typeof redirectTo === 'string' ? router.parseUrl(redirectTo) : redirectTo;
  };
}
