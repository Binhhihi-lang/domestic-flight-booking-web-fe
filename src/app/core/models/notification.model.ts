/**
 * Model thông báo trong ứng dụng (In-app Notification).
 * Khớp đặc tả `00-nghiep-vu-thong-bao.md` và Backend `NotificationResponse` / `UnreadCountResponse`.
 */

/** 9 loại sự kiện thông báo nghiệp vụ (nhóm A: Chuyến bay, B: Đặt chỗ & Vé, C: Khuyến mãi). */
export type NotificationType =
  | 'FLIGHT_SCHEDULE_CHANGED'
  | 'FLIGHT_DELAYED'
  | 'FLIGHT_CANCELLED'
  | 'BOOKING_PAYMENT_EXPIRING'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'ETICKET_ISSUED'
  | 'VOUCHER_ASSIGNED'
  | 'VOUCHER_EXPIRING';

/** Một bản ghi thông báo trả về từ `GET /api/notifications`. */
export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

/** Dữ liệu trả về từ `GET /api/notifications/unread-count`. */
export interface UnreadCountResponse {
  unread_count: number;
}
