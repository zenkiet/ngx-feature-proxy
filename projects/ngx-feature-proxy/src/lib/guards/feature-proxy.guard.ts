import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { FeatureProxyService } from '../services';

interface FeatureProxyGuard {
  expression?: string | string[];
  predicate?: (service: FeatureProxyService) => boolean;
  redirectTo?: string | UrlTree;
}

export function featureProxyGuard({
  expression,
  predicate,
  redirectTo,
}: FeatureProxyGuard): CanActivateFn {
  return () => {
    const service = inject(FeatureProxyService);
    const router = inject(Router);

    if (!!expression === !!predicate) {
      console.error('Please provide either expression or predicate, but not both.');
      return false;
    }

    let allow = false;
    if (expression) {
      if (Array.isArray(expression)) {
        allow = expression.every((flag) => service.isEnabled(flag));
      } else {
        allow = service.eval(expression);
      }
    } else if (predicate) {
      allow = predicate(service);
    }

    if (allow) return true;
    if (!redirectTo) return false;

    return typeof redirectTo === 'string' ? router.parseUrl(redirectTo) : redirectTo;
  };
}
