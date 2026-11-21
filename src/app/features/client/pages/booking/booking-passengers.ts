import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaggageOption } from '@core/models/fare-baggage.model';
import { BookingFlowService, DraftPassenger } from '@core/services/booking-flow.service';
import { BaggageOptionService } from '@core/services/catalog.service';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Bước 3 luồng đặt vé: Nhập thông tin hành khách & Chọn gói hành lý ký gửi (`/booking/passengers`).
 * Popup chọn hành lý (`baggage`) dùng hiệu ứng chuyển động mượt mà (`vf-modal-backdrop` + `vf-modal-panel`).
 */
@Component({
  selector: 'app-booking-passengers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppAlert, AppButton, StatusBadge],
  template: `
    <div class="wrap bp-page">
      <nav class="bp-steps" aria-label="Tiến trình đặt vé">
        <span class="bp-step bp-step--done">1. Chọn chuyến</span>
        <span class="bp-step bp-step--done">2. Chọn ghế</span>
        <span class="bp-step bp-step--active">3. Hành khách & Hành lý</span>
        <span class="bp-step">4. Xem lại & Thanh toán</span>
      </nav>

      <header class="bp-head">
        <div>
          <h1>Thông tin hành khách & Hành lý ký gửi</h1>
          <p class="bp-sub">Nhập chính xác họ tên khớp CCCD/Hộ chiếu và mua thêm hành lý ký gửi nếu cần</p>
        </div>
        <a routerLink="/booking/seats" class="bp-back">← Quay lại chọn ghế</a>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Vui lòng kiểm tra thông tin" [message]="error()!" />
      }

      <div class="bp-layout">
        <div class="bp-main">
          @for (p of passengers(); track p.id; let i = $index) {
            <section class="bp-card">
              <div class="bp-card__head">
                <h2>
                  Hành khách {{ i + 1 }} —
                  {{ p.passenger_type === 'ADULT' ? 'Người lớn' : p.passenger_type === 'CHILD' ? 'Trẻ em' : 'Em bé' }}
                </h2>
                @if (p.seat_code) {
                  <app-status-badge tone="info" [label]="'Ghế ' + p.seat_code" />
                }
              </div>

              <div class="bp-grid">
                <div class="bp-field">
                  <label [for]="'pax-name-' + p.id">Họ và tên *</label>
                  <input
                    [id]="'pax-name-' + p.id"
                    type="text"
                    [ngModel]="p.full_name"
                    (ngModelChange)="updatePax(p.id, 'full_name', $event)"
                    placeholder="VD: Nguyễn Minh Anh"
                  />
                </div>
                <div class="bp-field">
                  <label [for]="'pax-gender-' + p.id">Giới tính</label>
                  <select
                    [id]="'pax-gender-' + p.id"
                    [ngModel]="p.gender"
                    (ngModelChange)="updatePax(p.id, 'gender', $event)"
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                  </select>
                </div>
                <div class="bp-field">
                  <label [for]="'pax-dob-' + p.id">Ngày sinh *</label>
                  <input
                    [id]="'pax-dob-' + p.id"
                    type="date"
                    [ngModel]="p.birth_date"
                    (ngModelChange)="updatePax(p.id, 'birth_date', $event)"
                  />
                </div>
                <div class="bp-field">
                  <label [for]="'pax-doc-' + p.id">CCCD / Hộ chiếu</label>
                  <input
                    [id]="'pax-doc-' + p.id"
                    type="text"
                    [ngModel]="p.passport_number"
                    (ngModelChange)="updatePax(p.id, 'passport_number', $event)"
                    placeholder="Bắt buộc với người lớn"
                  />
                </div>
              </div>

              <div class="bp-bag-row">
                <div>
                  <strong>Hành lý ký gửi:</strong>
                  <span class="bp-muted">
                    {{ p.baggage_name ? p.baggage_name + ' (' + formatMoney(p.baggage_price) + ')' : 'Chưa mua thêm' }}
                  </span>
                </div>
                <app-app-button size="sm" variant="secondary" (clicked)="openBaggageModal(p)">
                  <mat-icon aria-hidden="true">luggage</mat-icon>
                  Chọn hành lý
                </app-app-button>
              </div>
            </section>
          }

          <section class="bp-card">
            <h2>Thông tin liên hệ nhận vé điện tử</h2>
            <div class="bp-grid">
              <div class="bp-field">
                <label for="c-name">Người liên hệ *</label>
                <input id="c-name" type="text" [ngModel]="contactName()" (ngModelChange)="contactName.set($event)" />
              </div>
              <div class="bp-field">
                <label for="c-phone">Số điện thoại *</label>
                <input id="c-phone" type="tel" [ngModel]="contactPhone()" (ngModelChange)="contactPhone.set($event)" />
              </div>
              <div class="bp-field bp-field--full">
                <label for="c-email">Email nhận vé điện tử *</label>
                <input id="c-email" type="email" [ngModel]="contactEmail()" (ngModelChange)="contactEmail.set($event)" />
              </div>
            </div>
          </section>
        </div>

        <aside class="bp-card bp-side">
          <h2>Tạm tính đơn đặt chỗ</h2>
          <dl class="bp-dl">
            <div>
              <dt>Chuyến bay</dt>
              <dd>{{ bookingFlow.selectedFlight()?.flight_number ?? 'VN-210' }}</dd>
            </div>
            <div>
              <dt>Hạng vé</dt>
              <dd>{{ bookingFlow.selectedFare()?.fare_class_name ?? 'Phổ thông tiết kiệm' }}</dd>
            </div>
            <div>
              <dt>Phụ thu chọn ghế</dt>
              <dd class="tabular">{{ formatMoney(seatTotal()) }}</dd>
            </div>
            <div>
              <dt>Hành lý ký gửi</dt>
              <dd class="tabular">{{ formatMoney(baggageTotal()) }}</dd>
            </div>
          </dl>
          <app-app-button variant="primary" (clicked)="continueToReview()">
            Tiếp tục xem lại đơn →
          </app-app-button>
        </aside>
      </div>
    </div>

    <!-- Popup chọn gói hành lý ký gửi mượt mà -->
    @if (baggageModalPax(); as pax) {
      <div
        class="vf-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn gói hành lý ký gửi"
        (click)="baggageModalPax.set(null)"
      >
        <div class="vf-modal-panel bp-modal" (click)="$event.stopPropagation()">
          <header class="bp-modal__head">
            <div>
              <h2>Chọn hành lý ký gửi — {{ pax.full_name }}</h2>
              <p class="bp-muted">Chọn một gói hành lý ký gửi hoặc bỏ chọn nếu chỉ mang hành lý xách tay</p>
            </div>
            <button
              type="button"
              class="bp-close"
              aria-label="Đóng popup hành lý"
              (click)="baggageModalPax.set(null)"
            >
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <div class="bp-bag-options">
            <button
              type="button"
              class="bp-bag-opt"
              [class.bp-bag-opt--sel]="pax.baggage_option_id === null"
              (click)="selectBaggage(pax.id, null)"
            >
              <span>Không mua thêm hành lý ký gửi</span>
              <strong>0đ</strong>
            </button>
            @for (opt of baggageOptions(); track opt.id) {
              <button
                type="button"
                class="bp-bag-opt"
                [class.bp-bag-opt--sel]="pax.baggage_option_id === opt.id"
                (click)="selectBaggage(pax.id, opt)"
              >
                <div>
                  <strong>{{ opt.name }}</strong>
                  <div class="bp-muted">{{ opt.airline_name }} · {{ opt.weight_kg }} kg</div>
                </div>
                <strong class="tabular">{{ formatMoney(opt.price) }}</strong>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .bp-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .bp-steps {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .bp-step {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: var(--text-caption);
      font-weight: 600;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-ink-muted);
    }
    .bp-step--done {
      background: var(--color-success-soft);
      border-color: var(--color-success);
      color: var(--color-on-success-soft);
    }
    .bp-step--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .bp-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .bp-head h1 {
      font-size: var(--text-h1);
    }
    .bp-sub,
    .bp-muted {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .bp-back {
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 600;
    }
    .bp-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 900px) {
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
      font-size: var(--text-h3);
    }
    .bp-card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
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
    }
    .bp-bag-row {
      padding-top: 12px;
      border-top: 1px solid var(--color-border-soft);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-size: var(--text-small);
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
    }
    .bp-modal {
      max-width: 540px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .bp-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
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
    .bp-bag-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bp-bag-opt {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      text-align: left;
      cursor: pointer;
    }
    .bp-bag-opt--sel {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
  `,
})
export class BookingPassengers {
  protected readonly bookingFlow = inject(BookingFlowService);
  private readonly baggageService = inject(BaggageOptionService);
  private readonly router = inject(Router);

