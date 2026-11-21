import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { BookingDetail, ETicketItem } from '@core/models/booking.model';
import { CheckoutService } from '@core/services/checkout.service';

/**
 * Màn 3/3 Cụm B6 — Xác nhận đặt vé thành công, Mã PNR & Vé điện tử (`/booking/confirmation` & `/payment-result`).
 *
 * Bám prototype `customer.html`:
 * - Hiển thị trạng thái thanh toán thành công (hoặc thất bại khi VNPay/payOS redirect `status=failed`),
 *   mã đặt chỗ PNR nổi bật, nút In vé (`window.print()`).
 * - Liệt kê từng thẻ Vé điện tử (E-Ticket) theo từng hành khách & chặng bay (số vé chuẩn IATA,
 *   số ghế, hạng vé, giờ bay).
 */
@Component({
  selector: 'app-booking-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  templateUrl: './booking-confirmation.html',
  styleUrl: './booking-confirmation.css',
})
export class BookingConfirmation implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutService = inject(CheckoutService);

  protected readonly bookingId = signal<number>(1001);
  protected readonly paymentStatus = signal<'success' | 'failed'>('success');
  protected readonly gatewayCode = signal<string | null>(null);
  protected readonly booking = signal<BookingDetail | null>(null);
  protected readonly tickets = signal<ETicketItem[]>([]);
  protected readonly loading = signal<boolean>(true);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const idParam = Number(q.get('bookingId') ?? this.route.snapshot.paramMap.get('id') ?? 1001);
    this.bookingId.set(Number.isFinite(idParam) && idParam > 0 ? idParam : 1001);

    const statusParam = q.get('status');
    if (statusParam === 'failed') {
      this.paymentStatus.set('failed');
      this.gatewayCode.set(q.get('code'));
    }

    this.loadConfirmation();
  }

  private loadConfirmation(): void {
    this.loading.set(true);
    this.checkoutService
      .getBookingDetail(this.bookingId())
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.booking.set(res.data);
        }
        this.loading.set(false);
      });

    this.checkoutService
      .getETickets(this.bookingId())
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.tickets.set(res.data);
        }
      });
  }

  protected printTickets(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  protected formatVnd(amount: number | null | undefined): string {
    return `${Math.round(amount ?? 0).toLocaleString('vi-VN')}đ`;
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

  protected passengerTypeLabel(type: string): string {
    if (type === 'ADULT') return 'Người lớn';
    if (type === 'CHILD') return 'Trẻ em';
    return 'Em bé';
  }
}
