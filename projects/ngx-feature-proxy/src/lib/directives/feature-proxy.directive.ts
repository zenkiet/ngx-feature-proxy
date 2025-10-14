import { NgIf } from '@angular/common';
import { Directive, computed, effect, inject, input } from '@angular/core';
import { FeatureProxyService } from '../services';

@Directive({
  selector: '[featureProxy]',
  standalone: true,
  hostDirectives: [NgIf],
})
export class FeatureProxyDirective {
  /** Inputs */
  $featureEnabled = input.required<string | string[]>({ alias: 'featureEnabled' });

  /** Services */
  private _service = inject(FeatureProxyService);
  private _ngIf = inject(NgIf);

  /** Computed */
  $currentState = computed(() => {
    const value = this.$featureEnabled();

    if (Array.isArray(value)) {
      return value.some((flag) => this._service.isEnabled(flag));
    }

    return this._service.eval(value);
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
