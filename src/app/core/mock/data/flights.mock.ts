import { AIRLINES_MOCK } from '@core/mock/data/airlines.mock';
import { AIRCRAFT_MOCK, SEAT_TYPES_MOCK } from '@core/mock/data/catalog.mock';
import { FARE_CLASSES_MOCK } from '@core/mock/data/fare-baggage.mock';
import { AIRPORTS_MOCK } from '@core/mock/data/locations.mock';
import {
  FlightFare,
  FlightPassengerItem,
  FlightRecord,
  FlightSeatEntry,
  FlightSeatMap,
  FlightSeatStatus,
} from '@core/models/flight.model';

const airlineById = (id: number) => AIRLINES_MOCK.find((a) => a.id === id) ?? AIRLINES_MOCK[0];
const aircraftById = (id: number) => AIRCRAFT_MOCK.find((a) => a.id === id) ?? AIRCRAFT_MOCK[0];
const airportById = (id: number) => AIRPORTS_MOCK.find((a) => a.id === id) ?? AIRPORTS_MOCK[0];

/** Chuyến bay mẫu nội địa (khớp `admin.html` & `staff.html`). */
export const FLIGHTS_MOCK: FlightRecord[] = [
  {
    id: 101,
    flight_number: 'VN-210',
    airline: airlineById(1),
    aircraft: aircraftById(1),
    departure_airport: airportById(1),
    arrival_airport: airportById(2),
    scheduled_departure: '2026-11-25T07:30:00',
    scheduled_arrival: '2026-11-25T09:40:00',
    duration_minutes: 130,
    operation_status: 'SCHEDULED',
    sales_status: 'OPEN',
    parent_flight_id: null,
    parent_flight_number: null,
    created_at: '2026-11-01T02:00:00Z',
    updated_at: '2026-11-20T08:00:00Z',
  },
  {
    id: 102,
    flight_number: 'VJ-156',
    airline: airlineById(2),
    aircraft: aircraftById(3),
    departure_airport: airportById(1),
    arrival_airport: airportById(2),
    scheduled_departure: '2026-11-25T10:15:00',
    scheduled_arrival: '2026-11-25T12:25:00',
    duration_minutes: 130,
    operation_status: 'BOARDING',
    sales_status: 'OPEN',
    parent_flight_id: null,
    parent_flight_number: null,
    created_at: '2026-11-01T02:30:00Z',
    updated_at: '2026-11-25T02:45:00Z',
  },
  {
    id: 103,
    flight_number: 'QH-204',
    airline: airlineById(3),
    aircraft: aircraftById(5),
    departure_airport: airportById(1),
    arrival_airport: airportById(3),
    scheduled_departure: '2026-11-25T13:00:00',
    scheduled_arrival: '2026-11-25T14:20:00',
    duration_minutes: 80,
    operation_status: 'SCHEDULED',
    sales_status: 'OPEN',
    parent_flight_id: null,
    parent_flight_number: null,
    created_at: '2026-11-02T03:00:00Z',
    updated_at: '2026-11-20T09:00:00Z',
  },
  {
    id: 104,
    flight_number: 'VJ-621',
    airline: airlineById(2),
    aircraft: aircraftById(4),
    departure_airport: airportById(2),
    arrival_airport: airportById(3),
    scheduled_departure: '2026-11-25T15:20:00',
    scheduled_arrival: '2026-11-25T16:45:00',
    duration_minutes: 85,
    operation_status: 'DELAYED',
    sales_status: 'OPEN',
    parent_flight_id: null,
    parent_flight_number: null,
    created_at: '2026-11-03T04:00:00Z',
    updated_at: '2026-11-25T06:10:00Z',
  },
  {
    id: 105,
    flight_number: 'VN-216',
    airline: airlineById(1),
    aircraft: aircraftById(2),
    departure_airport: airportById(2),
    arrival_airport: airportById(1),
    scheduled_departure: '2026-11-25T18:00:00',
    scheduled_arrival: '2026-11-25T20:10:00',
    duration_minutes: 130,
    operation_status: 'DEPARTED',
    sales_status: 'CLOSED',
    parent_flight_id: null,
    parent_flight_number: null,
    created_at: '2026-11-04T02:00:00Z',
    updated_at: '2026-11-25T11:05:00Z',
  },
  {
    id: 106,
    flight_number: 'VJ-305',
    airline: airlineById(2),
    aircraft: aircraftById(3),
    departure_airport: airportById(2),
    arrival_airport: airportById(4),
    scheduled_departure: '2026-11-26T08:45:00',
    scheduled_arrival: '2026-11-26T09:50:00',
    duration_minutes: 65,
    operation_status: 'CANCELLED',
    sales_status: 'CLOSED',
    parent_flight_id: null,
    parent_flight_number: null,
    created_at: '2026-11-05T02:00:00Z',
    updated_at: '2026-11-24T10:00:00Z',
  },
];