  protected readonly passengers = this.bookingFlow.draftPassengers;
  protected readonly contactName = signal('Nguyễn Minh Anh');
  protected readonly contactPhone = signal('0912345678');
  protected readonly contactEmail = signal('customer@demo.local');
  protected readonly error = signal<string | null>(null);
  protected readonly baggageModalPax = signal<DraftPassenger | null>(null);

  private readonly baggageRes = toSignal(this.baggageService.list({ page: 1, size: 50 }), {
    initialValue: null,
  });
  protected readonly baggageOptions = computed(() =>
    (this.baggageRes()?.data.items ?? []).filter((b) => b.status === 'ACTIVE'),
  );

  protected readonly seatTotal = computed(() =>
    this.passengers().reduce((sum, p) => sum + p.seat_surcharge, 0),
  );
  protected readonly baggageTotal = computed(() =>
    this.passengers().reduce((sum, p) => sum + p.baggage_price, 0),
  );

  protected updatePax(id: number, field: keyof DraftPassenger, value: string): void {
    this.passengers.update((list) =>
      list.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  protected openBaggageModal(pax: DraftPassenger): void {
    this.baggageModalPax.set(pax);
  }

  protected selectBaggage(paxId: number, opt: BaggageOption | null): void {
    if (opt) {
      this.bookingFlow.assignBaggage(paxId, opt.id, opt.name, opt.price);
    } else {
      this.bookingFlow.assignBaggage(paxId, null, null, 0);
    }
    this.baggageModalPax.set(null);
  }

  protected continueToReview(): void {
    this.error.set(null);
    const missingName = this.passengers().some((p) => !p.full_name.trim());
    if (missingName) {
      this.error.set('Vui lòng nhập đầy đủ họ tên cho tất cả hành khách');
      return;
    }
    if (!this.contactEmail().trim() || !this.contactPhone().trim()) {
      this.error.set('Vui lòng nhập số điện thoại và email liên hệ');
      return;
    }
    this.router.navigate(['/booking/review']);
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }
}
