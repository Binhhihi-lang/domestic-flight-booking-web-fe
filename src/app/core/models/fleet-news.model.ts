/** Hạng ghế — API v0.4 mục 2.6. */
import { ActiveStatus } from '@core/models/airline.model';

export type SeatClass = 'ECONOMY' | 'BUSINESS' | 'FIRST';

/**
 * Máy bay — API v0.4 mục 2.6, bảng aircrafts (DB v0.4).
 * KHÁC master data ở chỗ: aircraft KHÔNG public, chỉ STAFF/ADMIN.
 */
export interface Aircraft {
  id: number;
  aircraft_code: string;
  model: string;
  manufacturer: string | null;
  seat_capacity: number;
  /**
   * Cột mà SAU ĐÓ là lối đi, phân tách bằng dấu phẩy — "C" (3-3), "C,E" (3-2-2).
   * `null` = cabin không có lối đi giữa.
   */
  aisle_after: string | null;
  status: ActiveStatus;
}

export type AircraftPayload = Omit<Aircraft, 'id'>;

/**
 * Loại ghế — API v0.4 mục 2.6.
 * v0.4 thêm `color_hex` để sơ đồ ghế tô màu theo hạng.
 */
export interface SeatType {
  id: number;
  seat_type_code: string;
  seat_type_name: string;
  seat_class: SeatClass;
  color_hex: string | null;
  status: ActiveStatus;
}

export type SeatTypePayload = Omit<SeatType, 'id'>;

/**
 * Một ghế vật lý trong sơ đồ máy bay (API v0.4 mục 2.6).
 *
 * Khi GỬI lên dùng `seat_type_id`; khi NHẬN về backend trả loại ghế LỒNG
 * (`seat_type`) thay vì id trần — xem `SeatMapService`.
 */
export interface AircraftSeat {
  id?: number;
  seat_row: number;
  seat_column: string;
  seat_type_id: number;
  /** Chỉ có trong response GET — API trả kèm loại ghế lồng. */
  seat_type?: SeatType;
}

/** `data` của GET /admin/aircrafts/{id}/seat-map. */
export interface SeatMap {
  aircraft_id: number;
  seat_capacity: number;
  configured_seats: number;
  seats: AircraftSeat[];
}

/**
 * Tin tức — API v0.4 mục 2.9, bảng news_items.
 *
 * `content` là HTML — khi render phải sanitize chống XSS, không dùng
 * `[innerHTML]` trực tiếp lên dữ liệu thô.
 *
 * Backend trả `categories` lồng (mỗi phần tử chỉ có `id` + `name`) và KHÔNG
 * trả `category_ids`; khi gửi lên thì dùng `category_ids`.
 */
export type NewsStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  thumbnail_url: string | null;
  status: NewsStatus;
  published_at: string | null;
  created_at: string;
  categories?: NewsCategoryBrief[];
  /** Chỉ có ở phía gửi lên / mock; response thật trả `categories`. */
  category_ids?: number[];
}

/** Danh mục rút gọn lồng trong bài viết. */
export interface NewsCategoryBrief {
  id: number;
  name: string;
}

export interface NewsPayload {
  title: string;
  content: string;
  thumbnail_url: string | null;
  category_ids: number[];
}

/** Danh mục tin — API v0.4 mục 2.9 (vùng quản trị). */
export interface NewsCategory {
  id: number;
  name: string;
  description: string | null;
  status: ActiveStatus;
}

export type NewsCategoryPayload = Omit<NewsCategory, 'id'>;
