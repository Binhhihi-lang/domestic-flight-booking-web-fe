import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FlightOperationStatus, FlightRecord } from '@core/models/flight.model';
import { AirlineService } from '@core/services/airline.service';
import { AuthService } from '@core/services/auth.service';
import { AirportService } from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { ConfirmDialog, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state/empty-state';
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
 * Hỗ trợ phân trang server (`app-server-pager`), tìm kiếm debounce 300ms,
 * lọc đầy đủ trạng thái vận hành (kể cả DRAFT), cột Ghế trống kèm cảnh báo Sắp hết,
 * và cho phép cả ADMIN & STAFF thêm/sửa/mở-đóng bán/cập nhật vận hành.
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
    StatusBadge,
    EmptyState,
    SkeletonBlock,
    ServerPager,
  ],
  template: `
    <section class="flt-page">
      <header class="flt-head">
        <div>
          <h1>Quản lý chuyến bay</h1>
          <p class="flt-sub">Lịch khai thác, trạng thái vận hành và mở bán chuyến bay nội địa</p>
        </div>
        <div class="flt-head__actions">
          <a routerLink="/admin/flight-fares" class="flt-link-btn">
            <mat-icon aria-hidden="true">sell</mat-icon>
            Bảng giá chuyến
          </a>
          <a routerLink="/admin/flight-seat-inventory" class="flt-link-btn">
            <mat-icon aria-hidden="true">event_seat</mat-icon>
            Tồn ghế chuyến
          </a>
          <a routerLink="/admin/flights/new" class="flt-add-link">
            <app-app-button variant="primary" size="sm">
              <mat-icon aria-hidden="true">add</mat-icon>
              Thêm chuyến bay
            </app-app-button>
          </a>
        </div>
      </header>

      <div class="flt-card">
        <div class="flt-filters" role="search" aria-label="Bộ lọc chuyến bay">
          <div class="flt-field flt-field--grow">
            <label for="flt-kw">Tìm kiếm</label>
            <input
              id="flt-kw"
              type="search"
              [ngModel]="keyword()"
              (ngModelChange)="onKeywordInput($event)"
              placeholder="Số hiệu (VD: VN-210), hãng bay, mã sân bay..."
            />
          </div>

          <div class="flt-field">
            <label for="flt-airline">Hãng bay</label>
            <select
              id="flt-airline"
              [ngModel]="airlineId()"
              (ngModelChange)="airlineId.set($event); onFilterChange()"
            >
              <option value="">Tất cả hãng</option>
              @for (a of airlineOptions(); track a.id) {
                <option [value]="a.id">{{ a.airline_code }} — {{ a.airline_name }}</option>
              }
            </select>
          </div>

          <div class="flt-field">
            <label for="flt-dep">Sân bay đi</label>
            <select
              id="flt-dep"
              [ngModel]="departureAirportId()"
              (ngModelChange)="departureAirportId.set($event); onFilterChange()"
            >
              <option value="">Tất cả</option>
              @for (ap of airportOptions(); track ap.id) {
                <option [value]="ap.id">{{ ap.airport_code }} — {{ ap.airport_name }}</option>
              }
            </select>
          </div>

          <div class="flt-field">
            <label for="flt-arr">Sân bay đến</label>
            <select
              id="flt-arr"
              [ngModel]="arrivalAirportId()"
              (ngModelChange)="arrivalAirportId.set($event); onFilterChange()"
            >
              <option value="">Tất cả</option>
              @for (ap of airportOptions(); track ap.id) {
                <option [value]="ap.id">{{ ap.airport_code }} — {{ ap.airport_name }}</option>
              }
            </select>
          </div>

          <div class="flt-field">
            <label for="flt-date">Ngày bay</label>
            <input
              id="flt-date"
              type="date"
              [ngModel]="departureDate()"
              (ngModelChange)="departureDate.set($event); onFilterChange()"
            />
          </div>

          <div class="flt-field">
            <label for="flt-op">Vận hành</label>
            <select
              id="flt-op"
              [ngModel]="operationStatus()"
              (ngModelChange)="operationStatus.set($event); onFilterChange()"
            >
              <option value="">Tất cả</option>
              <option value="DRAFT">Nháp</option>
              <option value="SCHEDULED">Đúng giờ</option>
              <option value="BOARDING">Đang lên tàu</option>
              <option value="DELAYED">Chậm chuyến</option>
              <option value="DEPARTED">Đã cất cánh</option>
              <option value="ARRIVED">Đã hạ cánh</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div class="flt-field">
            <label for="flt-sales">Mở bán</label>
            <select
              id="flt-sales"
              [ngModel]="salesStatus()"
              (ngModelChange)="salesStatus.set($event); onFilterChange()"
            >
              <option value="">Tất cả</option>
              <option value="OPEN">Đang mở bán</option>
              <option value="CLOSED">Đóng bán</option>
            </select>
          </div>
        </div>

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
                  <th class="col-num">Ghế trống</th>
                  <th>Vận hành</th>
                  <th>Mở bán</th>
                  <th class="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/admin/flights', row.id]" class="flt-code">
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
                    <td class="col-num">
                      @if (hasSeatStats(row)) {
                        <div class="flt-seats">
                          <strong class="tabular">
                            {{ row.available_seats }} / {{ seatCapacityOf(row) }}
                          </strong>
                          @if (isLowSeats(row)) {
                            <span class="flt-low-badge">Sắp hết</span>
                          }
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
                    <td class="col-actions">
                      <div class="flt-actions">
                        <a
                          [routerLink]="['/admin/flights', row.id]"
                          class="flt-act"
                          title="Chi tiết chuyến bay"
                        >
                          Chi tiết
                        </a>
                        <a
                          [routerLink]="['/admin/flights', row.id, 'edit']"
                          class="flt-act"
                          title="Sửa thông tin lịch bay"
                        >
                          Sửa
                        </a>
                        <a
                          [routerLink]="['/admin/flights', row.id, 'operation']"
                          class="flt-act"
                          title="Cập nhật giờ bay / trạng thái vận hành"
                        >
                          Vận hành
                        </a>
                        <a
                          [routerLink]="['/admin/flights', row.id, 'seat-inventory']"
                          class="flt-act"
                          title="Sơ đồ tồn ghế chuyến bay"
                        >
                          Tồn ghế
                        </a>
                        <button
                          type="button"
                          class="flt-act flt-act--btn"
                          (click)="toggleSales(row)"
                        >
                          {{ row.sales_status === 'OPEN' ? 'Đóng bán' : 'Mở bán' }}
                        </button>
                        @if (isAdmin()) {
                          <button
                            type="button"
                            class="flt-act flt-act--danger"
                            (click)="confirmDelete(row)"
                            [attr.aria-label]="'Xóa chuyến bay ' + row.flight_number"
                          >
                            Xóa
                          </button>
                        }
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
    .flt-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 500;
      text-decoration: none;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }
    .flt-link-btn:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .flt-link-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .flt-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .flt-filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: var(--sp-md);
      padding: var(--sp-lg);
      border-bottom: 1px solid var(--color-border-soft);
      background: var(--color-surface-alt);
    }
    .flt-field {
      display: flex;
      flex-direction: column;
      gap: var(--sp-xs);
    }
    .flt-field--grow {
      grid-column: span 2;
    }
    @media (max-width: 768px) {
      .flt-field--grow {
        grid-column: span 1;
      }
    }
    .flt-field label {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
    }
    .flt-field input,
    .flt-field select {
      height: 38px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      width: 100%;
    }
    .flt-field input:focus,
    .flt-field select:focus {
      outline: none;
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 2px var(--color-primary-soft);
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
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
      vertical-align: middle;
    }
    .flt-table th {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
      white-space: nowrap;
    }
    .flt-table tbody tr:hover {
      background: var(--color-surface-alt);
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
    .col-num {
      text-align: right;
      white-space: nowrap;
    }
    .flt-seats {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
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
    }
    .flt-actions {
      display: inline-flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 6px;
    }
    .flt-act {
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-caption);
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease),
        background-color var(--dur-fast) var(--ease);
    }
    .flt-act:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .flt-act--danger {
      border-color: var(--color-danger);
      color: var(--color-danger);
    }
    .flt-act--danger:hover {
      border-color: var(--color-danger);
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
  `,
})
export class AdminFlights {
  private readonly flightService = inject(FlightAdminService);
  private readonly airlineService = inject(AirlineService);
  private readonly airportService = inject(AirportService);
  private readonly authService = inject(AuthService);
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
  protected readonly airlineId = signal('');
  protected readonly departureAirportId = signal('');
  protected readonly arrivalAirportId = signal('');
  protected readonly departureDate = signal('');
  protected readonly operationStatus = signal('');
  protected readonly salesStatus = signal('');

