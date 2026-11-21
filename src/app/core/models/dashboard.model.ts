/**
 * Models cho Dashboard Tổng quan / Báo cáo (ADMIN) và Dashboard Vận hành (STAFF).
 * Khớp 100% với `OverviewDashboardResponse` và `OperationalDashboardResponse` của Backend.
 */

export interface DailyRevenueItem {
  date: string;
  day_label: string;
  revenue: number;
  bookings_count: number;
}

export interface TopRouteItem {
  route: string;
  departure_airport_code: string;
  arrival_airport_code: string;
  bookings_count: number;
  revenue: number;
  load_factor_percent: number;
}

export interface RecentBookingItem {
  id: number;
  booking_code: string;
  customer_name: string;
  customer_email: string;
  trip_type: string;
  status: string;
  total_amount: number;
  currency: string;
  passenger_count: number;
  segment_count: number;
  primary_route: string;
  created_at: string;
}

export interface OverviewDashboard {
  revenue_today: number;
  revenue_month: number;
  revenue_total: number;
  bookings_today: number;
  bookings_month: number;
  bookings_total: number;
  pax_today: number;
  pax_month: number;
  flights_today: number;
  flights_delayed_today: number;
  occupancy_rate_percent: number;
  cancel_rate_percent: number;
  revenue_by_day: DailyRevenueItem[];
  top_routes: TopRouteItem[];
  recent_bookings: RecentBookingItem[];
}

export interface FlightOperationItem {
  flight_id: number;
  flight_number: string;
  airline_code: string;
  airline_name: string;
  aircraft_code: string;
  route: string;
  scheduled_departure: string;
  scheduled_arrival: string;
  operation_status: string;
  sales_status: string;
  seat_capacity: number;
  booked_seats: number;
  held_seats: number;
  available_seats: number;
}

export interface ActionRequiredItem {
  type: string;
  reference_code: string;
  title: string;
  detail: string;
  occurred_at: string;
}

export interface OperationalDashboard {
  date: string;
  flights_today: number;
  flights_scheduled: number;
  flights_boarding: number;
  flights_delayed: number;
  flights_cancelled: number;
  bookings_today: number;
  bookings_pending_payment: number;
  bookings_confirmed_today: number;
  passengers_today: number;
  today_schedule: FlightOperationItem[];
  pending_actions: ActionRequiredItem[];
}
