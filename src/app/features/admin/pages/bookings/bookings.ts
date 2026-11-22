import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BookingStatus, BookingSummary } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Quản lý Đặt chỗ Admin & Staff (`/admin/bookings`) — DA3.2 (thay `ComingSoon`).
 * Tra cứu theo mã đơn/tên khách/email, lọc trạng thái và đi tới chi tiết/hủy vé hộ khách.
 */
@Component({
  selector: 'app-admin-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, StatusBadge, EmptyState, SkeletonBlock],
  template: `
    <section class="ab-page">
      <header class="ab-head">
        <div>
          <h1>Quản lý đặt chỗ</h1>
          <p class="ab-sub">Tra cứu đơn đặt vé, kiểm tra thanh toán và hỗ trợ hủy vé cho hành khách</p>
        </div>
      </header>

      <div class="ab-card">
        <div class="ab-filters">
          <input
            type="search"
            aria-label="Tìm mã đơn hoặc tên khách"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event); load()"
            placeholder="Tìm theo mã đơn (VD: DH-1049), tên khách, email..."
          />
          <select
            aria-label="Lọc theo trạng thái đơn"
            [ngModel]="status()"
            (ngModelChange)="status.set($event); load()"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="PENDING_PAYMENT">Chờ thanh toán</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </div>

        @if (loading()) {
          <div class="ab-pad">
            <app-skeleton-block height="44px" />
            <app-skeleton-block height="44px" />
          </div>
        } @else if (rows().length === 0) {
          <app-empty-state
            icon="confirmation_number"
            message="Không tìm thấy đơn đặt chỗ"
            hint="Thử nhập mã đơn khác hoặc đổi bộ lọc trạng thái"
          />
        } @else {
          <div class="ab-table-wrap">
            <table class="ab-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Hành trình</th>
                  <th class="col-num">Hành khách</th>
                  <th class="col-num">Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th class="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (b of rows(); track b.id) {
                  <tr>
                    <td>
                    <strong>DH-{{ b.id }}</strong>
                    @if (b.status === 'CONFIRMED' && b.booking_code) {
                      <div style="font-size: 12px; color: var(--color-text-secondary);">PNR {{ b.booking_code }}</div>
                    }
                  </td>
                    <td>
                      <div><strong>{{ b.customer_name }}</strong></div>
                      <div class="ab-muted">{{ b.customer_email }}</div>
                    </td>
                    <td>
                      @if (b.segments[0]; as seg) {
                        <div><strong>{{ seg.departure_airport_code }} → {{ seg.arrival_airport_code }}</strong></div>
                        <div class="ab-muted">{{ seg.flight_number }} · {{ seg.airline_name }}</div>
                      }
                    </td>
                    <td class="col-num">{{ b.passenger_count ?? 0 }}</td>
                    <td class="col-num"><strong>{{ formatMoney(b.total_amount) }}</strong></td>
                    <td>
                      <app-status-badge [tone]="statusTone(b.status)" [label]="statusLabel(b.status)" />
                    </td>
                    <td class="col-actions">
                      <a [routerLink]="['/admin/bookings', b.id]" class="ab-act">
                        Chi tiết / Hủy hộ
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .ab-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .ab-head h1 {
      font-size: var(--text-h1);
    }
    .ab-sub,
    .ab-muted {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .ab-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .ab-filters {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) 220px;
      gap: 12px;
      padding: 16px;
      background: var(--color-surface-alt);
      border-bottom: 1px solid var(--color-border-soft);
    }
    @media (max-width: 640px) {
      .ab-filters {
        grid-template-columns: 1fr;
      }
    }
    .ab-filters input,
    .ab-filters select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .ab-pad {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ab-table-wrap {
      overflow-x: auto;
    }
    .ab-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }
    .ab-table th,
    .ab-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .ab-table th {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }
    .col-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .col-actions {
      text-align: right;
    }
    .ab-act {
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-caption);
      font-weight: 600;
    }
  `,
})
export class AdminBookings {
  private readonly bookingFlow = inject(BookingFlowService);

  protected readonly loading = signal(true);
  protected readonly keyword = signal('');
  protected readonly status = signal('');
  protected readonly rows = signal<BookingSummary[]>([]);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.bookingFlow
      .listAdminBookings({
        keyword: this.keyword().trim() || undefined,
        status: this.status() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
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
}
