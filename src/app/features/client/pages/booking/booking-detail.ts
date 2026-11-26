import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, of } from 'rxjs';
import { BookingDetail, BookingStatus, ETicketItem } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { CheckoutService } from '@core/services/checkout.service';
import { QrCodeComponent } from '@shared/components/qr-code/qr-code';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Chi tiết đặt chỗ (`/account/bookings/:id` & `/admin/bookings/:id`) — DA3.2 / Cluster 5B.
 * - Hiển thị hành trình, bảng hành khách (nhãn tiếng Việt), ghế ngồi, hành lý, hóa đơn thanh toán,
 *   và danh sách Vé điện tử thật (`GET /api/bookings/{id}/e-tickets`) kèm nút In vé điện tử khi `CONFIRMED`.
 * - Modal xác nhận hủy vé chuẩn D1: tiêu đề dùng `DH-{id}` khi chưa có PNR (`PENDING_PAYMENT`) hoặc `PNR` khi đã xác nhận,
 *   ước tính hoàn tiền/phí hủy theo hạng vé, lưu ý không tự hoàn tiền + hotline 1900 1234, và checkbox xác nhận bắt buộc.
 */
@Component({
  selector: 'app-booking-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, QrCodeComponent, AppAlert, AppButton, StatusBadge, SkeletonBlock],
  template: `
    <section class="bd-page" [class.wrap]="isAdminMode()">
      <header class="bd-head">
        <div>
          <h1>Chi tiết đặt chỗ {{ booking() ? (booking()!.order_code || ('DH-' + booking()!.id)) : '' }}</h1>
          <p class="bd-sub">Hành trình, danh sách hành khách, ghế ngồi, hành lý, vé điện tử và quy định hoàn vé</p>
        </div>
        <div class="bd-head__actions">
          <a [routerLink]="isAdminMode() ? '/admin/bookings' : '/account'" class="bd-back">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
            Quay lại danh sách đặt chỗ
          </a>
          @if (booking(); as b) {
            @if (b.status !== 'CANCELLED' && b.status !== 'EXPIRED') {
              <app-app-button size="sm" variant="danger" (clicked)="openCancelModal()">
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
                  <strong>
                    Mã đơn: {{ b.order_code || ('DH-' + b.id) }}@if (b.status === 'CONFIRMED' && b.booking_code) { · PNR: {{ b.booking_code }} }
                  </strong>
                  <div class="bd-muted">
                    Khách đặt: {{ b.customer_name }} · {{ b.customer_email }}
                    @if (b.customer_phone) { · {{ b.customer_phone }} }
                  </div>
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
                    <strong>{{ seg.segment_order === 1 ? 'Chặng đi' : 'Chặng về' }} · {{ seg.flight_number }} · {{ seg.airline_name }}</strong>
                    <div>{{ seg.departure_airport_code }} → {{ seg.arrival_airport_code }}</div>
                    <div class="bd-muted">{{ seg.fare_class_name }} ({{ seatClassLabel(seg.seat_class) }})</div>
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

            <!-- Vé điện tử thật khi đã xác nhận -->
            @if (b.status === 'CONFIRMED') {
              <section class="bd-card" data-testid="detail-etickets-section">
                <div class="bd-row-between">
                  <h3>Vé điện tử ({{ tickets().length }})</h3>
                  <button type="button" class="bd-print-btn" (click)="printTickets()">
                    <mat-icon>print</mat-icon>
                    In vé điện tử
                  </button>
                </div>

                @if (ticketsLoading()) {
                  <app-skeleton-block height="96px" />
                } @else if (tickets().length > 0) {
                  <div class="bd-eticket-list">
                    @for (t of tickets(); track t.id) {
                      <article class="bd-eticket" data-testid="detail-eticket-card">
                        <div class="bd-eticket__top">
                          <span><b>{{ t.airline_name }}</b> · {{ t.flight_number }}</span>
                          <span class="tabular">Số vé: <b>{{ t.ticket_code }}</b></span>
                        </div>
                        <div class="bd-eticket__body">
                          <div>
                            <div class="bd-eticket__route">
                              {{ t.departure_airport_code }} → {{ t.arrival_airport_code }}
                            </div>
                            <div class="bd-muted">
                              {{ formatTime(t.scheduled_departure) }} – {{ formatTime(t.scheduled_arrival) }} · {{ formatDate(t.scheduled_departure) }}
                            </div>
                          </div>
                          <div class="bd-eticket__meta">
                            <span><b>{{ t.passenger_name }}</b> ({{ passengerTypeLabel(t.passenger_type) }})</span>
                            <span class="bd-muted">PNR: {{ t.pnr_code }} · Ghế: {{ t.seat_code || 'Đi cùng người lớn' }} · {{ t.fare_class_name }}</span>
                          </div>
                          <a
                            class="bd-eticket__qr"
                            [routerLink]="['/verify-ticket']"
                            [queryParams]="{ code: t.ticket_code }"
                            title="Quét hoặc bấm để xác thực vé điện tử"
                          >
                            <app-qr-code
                              [value]="verifyUrlOf(t.ticket_code)"
                              [size]="68"
                              [alt]="'Mã QR xác thực vé ' + t.ticket_code"
                            />
                            <small>Xác thực QR</small>
                          </a>
                        </div>
                      </article>
                    }
                  </div>
                } @else {
                  <p class="bd-muted">Chưa có dữ liệu vé điện tử cho đơn đặt chỗ này.</p>
                }
              </section>
            }

            <!-- Bảng hành khách -->
            <section class="bd-card">
              <h3>Hành khách, ghế ngồi & hành lý ({{ b.passengers.length }})</h3>
              <div class="bd-table-wrap">
                <table class="bd-table" data-testid="detail-pax-table">
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Loại khách</th>
                      <th>Ngày sinh</th>
                      <th>Giấy tờ</th>
                      <th>Ghế</th>
                      <th>Hành lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of b.passengers; track p.id) {
                      <tr>
                        <td class="bd-table__name">{{ p.full_name }}</td>
                        <td>{{ passengerTypeLabel(p.passenger_type) }}</td>
                        <td class="tabular">{{ formatDate(p.birth_date) }}</td>
                        <td class="tabular">{{ p.passport_number || 'Không yêu cầu' }}</td>
                        <td><strong>{{ seatOf(b, p.id) }}</strong></td>
                        <td>{{ baggageOf(b, p.id) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
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
                  <dd class="tabular">−{{ formatMoney(b.promotion_discount_amount) }}</dd>
                </div>
              }
              @if (b.voucher_discount_amount > 0) {
                <div>
                  <dt>Voucher</dt>
                  <dd class="tabular">−{{ formatMoney(b.voucher_discount_amount) }}</dd>
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

    <!-- Modal xác nhận hủy vé -->
    @if (showCancelModal() && booking(); as b) {
      <div
        class="vf-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận hủy đặt chỗ"
        (click)="closeCancelModal()"
      >
        <div class="vf-modal-panel bd-modal" (click)="$event.stopPropagation()">
          <header class="bd-modal__head">
            <h2 data-testid="cancel-modal-title">Xác nhận hủy đặt chỗ — {{ cancelModalRef(b) }}</h2>
            <button
              type="button"
              class="bd-close"
              aria-label="Đóng hộp thoại hủy vé"
              (click)="closeCancelModal()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <app-alert
            tone="warning"
            title="Lưu ý quan trọng về hoàn tiền"
            message="Hệ thống KHÔNG tự động hoàn tiền khi hủy vé. Sau khi hủy, vui lòng liên hệ tổng đài đại lý 1900 1234 hoặc email hotro@vinafly.vn để kiểm tra điều kiện và nhận hỗ trợ hoàn vé theo quy định của hạng vé đã mua."
          />

          <div class="bd-rule-box" data-testid="cancel-refund-estimate">
            <strong>Ước tính phí hủy & hoàn vé (tham khảo):</strong>
            @if (b.status === 'PENDING_PAYMENT') {
              <p>Đơn hàng đang ở trạng thái chờ thanh toán — hủy đơn sẽ giải phóng ghế giữ tạm và không phát sinh phí.</p>
            } @else if (b.segments[0]?.fare_rule; as rule) {
              @if (rule.is_refundable) {
                <p>
                  Hạng vé hỗ trợ hoàn <b>{{ rule.refund_percent }}%</b> giá vé cơ bản (trước tối thiểu
                  <b>{{ rule.refund_min_hours_before_departure ?? 24 }} giờ</b> khởi hành).
                </p>
                <div class="bd-estimate-rows">
                  <div>
                    <span>Tiền hoàn dự kiến:</span>
                    <strong class="tabular">{{ formatMoney(estimatedRefund(b)) }}</strong>
                  </div>
                  <div>
                    <span>Phí hủy dự kiến:</span>
                    <strong class="tabular">{{ formatMoney(estimatedCancelFee(b)) }}</strong>
                  </div>
                </div>
              } @else {
                <p>Hạng vé đã mua không hỗ trợ hoàn tiền (phí hủy dự kiến 100% giá vé). {{ rule.description || '' }}</p>
              }
            } @else {
              <p>Vui lòng liên hệ tổng đài 1900 1234 để được kiểm tra chính xác điều kiện hoàn/hủy theo hãng bay.</p>
            }
          </div>

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

          <label class="bd-confirm-check">
            <input
              type="checkbox"
              id="cancel-confirm-check"
              data-testid="cancel-confirm-checkbox"
              [checked]="confirmCancelChecked()"
              (change)="confirmCancelChecked.set(!confirmCancelChecked())"
            />
            <span>Tôi xác nhận muốn hủy đặt chỗ này và hiểu rằng hệ thống không tự động hoàn tiền.</span>
          </label>

          <footer class="bd-modal__foot">
            <app-app-button size="sm" variant="ghost" (clicked)="closeCancelModal()">
              Quay lại
            </app-app-button>
            <app-app-button
              size="sm"
              variant="danger"
              data-testid="btn-confirm-cancel"
              [disabled]="cancelling() || !confirmCancelChecked()"
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
      gap: var(--sp-lg);
    }
    .bd-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--sp-md);
    }
    .bd-head h1 {
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .bd-sub,
    .bd-muted {
      margin: var(--sp-xs) 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .bd-head__actions {
      display: flex;
      align-items: center;
      gap: var(--sp-md);
      flex-wrap: wrap;
    }
    .bd-back {
      display: inline-flex;
      align-items: center;
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
    .bd-back:hover {
      background: var(--color-surface-alt);
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .bd-back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .bd-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: var(--sp-lg);
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
      gap: var(--sp-lg);
    }
    .bd-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--sp-lg);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: var(--sp-md);
    }
    .bd-card h3 {
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .bd-row-between {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: var(--sp-sm);
    }
    .bd-seg {
      padding: var(--sp-md);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--sp-sm);
      font-size: var(--text-small);
    }
    .bd-rule {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .bd-print-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-xs);
      padding: var(--sp-xs) var(--sp-md);
      border: 1px solid var(--color-primary);
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
    }
    .bd-print-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .bd-eticket-list {
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
    }
    .bd-eticket {
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--color-surface-alt);
    }
    .bd-eticket__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--sp-sm);
      padding: var(--sp-sm) var(--sp-md);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: var(--text-small);
    }
    .bd-eticket__body {
      padding: var(--sp-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--sp-md);
    }
    .bd-eticket__route {
      font-weight: 700;
      font-size: var(--text-body);
      color: var(--color-ink);
    }
    .bd-eticket__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      font-size: var(--text-small);
    }
    .bd-table-wrap {
      width: 100%;
      overflow-x: auto;
    }
    .bd-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-small);
      min-width: 520px;
    }
    .bd-table th,
    .bd-table td {
      text-align: left;
      padding: var(--sp-sm) var(--sp-md);
      border-bottom: 1px solid var(--color-border-soft);
    }
    .bd-table th {
      font-size: var(--text-caption);
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }
    .bd-table tbody tr:last-child td {
      border-bottom: none;
    }
    .bd-table__name {
      font-weight: 700;
      color: var(--color-ink);
    }
    .bd-dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
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
      color: var(--color-ink);
    }
    .bd-total {
      padding-top: var(--sp-sm);
      border-top: 1px solid var(--color-border);
      font-size: var(--text-h3);
      color: var(--color-primary);
    }
    .bd-total dd {
      color: var(--color-primary);
    }
    .bd-contact {
      padding: var(--sp-md);
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      font-size: var(--text-caption);
      color: var(--color-ink);
    }
    .bd-contact p {
      margin: var(--sp-xs) 0 0;
    }
    .bd-modal {
      max-width: 540px;
      padding: var(--sp-lg);
      display: flex;
      flex-direction: column;
      gap: var(--sp-md);
    }
    .bd-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--sp-sm);
    }
    .bd-modal__head h2 {
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .bd-close {
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      color: var(--color-ink);
      border-radius: 999px;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .bd-rule-box {
      padding: var(--sp-md);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .bd-rule-box p {
      margin: var(--sp-xs) 0 0;
      color: var(--color-ink-muted);
    }
    .bd-estimate-rows {
      margin-top: var(--sp-sm);
      padding-top: var(--sp-sm);
      border-top: 1px dashed var(--color-border);
      display: flex;
      flex-direction: column;
      gap: var(--sp-xs);
    }
    .bd-estimate-rows > div {
      display: flex;
      justify-content: space-between;
      color: var(--color-ink);
    }
    .bd-field {
      display: flex;
      flex-direction: column;
      gap: var(--sp-xs);
      font-size: var(--text-small);
    }
    .bd-field textarea {
      padding: var(--sp-sm) var(--sp-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: inherit;
      font-size: var(--text-small);
    }
    .bd-confirm-check {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-sm);
      font-size: var(--text-small);
      color: var(--color-ink);
      cursor: pointer;
    }
    .bd-confirm-check input[type='checkbox'] {
      margin-top: 3px;
      accent-color: var(--color-danger);
    }
    .bd-modal__foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--sp-sm);
    }
    @media (max-width: 600px) {
      .bd-eticket__meta {
        align-items: flex-start;
      }
    }
    .bd-eticket__qr {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 5px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      text-decoration: none;
      color: var(--color-ink-muted);
    }
    .bd-eticket__qr:hover {
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .bd-eticket__qr small {
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }
    @media print {
      .bd-page {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        gap: 12px;
      }
      .bd-head__actions,
      .bd-print-btn,
      .bd-side,
      .vf-modal-backdrop {
        display: none !important;
      }
      .bd-grid {
        display: block;
      }
      .bd-card {
        box-shadow: none;
        border: 1.5px solid var(--color-border);
        padding: 14px 16px;
        margin-bottom: 12px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .bd-eticket {
        break-inside: avoid;
        page-break-inside: avoid;
        border: 1.5px solid var(--color-border);
      }
      .bd-eticket__top {
        background: var(--color-primary-soft) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .bd-table {
        min-width: 0;
        font-size: 12px;
      }
    }
  `,
})
export class BookingDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingFlow = inject(BookingFlowService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly isAdminMode = computed(() => Boolean(this.route.snapshot.data['adminMode']));
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly tickets = signal<ETicketItem[]>([]);
  protected readonly ticketsLoading = signal(false);
  protected readonly showCancelModal = signal(false);
  protected readonly cancelReason = signal('');
  protected readonly confirmCancelChecked = signal(false);
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
        if (res.data?.status === 'CONFIRMED') {
          this.loadETickets(res.data.id);
        }
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được chi tiết đơn');
        this.loading.set(false);
      },
    });
  }

  private loadETickets(bookingId: number): void {
    this.ticketsLoading.set(true);
    this.checkoutService
      .getETickets(bookingId)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.tickets.set(res?.data ?? []);
        this.ticketsLoading.set(false);
      });
  }

  protected openCancelModal(): void {
    this.confirmCancelChecked.set(false);
    this.cancelReason.set('');
    this.showCancelModal.set(true);
  }

  protected closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.confirmCancelChecked.set(false);
  }

  protected cancelModalRef(b: BookingDetail): string {
    if (b.status === 'CONFIRMED' && b.booking_code) {
      return b.booking_code;
    }
    return b.order_code || `DH-${b.id}`;
  }

  protected estimatedRefund(b: BookingDetail): number {
    const rule = b.segments[0]?.fare_rule;
    if (!rule || !rule.is_refundable) return 0;
    return Math.round(b.fare_amount * (rule.refund_percent / 100));
  }

  protected estimatedCancelFee(b: BookingDetail): number {
    return Math.max(0, b.fare_amount - this.estimatedRefund(b));
  }

  protected confirmCancel(id: number): void {
    if (!this.confirmCancelChecked() || this.cancelling()) return;
    this.cancelling.set(true);
    const req$ = this.isAdminMode()
      ? this.bookingFlow.cancelAdminBooking(id, this.cancelReason())
      : this.bookingFlow.cancelMyBooking(id, this.cancelReason());
    req$.subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.closeCancelModal();
        this.booking.set(res.data);
        this.tickets.set([]);
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

  protected printTickets(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  protected verifyUrlOf(ticketCode: string): string {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost:4200';
    return `${origin}/verify-ticket?code=${encodeURIComponent(ticketCode)}`;
  }

  protected seatOf(b: BookingDetail, paxId: number): string {
    const codes = b.seat_holds.filter((h) => h.passenger_id === paxId).map((h) => h.seat_code);
    return codes.length > 0 ? codes.join(', ') : 'Chưa chọn';
  }

  protected baggageOf(b: BookingDetail, paxId: number): string {
    const bg = b.baggages.find((x) => x.passenger_id === paxId);
    return bg ? `${bg.baggage_name} (${bg.weight_kg}kg)` : 'Chỉ xách tay';
  }

  protected passengerTypeLabel(type: string): string {
    if (type === 'ADULT') return 'Người lớn';
    if (type === 'CHILD') return 'Trẻ em';
    return 'Em bé';
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
    return `${moneyFmt.format(Math.round(val ?? 0))}đ`;
  }

  protected formatTime(iso: string): string {
    if (!iso) return '--:--';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso.slice(11, 16)
      : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso.slice(0, 10)
      : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
