import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PromotionScope } from '@core/models/promotion.model';
import { UserVoucher, UserVoucherStatus } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

interface VoucherDetailView extends UserVoucher {
  voucher: UserVoucher['voucher'] & {
    max_discount_amount?: number | null;
    scopes?: PromotionScope[];
  };
}

const STATUS_META: Record<UserVoucherStatus, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: 'Sẵn sàng dùng', tone: 'success' },
  RESERVED: { label: 'Đang giữ cho đơn', tone: 'info' },
  USED: { label: 'Đã sử dụng', tone: 'neutral' },
  EXPIRED: { label: 'Đã hết hạn', tone: 'danger' },
};

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Chi tiết voucher trong ví khách hàng (`/account/vouchers/:id`).
 */
@Component({
  selector: 'app-voucher-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, AppCard, EmptyState, LoadingState, StatusBadge],
  template: `
    <section class="vd">
      <div class="vd__top">
        <a class="vd__back" routerLink="/account/vouchers">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
          <span>Quay lại Ví voucher</span>
        </a>
      </div>

      @if (loading()) {
        <app-app-card><app-loading-state message="Đang tải chi tiết voucher…" /></app-app-card>
      } @else if (item(); as uv) {
        <div class="vd__hero">
          <div class="vd__hero-main">
            <div class="vd__hero-badges">
              <app-status-badge [tone]="statusTone(uv.status)" [label]="statusLabel(uv.status)" />
              <span class="vd__src">
                {{ uv.source === 'CLAIMED' ? 'Tự lưu từ kho' : 'Voucher được tặng' }}
              </span>
            </div>
            <h1>{{ uv.voucher.voucher_name }}</h1>
            <p class="vd__discount">{{ discountText() }}</p>
          </div>

          <div class="vd__code-box">
            <span class="vd__code-lbl">Mã voucher</span>
            <div class="vd__code-row">
              <strong class="vd__code tabular">{{ uv.voucher.voucher_code }}</strong>
              <button type="button" class="vd__copy" (click)="copyCode(uv.voucher.voucher_code)">
                <mat-icon aria-hidden="true">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                <span>{{ copied() ? 'Đã sao chép' : 'Sao chép' }}</span>
              </button>
            </div>
          </div>
        </div>

        <app-app-card title="Thông tin & điều kiện áp dụng" class="vd__blk">
          <dl class="vd__facts">
            <div class="vd__fact">
              <dt>Mức giảm</dt>
              <dd>{{ discountText() }}</dd>
            </div>
            <div class="vd__fact">
              <dt>Đơn tối thiểu</dt>
              <dd>
                @if (uv.voucher.min_order_amount) {
                  {{ formatMoney(uv.voucher.min_order_amount) }}
                } @else {
                  Không yêu cầu
                }
              </dd>
            </div>
            <div class="vd__fact">
              <dt>Loại hành trình</dt>
              <dd>{{ tripTypeText() }}</dd>
            </div>
            <div class="vd__fact">
              <dt>Thời hạn hiệu lực</dt>
              <dd>{{ formatDate(uv.voucher.start_date) }} – {{ formatDate(uv.expires_at ?? uv.voucher.end_date) }}</dd>
            </div>
            <div class="vd__fact">
              <dt>Ngày nhận</dt>
              <dd>{{ formatDate(uv.received_at) }}</dd>
            </div>
            @if (uv.used_at) {
              <div class="vd__fact">
                <dt>Ngày sử dụng</dt>
                <dd>{{ formatDate(uv.used_at) }}</dd>
              </div>
            }
          </dl>
        </app-app-card>

        <app-app-card title="Phạm vi áp dụng" class="vd__blk">
          @if (scopeLabels().length > 0) {
            <ul class="vd__scopes">
              @for (label of scopeLabels(); track label) {
                <li>
                  <mat-icon aria-hidden="true">check_circle</mat-icon>
                  <span>{{ label }}</span>
                </li>
              }
            </ul>
          } @else {
            <p class="vd__scope-all">
              <mat-icon aria-hidden="true">public</mat-icon>
              <span>Áp dụng cho tất cả hãng hàng không, tuyến bay và hạng vé nội địa đang mở bán.</span>
            </p>
          }
        </app-app-card>

        <app-app-card title="Điều khoản sử dụng" class="vd__blk">
          <p class="vd__terms">
            {{ uv.voucher.description || 'Chọn trực tiếp voucher từ ví ở bước xác nhận đặt chỗ để được khấu trừ vào tổng tiền vé.' }}
          </p>
          <ul class="vd__rules">
            <li>Mỗi đơn đặt chỗ chỉ áp dụng tối đa 1 voucher.</li>
            <li>Voucher không có giá trị quy đổi thành tiền mặt và không hoàn lại sau khi đã xuất vé.</li>
            <li>Hệ thống tự động kiểm tra điều kiện đơn tối thiểu và thời hạn khi thanh toán.</li>
          </ul>
        </app-app-card>

        <div class="vd__actions">
          <a routerLink="/account/vouchers">
            <app-app-button variant="ghost">Quay lại</app-app-button>
          </a>
          @if (uv.status === 'AVAILABLE') {
            <a routerLink="/flights">
              <app-app-button variant="primary">Dùng ngay khi đặt vé</app-app-button>
            </a>
          }
        </div>
      } @else {
        <app-app-card>
          <app-empty-state
            icon="card_membership"
            message="Không tìm thấy thông tin voucher"
            hint="Voucher có thể đã hết hạn hoặc không thuộc tài khoản của bạn"
          />
          <div class="vd__empty-btn">
            <a routerLink="/account/vouchers">
              <app-app-button variant="primary" size="sm">Quay lại Ví voucher</app-app-button>
            </a>
          </div>
        </app-app-card>
      }
    </section>
  `,
  styles: `
    .vd {
      display: flex;
      flex-direction: column;
      gap: var(--sp-lg);
    }

    .vd__back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
    }

    .vd__back:hover {
      text-decoration: underline;
    }

    .vd__back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .vd__hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--sp-lg);
      align-items: center;
      padding: var(--sp-xl);
      border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-bright));
      color: var(--color-on-primary);
    }

    .vd__hero-badges {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      flex-wrap: wrap;
      margin-bottom: var(--sp-sm);
    }

    .vd__src {
      font-size: var(--text-caption);
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--color-primary-hover);
      color: var(--color-on-primary);
    }

    .vd__hero h1 {
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      font-weight: 700;
      margin: 0 0 6px;
      color: var(--color-on-primary);
    }

    .vd__discount {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      opacity: 0.95;
    }

    .vd__code-box {
      background: var(--color-surface);
      color: var(--color-ink);
      padding: var(--sp-md) var(--sp-lg);
      border-radius: var(--radius);
      min-width: 220px;
    }

    .vd__code-lbl {
      display: block;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      margin-bottom: 4px;
    }

    .vd__code-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
    }

    .vd__code {
      font-family: var(--font-heading);
      font-size: 17px;
      font-weight: 700;
      color: var(--color-primary);
      letter-spacing: 0.5px;
    }

    .vd__copy {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: var(--text-caption);
      font-weight: 600;
      cursor: pointer;
    }

    .vd__copy:hover {
      background: var(--color-primary-soft);
    }

    .vd__copy mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .vd__blk {
      display: block;
    }

    .vd__facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: var(--sp-lg);
      margin: 0;
    }

    .vd__fact dt {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
      margin-bottom: 3px;
    }

    .vd__fact dd {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-ink);
    }

    .vd__scopes {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
    }

    .vd__scopes li,
    .vd__scope-all {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      font-size: var(--text-small);
      color: var(--color-ink);
      margin: 0;
    }

    .vd__scopes mat-icon,
    .vd__scope-all mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-success);
      flex: 0 0 auto;
    }

    .vd__terms {
      margin: 0 0 var(--sp-md);
      font-size: 14px;
      color: var(--color-ink);
      line-height: 1.6;
    }

    .vd__rules {
      margin: 0;
      padding-left: 18px;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .vd__actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: var(--sp-md);
      flex-wrap: wrap;
    }

    .vd__actions a,
    .vd__empty-btn a {
      text-decoration: none;
    }

    .vd__empty-btn {
      display: flex;
      justify-content: center;
      margin-top: var(--sp-md);
    }

    @media (max-width: 720px) {
      .vd__hero {
        grid-template-columns: 1fr;
        padding: var(--sp-lg);
      }

      .vd__code-box {
        min-width: 0;
      }
    }
  `,
})
export class VoucherDetailPage {
  private readonly service = inject(UserVoucherService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly item = signal<VoucherDetailView | null>(null);
  protected readonly copied = signal(false);

  protected readonly discountText = computed(() => {
    const uv = this.item();
    if (!uv) return '';
    const v = uv.voucher;
    const base =
      v.discount_type === 'PERCENT'
        ? `Giảm ${v.discount_value}%`
        : `Giảm ${moneyFmt.format(v.discount_value)}đ`;
    if (v.discount_type === 'PERCENT' && v.max_discount_amount) {
      return `${base} (tối đa ${moneyFmt.format(v.max_discount_amount)}đ)`;
    }
    return base;
  });

  protected readonly tripTypeText = computed(() => {
    switch (this.item()?.voucher.applicable_trip_type) {
      case 'ONE_WAY':
        return 'Chỉ áp dụng vé một chiều';
      case 'ROUND_TRIP':
        return 'Chỉ áp dụng vé khứ hồi';
      default:
        return 'Mọi hành trình (một chiều & khứ hồi)';
    }
  });

  protected readonly scopeLabels = computed<string[]>(() => {
    const scopes = this.item()?.voucher.scopes ?? [];
    return scopes.map((s) => {
      switch (s.target_type) {
        case 'AIRLINE':
          return `Hãng hàng không #${s.airline_id ?? ''}`;
        case 'FARE_CLASS':
          return `Hạng vé #${s.fare_class_id ?? ''}`;
        case 'ROUTE':
          return `Tuyến bay #${s.departure_airport_id ?? ''} → #${s.arrival_airport_id ?? ''}`;
        case 'FLIGHT':
          return `Chuyến bay #${s.flight_id ?? ''}`;
        default:
          return 'Phạm vi đặc biệt';
      }
    });
  });

  constructor() {
    const rawId = this.route.snapshot.paramMap.get('id');
    const id = Number(rawId);
    if (!rawId || Number.isNaN(id)) {
      this.router.navigate(['/account/vouchers']);
      return;
    }

    this.service.getById(id).subscribe({
      next: (res) => {
        if (res.data) {
          this.item.set(res.data as VoucherDetailView);
          this.loading.set(false);
        } else {
          this.fallbackLoad(id);
        }
      },
      error: () => this.fallbackLoad(id),
    });
  }

  private fallbackLoad(id: number): void {
    this.service.myVouchers({ page: 1, size: 50 }).subscribe({
      next: (res) => {
        const found = (res.data?.items ?? []).find((v) => v.id === id || v.voucher.id === id);
        this.item.set((found as VoucherDetailView) ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.item.set(null);
        this.loading.set(false);
      },
    });
  }

  protected statusLabel(s: UserVoucherStatus): string {
    return STATUS_META[s].label;
  }

  protected statusTone(s: UserVoucherStatus): BadgeTone {
    return STATUS_META[s].tone;
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatDate(iso: string | null): string {
    return iso
      ? new Date(iso).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—';
  }

  protected copyCode(code: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    this.copied.set(true);
    this.snackBar.open(`Đã sao chép mã ${code}`, 'Đóng', { duration: 2500 });
    setTimeout(() => this.copied.set(false), 2500);
  }
}
