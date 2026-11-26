import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BookingDetail, BookingSeatHoldDetail, BookingStatus } from '@core/models/booking.model';
import { AuthService } from '@core/services/auth.service';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

type SeatHoldWithFlight = BookingSeatHoldDetail & {
  flight_id?: number;
  segment_id?: number;
};

/**
 * Tra cứu đặt chỗ cho khách vãng lai (W-RT-10 & W-RT-10a).
 * Gọi GET /api/public/bookings/lookup?booking_code=...&email=... và hiển thị chế độ chỉ đọc.
 */
@Component({
  selector: 'app-booking-lookup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, StatusBadge],
  template: `
    <div class="lk-wrap">
      @if (!result()) {
        <div class="lk-narrow lk-narrow--form">
          <div class="lk-head">
            <div>
              <h1>Tra cứu đặt chỗ</h1>
              <p class="lk-sub">
                Nhập mã đặt chỗ (hoặc mã đơn hàng DH-...) kèm email đã dùng khi đặt vé. Không cần đăng nhập.
              </p>
            </div>
          </div>

          <form class="lk-card" (ngSubmit)="submitLookup()">
            <div class="lk-field">
              <label for="lookup-code">Mã đặt chỗ / Mã đơn <span class="lk-req">*</span></label>
              <input
                id="lookup-code"
                name="bookingCode"
                class="lk-input lk-mono"
                [(ngModel)]="bookingCode"
                placeholder="VD: VN9988AA hoặc DH-1"
                autocomplete="off"
                required
              />
              <span class="lk-hint">Mã đặt chỗ gồm ký tự PNR hoặc mã đơn hàng DH-... trong email xác nhận.</span>
            </div>

            <div class="lk-field">
              <label for="lookup-email">Email đã đặt vé <span class="lk-req">*</span></label>
              <input
                id="lookup-email"
                name="email"
                type="email"
                class="lk-input"
                [(ngModel)]="email"
                placeholder="VD: customer@flightbooking.local"
                required
              />
              <span class="lk-hint">Dùng đúng địa chỉ email liên hệ lúc đặt vé.</span>
            </div>

            @if (errorMsg()) {
              <div class="lk-error" role="alert">
                <mat-icon>error_outline</mat-icon>
                <span>{{ errorMsg() }}</span>
              </div>
            }

            <button type="submit" class="lk-btn lk-btn--primary lk-btn--lg" [disabled]="loading()">
              <mat-icon>search</mat-icon>
              {{ loading() ? 'Đang tra cứu...' : 'Tra cứu đặt chỗ' }}
            </button>
          </form>

          <div class="lk-note lk-note--info">
            <mat-icon>{{ isLoggedIn() ? 'verified_user' : 'visibility' }}</mat-icon>
            <div>
              @if (isLoggedIn()) {
                <b>Bạn đã đăng nhập</b>
                <p>
                  Tra cứu nhanh theo mã đơn hàng/PNR hoặc xem toàn bộ lịch sử đặt vé trong mục
                  <a routerLink="/account/bookings">Vé của tôi</a>.
                </p>
              } @else {
                <b>Tra cứu được gì khi chưa đăng nhập</b>
                <p>
                  Trạng thái đơn, hành trình, giờ bay, thông tin ghế. Thao tác hủy vé và quản lý chi tiết yêu cầu đăng nhập đúng tài khoản đã đặt.
                </p>
              }
            </div>
          </div>

          <p class="lk-help">
            Không tìm thấy mã? Liên hệ hotline <strong>1900 1234</strong> hoặc email <strong>hotro&#64;vinafly.vn</strong>.
          </p>
        </div>
      } @else {
        @if (result(); as b) {
          <div class="lk-narrow">
            <nav class="lk-crumb" aria-label="Đường dẫn">
              <a routerLink="/">Trang chủ</a>
              <mat-icon>chevron_right</mat-icon>
              <button type="button" class="lk-crumb-btn" (click)="resetLookup()">Tra cứu đặt chỗ</button>
              <mat-icon>chevron_right</mat-icon>
              <span>{{ displayRef() }}</span>
            </nav>

            <div class="lk-head lk-head--row">
              <div>
                <h1>Đặt chỗ {{ displayRef() }}</h1>
                <p class="lk-sub">
                  Đặt lúc {{ formatDateTime(b.created_at) }} · tra cứu bằng {{ searchedEmail() }}
                </p>
              </div>
              <app-status-badge [tone]="statusTone(b.status)" [label]="statusLabel(b.status)" />
            </div>

            @if (isLoggedIn()) {
              <div class="lk-note lk-note--info">
                <mat-icon>verified_user</mat-icon>
                <div>
                  <b>Bạn đang đăng nhập</b>
                  <p>
                    Bấm <b>Mở chi tiết &amp; quản lý đơn</b> bên dưới để xem đầy đủ vé điện tử, in vé hoặc thực hiện thao tác hủy đơn.
                  </p>
                </div>
              </div>
            } @else {
              <div class="lk-note lk-note--warning">
                <mat-icon>lock</mat-icon>
                <div>
                  <b>Bạn đang xem ở chế độ chỉ đọc</b>
                  <p>
                    Muốn hủy đơn hoặc quản lý chi tiết vé, hãy đăng nhập bằng tài khoản đã đặt vé. Thông tin liên hệ nhạy cảm được ẩn ở chế độ này.
                  </p>
                </div>
              </div>
            }

            <div class="lk-sec-head">
              <h2>Hành trình</h2>
              <span class="lk-muted">
                {{ b.trip_type === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều' }} · {{ b.passengers.length }} hành khách
              </span>
            </div>

            @for (seg of b.segments; track seg.id; let segIdx = $index) {
              <article class="lk-leg" [attr.data-testid]="'lookup-segment-' + seg.flight_id">
                <div class="lk-leg__head">
                  <b>{{ seg.segment_order === 1 ? 'CHẶNG ĐI' : 'CHẶNG VỀ' }} · {{ formatDate(seg.scheduled_departure) }}</b>
                  <span class="lk-muted">{{ seg.flight_number }} · {{ seg.fare_class_name }} ({{ seatClassLabel(seg.seat_class) }})</span>
                </div>
                <div class="lk-leg__body">
                  <div class="lk-route">
                    <div>
                      <div class="lk-time tabular">{{ formatTime(seg.scheduled_departure) }}</div>
                      <div class="lk-ap">{{ seg.departure_city_name }} ({{ seg.departure_airport_code }})</div>
                    </div>
                    <div class="lk-mid">
                      <span>{{ formatDate(seg.scheduled_departure) }}</span>
                      <div class="lk-line"></div>
                      <span>{{ seg.airline_name }}</span>
                    </div>
                    <div class="lk-arr">
                      <div class="lk-time tabular">{{ formatTime(seg.scheduled_arrival) }}</div>
                      <div class="lk-ap">{{ seg.arrival_city_name }} ({{ seg.arrival_airport_code }})</div>
                    </div>
                  </div>
                </div>
                @for (pax of b.passengers; track pax.id) {
                  <div class="lk-pax">
                    <span>{{ pax.full_name }} ({{ paxTypeLabel(pax.passenger_type) }})</span>
                    <span>
                      {{ seg.flight_number }} · {{ seg.fare_class_name }}
                      @if (seatCodeFor(pax.id, seg.flight_id, segIdx); as seat) {
                        · Ghế {{ seat }}
                      }
                    </span>
                  </div>
                }
              </article>
            }

            <h2 class="lk-sec-title">Thanh toán và tổng tiền</h2>
            <div class="lk-card">
              <div class="lk-kv">
                <span>Mã đơn hàng</span>
                <b class="lk-mono">{{ b.order_code || ('DH-' + b.id) }}</b>
              </div>
              @if (b.status === 'CONFIRMED' && b.booking_code) {
                <div class="lk-kv">
                  <span>Mã đặt chỗ (PNR)</span>
                  <b class="lk-mono">{{ b.booking_code }}</b>
                </div>
              }
              <div class="lk-kv">
                <span>Tiền vé & phụ phí</span>
                <b class="tabular">{{ formatVnd(b.total_amount) }}</b>
              </div>
              <p class="lk-hint lk-hint--spaced">
                Giá vé đã bao gồm thuế, phí sân bay và dịch vụ đã chọn.
              </p>
            </div>

            <div class="lk-actions">
              <button type="button" class="lk-btn lk-btn--secondary" (click)="resetLookup()">
                <mat-icon>arrow_back</mat-icon> Tra cứu đơn khác
              </button>
              @if (isLoggedIn()) {
                <a
                  class="lk-btn lk-btn--primary"
                  [routerLink]="isStaffOrAdmin() ? ['/admin/bookings', b.id] : ['/account/bookings', b.id]"
                >
                  <mat-icon>confirmation_number</mat-icon>
                  Mở chi tiết &amp; quản lý đơn
                </a>
              } @else {
                <a
                  class="lk-btn lk-btn--primary"
                  routerLink="/login"
                  [queryParams]="{ returnUrl: '/account/bookings/' + b.id }"
                >
                  Đăng nhập để quản lý đơn
                </a>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .lk-wrap {
      padding: var(--sp-3xl) var(--sp-lg);
      max-width: 1120px;
      margin: 0 auto;
    }

    .lk-narrow {
      max-width: 760px;
      margin: 0 auto;
    }

    .lk-narrow--form {
      max-width: 560px;
    }

    .lk-head {
      margin-bottom: var(--sp-xl);
    }

    .lk-head--row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--sp-md);
      flex-wrap: wrap;
    }

    .lk-head h1 {
      margin: 0 0 var(--sp-xs);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }

    .lk-sub {
      margin: 0;
      color: var(--color-ink-muted);
      font-size: var(--text-body);
    }

    .lk-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--sp-xl);
      box-shadow: var(--shadow-sm);
    }

    .lk-field {
      display: flex;
      flex-direction: column;
      gap: var(--sp-xs);
      margin-bottom: var(--sp-lg);
    }

    .lk-field label {
      font-weight: 700;
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .lk-req {
      color: var(--color-danger);
    }

    .lk-input {
      width: 100%;
      box-sizing: border-box;
      padding: var(--sp-md) var(--sp-md);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-body);
      font-family: inherit;
    }

    .lk-input:focus {
      outline: 2px solid var(--color-primary);
      border-color: var(--color-primary);
    }

    .lk-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      letter-spacing: 0.04em;
    }

    .lk-hint {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .lk-hint--spaced {
      margin: var(--sp-md) 0 0;
    }

    .lk-error {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      padding: var(--sp-sm) var(--sp-md);
      border-radius: var(--radius);
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
      font-size: var(--text-small);
      margin-bottom: var(--sp-lg);
    }

    .lk-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-xs);
      padding: var(--sp-sm) var(--sp-lg);
      border-radius: var(--radius);
      border: 1px solid transparent;
      font-weight: 700;
      font-size: var(--text-small);
      cursor: pointer;
      text-decoration: none;
    }

    .lk-btn--lg {
      width: 100%;
      padding: var(--sp-md) var(--sp-lg);
      font-size: var(--text-body);
    }

    .lk-btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .lk-btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .lk-btn--primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .lk-btn--secondary {
      background: var(--color-surface);
      color: var(--color-ink);
      border-color: var(--color-border);
    }

    .lk-note {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-md);
      margin-top: var(--sp-lg);
      padding: var(--sp-md) var(--sp-lg);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      font-size: var(--text-small);
    }

    .lk-note--info {
      background: var(--color-info-soft);
      color: var(--color-on-info-soft);
    }

    .lk-note--warning {
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }

    .lk-note p {
      margin: var(--sp-xs) 0 0;
    }

    .lk-help {
      margin-top: var(--sp-lg);
      text-align: center;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .lk-crumb {
      display: flex;
      align-items: center;
      gap: var(--sp-xs);
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      margin-bottom: var(--sp-lg);
      flex-wrap: wrap;
    }

    .lk-crumb a,
    .lk-crumb-btn {
      color: var(--color-primary);
      text-decoration: none;
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
    }

    .lk-sec-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      margin: var(--sp-xl) 0 var(--sp-md);
    }

    .lk-sec-head h2,
    .lk-sec-title {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }

    .lk-sec-title {
      margin: var(--sp-xl) 0 var(--sp-md);
    }

    .lk-muted {
      color: var(--color-ink-muted);
      font-size: var(--text-small);
    }

    .lk-leg {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: var(--sp-md);
      box-shadow: var(--shadow-sm);
    }

    .lk-leg__head {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--sp-sm);
      padding: var(--sp-md) var(--sp-lg);
      background: var(--color-surface-alt);
      border-bottom: 1px solid var(--color-border);
      font-size: var(--text-small);
    }

    .lk-leg__body {
      padding: var(--sp-lg);
    }

    .lk-route {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      align-items: center;
      gap: var(--sp-md);
    }

    .lk-arr {
      text-align: right;
    }

    .lk-time {
      font-size: var(--text-h2);
      font-weight: 800;
      color: var(--color-ink);
    }

    .lk-ap {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .lk-mid {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-xs);
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .lk-line {
      width: 100%;
      height: 2px;
      background: var(--color-border);
    }

    .lk-pax {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--sp-sm);
      padding: var(--sp-sm) var(--sp-lg);
      border-top: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .lk-kv {
      display: flex;
      justify-content: space-between;
      padding: var(--sp-sm) 0;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }

    .lk-kv:last-of-type {
      border-bottom: none;
    }

    .lk-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-md);
      margin-top: var(--sp-xl);
    }

    @media (max-width: 640px) {
      .lk-wrap {
        padding: var(--sp-xl) var(--sp-md);
      }
      .lk-route {
        grid-template-columns: 1fr;
        text-align: left;
      }
      .lk-arr {
        text-align: left;
      }
    }
  `,
})
export class BookingLookup implements OnInit {
  private readonly bookingFlow = inject(BookingFlowService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoggedIn = computed(() => this.authService.isLoggedIn());
  protected readonly isStaffOrAdmin = computed(
    () => this.authService.isAdmin() || this.authService.isStaff(),
  );

  protected bookingCode = '';
  protected email = '';
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal('');
  protected readonly result = signal<BookingDetail | null>(null);
  protected readonly searchedEmail = signal('');

  protected readonly displayRef = computed(() => {
    const b = this.result();
    if (!b) return '';
    return b.status === 'CONFIRMED' && b.booking_code
      ? b.booking_code
      : b.order_code || `DH-${b.id}`;
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const code = qp.get('code') ?? qp.get('booking_code') ?? '';
    const email = qp.get('email') ?? '';
    if (code && email) {
      this.bookingCode = code;
      this.email = email;
      this.submitLookup();
    } else if (!this.email && this.authService.currentUser()?.email) {
      this.email = this.authService.currentUser()!.email;
    }
  }

  protected submitLookup(): void {
    const code = this.bookingCode.trim();
    const email = this.email.trim();
    if (!code || !email) {
      this.errorMsg.set('Vui lòng nhập đầy đủ mã đặt chỗ và email.');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.bookingFlow.lookupPublicBooking(code, email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.searchedEmail.set(email);
        this.result.set(res.data);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.error?.message ?? 'Không tìm thấy đơn đặt chỗ khớp với mã và email đã nhập.',
        );
      },
    });
  }