  private readonly search$ = new Subject<string>();

  private readonly airlinesRes = toSignal(this.airlineService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });
  private readonly airportsRes = toSignal(this.airportService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly airlineOptions = computed(() => this.airlinesRes()?.data.items ?? []);
  protected readonly airportOptions = computed(() => this.airportsRes()?.data.items ?? []);

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
    this.error.set(null);
    this.flightService
      .list({
        page: this.page(),
        size: this.size(),
        keyword: this.keyword().trim() || undefined,
        airline_id: this.airlineId() || undefined,
        departure_airport_id: this.departureAirportId() || undefined,
        arrival_airport_id: this.arrivalAirportId() || undefined,
        departure_date: this.departureDate() || undefined,
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

  protected toggleSales(row: FlightRecord): void {
    const req$ =
      row.sales_status === 'OPEN'
        ? this.flightService.deactivate(row.id)
        : this.flightService.activate(row.id);
    req$.subscribe({
      next: (res) => {
        this.snackBar.open(res.message || 'Đã cập nhật trạng thái bán', 'Đóng', { duration: 3000 });
        this.load();
      },
      error: (err: Error) => {
        this.snackBar.open(err.message || 'Không thể đổi trạng thái mở bán', 'Đóng', {
          duration: 4000,
        });
      },
    });
  }

  protected confirmDelete(row: FlightRecord): void {
    const data: ConfirmDialogData = {
      title: `Xóa chuyến bay ${row.flight_number}?`,
      message: `Chặng ${row.departure_airport.airport_code} → ${row.arrival_airport.airport_code} khởi hành ${this.formatDateTime(row.scheduled_departure)}.`,
      confirmText: 'Xóa chuyến bay',
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
            this.snackBar.open(res.message || `Đã xóa chuyến bay ${row.flight_number}`, 'Đóng', {
              duration: 3000,
            });
            this.load();
          },
          error: (err: Error) => {
            this.snackBar.open(err.message || 'Không thể xóa chuyến bay', 'Đóng', {
              duration: 4000,
            });
          },
        });
      });
  }
}
