/**
 * Models cho luồng Đặt chỗ, Thanh toán (VNPay / payOS / VietQR) và Vé điện tử (E-Ticket).
 * Khớp 100% với Backend DTOs (snake_case qua Jackson SNAKE_CASE).
 */

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export type TripType = 'ONE_WAY' | 'ROUND_TRIP';
export type PaymentMethod = 'VNPAY' | 'BANK_TRANSFER' | 'VIETQR' | 'PAYOS';

export interface FareRuleSnapshot {
  id: number;
  version: number;
  is_refundable: boolean;
  refund_min_hours_before_departure: number | null;
  refund_percent: number;
  description: string | null;
}

export interface BookingSegmentDetail {
  id: number;
  segment_order: number;
  flight_id: number;
  flight_number: string;
  airline_code: string;
  airline_name: string;
  aircraft_code: string;
  aircraft_model: string;
  departure_airport_code: string;
  departure_airport_name: string;
  departure_city_name: string;
  arrival_airport_code: string;
  arrival_airport_name: string;
  arrival_city_name: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  fare_class_id: number;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: string;
  fare_amount_at_booking: number;
  promotion_id: number | null;
  promotion_code: string | null;
  promotion_name: string | null;
  promotion_discount_amount: number;
  currency: string;
  fare_rule: FareRuleSnapshot | null;
}

export interface BookingPassengerDetail {
  id: number;
  full_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  birth_date: string;
  passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
  passport_number: string | null;
  phone: string | null;
  email: string | null;
}

export interface BookingSeatHoldDetail {
  id: number;
  booking_id: number;
  flight_seat_id: number;
  seat_code: string;
  seat_type_name: string;
  seat_class: string;
  passenger_id: number;
  passenger_name: string;
  surcharge_at_booking: number;
  status: string;
  hold_expires_at: string;
}

export interface BookingBaggageDetail {
  id: number;
  passenger_id: number;
  passenger_name: string;
  baggage_option_id: number;
  baggage_name: string;
  weight_kg: number;
  quantity: number;
  unit_price_at_booking: number;
  total_price: number;
  currency: string;
}

export interface AppliedVoucherInfo {
  user_voucher_id: number;
  voucher_id: number;
  voucher_code: string;
  voucher_name: string;
  discount_amount: number;
  status: string;
}

export interface AgencyContactInfo {
  agency_name: string;
  hotline: string;
  support_email: string;
  note: string;
}

export interface BookingDetail {
  id: number;
  booking_code: string;
  order_code?: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  trip_type: TripType;
  status: BookingStatus;
  fare_amount: number;
  promotion_discount_amount: number;
  voucher_discount_amount: number;
  seat_surcharge_amount: number;
  baggage_amount: number;
  total_amount: number;
  currency: string;
  payment_expires_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  applied_voucher: AppliedVoucherInfo | null;
  agency_contact: AgencyContactInfo | null;
  segments: BookingSegmentDetail[];
  passengers: BookingPassengerDetail[];
  seat_holds: BookingSeatHoldDetail[];
  baggages: BookingBaggageDetail[];
}

export interface PaymentCreateRequest {
  payment_method: PaymentMethod;
  gateway_name?: string;
  simulate_result?: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export interface VietQrInfo {
  bank_name: string;
  account_number: string;
  account_holder: string;
  amount: number;
  transfer_content: string;
  qr_image_url: string | null;
  qr_code_raw: string | null;
  checkout_url: string | null;
}

export interface PaymentTransaction {
  id: number;
  booking_id: number;
  booking_code: string;
  booking_status: BookingStatus;
  amount: number;
  currency: string;
  payment_method: string;
  gateway_name: string;
  gateway_transaction_id: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  retry_count: number;
  payment_url: string | null;
  viet_qr: VietQrInfo | null;
  created_at: string;
  paid_at: string | null;
}

export interface ETicketItem {
  id: number;
  booking_id: number;
  pnr_code: string;
  ticket_code: string;
  status: 'ISSUED' | 'CANCELLED';
  issued_at: string;
  booking_segment_id: number;
  segment_order: number;
  flight_id: number;
  flight_number: string;
  airline_code: string;
  airline_name: string;
  departure_airport_code: string;
  departure_airport_name: string;
  departure_city_name: string;
  arrival_airport_code: string;
  arrival_airport_name: string;
  arrival_city_name: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: string;
  passenger_id: number;
  passenger_name: string;
  passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
  gender: string;
  birth_date: string;
  flight_seat_id: number | null;
  seat_code: string | null;
}

/** Tóm tắt một chặng trong danh sách đơn đặt chỗ (`BookingSummaryResponse`). */
export interface BookingSegmentSummary {
  segment_id: number;
  segment_order: number;
  flight_id: number;
  flight_number: string;
  airline_code: string;
  airline_name: string;
  departure_airport_code: string;
  departure_city_name: string;
  arrival_airport_code: string;
  arrival_city_name: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: string;
}

/** Tóm tắt đơn đặt chỗ trả về từ `GET /api/bookings` và `GET /api/admin/bookings`. */
export interface BookingSummary {
  id: number;
  booking_code: string;
  order_code?: string;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  trip_type: TripType;
  status: BookingStatus;
  passenger_count?: number;
  passengers?: BookingPassengerDetail[];
  fare_amount: number;
  promotion_discount_amount: number;
  voucher_discount_amount: number;
  seat_surcharge_amount: number;
  baggage_amount: number;
  total_amount: number;
  currency: string;
  payment_expires_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  segments: BookingSegmentSummary[];
}

export interface BookingCreatePayload {
  trip_type: TripType;
  segments: {
    flight_id: number;
    fare_class_id: number;
    segment_order: number;
  }[];
  passengers: {
    full_name: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    birth_date: string;
    passenger_type: 'ADULT' | 'CHILD' | 'INFANT';
    passport_number?: string | null;
    phone?: string | null;
    email?: string | null;
  }[];
  user_voucher_id?: number | null;
}
