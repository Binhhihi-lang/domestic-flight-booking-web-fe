import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadge, BadgeTone } from '../../../../shared/ui/status-badge/status-badge';

interface Ticket {
  code: string;
  departTime: string;
  departPlace: string;
  arriveTime: string;
  arrivePlace: string;
  date: string;
  flight: string;
  passengers: string;
  seat: string;
  total: string;
  statusLabel: string;
  statusTone: BadgeTone;
  action: { label: string; variant: 'primary' | 'accent' | 'secondary' };
  note: string | null;
}

interface Voucher {
  value: string;
  unit: string;
  type: string;
  gradient: string;
  name: string;
  description: string;
  meta: string[];
  statusLabel: string;
  statusTone: BadgeTone;
  action: { label: string; disabled: boolean } | null;
  dimmed: boolean;
}

interface WalletTx {
  title: string;
  detail: string;
  amount: string;
  amountTone: 'up' | 'down';
  balance: string;
  icon: string;
  iconTone: 'success' | 'danger';
}

/**
 * Vé của tôi — bám mockup P11 (khuôn "Tài khoản khách").
 *
 * Vì sao gom ví + vé + voucher + lịch sử vào một trang: đây là thứ khách hàng
 * mở ra thường xuyên nhất và luôn muốn thấy cùng nhau — "chuyến tới của tôi,
 * còn voucher nào dùng được, ví còn bao nhiêu". Tách thành 4 trang riêng thì
 * mỗi lần kiểm tra phải đi 4 chỗ.
 *
 * Dữ liệu tĩnh: BOOKING_READ_SELF, VOUCHER_READ, WALLET_READ_SELF thuộc
 * Phase 1/3. Khi có API, thay nguồn dữ liệu, giữ nguyên bố cục và trạng thái.
 */