/** Tính giá người lớn / trẻ em (75%) / em bé (10%) làm tròn HALF_UP như BE `FlightFareService`. */
export function computeFarePrices(baseFare: number, taxFee: number): {
  adult_price: number;
  child_price: number;
  infant_price: number;
} {
  const adult = Math.max(0, Math.round(baseFare + taxFee));
  return {
    adult_price: adult,
    child_price: Math.round(adult * 0.75),
    infant_price: Math.round(adult * 0.1),
  };
}

function makeFare(
  id: number,
  flightId: number,
  fareClassId: number,
  baseFare: number,
  taxFee: number,
  effectiveFrom: string,
  effectiveTo: string | null,
): FlightFare {
  const fl = FLIGHTS_MOCK.find((f) => f.id === flightId) ?? FLIGHTS_MOCK[0];
  const fc = FARE_CLASSES_MOCK.find((c) => c.id === fareClassId) ?? FARE_CLASSES_MOCK[0];
  const prices = computeFarePrices(baseFare, taxFee);
  return {
    id,
    flight_id: fl.id,
    flight_number: fl.flight_number,
    fare_class_id: fc.id,
    fare_class_code: fc.fare_class_code,
    fare_class_name: fc.fare_class_name,
    seat_class: fc.seat_class,
    base_fare: baseFare,
    tax_fee: taxFee,
    ...prices,
    currency: 'VND',
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    created_at: '2026-11-01T02:00:00Z',
  };
}

export const FLIGHT_FARES_MOCK: FlightFare[] = [
  makeFare(1, 101, 1, 1150000, 490000, '2026-11-01T00:00:00', '2026-11-30T23:59:00'),
  makeFare(2, 101, 2, 1550000, 490000, '2026-11-01T00:00:00', '2026-11-30T23:59:00'),
  makeFare(3, 101, 3, 2150000, 490000, '2026-11-01T00:00:00', '2026-11-30T23:59:00'),
  makeFare(4, 101, 4, 3450000, 490000, '2026-11-01T00:00:00', '2026-11-30T23:59:00'),
  makeFare(5, 102, 5, 790000, 480000, '2026-11-01T00:00:00', null),
  makeFare(6, 102, 6, 1390000, 480000, '2026-11-01T00:00:00', null),
  makeFare(7, 102, 7, 2990000, 480000, '2026-11-01T00:00:00', null),
  makeFare(8, 103, 8, 980000, 485000, '2026-11-01T00:00:00', null),
];

