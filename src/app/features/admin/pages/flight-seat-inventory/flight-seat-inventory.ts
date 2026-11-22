import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FlightSeatEntry,
  FlightSeatMap,
  FlightSeatStatus,
  SeatInventoryOverrideItem,
} from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { FlightAdminService, SeatInventoryService } from '@core/services/flight-admin.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { FlightSearchPicker } from '@shared/components/flight-search-picker/flight-search-picker';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const SEAT_STATUS_META: Record<FlightSeatStatus, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: 'Trống', tone: 'success' },
  HOLD: { label: 'Đang giữ', tone: 'warning' },
  HELD: { label: 'Đang giữ', tone: 'warning' },
  BOOKED: { label: 'Đã bán', tone: 'info' },
  BLOCKED: { label: 'Khoá', tone: 'danger' },
};

const CABIN_ORDER: SeatClass[] = ['BUSINESS', 'PREMIUM_ECONOMY', 'ECONOMY'];

const CABIN_LABELS: Record<SeatClass, string> = {
  BUSINESS: 'Hạng Thương gia',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  ECONOMY: 'Hạng Phổ thông',
};

interface SeatRowGroup {
  rowNumber: number;
  seats: FlightSeatEntry[];
}

interface CabinSection {
  seatClass: SeatClass;
  label: string;
  columns: string[];
  rows: SeatRowGroup[];
}

/**
 * Sơ đồ tồn ghế theo chuyến bay (`/admin/flight-seat-inventory` & `/admin/flights/:id/seat-inventory`).
 * Bám sát `admin.html`: một thẻ thống nhất với `.adm-deckbar` trên cùng (chọn chuyến + 5 badge
 * Tổng / Trống / Đang giữ / Đã bán / Khoá + nút `Đồng bộ từ sơ đồ`), sơ đồ thân máy bay toàn chiều rộng,
 * và ngăn chỉnh sửa ghế gọn khi bấm vào từng ghế.
 */
