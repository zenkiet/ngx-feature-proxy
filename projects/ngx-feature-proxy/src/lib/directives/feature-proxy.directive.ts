import { NgIf, NgIfContext } from '@angular/common';
import { Directive, TemplateRef, computed, effect, inject, input } from '@angular/core';
import { NgxFeatureProxyService } from '../services';

/**
 * Structural directive that shows or hides content based on the state of one or
 * more feature flags. The directive accepts either:
 *
 *  - A single feature name (string)
 *  - An array of feature names (treated as an OR condition)
 *  - A boolean expression string using `&&`, `||`, `!` and parentheses.
 *
 * If no operator is specified, arrays default to OR behaviour (any flag true)
 * and expression strings are evaluated directly. You can optionally provide
 * an `else` template using the `featureEnabledElse` input.
 *
 * @example
 * ```html
 * <!-- Single feature -->
 * <div *featureEnabled="'betaFeature'">Beta feature is ON</div>
 *
 * <!-- Multiple features (OR) -->
 * <div *featureEnabled="['flagA', 'flagB']">A or B is enabled</div>
 *
 * <!-- Expression with AND/OR -->
 * <div *featureEnabled="'flagA && flagB || !flagC'">
 *   This shows when both A and B are on, or C is off
 * </div>
 *
 * <!-- With else template -->
 * <div *featureEnabled="'premium' ; else: premiumElse">Welcome premium user</div>
 * <ng-template #premiumElse>Upgrade to premium!</ng-template>
 * ```
 */
@Directive({
  selector: '[featureEnabled]',
  standalone: true,
  hostDirectives: [NgIf],
})
export class FeatureEnabledSimpleDirective {
  $featureEnabled = input.required<string | string[]>({ alias: 'featureEnabled' });
  $elseTemplate = input<TemplateRef<NgIfContext<boolean>> | null>(null, {
    alias: 'featureEnabledElse',
  });

  /** Services */
  private _service = inject(NgxFeatureProxyService);
  private _ngIf = inject(NgIf);

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

  constructor() {
    effect(
      () => {
        this._ngIf.ngIf = this.$currentState();
        this._ngIf.ngIfElse = this.$elseTemplate();
      },
      { allowSignalWrites: true }
    );
  }
}
