import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { FlightSeatEntry, FlightSeatMap, FlightSeatStatus } from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { FlightAdminService, SeatInventoryService } from '@core/services/flight-admin.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const SEAT_STATUS_META: Record<FlightSeatStatus, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: 'Còn trống', tone: 'success' },
  HELD: { label: 'Đang giữ (15p)', tone: 'warning' },
  BOOKED: { label: 'Đã đặt', tone: 'info' },
  BLOCKED: { label: 'Đã khóa', tone: 'danger' },
};

const CABIN_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

/**
 * Sơ đồ tồn ghế theo chuyến bay (`/admin/flight-seat-inventory` & `/admin/flights/:id/seat-inventory`).
 * Hiển thị thống kê AVAILABLE/HELD/BOOKED/BLOCKED, lưới ghế 3-3 theo hàng/lối đi,
 * cho phép Admin/Staff Khóa ghế (Block), Mở khóa ghế (Unblock) và cập nhật phụ thu theo chuyến.
 */
@Component({
  selector: 'app-admin-flight-seat-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppAlert,
    AppButton,
    EmptyState,
    SkeletonBlock,
    StatusBadge,
  ],
  template: `
    <section class="inv-page">
      <header class="inv-head">
        <div>
          <h1>Tồn ghế chuyến bay</h1>
          <p class="inv-sub">
            Theo dõi trạng thái ghế theo chuyến, khóa/mở khóa ghế và điều chỉnh phụ thu theo chuyến
          </p>
        </div>
        <div class="inv-head__actions">
          <select
            class="inv-select"
            aria-label="Chọn chuyến bay"
            [ngModel]="selectedFlightId()"
            (ngModelChange)="selectFlight(+$event)"
          >
            @for (fl of flights(); track fl.id) {
              <option [ngValue]="fl.id">
                {{ fl.flight_number }} ({{ fl.departure_airport.airport_code }} →
                {{ fl.arrival_airport.airport_code }})
              </option>
            }
          </select>
          <a routerLink="/admin/flights" class="inv-link-btn">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
            Danh sách chuyến
          </a>
        </div>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Không tải được tồn ghế" [message]="error()!" />
      }

      @if (loading()) {
        <div class="inv-card inv-skel">
          <app-skeleton-block height="70px" />
          <app-skeleton-block height="240px" />
        </div>
      } @else if (!seatMap()) {
        <app-empty-state
          icon="event_seat"
          message="Chưa có dữ liệu tồn ghế"
          hint="Chọn một chuyến bay ở thanh trên để xem sơ đồ tồn ghế"
        />
      } @else {
        @let map = seatMap()!;
        <div class="inv-stats">
          <div class="inv-stat inv-stat--ok">
            <span>Còn trống</span>
            <strong>{{ map.available_seats }}</strong>
          </div>
          <div class="inv-stat inv-stat--warn">
            <span>Đang giữ</span>
            <strong>{{ map.held_seats }}</strong>
          </div>
          <div class="inv-stat inv-stat--info">
            <span>Đã đặt</span>
            <strong>{{ map.booked_seats }}</strong>
          </div>
          <div class="inv-stat inv-stat--danger">
            <span>Đã khóa</span>
            <strong>{{ map.blocked_seats }}</strong>
          </div>
        </div>

        <div class="inv-layout">
          <div class="inv-card inv-map-card">
            <div class="inv-map-head">
              <div>
                <h2>Sơ đồ ghế {{ map.flight_number }}</h2>
                <p class="inv-muted">{{ map.aircraft_code }} · {{ map.model }} ({{ map.total_seats }} ghế)</p>
              </div>
              <div class="inv-legend">
                <span class="inv-leg"><i class="dot dot--available"></i>Trống</span>
                <span class="inv-leg"><i class="dot dot--held"></i>Đang giữ</span>
                <span class="inv-leg"><i class="dot dot--booked"></i>Đã đặt</span>
                <span class="inv-leg"><i class="dot dot--blocked"></i>Đã khóa</span>
              </div>
            </div>

            <div class="inv-grid-wrap">
              @for (row of seatRows(); track row.rowNumber) {
                <div class="inv-row">
                  <span class="inv-row__num">{{ row.rowNumber }}</span>
                  <div class="inv-row__seats">
                    @for (seat of row.seats; track seat.id) {
                      <button
                        type="button"
                        class="inv-seat"
                        [class.inv-seat--available]="seat.status === 'AVAILABLE'"
                        [class.inv-seat--held]="seat.status === 'HELD'"
                        [class.inv-seat--booked]="seat.status === 'BOOKED'"
                        [class.inv-seat--blocked]="seat.status === 'BLOCKED'"
                        [class.inv-seat--selected]="selectedSeat()?.id === seat.id"
                        [attr.aria-label]="'Ghế ' + seat.seat_code + ' - ' + statusMeta(seat.status).label"
                        (click)="selectSeat(seat)"
                      >
                        {{ seat.seat_code }}
                      </button>
                      @if (isAisleAfter(seat.seat_column)) {
                        <span class="inv-aisle" aria-hidden="true"></span>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <aside class="inv-card inv-inspector">
            <h2>Chi tiết ghế đang chọn</h2>
            @if (selectedSeat(); as seat) {
              <div class="inv-detail">
                <div class="inv-detail__top">
                  <strong class="inv-seat-title">Ghế {{ seat.seat_code }}</strong>
                  <app-status-badge
                    [tone]="statusMeta(seat.status).tone"
                    [label]="statusMeta(seat.status).label"
                  />
                </div>
                <dl class="inv-dl">
                  <div>
                    <dt>Khoang dịch vụ</dt>
                    <dd>{{ cabinLabel(seat.seat_type.seat_class) }}</dd>
                  </div>
                  <div>
                    <dt>Loại ghế</dt>
                    <dd>{{ seat.seat_type.seat_type_name }}</dd>
                  </div>
                  <div>
                    <dt>Phụ thu hiện tại</dt>
                    <dd><strong>{{ formatMoney(seat.seat_surcharge) }}</strong></dd>
                  </div>
                </dl>

                <div class="inv-field">
                  <label for="inv-sur">Cập nhật phụ thu ghế (VNĐ)</label>
                  <input
                    id="inv-sur"
                    type="number"
                    min="0"
                    step="10000"
                    [ngModel]="editSurcharge()"
                    (ngModelChange)="editSurcharge.set(+$event)"
                  />
                </div>

                <div class="inv-inspector__actions">
                  <app-app-button
                    variant="primary"
                    size="sm"
                    [disabled]="busy()"
                    (clicked)="saveSurcharge(seat)"
                  >
                    {{ busy() ? 'Đang lưu...' : 'Lưu phụ thu' }}
                  </app-app-button>

                  @if (seat.status === 'AVAILABLE') {
                    <app-app-button
                      variant="danger"
                      size="sm"
                      [disabled]="busy()"
                      (clicked)="blockSeat(seat)"
                    >
                      <mat-icon aria-hidden="true">lock</mat-icon>
                      Khóa ghế (Block)
                    </app-app-button>
                  } @else if (seat.status === 'BLOCKED') {
                    <app-app-button
                      variant="secondary"
                      size="sm"
                      [disabled]="busy()"
                      (clicked)="unblockSeat(seat)"
                    >
                      <mat-icon aria-hidden="true">lock_open</mat-icon>
                      Mở khóa ghế (Unblock)
                    </app-app-button>
                  } @else {
                    <p class="inv-lock-note">
                      Ghế đang có khách đặt/giữ nên không thể khóa hoặc mở khóa thủ công.
                    </p>
                  }
                </div>
              </div>
            } @else {
              <p class="inv-muted">Bấm vào một ô ghế trên sơ đồ bên trái để khóa/mở khóa hoặc điều chỉnh phụ thu.</p>
            }
          </aside>
        </div>
      }
    </section>
  `,
  styles: `
    .inv-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .inv-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .inv-head h1 {
      margin: 0;
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .inv-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .inv-head__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .inv-select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .inv-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      text-decoration: none;
    }
    .inv-link-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .inv-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .inv-stat {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .inv-stat span {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-weight: 600;
    }
    .inv-stat strong {
      font-size: var(--text-h2);
      color: var(--color-ink);
    }
    .inv-stat--ok strong {
      color: var(--color-on-success-soft);
    }
    .inv-stat--warn strong {
      color: var(--color-on-warning-soft);
    }
    .inv-stat--info strong {
      color: var(--color-on-info-soft);
    }
    .inv-stat--danger strong {
      color: var(--color-on-danger-soft);
    }
    .inv-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 960px) {
      .inv-layout {
        grid-template-columns: 1fr;
      }
    }
    .inv-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      padding: 18px;
    }
    .inv-skel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .inv-map-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    .inv-map-head h2,
    .inv-inspector h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .inv-muted {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .inv-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .inv-leg {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      display: inline-block;
      border: 1px solid var(--color-border);
    }
    .dot--available {
      background: var(--color-success-soft);
      border-color: var(--color-success);
    }
    .dot--held {
      background: var(--color-warning-soft);
      border-color: var(--color-warning);
    }
    .dot--booked {
      background: var(--color-info-soft);
      border-color: var(--color-info);
    }
    .dot--blocked {
      background: var(--color-danger-soft);
      border-color: var(--color-danger);
    }
    .inv-grid-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
    }
    .inv-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .inv-row__num {
      width: 24px;
      text-align: right;
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
      flex-shrink: 0;
    }
    .inv-row__seats {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .inv-aisle {
      width: 20px;
      display: inline-block;
    }
    .inv-seat {
      width: 44px;
      height: 38px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      font-size: var(--text-caption);
      font-weight: 700;
      cursor: pointer;
      transition: transform var(--dur-fast) var(--ease);
    }
    .inv-seat:hover {
      transform: translateY(-1px);
    }
    .inv-seat--available {
      background: var(--color-success-soft);
      border-color: var(--color-success);
      color: var(--color-on-success-soft);
    }
    .inv-seat--held {
      background: var(--color-warning-soft);
      border-color: var(--color-warning);
      color: var(--color-on-warning-soft);
    }
    .inv-seat--booked {
      background: var(--color-info-soft);
      border-color: var(--color-info);
      color: var(--color-on-info-soft);
    }
    .inv-seat--blocked {
      background: var(--color-danger-soft);
      border-color: var(--color-danger);
      color: var(--color-on-danger-soft);
    }
    .inv-seat--selected {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
    .inv-inspector {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .inv-detail {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .inv-detail__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .inv-seat-title {
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .inv-dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: var(--text-small);
    }
    .inv-dl div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .inv-dl dt {
      color: var(--color-ink-muted);
    }
    .inv-dl dd {
      margin: 0;
      color: var(--color-ink);
      font-weight: 500;
    }
    .inv-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .inv-field label {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
    }
    .inv-field input {
      height: 38px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .inv-inspector__actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .inv-lock-note {
      margin: 0;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
  `,
})
export class AdminFlightSeatInventory {
  private readonly route = inject(ActivatedRoute);
  private readonly flightService = inject(FlightAdminService);
  private readonly inventoryService = inject(SeatInventoryService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly routeId = Number(
    this.route.snapshot.paramMap.get('id') ?? this.route.snapshot.queryParamMap.get('flight_id') ?? 101,
  );

  protected readonly selectedFlightId = signal(this.routeId || 101);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seatMap = signal<FlightSeatMap | null>(null);
  protected readonly selectedSeatId = signal<number | null>(null);
  protected readonly editSurcharge = signal(0);

  private readonly flightsRes = toSignal(this.flightService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });
  protected readonly flights = computed(() => this.flightsRes()?.data.items ?? []);

