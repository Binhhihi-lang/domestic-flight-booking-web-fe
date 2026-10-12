/** Hạng ghế — API v0.2 mục 2.6. */
export type SeatClass = 'ECONOMY' | 'BUSINESS' | 'FIRST';

/**
 * Máy bay — API v0.2 mục 2.6, bảng aircrafts (DB v0.4).
 * KHÁC master data ở chỗ: aircraft KHÔNG public, chỉ STAFF/ADMIN.
 */
export interface Aircraft {
  id: number;
  aircraft_code: string;
  model: string;
  manufacturer: string | null;
  seat_capacity: number;
  is_active: boolean;
  is_deleted: boolean;
}

export type AircraftPayload = Omit<Aircraft, 'id' | 'is_deleted'>;

/**
 * Loại ghế — API v0.2 mục 2.6.
 * v0.4 nâng thành CRUD đầy đủ (trước chỉ read-only ở Phase 1).
 */
export interface SeatType {
  id: number;
  seat_type_code: string;
  seat_type_name: string;
  seat_class: SeatClass;
  is_active: boolean;
  is_deleted: boolean;
}

export type SeatTypePayload = Omit<SeatType, 'id' | 'is_deleted'>;

/** Một ghế vật lý trong sơ đồ máy bay (API v0.2 mục 2.6). */
export interface AircraftSeat {
  id?: number;
  seat_row: number;
  seat_column: string;
  seat_type_id: number;
  /** Chỉ có trong response GET — API trả kèm loại ghế lồng. */
  seat_type?: SeatType;
}

/** `data` của GET /aircrafts/{id}/seat-map. */
export interface SeatMap {
  aircraft_id: number;
  seat_capacity: number;
  configured_seats: number;
  seats: AircraftSeat[];
}

/**
 * Tin tức — API v0.2 mục 2.9, bảng news_items (DB v0.4).
 *
 * `content` là HTML (đã chốt) — khi render phải sanitize chống XSS, không dùng
 * `[innerHTML]` trực tiếp lên dữ liệu thô.
 */
export type NewsStatus = 'DRAFT' | 'PUBLISHED';

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  /**
   * Ảnh đại diện cho thẻ tin.
   *
   * LƯU Ý: DB v0.4 hiện CHƯA có cột này — cần BE thêm
   * `ALTER TABLE news_items ADD COLUMN thumbnail_url VARCHAR(500) NULL;`
   * Trước khi có, trường này luôn null và thẻ tin dùng nền màu thay thế.
   */
  thumbnail_url: string | null;
  status: NewsStatus;
  published_at: string | null;
  is_active: boolean;
  is_deleted: boolean;
  /** Danh mục gắn qua bảng news_category_mapping. */
  category_ids?: number[];
  categories?: NewsCategory[];
}

export type NewsPayload = Omit<NewsItem, 'id' | 'is_deleted' | 'published_at' | 'categories'>;

/** Danh mục tin — API v0.2 mục 2.9. */
export interface NewsCategory {
  id: number;
  category_name: string;
  description: string | null;
  is_active: boolean;
  is_deleted: boolean;
  /** Chỉ có trong response chi tiết — API trả kèm danh sách tin thuộc danh mục. */
  news_items?: NewsItem[];
}

export type NewsCategoryPayload = Omit<NewsCategory, 'id' | 'is_deleted' | 'news_items'>;
