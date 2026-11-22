import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { BookingCreatePayload } from '@core/models/booking.model';
import { BaggageOption } from '@core/models/fare-baggage.model';
import { AuthService } from '@core/services/auth.service';
import { BookingFlowService, DraftPassenger } from '@core/services/booking-flow.service';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

type LegKey = 'OUTBOUND' | 'RETURN';

interface LegBaggagePick {
  option: BaggageOption;
  quantity: number;
}

interface PassengerEditDraft {
  id: number;
  index: number;
  passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
  full_name: string;
  gender: 'MALE' | 'FEMALE';
  birth_date: string;
  passport_number: string;
  useAsContact: boolean;
}

/**
 * Bước 3 luồng đặt vé: Thông tin hành khách & Hành lý ký gửi (`/booking/passengers`) — `W-RT-04` & `W-RT-04a`.
 */
@Component({
  selector: 'app-booking-passengers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppAlert, AppButton, StatusBadge],
  template: `
    <div class="wrap bp-page">
      <nav class="bp-stepper" aria-label="Tiến trình đặt vé">
        <a routerLink="/flights" class="bp-step bp-step--done">
          <span class="bp-step__num">✓</span>
          <span>Chọn chuyến</span>
        </a>
        <span class="bp-step-line" aria-hidden="true"></span>
        <a routerLink="/booking/seats" class="bp-step bp-step--done">
          <span class="bp-step__num">✓</span>
          <span>Chọn ghế</span>
        </a>
        <span class="bp-step-line" aria-hidden="true"></span>
        <span class="bp-step bp-step--active" aria-current="step">
          <span class="bp-step__num">3</span>
          <span>Hành khách</span>
        </span>
        <span class="bp-step-line" aria-hidden="true"></span>
        <span class="bp-step">
          <span class="bp-step__num">4</span>
          <span>Xem lại</span>
        </span>
        <span class="bp-step-line" aria-hidden="true"></span>
        <span class="bp-step">
          <span class="bp-step__num">5</span>
          <span>Thanh toán</span>
        </span>
      </nav>

      <header class="bp-head">
        <div>
          <h1>Thông tin hành khách &amp; Hành lý ký gửi</h1>
          <p class="bp-sub">
            Họ tên phải trùng giấy tờ tuỳ thân. Vé điện tử sẽ in đúng thông tin bạn đã nhập.
          </p>
        </div>
        <a routerLink="/booking/seats" class="bp-back">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
          Quay lại chọn ghế
        </a>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Vui lòng kiểm tra thông tin" [message]="error()!" />
      }

      <div class="bp-layout">
        <div class="bp-main">
          <!-- 1. Danh sách hành khách gọn -->
          <section class="bp-card">
            <div class="bp-card__head">
              <div class="bp-card__title-group">
                <span class="bp-icon-circle">
                  <mat-icon aria-hidden="true">group</mat-icon>
                </span>
                <div>
                  <h2>Danh sách hành khách</h2>
                  <p class="bp-muted">Bấm Chỉnh sửa ở từng hành khách để điền hoặc cập nhật chi tiết</p>
                </div>
              </div>
              <app-status-badge tone="neutral" [label]="passengers().length + ' hành khách'" />
            </div>

            <div class="bp-paxlist">
              @for (p of passengers(); track p.id; let i = $index) {
                <div class="bp-paxitem" [class.bp-paxitem--missing]="!p.full_name.trim() || !p.birth_date">
                  <span
                    class="bp-av"
                    [class.bp-av--child]="p.passenger_type === 'CHILD'"
                    [class.bp-av--infant]="p.passenger_type === 'INFANT'"
                  >
                    {{ passengerInitials(p.full_name, i) }}
                  </span>

                  <div class="bp-paxitem__body">
                    <div class="bp-paxitem__top">
                      <strong [class.bp-placeholder]="!p.full_name.trim()">
                        {{ p.full_name.trim() || 'Chưa nhập thông tin' }}
                      </strong>
                      <app-status-badge
                        [tone]="p.passenger_type === 'ADULT' ? 'info' : p.passenger_type === 'CHILD' ? 'warning' : 'neutral'"
                        [label]="passengerTypeLabel(p.passenger_type)"
                      />
                      @if (p.seat_code) {
                        <app-status-badge tone="success" [label]="'Ghế đi ' + p.seat_code" />
                      }
                      @if (p.return_seat_code) {
                        <app-status-badge tone="success" [label]="'Ghế về ' + p.return_seat_code" />
                      }
                    </div>
                    <div class="bp-muted">{{ passengerMeta(p) }}</div>
                  </div>

                  <app-app-button size="sm" variant="secondary" (clicked)="openPassengerModal(p, i)">
                    <mat-icon aria-hidden="true">edit</mat-icon>
                    Chỉnh sửa
                  </app-app-button>
                </div>
              }
            </div>
          </section>

          <!-- 2. Card Hành lý ký gửi theo chặng (W-RT-04) -->
          <section class="bp-card">
            <div class="bp-card__head">
              <div class="bp-card__title-group">
                <span class="bp-icon-circle bp-icon-circle--bag">
                  <mat-icon aria-hidden="true">luggage</mat-icon>
                </span>
                <div>
                  <h2>Hành lý ký gửi</h2>
                  <p class="bp-muted">{{ includedBaggageSummary() }}</p>
                </div>
              </div>
              <app-app-button size="sm" variant="secondary" class="bagf__btn" (clicked)="openBaggageModal('OUTBOUND')">
                <mat-icon aria-hidden="true">luggage</mat-icon>
                Chọn
              </app-app-button>
            </div>

            <div class="bagf" [class.bagf--single]="!hasReturnLeg()">
              @for (leg of legSummaries(); track leg.key; let idx = $index) {
                <div class="bagf__c" (click)="openBaggageModal(leg.key)">
                  <div class="bagf__top">
                    <strong>{{ idx + 1 }}. {{ leg.routeLabel }}</strong>
                    <span class="bagf__from tabular">
                      {{ minBaggagePrice() > 0 ? 'Từ ' + formatMoney(minBaggagePrice()) : 'Theo gói' }}
                    </span>
                  </div>
                  <div class="bp-muted">
                    @if (leg.totalCount > 0) {
                      Đã chọn <strong>{{ leg.totalCount }} kiện</strong> · <strong class="tabular">{{ formatMoney(leg.totalPrice) }}</strong>
                    } @else {
                      Chưa mua thêm hành lý ký gửi
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- 3. Thông tin liên hệ (3 cột .grid3) & điều khoản -->
          <section class="bp-card">
            <div class="bp-card__head">
              <div>
                <h2>Thông tin liên hệ</h2>
                <p class="bp-muted">Mã đặt chỗ (PNR) và vé điện tử sẽ gửi về địa chỉ email này</p>
              </div>
            </div>

            <div class="grid3">
              <div class="bp-field">
                <label for="c-name">Họ tên *</label>
                <input
                  id="c-name"
                  type="text"
                  placeholder="Nhập họ tên người liên hệ"
                  [ngModel]="contactName()"
                  (ngModelChange)="contactName.set($event)"
                />
              </div>
              <div class="bp-field">
                <label for="c-email">Email *</label>
                <input
                  id="c-email"
                  type="email"
                  placeholder="VD: email@example.com"
                  [ngModel]="contactEmail()"
                  (ngModelChange)="contactEmail.set($event)"
                />
              </div>
              <div class="bp-field">
                <label for="c-phone">Số điện thoại *</label>
                <input
                  id="c-phone"
                  type="tel"
                  placeholder="VD: 0912345678"
                  [ngModel]="contactPhone()"
                  (ngModelChange)="contactPhone.set($event)"
                />
              </div>
            </div>

            <label class="bp-terms">
              <input
                type="checkbox"
                [checked]="acceptedTerms()"
                (change)="acceptedTerms.set($any($event.target).checked)"
              />
              <span>
                Tôi xác nhận thông tin hành khách khớp giấy tờ tuỳ thân và đồng ý với điều kiện vận
                chuyển, chính sách hoàn/đổi vé của hãng.
              </span>
            </label>
          </section>
        </div>

        <!-- Sidebar Tóm tắt đơn -->
        <aside class="bp-card bp-side">
          <div class="bp-side__head">
            <h2>Tóm tắt đơn đặt chỗ</h2>
            <span class="bp-side__meta">
              {{ passengers().length }} hành khách{{ hasReturnLeg() ? ' × 2 chặng' : '' }}
            </span>
          </div>

          @if (bookingFlow.selectedFlight(); as outFl) {
            <div class="flightline">
              <div class="flightline__leg">Chuyến đi · {{ outFl.flight_number }}</div>
              <div class="flightline__row">
                <div>
                  <strong class="tabular">{{ formatTime(outFl.scheduled_departure) }}</strong>
                  <span>{{ outFl.departure_airport.airport_code }}</span>
                </div>
                <div class="flightline__track">
                  <span class="flightline__dot"></span>
                  <span class="flightline__bar"></span>
                  <mat-icon aria-hidden="true">flight</mat-icon>
                  <span class="flightline__bar"></span>
                  <span class="flightline__dot"></span>
                </div>
                <div class="flightline__arr">
                  <strong class="tabular">{{ formatTime(outFl.scheduled_arrival) }}</strong>
                  <span>{{ outFl.arrival_airport.airport_code }}</span>
                </div>
              </div>
              @if (bookingFlow.selectedFare(); as fare) {
                <div class="bp-muted">{{ outFl.airline.airline_name }} · {{ fare.fare_class_name }}</div>
              }
            </div>
          }

          @if (bookingFlow.selectedReturnFlight(); as retFl) {
            <div class="flightline flightline--return">
              <div class="flightline__leg">Chuyến về · {{ retFl.flight_number }}</div>
              <div class="flightline__row">
                <div>
                  <strong class="tabular">{{ formatTime(retFl.scheduled_departure) }}</strong>
                  <span>{{ retFl.departure_airport.airport_code }}</span>
                </div>
                <div class="flightline__track">
                  <span class="flightline__dot"></span>
                  <span class="flightline__bar"></span>
                  <mat-icon aria-hidden="true">flight</mat-icon>
                  <span class="flightline__bar"></span>
                  <span class="flightline__dot"></span>
                </div>
                <div class="flightline__arr">
                  <strong class="tabular">{{ formatTime(retFl.scheduled_arrival) }}</strong>
                  <span>{{ retFl.arrival_airport.airport_code }}</span>
                </div>
              </div>
              @if (bookingFlow.selectedReturnFare(); as rFare) {
                <div class="bp-muted">{{ retFl.airline.airline_name }} · {{ rFare.fare_class_name }}</div>
              }
            </div>
          }

          <dl class="bp-dl">
            @if (adultCount() > 0) {
              <div>
                <dt>Vé người lớn × {{ adultCount() }}</dt>
                <dd class="tabular">{{ formatMoney(adultFareTotal()) }}</dd>
              </div>
            }
            @if (childCount() > 0) {
              <div>
                <dt>Vé trẻ em × {{ childCount() }}</dt>
                <dd class="tabular">{{ formatMoney(childFareTotal()) }}</dd>
              </div>
            }
            @if (infantCount() > 0) {
              <div>
                <dt>Vé em bé × {{ infantCount() }}</dt>
                <dd class="tabular">{{ formatMoney(infantFareTotal()) }}</dd>
              </div>
            }
            <div>
              <dt>Phụ thu chọn ghế</dt>
              <dd class="tabular">{{ formatMoney(seatTotal()) }}</dd>
            </div>
            <div>
              <dt>Hành lý ký gửi mua thêm</dt>
              <dd class="tabular">{{ formatMoney(baggageTotal()) }}</dd>
            </div>
          </dl>

          <div class="bp-grand">
            <span>Tạm tính</span>
            <strong class="tabular">{{ formatMoney(grandSubtotal()) }}</strong>
          </div>

          <p class="bp-muted bp-side__hint">
            Chưa áp dụng voucher. Bạn có thể chọn voucher từ ví ở bước 4 (Xem lại đơn).
          </p>

          <app-app-button variant="primary" [disabled]="submitting()" (clicked)="continueToReview()">
            {{ submitting() ? 'Đang tạo đơn & giữ ghế...' : 'Tiếp tục xem lại đơn →' }}
          </app-app-button>
          <a routerLink="/booking/seats" class="bp-side__back">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
            Quay lại chọn ghế
          </a>
        </aside>
      </div>
    </div>

    <!-- Modal Chỉnh sửa hành khách (passenger-edit) -->
    @if (editingPax(); as draft) {
      <div
        class="vf-modal-backdrop"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Chỉnh sửa hành khách ' + (draft.index + 1)"
        (click)="closePassengerModal()"
      >
        <div class="vf-modal-panel bp-modal" (click)="$event.stopPropagation()">
          <header class="bp-modal__head">
            <div>
              <div class="bp-modal__title-row">
                <h2>Hành khách {{ draft.index + 1 }}</h2>
                <app-status-badge
                  [tone]="draft.passenger_type === 'ADULT' ? 'info' : draft.passenger_type === 'CHILD' ? 'warning' : 'neutral'"
                  [label]="passengerTypeLabel(draft.passenger_type)"
                />
              </div>
              <p class="bp-muted">Nhập đúng họ tên như trên CCCD / Hộ chiếu</p>
            </div>
            <button
              type="button"
              class="bp-close"
              aria-label="Đóng hộp thoại hành khách"
              (click)="closePassengerModal()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <div class="bp-grid">
            <div class="bp-field bp-field--full">
              <label for="edit-pax-name">Họ và tên *</label>
              <input
                id="edit-pax-name"
                type="text"
                placeholder="VD: Nguyễn Văn An"
                [ngModel]="draft.full_name"
                (ngModelChange)="patchEditDraft('full_name', $event)"
              />
            </div>

            <div class="bp-field">
              <label for="edit-pax-gender">Giới tính</label>
              <select
                id="edit-pax-gender"
                [ngModel]="draft.gender"
                (ngModelChange)="patchEditDraft('gender', $event)"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
              </select>
            </div>

            <div class="bp-field">
              <label for="edit-pax-dob">Ngày sinh *</label>
              <input
                id="edit-pax-dob"
                type="date"
                [ngModel]="draft.birth_date"
                (ngModelChange)="patchEditDraft('birth_date', $event)"
              />
            </div>

            <div class="bp-field bp-field--full">
              <label for="edit-pax-doc">
                CCCD / Hộ chiếu {{ draft.passenger_type === 'ADULT' ? '(Khuyến nghị)' : '(Không bắt buộc)' }}
              </label>
              <input
                id="edit-pax-doc"
                type="text"
                placeholder="Nhập số CCCD hoặc hộ chiếu"
                [ngModel]="draft.passport_number"
                (ngModelChange)="patchEditDraft('passport_number', $event)"
              />
            </div>
          </div>

          @if (draft.passenger_type === 'ADULT') {
            <label class="bp-terms">
              <input
                type="checkbox"
                [checked]="draft.useAsContact"
                (change)="patchEditDraft('useAsContact', $any($event.target).checked)"
              />
              <span>Dùng họ tên này cho người liên hệ nhận vé điện tử</span>
            </label>
          }

          <footer class="bp-modal__foot">
            <app-app-button variant="secondary" size="sm" (clicked)="closePassengerModal()">
              Hủy
            </app-app-button>
            <app-app-button variant="primary" size="sm" (clicked)="savePassengerModal()">
              Lưu hành khách
            </app-app-button>
          </footer>
        </div>
      </div>
    }

    <!-- Modal Chọn gói hành lý ký gửi chia 2 cột W-RT-04a -->
    @if (baggageModalOpen()) {
      <div
        class="vf-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn gói hành lý ký gửi"
        (click)="closeBaggageModal()"
      >
        <div class="vf-modal-panel bp-modal bp-modal--bag" (click)="$event.stopPropagation()">
          <header class="bp-modal__head">
            <div>
              <h2>Chọn hành lý ký gửi</h2>
              <p class="bp-muted">Chọn chặng bay ở cột trái và gói hành lý cho từng hành khách ở cột phải</p>
            </div>
            <button
              type="button"
              class="bp-close"
              aria-label="Đóng popup hành lý"
              (click)="closeBaggageModal()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <div class="bagsplit">
            <!-- Cột trái: Chọn chặng bay -->
            <div class="baglegs" role="tablist" aria-label="Chọn chặng bay mua hành lý">
              @for (leg of legSummaries(); track leg.key; let idx = $index) {
                <button
                  type="button"
                  role="tab"
                  class="bagleg"
                  [class.bagleg--active]="activeBaggageLeg() === leg.key"
                  [attr.aria-selected]="activeBaggageLeg() === leg.key"
                  (click)="activeBaggageLeg.set(leg.key)"
                >
                  <div class="bagleg__title">
                    {{ idx + 1 }}. {{ leg.key === 'OUTBOUND' ? 'Chuyến đi' : 'Chuyến về' }}
                  </div>
                  <div class="bagleg__route">{{ leg.routeLabel }}</div>
                  <div class="bagleg__sub tabular">
                    {{ leg.totalPrice > 0 ? formatMoney(leg.totalPrice) : '0đ' }}
                  </div>
                </button>
              }
            </div>

            <!-- Cột phải: Danh sách hành khách & gói hành lý của chặng đang chọn -->
            <div class="bagbody">
              @for (pax of eligibleBaggagePassengers(); track pax.id; let idx = $index) {
                @let currentPick = pickFor(activeBaggageLeg(), pax.id);
                <div class="bagpax">
                  <div class="bagpax__hd">
                    <div>
                      <strong>{{ pax.full_name.trim() || ('Hành khách ' + (idx + 1)) }}</strong>
                      <span class="bp-muted"> · {{ includedAllowanceShort(activeBaggageLeg()) }}</span>
                    </div>
                    <strong class="tabular">
                      {{ currentPick ? formatMoney(currentPick.option.price * currentPick.quantity) : '0đ' }}
                    </strong>
                  </div>

                  <div class="bp-bag-options">
                    <button
                      type="button"
                      class="bp-bag-opt"
                      [class.bp-bag-opt--sel]="!currentPick"
                      (click)="selectLegBaggage(activeBaggageLeg(), pax.id, null)"
                    >
                      <div>
                        <strong>Không mua thêm</strong>
                        <div class="bp-muted">Chỉ dùng hành lý theo tiêu chuẩn hạng vé</div>
                      </div>
                      <strong class="tabular">0đ</strong>
                    </button>

                    @for (opt of baggageOptions(); track opt.id) {
                      @let isPicked = currentPick?.option?.id === opt.id;
                      @let qty = isPicked ? (currentPick?.quantity ?? 1) : 0;
                      <div class="bp-bag-opt" [class.bp-bag-opt--sel]="isPicked">
                        <button
                          type="button"
                          class="bp-bag-opt__pick"
                          (click)="selectLegBaggage(activeBaggageLeg(), pax.id, opt)"
                        >
                          <div>
                            <strong>{{ opt.name }}</strong>
                            <div class="bp-muted">{{ opt.weight_kg }} kg / kiện</div>
                          </div>
                          <strong class="tabular">{{ formatMoney(opt.price) }}</strong>
                        </button>

                        @if (isPicked) {
                          <div class="bp-qty" aria-label="Số lượng kiện hành lý">
                            <button
                              type="button"
                              class="bp-qty__btn"
                              aria-label="Giảm số kiện"
                              (click)="changeLegBaggageQty(activeBaggageLeg(), pax.id, opt, qty - 1)"
                            >
                              −
                            </button>
                            <span class="bp-qty__val tabular">{{ qty }}</span>
                            <button
                              type="button"
                              class="bp-qty__btn"
                              aria-label="Tăng số kiện"
                              (click)="changeLegBaggageQty(activeBaggageLeg(), pax.id, opt, qty + 1)"
                            >
                              +
                            </button>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <footer class="bp-modal__foot">
            <div class="bp-muted">
              Tổng hành lý tất cả chặng:
              <strong class="tabular">{{ formatMoney(baggageTotal()) }}</strong>
            </div>
            <app-app-button variant="primary" size="sm" (clicked)="closeBaggageModal()">
              Xong
            </app-app-button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    .bp-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 20px 16px 44px;
    }
    .bp-stepper {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 12px 16px;
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
    }
    .bp-step {
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
    .bp-step__num {
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
    .bp-step--done {
      background: var(--color-success-soft);
      border-color: var(--color-success);
      color: var(--color-on-success-soft);
    }
    .bp-step--done .bp-step__num {
      background: var(--color-success);
      color: var(--color-on-primary);
    }
    .bp-step--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .bp-step--active .bp-step__num {
      background: var(--color-on-primary);
      color: var(--color-primary);
    }
    .bp-step-line {
      flex: 0 0 18px;
      height: 2px;
      background: var(--color-border);
    }
    .bp-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .bp-head h1 {
      margin: 0;
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .bp-sub,
    .bp-muted {
      margin: 3px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .bp-back,
    .bp-side__back {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
      transition:
        background-color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }
    .bp-back:hover,
    .bp-side__back:hover {
      background: var(--color-surface-alt);
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .bp-back mat-icon,
    .bp-side__back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .bp-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 940px) {
      .bp-layout {
        grid-template-columns: 1fr;
      }
    }
    .bp-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .bp-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bp-card h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .bp-card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .bp-card__title-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bp-icon-circle {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .bp-icon-circle--bag {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .bp-paxlist {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .bp-paxitem {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      flex-wrap: wrap;
    }
    .bp-paxitem--missing {
      border-style: dashed;
      border-color: var(--color-warning);
    }
    .bp-av {
      width: 38px;
      height: 38px;
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
    .bp-av--child {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }
    .bp-av--infant {
      background: var(--color-border-soft);
      color: var(--color-ink-muted);
    }
    .bp-paxitem__body {
      flex: 1 1 220px;
      min-width: 0;
    }
    .bp-paxitem__top {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .bp-placeholder {
      color: var(--color-ink-muted);
      font-style: italic;
      font-weight: 500;
    }
    /* W-RT-04: Leg summary cards */
    .bagf {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .bagf--single {
      grid-template-columns: 1fr;
    }
    @media (max-width: 640px) {
      .bagf {
        grid-template-columns: 1fr;
      }
    }
    .bagf__c {
      padding: 12px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: border-color var(--dur-fast) var(--ease);
    }
    .bagf__c:hover {
      border-color: var(--color-primary-bright);
    }
    .bagf__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: var(--text-small);
    }
    .bagf__from {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-primary);
    }
    .grid3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 720px) {
      .grid3 {
        grid-template-columns: 1fr;
      }
    }
    .bp-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 640px) {
      .bp-grid {
        grid-template-columns: 1fr;
      }
    }
    .bp-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
      min-width: 0;
    }
    .bp-field--full {
      grid-column: 1 / -1;
    }
    .bp-field label {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
    }
    .bp-field input,
    .bp-field select {
      height: 38px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      width: 100%;
      min-width: 0;
    }
    .bp-terms {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      cursor: pointer;
    }
    .bp-terms input {
      margin-top: 3px;
      accent-color: var(--color-primary);
      flex-shrink: 0;
    }
    .bp-side__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .bp-side__meta {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
    }
    .flightline {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 10px 12px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .flightline--return {
      border-top: 1.5px dashed var(--color-border);
    }
    .flightline__leg {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-primary);
    }
    .flightline__row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 10px;
      align-items: center;
    }
    .flightline__row strong {
      display: block;
      font-size: var(--text-body);
      color: var(--color-ink);
    }
    .flightline__row span {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .flightline__arr {
      text-align: right;
    }
    .flightline__track {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .flightline__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary-bright);
      flex: 0 0 auto;
    }
    .flightline__bar {
      flex: 1 1 auto;
      height: 1.5px;
      background: var(--color-border);
    }
    .flightline__track mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--color-primary);
      transform: rotate(90deg);
    }
    .bp-dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: var(--text-small);
    }
    .bp-dl div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .bp-dl dt {
      color: var(--color-ink-muted);
    }
    .bp-dl dd {
      margin: 0;
      font-weight: 600;
      color: var(--color-ink);
    }
    .bp-grand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--color-border);
      font-size: var(--text-body);
    }
    .bp-grand strong {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      color: var(--color-primary);
    }
    .bp-side__hint {
      font-size: var(--text-caption);
      margin: 0;
    }
    .bp-modal {
      max-width: 560px;
      width: 100%;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .bp-modal--bag {
      max-width: 880px;
    }
    .bp-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .bp-modal__head h2 {
      margin: 0;
      font-size: var(--text-h3);
    }
    .bp-modal__title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .bp-modal__foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding-top: 12px;
      border-top: 1px solid var(--color-border-soft);
      flex-wrap: wrap;
    }
    .bp-close {
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      border-radius: 999px;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    /* W-RT-04a Split modal */
    .bagsplit {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 16px;
      max-height: 62vh;
      overflow: hidden;
    }
    @media (max-width: 720px) {
      .bagsplit {
        grid-template-columns: 1fr;
        max-height: 70vh;
      }
    }
    .baglegs {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bagleg {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 12px;
      border-radius: var(--radius);
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      text-align: left;
      cursor: pointer;
      font-family: var(--font-body);
    }
    .bagleg--active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .bagleg__title {
      font-size: var(--text-small);
      font-weight: 700;
      color: var(--color-ink);
    }
    .bagleg__route {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .bagleg__sub {
      font-size: var(--text-small);
      font-weight: 700;
      color: var(--color-primary);
    }
    .bagbody {
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-right: 4px;
    }
    .bagpax {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border-soft);
      background: var(--color-surface-alt);
    }
    .bagpax__hd {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: var(--text-small);
    }
    .bp-bag-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bp-bag-opt {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      text-align: left;
      width: 100%;
      cursor: pointer;
    }
    .bp-bag-opt--sel {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .bp-bag-opt__pick {
      flex: 1 1 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      border: 0;
      background: transparent;
      padding: 0;
      text-align: left;
      cursor: pointer;
      color: var(--color-ink);
      font-family: var(--font-body);
    }
    .bp-qty {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .bp-qty__btn {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-primary);
      background: var(--color-surface);
      color: var(--color-primary);
      font-weight: 700;
      cursor: pointer;
    }
    .bp-qty__val {
      min-width: 20px;
      text-align: center;
      font-weight: 700;
      font-size: var(--text-small);
    }
  `,
})
export class BookingPassengers {
  protected readonly bookingFlow = inject(BookingFlowService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly passengers = this.bookingFlow.draftPassengers;
  protected readonly contactName = signal(this.authService.currentUser()?.full_name ?? '');
  protected readonly contactPhone = signal(this.authService.currentUser()?.phone ?? '');
  protected readonly contactEmail = signal(this.authService.currentUser()?.email ?? '');
  protected readonly acceptedTerms = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly editingPax = signal<PassengerEditDraft | null>(null);
  protected readonly baggageModalOpen = signal(false);
  protected readonly activeBaggageLeg = signal<LegKey>('OUTBOUND');
  protected readonly legBaggageMap = signal<Record<LegKey, Record<number, LegBaggagePick>>>({
    OUTBOUND: {},
    RETURN: {},
  });

  protected readonly hasReturnLeg = computed(
    () =>
      this.bookingFlow.tripType() === 'ROUND_TRIP' &&
      this.bookingFlow.selectedReturnFlight() !== null,
  );

  private readonly baggageRes = toSignal(
    this.bookingFlow
      .listPublicBaggageOptions(this.bookingFlow.selectedFlight()?.airline.id)
      .pipe(catchError(() => of(null))),
    { initialValue: null },
  );

  protected readonly baggageOptions = computed(() =>
    (this.baggageRes()?.data?.items ?? []).filter((b) => b.status === 'ACTIVE'),
  );

  protected readonly minBaggagePrice = computed(() => {
    const opts = this.baggageOptions();
    return opts.length > 0 ? Math.min(...opts.map((o) => o.price)) : 0;
  });

  protected readonly eligibleBaggagePassengers = computed(() =>
    this.passengers().filter((p) => p.passenger_type !== 'INFANT'),
  );

  protected readonly legSummaries = computed(() => {
    const outFl = this.bookingFlow.selectedFlight();
    const retFl = this.bookingFlow.selectedReturnFlight();
    const map = this.legBaggageMap();

    const buildLeg = (key: LegKey, routeLabel: string) => {
      const picks = Object.values(map[key]);
      const totalCount = picks.reduce((sum, p) => sum + p.quantity, 0);
      const totalPrice = picks.reduce((sum, p) => sum + p.option.price * p.quantity, 0);
      return { key, routeLabel, totalCount, totalPrice };
    };

    const outRoute = outFl
      ? `${outFl.departure_airport.airport_code} — ${outFl.arrival_airport.airport_code}`
      : 'HAN — SGN';
    const list = [buildLeg('OUTBOUND', outRoute)];

    if (this.hasReturnLeg()) {
      const retRoute = retFl
        ? `${retFl.departure_airport.airport_code} — ${retFl.arrival_airport.airport_code}`
        : 'SGN — HAN';
      list.push(buildLeg('RETURN', retRoute));
    }
    return list;
  });

  protected readonly adultCount = computed(
    () => this.passengers().filter((p) => p.passenger_type === 'ADULT').length,
  );
  protected readonly childCount = computed(
    () => this.passengers().filter((p) => p.passenger_type === 'CHILD').length,
  );
  protected readonly infantCount = computed(
    () => this.passengers().filter((p) => p.passenger_type === 'INFANT').length,
  );

  protected readonly adultFareTotal = computed(() => {
    const outPrice = this.bookingFlow.selectedFare()?.adult_price ?? 0;
    const retPrice = this.bookingFlow.selectedReturnFare()?.adult_price ?? 0;
    return this.adultCount() * (outPrice + retPrice);
  });

  protected readonly childFareTotal = computed(() => {
    const outPrice = this.bookingFlow.selectedFare()?.child_price ?? 0;
    const retPrice = this.bookingFlow.selectedReturnFare()?.child_price ?? 0;
    return this.childCount() * (outPrice + retPrice);
  });

  protected readonly infantFareTotal = computed(() => {
    const outPrice = this.bookingFlow.selectedFare()?.infant_price ?? 0;
    const retPrice = this.bookingFlow.selectedReturnFare()?.infant_price ?? 0;
    return this.infantCount() * (outPrice + retPrice);
  });

  protected readonly seatTotal = computed(() =>
    this.passengers().reduce((sum, p) => sum + p.seat_surcharge + p.return_seat_surcharge, 0),
  );

  protected readonly baggageTotal = computed(() =>
    this.legSummaries().reduce((sum, leg) => sum + leg.totalPrice, 0),
  );

  protected readonly grandSubtotal = computed(
    () =>
      this.adultFareTotal() +
      this.childFareTotal() +
      this.infantFareTotal() +
      this.seatTotal() +
      this.baggageTotal(),
  );

  protected readonly includedBaggageSummary = computed(() => {
    const fare = this.bookingFlow.selectedFare();
    if (!fare) return 'Hành lý xách tay tiêu chuẩn 7 kg/khách';
    if (fare.seat_class === 'BUSINESS') {
      return `Bao gồm 32 kg ký gửi + 14 kg xách tay theo hạng ${fare.fare_class_name}`;
    }
    if (fare.seat_class === 'PREMIUM_ECONOMY') {
      return `Bao gồm 23 kg ký gửi + 10 kg xách tay theo hạng ${fare.fare_class_name}`;
    }
    if (fare.is_refundable) {
      return `Bao gồm 20 kg ký gửi + 10 kg xách tay theo hạng ${fare.fare_class_name}`;
    }
    return `Bao gồm 7 kg xách tay theo hạng ${fare.fare_class_name} · mua thêm kiện ký gửi nếu cần`;
  });

  constructor() {
    this.passengers.update((list) =>
      list.map((p) => {
        const isDummyAdult =
          p.full_name === 'Nguyễn Minh Anh' && p.passport_number === '001195012345';
        const isDummyChild =
          p.full_name === 'Nguyễn Bảo An' && p.birth_date === '2019-08-20' && !p.passport_number;
        if (isDummyAdult || isDummyChild) {
          return { ...p, full_name: '', birth_date: '', passport_number: '' };
        }
        return p;
      }),
    );
  }

  protected passengerTypeLabel(type: 'ADULT' | 'CHILD' | 'INFANT'): string {
    if (type === 'ADULT') return 'Người lớn';
    if (type === 'CHILD') return 'Trẻ em';
    return 'Em bé';
  }

  protected passengerInitials(fullName: string, index: number): string {
    const trimmed = fullName.trim();
    if (!trimmed) return `HK${index + 1}`;
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  protected passengerMeta(p: DraftPassenger): string {
    const genderLabel = p.gender === 'FEMALE' ? 'Nữ' : 'Nam';
    const dobLabel = p.birth_date ? this.formatDob(p.birth_date) : 'Chưa có ngày sinh';
    const docLabel = p.passport_number.trim()
      ? `CCCD/HC ${p.passport_number.trim()}`
      : p.passenger_type === 'ADULT'
        ? 'Chưa nhập CCCD/Hộ chiếu'
        : 'Không bắt buộc CCCD';
    return `${genderLabel} · ${dobLabel} · ${docLabel}`;
  }

  protected openPassengerModal(pax: DraftPassenger, index: number): void {
    this.editingPax.set({
      id: pax.id,
      index,
      passenger_type: pax.passenger_type,
      full_name: pax.full_name,
      gender: pax.gender,
      birth_date: pax.birth_date,
      passport_number: pax.passport_number,
      useAsContact:
        pax.passenger_type === 'ADULT' &&
        (this.contactName().trim() === '' || this.contactName().trim() === pax.full_name.trim()),
    });
  }

  protected patchEditDraft<K extends keyof PassengerEditDraft>(
    field: K,
    value: PassengerEditDraft[K],
  ): void {
    this.editingPax.update((d) => (d ? { ...d, [field]: value } : null));
  }

  protected closePassengerModal(): void {
    this.editingPax.set(null);
  }

  protected savePassengerModal(): void {
    const draft = this.editingPax();
    if (!draft) return;
    this.passengers.update((list) =>
      list.map((p) =>
        p.id === draft.id
          ? {
              ...p,
              full_name: draft.full_name.trim(),
              gender: draft.gender,
              birth_date: draft.birth_date,
              passport_number: draft.passport_number.trim(),
            }
          : p,
      ),
    );
    if (draft.useAsContact && draft.full_name.trim()) {
      this.contactName.set(draft.full_name.trim());
    }
    this.editingPax.set(null);
  }

  protected openBaggageModal(leg: LegKey = 'OUTBOUND'): void {
    this.activeBaggageLeg.set(leg);
    this.baggageModalOpen.set(true);
  }

  protected closeBaggageModal(): void {
    this.baggageModalOpen.set(false);
  }

  protected pickFor(leg: LegKey, paxId: number): LegBaggagePick | null {
    return this.legBaggageMap()[leg][paxId] ?? null;
  }

  protected includedAllowanceShort(leg: LegKey): string {
    const fare = leg === 'RETURN' ? this.bookingFlow.selectedReturnFare() : this.bookingFlow.selectedFare();
    if (!fare) return '7 kg xách tay';
    if (fare.seat_class === 'BUSINESS') return '32 kg ký gửi + 14 kg xách tay';
    if (fare.seat_class === 'PREMIUM_ECONOMY') return '23 kg ký gửi + 10 kg xách tay';
    return fare.is_refundable ? '20 kg ký gửi + 10 kg xách tay' : '7 kg xách tay';
  }

  protected selectLegBaggage(leg: LegKey, paxId: number, opt: BaggageOption | null): void {
    this.legBaggageMap.update((prev) => {
      const nextLeg = { ...prev[leg] };
      if (!opt) {
        delete nextLeg[paxId];
      } else {
        const cur = nextLeg[paxId];
        const qty = cur?.option.id === opt.id ? cur.quantity : 1;
        nextLeg[paxId] = { option: opt, quantity: qty };
      }
      return { ...prev, [leg]: nextLeg };
    });
    this.syncPassengerBaggageSummary(paxId);
  }

  protected changeLegBaggageQty(
    leg: LegKey,
    paxId: number,
    opt: BaggageOption,
    nextQty: number,
  ): void {
    if (nextQty <= 0) {
      this.selectLegBaggage(leg, paxId, null);
      return;
    }
    const clamped = Math.min(nextQty, 5);
    this.legBaggageMap.update((prev) => ({
      ...prev,
      [leg]: {
        ...prev[leg],
        [paxId]: { option: opt, quantity: clamped },
      },
    }));
    this.syncPassengerBaggageSummary(paxId);
  }

  private syncPassengerBaggageSummary(paxId: number): void {
    const map = this.legBaggageMap();
    const outPick = map.OUTBOUND[paxId];
    const retPick = this.hasReturnLeg() ? map.RETURN[paxId] : undefined;
    const primary = outPick ?? retPick;
    const totalPrice =
      (outPick ? outPick.option.price * outPick.quantity : 0) +
      (retPick ? retPick.option.price * retPick.quantity : 0);

    this.bookingFlow.assignBaggage(
      paxId,
      primary ? primary.option.id : null,
      primary ? primary.option.name : null,
      totalPrice,
    );
  }

  protected continueToReview(): void {
    this.error.set(null);
    const paxList = this.passengers();
    if (paxList.some((p) => !p.full_name.trim() || !p.birth_date)) {
      this.error.set(
        'Vui lòng bấm Chỉnh sửa và nhập đầy đủ họ tên, ngày sinh cho tất cả hành khách.',
      );
      return;
    }
    if (!this.contactName().trim() || !this.contactEmail().trim() || !this.contactPhone().trim()) {
      this.error.set('Vui lòng nhập đầy đủ họ tên, số điện thoại và email liên hệ.');
      return;
    }
    if (!this.acceptedTerms()) {
      this.error.set('Vui lòng xác nhận thông tin hành khách và đồng ý với điều kiện vận chuyển.');
      return;
    }
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/booking/passengers' } });
      return;
    }

    const outFlight = this.bookingFlow.selectedFlight();
    const outFare = this.bookingFlow.selectedFare();
    if (!outFlight || !outFare) {
      this.error.set('Vui lòng chọn chuyến bay và hạng vé trước khi tạo đơn đặt chỗ.');
      return;
    }

    const retFlight = this.bookingFlow.selectedReturnFlight();
    const retFare = this.bookingFlow.selectedReturnFare();
    const isRoundTrip = this.bookingFlow.tripType() === 'ROUND_TRIP' && !!retFlight && !!retFare;

    const segments: BookingCreatePayload['segments'] = [
      { flight_id: outFlight.id, fare_class_id: outFare.fare_class_id, segment_order: 1 },
    ];
    if (isRoundTrip) {
      segments.push({
        flight_id: retFlight.id,
        fare_class_id: retFare.fare_class_id,
        segment_order: 2,
      });
    }

    const payload: BookingCreatePayload = {
      trip_type: isRoundTrip ? 'ROUND_TRIP' : 'ONE_WAY',
      segments,
      passengers: paxList.map((p, idx) => ({
        full_name: p.full_name.trim(),
        gender: p.gender,
        birth_date: p.birth_date,
        passenger_type: p.passenger_type,
        passport_number: p.passport_number.trim() || null,
        phone: idx === 0 ? this.contactPhone().trim() : null,
        email: idx === 0 ? this.contactEmail().trim() : null,
      })),
    };

    this.submitting.set(true);
    this.bookingFlow
      .createBooking(payload)
      .pipe(
        switchMap((res) => {
          const booking = res.data;
          const postActions = [];

          booking.passengers.forEach((createdPax, index) => {
            const draft = paxList[index];
            if (!draft || createdPax.passenger_type === 'INFANT') return;
            if (draft.flight_seat_id) {
              postActions.push(
                this.bookingFlow.holdSeat(booking.id, createdPax.id, draft.flight_seat_id),
              );
            }
            if (isRoundTrip && draft.return_flight_seat_id) {
              postActions.push(
                this.bookingFlow.holdSeat(booking.id, createdPax.id, draft.return_flight_seat_id),
              );
            }
          });

          const aggregated = new Map<string, { passenger_id: number; baggage_option_id: number; quantity: number }>();
          const map = this.legBaggageMap();
          const activeLegs: LegKey[] = isRoundTrip ? ['OUTBOUND', 'RETURN'] : ['OUTBOUND'];

          booking.passengers.forEach((createdPax, index) => {
            const draft = paxList[index];
            if (!draft || createdPax.passenger_type === 'INFANT') return;
            for (const leg of activeLegs) {
              const pick = map[leg][draft.id];
              if (!pick) continue;
              const key = `${createdPax.id}-${pick.option.id}`;
              const existing = aggregated.get(key);
              if (existing) {
                existing.quantity += pick.quantity;
              } else {
                aggregated.set(key, {
                  passenger_id: createdPax.id,
                  baggage_option_id: pick.option.id,
                  quantity: pick.quantity,
                });
              }
            }
          });

          const baggageItems = [...aggregated.values()];
          if (baggageItems.length > 0) {
            postActions.push(this.bookingFlow.addBaggages(booking.id, baggageItems));
          }

          if (postActions.length === 0) {
            return of(booking.id);
          }
          return forkJoin(postActions).pipe(switchMap(() => of(booking.id)));
        }),
      )
      .subscribe({
        next: (bookingId) => {
          this.submitting.set(false);
          this.bookingFlow.activeBookingId.set(bookingId);
          this.router.navigate(['/booking/review'], { queryParams: { bookingId } });
        },
        error: (err: Error) => {
          this.submitting.set(false);
          this.error.set(err.message || 'Không thể tạo đơn đặt chỗ. Vui lòng thử lại.');
        },
      });
  }

  protected formatDob(iso: string): string {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(Math.round(val))}đ`;
  }
}
