import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BookingStatus, BookingSummary } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const STATUS_TABS: { key: BookingStatus | ''; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

/**
 * Vé của tôi (`/account`) — DA3.2.
 * Nâng cấp kết nối `BookingFlowService.listMyBookings(status)` với 4 tab lọc trạng thái
 * và điều hướng sang chi tiết đặt chỗ (`/account/bookings/:id`), thanh toán hoặc vé điện tử.
 */
@Component({
  selector: 'app-account-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, StatusBadge, EmptyState, SkeletonBlock],
  template: `
    <section class="mb-page">
      <header class="mb-head">
        <div>
          <h1>Vé của tôi</h1>
          <p class="mb-sub">Theo dõi trạng thái đặt chỗ, xem vé điện tử hoặc yêu cầu hủy vé</p>
        </div>
        <a routerLink="/flights">
          <app-app-button size="sm" variant="primary">Đặt chuyến mới</app-app-button>
        </a>
      </header>

      <div class="mb-tabs" role="tablist" aria-label="Lọc theo trạng thái đơn">
        @for (t of tabs; track t.key) {
          <button
            type="button"
            role="tab"
            class="mb-tab"
            [attr.aria-selected]="activeStatus() === t.key"
            [class.mb-tab--active]="activeStatus() === t.key"
            (click)="selectTab(t.key)"
          >
            {{ t.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <app-skeleton-block height="120px" />
        <app-skeleton-block height="120px" />
      } @else if (bookings().length === 0) {
        <app-empty-state
          icon="confirmation_number"
          message="Chưa có đơn đặt chỗ ở trạng thái này"
          hint="Tìm chuyến bay nội địa và đặt vé ngay hôm nay"
        />
      } @else {
        <div class="mb-list">
          @for (b of bookings(); track b.id) {
            <article class="mb-card">
              <div class="mb-card__top">
                <div class="mb-code">
                  <strong>Mã đơn DH-{{ b.id }}</strong>
                  @if (b.status === 'CONFIRMED' && b.booking_code) {
                    <span class="mb-muted">· PNR {{ b.booking_code }}</span>
                  }
                  <span class="mb-muted">· {{ b.passenger_count ?? b.passengers?.length ?? 0 }} hành khách</span>
                </div>
                <app-status-badge [tone]="statusTone(b.status)" [label]="statusLabel(b.status)" />
              </div>

              @if (b.segments[0]; as seg) {
                <div class="mb-route">
                  <div>
                    <strong>{{ seg.departure_airport_code }} → {{ seg.arrival_airport_code }}</strong>
                    <div class="mb-muted">
                      {{ seg.flight_number }} · {{ seg.airline_name }} · {{ seg.fare_class_name }}
                    </div>
                  </div>
                  <div class="mb-price">
                    <strong class="tabular">{{ formatMoney(b.total_amount) }}</strong>
                    <div class="mb-muted">{{ formatDateTime(seg.scheduled_departure) }}</div>
                  </div>
                </div>
              }

              <footer class="mb-card__foot">
                <a [routerLink]="['/account/bookings', b.id]" class="mb-link">
                  Xem chi tiết đặt chỗ →
                </a>
                <div class="mb-actions">
                  @if (b.status === 'PENDING_PAYMENT') {
                    <a [routerLink]="['/booking/payment']" [queryParams]="{ bookingId: b.id }">
                      <app-app-button size="sm" variant="primary">Thanh toán ngay</app-app-button>
                    </a>
                  } @else if (b.status === 'CONFIRMED') {
                    <a [routerLink]="['/booking/confirmation']" [queryParams]="{ bookingId: b.id }">
                      <app-app-button size="sm" variant="secondary">Xem vé điện tử</app-app-button>
                    </a>
                  }
                </div>
              </footer>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .mb-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .mb-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .mb-head h1 {
      font-size: var(--text-h1);
    }
    .mb-sub,
    .mb-muted {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .mb-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .mb-tab {
      padding: 7px 14px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 500;
      cursor: pointer;
    }
    .mb-tab--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .mb-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mb-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mb-card__top,
    .mb-route,
    .mb-card__foot {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .mb-code {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mb-price {
      text-align: right;
    }
    .mb-price strong {
      font-size: var(--text-h3);
      color: var(--color-primary);
    }
    .mb-card__foot {
      padding-top: 10px;
      border-top: 1px solid var(--color-border-soft);
    }
    .mb-link {
      color: var(--color-primary);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
    }
  `,
})
export class AccountBookings {
  private readonly bookingFlow = inject(BookingFlowService);

  protected readonly tabs = STATUS_TABS;
  protected readonly activeStatus = signal<BookingStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly bookings = signal<BookingSummary[]>([]);

  constructor() {
    this.load();
  }

  protected selectTab(status: BookingStatus | ''): void {
    this.activeStatus.set(status);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.bookingFlow.listMyBookings(this.activeStatus()).subscribe({
      next: (res) => {
        this.bookings.set(res.data.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusLabel(s: BookingStatus): string {
    if (s === 'CONFIRMED') return 'Đã xác nhận';
    if (s === 'PENDING_PAYMENT') return 'Chờ thanh toán';
    if (s === 'CANCELLED') return 'Đã hủy';
    return 'Hết hạn';
  }

  protected statusTone(s: BookingStatus): BadgeTone {
    if (s === 'CONFIRMED') return 'success';
    if (s === 'PENDING_PAYMENT') return 'warning';
    if (s === 'CANCELLED' || s === 'EXPIRED') return 'danger';
    return 'neutral';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatDateTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
}
