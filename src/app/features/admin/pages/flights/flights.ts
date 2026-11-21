import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { FlightOperationStatus, FlightRecord } from '@core/models/flight.model';
import { AirlineService } from '@core/services/airline.service';
import { AuthService } from '@core/services/auth.service';
import { AirportService } from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const OP_STATUS_META: Record<FlightOperationStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Đúng giờ', tone: 'info' },
  BOARDING: { label: 'Đang lên tàu', tone: 'warning' },
  DELAYED: { label: 'Chậm chuyến', tone: 'warning' },
  DEPARTED: { label: 'Đã cất cánh', tone: 'info' },
  ARRIVED: { label: 'Đã hạ cánh', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

/**
 * Danh sách chuyến bay — Admin & Staff (`/admin/flights`).
 * Bám sát `admin.html` & `staff.html`: bộ lọc tuyến bay, ngày bay, hãng bay,
 * trạng thái vận hành & trạng thái bán; thao tác mở/đóng bán, xem chi tiết khách,
 * cập nhật vận hành (Staff), cấu hình giá & tồn ghế.
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
          @if (isAdmin()) {
            <a routerLink="/admin/flights/new">
              <app-app-button variant="primary" size="sm">
                <mat-icon aria-hidden="true">add</mat-icon>
                Thêm chuyến bay
              </app-app-button>
            </a>
          }
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
              (ngModelChange)="keyword.set($event); load()"
              placeholder="Số hiệu (VD: VN-210), hãng bay, mã sân bay..."
            />
          </div>

          <div class="flt-field">
            <label for="flt-airline">Hãng bay</label>
            <select
              id="flt-airline"
              [ngModel]="airlineId()"
              (ngModelChange)="airlineId.set($event); load()"
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
              (ngModelChange)="departureAirportId.set($event); load()"
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
              (ngModelChange)="arrivalAirportId.set($event); load()"
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
              (ngModelChange)="departureDate.set($event); load()"
            />
          </div>

          <div class="flt-field">
            <label for="flt-op">Vận hành</label>
            <select
              id="flt-op"
              [ngModel]="operationStatus()"
              (ngModelChange)="operationStatus.set($event); load()"
            >
              <option value="">Tất cả</option>
              <option value="SCHEDULED">Đúng giờ</option>
              <option value="BOARDING">Đang lên tàu</option>
              <option value="DELAYED">Chậm chuyến</option>
              <option value="DEPARTED">Đã cất cánh</option>
              <option value="ARRIVED">Đã hạ cánh</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div class="flt-field">
            <label for="flt-sales">Mở bán</label>
            <select
              id="flt-sales"
              [ngModel]="salesStatus()"
              (ngModelChange)="salesStatus.set($event); load()"
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
                          title="Chi tiết & danh sách hành khách"
                        >
                          Chi tiết
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
                        @if (isAdmin()) {
                          <a
                            [routerLink]="['/admin/flights', row.id, 'edit']"
                            class="flt-act"
                            title="Sửa thông tin lịch bay"
                          >
                            Sửa
                          </a>
                          <button
                            type="button"
                            class="flt-act flt-act--btn"
                            (click)="toggleSales(row)"
                          >
                            {{ row.sales_status === 'OPEN' ? 'Đóng bán' : 'Mở bán' }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <footer class="flt-foot">
            <span>Hiển thị {{ rows().length }} / {{ totalItems() }} chuyến bay</span>
          </footer>
        }
      </div>
    </section>
  `,
  styles: `
    .flt-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .flt-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .flt-head h1 {
      margin: 0;
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .flt-sub {
      margin: 4px 0 0;
      color: var(--color-ink-muted);
      font-size: var(--text-small);
    }
    .flt-head__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
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
      grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid var(--color-border-soft);
      background: var(--color-surface-alt);
    }
    .flt-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
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
    .flt-pad {
      padding: 16px;
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
      min-width: 820px;
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
    }
    .flt-act:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .flt-foot {
      padding: 12px 16px;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
  `,
})
export class AdminFlights {
  private readonly flightService = inject(FlightAdminService);
  private readonly airlineService = inject(AirlineService);
  private readonly airportService = inject(AirportService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isAdmin = computed(() => this.authService.isAdmin());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<FlightRecord[]>([]);
  protected readonly totalItems = signal(0);

  protected readonly keyword = signal('');
  protected readonly airlineId = signal('');
  protected readonly departureAirportId = signal('');
  protected readonly arrivalAirportId = signal('');
  protected readonly departureDate = signal('');
  protected readonly operationStatus = signal('');
  protected readonly salesStatus = signal('');

  private readonly airlinesRes = toSignal(this.airlineService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });
  private readonly airportsRes = toSignal(this.airportService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly airlineOptions = computed(() => this.airlinesRes()?.data.items ?? []);
  protected readonly airportOptions = computed(() => this.airportsRes()?.data.items ?? []);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.flightService
      .list({
        page: 1,
        size: 50,
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
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Không thể tải danh sách chuyến bay');
          this.loading.set(false);
        },
      });
  }

  protected opStatusMeta(status: FlightOperationStatus): { label: string; tone: BadgeTone } {
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
}
