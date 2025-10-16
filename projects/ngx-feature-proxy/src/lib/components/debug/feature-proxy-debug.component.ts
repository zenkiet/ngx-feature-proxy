import { DatePipe, JsonPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FeatureProxyService } from '../../services';
import { FormatJsonPipe } from './../../pipes';

@Component({
  standalone: true,
  selector: 'feature-proxy-debug',
  templateUrl: './feature-proxy-debug.component.html',
  styleUrls: ['./feature-proxy-debug.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  imports: [DatePipe, JsonPipe, NgClass, FormatJsonPipe, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureProxyDebugComponent {
  /** Constants */

  /** States */
  $isOpen = signal(false);
  $activeTab = signal<string>('overview');
  $isPulsing = signal(true);

  $copyState = signal<'idle' | 'pending' | 'success' | 'error'>('idle');

  /** Services */
  private _service = inject(FeatureProxyService);
  config = this._service.config;

  $state = this._service.$state;
  $snapshot = this._service.$debug;
  $refreshing = this._service.refreshing;

  $contextSummary = computed(() => {
    const context = this.$snapshot().context ?? ({} as Record<string, unknown>);
    const { properties = {}, ...rest } = context;

    const entries = Object.entries(rest).filter(
      ([, value]) => value !== undefined && value !== null && `${value}`.length > 0
    );
    const propertyEntries = Object.entries(properties as Record<string, unknown>).filter(
      ([, value]) => value !== undefined && value !== null && `${value}`.length > 0
    );

    return {
      entries,
      propertyEntries,
    };
  });

  //-------------------------------------------------------------------------------------------------------
  // @ LifeCycle Hooks
  // ------------------------------------------------------------------------------------------------------

  constructor() {
    effect(
      () => {
        const isOpen = this.$isOpen();

        if (isOpen) {
          this.refresh();
          if (this.$isPulsing()) {
            this.$isPulsing.set(false);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public Methods
  // ------------------------------------------------------------------------------------------------------

  closePanel(event?: Event): void {
    event?.stopPropagation();
    this.$isOpen.set(false);
  }

  refresh = () => this._service.refreshDebug$.next();

  copyClipboard(text: unknown): void {
    const result = JSON.stringify(text, null, 2);

    if (!result?.trim()) {
      return;
    }
    this.$copyState.set('pending');

    navigator.clipboard
      .writeText(result)
      .then(() => this.$copyState.set('success'))
      .catch(() => this.$copyState.set('error'))
      .finally(() => {
        setTimeout(() => this.$copyState.set('idle'), 1000);
      });
  }
}
