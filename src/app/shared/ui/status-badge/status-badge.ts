import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Nhãn trạng thái dùng chung toàn hệ thống.
 *
 * Vì sao cần component thay vì tự viết class mỗi nơi: cùng một trạng thái
 * (còn vé, đã hủy, chờ thanh toán...) phải ra CÙNG một màu ở mọi màn hình.
 * Ánh xạ màu nằm một chỗ duy nhất ở đây.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="toneClass()">
      <span class="badge__dot" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: var(--text-caption);
      font-weight: 700;
      line-height: 1.4;
      white-space: nowrap;
    }

    .badge__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex: 0 0 auto;
    }

    .badge--success {
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
    }
    .badge--warning {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .badge--danger {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
    .badge--info {
      background: var(--color-info-soft);
      color: var(--color-on-info-soft);
    }
    .badge--neutral {
      background: var(--color-border-soft);
      color: var(--color-ink-muted);
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('neutral');

  protected readonly toneClass = computed(() => `badge--${this.tone()}`);
}
