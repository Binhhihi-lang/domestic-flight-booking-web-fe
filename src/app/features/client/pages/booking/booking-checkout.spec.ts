import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { buildMockBookingDetail, buildMockETickets } from '@core/mock/data/checkout-dashboard.mock';
import { CheckoutService } from '@core/services/checkout.service';
import { UserVoucherService } from '@core/services/catalog.service';
import { UserVoucher } from '@core/models/user-voucher.model';
import { BookingReview } from '@features/client/pages/booking/booking-review';
import { BookingPayment } from '@features/client/pages/booking/booking-payment';
import { BookingConfirmation } from '@features/client/pages/booking/booking-confirmation';

describe('Luồng Checkout — Review, Payment & Confirmation (Cụm 5B)', () => {
  const mockBooking = buildMockBookingDetail();
  const mockTickets = buildMockETickets(mockBooking);

  const mockVouchers: UserVoucher[] = [
    {
      id: 1,
      status: 'AVAILABLE',
      source: 'CLAIMED',
      received_at: '2026-11-01T00:00:00Z',
      expires_at: '2027-12-31T23:59:59Z',
      used_at: null,
      voucher: {
        id: 10,
        voucher_code: 'HE2026',
        voucher_name: 'Ưu đãi hè 150K',
        description: null,
        discount_type: 'AMOUNT',
        discount_value: 150000,
        min_order_amount: 1000000,
        applicable_trip_type: 'ANY',
        start_date: '2026-01-01',
        end_date: '2027-12-31',
      },
    },
    {
      id: 2,
      status: 'AVAILABLE',
      source: 'CLAIMED',
      received_at: '2026-11-01T00:00:00Z',
      expires_at: '2027-12-31T23:59:59Z',
      used_at: null,
      voucher: {
        id: 11,
        voucher_code: 'VIP5TR',
        voucher_name: 'Giảm 500K đơn lớn',
        description: null,
        discount_type: 'AMOUNT',
        discount_value: 500000,
        min_order_amount: 5000000,
        applicable_trip_type: 'ANY',
        start_date: '2026-01-01',
        end_date: '2027-12-31',
      },
    },
  ];

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
            voucher_id: 10,
            voucher_code: 'HE2026',
            voucher_name: 'Ưu đãi hè 150K',
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
                data: {
                  items: mockVouchers,
                  pagination: { page: 1, size: 50, total_items: 2, total_pages: 1 },
                },
              }),
            ),
          },
        },
      ],
    }).compileComponents();
  });

  it('BookingReview hiển thị stepper 5 bước (Bước 4 active), bảng hành khách tiếng Việt, thẻ radio voucher và tổng tiền chuẩn', async () => {
    const fixture = TestBed.createComponent(BookingReview);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const steps = el.querySelectorAll('[data-testid="booking-stepper"] .stepper__item');
    expect(steps.length).toBe(5);
    expect(steps[3].classList.contains('stepper__item--active')).toBe(true);
    expect(el.textContent).toContain('1. Chọn chuyến');
    expect(el.textContent).toContain('4. Xem lại');
    expect(el.textContent).toContain('5. Thanh toán');

    expect(el.textContent).toContain('DH-1001');
    expect(el.textContent).toContain('VN 214');
    expect(el.querySelector('[data-testid="review-total"]')?.textContent).toContain('2.590.000đ');

    const paxTable = el.querySelector('[data-testid="review-pax-table"]');
    expect(paxTable).toBeTruthy();
    expect(paxTable?.textContent).toContain('Người lớn');
    expect(paxTable?.textContent).toContain('Trẻ em');
    expect(paxTable?.textContent).not.toContain('ADULT');

    expect(el.querySelector('[data-testid="voucher-option-eligible"]')).toBeTruthy();
    const disabledVoucher = el.querySelector('[data-testid="voucher-option-disabled"]');
    expect(disabledVoucher).toBeTruthy();
    expect(disabledVoucher?.textContent).toContain('Chưa đạt đơn tối thiểu');
  });

  it('BookingPayment hiển thị stepper 5 bước (Bước 5 active), đồng hồ 15:00, lưu ý PNR và khung VietQR khi chọn payOS', async () => {
    const fixture = TestBed.createComponent(BookingPayment);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const steps = el.querySelectorAll('[data-testid="booking-stepper"] .stepper__item');
    expect(steps.length).toBe(5);
    expect(steps[4].classList.contains('stepper__item--active')).toBe(true);

    const clock = el.querySelector('[data-testid="payment-countdown"]')?.textContent?.trim();
    expect(clock).toMatch(/^\d{2}:\d{2}$/);
    expect(el.querySelector('[data-testid="pnr-callout"]')).toBeTruthy();

    // Kiểm tra nút VNPay mặc định gọi createPayment ở chế độ PENDING (không ép SUCCESS)
    const payBtn = el.querySelector('[data-testid="btn-pay-now"]') as HTMLButtonElement;
    payBtn.click();
    fixture.detectChanges();
    expect(checkoutServiceMock.createPayment).toHaveBeenCalledWith(1001, {
      payment_method: 'VNPAY',
      simulate_result: 'PENDING',
    });

    // Chuyển sang payOS và tạo mã VietQR
    const payosBtn = el.querySelector('[data-testid="method-payos"]') as HTMLButtonElement;
    payosBtn.click();
    fixture.detectChanges();

    payBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="vietqr-box"]')).toBeTruthy();
    expect(el.textContent).toContain('VINAFLY VF882194');
  });

  it('BookingConfirmation hiển thị bố cục 2 cột với mã PNR, DH-1001, thẻ vé điện tử và Việc cần làm tiếp theo', async () => {
    const fixture = TestBed.createComponent(BookingConfirmation);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="confirm-pnr"]')?.textContent?.trim()).toBe('VF882194');
    expect(el.textContent).toContain('DH-1001');
    const cards = el.querySelectorAll('[data-testid="eticket-card"]');
    expect(cards.length).toBe(2);
    expect(el.textContent).toContain('738-2491820415');
    expect(el.querySelector('[data-testid="next-steps-card"]')?.textContent).toContain(
      'Việc cần làm tiếp theo',
    );
    expect(el.textContent).toContain('In vé điện tử');
    expect(el.textContent).toContain('Xem vé của tôi');
  });
});
