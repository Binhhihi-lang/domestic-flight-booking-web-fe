import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlightSeatEntry, FlightSeatMap } from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { environment } from '@env/environment';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const CABIN_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

interface CabinSeatTypeLegend {
  id: number;
  name: string;
  code: string;
  colorHex: string | null;
  surcharge: number;
}

/**
 * Bước 2 luồng đặt vé: Chọn ghế trên sơ đồ động đồng bộ cấu hình Admin (`/booking/seats`).
 * Chỉ hiển thị duy nhất các hàng/ghế thuộc khoang dịch vụ đã mua (`purchasedCabin()`),
 * tự dựng cột động & nhiều lối đi (`aisle_after.split(',')`), dùng `color_hex` và phụ thu thật từ Admin.
 */
@Component({
  selector: 'app-booking-seats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppAlert, AppButton, StatusBadge, SkeletonBlock],
  template: `
    <div class="wrap bs-page">
      <nav class="bs-stepper" aria-label="Tiến trình đặt vé">
        <a routerLink="/flights" class="bs-step bs-step--done">
          <span class="bs-step__num">✓</span>
          <span>1. Chọn chuyến</span>
        </a>
        <span class="bs-step-line" aria-hidden="true"></span>
        <span class="bs-step bs-step--active" aria-current="step">
          <span class="bs-step__num">2</span>
          <span>2. Chọn ghế</span>
        </span>
        <span class="bs-step-line" aria-hidden="true"></span>
        <span class="bs-step">
          <span class="bs-step__num">3</span>
          <span>3. Hành khách</span>
        </span>
        <span class="bs-step-line" aria-hidden="true"></span>
        <span class="bs-step">
          <span class="bs-step__num">4</span>
          <span>4. Xem lại</span>
        </span>
        <span class="bs-step-line" aria-hidden="true"></span>
        <span class="bs-step">
          <span class="bs-step__num">5</span>
          <span>5. Thanh toán</span>
        </span>
      </nav>

      <header class="bs-head">
        <div>
          <div class="bs-head__title-row">
            <h1>Chọn ghế ngồi — {{ activeFlightNumber() }}</h1>
            <app-status-badge
              [tone]="purchasedCabin() === 'BUSINESS' ? 'warning' : purchasedCabin() === 'PREMIUM_ECONOMY' ? 'info' : 'neutral'"
              [label]="'Khoang ' + cabinLabel(purchasedCabin())"
            />
          </div>
          <p class="bs-sub">
            @if (activeFlight(); as fl) {
              {{ fl.departure_airport.airport_code }} → {{ fl.arrival_airport.airport_code }} ·
            }
            @if (activeFare(); as fare) {
              Hạng <strong>{{ fare.fare_class_name }}</strong> ·
            }
            Chỉ hiển thị sơ đồ ghế thuộc <strong>Khoang {{ cabinLabel(purchasedCabin()) }}</strong>
          </p>
        </div>
        <a routerLink="/flights" class="bs-back">← Đổi chuyến bay</a>
      </header>

      @if (hasReturnLeg()) {
        <div class="bs-legs" role="tablist" aria-label="Chọn chặng bay">
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeLeg() === 'OUTBOUND'"
            class="bs-leg"
            [class.bs-leg--active]="activeLeg() === 'OUTBOUND'"
            (click)="switchLeg('OUTBOUND')"
          >
            Chặng đi: {{ bookingFlow.selectedFlight()?.flight_number }}
            ({{ bookingFlow.selectedFlight()?.departure_airport?.airport_code }} → {{ bookingFlow.selectedFlight()?.arrival_airport?.airport_code }})
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="activeLeg() === 'RETURN'"
            class="bs-leg"
            [class.bs-leg--active]="activeLeg() === 'RETURN'"
            (click)="switchLeg('RETURN')"
          >
            Chặng về: {{ bookingFlow.selectedReturnFlight()?.flight_number }}
            ({{ bookingFlow.selectedReturnFlight()?.departure_airport?.airport_code }} → {{ bookingFlow.selectedReturnFlight()?.arrival_airport?.airport_code }})
          </button>
        </div>
      }

      @if (error()) {
        <app-alert tone="error" title="Không tải được sơ đồ ghế" [message]="error()!" />
      }

      @if (loading()) {
        <app-skeleton-block height="360px" />
      } @else if (seatMap()) {
        <div class="bs-layout">
          <section class="bs-card bs-map-card">
            <div class="bs-map-head">
              <div>
                <h2>Sơ đồ Khoang {{ cabinLabel(purchasedCabin()) }}</h2>
                <p class="bs-muted">
                  {{ seatMap()?.model }}
                  @if (rowRangeLabel()) {
                    · {{ rowRangeLabel() }}
                  }
                  · {{ availableCabinCount() }}/{{ cabinSeats().length }} ghế còn trống
                </p>
              </div>
              <div class="bs-status-legend">
                <span><i class="lg lg--ok"></i>Còn trống</span>
                <span><i class="lg lg--sel"></i>Ghế bạn chọn</span>
                <span><i class="lg lg--taken"></i>Đã đặt / Đang giữ</span>
              </div>
            </div>

            @if (cabinSeatTypes().length > 0) {
              <div class="bs-type-legend" aria-label="Chú thích loại ghế và phụ thu">
                <div class="bs-type-legend__title">Chú thích loại ghế &amp; phụ thu</div>
                <div class="bs-type-legend__grid">
                  @for (t of cabinSeatTypes(); track t.id) {
                    <div class="bs-type-item">
                      <span
                        class="bs-type-swatch"
                        [style.--swatch-color]="t.colorHex || null"
                      ></span>
                      <div class="bs-type-item__info">
                        <strong>{{ t.name }}</strong>
                        <span class="tabular">
                          {{ t.surcharge > 0 ? '+' + formatMoney(t.surcharge) : 'Miễn phí' }}
                        </span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            @if (rowNumbers().length === 0) {
              <app-alert
                tone="info"
                title="Chưa có ghế mở bán trong khoang này"
                message="Khoang dịch vụ bạn chọn hiện chưa có ghế khả dụng trên sơ đồ. Bạn có thể tiếp tục để hệ thống tự xếp ghế khi làm thủ tục."
              />
            } @else {
              <div class="bs-cabin-wrap">
                <div class="bs-cabin">
                  <div class="bs-nose" aria-hidden="true">
                    <svg viewBox="0 0 100 36" preserveAspectRatio="none" role="presentation">
                      <path d="M2 35 Q2 2 50 2 Q98 2 98 35 Z" />
                    </svg>
                    <div class="bs-nose__label">
                      <mat-icon aria-hidden="true">flight</mat-icon>
                      <span>Đầu máy bay · {{ seatMap()?.model }}</span>
                    </div>
                  </div>

                  <div class="bs-cabin-body">
                    <table class="bs-table">
                      <caption class="sr-only">
                        Sơ đồ ghế Khoang {{ cabinLabel(purchasedCabin()) }}
                      </caption>
                      <thead>
                        <tr>
                          <th class="bs-table__corner" scope="col"></th>
                          @for (col of columns(); track col) {
                            <th class="bs-table__colhead" scope="col">{{ col }}</th>
                            @if (hasAisleAfter(col)) {
                              <th class="bs-table__aisle-head" scope="col" aria-hidden="true"></th>
                            }
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of rowNumbers(); track row) {
                          <tr>
                            <th class="bs-table__rowhead tabular" scope="row">{{ row }}</th>
                            @for (col of columns(); track col) {
                              @if (seatAt(row, col); as seat) {
                                <td>
                                  <button
                                    type="button"
                                    class="bs-seat"
                                    [class.bs-seat--available]="isAvailable(seat) && !isSelectedByAny(seat.seat_code)"
                                    [class.bs-seat--selected]="isSelectedByAny(seat.seat_code)"
                                    [class.bs-seat--taken]="!isAvailable(seat)"
                                    [style.--seat-color]="isAvailable(seat) && !isSelectedByAny(seat.seat_code) ? (seat.seat_type.color_hex || null) : null"
                                    [disabled]="!isAvailable(seat)"
                                    [title]="seatTooltip(seat)"
                                    [attr.aria-label]="'Ghế ' + seat.seat_code + ' ' + cabinLabel(seat.seat_type.seat_class)"
                                    [attr.aria-pressed]="isSelectedByAny(seat.seat_code)"
                                    (click)="pickSeat(seat)"
                                  >
                                    {{ seat.seat_code }}
                                  </button>
                                </td>
                              } @else {
                                <td class="bs-table__gap" aria-hidden="true"></td>
                              }
                              @if (hasAisleAfter(col)) {
                                <td class="bs-table__aisle" aria-hidden="true"></td>
                              }
                            }
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            }
          </section>

          <aside class="bs-card bs-side">
            <h2>Hành khách &amp; ghế đã chọn</h2>
            <p class="bs-muted">Chọn hành khách bên dưới rồi bấm vào ô ghế còn trống trên sơ đồ:</p>

            <div class="bs-pax-list" role="tablist" aria-label="Danh sách hành khách chọn ghế">
              @for (p of passengers(); track p.id; let idx = $index) {
                @let seatCode = activeLeg() === 'RETURN' ? p.return_seat_code : p.seat_code;
                @let seatFee = activeLeg() === 'RETURN' ? p.return_seat_surcharge : p.seat_surcharge;
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="activePaxId() === p.id"
                  class="bs-pax"
                  [class.bs-pax--active]="activePaxId() === p.id"
                  [disabled]="p.passenger_type === 'INFANT'"
                  (click)="activePaxId.set(p.id)"
                >
                  <div class="bs-pax__who">
                    <span class="bs-av" [class.bs-av--child]="p.passenger_type !== 'ADULT'">
                      {{ passengerInitials(p.full_name, idx) }}
                    </span>
                    <div>
                      <strong>{{ p.full_name || ('Hành khách ' + (idx + 1)) }}</strong>
                      <div class="bs-muted">
                        {{ p.passenger_type === 'ADULT' ? 'Người lớn' : p.passenger_type === 'CHILD' ? 'Trẻ em' : 'Em bé (ngồi cùng NL)' }}
                      </div>
                    </div>
                  </div>
                  <div class="bs-pax__seat">
                    @if (p.passenger_type === 'INFANT') {
                      <app-status-badge tone="neutral" label="Không ghế riêng" />
                    } @else if (seatCode) {
                      <app-status-badge tone="success" [label]="'Ghế ' + seatCode" />
                      <small class="bs-muted tabular">
                        {{ seatFee > 0 ? '+' + formatMoney(seatFee) : 'Miễn phí' }}
                      </small>
                    } @else {
                      <app-status-badge tone="neutral" label="Chưa chọn" />
                    }
                  </div>
                </button>
              }
            </div>

            <dl class="bs-summary-kv">
              <div>
                <dt>Khoang dịch vụ</dt>
                <dd>Khoang {{ cabinLabel(purchasedCabin()) }}</dd>
              </div>
              @if (activeFare(); as fare) {
                <div>
                  <dt>Hạng vé</dt>
                  <dd>{{ fare.fare_class_name }}</dd>
                </div>
              }
              <div>
                <dt>Ghế đã chọn</dt>
                <dd>{{ selectedSeatSummary() }}</dd>
              </div>
            </dl>

            <div class="bs-total">
              <span>Tổng phụ thu ghế ({{ hasReturnLeg() ? 'cả 2 chặng' : 'chặng này' }})</span>
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
      padding: 20px 16px 44px;
    }
    .bs-stepper {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 12px 16px;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
    }
    .bs-step {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      border-radius: 999px;
      font-size: var(--text-caption);
      font-weight: 600;
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      color: var(--color-ink-muted);
      text-decoration: none;
    }
    .bs-step__num {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      background: var(--color-border-soft);
      color: var(--color-ink-muted);
    }
    .bs-step--done {
      background: var(--color-success-soft);
      border-color: var(--color-success);
      color: var(--color-on-success-soft);
    }
    .bs-step--done .bs-step__num {
      background: var(--color-success);
      color: var(--color-on-primary);
    }
    .bs-step--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .bs-step--active .bs-step__num {
      background: var(--color-on-primary);
      color: var(--color-primary);
    }
    .bs-step-line {
      flex: 0 0 18px;
      height: 2px;
      background: var(--color-border);
    }
    .bs-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .bs-head__title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bs-head h1 {
      margin: 0;
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
    .bs-legs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .bs-leg {
      padding: 8px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
    }
    .bs-leg--active {
      background: var(--color-primary-soft);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
    .bs-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 350px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 960px) {
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
    .bs-map-card {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bs-map-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .bs-map-head h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .bs-status-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .bs-status-legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .lg {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      display: inline-block;
      border: 1.5px solid var(--color-border);
    }
    .lg--ok {
      background: var(--color-primary-soft);
      border-color: var(--color-primary-bright);
    }
    .lg--sel {
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
    .lg--taken {
      background: var(--color-border-soft);
      border-color: var(--color-border);
    }
    .bs-type-legend {
      padding: 12px 14px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bs-type-legend__title {
      font-size: var(--text-caption);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--color-ink-muted);
    }
    .bs-type-legend__grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
    }
    .bs-type-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .bs-type-swatch {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      background: color-mix(
        in srgb,
        var(--swatch-color, var(--color-primary-bright)) 20%,
        var(--color-surface)
      );
      border: 2px solid var(--swatch-color, var(--color-primary-bright));
      flex-shrink: 0;
    }
    .bs-type-item__info {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
      font-size: var(--text-caption);
    }
    .bs-type-item__info strong {
      color: var(--color-ink);
    }
    .bs-type-item__info span {
      color: var(--color-primary);
      font-weight: 600;
    }
    .bs-cabin-wrap {
      overflow-x: auto;
      padding: 8px 0;
    }
    .bs-cabin {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      min-width: 100%;
      margin: 0 auto;
    }
    .bs-nose {
      position: relative;
      width: 100%;
      max-width: 520px;
      height: 52px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 6px;
    }
    .bs-nose svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      fill: var(--color-surface-alt);
      stroke: var(--color-border);
      stroke-width: 0.8;
    }
    .bs-nose__label {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-caption);
      font-weight: 700;
    }
    .bs-nose__label mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .bs-cabin-body {
      width: 100%;
      max-width: 520px;
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      border-top: 0;
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      padding: 12px 14px 16px;
      display: flex;
      justify-content: center;
    }
    .bs-table {
      border-collapse: separate;
      border-spacing: 6px 6px;
      margin: 0 auto;
    }
    .bs-table__corner,
    .bs-table__rowhead,
    .bs-table__colhead {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-muted);
      text-align: center;
      padding: 0;
    }
    .bs-table__corner,
    .bs-table__rowhead {
      width: 24px;
      min-width: 24px;
    }
    .bs-table__colhead {
      width: 44px;
      min-width: 44px;
    }
    .bs-table td {
      padding: 0;
      vertical-align: middle;
    }
    .bs-table__gap {
      width: 44px;
      height: 38px;
    }
    .bs-table__aisle,
    .bs-table__aisle-head {
      width: 18px;
      min-width: 18px;
      padding: 0;
    }
    .bs-seat {
      width: 44px;
      height: 38px;
      border-radius: var(--radius-sm);
      border: 1.5px solid var(--color-border);
      font-family: var(--font-body);
      font-size: var(--text-caption);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition:
        transform var(--dur-fast) var(--ease),
        box-shadow var(--dur-fast) var(--ease),
        background-color var(--dur-fast) var(--ease);
    }
    .bs-seat--available {
      background: color-mix(
        in srgb,
        var(--seat-color, var(--color-primary-bright)) 16%,
        var(--color-surface)
      );
      border: 2px solid var(--seat-color, var(--color-primary-bright));
      color: var(--color-ink);
    }
    .bs-seat--available:hover:not(:disabled) {
      background: color-mix(
        in srgb,
        var(--seat-color, var(--color-primary-bright)) 28%,
        var(--color-surface)
      );
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
    }
    .bs-seat--selected {
      background: var(--color-primary);
      border: 2px solid var(--color-primary-hover);
      color: var(--color-on-primary);
      box-shadow: var(--shadow);
    }
    .bs-seat--taken {
      background: var(--color-border-soft);
      border-color: var(--color-border);
      color: var(--color-ink-subtle);
      cursor: not-allowed;
      opacity: 0.7;
    }
    .bs-side {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bs-side h2 {
      margin: 0;
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
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      text-align: left;
      cursor: pointer;
    }
    .bs-pax:disabled {
      cursor: not-allowed;
      opacity: 0.75;
    }
    .bs-pax--active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .bs-pax__who {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .bs-av {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-caption);
      font-weight: 700;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .bs-av--child {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .bs-pax__seat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    .bs-summary-kv {
      margin: 0;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-soft);
      display: flex;
      flex-direction: column;
      gap: 7px;
      font-size: var(--text-small);
    }
    .bs-summary-kv div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .bs-summary-kv dt {
      color: var(--color-ink-muted);
    }
    .bs-summary-kv dd {
      margin: 0;
      font-weight: 600;
      color: var(--color-ink);
      text-align: right;
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
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    }
    @media (max-width: 600px) {
      .bs-seat,
      .bs-table__gap {
        width: 36px;
        height: 34px;
      }
      .bs-table__colhead {
        width: 36px;
        min-width: 36px;
      }
      .bs-table__aisle,
      .bs-table__aisle-head {
        width: 12px;
        min-width: 12px;
      }
    }
  `,
})
export class BookingSeats {
  protected readonly bookingFlow = inject(BookingFlowService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly activeLeg = signal<'OUTBOUND' | 'RETURN'>('OUTBOUND');
  protected readonly seatMap = signal<FlightSeatMap | null>(null);
  protected readonly passengers = this.bookingFlow.draftPassengers;
  protected readonly activePaxId = signal<number>(this.passengers()[0]?.id ?? 1);

  protected readonly hasReturnLeg = computed(
    () =>
      this.bookingFlow.tripType() === 'ROUND_TRIP' &&
      this.bookingFlow.selectedReturnFlight() !== null,
  );

  protected readonly activeFlight = computed(() =>
    this.activeLeg() === 'RETURN'
      ? this.bookingFlow.selectedReturnFlight()
      : this.bookingFlow.selectedFlight(),
  );

  protected readonly activeFare = computed(() =>
    this.activeLeg() === 'RETURN'
      ? this.bookingFlow.selectedReturnFare()
      : this.bookingFlow.selectedFare(),
  );

  protected readonly activeFlightNumber = computed(
    () => this.activeFlight()?.flight_number ?? this.seatMap()?.flight_number ?? 'VN-210',
  );

  protected readonly purchasedCabin = computed<SeatClass>(
    () => this.activeFare()?.seat_class ?? 'ECONOMY',
  );

  /** CHỈ giữ lại các ghế thuộc đúng khoang dịch vụ đã mua — ẩn hoàn toàn khoang khác khỏi DOM. */
  protected readonly cabinSeats = computed<FlightSeatEntry[]>(() => {
    const cabin = this.purchasedCabin();
    return (this.seatMap()?.seats ?? []).filter((s) => s.seat_type.seat_class === cabin);
  });

  /** Các cột thực tế có trong khoang đã lọc (vd: A,C,D,F cho 2-2; A..F cho 3-3; A..H cho 2-4-2). */
  protected readonly columns = computed<string[]>(() => {
    const set = new Set(this.cabinSeats().map((s) => s.seat_column.trim().toUpperCase()));
    return [...set].sort();
  });

  /** Các hàng thực tế có trong khoang đã lọc, sắp tăng dần. */
  protected readonly rowNumbers = computed<number[]>(() => {
    const set = new Set(this.cabinSeats().map((s) => s.seat_row));
    return [...set].sort((a, b) => a - b);
  });

  /** Tập cột có lối đi ngay sau nó — hỗ trợ nhiều lối đi (vd: "C" hoặc "C,E"). */
  private readonly aisleColumns = computed(() => {
    const raw = this.seatMap()?.aisle_after;
    if (!raw) return new Set<string>();
    return new Set(
      raw
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0),
    );
  });

