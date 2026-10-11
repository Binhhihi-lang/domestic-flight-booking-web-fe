import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Khối xương khi đang tải — giữ chỗ để bố cục không nhảy khi dữ liệu về.
 * aria-hidden vì đây là nội dung trang trí, trình đọc màn hình bỏ qua.
 */
@Component({
  selector: 'app-skeleton-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="sk"></span>`,
  styles: `
    :host {
      display: block;
    }

    .sk {
      display: block;
      width: 100%;
      height: 13px;
      border-radius: var(--radius-sm);
      background: linear-gradient(
        90deg,
        var(--color-border-soft) 25%,
        var(--color-border) 37%,
        var(--color-border-soft) 63%
      );
      background-size: 400% 100%;
      animation: sk-shimmer 1.3s ease infinite;
    }

    @keyframes sk-shimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }

    /* Tôn trọng lựa chọn giảm chuyển động. */
    @media (prefers-reduced-motion: reduce) {
      .sk {
        animation: none;
      }
    }
  `,
  host: {
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    'aria-hidden': 'true',
  },
})
export class SkeletonBlock {
  readonly width = input<string>('100%');
  readonly height = input<string>('13px');
}
