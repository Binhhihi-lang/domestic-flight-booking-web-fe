/** Loại giảm giá — dùng chung cho Promotion và Voucher (API v0.2 mục 2.7, 2.8). */
export type DiscountType = 'PERCENT' | 'AMOUNT';

/** Loại hành trình mà khuyến mãi/voucher áp dụng. */
export type TripType = 'ANY' | 'ONE_WAY' | 'ROUND_TRIP';

/** Phạm vi áp dụng — không có dòng nào nghĩa là áp cho tất cả (API v0.2 mục 2.7). */
export type PromotionTargetType = 'AIRLINE' | 'FARE_CLASS' | 'ROUTE' | 'FLIGHT';

export interface PromotionScope {
  target_type: PromotionTargetType;
  airline_id?: number | null;
  fare_class_id?: number | null;
  departure_airport_id?: number | null;
  arrival_airport_id?: number | null;
  flight_id?: number | null;
}

/**
 * Khuyến mãi — API Design v0.2 mục 2.7, bảng promotions (DB v0.4).
 *
 * v0.4 bổ sung trần giảm, giá tối thiểu, loại hành trình, phạm vi và loại trừ.
 * Phase 1 chỉ quản lý ĐỊNH NGHĨA — việc tính giá giảm lúc tìm chuyến thuộc Phase 2–3.
 */
export interface Promotion {
  id: number;
  promotion_code: string;
  promotion_name: string;
  discount_type: DiscountType;
  discount_value: number;
  /** Trần giảm cho MỖI DÒNG VÉ; chỉ có ý nghĩa với PERCENT. null = không trần. */
  max_discount_amount: number | null;
  /** Giá dòng vé tối thiểu mới được giảm. null = không yêu cầu. */
  min_fare_amount: number | null;
  applicable_trip_type: TripType;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_deleted: boolean;
  scopes?: PromotionScope[];
  excluded_flight_ids?: number[];
}

export type PromotionPayload = Omit<Promotion, 'id' | 'is_deleted'>;

/** Kiểu phát hành voucher (API v0.2 mục 2.8). */
export type VoucherDistributionType = 'GLOBAL' | 'ASSIGNED';

/**
 * Voucher — API Design v0.2 mục 2.8, bảng vouchers (DB v0.4).
 *
 * Đổi mô hình quan trọng so với v0.1: khách **không gõ mã**. Khách NHẬN voucher
 * vào ví rồi chọn từ ví khi thanh toán. `voucher_code` chỉ để ADMIN tra cứu.
 */
export interface Voucher {
  id: number;
  voucher_code: string;
  voucher_name: string;
  description: string | null;
  distribution_type: VoucherDistributionType;
  discount_type: DiscountType;
  discount_value: number;
  /** Trần giảm cho CẢ BOOKING (khác promotion tính theo dòng vé). */
  max_discount_amount: number | null;
  /** Tổng giá vé tối thiểu mới dùng được. */
  min_order_amount: number | null;
  applicable_trip_type: TripType;
  start_date: string;
  end_date: string;
  /** Tổng số lượt được NHẬN; chỉ áp cho GLOBAL. null = không giới hạn. */
  claim_limit: number | null;
  claimed_count: number;
  is_active: boolean;
  is_deleted: boolean;
  scopes?: PromotionScope[];
  excluded_flight_ids?: number[];
}

export type VoucherPayload = Omit<Voucher, 'id' | 'is_deleted' | 'claimed_count'>;
