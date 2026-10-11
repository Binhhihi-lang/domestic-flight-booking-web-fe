import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BrandSize = 'sm' | 'md' | 'lg';
export type BrandTone = 'light' | 'dark';

/**
 * Logo + tên thương hiệu VinaFly.
 *
 * Vì sao vẽ SVG nội tuyến thay vì dùng file ảnh: logo phải sắc ở mọi mật độ
 * màn hình, đổi được màu theo nền sáng/tối, và không phát sinh thêm request.
 * Một file .svg hay .png sẽ khoá cứng màu và mờ khi phóng to.
 *
 * Hình dấu: chữ V của "VinaFly" được vẽ thành đường bay — xuống đáy rồi vút
 * lên, kết thúc bằng một điểm tròn (điểm đến). Nhờ vậy dấu vừa là chữ cái đầu,
 * vừa là biểu tượng ngành bay, không trùng logo hãng nào.
 */
@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="brand" [class]="'brand--' + size()">
      <svg
        class="brand__mark"
        viewBox="0 0 36 36"
        role="img"
        aria-label="VinaFly"
        focusable="false"
      >
        <defs>
          <!-- id phải duy nhất trên trang: nhiều bản logo cùng tồn tại
               (header + footer + sidebar) nên hậu tố theo size+tone. -->
          <linearGradient [attr.id]="gradientId()" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stop-color="#0d47a2" />
            <stop offset="1" stop-color="#0194f3" />
          </linearGradient>
        </defs>

        <rect width="36" height="36" rx="10" [attr.fill]="'url(#' + gradientId() + ')'" />

        <!-- Chữ V = đường bay: xuống đáy rồi vút lên -->
        <path
          d="M9.5 11.5 L17.2 25.4 L24.4 12.6"
          fill="none"
          stroke="#ffffff"
          stroke-width="2.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Vệt nối lên điểm đến -->
        <path
          d="M24.4 12.6 L26.6 10.6"
          fill="none"
          stroke="#ffffff"
          stroke-width="1.6"
          stroke-linecap="round"
          opacity="0.55"
        />

        <!-- Điểm đến -->
        <circle cx="28" cy="9" r="2.6" fill="#ffffff" />
      </svg>

      @if (showWordmark()) {
        <span class="brand__text">
          <span class="brand__name">Vina<span class="brand__name-accent">Fly</span></span>
          @if (tagline()) {
            <span class="brand__tagline">{{ tagline() }}</span>
          }
        </span>
      }
    </span>
  `,
  styles: `
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      text-decoration: none;
      min-width: 0;
    }

    .brand__mark {
      flex: 0 0 auto;
      display: block;
    }

    .brand__text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.15;
    }

    .brand__name {
      font-family: var(--font-heading);
      font-weight: 700;
      letter-spacing: -0.3px;
      white-space: nowrap;
    }

    .brand__tagline {
      font-family: var(--font-body);
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ---------- Kích thước ---------- */
    .brand--sm .brand__mark {
      width: 26px;
      height: 26px;
    }
    .brand--sm .brand__name {
      font-size: 14.5px;
    }
    .brand--sm .brand__tagline {
      font-size: 10px;
    }

    .brand--md .brand__mark {
      width: 32px;
      height: 32px;
    }
    .brand--md .brand__name {
      font-size: 17px;
    }
    .brand--md .brand__tagline {
      font-size: 10.5px;
    }

    .brand--lg .brand__mark {
      width: 40px;
      height: 40px;
    }
    .brand--lg .brand__name {
      font-size: 21px;
    }
    .brand--lg .brand__tagline {
      font-size: 11.5px;
    }

    /* ---------- Theo nền ---------- */
    /* Nền sáng: chữ mực, "Fly" nhấn màu thương hiệu. */
    .brand--light .brand__name {
      color: var(--color-ink);
    }
    .brand--light .brand__name-accent {
      color: var(--color-primary);
    }
    .brand--light .brand__tagline {
      color: var(--color-ink-muted);
    }

    /* Nền tối (sidebar, footer): chữ trắng, "Fly" nhấn xanh sáng. */
    .brand--dark .brand__name {
      color: #fff;
    }
    .brand--dark .brand__name-accent {
      color: var(--color-primary-bright);
    }
    .brand--dark .brand__tagline {
      color: var(--color-on-dark-subtle);
    }
  `,
})
export class BrandLogo {
  readonly size = input<BrandSize>('md');
  readonly tone = input<BrandTone>('light');
  /** Ẩn chữ, chỉ giữ dấu — dùng khi sidebar thu gọn. */
  readonly markOnly = input<boolean>(false);
  /** Dòng phụ dưới tên; để rỗng thì không hiện. */
  readonly tagline = input<string>('');

  protected readonly showWordmark = computed(() => !this.markOnly());

  /** Mỗi tổ hợp size+tone một id gradient để không đụng nhau khi lặp trên trang. */
  protected readonly gradientId = computed(() => `vf-grad-${this.size()}-${this.tone()}`);
}
