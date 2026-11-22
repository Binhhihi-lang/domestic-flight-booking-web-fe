import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import {
  BookingCreatePayload,
  BookingDetail,
  BookingSeatHoldDetail,
  BookingStatus,
  BookingSummary,
  TripType,
} from '@core/models/booking.model';
import { BaggageOption } from '@core/models/fare-baggage.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { FlightSeatMap } from '@core/models/flight.model';

/** Một lựa chọn hạng vé — khớp 100% `PricedFareResponse` của Backend. */
export interface FlightFareOption {
  flight_fare_id: number;
  fare_class_id: number;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: SeatClass;
  base_fare: number;
  tax_fee: number;
  adult_price: number;
  child_price: number;
  infant_price: number;
  currency: string;
  seats_available: number;
  is_refundable: boolean;
  refund_min_hours_before_departure: number | null;
  refund_percent: number;
  refund_description: string | null;
}

/** Một chuyến bay trả về từ `GET /api/public/flights/search` — khớp 100% `FlightSearchResult`. */
export interface PublicFlightSearchItem {
  id: number;
  flight_id: number;
  flight_number: string;
  airline: {
    id: number;
    airline_code: string;
    airline_name: string;
    logo_url: string | null;
  };
  aircraft: {
    id: number;
    aircraft_code: string;
    model: string;
    seat_capacity: number;
    aisle_after: string | null;
  };
  departure_airport: {
    id: number;
    airport_code: string;
    airport_name: string;
    city_code: string | null;
    city_name: string | null;
  };
  arrival_airport: {
    id: number;
    airport_code: string;
    airport_name: string;
    city_code: string | null;
    city_name: string | null;
  };
  scheduled_departure: string;
  scheduled_arrival: string;
  duration_minutes: number;
  operation_status: string;
  sales_status: string;
  lowest_adult_price: number;
  lowest_fare_class_code: string | null;
  lowest_fare_class_name: string | null;
  fares: FlightFareOption[];
}

export interface DraftPassenger {
  id: number;
  passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
  full_name: string;
  gender: 'MALE' | 'FEMALE';
  birth_date: string;
  passport_number: string;
  flight_seat_id: number | null;
  seat_code: string | null;
  seat_surcharge: number;
  return_flight_seat_id: number | null;
  return_seat_code: string | null;
  return_seat_surcharge: number;
  baggage_option_id: number | null;
  baggage_name: string | null;
  baggage_price: number;
}

/**
 * Dịch vụ quản lý luồng đặt vé (Bước 1–3), tra cứu công khai và quản lý đặt chỗ (Khách & Admin/Staff).
 */
