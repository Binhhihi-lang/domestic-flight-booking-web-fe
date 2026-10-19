/**
 * Thành phố — khớp API Design v0.4 mục 2.5 và bảng cities (DB v0.4).
 *
 * API v0.4 trả `status` dạng chuỗi `ACTIVE | INACTIVE`, KHÔNG trả cờ
 * `is_active`/`is_deleted`: xóa mềm được backend lọc sẵn nên client không thấy.
 */
import { ActiveStatus } from '@core/models/airline.model';

export interface City {
  id: number;
  city_code: string;
  city_name: string;
  country: string | null;
  image_url: string | null;
  status: ActiveStatus;
}

export type CityPayload = Omit<City, 'id'>;

/** Sân bay — có FK `city_id` và toạ độ (API v0.4 mục 2.5). */
export interface Airport {
  id: number;
  airport_code: string;
  airport_name: string;
  latitude: number | null;
  longitude: number | null;
  status: ActiveStatus;
  /** Chỉ có trong response — API trả kèm thành phố lồng. */
  city?: City | null;
  /** Chỉ dùng khi gửi lên và trong mock — response thật trả `city`. */
  city_id?: number;
}

export type AirportPayload = Omit<Airport, 'id' | 'city'> & { city_id: number };
