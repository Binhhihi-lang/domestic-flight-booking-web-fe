import { Voucher } from '@core/models/promotion.model';

/** Trạng thái một voucher trong ví khách — DB v0.4 bảng `user_vouchers`. */
export type UserVoucherStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED';

/** Cách khách có voucher: tự nhận hoặc được ADMIN tặng. */
export type UserVoucherSource = 'CLAIMED' | 'GIFTED';

/**
 * Một voucher trong ví khách — API v0.2 mục 2.8 (`GET /my-vouchers`).
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
  discount_amount: number | null;
  voucher: Voucher;
}

/** Một voucher trong Kho — API v0.2 mục 2.8 (`GET /voucher-store`). */
export interface VoucherStoreItem extends Voucher {
  /** Khách đang đăng nhập đã nhận voucher này chưa. */
  claimed: boolean;
}
