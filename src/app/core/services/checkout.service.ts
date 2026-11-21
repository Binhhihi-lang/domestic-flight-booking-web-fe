import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response.model';
import {
  BookingDetail,
  ETicketItem,
  PaymentCreateRequest,
  PaymentTransaction,
} from '@core/models/booking.model';

/**
 * Dịch vụ Đặt chỗ, Thanh toán (VNPay / payOS / VietQR) và Vé điện tử (E-Ticket).
 * Khớp API v0.4 mục 3 và Backend `BookingController`, `PaymentController`, `ETicketController`.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getBookingDetail(bookingId: number): Observable<ApiResponse<BookingDetail>> {
    return this.http.get<ApiResponse<BookingDetail>>(`${this.baseUrl}/bookings/${bookingId}`);
  }

  applyVoucher(bookingId: number, userVoucherId: number): Observable<ApiResponse<BookingDetail>> {
    return this.http.post<ApiResponse<BookingDetail>>(
      `${this.baseUrl}/bookings/${bookingId}/voucher`,
      { user_voucher_id: userVoucherId },
    );
  }

  removeVoucher(bookingId: number): Observable<ApiResponse<BookingDetail>> {
    return this.http.delete<ApiResponse<BookingDetail>>(
      `${this.baseUrl}/bookings/${bookingId}/voucher`,
    );
  }

  createPayment(
    bookingId: number,
    payload: PaymentCreateRequest,
  ): Observable<ApiResponse<PaymentTransaction>> {
    return this.http.post<ApiResponse<PaymentTransaction>>(
      `${this.baseUrl}/bookings/${bookingId}/payments`,
      payload,
    );
  }

  getPayment(paymentId: number): Observable<ApiResponse<PaymentTransaction>> {
    return this.http.get<ApiResponse<PaymentTransaction>>(`${this.baseUrl}/payments/${paymentId}`);
  }

  syncPayosPayment(paymentId: number): Observable<ApiResponse<{ paid: boolean }>> {
    return this.http.post<ApiResponse<{ paid: boolean }>>(
      `${this.baseUrl}/payments/${paymentId}/payos/sync`,
      {},
    );
  }

  getETickets(bookingId: number): Observable<ApiResponse<ETicketItem[]>> {
    return this.http.get<ApiResponse<ETicketItem[]>>(
      `${this.baseUrl}/bookings/${bookingId}/e-tickets`,
    );
  }
}
