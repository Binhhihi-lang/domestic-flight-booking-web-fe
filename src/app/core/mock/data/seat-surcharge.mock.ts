import { SeatClassSurcharge } from '@core/models/seat-surcharge.model';

/** Seed khớp migration V14 — 6 cặp có chính sách. */
export const SEAT_CLASS_SURCHARGES_MOCK: SeatClassSurcharge[] = [
  { id: 1, from_class: 'ECONOMY',  to_class: 'ECONOMY',  surcharge: 0,       status: 'ACTIVE' },
  { id: 2, from_class: 'ECONOMY',  to_class: 'BUSINESS', surcharge: 500000,  status: 'ACTIVE' },
  { id: 3, from_class: 'ECONOMY',  to_class: 'FIRST',    surcharge: 1200000, status: 'ACTIVE' },
  { id: 4, from_class: 'BUSINESS', to_class: 'ECONOMY',  surcharge: 0,       status: 'ACTIVE' },
  { id: 5, from_class: 'BUSINESS', to_class: 'FIRST',    surcharge: 700000,  status: 'ACTIVE' },
  { id: 6, from_class: 'FIRST',    to_class: 'FIRST',    surcharge: 0,       status: 'ACTIVE' },
];
