import { Airline } from '../../models/airline.model';

/**
 * Dữ liệu giả cho hãng hàng không.
 *
 * Dùng tên hãng nội địa thật để màn hình trông giống thật khi demo —
 * dữ liệu "Hãng A, Hãng B" làm người xem không hình dung được bố cục thật.
 */
export const AIRLINES_MOCK: Airline[] = [
  {
    id: 1,
    airline_code: 'VN',
    airline_name: 'Vietnam Airlines',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 2,
    airline_code: 'VJ',
    airline_name: 'Vietjet Air',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 3,
    airline_code: 'QH',
    airline_name: 'Bamboo Airways',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 4,
    airline_code: 'VU',
    airline_name: 'Vietravel Airlines',
    country: 'Việt Nam',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
  {
    id: 5,
    airline_code: 'BL',
    airline_name: 'Pacific Airlines',
    country: 'Việt Nam',
    logo_url: null,
    is_active: false,
    is_deleted: false,
  },
  {
    id: 6,
    airline_code: 'VJ2',
    airline_name: 'Thai Vietjet Air',
    country: 'Thái Lan',
    logo_url: null,
    is_active: true,
    is_deleted: false,
  },
];