@Component({
  selector: 'app-account-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, StatusBadge],
  template: `
    <!-- ===== Ví ===== -->
    <div class="wallet">
      <div class="wallet__in">
        <div class="wallet__l">Số dư ví</div>
        <div class="wallet__v tabular">1.848.000₫</div>
        <div class="wallet__hint">Tiền hoàn từ booking đã hủy · dùng để thanh toán vé mới</div>
      </div>
    </div>

    <!-- ===== Booking sắp tới ===== -->
    <h2 class="sec-t">Booking sắp tới</h2>
    <p class="sec-s">2 booking đang hoạt động</p>

    @for (t of tickets; track t.code) {
      <article class="ticket">
        <div class="ticket__main">
          <div class="ticket__code tabular">MÃ ĐẶT CHỖ · {{ t.code }}</div>
          <div class="ticket__route">
            <div>
              <div class="ticket__pt tabular">{{ t.departTime }}</div>
              <div class="ticket__pn">{{ t.departPlace }}</div>
            </div>
            <div class="ticket__arrow"><mat-icon>trending_flat</mat-icon></div>
            <div>
              <div class="ticket__pt tabular">{{ t.arriveTime }}</div>
              <div class="ticket__pn">{{ t.arrivePlace }}</div>
            </div>
          </div>
          <div class="ticket__meta">
            <span><mat-icon>calendar_month</mat-icon> {{ t.date }}</span>
            <span><mat-icon>flight</mat-icon> {{ t.flight }}</span>
            <span><mat-icon>person</mat-icon> {{ t.passengers }}</span>
            <span><mat-icon>event_seat</mat-icon> {{ t.seat }}</span>
          </div>
        </div>

        <div class="ticket__side">
          <app-status-badge [tone]="t.statusTone" [label]="t.statusLabel" />
          <div class="ticket__total">
            <div class="ticket__total-l">Tổng thanh toán</div>
            <div class="ticket__total-v tabular">{{ t.total }}</div>
          </div>
          <button class="btn" [class]="'btn--' + t.action.variant" type="button">
            {{ t.action.label }}
          </button>
          @if (t.note) {
            <div class="ticket__note">{{ t.note }}</div>
          }
        </div>
      </article>
    }

    <!-- ===== Voucher ===== -->
    <h2 class="sec-t spaced">Voucher của tôi</h2>
    <p class="sec-s">3 voucher khả dụng · 1 đã dùng</p>

    @for (v of vouchers; track v.name) {
      <article class="voucher" [class.voucher--dim]="v.dimmed">
        <div class="voucher__left" [style.background]="v.gradient">
          <div class="voucher__val">{{ v.value }}<small>{{ v.unit }}</small></div>
          <div class="voucher__type">{{ v.type }}</div>
        </div>

        <div class="voucher__bd">
          <div class="voucher__nm">{{ v.name }}</div>
          <p class="voucher__ds">{{ v.description }}</p>
          <div class="voucher__mt">
            @for (m of v.meta; track m) {
              <span>{{ m }}</span>
            }
          </div>
        </div>

        <div class="voucher__side">
          <app-status-badge [tone]="v.statusTone" [label]="v.statusLabel" />
          @if (v.action) {
            <button class="btn btn--secondary btn--sm" type="button" [disabled]="v.action.disabled">
              {{ v.action.label }}
            </button>
          }
        </div>
      </article>
    }

    <!-- ===== Lịch sử ví ===== -->
    <h2 class="sec-t spaced">Lịch sử ví</h2>
    <p class="sec-s">Giao dịch hoàn tiền và thanh toán</p>

    <div class="card">
      @for (tx of walletHistory; track tx.detail) {
        <div class="tx">
          <div class="tx__ic" [class]="'tx__ic--' + tx.iconTone">
            <mat-icon>{{ tx.icon }}</mat-icon>
          </div>
          <div class="tx__body">
            <div class="tx__t">{{ tx.title }}</div>
            <div class="tx__d tabular">{{ tx.detail }}</div>
          </div>
          <div class="tx__a">
            <b class="tabular" [class.tx--up]="tx.amountTone === 'up'" [class.tx--down]="tx.amountTone === 'down'">
              {{ tx.amount }}
            </b>
            <small class="tabular">{{ tx.balance }}</small>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    /* ---------- Ví ---------- */
    .wallet {
      background: linear-gradient(150deg, #0a4d8c, #0770cd 60%, #0194f3);
      border-radius: var(--radius-lg);
      padding: 22px;
      color: #fff;
      position: relative;
      overflow: hidden;
      margin-bottom: 16px;
    }

    .wallet::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(500px 220px at 85% 12%, rgba(255, 255, 255, 0.16), transparent 60%);
    }

    .wallet__in {
      position: relative;
      z-index: 1;
    }

    .wallet__l {
      font-size: 12.5px;
      color: rgba(255, 255, 255, 0.85);
    }

    .wallet__v {
      font-family: var(--font-heading);
      font-size: 34px;
      font-weight: 700;
      letter-spacing: -0.8px;
      margin: 5px 0 0;
    }

    .wallet__hint {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.75);
      margin-top: 7px;
    }

    .spaced {
      margin-top: 30px;
    }

    /* ---------- Thẻ vé ---------- */
    .ticket {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 18px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 12px;
      background: var(--color-surface);
    }

    .ticket__main {
      padding: 16px 18px;
      min-width: 0;
    }

    .ticket__code {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      letter-spacing: 0.5px;
      margin-bottom: 9px;
    }

    .ticket__route {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 11px;
    }

    .ticket__pt {
      font-family: var(--font-heading);
      font-size: 19px;
      font-weight: 700;
      letter-spacing: -0.3px;
      line-height: 1.1;
    }

    .ticket__pn {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      margin-top: 2px;
    }

    .ticket__arrow {
      flex: 1;
      text-align: center;
      color: var(--color-ink-subtle);
    }

    .ticket__arrow mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
    }

    .ticket__meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--color-ink-muted);
    }

    .ticket__meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ticket__meta mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .ticket__side {
      border-left: 1px dashed var(--color-border);
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 9px;
      align-items: flex-end;
      background: var(--color-surface-alt);
      min-width: 172px;
    }

    .ticket__total {
      text-align: right;
    }

    .ticket__total-l {
      font-size: 11.5px;
      color: var(--color-ink-muted);
    }

    .ticket__total-v {
      font-family: var(--font-heading);
      font-size: 17px;
      font-weight: 700;
    }

    .ticket__note {
      font-size: 11px;
      color: var(--color-danger);
    }

    .ticket__side .btn {
      width: 100%;
    }

    /* ---------- Voucher ---------- */
    .voucher {
      display: grid;
      grid-template-columns: 104px 1fr auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      margin-bottom: 12px;
      background: var(--color-surface);
    }

    .voucher--dim {
      opacity: 0.6;
    }

    .voucher__left {
      background: linear-gradient(150deg, var(--color-primary), var(--color-primary-bright));
      color: #fff;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }

    .voucher__val {
      font-family: var(--font-heading);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .voucher__val small {
      font-size: 13px;
    }

    .voucher__type {
      font-size: 10.5px;
      opacity: 0.9;
    }

    .voucher__bd {
      padding: 14px 16px;
      min-width: 0;
    }

    .voucher__nm {
      font-family: var(--font-heading);
      font-size: 14.5px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .voucher__ds {
      font-size: 12px;
      color: var(--color-ink-muted);
      margin: 0 0 8px;
      line-height: 1.45;
    }

    .voucher__mt {
      display: flex;
      gap: 13px;
      flex-wrap: wrap;
      font-size: 11.5px;
      color: var(--color-ink-subtle);
    }

    .voucher__side {
      border-left: 1px dashed var(--color-border);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      gap: 8px;
      background: var(--color-surface-alt);
      min-width: 150px;
    }

    /* ---------- Lịch sử ví ---------- */
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 6px 18px;
    }

    .tx {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 0;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .tx:last-child {
      border-bottom: 0;
    }

    .tx__ic {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .tx__ic mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .tx__ic--success {
      background: var(--color-success-soft);
    }

    .tx__ic--success mat-icon {
      color: var(--color-on-success-soft);
    }

    .tx__ic--danger {
      background: var(--color-danger-soft);
    }

    .tx__ic--danger mat-icon {
      color: var(--color-on-danger-soft);
    }

    .tx__body {
      min-width: 0;
    }

    .tx__t {
      font-size: 13.5px;
      font-weight: 600;
    }

    .tx__d {
      font-size: 11.5px;
      color: var(--color-ink-muted);
    }

    .tx__a {
      margin-left: auto;
      text-align: right;
      flex: 0 0 auto;
    }

    .tx__a b {
      font-size: 14px;
      font-weight: 700;
    }

    .tx--up {
      color: var(--color-success);
    }

    .tx--down {
      color: var(--color-danger);
    }

    .tx__a small {
      display: block;
      font-size: 11px;
      color: var(--color-ink-muted);
    }

    /* ---------- Nút ---------- */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 13.5px;
      font-weight: 600;
      padding: 9px 15px;
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
      white-space: nowrap;
    }

    .btn--sm {
      padding: 7px 13px;
      font-size: 12.5px;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn--accent {
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    .btn--accent:hover:not(:disabled) {
      background: var(--color-accent-hover);
    }

    .btn--secondary {
      background: var(--color-surface);
      color: var(--color-primary);
      border-color: var(--color-primary);
    }

    .btn--secondary:hover:not(:disabled) {
      background: var(--color-primary-soft);
    }

    .btn:disabled {
      background: var(--color-border-soft);
      color: var(--color-ink-subtle);
      border-color: var(--color-border);
      cursor: not-allowed;
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */
    @media (max-width: 720px) {
      .ticket {
        grid-template-columns: 1fr;
      }

      .ticket__side {
        border-left: 0;
        border-top: 1px dashed var(--color-border);
        align-items: stretch;
        min-width: 0;
      }

      .ticket__total {
        text-align: left;
      }

      .voucher {
        grid-template-columns: 82px 1fr;
      }

      .voucher__side {
        border-left: 0;
        border-top: 1px dashed var(--color-border);
        grid-column: 1 / -1;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        min-width: 0;
        padding: 12px 14px;
      }
    }

    @media (max-width: 640px) {
      .wallet {
        padding: 18px;
      }

      .wallet__v {
        font-size: 28px;
      }
    }
  `,
})
export class AccountBookings {
  protected readonly tickets: Ticket[] = [
    {
      code: 'ABC123',
      departTime: '06:15',
      departPlace: 'Hà Nội (HAN)',
      arriveTime: '07:40',
      arrivePlace: 'Đà Nẵng (DAD)',
      date: 'Thứ Bảy, 15/11/2026',
      flight: 'VN 165 · Vietnam Airlines',
      passengers: '1 người lớn',
      seat: 'Ghế 12A',
      total: '890.000₫',
      statusLabel: 'Đã xác nhận',
      statusTone: 'success',
      action: { label: 'Xem vé điện tử', variant: 'primary' },
      note: null,
    },
    {
      code: 'XYZ789',
      departTime: '18:30',
      departPlace: 'Hà Nội (HAN)',
      arriveTime: '19:55',
      arrivePlace: 'Đà Nẵng (DAD)',
      date: 'Chủ Nhật, 23/11/2026',
      flight: 'VN 173 · Vietnam Airlines',
      passengers: '2 người lớn, 1 trẻ em',
      seat: 'Chưa chọn ghế',
      total: '3.240.000₫',
      statusLabel: 'Chờ thanh toán',
      statusTone: 'warning',
      action: { label: 'Thanh toán ngay', variant: 'accent' },
      note: 'Còn 8 phút để hoàn tất',
    },
  ];

