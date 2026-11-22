import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BookingStatus, BookingSummary } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Quản lý Đặt chỗ Admin & Staff (`/admin/bookings`).
 * Bám sát `admin.html`: header có nút `Xuất CSV`, bộ lọc `.adm-filter--card`
 * (Tìm kiếm + Trạng thái + Kênh đặt + nút Tìm), bảng 9 cột tách rõ
 * (`Mã đơn / PNR`, `Khách hàng`, `Tuyến`, `Chuyến`, `Ngày bay`, `Khách`, `Tổng tiền`, `Trạng thái`, `Thao tác`),
 * click dòng vào `/admin/bookings/:id`.
 */
@Component({
  selector: 'app-admin-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppButton,
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
        <app-app-button variant="primary" size="sm" (clicked)="exportCsv()">
          <mat-icon aria-hidden="true">download</mat-icon>
          Xuất CSV
        </app-app-button>
      </header>

      <div class="adm-filter adm-filter--card" role="search" aria-label="Bộ lọc đặt chỗ">
        <div class="ab-search">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input
            type="search"
            aria-label="Tìm mã đơn hoặc tên khách"
            [ngModel]="keyword()"
            (ngModelChange)="onKeywordInput($event)"
            (keydown.enter)="onFilterChange()"
            placeholder="Tìm theo mã đơn (VD: DH-1049), PNR, tên khách, email..."
          />
        </div>

        <select
          class="ab-select"
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

        <select
          class="ab-select"
          aria-label="Lọc theo kênh đặt"
          [ngModel]="channel()"
          (ngModelChange)="channel.set($event); onFilterChange()"
        >
          <option value="">Kênh đặt: Tất cả</option>
          <option value="WEB">Website</option>
          <option value="COUNTER">Quầy</option>
        </select>

        <app-app-button variant="primary" size="sm" (clicked)="onFilterChange()">
          <mat-icon aria-hidden="true">search</mat-icon>
          Tìm
        </app-app-button>
      </div>

      <div class="ab-card">
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
                  <th>Khách hàng</th>
                  <th>Tuyến</th>
                  <th>Chuyến</th>
                  <th>Ngày bay</th>
                  <th class="col-num">Khách</th>
                  <th class="col-num">Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th class="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (b of rows(); track b.id) {
                  <tr
                    class="ab-row"
                    tabindex="0"
                    (click)="goToDetail(b.id)"
                    (keydown.enter)="goToDetail(b.id)"
                  >
                    <td>
                      <strong class="ab-code">DH-{{ b.id }}</strong>
                      <div class="ab-pnr">
                        {{ b.status === 'CONFIRMED' && b.booking_code ? b.booking_code : 'Chờ cấp PNR' }}
                      </div>
                    </td>
                    <td>
                      <div><strong>{{ b.customer_name }}</strong></div>
                      <div class="ab-muted">{{ b.customer_phone || b.customer_email }}</div>
                    </td>
                    <td>
                      @if (b.segments[0]; as seg) {
                        <strong>{{ seg.departure_airport_code }} → {{ seg.arrival_airport_code }}</strong>
                      } @else {
                        <span class="ab-muted">—</span>
                      }
                    </td>
                    <td>
                      @if (b.segments[0]; as seg) {
                        <div class="ab-flight">{{ seg.flight_number }}</div>
                        <div class="ab-muted">{{ seg.airline_name }}</div>
                      } @else {
                        <span class="ab-muted">—</span>
                      }
                    </td>
                    <td>
                      @if (b.segments[0]; as seg) {
                        <span class="tabular">{{ formatDateTime(seg.scheduled_departure) }}</span>
                      } @else {
                        <span class="ab-muted">—</span>
                      }
                    </td>
                    <td class="col-num tabular">{{ b.passenger_count ?? 0 }}</td>
                    <td class="col-num tabular"><strong>{{ formatMoney(b.total_amount) }}</strong></td>
                    <td>
                      <app-status-badge [tone]="statusTone(b.status)" [label]="statusLabel(b.status)" />
                    </td>
                    <td class="col-actions" (click)="$event.stopPropagation()">
                      <a [routerLink]="['/admin/bookings', b.id]" class="ab-act">
                        Chi tiết
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
    .ab-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
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
    .adm-filter--card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-md);
      padding: var(--sp-md) var(--sp-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .ab-search {
      position: relative;
      flex: 1 1 260px;
      min-width: 200px;
    }
    .ab-search mat-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-ink-subtle);
      pointer-events: none;
    }
    .ab-search input {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 36px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .ab-select {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      min-width: 165px;
    }
    .ab-search input:focus,
    .ab-select:focus {
      outline: none;
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 2px var(--color-primary-soft);
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
    .ab-flight {
      font-weight: 600;
      color: var(--color-ink);
    }
    .ab-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
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
      min-width: 920px;
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
    .ab-row {
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }
    .ab-row:hover {
      background: var(--color-surface-alt);
    }
    .tabular {
      font-variant-numeric: tabular-nums;
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly keyword = signal('');
  protected readonly status = signal('');
  protected readonly channel = signal('');
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

  protected goToDetail(bookingId: number): void {
    this.router.navigate(['/admin/bookings', bookingId]);
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

  protected exportCsv(): void {
    const items = this.rows();
    if (items.length === 0 || typeof document === 'undefined') return;
    const header = 'MaDon,PNR,KhachHang,Tuyen,Chuyen,NgayBay,SoKhach,TongTienVND,TrangThai\n';
    const csvRows = items
      .map((b) => {
        const seg = b.segments[0];
        const route = seg ? `${seg.departure_airport_code}-${seg.arrival_airport_code}` : '';
        const fl = seg?.flight_number ?? '';
        const dep = seg ? this.formatDateTime(seg.scheduled_departure) : '';
        const pnr = b.status === 'CONFIRMED' && b.booking_code ? b.booking_code : '';
        return `DH-${b.id},${pnr},"${b.customer_name}",${route},${fl},"${dep}",${b.passenger_count ?? 0},${Math.round(b.total_amount)},${this.statusLabel(b.status)}`;
      })
      .join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinafly-bookings-page-${this.page()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
