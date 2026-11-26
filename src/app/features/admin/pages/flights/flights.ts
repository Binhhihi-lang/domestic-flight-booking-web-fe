import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FlightOperationStatus, FlightRecord } from '@core/models/flight.model';
import { AuthService } from '@core/services/auth.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { ConfirmDialog, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const OP_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Đúng giờ', tone: 'info' },
  BOARDING: { label: 'Đang lên tàu', tone: 'warning' },
  DELAYED: { label: 'Chậm chuyến', tone: 'warning' },
  DEPARTED: { label: 'Đã cất cánh', tone: 'info' },
  ARRIVED: { label: 'Đã hạ cánh', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

/**
 * Danh sách chuyến bay — Admin & Staff (`/admin/flights`).
 * Bám sát `admin.html`: header gọn (`Chuyến bay` + `Thêm chuyến bay`),
 * bộ lọc `.adm-filter--card` (Tìm kiếm + Trạng thái bán + Trạng thái vận hành + nút Tìm),
 * cột `Lấp đầy` (`.adm-load` + `%` + `Ghế trống`), click dòng vào chi tiết và thao tác Sửa / Xoá.
 */
@Component({
  selector: 'app-admin-flights',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppButton,
    AppAlert,
    PageHeader,
    StatusBadge,
    EmptyState,
    SkeletonBlock,
    ServerPager,
  ],
  template: `
    <section class="wrap flt-page">
      <app-page-header
        title="Chuyến bay"
        subtitle="Lịch khai thác, tỷ lệ lấp đầy, trạng thái vận hành và mở bán chuyến bay"
      >
        <a routerLink="/admin/flights/new" class="flt-add-link">
          <app-app-button variant="primary">
            <mat-icon aria-hidden="true">add</mat-icon>
            Thêm chuyến bay
          </app-app-button>
        </a>
      </app-page-header>

      <div class="adm-filter adm-filter--card" role="search" aria-label="Bộ lọc chuyến bay">
        <div class="flt-search">
          <mat-icon aria-hidden="true">search</mat-icon>
          <input
            id="flt-kw"
            type="search"
            aria-label="Tìm kiếm chuyến bay"
            [ngModel]="keyword()"
            (ngModelChange)="onKeywordInput($event)"
            (keydown.enter)="onFilterChange()"
            placeholder="Tìm số hiệu (VD: VN-210), hãng bay, mã sân bay..."
          />
        </div>

        <select
          id="flt-sales"
          class="flt-select"
          aria-label="Trạng thái bán"
          [ngModel]="salesStatus()"
          (ngModelChange)="salesStatus.set($event); onFilterChange()"
        >
          <option value="">Trạng thái bán: Tất cả</option>
          <option value="OPEN">Đang mở bán</option>
          <option value="CLOSED">Đóng bán</option>
        </select>

        <select
          id="flt-op"
          class="flt-select"
          aria-label="Trạng thái vận hành"
          [ngModel]="operationStatus()"
          (ngModelChange)="operationStatus.set($event); onFilterChange()"
        >
          <option value="">Trạng thái vận hành: Tất cả</option>
          <option value="DRAFT">Nháp</option>
          <option value="SCHEDULED">Đúng giờ</option>
          <option value="BOARDING">Đang lên tàu</option>
          <option value="DELAYED">Chậm chuyến</option>
          <option value="DEPARTED">Đã cất cánh</option>
          <option value="ARRIVED">Đã hạ cánh</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>

        <app-app-button variant="primary" size="sm" (clicked)="onFilterChange()">
          <mat-icon aria-hidden="true">search</mat-icon>
          Tìm
        </app-app-button>
      </div>

      <div class="flt-card">
        @if (error()) {
          <div class="flt-pad">
            <app-alert tone="error" title="Không thể tải dữ liệu" [message]="error()!" />
          </div>
        }

        @if (loading()) {
          <div class="flt-pad flt-skel">
            <app-skeleton-block height="44px" />
            <app-skeleton-block height="44px" />
            <app-skeleton-block height="44px" />
          </div>
        } @else if (rows().length === 0) {
          <app-empty-state
            icon="flight_takeoff"
            message="Không tìm thấy chuyến bay phù hợp"
            hint="Thử điều chỉnh bộ lọc hoặc thêm chuyến bay mới"
          />
        } @else {
          <div class="flt-table-wrap">
            <table class="flt-table">
              <thead>
                <tr>
                  <th>Số hiệu</th>
                  <th>Hãng & Tàu bay</th>
                  <th>Chặng bay</th>
                  <th>Giờ khởi hành → đến</th>
                  <th>Lấp đầy (Ghế trống)</th>
                  <th>Vận hành</th>
                  <th>Mở bán</th>
                  <th class="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr
                    class="flt-row"
                    tabindex="0"
                    (click)="goToDetail(row.id)"
                    (keydown.enter)="goToDetail(row.id)"
                  >
                    <td>
                      <a
                        [routerLink]="['/admin/flights', row.id]"
                        class="flt-code"
                        (click)="$event.stopPropagation()"
                      >
                        {{ row.flight_number }}
                      </a>
                      @if (row.parent_flight_number) {
                        <div class="flt-muted">Chuyến gốc: {{ row.parent_flight_number }}</div>
                      }
                    </td>
                    <td>
                      <div class="flt-primary">{{ row.airline.airline_name }}</div>
                      <div class="flt-muted">{{ row.aircraft.aircraft_code }} · {{ row.aircraft.model }}</div>
                    </td>
                    <td>
                      <div class="flt-route">
                        <strong>{{ row.departure_airport.airport_code }}</strong>
                        <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                        <strong>{{ row.arrival_airport.airport_code }}</strong>
                      </div>
                      <div class="flt-muted">{{ formatDuration(row.duration_minutes) }}</div>
                    </td>
                    <td>
                      <div class="flt-primary">{{ formatDateTime(row.scheduled_departure) }}</div>
                      <div class="flt-muted">Đến {{ formatTime(row.scheduled_arrival) }}</div>
                    </td>
                    <td>
                      @if (hasSeatStats(row)) {
                        @let pct = loadPercentOf(row);
                        <div class="adm-load-cell">
                          <div class="adm-load-top">
                            <strong class="tabular">{{ pct }}%</strong>
                            <span class="flt-muted tabular">
                              ({{ row.available_seats }}/{{ seatCapacityOf(row) }} trống)
                            </span>
                            @if (isLowSeats(row)) {
                              <span class="flt-low-badge">Sắp hết</span>
                            }
                          </div>
                          <div class="adm-load" aria-hidden="true">
                            <div
                              class="adm-load__fill"
                              [class.adm-load__fill--high]="pct >= 85"
                              [style.width.%]="pct"
                            ></div>
                          </div>
                        </div>
                      } @else {
                        <span class="flt-muted">—</span>
                      }
                    </td>
                    <td>
                      <app-status-badge
                        [tone]="opStatusMeta(row.operation_status).tone"
                        [label]="opStatusMeta(row.operation_status).label"
                      />
                    </td>
                    <td>
                      <app-status-badge
                        [tone]="row.sales_status === 'OPEN' ? 'success' : 'neutral'"
                        [label]="row.sales_status === 'OPEN' ? 'Đang mở bán' : 'Đóng bán'"
                      />
                    </td>
                    <td class="col-actions" (click)="$event.stopPropagation()">
                      <div class="flt-actions">
                        <a
                          [routerLink]="['/admin/flights', row.id, 'edit']"
                          class="rowbtn"
                          title="Sửa thông tin lịch bay"
                        >
                          Sửa
                        </a>
                        @if (isAdmin()) {
                          <button
                            type="button"
                            class="rowbtn rowbtn--danger"
                            (click)="confirmDelete(row)"
                            [attr.aria-label]="'Xoá chuyến bay ' + row.flight_number"
                          >
                            Xóa
                          </button>
                        }
                        <mat-icon class="rowchev" aria-hidden="true">chevron_right</mat-icon>
                      </div>
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
            noun="chuyến bay"
            (pageChange)="onPageChange($event)"
            (sizeChange)="onSizeChange($event)"
          />
        }
      </div>
    </section>
  `,
  styles: `
    .flt-page {
      display: flex;
      flex-direction: column;
      gap: var(--sp-lg);
    }
    .flt-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-md);
    }
    .flt-head h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .flt-sub {
      margin: var(--sp-xs) 0 0;
      color: var(--color-ink-muted);
      font-size: var(--text-small);
    }
    .flt-head__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-sm);
    }
    .flt-add-link {
      text-decoration: none;
    }
    .adm-filter--card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--sp-md);
      padding: var(--sp-md) var(--sp-lg);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
    }
    .flt-search {
      position: relative;
      flex: 1 1 260px;
      min-width: 200px;
    }
    .flt-search mat-icon {
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
    .flt-search input {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 36px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .flt-select {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      min-width: 170px;
    }
    .flt-search input:focus,
    .flt-select:focus {
      outline: none;
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 2px var(--color-primary-soft);
    }
    .flt-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .flt-pad {
      padding: var(--sp-lg);
    }
    .flt-skel {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .flt-table-wrap {
      overflow-x: auto;
    }
    .flt-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 920px;
    }
    .flt-table th,
    .flt-table td {
      padding: var(--sp-md) var(--sp-lg);
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
      vertical-align: middle;
    }
    .flt-table th {
      font-size: var(--text-caption);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }
    .flt-row {
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }
    .flt-row:hover {
      background: var(--color-primary-soft);
    }
    .flt-code {
      font-weight: 700;
      color: var(--color-primary);
      text-decoration: none;
    }
    .flt-code:hover {
      text-decoration: underline;
    }
    .flt-primary {
      font-weight: 600;
      color: var(--color-ink);
    }
    .flt-muted {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      margin-top: 2px;
    }
    .flt-route {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--color-ink);
    }
    .flt-route mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--color-ink-muted);
    }
    .adm-load-cell {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 140px;
    }
    .adm-load-top {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-size: var(--text-caption);
    }
    .adm-load {
      height: 7px;
      width: 100%;
      border-radius: 999px;
      background: var(--color-border-soft);
      overflow: hidden;
    }
    .adm-load__fill {
      height: 100%;
      border-radius: 999px;
      background: var(--color-primary);
      transition: width var(--dur) var(--ease);
    }
    .adm-load__fill--high {
      background: var(--color-accent);
    }
    .tabular {
      font-variant-numeric: tabular-nums;
    }
    .flt-low-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
      font-size: var(--text-caption);
      font-weight: 600;
    }
    .col-actions {
      text-align: right;
      width: 170px;
    }
    .flt-actions {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--sp-xs);
      white-space: nowrap;
    }
    .rowbtn {
      font-family: var(--font-body);
      font-size: 12.5px;
      font-weight: 600;
      text-decoration: none;
      padding: 6px 11px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      cursor: pointer;
      transition:
        background-color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }
    .rowbtn:hover {
      background: var(--color-surface-alt);
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .rowbtn--danger {
      border-color: transparent;
      background: transparent;
      color: var(--color-primary);
    }
    .rowbtn--danger:hover {
      background: var(--color-danger-soft);
      border-color: transparent;
      color: var(--color-on-danger-soft);
    }
    .rowchev {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-ink-subtle);
      opacity: 0;
      transition: opacity var(--dur-fast) var(--ease);
    }
    .flt-row:hover .rowchev,
    .flt-row:focus-visible .rowchev {
      opacity: 1;
      color: var(--color-primary);
    }
  `,
})
export class AdminFlights {
  private readonly flightService = inject(FlightAdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isAdmin = computed(() => this.authService.isAdmin());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<FlightRecord[]>([]);

  protected readonly page = signal(1);
  protected readonly size = signal(20);
  protected readonly totalItems = signal(0);
  protected readonly totalPages = signal(1);

  protected readonly keyword = signal('');
  protected readonly operationStatus = signal('');
  protected readonly salesStatus = signal('');

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

  protected goToDetail(flightId: number): void {
    this.router.navigate(['/admin/flights', flightId]);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.flightService
      .list({
        page: this.page(),
        size: this.size(),
        keyword: this.keyword().trim() || undefined,
        operation_status: this.operationStatus() || undefined,
        sales_status: this.salesStatus() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.totalItems.set(res.data.pagination.total_items);
          this.totalPages.set(res.data.pagination.total_pages || 1);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Không thể tải danh sách chuyến bay');
          this.loading.set(false);
        },
      });
  }

