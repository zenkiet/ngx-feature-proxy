import { NgIf } from '@angular/common';
import { Directive, computed, effect, inject, input } from '@angular/core';
import { NgxFeatureProxyService } from '../services';

@Directive({
  selector: '[featureProxy]',
  standalone: true,
  hostDirectives: [NgIf],
})
export class FeatureProxyDirective {
  /** Inputs */
  $featureEnabled = input.required<string | string[]>({ alias: 'featureEnabled' });

  /** Services */
  private _service = inject(NgxFeatureProxyService);
  private _ngIf = inject(NgIf);

  /** Computed */
  $currentState = computed(() => {
    const value = this.$featureEnabled();

    if (Array.isArray(value)) {
      return value.some((flag) => this._service.isEnabled(flag));
    }

    if (typeof value !== 'string') {
      console.error('Expression is not a string:', value);
      return false;
    }

    if (/[^\w\s()&|!]/.test(value.trim())) {
      console.error('Expression contains invalid characters:', value);
      return false;
    }

    const prepared = value.trim().replace(/\b([A-Za-z0-9_]+)\b/g, (_, name) => {
      return `svc.isEnabled('${name}')`;
    });

    try {
      return new Function('svc', `return (${prepared});`)(this._service);
    } catch {
      console.error('Error evaluating expression:', value);
      return false;
    }
  });

  // --------------------------------------------------------------------------
  // Lifecycle Hooks
  // --------------------------------------------------------------------------

  constructor() {
    effect(
      () => {
        this._ngIf.ngIf = this.$currentState();
      },
      { allowSignalWrites: true }
    );
  }
}