  protected readonly selectedSeat = computed(() => {
    const id = this.selectedSeatId();
    return this.seatMap()?.seats.find((s) => s.id === id) ?? null;
  });

  protected readonly seatRows = computed(() => {
    const seats = this.seatMap()?.seats ?? [];
    const byRow = new Map<number, FlightSeatEntry[]>();
    for (const s of seats) {
      const arr = byRow.get(s.seat_row) ?? [];
      arr.push(s);
      byRow.set(s.seat_row, arr);
    }
    return [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rowNumber, rowSeats]) => ({
        rowNumber,
        seats: [...rowSeats].sort((a, b) => a.seat_column.localeCompare(b.seat_column)),
      }));
  });

  constructor() {
    this.loadSeatMap(this.selectedFlightId());
  }

  protected selectFlight(flightId: number): void {
    this.selectedFlightId.set(flightId);
    this.selectedSeatId.set(null);
    this.loadSeatMap(flightId);
  }

  private loadSeatMap(flightId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.inventoryService.getSeatMap(flightId).subscribe({
      next: (res) => {
        this.seatMap.set(res.data);
        const cur = this.selectedSeatId();
        if (cur) {
          const found = res.data.seats.find((s) => s.id === cur);
          if (found) this.editSurcharge.set(found.seat_surcharge);
        }
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được sơ đồ tồn ghế');
        this.loading.set(false);
      },
    });
  }

  protected selectSeat(seat: FlightSeatEntry): void {
    this.selectedSeatId.set(seat.id);
    this.editSurcharge.set(seat.seat_surcharge);
  }

  protected isAisleAfter(col: string): boolean {
    const raw = this.seatMap()?.aisle_after ?? 'C';
    return raw
      .split(',')
      .map((x) => x.trim().toUpperCase())
      .includes(col.toUpperCase());
  }

  protected statusMeta(status: FlightSeatStatus): { label: string; tone: BadgeTone } {
    return SEAT_STATUS_META[status] ?? { label: status, tone: 'neutral' };
  }

  protected cabinLabel(cls: SeatClass): string {
    return CABIN_LABELS[cls] ?? cls;
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected blockSeat(seat: FlightSeatEntry): void {
    this.busy.set(true);
    this.inventoryService.blockSeat(seat.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.snackBar.open(`Đã khóa ghế ${seat.seat_code}`, 'Đóng', { duration: 2500 });
        this.loadSeatMap(this.selectedFlightId());
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.snackBar.open(err.message || 'Không thể khóa ghế', 'Đóng', { duration: 4000 });
      },
    });
  }

  protected unblockSeat(seat: FlightSeatEntry): void {
    this.busy.set(true);
    this.inventoryService.unblockSeat(seat.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.snackBar.open(`Đã mở khóa ghế ${seat.seat_code}`, 'Đóng', { duration: 2500 });
        this.loadSeatMap(this.selectedFlightId());
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.snackBar.open(err.message || 'Không thể mở khóa ghế', 'Đóng', { duration: 4000 });
      },
    });
  }

  protected saveSurcharge(seat: FlightSeatEntry): void {
    if (this.editSurcharge() < 0) {
      this.snackBar.open('Phụ thu không được âm', 'Đóng', { duration: 3000 });
      return;
    }
    this.busy.set(true);
    this.inventoryService
      .saveInventory(this.selectedFlightId(), {
        seats: [
          {
            flight_seat_id: seat.id,
            seat_code: seat.seat_code,
            seat_surcharge: this.editSurcharge(),
          },
        ],
      })
      .subscribe({
        next: (res) => {
          this.busy.set(false);
          this.seatMap.set(res.data);
          this.snackBar.open(`Đã cập nhật phụ thu ghế ${seat.seat_code}`, 'Đóng', { duration: 2500 });
        },
        error: (err: Error) => {
          this.busy.set(false);
          this.snackBar.open(err.message || 'Không thể lưu phụ thu', 'Đóng', { duration: 4000 });
        },
      });
  }
}
