/**
 * Thành phố — khớp API Design v0.2 mục 2.5 và bảng cities (DB v0.4).
 *
 * v0.4 tách hai cờ: `is_active` (bật/tắt dùng) và `is_deleted` (xóa mềm, giữ
 * lịch sử). Trước v0.1 gộp cả hai vào `status = INACTIVE`; nay không dùng nữa.
 */
export interface City {
  id: number;
  city_code: string;
  city_name: string;
  country: string | null;
  is_active: boolean;
  is_deleted: boolean;
}

export type CityPayload = Omit<City, 'id' | 'is_deleted'>;

/** Sân bay — có FK `city_id` và toạ độ (API v0.2 mục 2.5). */
export interface Airport {
  id: number;
  airport_code: string;
  airport_name: string;
  city_id: number;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_deleted: boolean;
  /** Chỉ có trong response chi tiết — API trả kèm thành phố lồng. */
  city?: City | null;
}

export type AirportPayload = Omit<Airport, 'id' | 'is_deleted' | 'city'>;
