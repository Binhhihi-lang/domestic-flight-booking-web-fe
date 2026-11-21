import { ActiveStatus } from '@core/models/airline.model';
import { SeatClass } from '@core/models/fleet-news.model';

/** Hạng vé — API Phase 2 (`/api/admin/fare-classes`). */
export interface FareClass {
  id: number;
  airline_id: number;
  airline_code: string;
  airline_name: string;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: SeatClass;
  status: ActiveStatus;
}

export interface FareClassPayload {
  airline_id: number;
  fare_class_code: string;
  fare_class_name: string;
  seat_class: SeatClass;
  status?: ActiveStatus;
}

/** Quy định hoàn/đổi vé — API Phase 2 (`/api/admin/fare-rules`). */
export interface FareRule {
  id: number;
  fare_class_id: number;
  fare_class_code: string;
  fare_class_name: string;
  airline_code: string;
  version: number;
  is_refundable: boolean;
  refund_min_hours_before_departure: number;
  refund_percent: number;
  description: string | null;
  effective_from: string | null;
  status: ActiveStatus;
}

export interface FareRulePayload {
  fare_class_id: number;
  is_refundable: boolean;
  refund_min_hours_before_departure: number;
  refund_percent: number;
  description?: string | null;
  effective_from?: string | null;
  status?: ActiveStatus;
}

/** Gói hành lý ký gửi — API Phase 2 (`/api/admin/baggage-options`). */
export interface BaggageOption {
  id: number;
  airline_id: number;
  airline_code: string;
  airline_name: string;
  name: string;
  weight_kg: number;
  price: number;
  status: ActiveStatus;
}

export interface BaggageOptionPayload {
  airline_id: number;
  name: string;
  weight_kg: number;
  price: number;
  status?: ActiveStatus;
}
