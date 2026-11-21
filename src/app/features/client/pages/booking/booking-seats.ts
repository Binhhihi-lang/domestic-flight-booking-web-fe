import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlightSeatEntry, FlightSeatMap } from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { SeatInventoryService } from '@core/services/flight-admin.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const CABIN_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

/**
 * Bước 2 luồng đặt vé: Chọn ghế trên sơ đồ 3-3 (`/booking/seats`).
 * Ràng buộc nghiệp vụ: Chỉ cho phép chọn ghế nằm trong đúng khoang đã mua (`seat_class`);
 * chọn ghế mới cho hành khách tự động nhả ghế cũ.
 */
@Component({
  selector: 'app-booking-seats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, StatusBadge, SkeletonBlock],
  template: `
    <div class="wrap bs-page">
      <nav class="bs-steps" aria-label="Tiến trình đặt vé">
        <span class="bs-step bs-step--done">1. Chọn chuyến</span>
        <span class="bs-step bs-step--active">2. Chọn ghế</span>
        <span class="bs-step">3. Hành khách & Hành lý</span>
        <span class="bs-step">4. Xem lại & Thanh toán</span>
      </nav>

      <header class="bs-head">
        <div>
          <h1>Chọn ghế ngồi — {{ flightNumber() }}</h1>
          <p class="bs-sub">
            Khoang đã mua:
            <strong>{{ cabinLabel(purchasedCabin()) }}</strong> · Chỉ cho phép chọn ghế trong khoang này
          </p>
        </div>
        <a routerLink="/flights" class="bs-back">← Đổi chuyến bay</a>
      </header>

      @if (loading()) {
        <app-skeleton-block height="280px" />
      } @else {
        <div class="bs-layout">
          <section class="bs-card">
            <div class="bs-legend">
              <span><i class="lg lg--ok"></i>Còn trống (đúng khoang)</span>
              <span><i class="lg lg--sel"></i>Ghế bạn chọn</span>
              <span><i class="lg lg--taken"></i>Đã đặt / Khóa</span>
              <span><i class="lg lg--other"></i>Khác khoang đã mua</span>
            </div>

            <div class="bs-grid">
              @for (row of seatRows(); track row.rowNumber) {
                <div class="bs-row">
                  <span class="bs-row__num">{{ row.rowNumber }}</span>
                  <div class="bs-row__seats">
                    @for (seat of row.seats; track seat.id) {
                      <button
                        type="button"
                        class="bs-seat"
                        [class.bs-seat--available]="isSelectable(seat) && !isSelectedByAny(seat.seat_code)"
                        [class.bs-seat--selected]="isSelectedByAny(seat.seat_code)"
                        [class.bs-seat--wrong-cabin]="!isSameCabin(seat)"
                        [class.bs-seat--taken]="isSameCabin(seat) && seat.status !== 'AVAILABLE'"
                        [disabled]="!isSelectable(seat)"
                        [attr.aria-label]="'Ghế ' + seat.seat_code + ' ' + cabinLabel(seat.seat_type.seat_class)"
                        (click)="pickSeat(seat)"
                      >
                        {{ seat.seat_code }}
                      </button>
                      @if (seat.seat_column === 'C') {
                        <span class="bs-aisle" aria-hidden="true"></span>
                      }
                    }
                  </div>
                  <span class="bs-row__cabin">{{ cabinLabel(row.seats[0].seat_type.seat_class) }}</span>
                </div>
              }
            </div>
          </section>

          <aside class="bs-card bs-side">
            <h2>Hành khách chọn ghế</h2>
            <p class="bs-muted">Bấm vào từng hành khách rồi chọn ghế trên sơ đồ bên trái:</p>

            <div class="bs-pax-list">
              @for (p of passengers(); track p.id) {
                <button
                  type="button"
                  class="bs-pax"
                  [class.bs-pax--active]="activePaxId() === p.id"
                  (click)="activePaxId.set(p.id)"
                >
                  <div>
                    <strong>{{ p.full_name }}</strong>
                    <div class="bs-muted">
                      {{ p.passenger_type === 'ADULT' ? 'Người lớn' : p.passenger_type === 'CHILD' ? 'Trẻ em' : 'Em bé' }}
                    </div>
                  </div>
                  <div class="bs-pax__seat">
                    @if (p.seat_code) {
                      <app-status-badge tone="success" [label]="'Ghế ' + p.seat_code" />
                      <small class="bs-muted">+{{ formatMoney(p.seat_surcharge) }}</small>
                    } @else {
                      <app-status-badge tone="neutral" label="Chưa chọn" />
                    }
                  </div>
                </button>
              }
            </div>

            <div class="bs-total">
              <span>Tổng phụ thu ghế</span>
              <strong class="tabular">{{ formatMoney(totalSeatSurcharge()) }}</strong>
            </div>

            <app-app-button variant="primary" (clicked)="goNext()">
              Tiếp tục nhập hành khách →
            </app-app-button>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .bs-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .bs-steps {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .bs-step {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: var(--text-caption);
      font-weight: 600;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-ink-muted);
    }
    .bs-step--done {
      background: var(--color-success-soft);
      border-color: var(--color-success);
      color: var(--color-on-success-soft);
    }
    .bs-step--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .bs-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .bs-head h1 {
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .bs-sub,
    .bs-muted {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .bs-back {
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 600;
    }
    .bs-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .bs-layout {
        grid-template-columns: 1fr;
      }
    }
    .bs-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: var(--shadow-sm);
    }
    .bs-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 16px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .bs-legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .lg {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid var(--color-border);
    }
    .lg--ok {
      background: var(--color-primary-soft);
      border-color: var(--color-primary);
    }
    .lg--sel {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
    .lg--taken {
      background: var(--color-danger-soft);
      border-color: var(--color-danger);
    }
    .lg--other {
      background: var(--color-border-soft);
    }
    .bs-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-x: auto;
    }
    .bs-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bs-row__num {
      width: 22px;
      text-align: right;
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-muted);
    }
    .bs-row__seats {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .bs-aisle {
      width: 22px;
      display: inline-block;
    }
    .bs-row__cabin {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      white-space: nowrap;
    }
    .bs-seat {
      width: 44px;
      height: 38px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      font-size: var(--text-caption);
      font-weight: 700;
      cursor: pointer;
    }
    .bs-seat--available {
      background: var(--color-primary-soft);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .bs-seat--selected {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .bs-seat--taken {
      background: var(--color-danger-soft);
      border-color: var(--color-danger);
      color: var(--color-on-danger-soft);
      cursor: not-allowed;
    }
    .bs-seat--wrong-cabin {
      background: var(--color-border-soft);
      color: var(--color-ink-subtle);
      opacity: 0.55;
      cursor: not-allowed;
    }
    .bs-side {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bs-side h2 {
      font-size: var(--text-h3);
    }
    .bs-pax-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bs-pax {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      text-align: left;
      cursor: pointer;
    }
    .bs-pax--active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .bs-pax__seat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .bs-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .bs-total strong {
      font-size: var(--text-h3);
      color: var(--color-primary);
    }
  `,
})
export class BookingSeats {
  private readonly bookingFlow = inject(BookingFlowService);
  private readonly inventoryService = inject(SeatInventoryService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly seatMap = signal<FlightSeatMap | null>(null);
  protected readonly passengers = this.bookingFlow.draftPassengers;
  protected readonly activePaxId = signal<number>(1);

  protected readonly flightId = computed(() => this.bookingFlow.selectedFlight()?.id ?? 101);
  protected readonly flightNumber = computed(
    () => this.bookingFlow.selectedFlight()?.flight_number ?? this.seatMap()?.flight_number ?? 'VN-210',
  );
  protected readonly purchasedCabin = computed<SeatClass>(
    () => this.bookingFlow.selectedFare()?.seat_class ?? 'ECONOMY',
  );

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

  protected readonly totalSeatSurcharge = computed(() =>
    this.passengers().reduce((sum, p) => sum + p.seat_surcharge, 0),
  );

  constructor() {
    this.inventoryService.getSeatMap(this.flightId()).subscribe({
      next: (res) => {
        this.seatMap.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected isSameCabin(seat: FlightSeatEntry): boolean {
    return seat.seat_type.seat_class === this.purchasedCabin();
  }

  protected isSelectable(seat: FlightSeatEntry): boolean {
    return this.isSameCabin(seat) && seat.status === 'AVAILABLE';
  }

  protected isSelectedByAny(seatCode: string): boolean {
    return this.passengers().some((p) => p.seat_code === seatCode);
  }

  protected pickSeat(seat: FlightSeatEntry): void {
    if (!this.isSelectable(seat)) return;
    const paxId = this.activePaxId();
    const takenByOther = this.passengers().find(
      (p) => p.id !== paxId && p.seat_code === seat.seat_code,
    );
    if (takenByOther) {
      this.snackBar.open(`Ghế ${seat.seat_code} đã được chọn cho ${takenByOther.full_name}`, 'Đóng', {
        duration: 2500,
      });
      return;
    }
    const current = this.passengers().find((p) => p.id === paxId);
    if (current?.seat_code === seat.seat_code) {
      this.bookingFlow.assignSeat(paxId, null, 0);
    } else {
      // Đổi ghế tự động nhả ghế cũ của hành khách này
      this.bookingFlow.assignSeat(paxId, seat.seat_code, seat.seat_surcharge);
    }
  }

  protected goNext(): void {
    this.router.navigate(['/booking/passengers']);
  }

  protected cabinLabel(cls: SeatClass): string {
    return CABIN_LABELS[cls] ?? cls;
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }
}
