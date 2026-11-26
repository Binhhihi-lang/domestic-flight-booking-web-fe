import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { CheckoutService } from '@core/services/checkout.service';
import { VerifyTicketPage } from './verify-ticket';

describe('VerifyTicketPage (Xác thực vé điện tử qua QR)', () => {
  it('tự động xác thực khi mở từ link QR có ?code=... và hiển thị Vé điện tử hợp lệ', () => {
    const checkoutMock = {
      verifyPublicETicket: vi.fn().mockReturnValue(
        of({
          code: 1000,
          message: 'Thành công',
          data: {
            ticket_code: '738-4521001',
            pnr_code: 'X7K2MP',
            status: 'ISSUED',
            issued_at: '2026-11-22T10:00:00',
            airline_code: 'VN',
            airline_name: 'Vietnam Airlines',
            flight_number: 'VN210',
            departure_airport_code: 'HAN',
            departure_city_name: 'Hà Nội',
            arrival_airport_code: 'SGN',
            arrival_city_name: 'TP. Hồ Chí Minh',
            scheduled_departure: '2026-12-01T08:00:00',
            scheduled_arrival: '2026-12-01T10:10:00',
            fare_class_name: 'Phổ thông linh hoạt',
            seat_class: 'ECONOMY',
            passenger_name: 'NGUYEN VAN AN',
            passenger_type: 'ADULT',
            seat_code: '12A',
          },
        }),
      ),
    };

    TestBed.configureTestingModule({
      imports: [VerifyTicketPage],
      providers: [
        provideRouter([]),
        { provide: CheckoutService, useValue: checkoutMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ code: '738-4521001' }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(VerifyTicketPage);
    fixture.detectChanges();

    expect(checkoutMock.verifyPublicETicket).toHaveBeenCalledWith('738-4521001');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Vé điện tử hợp lệ');
    expect(text).toContain('738-4521001');
    expect(text).toContain('NGUYEN VAN AN');
    expect(text).toContain('12A');
  });

  it('hiển thị trạng thái lỗi khi mã vé không tồn tại', () => {
    const checkoutMock = {
      verifyPublicETicket: vi
        .fn()
        .mockReturnValue(throwError(() => ({ error: { message: 'Không tìm thấy vé điện tử' } }))),
    };

    TestBed.configureTestingModule({
      imports: [VerifyTicketPage],
      providers: [
        provideRouter([]),
        { provide: CheckoutService, useValue: checkoutMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ code: '999-0000000' }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(VerifyTicketPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Không tìm thấy vé điện tử');
  });
});
