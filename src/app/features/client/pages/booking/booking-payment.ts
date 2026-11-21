import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { BookingDetail, PaymentMethod, PaymentTransaction } from '@core/models/booking.model';
import { CheckoutService } from '@core/services/checkout.service';

/**
 * Màn 2/3 Cụm B6 — Thanh toán đơn đặt vé với đồng hồ đếm ngược 15:00 (`/booking/payment`).
 *
 * Hỗ trợ 2 phương thức chuẩn đã chốt (QĐ-11 + VNPay / payOS):
 * - `VNPAY`: Chuyển hướng cổng thanh toán VNPay (hoặc giả lập thành công/thất bại ở Mock mode).
 * - `PAYOS` / `BANK_TRANSFER`: Chuyển khoản VietQR kèm thông tin tài khoản, nút sao chép,
 *   và nút đồng bộ trạng thái `POST /api/payments/{id}/payos/sync` (poll 3s khi chờ chuyển khoản).
 */
@Component({
  selector: 'app-booking-payment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  templateUrl: './booking-payment.html',
  styleUrl: './booking-payment.css',
})
export class BookingPayment implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly checkoutService = inject(CheckoutService);

  protected readonly bookingId = signal<number>(1001);
  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly selectedMethod = signal<PaymentMethod>('VNPAY');
  protected readonly transaction = signal<PaymentTransaction | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly processing = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copiedField = signal<string | null>(null);

  /** Số giây còn lại trong hạn giữ chỗ 15 phút. */
  protected readonly remainingSeconds = signal<number>(15 * 60);

  protected readonly countdownText = computed(() => {
    const total = Math.max(0, this.remainingSeconds());
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  });

  protected readonly isExpired = computed(() => this.remainingSeconds() <= 0);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const idParam = Number(
      this.route.snapshot.paramMap.get('id') ??
        this.route.snapshot.queryParamMap.get('bookingId') ??
        1001,
    );
    this.bookingId.set(Number.isFinite(idParam) && idParam > 0 ? idParam : 1001);
    this.loadBooking();
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private loadBooking(): void {
    this.loading.set(true);
    this.error.set(null);
    this.checkoutService
      .getBookingDetail(this.bookingId())
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.booking.set(res.data);
          this.initCountdown(res.data.payment_expires_at);
        } else {
          this.error.set('Không tìm thấy thông tin đơn đặt vé cần thanh toán.');
        }
        this.loading.set(false);
      });
  }

  private initCountdown(expiresIso: string | null): void {
    this.clearCountdown();
    if (expiresIso) {
      const diff = Math.floor((new Date(expiresIso).getTime() - Date.now()) / 1000);
      this.remainingSeconds.set(Number.isFinite(diff) ? Math.max(0, diff) : 15 * 60);
    } else {
      this.remainingSeconds.set(15 * 60);
    }

    this.countdownTimer = setInterval(() => {
      this.remainingSeconds.update((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  }

  protected selectMethod(method: PaymentMethod): void {
    this.selectedMethod.set(method);
    this.error.set(null);
  }

  /**
   * Khởi tạo giao dịch thanh toán:
   * - `simulate`: `'SUCCESS'` để test nhanh luồng thành công; `'PENDING'` để sinh mã QR / URL thật.
   */
  protected submitPayment(simulate?: 'PENDING' | 'SUCCESS' | 'FAILED'): void {
    if (this.processing() || this.isExpired()) return;
    this.processing.set(true);
    this.error.set(null);

    this.checkoutService
      .createPayment(this.bookingId(), {
        payment_method: this.selectedMethod(),
        simulate_result: simulate,
      })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        this.processing.set(false);
        if (!res?.data) {
          this.error.set('Không thể khởi tạo giao dịch thanh toán. Vui lòng thử lại.');
          return;
        }
        const txn = res.data;
        this.transaction.set(txn);

        if (txn.status === 'SUCCESS' || txn.booking_status === 'CONFIRMED') {
          this.clearTimers();
          this.router.navigate(['/booking/confirmation'], {
            queryParams: { bookingId: txn.booking_id, code: txn.booking_code },
          });
          return;
        }

        if (txn.status === 'FAILED') {
          this.error.set('Giao dịch thanh toán thất bại. Bạn có thể thử thanh toán lại trong thời gian giữ chỗ.');
          return;
        }

        // Nếu là VietQR / payOS đang PENDING -> bật poll đồng bộ mỗi 3 giây
        if (txn.viet_qr) {
          this.startPayosSyncPolling(txn.id, txn.booking_id, txn.booking_code);
        }
      });
  }

  protected checkPayosSyncNow(): void {
    const txn = this.transaction();
    if (!txn) return;
    this.checkoutService
      .syncPayosPayment(txn.id)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data?.paid) {
          this.clearTimers();
          this.router.navigate(['/booking/confirmation'], {
            queryParams: { bookingId: txn.booking_id, code: txn.booking_code },
          });
        }
      });
  }

  private startPayosSyncPolling(paymentId: number, bookingId: number, bookingCode: string): void {
    this.clearSyncTimer();
    this.syncTimer = setInterval(() => {
      this.checkoutService
        .syncPayosPayment(paymentId)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.data?.paid) {
            this.clearTimers();
            this.router.navigate(['/booking/confirmation'], {
              queryParams: { bookingId, code: bookingCode },
            });
          }
        });
    }, 3000);
  }

  protected copyText(label: string, value: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    this.copiedField.set(label);
    setTimeout(() => {
      if (this.copiedField() === label) {
        this.copiedField.set(null);
      }
    }, 2000);
  }

  protected formatVnd(amount: number | null | undefined): string {
    return `${Math.round(amount ?? 0).toLocaleString('vi-VN')}đ`;
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private clearSyncTimer(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearCountdown();
    this.clearSyncTimer();
  }
}
