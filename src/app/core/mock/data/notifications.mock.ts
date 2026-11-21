import { NotificationItem } from '@core/models/notification.model';

/**
 * Dữ liệu mẫu cho Thông báo trong ứng dụng (In-app Notification).
 * Dùng khi chạy chế độ `useMockApi: true` để kiểm thử chuông thông báo,
 * badge chưa đọc, đánh dấu 1 thông báo đã đọc và đánh dấu tất cả đã đọc.
 */
export const NOTIFICATIONS_MOCK: NotificationItem[] = [
  {
    id: 1,
    type: 'FLIGHT_DELAYED',
    title: 'Chuyến bay VN214 bị trễ giờ',
    body: 'Chuyến VN214 (SGN → HAN) của mã đặt chỗ VF882194 dự kiến khởi hành lúc 15:45 (trễ 45 phút do điều phối khai thác).',
    link_url: '/account',
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 8 * 60_000).toISOString(),
  },
  {
    id: 2,
    type: 'ETICKET_ISSUED',
    title: 'Vé điện tử đã phát hành',
    body: 'Vé điện tử số 738-2491820415 cho mã đặt chỗ VF882194 đã sẵn sàng. Bạn có thể tải vé trong mục Vé của tôi.',
    link_url: '/account',
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 35 * 60_000).toISOString(),
  },
  {
    id: 3,
    type: 'VOUCHER_ASSIGNED',
    title: 'Bạn nhận được voucher mới HE2026',
    body: 'Voucher "Chào hè rực rỡ 2026" giảm 150.000đ đã được thêm vào ví voucher của bạn.',
    link_url: '/promotions',
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
  },
  {
    id: 4,
    type: 'BOOKING_CONFIRMED',
    title: 'Đặt chỗ VF882194 đã thanh toán thành công',
    body: 'Cảm ơn bạn đã thanh toán đơn đặt chỗ VF882194 qua VNPAY. Hệ thống đang xuất vé điện tử.',
    link_url: '/account',
    is_read: true,
    read_at: new Date(Date.now() - 18 * 3600_000).toISOString(),
    created_at: new Date(Date.now() - 20 * 3600_000).toISOString(),
  },
  {
    id: 5,
    type: 'VOUCHER_EXPIRING',
    title: 'Voucher VINAFLY50 sắp hết hạn',
    body: 'Voucher giảm 50.000đ trong ví của bạn sẽ hết hạn sau 3 ngày nữa. Hãy sử dụng trước khi hết hiệu lực.',
    link_url: '/promotions',
    is_read: true,
    read_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
  },
];
