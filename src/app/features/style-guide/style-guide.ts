import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { AppAlert } from '../../shared/ui/app-alert/app-alert';
import { AppButton } from '../../shared/ui/app-button/app-button';
import { AppCard } from '../../shared/ui/app-card/app-card';
import { LoadingState } from '../../shared/ui/loading-state/loading-state';
import { SkeletonBlock } from '../../shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

interface TokenRow {
  name: string;
  value: string;
  usage: string;
}

/**
 * Trang tra cứu design system.
 *
 * Vì sao cần trang này: khi làm trang mới, người làm mở đây đối chiếu thay vì
 * đoán màu hay tự chế component. Cũng là nơi kiểm chứng Tailwind và Material
 * đã dùng chung một nguồn màu chưa.
 */
@Component({
  selector: 'app-style-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    AppButton,
    AppCard,
    AppAlert,
    StatusBadge,
    LoadingState,
    SkeletonBlock,
    EmptyState,
  ],
  template: `
    <app-page-header
      title="Design system"
      subtitle="Tra cứu token và component dùng chung. Đối chiếu trước khi làm trang mới."
    >
      <app-app-button variant="ghost" size="sm" (clicked)="toggleTheme()">
        {{ dark() ? 'Chế độ sáng' : 'Chế độ tối' }}
      </app-app-button>
    </app-page-header>

    <section class="block">
      <h2 class="block__title">Màu — kiểm chứng hai hệ đã khớp</h2>
      <p class="block__hint">
        Ba ô đầu phải <strong>cùng một màu</strong>. Nếu lệch, token chưa được nối đúng.
      </p>
      <div class="check-row">
        <div class="check">
          <span class="check__chip" style="background: var(--mat-sys-primary)"></span>
          <span class="check__label">Material<br /><code>--mat-sys-primary</code></span>
        </div>
        <div class="check">
          <span class="check__chip bg-primary"></span>
          <span class="check__label">Tailwind<br /><code>bg-primary</code></span>
        </div>
        <div class="check">
          <span class="check__chip" style="background: var(--color-primary)"></span>
          <span class="check__label">Token<br /><code>--color-primary</code></span>
        </div>
      </div>

      <div class="swatches">
        @for (t of colorTokens; track t.name) {
          <div class="swatch">
            <span class="swatch__chip" [style.background]="'var(' + t.name + ')'"></span>
            <span class="swatch__name">{{ t.name }}</span>
            <span class="swatch__value">{{ t.value }}</span>
            <span class="swatch__usage">{{ t.usage }}</span>
          </div>
        }
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Chữ</h2>
      <div class="type-scale">
        <div class="type-row">
          <span class="type-tag">display</span>
          <span class="type-display">Đặt vé máy bay nội địa</span>
        </div>
        <div class="type-row">
          <span class="type-tag">h1</span>
          <span class="type-h1">Chuyến bay Hà Nội → Đà Nẵng</span>
        </div>
        <div class="type-row">
          <span class="type-tag">h2</span>
          <span class="type-h2">Kết quả tìm kiếm</span>
        </div>
        <div class="type-row">
          <span class="type-tag">body</span>
          <span class="type-body">
            Giá hiển thị đã gồm thuế phí, áp dụng cho một người lớn. Trẻ em 75%, em bé 10%.
          </span>
        </div>
        <div class="type-row">
          <span class="type-tag">small</span>
          <span class="type-small">Phổ thông Lite · 23kg ký gửi · hoàn vé trước 24h</span>
        </div>
        <div class="type-row">
          <span class="type-tag">caption</span>
          <span class="type-caption">Còn 4 ghế</span>
        </div>
        <div class="type-row">
          <span class="type-tag">tabular</span>
          <span class="type-body tabular">1.450.000 ₫ · 1.190.000 ₫ · 986.000 ₫</span>
        </div>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Nút</h2>
      <p class="block__hint">Chỉ một nút primary trong mỗi vùng nhìn.</p>
      <div class="row">
        <app-app-button variant="primary">Tìm chuyến bay</app-app-button>
        <app-app-button variant="secondary">Xem chi tiết</app-app-button>
        <app-app-button variant="ghost">Hủy</app-app-button>
        <app-app-button variant="danger">Xóa</app-app-button>
        <app-app-button variant="text">Bỏ qua</app-app-button>
        <app-app-button variant="primary" [disabled]="true">Đang xử lý…</app-app-button>
      </div>
      <div class="row" style="margin-top: 10px">
        <app-app-button size="sm">Lưu</app-app-button>
        <app-app-button size="sm" variant="ghost">Sửa</app-app-button>
        <app-app-button size="sm" variant="text">Xóa mềm</app-app-button>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Nhãn trạng thái</h2>
      <p class="block__hint">Ánh xạ từ trạng thái dữ liệu. Cùng trạng thái phải cùng màu ở mọi màn.</p>
      <div class="row">
        <app-status-badge tone="success" label="Còn vé" />
        <app-status-badge tone="warning" label="Sắp hết" />
        <app-status-badge tone="danger" label="Hết chỗ" />
        <app-status-badge tone="info" label="Đang giữ" />
        <app-status-badge tone="neutral" label="Bị khóa" />
      </div>
      <div class="row" style="margin-top: 10px">
        <app-status-badge tone="success" label="Đã xác nhận" />
        <app-status-badge tone="warning" label="Chờ thanh toán" />
        <app-status-badge tone="danger" label="Đã hủy" />
        <app-status-badge tone="neutral" label="Hết hạn" />
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Thông báo</h2>
      <div class="alerts">
        <app-alert tone="success" title="Đặt vé thành công" message="Mã đặt chỗ của bạn là ABC123." />
        <app-alert tone="info" title="Lưu ý" message="Voucher không áp dụng cho hành khách em bé." />
        <app-alert tone="warning" title="Chỉ còn 3 ghế" message="Giá có thể thay đổi bất cứ lúc nào." />
        <app-alert tone="error" title="Không thể hủy vé" message="Đã quá sát giờ khởi hành." />
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Card</h2>
      <div class="cards">
        <app-app-card title="Vietnam Airlines" subtitle="VN · Việt Nam">
          <p class="muted-text">Card có vùng đầu, thân, và không có chân vì không cần hành động.</p>
        </app-app-card>

        <app-app-card title="Vietjet Air" subtitle="VJ · Việt Nam" [hasFooter]="true">
          <p class="muted-text">Card này có vùng chân vì có hành động.</p>
          <div cardActions><app-status-badge tone="success" label="Hoạt động" /></div>
          <div cardFooter>
            <app-app-button size="sm" variant="ghost">Sửa</app-app-button>
            <app-app-button size="sm">Lưu</app-app-button>
          </div>
        </app-app-card>
      </div>
    </section>

    <section class="block">
      <h2 class="block__title">Trạng thái rỗng và đang tải</h2>
      <p class="block__hint">Kết quả rỗng là trạng thái hợp lệ, không phải lỗi (BR-LIST-02).</p>
      <div class="cards">
        <app-app-card>
          <app-empty-state
            icon="flight_takeoff"
            message="Chưa có hãng hàng không"
            hint="Bấm nút bên dưới để bắt đầu"
            actionLabel="Thêm hãng hàng không"
          />
        </app-app-card>
        <app-app-card>
          <app-loading-state />
        </app-app-card>
        <app-app-card>
          <app-skeleton-block width="62%" height="13px" />
          <div style="height: 11px"></div>
          <app-skeleton-block width="88%" height="13px" />
          <div style="height: 11px"></div>
          <app-skeleton-block width="74%" height="13px" />
        </app-app-card>
      </div>
    </section>
  `,
  styles: `
    .block {
      margin-bottom: 34px;
    }

    .block__title {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
      margin: 0 0 4px;
    }

    .block__hint {
      margin: 0 0 14px;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      max-width: 72ch;
    }

    .row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .check-row {
      display: flex;
      gap: 22px;
      flex-wrap: wrap;
      margin-bottom: 18px;
      padding: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }

    .check {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .check__chip {
      width: 46px;
      height: 46px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      flex: 0 0 auto;
    }

    .check__label {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      line-height: 1.45;
    }

    .check__label code {
      font-size: var(--text-caption);
      color: var(--color-ink);
    }

    .swatches {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(178px, 1fr));
      gap: 10px;
    }

    .swatch {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 11px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .swatch__chip {
      height: 34px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      margin-bottom: 5px;
    }

    .swatch__name {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink);
    }

    .swatch__value {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-variant-numeric: tabular-nums;
    }

    .swatch__usage {
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .type-scale {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 6px 18px;
    }

    .type-row {
      display: flex;
      align-items: baseline;
      gap: 18px;
      padding: 11px 0;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .type-row:last-child {
      border-bottom: 0;
    }

    .type-tag {
      flex: 0 0 76px;
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .type-display {
      font-family: var(--font-heading);
      font-size: var(--text-display);
      font-weight: 700;
      line-height: var(--leading-tight);
    }
    .type-h1 {
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      font-weight: 700;
    }
    .type-h2 {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
    }
    .type-body {
      font-size: var(--text-body);
    }
    .type-small {
      font-size: var(--text-small);
    }
    .type-caption {
      font-size: var(--text-caption);
    }

    .alerts {
      display: flex;
      flex-direction: column;
      gap: 9px;
      max-width: 620px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(268px, 1fr));
      gap: 14px;
    }

    .muted-text {
      margin: 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
  `,
})
export class StyleGuide {
  protected readonly dark = signal(false);

