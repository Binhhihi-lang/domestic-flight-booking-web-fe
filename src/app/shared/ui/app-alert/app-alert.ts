import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type AlertTone = 'success' | 'info' | 'warning' | 'error';

/**
 * Thông báo 4 mức, biến thể "nền nhạt + vạch trái".
 *
 * Vì sao dùng Material icon thay vì emoji: emoji render khác nhau trên từng
 * máy, không đổi được màu theo trạng thái, và lệch hẳn với phần icon còn lại.
 */
@Component({
  selector: 'app-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="alert" [class]="toneClass()" role="status">
      <mat-icon class="alert__icon" aria-hidden="true">{{ iconName() }}</mat-icon>
      <div class="alert__text">
        <strong class="alert__title">{{ title() }}</strong>
        @if (message()) {
          <p class="alert__message">{{ message() }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .alert {
      display: flex;
      gap: 11px;
      align-items: flex-start;
      padding: 12px 15px;
      border-radius: var(--radius);
      border-left: 3px solid currentColor;
    }

    .alert__icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
      margin-top: 1px;
    }

    .alert__title {
      display: block;
      font-family: var(--font-heading);
      font-size: var(--text-small);
      margin-bottom: 2px;
    }

    .alert__message {
      margin: 0;
      font-size: var(--text-small);
      line-height: var(--leading-normal);
      opacity: 0.9;
    }

    .alert--success {
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
    }
    .alert--info {
      background: var(--color-info-soft);
      color: var(--color-on-info-soft);
    }
    .alert--warning {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .alert--error {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
  `,
})
export class AppAlert {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly tone = input<AlertTone>('info');

  protected readonly toneClass = computed(() => `alert--${this.tone()}`);

  protected readonly iconName = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  });
}
