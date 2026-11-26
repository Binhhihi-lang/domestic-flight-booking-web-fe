import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FlightDetailRecord,
  FlightOperationStatus,
  FlightPassengerItem,
} from '@core/models/flight.model';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

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
 * Chi tiết chuyến bay & Danh sách hành khách — Staff/Admin (`/admin/flights/:id`).
 * Bám sát `admin.html` & `staff.html`: header rõ ràng với trạng thái tiếng Việt,
 * nút thao tác nhanh (Mở/Đóng bán, Sửa chuyến bay, Cập nhật vận hành, Tồn ghế, Bảng giá),
 * thông tin chuyến gốc (nếu có) và thống kê ghế trống.
 */
@Component({
  selector: 'app-admin-flight-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppAlert,
    StatusBadge,
    EmptyState,
    SkeletonBlock,
  ],
  template: `
    <section class="wrap fd-page">
      <header class="fd-head">
        <div class="fd-head__info">
          <div class="fd-title-row">
            <h1>Chuyến bay {{ flight()?.flight_number ?? '' }}</h1>
            @if (flight(); as f) {
              <app-status-badge
                [tone]="opStatusMeta(f.operation_status).tone"
                [label]="opStatusMeta(f.operation_status).label"
              />
              <app-status-badge
                [tone]="f.sales_status === 'OPEN' ? 'success' : 'neutral'"
                [label]="f.sales_status === 'OPEN' ? 'Đang mở bán' : 'Đóng bán'"
              />
            }
          </div>
          @if (flight(); as f) {
            <p class="fd-sub">
              {{ f.airline.airline_name }} · {{ f.departure_airport.airport_code }} →
              {{ f.arrival_airport.airport_code }} · Tàu bay {{ f.aircraft.aircraft_code }} ({{
                f.aircraft.model
              }})
              @if (f.parent_flight_number) {
                · Chuyến gốc:
                @if (f.parent_flight_id) {
                  <a [routerLink]="['/admin/flights', f.parent_flight_id]" class="fd-link">
                    {{ f.parent_flight_number }}
                  </a>
                } @else {
                  <strong>{{ f.parent_flight_number }}</strong>
                }
              }
            </p>
          } @else {
            <p class="fd-sub">Thông tin khai thác, bảng giá đang áp dụng và danh sách hành khách</p>
          }
        </div>
        <div class="fd-head__actions">
          <a routerLink="/admin/flights" class="fd-btn">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
            Danh sách chuyến
          </a>
          @if (flight(); as f) {
            <button
              type="button"
              class="fd-btn"
              [disabled]="togglingSales()"
              (click)="toggleSales(f)"
            >
              <mat-icon aria-hidden="true">
                {{ f.sales_status === 'OPEN' ? 'pause_circle' : 'play_circle' }}
              </mat-icon>
              {{ f.sales_status === 'OPEN' ? 'Đóng bán' : 'Mở bán' }}
            </button>
            <a [routerLink]="['/admin/flights', f.id, 'edit']" class="fd-btn">
              <mat-icon aria-hidden="true">edit</mat-icon>
              Sửa chuyến bay
            </a>
            <a [routerLink]="['/admin/flights', f.id, 'operation']" class="fd-btn fd-btn--primary">
              <mat-icon aria-hidden="true">schedule</mat-icon>
              Cập nhật vận hành
            </a>
            <a [routerLink]="['/admin/flights', f.id, 'seat-inventory']" class="fd-btn">
              <mat-icon aria-hidden="true">event_seat</mat-icon>
              Tồn ghế
            </a>
            <a [routerLink]="['/admin/flight-fares']" [queryParams]="{ flight_id: f.id }" class="fd-btn">
              <mat-icon aria-hidden="true">sell</mat-icon>
              Bảng giá
            </a>
          }
        </div>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Không tải được chuyến bay" [message]="error()!" />
      }

      @if (loading()) {
        <div class="fd-card fd-skel">
          <app-skeleton-block height="80px" />
          <app-skeleton-block height="180px" />
        </div>
      } @else if (flight(); as f) {
        <div class="fd-summary">
          <div class="fd-stat">
            <span class="fd-stat__label">Chặng bay</span>
            <strong class="fd-stat__val">
              {{ f.departure_airport.airport_code }} → {{ f.arrival_airport.airport_code }}
            </strong>
            <span class="fd-stat__note">
              {{ f.departure_airport.airport_name }} → {{ f.arrival_airport.airport_name }}
            </span>
          </div>
          <div class="fd-stat">
            <span class="fd-stat__label">Khởi hành dự kiến</span>
            <strong class="fd-stat__val">{{ formatDateTime(f.scheduled_departure) }}</strong>
            <span class="fd-stat__note">
              Đến {{ formatTime(f.scheduled_arrival) }} · {{ formatDuration(f.duration_minutes) }}
            </span>
          </div>
          <div class="fd-stat">
            <span class="fd-stat__label">Ghế còn trống</span>
            <strong class="fd-stat__val tabular">
              {{ f.available_seats }} / {{ seatCapacityOf(f) }}
            </strong>
            <span class="fd-stat__note">Sức chứa tàu bay: {{ f.aircraft.seat_capacity }} ghế</span>
          </div>
          <div class="fd-stat">
            <span class="fd-stat__label">Hãng & Tàu bay</span>
            <strong class="fd-stat__val">{{ f.airline.airline_name }}</strong>
            <span class="fd-stat__note">{{ f.aircraft.aircraft_code }} · {{ f.aircraft.model }}</span>
          </div>
        </div>

        <div class="fd-card">
          <div class="fd-card__head">
            <h2>Danh sách hành khách ({{ filteredPassengers().length }})</h2>
            <div class="fd-pax-filter">
              <input
                type="search"
                [ngModel]="paxKeyword()"
                (ngModelChange)="paxKeyword.set($event)"
                placeholder="Tìm tên khách, mã đơn, PNR..."
                aria-label="Tìm kiếm hành khách"
              />
            </div>
          </div>

          @if (filteredPassengers().length === 0) {
            <app-empty-state
              icon="groups"
              message="Chưa có hành khách trên chuyến bay này"
              hint="Danh sách hành khách đặt vé sẽ tự động hiển thị tại đây"
            />
          } @else {
            <div class="fd-table-wrap">
              <table class="fd-table">
                <thead>
                  <tr>
                    <th>Mã đơn / PNR</th>
                    <th>Hành khách</th>
                    <th>Loại khách</th>
                    <th>Hạng vé</th>
                    <th>Số ghế</th>
                    <th>Trạng thái đơn</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of filteredPassengers(); track p.booking_code + p.full_name) {
                    <tr>
                      <td>
                        <strong>{{ p.booking_code }}</strong>
                        <div class="fd-muted">PNR: {{ p.pnr_code ?? 'Chưa cấp' }}</div>
                      </td>
                      <td><strong>{{ p.full_name }}</strong></td>
                      <td>{{ passengerTypeLabel(p.passenger_type) }}</td>
                      <td>{{ p.fare_class_name }}</td>
                      <td><strong>{{ p.seat_code ?? '—' }}</strong></td>
                      <td>
                        <app-status-badge
                          [tone]="
                            p.booking_status === 'CONFIRMED'
                              ? 'success'
                              : p.booking_status === 'CANCELLED'
                                ? 'danger'
                                : 'warning'
                          "
                          [label]="bookingStatusLabel(p.booking_status)"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        @if (f.fares.length > 0) {
          <div class="fd-card">
            <div class="fd-card__head">
              <h2>Bảng giá đang áp dụng ({{ f.fares.length }})</h2>
              <a [routerLink]="['/admin/flight-fares']" [queryParams]="{ flight_id: f.id }" class="fd-link">
                Quản lý bảng giá →
              </a>
            </div>
            <div class="fd-table-wrap">
              <table class="fd-table">
                <thead>
                  <tr>
                    <th>Hạng vé</th>
                    <th class="col-num">Giá người lớn</th>
                    <th class="col-num">Giá trẻ em (75%)</th>
                    <th class="col-num">Giá em bé (10%)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fare of f.fares; track fare.id) {
                    <tr>
                      <td>
                        <strong>{{ fare.fare_class_code }}</strong> — {{ fare.fare_class_name }}
                      </td>
                      <td class="col-num tabular"><strong>{{ formatMoney(fare.adult_price) }}</strong></td>
                      <td class="col-num tabular">{{ formatMoney(fare.child_price) }}</td>
                      <td class="col-num tabular">{{ formatMoney(fare.infant_price) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .fd-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .fd-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .fd-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .fd-head h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .fd-sub {
      margin: 6px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .fd-head__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .fd-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }
    .fd-btn:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .fd-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .fd-btn--primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .fd-btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
      color: var(--color-on-primary);
    }
    .fd-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .fd-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .fd-stat {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fd-stat__label {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-weight: 600;
    }
    .fd-stat__val {
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .fd-stat__note {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .tabular {
      font-variant-numeric: tabular-nums;
    }
    .fd-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .fd-skel {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .fd-card__head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border-soft);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .fd-card__head h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .fd-pax-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .fd-pax-filter input {
      height: 36px;
      min-width: 240px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .fd-link {
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 500;
    }
    .fd-link:hover {
      text-decoration: underline;
    }
    .fd-table-wrap {
      overflow-x: auto;
    }
    .fd-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 640px;
    }
    .fd-table th,
    .fd-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .fd-table th {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }
    .col-num {
      text-align: right;
    }
    .fd-muted {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
  `,
})
export class AdminFlightDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly flightService = inject(FlightAdminService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly togglingSales = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly flight = signal<FlightDetailRecord | null>(null);
  protected readonly paxKeyword = signal('');

  protected readonly filteredPassengers = computed<FlightPassengerItem[]>(() => {
    const list = this.flight()?.passengers ?? [];
    const kw = this.paxKeyword().trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(kw) ||
        p.booking_code.toLowerCase().includes(kw) ||
        (p.pnr_code ?? '').toLowerCase().includes(kw),
    );
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Mã chuyến bay không hợp lệ');
      this.loading.set(false);
      return;
    }
    this.loadFlight(id);
  }

  private loadFlight(id: number): void {
    this.loading.set(true);
    this.flightService.getById(id).subscribe({
      next: (res) => {
        this.flight.set(res.data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được chi tiết chuyến bay');
        this.loading.set(false);
      },
    });
  }

  protected toggleSales(f: FlightDetailRecord): void {
    this.togglingSales.set(true);
    const req$ =
      f.sales_status === 'OPEN'
        ? this.flightService.deactivate(f.id)
        : this.flightService.activate(f.id);
    req$.subscribe({
      next: (res) => {
        this.togglingSales.set(false);
        this.snackBar.open(res.message || 'Đã cập nhật trạng thái bán', 'Đóng', { duration: 3000 });
        this.loadFlight(f.id);
      },
      error: (err: Error) => {
        this.togglingSales.set(false);
        this.snackBar.open(err.message || 'Không thể đổi trạng thái mở bán', 'Đóng', {
          duration: 4000,
        });
      },
    });
  }

  protected seatCapacityOf(f: FlightDetailRecord): number {
    return f.seat_capacity ?? f.total_seats ?? f.aircraft?.seat_capacity ?? 0;
  }

  protected opStatusMeta(status: FlightOperationStatus | string): { label: string; tone: BadgeTone } {
    return OP_STATUS_META[status] ?? { label: status, tone: 'neutral' };
  }

  protected passengerTypeLabel(t: FlightPassengerItem['passenger_type']): string {
    return t === 'ADULT' ? 'Người lớn' : t === 'CHILD' ? 'Trẻ em' : 'Em bé';
  }

  protected bookingStatusLabel(s: FlightPassengerItem['booking_status']): string {
    return s === 'CONFIRMED' ? 'Đã xác nhận' : s === 'CANCELLED' ? 'Đã hủy' : 'Chờ thanh toán';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}g ${m}p` : `${m}p`;
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

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
}
