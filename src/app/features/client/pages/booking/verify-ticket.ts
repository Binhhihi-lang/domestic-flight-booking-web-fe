import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ETicketVerifyResult } from '@core/models/booking.model';
import { CheckoutService } from '@core/services/checkout.service';

/**
 * Trang công khai Xác thực Vé điện tử qua mã QR (`/verify-ticket?code=...`).
 * Hiển thị trạng thái hợp lệ (`ISSUED`) hoặc đã hủy (`CANCELLED`) cùng thông tin hành trình,
 * ẩn toàn bộ thông tin cá nhân nhạy cảm (email, SĐT, CCCD, tổng tiền).
 */
@Component({
  selector: 'app-verify-ticket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="vt-wrap">
      <div class="vt-box">
        <header class="vt-head">
          <div class="vt-head__ic" aria-hidden="true">
            <mat-icon>qr_code_scanner</mat-icon>
          </div>
          <div>
            <h1>Xác thực vé điện tử</h1>
            <p>Kiểm tra tình trạng phát hành và thông tin hành trình theo số vé điện tử VinaFly.</p>
          </div>
        </header>

        <form class="vt-search" (ngSubmit)="submitVerify()">
          <input
            type="text"
            name="ticketCode"
            class="vt-input"
            placeholder="Nhập số vé điện tử (VD: 738-4521001)"
            aria-label="Số vé điện tử"
            [(ngModel)]="ticketCode"
            autocomplete="off"
            required
          />
          <button type="submit" class="vt-btn" [disabled]="loading()">
            <mat-icon aria-hidden="true">verified</mat-icon>
            {{ loading() ? 'Đang kiểm tra...' : 'Xác thực' }}
          </button>
        </form>

        @if (errorMsg()) {
          <div class="vt-alert vt-alert--error" role="alert" data-testid="verify-error">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMsg() }}</span>
          </div>
        }

        @if (ticket(); as t) {
          <article
            class="vt-card"
            [class.vt-card--valid]="t.status === 'ISSUED'"
            [class.vt-card--cancelled]="t.status !== 'ISSUED'"
            data-testid="verify-result"
          >
            <div class="vt-status">
              <mat-icon aria-hidden="true">
                {{ t.status === 'ISSUED' ? 'verified' : 'cancel' }}
              </mat-icon>
              <div>
                <strong>
                  {{ t.status === 'ISSUED' ? 'Vé điện tử hợp lệ' : 'Vé điện tử đã hủy' }}
                </strong>
                <span>
                  Số vé <b class="tabular">{{ t.ticket_code }}</b> · PNR <b class="tabular">{{ t.pnr_code }}</b>
                </span>
              </div>
            </div>

            <div class="vt-route">
              <div>
                <div class="vt-time tabular">{{ formatTime(t.scheduled_departure) }}</div>
                <div class="vt-ap">{{ t.departure_airport_code }}</div>
                <div class="vt-city">{{ t.departure_city_name || '' }}</div>
                <div class="vt-terminal">Nhà ga Nội địa (T1)</div>
              </div>
              <div class="vt-mid">
                <span>{{ formatDate(t.scheduled_departure) }}</span>
                <div class="vt-line">
                  <mat-icon aria-hidden="true">flight</mat-icon>
                </div>
                <span class="vt-airline">
                  @if (t.airline_logo_url) {
                    <img class="vt-logo" [src]="t.airline_logo_url" [alt]="t.airline_name" />
                  }
                  {{ t.airline_name }} · <b>{{ t.flight_number }}</b>
                </span>
              </div>
              <div class="vt-end">
                <div class="vt-time tabular">{{ formatTime(t.scheduled_arrival) }}</div>
                <div class="vt-ap">{{ t.arrival_airport_code }}</div>
                <div class="vt-city">{{ t.arrival_city_name || '' }}</div>
                <div class="vt-terminal">Nhà ga Nội địa (T1)</div>
              </div>
            </div>

            <dl class="vt-meta">
              <div>
                <dt>Hành khách</dt>
                <dd>{{ t.passenger_name }} ({{ passengerTypeLabel(t.passenger_type) }})</dd>
              </div>
              <div>
                <dt>Hạng vé</dt>
                <dd>{{ t.fare_class_name }} ({{ seatClassLabel(t.seat_class) }})</dd>
              </div>
              <div>
                <dt>Số ghế</dt>
                <dd class="tabular">{{ t.seat_code || 'Đi cùng người lớn' }}</dd>
              </div>
              <div>
                <dt>Thời điểm phát hành</dt>
                <dd class="tabular">{{ formatDateTime(t.issued_at) }}</dd>
              </div>
            </dl>
          </article>
        }

        <div class="vt-foot">
          <a routerLink="/lookup" class="vt-link">
            <mat-icon aria-hidden="true">search</mat-icon>
            Tra cứu đầy đủ đơn đặt chỗ
          </a>
          <a routerLink="/" class="vt-link">
            <mat-icon aria-hidden="true">home</mat-icon>
            Về trang chủ
          </a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .vt-wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: var(--sp-3xl) var(--sp-lg);
    }
    .vt-box {
      display: flex;
      flex-direction: column;
      gap: var(--sp-lg);
    }
    .vt-head {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-md);
    }
    .vt-head__ic {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }
    .vt-head h1 {
      margin: 0 0 var(--sp-xs);
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .vt-head p {
      margin: 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .vt-search {
      display: flex;
      gap: var(--sp-sm);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--sp-md);
      box-shadow: var(--shadow-sm);
    }
    .vt-input {
      flex: 1 1 auto;
      min-width: 0;
      height: 44px;
      padding: 0 14px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-size: var(--text-body);
    }
    .vt-input:focus {
      outline: none;
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }
    .vt-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 44px;
      padding: 0 18px;
      border: 0;
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .vt-btn:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }
    .vt-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .vt-alert {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      padding: var(--sp-md) var(--sp-lg);
      border-radius: var(--radius);
      font-size: var(--text-small);
      font-weight: 500;
    }
    .vt-alert--error {
      background: var(--color-danger-soft);
      border: 1px solid var(--color-danger);
      color: var(--color-on-danger-soft);
    }
    .vt-card {
      background: var(--color-surface);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .vt-status {
      display: flex;
      align-items: center;
      gap: var(--sp-md);
      padding: var(--sp-lg) var(--sp-xl);
    }
    .vt-card--valid .vt-status {
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
    }
    .vt-card--cancelled .vt-status {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
    .vt-status mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      flex: 0 0 auto;
    }
    .vt-status strong {
      display: block;
      font-family: var(--font-heading);
      font-size: var(--text-h3);
    }
    .vt-status span {
      font-size: var(--text-small);
    }
    .vt-route {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--sp-lg);
      align-items: center;
      padding: var(--sp-xl);
      border-bottom: 1px dashed var(--color-border);
    }
    .vt-time {
      font-size: var(--text-h2);
      font-weight: 700;
      color: var(--color-ink);
    }
    .vt-ap {
      font-weight: 700;
      color: var(--color-primary);
    }
    .vt-city {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .vt-terminal {
      margin-top: 2px;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-ink-subtle);
    }
    .vt-airline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .vt-logo {
      width: 20px;
      height: 20px;
      object-fit: contain;
      border-radius: 4px;
    }
    .vt-end {
      text-align: right;
    }
    .vt-mid {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--sp-xs);
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      text-align: center;
    }
    .vt-line {
      width: 100%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 22px;
    }
    .vt-line::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      border-top: 1.5px dashed var(--color-border);
      transform: translateY(-50%);
    }
    .vt-line mat-icon {
      position: relative;
      z-index: 1;
      width: 24px;
      height: 24px;
      font-size: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--color-surface);
      color: var(--color-primary-bright);
      transform: rotate(90deg);
    }
    .vt-meta {
      margin: 0;
      padding: var(--sp-lg) var(--sp-xl);
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-md);
      background: var(--color-surface-alt);
    }
    .vt-meta dt {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      margin-bottom: 2px;
    }
    .vt-meta dd {
      margin: 0;
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-ink);
    }
    .vt-foot {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-md);
    }
    .vt-link {
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
    }
    .vt-link:hover {
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .vt-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    @media (max-width: 600px) {
      .vt-search {
        flex-direction: column;
      }
      .vt-meta {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class VerifyTicketPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutService = inject(CheckoutService);

  protected ticketCode = '';
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal('');
  protected readonly ticket = signal<ETicketVerifyResult | null>(null);

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code') ?? '';
    if (code.trim()) {
      this.ticketCode = code.trim();
      this.submitVerify();
    }
  }

  protected submitVerify(): void {
    const code = this.ticketCode.trim();
    if (!code) {
      this.errorMsg.set('Vui lòng nhập số vé điện tử cần xác thực.');
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.ticket.set(null);
    this.checkoutService.verifyPublicETicket(code).subscribe({
      next: (res) => {
        this.ticket.set(res.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(
          err?.error?.message ?? 'Không tìm thấy vé điện tử hợp lệ với mã đã nhập.',
        );
      },
    });
  }

  protected passengerTypeLabel(type: string): string {
    if (type === 'ADULT') return 'Người lớn';
    if (type === 'CHILD') return 'Trẻ em';
    return 'Em bé';
  }

  protected seatClassLabel(cls: string): string {
    if (cls === 'BUSINESS') return 'Thương gia';
    if (cls === 'PREMIUM_ECONOMY') return 'Phổ thông đặc biệt';
    return 'Phổ thông';
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

  protected formatDateTime(iso: string): string {
    if (!iso) return '';
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
}
