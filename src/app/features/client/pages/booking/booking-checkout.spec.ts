import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { buildMockBookingDetail, buildMockETickets } from '@core/mock/data/checkout-dashboard.mock';
import { CheckoutService } from '@core/services/checkout.service';
import { UserVoucherService } from '@core/services/catalog.service';
import { BookingReview } from '@features/client/pages/booking/booking-review';
import { BookingPayment } from '@features/client/pages/booking/booking-payment';
import { BookingConfirmation } from '@features/client/pages/booking/booking-confirmation';

describe('Luồng Checkout — Review, Payment & Confirmation (Cụm B6.1)', () => {
  const mockBooking = buildMockBookingDetail();
  const mockTickets = buildMockETickets(mockBooking);

  const checkoutServiceMock = {
    getBookingDetail: vi.fn(() => of({ code: 1000, message: 'OK', data: mockBooking })),
    applyVoucher: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          ...mockBooking,
          voucher_discount_amount: 150000,
          total_amount: mockBooking.total_amount - 150000,
          applied_voucher: {
            user_voucher_id: 1,
            voucher_id: 1,
            voucher_code: 'HE2026',
            voucher_name: 'Ưu đãi hè',
            discount_amount: 150000,
            status: 'RESERVED',
          },
        },
      }),
    ),
    removeVoucher: vi.fn(() => of({ code: 1000, message: 'OK', data: mockBooking })),
    createPayment: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          id: 500,
          booking_id: mockBooking.id,
          booking_code: mockBooking.booking_code,
          booking_status: 'PENDING_PAYMENT',
          amount: mockBooking.total_amount,
          currency: 'VND',
          payment_method: 'BANK_TRANSFER',
          gateway_name: 'PAYOS',
          gateway_transaction_id: null,
          status: 'PENDING',
          retry_count: 0,
          payment_url: null,
          viet_qr: {
            bank_name: 'Vietcombank',
            account_number: '1029384756',
            account_holder: 'VINAFLY',
            amount: mockBooking.total_amount,
            transfer_content: 'VINAFLY VF882194',
            qr_image_url: 'https://img.vietqr.io/image/demo.png',
            qr_code_raw: null,
            checkout_url: null,
          },
          created_at: new Date().toISOString(),
          paid_at: null,
        },
      }),
    ),
    syncPayosPayment: vi.fn(() => of({ code: 1000, message: 'OK', data: { paid: false } })),
    getETickets: vi.fn(() => of({ code: 1000, message: 'OK', data: mockTickets })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [BookingReview, BookingPayment, BookingConfirmation],
      providers: [
        provideRouter([]),
        { provide: CheckoutService, useValue: checkoutServiceMock },
        {
          provide: UserVoucherService,
          useValue: {
            myVouchers: vi.fn(() =>
              of({
                code: 1000,
                message: 'OK',
                data: { items: [], pagination: { page: 1, size: 10, total_items: 0, total_pages: 0 } },
              }),
            ),
          },
        },
      ],
    }).compileComponents();
  });

  it('BookingReview hiển thị mã đặt chỗ, hành trình và tổng tiền chuẩn', async () => {
    const fixture = TestBed.createComponent(BookingReview);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('VF882194');
    expect(el.textContent).toContain('VN 214');
    expect(el.querySelector('[data-testid="review-total"]')?.textContent).toContain('2.590.000đ');
  });

  it('BookingPayment hiển thị đồng hồ đếm ngược 15:00 và khung VietQR khi chọn payOS', async () => {
    const fixture = TestBed.createComponent(BookingPayment);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const clock = el.querySelector('[data-testid="payment-countdown"]')?.textContent?.trim();
    expect(clock).toMatch(/^\d{2}:\d{2}$/);

    const payosBtn = el.querySelector('[data-testid="method-payos"]') as HTMLButtonElement;
    payosBtn.click();
    fixture.detectChanges();

    const payBtn = el.querySelector('[data-testid="btn-pay-now"]') as HTMLButtonElement;
    payBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="vietqr-box"]')).toBeTruthy();
    expect(el.textContent).toContain('VINAFLY VF882194');
  });

  it('BookingConfirmation hiển thị mã PNR và đầy đủ thẻ vé điện tử', async () => {
    const fixture = TestBed.createComponent(BookingConfirmation);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="confirm-pnr"]')?.textContent?.trim()).toBe('VF882194');
    const cards = el.querySelectorAll('[data-testid="eticket-card"]');
    expect(cards.length).toBe(2);
    expect(el.textContent).toContain('738-2491820415');
  });
});