  protected readonly vouchers: Voucher[] = [
    {
      value: '50K',
      unit: '',
      type: 'giảm tiền',
      gradient: 'linear-gradient(150deg, var(--color-primary), var(--color-primary-bright))',
      name: 'Giảm 50.000₫ mùa hè',
      description:
        'Áp dụng mọi chuyến bay nội địa. Đơn tối thiểu 500.000₫. Không áp dụng cho hành khách em bé.',
      meta: ['HSD: 31/12/2026', 'Đơn tối thiểu 500.000₫', 'Một chiều & khứ hồi'],
      statusLabel: 'Khả dụng',
      statusTone: 'success',
      action: { label: 'Dùng ngay', disabled: false },
      dimmed: false,
    },
    {
      value: '10',
      unit: '%',
      type: 'giảm phần trăm',
      gradient: 'linear-gradient(150deg, #b8420a, #ff7a45)',
      name: 'Giảm 10% Vietnam Airlines',
      description: 'Chỉ áp dụng chuyến bay Vietnam Airlines. Trần giảm 200.000₫.',
      meta: ['HSD: 20/12/2026', 'Trần giảm 200.000₫', 'Chỉ hãng VN'],
      statusLabel: 'Đang giữ',
      statusTone: 'info',
      action: { label: 'Đang dùng', disabled: true },
      dimmed: false,
    },
    {
      value: '100K',
      unit: '',
      type: 'giảm tiền',
      gradient: 'linear-gradient(150deg, #6b7f96, #93a7be)',
      name: 'Giảm 100.000₫ Tết 2026',
      description: 'Đã dùng cho booking ABC100 ngày 02/10/2026.',
      meta: ['Đã dùng lúc 02/10/2026'],
      statusLabel: 'Đã dùng',
      statusTone: 'neutral',
      action: null,
      dimmed: true,
    },
  ];

  protected readonly walletHistory: WalletTx[] = [
    {
      title: 'Hoàn tiền hủy vé',
      detail: 'Booking ABC100 · 09/10/2026 14:22',
      amount: '+1.848.000₫',
      amountTone: 'up',
      balance: 'Số dư: 1.848.000₫',
      icon: 'south_west',
      iconTone: 'success',
    },
    {
      title: 'Thanh toán vé',
      detail: 'Booking ABC123 · 05/10/2026 09:41',
      amount: '−890.000₫',
      amountTone: 'down',
      balance: 'Số dư: 0₫',
      icon: 'north_east',
      iconTone: 'danger',
    },
    {
      title: 'Hoàn tiền hủy vé',
      detail: 'Booking ABC099 · 28/09/2026 16:05',
      amount: '+890.000₫',
      amountTone: 'up',
      balance: 'Số dư: 890.000₫',
      icon: 'south_west',
      iconTone: 'success',
    },
  ];
}