  protected hasSeatStats(row: FlightRecord): boolean {
    return row.available_seats !== undefined && row.available_seats !== null;
  }

  protected seatCapacityOf(row: FlightRecord): number {
    return row.seat_capacity ?? row.aircraft?.seat_capacity ?? 0;
  }

  protected loadPercentOf(row: FlightRecord): number {
    const cap = this.seatCapacityOf(row);
    const avail = row.available_seats ?? 0;
    if (cap <= 0) return 0;
    const used = Math.max(0, cap - avail);
    return Math.min(100, Math.round((used / cap) * 100));
  }

  protected isLowSeats(row: FlightRecord): boolean {
    const cap = this.seatCapacityOf(row);
    const avail = row.available_seats;
    if (avail === undefined || avail === null || cap <= 0) {
      return false;
    }
    return avail <= Math.ceil(cap * 0.15) || avail <= 5;
  }

  protected opStatusMeta(status: FlightOperationStatus | string): { label: string; tone: BadgeTone } {
    return OP_STATUS_META[status] ?? { label: status, tone: 'neutral' };
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

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}g ${m}p` : `${m}p`;
  }

  protected confirmDelete(row: FlightRecord): void {
    const data: ConfirmDialogData = {
      title: `Xoá chuyến bay ${row.flight_number}?`,
      message: `Chặng ${row.departure_airport.airport_code} → ${row.arrival_airport.airport_code} khởi hành ${this.formatDateTime(row.scheduled_departure)}.`,
      confirmText: 'Xoá chuyến bay',
      cancelText: 'Hủy',
      tone: 'warn',
    };
    this.dialog
      .open(ConfirmDialog, { data, panelClass: 'vf-confirm-panel' })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.flightService.remove(row.id).subscribe({
          next: (res) => {
            this.snackBar.open(res.message || `Đã xoá chuyến bay ${row.flight_number}`, 'Đóng', {
              duration: 3000,
            });
            this.load();
          },
          error: (err: Error) => {
            this.snackBar.open(err.message || 'Không thể xoá chuyến bay', 'Đóng', {
              duration: 4000,
            });
          },
        });
      });
  }
}
