import { Airline } from '@core/models/airline.model';
import { Aircraft, SeatClass, SeatType } from '@core/models/fleet-news.model';
import { Airport } from '@core/models/location.model';

export type FlightOperationStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'BOARDING'
  | 'DELAYED'
  | 'DEPARTED'
  | 'ARRIVED'
  | 'CANCELLED';

export type FlightSalesStatus = 'OPEN' | 'CLOSED';

export type FlightSeatStatus = 'AVAILABLE' | 'HOLD' | 'HELD' | 'BOOKED' | 'BLOCKED';

/** Chuyến bay — khớp `FlightResponse` (BE `/api/admin/flights`). */
export interface FlightRecord {
  id: number;
  flight_number: string;
  airline: Airline;
  aircraft: Aircraft;
  departure_airport: Airport;
  arrival_airport: Airport;
  scheduled_departure: string;
  scheduled_arrival: string;
  duration_minutes: number;
  operation_status: FlightOperationStatus;
  sales_status: FlightSalesStatus;
  parent_flight_id: number | null;
  parent_flight_number: string | null;
  created_at: string;
  updated_at: string;
}

/** Hành khách trên chuyến bay (hiển thị ở màn Staff `flight-detail`). */
export interface FlightPassengerItem {
  booking_code: string;
  pnr_code: string | null;
  full_name: string;
  passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
  seat_code: string | null;
  fare_class_name: string;
  booking_status: 'CONFIRMED' | 'PENDING_PAYMENT' | 'CANCELLED';
  checked_in: boolean;
}

/** Chi tiết chuyến bay — khớp `FlightDetailResponse` (kèm danh sách khách cho Staff). */
export interface FlightDetailRecord extends FlightRecord {
  total_seats: number;
  available_seats: number;
  fares: FlightFare[];
  passengers?: FlightPassengerItem[];
}

/** Payload POST/PUT `/api/admin/flights`. */
export interface FlightPayload {
  flight_number: string;
  airline_id: number;
  aircraft_id: number;
  departure_airport_id: number;
  arrival_airport_id: number;
  scheduled_departure: string;
  scheduled_arrival: string;
  operation_status: FlightOperationStatus;
  sales_status: FlightSalesStatus;
  parent_flight_id?: number | null;
}

/** Giá vé theo chuyến — khớp `FlightFareResponse` (BE `/api/admin/flight-fares`). */
export interface FlightFare {
  id: number;
  flight_id: number;
  flight_number: string;
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
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
}

/** Payload POST/PUT `/api/admin/flight-fares`. */
export interface FlightFarePayload {
  flight_id: number;
  fare_class_id: number;
  base_fare: number;
  tax_fee: number;
  currency?: string;
  effective_from?: string | null;
  effective_to?: string | null;
}

/** Một ghế trong tồn ghế chuyến bay — khớp `FlightSeatEntry`. */
export interface FlightSeatEntry {
  id: number;
  aircraft_seat_id: number;
  seat_code: string;
  seat_row: number;
  seat_column: string;
  status: FlightSeatStatus;
  seat_surcharge: number;
  seat_type: SeatType;
}

/** Sơ đồ tồn ghế chuyến bay — khớp `FlightSeatMapResponse`. */
export interface FlightSeatMap {
  flight_id: number;
  flight_number: string;
  aircraft_id: number;
  aircraft_code: string;
  model: string;
  seat_capacity: number;
  aisle_after: string | null;
  total_seats: number;
  available_seats: number;
  held_seats: number;
  booked_seats: number;
  blocked_seats: number;
  seats: FlightSeatEntry[];
}

export interface SeatInventoryOverrideItem {
  flight_seat_id?: number;
  aircraft_seat_id?: number;
  seat_code?: string;
  status?: 'AVAILABLE' | 'BLOCKED';
  seat_surcharge?: number;
}

export interface SeatInventoryRequestPayload {
  seats: SeatInventoryOverrideItem[];
}
