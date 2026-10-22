import { DiscountType, TripType, Voucher } from '@core/models/promotion.model';

/** Trạng thái một voucher trong ví khách — DB v0.4 bảng `user_vouchers`. */
export type UserVoucherStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED';

/** Cách khách có voucher: tự nhận hoặc được ADMIN tặng. */
export type UserVoucherSource = 'CLAIMED' | 'GIFTED';

/**
 * Thông tin voucher rút gọn kèm trong ví — `MyVoucherResponse.VoucherBrief`
 * (BE). KHÔNG có `max_discount_amount`, `claim_limit`, `status`…: ví chỉ cần
 * đủ dữ kiện để hiển thị và tính tiền, phần cấu hình đầy đủ thuộc màn admin.
 */
export interface UserVoucherBrief {
  id: number;
  voucher_code: string;
  voucher_name: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number | null;
  applicable_trip_type: TripType;
  start_date: string;
  end_date: string;
}

/**
 * Một voucher trong ví khách — API v0.4 mục 2.8 (`GET /my-vouchers`).
 *
 * `expires_at` là bản CHÉP của `vouchers.end_date` lúc nhận (DB v0.4 ghi rõ):
 * ADMIN sửa hạn voucher sau đó không làm đổi hạn của voucher đã phát. Vì vậy
 * màn "Voucher của tôi" phải hiện `expires_at`, KHÔNG phải `voucher.end_date` —
 * hiện nhầm trường là nói sai hạn cho khách.
 */
export interface UserVoucher {
  id: number;
  status: UserVoucherStatus;
  source: UserVoucherSource;
  received_at: string;
  expires_at: string | null;
  used_at: string | null;
  voucher: UserVoucherBrief;
}

/** Một voucher trong Kho — API v0.2 mục 2.8 (`GET /voucher-store`). */
export interface VoucherStoreItem extends Voucher {
  /** Khách đang đăng nhập đã nhận voucher này chưa. */
  claimed: boolean;
}
