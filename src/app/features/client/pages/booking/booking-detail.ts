import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BookingDetail, BookingStatus } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Chi tiết đặt chỗ (`/account/bookings/:id` & `/admin/bookings/:id`) — DA3.2.
 * Hiển thị toàn bộ hành trình, hành khách, ghế ngồi, hành lý, hóa đơn thanh toán,
 * quy định hoàn vé và Modal xác nhận hủy vé mượt mà (ghi rõ không tự hoàn tiền,
 * liên hệ đại lý 1900 1234 / hotro@vinafly.vn).
 */
@Component({
  selector: 'app-booking-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppAlert, AppButton, StatusBadge, SkeletonBlock],
  template: `
    <section class="bd-page">
      <header class="bd-head">
        <div>
          <h1>Chi tiết đặt chỗ {{ booking() ? ('DH-' + booking()!.id) : '' }}</h1>
          <p class="bd-sub">Hành trình, danh sách hành khách, ghế ngồi, hành lý và quy định hoàn vé</p>
        </div>
        <div class="bd-head__actions">
          <a [routerLink]="isAdminMode() ? '/admin/bookings' : '/account'" class="bd-back">
            ← Quay lại danh sách
          </a>
          @if (booking(); as b) {
            @if (b.status !== 'CANCELLED' && b.status !== 'EXPIRED') {
              <app-app-button size="sm" variant="danger" (clicked)="showCancelModal.set(true)">
                Hủy vé
              </app-app-button>
            }
          }
        </div>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Không tải được đơn đặt chỗ" [message]="error()!" />
      }

      @if (loading()) {
        <app-skeleton-block height="180px" />
      } @else if (booking(); as b) {
        <div class="bd-grid">
          <div class="bd-main">
            <section class="bd-card">
              <div class="bd-row-between">
                <div>
                  <strong>Mã đơn: DH-{{ b.id }}@if (b.status === 'CONFIRMED' && b.booking_code) { · PNR: {{ b.booking_code }} }</strong>
                  <div class="bd-muted">Khách đặt: {{ b.customer_name }} · {{ b.customer_email }}</div>
                </div>
                <app-status-badge [tone]="statusTone(b.status)" [label]="statusLabel(b.status)" />
              </div>

              @if (b.status === 'CANCELLED') {
                <app-alert
                  tone="warning"
                  title="Đơn đặt chỗ đã được hủy — Không tự động hoàn tiền"
                  [message]="'Lý do: ' + (b.cancel_reason || 'Theo yêu cầu') + '. Vui lòng liên hệ tổng đài đại lý 1900 1234 hoặc email hotro@vinafly.vn để được hỗ trợ hoàn vé theo quy định hạng vé.'"
                />
              }

              <h3>Chặng bay</h3>
              @for (seg of b.segments; track seg.id) {
                <div class="bd-seg">
                  <div>
                    <strong>{{ seg.flight_number }} · {{ seg.airline_name }}</strong>
                    <div>{{ seg.departure_airport_code }} → {{ seg.arrival_airport_code }}</div>
                    <div class="bd-muted">{{ seg.fare_class_name }} ({{ seg.seat_class }})</div>
                  </div>
                  @if (seg.fare_rule; as rule) {
                    <div class="bd-rule">
                      <strong>Quy định hoàn vé:</strong>
                      <span>
                        {{ rule.is_refundable ? 'Hoàn ' + rule.refund_percent + '% trước ' + (rule.refund_min_hours_before_departure ?? 24) + 'h' : 'Không hỗ trợ hoàn vé' }}
                      </span>
                    </div>
                  }
                </div>
              }
            </section>

            <section class="bd-card">
              <h3>Hành khách, ghế ngồi & hành lý ({{ b.passengers.length }})</h3>
              <div class="bd-pax-list">
                @for (p of b.passengers; track p.id) {
                  <div class="bd-pax">
                    <div>
                      <strong>{{ p.full_name }}</strong>
                      <div class="bd-muted">{{ p.passenger_type }} · Sinh ngày {{ p.birth_date }}</div>
                    </div>
                    <div class="bd-pax__meta">
                      <span>Ghế: <strong>{{ seatOf(b, p.id) }}</strong></span>
                      <span>Hành lý: <strong>{{ baggageOf(b, p.id) }}</strong></span>
                    </div>
                  </div>
                }
              </div>
            </section>
          </div>

          <aside class="bd-card bd-bill">
            <h3>Chi tiết thanh toán</h3>
            <dl class="bd-dl">
              <div>
                <dt>Tiền vé</dt>
                <dd class="tabular">{{ formatMoney(b.fare_amount) }}</dd>
              </div>
              <div>
                <dt>Phụ thu chọn ghế</dt>
                <dd class="tabular">{{ formatMoney(b.seat_surcharge_amount) }}</dd>
              </div>
              <div>
                <dt>Hành lý ký gửi</dt>
                <dd class="tabular">{{ formatMoney(b.baggage_amount) }}</dd>
              </div>
              @if (b.promotion_discount_amount > 0) {
                <div>
                  <dt>Khuyến mãi</dt>
                  <dd class="tabular">-{{ formatMoney(b.promotion_discount_amount) }}</dd>
                </div>
              }
              @if (b.voucher_discount_amount > 0) {
                <div>
                  <dt>Voucher</dt>
                  <dd class="tabular">-{{ formatMoney(b.voucher_discount_amount) }}</dd>
                </div>
              }
              <div class="bd-total">
                <dt>Tổng cộng</dt>
                <dd class="tabular">{{ formatMoney(b.total_amount) }}</dd>
              </div>
            </dl>
            <div class="bd-contact">
              <strong>Hỗ trợ đại lý VinaFly</strong>
              <p>Hotline: <strong>1900 1234</strong> · Email: <strong>hotro&#64;vinafly.vn</strong></p>
            </div>
          </aside>
        </div>
      }
    </section>

    <!-- Modal xác nhận hủy vé (cancel-booking-modal) với chuyển động mượt mà -->
    @if (showCancelModal() && booking(); as b) {
      <div
        class="vf-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận hủy đặt chỗ"
        (click)="showCancelModal.set(false)"
      >
        <div class="vf-modal-panel bd-modal" (click)="$event.stopPropagation()">
          <header class="bd-modal__head">
            <h2>Xác nhận hủy vé — {{ b.booking_code }}</h2>
            <button
              type="button"
              class="bd-close"
              aria-label="Đóng hộp thoại hủy vé"
              (click)="showCancelModal.set(false)"
            >
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <app-alert
            tone="warning"
            title="Lưu ý quan trọng về hoàn tiền"
            message="Hệ thống KHÔNG tự động hoàn tiền khi hủy vé. Sau khi hủy, vui lòng liên hệ tổng đài đại lý 1900 1234 hoặc email hotro@vinafly.vn để kiểm tra điều kiện và nhận hỗ trợ hoàn vé theo quy định của hạng vé đã mua."
          />

          @if (b.segments[0]?.fare_rule; as rule) {
            <div class="bd-rule-box">
              <strong>Quy định hạng vé đã mua:</strong>
              <p>{{ rule.description || (rule.is_refundable ? 'Hỗ trợ hoàn ' + rule.refund_percent + '%' : 'Hạng vé không hoàn tiền') }}</p>
            </div>
          }

          <div class="bd-field">
            <label for="cancel-reason">Lý do hủy vé</label>
            <textarea
              id="cancel-reason"
              rows="3"
              [ngModel]="cancelReason()"
              (ngModelChange)="cancelReason.set($event)"
              placeholder="VD: Thay đổi kế hoạch di chuyển..."
            ></textarea>
          </div>

          <footer class="bd-modal__foot">
            <app-app-button size="sm" variant="ghost" (clicked)="showCancelModal.set(false)">
              Quay lại
            </app-app-button>
            <app-app-button
              size="sm"
              variant="danger"
              [disabled]="cancelling()"
              (clicked)="confirmCancel(b.id)"
            >
              {{ cancelling() ? 'Đang xử lý...' : 'Xác nhận hủy vé' }}
            </app-app-button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    .bd-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .bd-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .bd-head h1 {
      font-size: var(--text-h1);
    }
    .bd-sub,
    .bd-muted {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .bd-head__actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .bd-back {
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 600;
    }
    .bd-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .bd-grid {
        grid-template-columns: 1fr;
      }
    }
    .bd-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .bd-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .bd-card h3 {
      font-size: var(--text-h3);
    }
    .bd-row-between {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .bd-seg,
    .bd-pax {
      padding: 12px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 10px;
      font-size: var(--text-small);
    }
    .bd-pax-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .bd-pax__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .bd-rule {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .bd-dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: var(--text-small);
    }
    .bd-dl div {
      display: flex;
      justify-content: space-between;
    }
    .bd-dl dt {
      color: var(--color-ink-muted);
    }
    .bd-dl dd {
      margin: 0;
      font-weight: 600;
    }
    .bd-total {
      padding-top: 10px;
      border-top: 1px solid var(--color-border);
      font-size: var(--text-h3);
      color: var(--color-primary);
    }
    .bd-contact {
      padding: 12px;
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      font-size: var(--text-caption);
    }
    .bd-contact p {
      margin: 4px 0 0;
    }
    .bd-modal {
      max-width: 520px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .bd-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    .bd-modal__head h2 {
      font-size: var(--text-h3);
    }
    .bd-close {
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
    .bd-rule-box {
      padding: 12px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .bd-rule-box p {
      margin: 4px 0 0;
      color: var(--color-ink-muted);
    }
    .bd-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: var(--text-small);
    }
    .bd-field textarea {
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--text-small);
    }
    .bd-modal__foot {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class BookingDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingFlow = inject(BookingFlowService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isAdminMode = computed(() => Boolean(this.route.snapshot.data['adminMode']));
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly showCancelModal = signal(false);
  protected readonly cancelReason = signal('');
  protected readonly cancelling = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 1049);
    const req$ = this.isAdminMode()
      ? this.bookingFlow.getAdminBooking(id)
      : this.bookingFlow.getMyBooking(id);
    req$.subscribe({
      next: (res) => {
        this.booking.set(res.data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được chi tiết đơn');
        this.loading.set(false);
      },
    });
  }

  protected confirmCancel(id: number): void {
    this.cancelling.set(true);
    const req$ = this.isAdminMode()
      ? this.bookingFlow.cancelAdminBooking(id, this.cancelReason())
      : this.bookingFlow.cancelMyBooking(id, this.cancelReason());
    req$.subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.showCancelModal.set(false);
        this.booking.set(res.data);
        this.snackBar.open('Đã hủy đơn đặt chỗ. Liên hệ 1900 1234 để được hỗ trợ hoàn vé.', 'Đóng', {
          duration: 4500,
        });
      },
      error: (err: Error) => {
        this.cancelling.set(false);
        this.snackBar.open(err.message || 'Không thể hủy đơn', 'Đóng', { duration: 4000 });
      },
    });
  }

  protected seatOf(b: BookingDetail, paxId: number): string {
    return b.seat_holds.find((h) => h.passenger_id === paxId)?.seat_code ?? 'Chưa chọn';
  }

  protected baggageOf(b: BookingDetail, paxId: number): string {
    const bg = b.baggages.find((x) => x.passenger_id === paxId);
    return bg ? `${bg.baggage_name} (${bg.weight_kg}kg)` : 'Chỉ xách tay';
  }

  protected statusLabel(s: BookingStatus): string {
    if (s === 'CONFIRMED') return 'Đã xác nhận';
    if (s === 'PENDING_PAYMENT') return 'Chờ thanh toán';
    if (s === 'CANCELLED') return 'Đã hủy';
    return 'Hết hạn';
  }

  protected statusTone(s: BookingStatus): BadgeTone {
    if (s === 'CONFIRMED') return 'success';
    if (s === 'PENDING_PAYMENT') return 'warning';
    if (s === 'CANCELLED' || s === 'EXPIRED') return 'danger';
    return 'neutral';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }
}