  protected readonly colorTokens: TokenRow[] = [
    { name: '--color-primary', value: '#0770CD', usage: 'Nền nút có chữ trắng' },
    { name: '--color-primary-bright', value: '#0194F3', usage: 'Viền, icon, chữ trên nền sáng' },
    { name: '--color-primary-hover', value: '#0A57A8', usage: 'Hover, nhấn' },
    { name: '--color-primary-soft', value: '#EAF7FF', usage: 'Nền vùng chọn' },
    { name: '--color-accent', value: '#FF5E1F', usage: 'Giá khuyến mãi' },
    { name: '--color-success', value: '#00A651', usage: 'Tốt, tiết kiệm' },
    { name: '--color-success-soft', value: '#DCFCE7', usage: 'Nền nhãn "Hoạt động"' },
    { name: '--color-on-success-soft', value: '#15803D', usage: 'Chữ trên nền nhãn success' },
    { name: '--color-warning', value: '#F2A81D', usage: 'Sắp hết' },
    { name: '--color-warning-soft', value: '#FEF3C7', usage: 'Nền nhãn "Sắp hết"' },
    { name: '--color-on-warning-soft', value: '#B45309', usage: 'Chữ trên nền nhãn warning' },
    { name: '--color-danger', value: '#E5484D', usage: 'Lỗi, hết chỗ' },
    { name: '--color-danger-soft', value: '#FEE2E2', usage: 'Nền nhãn "Hết chỗ"' },
    { name: '--color-on-danger-soft', value: '#B91C1C', usage: 'Chữ trên nền nhãn danger' },
    { name: '--color-dark', value: '#05285D', usage: 'Nền footer, sidebar vận hành' },
    { name: '--color-bg', value: '#F7F9FA', usage: 'Nền trang' },
    { name: '--color-surface', value: '#FFFFFF', usage: 'Card, panel' },
    { name: '--color-ink', value: '#03121A', usage: 'Chữ chính' },
    { name: '--color-ink-muted', value: '#687176', usage: 'Chữ phụ' },
    { name: '--color-ink-subtle', value: '#6A737A', usage: 'Placeholder' },
    { name: '--color-border', value: '#DDE3E8', usage: 'Viền, phân cách' },
    { name: '--color-border-soft', value: '#EDF1F4', usage: 'Phân cách trong bảng' },
  ];

  protected toggleTheme(): void {
    const next = !this.dark();
    this.dark.set(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }
}
