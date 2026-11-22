import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BookingStatus, BookingSummary } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Quản lý Đặt chỗ Admin & Staff (`/admin/bookings`).
 * Hỗ trợ phân trang server (`app-server-pager`), tìm kiếm debounce 300ms,
 * lọc theo 4 trạng thái thật (`PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `EXPIRED`),
 * hiển thị mã đơn `DH-{id}`, PNR, số điện thoại liên hệ và giờ khởi hành.
 */
@Component({
  selector: 'app-admin-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    StatusBadge,
    EmptyState,
    ServerPager,
    SkeletonBlock,
  ],
  template: `
    <section class="ab-page">
      <header class="ab-head">
        <div>
          <h1>Quản lý đặt chỗ</h1>
          <p class="ab-sub">Tra cứu đơn đặt vé, kiểm tra thanh toán và hỗ trợ hủy vé cho hành khách</p>
        </div>
      </header>

      <div class="ab-card">
        <div class="ab-filters" role="search" aria-label="Bộ lọc đặt chỗ">
          <input
            type="search"
            aria-label="Tìm mã đơn hoặc tên khách"
            [ngModel]="keyword()"
            (ngModelChange)="onKeywordInput($event)"
            placeholder="Tìm theo mã đơn (VD: DH-1049), PNR, tên khách, email..."
          />
          <select
            aria-label="Lọc theo trạng thái đơn"
            [ngModel]="status()"
            (ngModelChange)="status.set($event); onFilterChange()"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_PAYMENT">Chờ thanh toán</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </div>

        @if (loading()) {
          <div class="ab-pad">
            <app-skeleton-block height="44px" />
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
                  <th>Mã đơn / PNR</th>
                  <th>Khách hàng & Liên hệ</th>
                  <th>Hành trình & Ngày bay</th>
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
                      <strong class="ab-code">DH-{{ b.id }}</strong>
                      <div class="ab-pnr">
                        @if (b.status === 'CONFIRMED' && b.booking_code) {
                          PNR: {{ b.booking_code }}
                        } @else {
                          PNR: —
                        }
                      </div>
                    </td>
                    <td>
                      <div><strong>{{ b.customer_name }}</strong></div>
                      <div class="ab-muted">{{ b.customer_email }}</div>
                      @if (b.customer_phone) {
                        <div class="ab-muted">{{ b.customer_phone }}</div>
                      }
                    </td>
                    <td>
                      @if (b.segments[0]; as seg) {
                        <div><strong>{{ seg.departure_airport_code }} → {{ seg.arrival_airport_code }}</strong></div>
                        <div class="ab-muted">
                          {{ seg.flight_number }} · {{ seg.airline_name }}
                        </div>
                        <div class="ab-muted">Khởi hành: {{ formatDateTime(seg.scheduled_departure) }}</div>
                      } @else {
                        <span class="ab-muted">—</span>
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
          <app-server-pager
            [page]="page()"
            [size]="size()"
            [totalItems]="totalItems()"
            [totalPages]="totalPages()"
            [pageSizeOptions]="[20, 50, 100]"
            noun="đơn đặt chỗ"
            (pageChange)="onPageChange($event)"
            (sizeChange)="onSizeChange($event)"
          />
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
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .ab-sub,
    .ab-muted {
      margin: 3px 0 0;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .ab-sub {
      font-size: var(--text-small);
    }
    .ab-code {
      color: var(--color-ink);
      font-variant-numeric: tabular-nums;
    }
    .ab-pnr {
      margin-top: 2px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-variant-numeric: tabular-nums;
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
      min-width: 820px;
    }
    .ab-table th,
    .ab-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
      vertical-align: middle;
    }
    .ab-table th {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
      white-space: nowrap;
    }
    .ab-table tbody tr:hover {
      background: var(--color-surface-alt);
    }
    .col-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .col-actions {
      text-align: right;
      white-space: nowrap;
    }
    .ab-act {
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-caption);
      font-weight: 600;
    }
    .ab-act:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
  `,
})
export class AdminBookings {
  private readonly bookingFlow = inject(BookingFlowService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly keyword = signal('');
  protected readonly status = signal('');
  protected readonly rows = signal<BookingSummary[]>([]);

  protected readonly page = signal(1);
  protected readonly size = signal(20);
  protected readonly totalItems = signal(0);
  protected readonly totalPages = signal(1);

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });

    this.load();
  }

  protected onKeywordInput(value: string): void {
    this.keyword.set(value);
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  protected onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.load();
  }

  protected onSizeChange(nextSize: number): void {
    this.size.set(nextSize);
    this.page.set(1);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.bookingFlow
      .listAdminBookings({
        page: this.page(),
        size: this.size(),
        keyword: this.keyword().trim() || undefined,
        status: this.status() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.totalItems.set(res.data.pagination.total_items);
          this.totalPages.set(res.data.pagination.total_pages || 1);
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
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