/** Danh sách hành khách mẫu theo chuyến bay (màn Staff `flight-detail`). */
export const FLIGHT_PASSENGERS_MOCK: Record<number, FlightPassengerItem[]> = {
  101: [
    {
      booking_code: 'DH-1049',
      pnr_code: 'X7K2MP',
      full_name: 'Nguyễn Minh Anh',
      passenger_type: 'ADULT',
      seat_code: '4A',
      fare_class_name: 'Phổ thông linh hoạt',
      booking_status: 'CONFIRMED',
      checked_in: true,
    },
    {
      booking_code: 'DH-1049',
      pnr_code: 'X7K2MP',
      full_name: 'Nguyễn Bảo An',
      passenger_type: 'CHILD',
      seat_code: '4B',
      fare_class_name: 'Phổ thông linh hoạt',
      booking_status: 'CONFIRMED',
      checked_in: true,
    },
    {
      booking_code: 'DH-1052',
      pnr_code: 'K9P4TR',
      full_name: 'Trần Quốc Huy',
      passenger_type: 'ADULT',
      seat_code: '1A',
      fare_class_name: 'Thương gia linh hoạt',
      booking_status: 'CONFIRMED',
      checked_in: false,
    },
    {
      booking_code: 'DH-1055',
      pnr_code: null,
      full_name: 'Lê Thu Hà',
      passenger_type: 'ADULT',
      seat_code: '5C',
      fare_class_name: 'Phổ thông tiết kiệm',
      booking_status: 'PENDING_PAYMENT',
      checked_in: false,
    },
  ],
  102: [
    {
      booking_code: 'DH-1060',
      pnr_code: 'M2V8QW',
      full_name: 'Phạm Đức Mạnh',
      passenger_type: 'ADULT',
      seat_code: '3D',
      fare_class_name: 'Eco',
      booking_status: 'CONFIRMED',
      checked_in: true,
    },
  ],
};

/** Sinh sơ đồ tồn ghế 3-3 (6 hàng × 6 cột = 36 ghế) đại diện cho 3 khoang của một chuyến bay. */
export function buildMockFlightSeatMap(flight: FlightRecord, seedOffset = 0): FlightSeatMap {
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
  const busType = SEAT_TYPES_MOCK.find((s) => s.seat_class === 'BUSINESS') ?? SEAT_TYPES_MOCK[4];
  const premType =
    SEAT_TYPES_MOCK.find((s) => s.seat_class === 'PREMIUM_ECONOMY') ?? SEAT_TYPES_MOCK[3];
  const ecoWin = SEAT_TYPES_MOCK.find((s) => s.seat_type_code === 'ECO_WIN') ?? SEAT_TYPES_MOCK[1];
  const ecoStd = SEAT_TYPES_MOCK.find((s) => s.seat_type_code === 'ECO') ?? SEAT_TYPES_MOCK[0];

  const seats: FlightSeatEntry[] = [];
  let seq = flight.id * 100 + seedOffset;

  for (let row = 1; row <= 6; row++) {
    for (const col of cols) {
      seq++;
      const seatCode = `${row}${col}`;
      const seatType =
        row === 1
          ? busType
          : row === 2
            ? premType
            : col === 'A' || col === 'F'
              ? ecoWin
              : ecoStd;

      let status: FlightSeatStatus = 'AVAILABLE';
      if (row === 1 && col === 'A') status = 'BOOKED';
      else if (row === 4 && (col === 'A' || col === 'B')) status = 'BOOKED';
      else if (row === 5 && col === 'C') status = 'HELD';
      else if (row === 6 && (col === 'E' || col === 'F')) status = 'BLOCKED';

      seats.push({
        id: seq,
        aircraft_seat_id: seq,
        seat_code: seatCode,
        seat_row: row,
        seat_column: col,
        status,
        seat_surcharge: seatType.surcharge,
        seat_type: seatType,
      });
    }
  }

  return recalcSeatMapCounts({
    flight_id: flight.id,
    flight_number: flight.flight_number,
    aircraft_id: flight.aircraft.id,
    aircraft_code: flight.aircraft.aircraft_code,
    model: flight.aircraft.model,
    seat_capacity: flight.aircraft.seat_capacity,
    aisle_after: flight.aircraft.aisle_after ?? 'C',
    total_seats: seats.length,
    available_seats: 0,
    held_seats: 0,
    booked_seats: 0,
    blocked_seats: 0,
    seats,
  });
}

export function recalcSeatMapCounts(map: FlightSeatMap): FlightSeatMap {
  let available = 0;
  let held = 0;
  let booked = 0;
  let blocked = 0;
  for (const s of map.seats) {
    if (s.status === 'AVAILABLE') available++;
    else if (s.status === 'HELD') held++;
    else if (s.status === 'BOOKED') booked++;
    else if (s.status === 'BLOCKED') blocked++;
  }
  return {
    ...map,
    total_seats: map.seats.length,
    available_seats: available,
    held_seats: held,
    booked_seats: booked,
    blocked_seats: blocked,
  };
}