@Component({
  selector: 'app-admin-flight-seat-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatIconModule,
    AppAlert,
    AppButton,
    EmptyState,
    FlightSearchPicker,
    SkeletonBlock,
    StatusBadge,
  ],
  template: `
    <section class="inv-page">
      <header class="inv-head">
        <div>
          <h1>Tồn ghế chuyến bay</h1>
          <p class="inv-sub">
            Theo dõi trạng thái ghế theo chuyến, đồng bộ từ sơ đồ tàu bay và điều chỉnh phụ thu ghế
          </p>
        </div>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Không tải được tồn ghế" [message]="error()!" />
      }

      <div class="inv-card">
        <div class="adm-deckbar">
          <div class="adm-deckbar__picker">
            <app-flight-search-picker
              [multiple]="false"
              [selectedId]="selectedFlightId()"
              [selectedLabels]="flightLabels()"
              placeholder="Tìm chuyến bay để xem tồn ghế..."
              (selectedIdChange)="onFlightPicked($event)"
            />
          </div>

          @if (seatMap(); as map) {
            <div class="adm-deckbar__badges" aria-label="Tóm tắt tồn ghế">
              <span class="deck-badge">
                Tổng <strong class="tabular">{{ map.total_seats }}</strong>
              </span>
              <span class="deck-badge deck-badge--ok">
                Trống <strong class="tabular">{{ map.available_seats }}</strong>
              </span>
              <span class="deck-badge deck-badge--warn">
                Đang giữ <strong class="tabular">{{ map.held_seats }}</strong>
              </span>
              <span class="deck-badge deck-badge--info">
                Đã bán <strong class="tabular">{{ map.booked_seats }}</strong>
              </span>
              <span class="deck-badge deck-badge--danger">
                Khoá <strong class="tabular">{{ map.blocked_seats }}</strong>
              </span>
            </div>

            <app-app-button
              variant="ghost"
              size="sm"
              [disabled]="busy()"
              (clicked)="syncFromSeatMap()"
            >
              <mat-icon aria-hidden="true">sync</mat-icon>
              Đồng bộ từ sơ đồ
            </app-app-button>
          }
        </div>

        @if (loading()) {
          <div class="inv-skel">
            <app-skeleton-block height="70px" />
            <app-skeleton-block height="240px" />
          </div>
        } @else if (!seatMap()) {
          <app-empty-state
            icon="event_seat"
            message="Chọn chuyến bay để xem tồn ghế"
            hint="Sử dụng ô tìm kiếm chuyến bay phía trên để tải sơ đồ ghế"
          />
        } @else {
          @let map = seatMap()!;
          <div class="inv-map-head">
            <div>
              <h2>Sơ đồ ghế {{ map.flight_number }}</h2>
              <p class="inv-muted">{{ map.aircraft_code }} · {{ map.model }} ({{ map.total_seats }} ghế)</p>
            </div>
            <div class="inv-legend">
              <span class="inv-leg"><i class="dot dot--available"></i>Trống</span>
              <span class="inv-leg"><i class="dot dot--held"></i>Đang giữ</span>
              <span class="inv-leg"><i class="dot dot--booked"></i>Đã bán</span>
              <span class="inv-leg"><i class="dot dot--blocked"></i>Khoá</span>
            </div>
          </div>

          <div class="inv-fuselage">
            <div class="inv-nose" aria-hidden="true">
              <mat-icon>flight</mat-icon>
              <span>Đầu máy bay</span>
            </div>

            @for (cabin of cabinSections(); track cabin.seatClass) {
              <div class="inv-cabin">
                <div class="inv-cabin__title">{{ cabin.label }}</div>

                <div class="inv-grid-wrap">
                  <div class="inv-row inv-row--head" aria-hidden="true">
                    <span class="inv-row__num"></span>
                    <div class="inv-row__seats">
                      @for (col of cabin.columns; track col) {
                        <span class="inv-col-lbl">{{ col }}</span>
                        @if (isAisleAfter(col)) {
                          <span class="inv-aisle"></span>
                        }
                      }
                    </div>
                  </div>

                  @for (row of cabin.rows; track row.rowNumber) {
                    <div class="inv-row">
                      <span class="inv-row__num tabular">{{ row.rowNumber }}</span>
                      <div class="inv-row__seats">
                        @for (seat of row.seats; track seat.id) {
                          <button
                            type="button"
                            class="inv-seat"
                            [style.--seat-color]="seat.seat_type.color_hex || 'var(--color-primary)'"
                            [class.inv-seat--available]="seat.status === 'AVAILABLE'"
                            [class.inv-seat--held]="seat.status === 'HOLD' || seat.status === 'HELD'"
                            [class.inv-seat--booked]="seat.status === 'BOOKED'"
                            [class.inv-seat--blocked]="seat.status === 'BLOCKED'"
                            [class.inv-seat--selected]="selectedSeat()?.id === seat.id"
                            [attr.aria-label]="
                              'Ghế ' +
                              seat.seat_code +
                              ' - ' +
                              seat.seat_type.seat_type_name +
                              ' - ' +
                              statusMeta(seat.status).label
                            "
                            [title]="
                              seat.seat_code +
                              ' · ' +
                              seat.seat_type.seat_type_name +
                              ' · ' +
                              formatMoney(seat.seat_surcharge)
                            "
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
            }
          </div>

          @if (selectedSeat(); as seat) {
            <div class="inv-drawer" role="region" aria-label="Chỉnh sửa ghế đang chọn">
              <div class="inv-drawer__head">
                <div class="inv-detail__top">
                  <strong class="inv-seat-title">Ghế {{ seat.seat_code }}</strong>
                  <app-status-badge
                    [tone]="statusMeta(seat.status).tone"
                    [label]="statusMeta(seat.status).label"
                  />
                  <span class="inv-muted">
                    {{ cabinLabel(seat.seat_type.seat_class) }} · {{ seat.seat_type.seat_type_name }}
                  </span>
                </div>
                <button
                  type="button"
                  class="inv-drawer__close"
                  aria-label="Đóng chi tiết ghế"
                  (click)="selectedSeatId.set(null)"
                >
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="inv-drawer__body">
                <div class="inv-field">
                  <label for="inv-sur">
                    Phụ thu ghế (VNĐ) — mặc định {{ formatMoney(seat.seat_type.surcharge) }}
                  </label>
                  <input
                    id="inv-sur"
                    type="number"
                    min="0"
                    step="10000"
                    [ngModel]="editSurcharge()"
                    (ngModelChange)="editSurcharge.set(+$event)"
                  />
                </div>

                <div class="inv-drawer__actions">
                  <app-app-button
                    variant="primary"
                    size="sm"
                    [disabled]="busy()"
                    (clicked)="saveSurcharge(seat)"
                  >
                    {{ busy() ? 'Đang lưu...' : 'Lưu phụ thu' }}
                  </app-app-button>

                  <app-app-button
                    variant="ghost"
                    size="sm"
                    [disabled]="busy()"
                    (clicked)="resetSurcharge(seat)"
                  >
                    <mat-icon aria-hidden="true">restart_alt</mat-icon>
                    Đặt lại mặc định
                  </app-app-button>

                  @if (seat.status === 'AVAILABLE') {
                    <app-app-button
                      variant="danger"
                      size="sm"
                      [disabled]="busy()"
                      (clicked)="blockSeat(seat)"
                    >
                      <mat-icon aria-hidden="true">lock</mat-icon>
                      Khóa ghế
                    </app-app-button>
                  } @else if (seat.status === 'BLOCKED') {
                    <app-app-button
                      variant="secondary"
                      size="sm"
                      [disabled]="busy()"
                      (clicked)="unblockSeat(seat)"
                    >
                      <mat-icon aria-hidden="true">lock_open</mat-icon>
                      Mở khóa ghế
                    </app-app-button>
                  } @else {
                    <span class="inv-lock-note">
                      Ghế đang có khách đặt/giữ nên không thể khóa hoặc mở khóa thủ công.
                    </span>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .inv-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .inv-head h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .inv-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .inv-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .adm-deckbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--color-border-soft);
    }
    .adm-deckbar__picker {
      flex: 1 1 260px;
      min-width: 240px;
      max-width: 340px;
    }
    .adm-deckbar__badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-right: auto;
    }
    .deck-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .deck-badge strong {
      font-size: var(--text-small);
      color: var(--color-ink);
    }
    .deck-badge--ok {
      background: var(--color-success-soft);
      border-color: var(--color-success);
      color: var(--color-on-success-soft);
    }
    .deck-badge--ok strong {
      color: var(--color-on-success-soft);
    }
    .deck-badge--warn {
      background: var(--color-warning-soft);
      border-color: var(--color-warning);
      color: var(--color-on-warning-soft);
    }
    .deck-badge--warn strong {
      color: var(--color-on-warning-soft);
    }
    .deck-badge--info {
      background: var(--color-info-soft);
      border-color: var(--color-info);
      color: var(--color-on-info-soft);
    }
    .deck-badge--info strong {
      color: var(--color-on-info-soft);
    }
    .deck-badge--danger {
      background: var(--color-danger-soft);
      border-color: var(--color-danger);
      color: var(--color-on-danger-soft);
    }
    .deck-badge--danger strong {
      color: var(--color-on-danger-soft);
    }
    .tabular {
      font-variant-numeric: tabular-nums;
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
    }
    .inv-map-head h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .inv-muted {
      margin: 2px 0 0;
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
    .inv-fuselage {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      padding: 18px 12px;
      border: 1px solid var(--color-border-soft);
      border-radius: 42px 42px var(--radius-lg) var(--radius-lg);
      background: var(--color-surface-alt);
    }
    .inv-nose {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-caption);
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .inv-nose mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .inv-cabin {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding-top: 10px;
      border-top: 1px dashed var(--color-border);
    }
    .inv-cabin__title {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .inv-grid-wrap {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-x: auto;
      max-width: 100%;
      padding: 2px 6px 6px;
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
    .inv-col-lbl {
      width: 44px;
      text-align: center;
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-subtle);
    }
    .inv-aisle {
      width: 20px;
      display: inline-block;
      flex-shrink: 0;
    }
    .inv-seat {
      --seat-color: var(--color-primary);
      width: 44px;
      height: 38px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--color-border);
      font-size: var(--text-caption);
      font-weight: 700;
      cursor: pointer;
      transition: transform var(--dur-fast) var(--ease);
    }
    .inv-seat:hover {
      transform: translateY(-1px);
    }
    .inv-seat--available {
      background: color-mix(in srgb, var(--seat-color) 14%, var(--color-surface));
      border-color: var(--seat-color);
      color: var(--color-ink);
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
    .inv-drawer {
      padding: 14px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--color-primary-bright);
      background: var(--color-surface-alt);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .inv-drawer__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .inv-detail__top {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .inv-seat-title {
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .inv-drawer__close {
      border: 0;
      background: transparent;
      color: var(--color-ink-muted);
      cursor: pointer;
      display: inline-flex;
      padding: 4px;
      border-radius: var(--radius-sm);
    }
    .inv-drawer__close:hover {
      background: var(--color-border-soft);
      color: var(--color-ink);
    }
    .inv-drawer__body {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
    }
    .inv-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 240px;
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
    .inv-drawer__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .inv-lock-note {
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

  private readonly routeIdRaw =
    this.route.snapshot.paramMap.get('id') ?? this.route.snapshot.queryParamMap.get('flight_id');
  private readonly initialFlightId = this.routeIdRaw ? Number(this.routeIdRaw) || null : null;

  protected readonly selectedFlightId = signal<number | null>(this.initialFlightId);
  protected readonly flightLabels = signal<Record<number, string>>({});
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seatMap = signal<FlightSeatMap | null>(null);
  protected readonly selectedSeatId = signal<number | null>(null);
  protected readonly editSurcharge = signal(0);

  protected readonly selectedSeat = computed(() => {
    const id = this.selectedSeatId();
    return this.seatMap()?.seats.find((s) => s.id === id) ?? null;
  });

  protected readonly cabinSections = computed<CabinSection[]>(() => {
    const seats = this.seatMap()?.seats ?? [];
    if (seats.length === 0) return [];

    const byCabin = new Map<SeatClass, FlightSeatEntry[]>();
    for (const seat of seats) {
      const cls = seat.seat_type.seat_class;
      const list = byCabin.get(cls) ?? [];
      list.push(seat);
      byCabin.set(cls, list);
    }

    const sections: CabinSection[] = [];
    for (const cls of CABIN_ORDER) {
      const cabinSeats = byCabin.get(cls);
      if (!cabinSeats || cabinSeats.length === 0) continue;

      const colSet = new Set<string>();
      const byRow = new Map<number, FlightSeatEntry[]>();
      for (const s of cabinSeats) {
        colSet.add(s.seat_column);
        const arr = byRow.get(s.seat_row) ?? [];
        arr.push(s);
        byRow.set(s.seat_row, arr);
      }

      const columns = [...colSet].sort((a, b) => a.localeCompare(b));
      const rows = [...byRow.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rowNumber, rowSeats]) => ({
          rowNumber,
          seats: [...rowSeats].sort((a, b) => a.seat_column.localeCompare(b.seat_column)),
        }));

      sections.push({
        seatClass: cls,
        label: CABIN_LABELS[cls] ?? cls,
        columns,
        rows,
      });
    }
    return sections;
  });

  constructor() {
    if (this.initialFlightId) {
      this.loadSeatMap(this.initialFlightId);
    } else {
      this.loadFirstAvailableFlight();
    }
  }

  private loadFirstAvailableFlight(): void {
    this.loading.set(true);
    this.flightService.list({ page: 1, size: 1 }).subscribe({
      next: (res) => {
        const first = res.data.items[0];
        if (first) {
          this.selectedFlightId.set(first.id);
          this.flightLabels.set({
            [first.id]: `${first.flight_number} · ${first.departure_airport.airport_code} → ${first.arrival_airport.airport_code}`,
          });
          this.loadSeatMap(first.id);
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected onFlightPicked(flightId: number | null): void {
    this.selectedFlightId.set(flightId);
    this.selectedSeatId.set(null);
    if (flightId) {
      this.loadSeatMap(flightId);
    } else {
      this.seatMap.set(null);
    }
  }

  protected syncFromSeatMap(): void {
    const flightId = this.selectedFlightId();
    if (!flightId) return;
    this.busy.set(true);
    this.inventoryService.saveInventory(flightId, { seats: [] }).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.seatMap.set(res.data);
        this.snackBar.open('Đã đồng bộ tồn ghế từ sơ đồ tàu bay', 'Đóng', { duration: 2500 });
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.snackBar.open(err.message || 'Không thể đồng bộ tồn ghế', 'Đóng', { duration: 4000 });
      },
    });
  }

  private loadSeatMap(flightId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.inventoryService.getSeatMap(flightId).subscribe({
      next: (res) => {
        this.seatMap.set(res.data);
        if (!this.flightLabels()[flightId]) {
          this.flightLabels.set({
            ...this.flightLabels(),
            [flightId]: `${res.data.flight_number} · ${res.data.aircraft_code}`,
          });
        }
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
    const raw = this.seatMap()?.aisle_after;
    if (!raw) return false;
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
    const flightId = this.selectedFlightId();
    if (!flightId) return;
    this.busy.set(true);
    this.inventoryService.blockSeat(seat.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.snackBar.open(`Đã khóa ghế ${seat.seat_code}`, 'Đóng', { duration: 2500 });
        this.loadSeatMap(flightId);
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.snackBar.open(err.message || 'Không thể khóa ghế', 'Đóng', { duration: 4000 });
      },
    });
  }

  protected unblockSeat(seat: FlightSeatEntry): void {
    const flightId = this.selectedFlightId();
    if (!flightId) return;
    this.busy.set(true);
    this.inventoryService.unblockSeat(seat.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.snackBar.open(`Đã mở khóa ghế ${seat.seat_code}`, 'Đóng', { duration: 2500 });
        this.loadSeatMap(flightId);
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.snackBar.open(err.message || 'Không thể mở khóa ghế', 'Đóng', { duration: 4000 });
      },
    });
  }

  protected saveSurcharge(seat: FlightSeatEntry): void {
    const flightId = this.selectedFlightId();
    if (!flightId) return;
    if (this.editSurcharge() < 0) {
      this.snackBar.open('Phụ thu không được âm', 'Đóng', { duration: 3000 });
      return;
    }
    this.busy.set(true);
    this.inventoryService
      .saveInventory(flightId, {
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

  protected resetSurcharge(seat: FlightSeatEntry): void {
    const flightId = this.selectedFlightId();
    if (!flightId) return;
    this.busy.set(true);
    const resetItem = {
      flight_seat_id: seat.id,
      seat_code: seat.seat_code,
      seat_surcharge: seat.seat_type.surcharge,
      surcharge_override: null,
    } as unknown as SeatInventoryOverrideItem;

    this.inventoryService.saveInventory(flightId, { seats: [resetItem] }).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.seatMap.set(res.data);
        this.editSurcharge.set(seat.seat_type.surcharge);
        this.snackBar.open(`Đã đặt lại phụ thu mặc định cho ghế ${seat.seat_code}`, 'Đóng', {
          duration: 2500,
        });
      },
      error: (err: Error) => {
        this.busy.set(false);
        this.snackBar.open(err.message || 'Không thể đặt lại phụ thu mặc định', 'Đóng', {
          duration: 4000,
        });
      },
    });
  }
}