  protected resetLookup(): void {
    this.result.set(null);
    this.errorMsg.set('');
  }

  /**
   * Trả về mã ghế đúng theo từng chặng bay (fix lỗi vé khứ hồi hiển thị trùng ghế chặng đi).
   * Ưu tiên khớp `flight_id` trên `seat_holds`; khi payload không kèm `flight_id`, lấy theo thứ tự chặng.
   */
  protected seatCodeFor(passengerId: number, flightId?: number, segmentIndex = 0): string | null {
    const holds = (this.result()?.seat_holds ?? []) as SeatHoldWithFlight[];
    const paxHolds = holds.filter((h) => h.passenger_id === passengerId);
    if (paxHolds.length === 0) return null;

    const hasFlightId = paxHolds.some((h) => h.flight_id !== undefined);
    if (flightId !== undefined && hasFlightId) {
      const matched = paxHolds.find((h) => h.flight_id === flightId);
      return matched?.seat_code ?? null;
    }

    return paxHolds[segmentIndex]?.seat_code ?? null;
  }

  protected statusLabel(status: BookingStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'EXPIRED':
        return 'Hết hạn giữ chỗ';
    }
  }

  protected statusTone(status: BookingStatus): BadgeTone {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING_PAYMENT':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      case 'EXPIRED':
        return 'neutral';
    }
  }

  protected paxTypeLabel(type: 'ADULT' | 'CHILD' | 'INFANT'): string {
    switch (type) {
      case 'ADULT':
        return 'Người lớn';
      case 'CHILD':
        return 'Trẻ em';
      case 'INFANT':
        return 'Em bé';
    }
  }

  protected seatClassLabel(seatClass: string): string {
    switch (seatClass) {
      case 'ECONOMY':
        return 'Phổ thông';
      case 'PREMIUM_ECONOMY':
        return 'Phổ thông đặc biệt';
      case 'BUSINESS':
        return 'Thương gia';
      case 'FIRST':
        return 'Hạng nhất';
      default:
        return seatClass;
    }
  }

  protected formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount ?? 0))}đ`;
  }

  protected formatTime(iso: string): string {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  protected formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  protected formatDateTime(iso: string): string {
    return `${this.formatTime(iso)}, ${this.formatDate(iso)}`;
  }
}
