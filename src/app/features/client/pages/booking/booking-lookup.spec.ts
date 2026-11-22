import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookingDetail } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { BookingLookup } from './booking-lookup';

const SAMPLE_BOOKING: BookingDetail = {
  id: 1049,
  booking_code: 'VN9988AA',
  user_id: 1,
  customer_name: 'Nguyễn Văn An',
  customer_email: 'an@vinafly.vn',
  customer_phone: '0901234567',
  trip_type: 'ONE_WAY',
  status: 'CONFIRMED',
  fare_amount: 1500000,
  promotion_discount_amount: 0,
  voucher_discount_amount: 0,
  seat_surcharge_amount: 80000,
  baggage_amount: 0,
  total_amount: 1580000,
  currency: 'VND',
  payment_expires_at: '2026-11-23T10:00:00+07:00',
  cancelled_at: null,
  cancel_reason: null,
  created_at: '2026-11-22T09:00:00+07:00',
  updated_at: '2026-11-22T09:05:00+07:00',
  applied_voucher: null,
  agency_contact: null,
  segments: [
    {
      id: 1,
      segment_order: 1,
      flight_id: 10,
      flight_number: 'VN-215',
      airline_code: 'VN',
      airline_name: 'Vietnam Airlines',
      aircraft_code: 'A321',
      aircraft_model: 'Airbus A321',
      departure_airport_code: 'HAN',
      departure_airport_name: 'Nội Bài',
      departure_city_name: 'Hà Nội',
      arrival_airport_code: 'SGN',
      arrival_airport_name: 'Tân Sơn Nhất',
      arrival_city_name: 'TP. Hồ Chí Minh',
      scheduled_departure: '2026-11-25T08:00:00+07:00',
      scheduled_arrival: '2026-11-25T10:10:00+07:00',
      fare_class_id: 1,
      fare_class_code: 'VN_ECO',
      fare_class_name: 'Phổ thông',
      seat_class: 'ECONOMY',
      fare_amount_at_booking: 1500000,
      promotion_id: null,
      promotion_code: null,
      promotion_name: null,
      promotion_discount_amount: 0,
      currency: 'VND',
      fare_rule: null,
    },
  ],
  passengers: [
    {
      id: 50,
      full_name: 'Nguyễn Văn An',
      gender: 'MALE',
      birth_date: '1995-05-05',
      passenger_type: 'ADULT',
      passport_number: null,
      phone: '0901234567',
      email: 'an@vinafly.vn',
    },
  ],
  seat_holds: [
    {
      id: 1,
      booking_id: 1049,
      flight_seat_id: 99,
      seat_code: '3A',
      seat_type_name: 'Phổ thông',
      seat_class: 'ECONOMY',
      passenger_id: 50,
      passenger_name: 'Nguyễn Văn An',
      surcharge_at_booking: 80000,
      status: 'CONFIRMED',
      hold_expires_at: '2026-11-23T10:00:00+07:00',
    },
  ],
  baggages: [],
};

describe('BookingLookup', () => {
  let fixture: ComponentFixture<BookingLookup>;
  let lookupMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    lookupMock = vi.fn(() => of({ code: 1000, message: 'OK', data: SAMPLE_BOOKING }));

    await TestBed.configureTestingModule({
      imports: [BookingLookup],
      providers: [
        provideRouter([]),
        {
          provide: BookingFlowService,
          useValue: { lookupPublicBooking: lookupMock },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingLookup);
    fixture.detectChanges();
  });

  it('tra cứu thành công và hiển thị hành trình chỉ đọc', () => {
    const comp = fixture.componentInstance as unknown as {
      bookingCode: string;
      email: string;
      submitLookup: () => void;
    };
    comp.bookingCode = 'VN9988AA';
    comp.email = 'an@vinafly.vn';
    comp.submitLookup();
    fixture.detectChanges();

    expect(lookupMock).toHaveBeenCalledWith('VN9988AA', 'an@vinafly.vn');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('VN9988AA');
    expect(text).toContain('Nguyễn Văn An');
    expect(text).toContain('Ghế 3A');
  });

  it('hiển thị thông báo lỗi khi API tra cứu thất bại', () => {
    lookupMock.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Không tìm thấy đơn đặt chỗ' } })),
    );
    const comp = fixture.componentInstance as unknown as {
      bookingCode: string;
      email: string;
      submitLookup: () => void;
    };
    comp.bookingCode = 'WRONG';
    comp.email = 'x@vinafly.vn';
    comp.submitLookup();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Không tìm thấy đơn đặt chỗ');
  });
});