@Injectable({ providedIn: 'root' })
export class BookingFlowService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  /** Trạng thái giỏ đặt vé tạm thời giữa các bước results → seats → passengers → review. */
  readonly tripType = signal<TripType>('ONE_WAY');
  readonly selectedFlight = signal<PublicFlightSearchItem | null>(null);
  readonly selectedFare = signal<FlightFareOption | null>(null);
  readonly selectedReturnFlight = signal<PublicFlightSearchItem | null>(null);
  readonly selectedReturnFare = signal<FlightFareOption | null>(null);
  readonly activeBookingId = signal<number | null>(null);

  readonly draftPassengers = signal<DraftPassenger[]>([
    {
      id: 1,
      passenger_type: 'ADULT',
      full_name: 'Nguyễn Minh Anh',
      gender: 'FEMALE',
      birth_date: '1995-04-12',
      passport_number: '001195012345',
      flight_seat_id: null,
      seat_code: null,
      seat_surcharge: 0,
      return_flight_seat_id: null,
      return_seat_code: null,
      return_seat_surcharge: 0,
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
      flight_seat_id: null,
      seat_code: null,
      seat_surcharge: 0,
      return_flight_seat_id: null,
      return_seat_code: null,
      return_seat_surcharge: 0,
      baggage_option_id: null,
      baggage_name: null,
      baggage_price: 0,
    },
  ]);

  setPassengerCounts(adults: number, children: number, infants: number): void {
    const safeAdults = Math.max(1, adults);
    const safeChildren = Math.max(0, children);
    const safeInfants = Math.max(0, Math.min(infants, safeAdults));
    const list: DraftPassenger[] = [];
    let seq = 1;

    for (let i = 0; i < safeAdults; i++) {
      list.push({
        id: seq++,
        passenger_type: 'ADULT',
        full_name: i === 0 ? 'Nguyễn Minh Anh' : '',
        gender: i === 0 ? 'FEMALE' : 'MALE',
        birth_date: '1995-04-12',
        passport_number: i === 0 ? '001195012345' : '',
        flight_seat_id: null,
        seat_code: null,
        seat_surcharge: 0,
        return_flight_seat_id: null,
        return_seat_code: null,
        return_seat_surcharge: 0,
        baggage_option_id: null,
        baggage_name: null,
        baggage_price: 0,
      });
    }
    for (let i = 0; i < safeChildren; i++) {
      list.push({
        id: seq++,
        passenger_type: 'CHILD',
        full_name: i === 0 ? 'Nguyễn Bảo An' : '',
        gender: 'MALE',
        birth_date: '2019-08-20',
        passport_number: '',
        flight_seat_id: null,
        seat_code: null,
        seat_surcharge: 0,
        return_flight_seat_id: null,
        return_seat_code: null,
        return_seat_surcharge: 0,
        baggage_option_id: null,
        baggage_name: null,
        baggage_price: 0,
      });
    }
    for (let i = 0; i < safeInfants; i++) {
      list.push({
        id: seq++,
        passenger_type: 'INFANT',
        full_name: '',
        gender: 'FEMALE',
        birth_date: '2025-05-10',
        passport_number: '',
        flight_seat_id: null,
        seat_code: null,
        seat_surcharge: 0,
        return_flight_seat_id: null,
        return_seat_code: null,
        return_seat_surcharge: 0,
        baggage_option_id: null,
        baggage_name: null,
        baggage_price: 0,
      });
    }
    this.draftPassengers.set(list);
  }

  selectFlightAndFare(flight: PublicFlightSearchItem, fare: FlightFareOption): void {
    this.selectedFlight.set(flight);
    this.selectedFare.set(fare);
    this.activeBookingId.set(null);
    this.draftPassengers.update((list) =>
      list.map((p) => ({
        ...p,
        flight_seat_id: null,
        seat_code: null,
        seat_surcharge: 0,
      })),
    );
  }

  selectReturnFlightAndFare(flight: PublicFlightSearchItem | null, fare: FlightFareOption | null): void {
    this.selectedReturnFlight.set(flight);
    this.selectedReturnFare.set(fare);
    this.draftPassengers.update((list) =>
      list.map((p) => ({
        ...p,
        return_flight_seat_id: null,
        return_seat_code: null,
        return_seat_surcharge: 0,
      })),
    );
  }

  assignSeat(
    passengerId: number,
    seatCode: string | null,
    surcharge: number,
    flightSeatId: number | null = null,
    leg: 'OUTBOUND' | 'RETURN' = 'OUTBOUND',
  ): void {
    this.draftPassengers.update((list) =>
      list.map((p) => {
        if (p.id !== passengerId) return p;
        if (leg === 'RETURN') {
          return {
            ...p,
            return_flight_seat_id: seatCode ? flightSeatId : null,
            return_seat_code: seatCode,
            return_seat_surcharge: seatCode ? surcharge : 0,
          };
        }
        return {
          ...p,
          flight_seat_id: seatCode ? flightSeatId : null,
          seat_code: seatCode,
          seat_surcharge: seatCode ? surcharge : 0,
        };
      }),
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
    departure_airport_id?: number;
    arrival_airport_id?: number;
    departure_airport_code?: string;
    arrival_airport_code?: string;
    departure_date?: string;
    adults?: number;
    children?: number;
    infants?: number;
    trip_type?: TripType;
  } = {}): Observable<ApiResponse<PublicFlightSearchItem[]>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    }
    return this.http.get<ApiResponse<PublicFlightSearchItem[]>>(
      `${this.baseUrl}/public/flights/search`,
      { params },
    );
  }

  getPublicSeatMap(flightId: number): Observable<ApiResponse<FlightSeatMap>> {
    return this.http.get<ApiResponse<FlightSeatMap>>(
      `${this.baseUrl}/public/flights/${flightId}/seat-map`,
    );
  }

  listPublicBaggageOptions(airlineId?: number): Observable<ApiResponse<PageData<BaggageOption>>> {
    let params = new HttpParams().set('page', '1').set('size', '50');
    if (airlineId !== undefined && airlineId !== null) {
      params = params.set('airline_id', String(airlineId));
    }
    return this.http.get<ApiResponse<PageData<BaggageOption>>>(
      `${this.baseUrl}/public/baggage-options`,
      { params },
    );
  }

  createBooking(payload: BookingCreatePayload): Observable<ApiResponse<BookingDetail>> {
    return this.http.post<ApiResponse<BookingDetail>>(`${this.baseUrl}/bookings`, payload);
  }

  holdSeat(
    bookingId: number,
    passengerId: number,
    flightSeatId: number,
  ): Observable<ApiResponse<BookingSeatHoldDetail>> {
    return this.http.post<ApiResponse<BookingSeatHoldDetail>>(
      `${this.baseUrl}/bookings/${bookingId}/seats/hold`,
      { passenger_id: passengerId, flight_seat_id: flightSeatId },
    );
  }

  addBaggages(
    bookingId: number,
    baggages: { passenger_id: number; baggage_option_id: number; quantity: number }[],
  ): Observable<ApiResponse<BookingDetail>> {
    return this.http.post<ApiResponse<BookingDetail>>(
      `${this.baseUrl}/bookings/${bookingId}/baggages`,
      { baggages },
    );
  }

  lookupPublicBooking(bookingCode: string, email: string): Observable<ApiResponse<BookingDetail>> {
    const params = new HttpParams()
      .set('booking_code', bookingCode.trim().toUpperCase())
      .set('email', email.trim());
    return this.http.get<ApiResponse<BookingDetail>>(`${this.baseUrl}/public/bookings/lookup`, {
      params,
    });
  }

  listMyBookings(status?: BookingStatus | ''): Observable<ApiResponse<PageData<BookingSummary>>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<PageData<BookingSummary>>>(`${this.baseUrl}/bookings`, {
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
  } = {}): Observable<ApiResponse<PageData<BookingSummary>>> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<ApiResponse<PageData<BookingSummary>>>(`${this.baseUrl}/admin/bookings`, {
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
