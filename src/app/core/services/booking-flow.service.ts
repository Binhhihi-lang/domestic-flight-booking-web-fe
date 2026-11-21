import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { BookingDetail, BookingStatus } from '@core/models/booking.model';
import { SeatClass } from '@core/models/fleet-news.model';

/** Một lựa chọn hạng vé khi so sánh 3 hạng vé trên kết quả tìm chuyến. */
export interface FlightFareOption {
  fare_class_id: number;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: SeatClass;
  adult_price: number;
  child_price: number;
  infant_price: number;
  cabin_baggage: string;
  checked_baggage: string;
  refundable: boolean;
  refund_summary: string;
  change_summary: string;
}

/** Một chuyến bay trả về từ `/api/public/flights/search`. */
export interface PublicFlightSearchItem {
  id: number;
  flight_number: string;
  airline_id: number;
  airline_code: string;
  airline_name: string;
  aircraft_model: string;
  departure_airport_code: string;
  departure_airport_name: string;
  arrival_airport_code: string;
  arrival_airport_name: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  duration_minutes: number;
  available_seats: number;
  min_price: number;
  fares: FlightFareOption[];
}

export interface DraftPassenger {
  id: number;
  passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
  full_name: string;
  gender: 'MALE' | 'FEMALE';
  birth_date: string;
  passport_number: string;
  seat_code: string | null;
  seat_surcharge: number;
  baggage_option_id: number | null;
  baggage_name: string | null;
  baggage_price: number;
}

/**
 * Dịch vụ quản lý luồng đặt vé (Bước 1–3) và tra cứu/hủy đặt chỗ (Khách & Admin/Staff).
 */
@Injectable({ providedIn: 'root' })
export class BookingFlowService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /** Trạng thái giỏ đặt vé tạm thời giữa các bước results → seats → passengers → review. */
  readonly selectedFlight = signal<PublicFlightSearchItem | null>(null);
  readonly selectedFare = signal<FlightFareOption | null>(null);
  readonly draftPassengers = signal<DraftPassenger[]>([
    {
      id: 1,
      passenger_type: 'ADULT',
      full_name: 'Nguyễn Minh Anh',
      gender: 'FEMALE',
      birth_date: '1995-04-12',
      passport_number: '001195012345',
      seat_code: null,
      seat_surcharge: 0,
      baggage_option_id: null,
      baggage_name: null,
      baggage_price: 0,
    },
    {
      id: 2,
      passenger_type: 'CHILD',
      full_name: 'Nguyễn Bảo An',
      gender: 'MALE',
      birth_date: '2019-08-20',
      passport_number: '',
      seat_code: null,
      seat_surcharge: 0,
      baggage_option_id: null,
      baggage_name: null,
      baggage_price: 0,
    },
  ]);

  selectFlightAndFare(flight: PublicFlightSearchItem, fare: FlightFareOption): void {
    this.selectedFlight.set(flight);
    this.selectedFare.set(fare);
    // Reset ghế cũ khi đổi chuyến hoặc đổi khoang dịch vụ
    this.draftPassengers.update((list) =>
      list.map((p) => ({ ...p, seat_code: null, seat_surcharge: 0 })),
    );
  }

  assignSeat(passengerId: number, seatCode: string | null, surcharge: number): void {
    this.draftPassengers.update((list) =>
      list.map((p) =>
        p.id === passengerId
          ? { ...p, seat_code: seatCode, seat_surcharge: seatCode ? surcharge : 0 }
          : p,
      ),
    );
  }

  assignBaggage(
    passengerId: number,
    optionId: number | null,
    name: string | null,
    price: number,
  ): void {
    this.draftPassengers.update((list) =>
      list.map((p) =>
        p.id === passengerId
          ? {
              ...p,
              baggage_option_id: optionId,
              baggage_name: name,
              baggage_price: optionId ? price : 0,
            }
          : p,
      ),
    );
  }

  searchPublicFlights(query: {
    departure_airport_code?: string;
    arrival_airport_code?: string;
    departure_date?: string;
    seat_class?: string;
  } = {}): Observable<ApiResponse<PublicFlightSearchItem[]>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v) params = params.set(k, v);
    }
    return this.http.get<ApiResponse<PublicFlightSearchItem[]>>(
      `${this.baseUrl}/public/flights/search`,
      { params },
    );
  }

  listMyBookings(status?: BookingStatus | ''): Observable<ApiResponse<PageData<BookingDetail>>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<PageData<BookingDetail>>>(`${this.baseUrl}/bookings`, {
      params,
    });
  }

  getMyBooking(id: number): Observable<ApiResponse<BookingDetail>> {
    return this.http.get<ApiResponse<BookingDetail>>(`${this.baseUrl}/bookings/${id}`);
  }

  cancelMyBooking(id: number, reason: string): Observable<ApiResponse<BookingDetail>> {
    return this.http.post<ApiResponse<BookingDetail>>(`${this.baseUrl}/bookings/${id}/cancel`, {
      reason,
    });
  }

  listAdminBookings(query: {
    keyword?: string;
    status?: string;
    page?: number;
    size?: number;
  } = {}): Observable<ApiResponse<PageData<BookingDetail>>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ApiResponse<PageData<BookingDetail>>>(`${this.baseUrl}/admin/bookings`, {
      params,
    });
  }

  getAdminBooking(id: number): Observable<ApiResponse<BookingDetail>> {
    return this.http.get<ApiResponse<BookingDetail>>(`${this.baseUrl}/admin/bookings/${id}`);
  }

  cancelAdminBooking(id: number, reason: string): Observable<ApiResponse<BookingDetail>> {
    return this.http.post<ApiResponse<BookingDetail>>(
      `${this.baseUrl}/admin/bookings/${id}/cancel`,
      { reason },
    );
  }
}