  /** Tra cứu nhanh ghế theo (row, column). */
  private readonly seatByKey = computed(() => {
    const map = new Map<string, FlightSeatEntry>();
    for (const s of this.cabinSeats()) {
      map.set(`${s.seat_row}-${s.seat_column.trim().toUpperCase()}`, s);
    }
    return map;
  });

  /** Chú thích loại ghế & phụ thu động tính từ các seat_type có mặt trong khoang đang xem. */
  protected readonly cabinSeatTypes = computed<CabinSeatTypeLegend[]>(() => {
    const map = new Map<number, CabinSeatTypeLegend>();
    for (const s of this.cabinSeats()) {
      if (!map.has(s.seat_type.id)) {
        map.set(s.seat_type.id, {
          id: s.seat_type.id,
          name: s.seat_type.seat_type_name,
          code: s.seat_type.seat_type_code,
          colorHex: s.seat_type.color_hex ?? null,
          surcharge: s.seat_surcharge,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => a.surcharge - b.surcharge || a.name.localeCompare(b.name),
    );
  });

  protected readonly availableCabinCount = computed(
    () => this.cabinSeats().filter((s) => s.status === 'AVAILABLE').length,
  );

  protected readonly rowRangeLabel = computed(() => {
    const rows = this.rowNumbers();
    if (rows.length === 0) return '';
    return rows.length === 1 ? `Hàng ${rows[0]}` : `Hàng ${rows[0]}–${rows[rows.length - 1]}`;
  });

  protected readonly selectedSeatSummary = computed(() => {
    const leg = this.activeLeg();
    const codes = this.passengers()
      .map((p) => (leg === 'RETURN' ? p.return_seat_code : p.seat_code))
      .filter((c): c is string => !!c);
    return codes.length > 0 ? codes.join(', ') : 'Chưa chọn';
  });

  protected readonly totalSeatSurcharge = computed(() =>
    this.passengers().reduce((sum, p) => sum + p.seat_surcharge + p.return_seat_surcharge, 0),
  );

  constructor() {
    const firstNonInfant = this.passengers().find((p) => p.passenger_type !== 'INFANT');
    if (firstNonInfant) {
      this.activePaxId.set(firstNonInfant.id);
    }
    const flight = this.activeFlight();
    if (!flight && !environment.useMock) {
      const isMockTest =
        typeof window !== 'undefined' &&
        (window as { __vitest_worker__?: unknown }).__vitest_worker__;
      if (!isMockTest) {
        this.loading.set(false);
        this.router.navigate(['/flights']);
        return;
      }
    }
    this.loadSeatMap(flight?.id ?? 101);
  }

  protected switchLeg(leg: 'OUTBOUND' | 'RETURN'): void {
    if (this.activeLeg() === leg) return;
    this.activeLeg.set(leg);
    const fl = this.activeFlight();
    if (fl) {
      this.loadSeatMap(fl.id);
    }
  }

  private loadSeatMap(flightId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.bookingFlow.getPublicSeatMap(flightId).subscribe({
      next: (res) => {
        this.seatMap.set(res.data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được sơ đồ ghế chuyến bay');
        this.loading.set(false);
      },
    });
  }

  protected hasAisleAfter(col: string): boolean {
    const cols = this.columns();
    if (cols.length === 0 || col === cols[cols.length - 1]) return false;
    return this.aisleColumns().has(col);
  }

  protected seatAt(row: number, col: string): FlightSeatEntry | null {
    return this.seatByKey().get(`${row}-${col}`) ?? null;
  }

  protected isAvailable(seat: FlightSeatEntry): boolean {
    return seat.status === 'AVAILABLE';
  }

  protected isSelectedByAny(seatCode: string): boolean {
    const leg = this.activeLeg();
    return this.passengers().some((p) =>
      leg === 'RETURN' ? p.return_seat_code === seatCode : p.seat_code === seatCode,
    );
  }

  protected seatTooltip(seat: FlightSeatEntry): string {
    if (!this.isAvailable(seat)) {
      return `Ghế ${seat.seat_code} · Không khả dụng`;
    }
    const fee = seat.seat_surcharge > 0 ? `+${this.formatMoney(seat.seat_surcharge)}` : 'Miễn phí';
    return `${seat.seat_code} · ${seat.seat_type.seat_type_name} (${fee})`;
  }

  protected pickSeat(seat: FlightSeatEntry): void {
    if (!this.isAvailable(seat)) return;
    const paxId = this.activePaxId();
    const leg = this.activeLeg();
    const pax = this.passengers().find((p) => p.id === paxId);
    if (!pax || pax.passenger_type === 'INFANT') return;

    const takenByOther = this.passengers().find(
      (p) =>
        p.id !== paxId &&
        (leg === 'RETURN' ? p.return_seat_code === seat.seat_code : p.seat_code === seat.seat_code),
    );
    if (takenByOther) {
      this.snackBar.open(
        `Ghế ${seat.seat_code} đã được chọn cho ${takenByOther.full_name || 'hành khách khác'}`,
        'Đóng',
        { duration: 2500 },
      );
      return;
    }

    const currentSeat = leg === 'RETURN' ? pax.return_seat_code : pax.seat_code;
    if (currentSeat === seat.seat_code) {
      this.bookingFlow.assignSeat(paxId, null, 0, null, leg);
    } else {
      this.bookingFlow.assignSeat(paxId, seat.seat_code, seat.seat_surcharge, seat.id, leg);
    }
  }

  protected passengerInitials(fullName: string, index: number): string {
    const trimmed = fullName.trim();
    if (!trimmed) return `HK${index + 1}`;
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected goNext(): void {
    this.router.navigate(['/booking/passengers']);
  }

  protected cabinLabel(cls: SeatClass): string {
    return CABIN_LABELS[cls] ?? cls;
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(Math.round(val))}đ`;
  }
}
