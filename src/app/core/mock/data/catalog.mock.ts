import { Aircraft, NewsCategory, NewsItem, SeatType } from '@core/models/fleet-news.model';
import { Promotion, Voucher } from '@core/models/promotion.model';
import { Permission, Role } from '@core/models/rbac.model';
import { UserVoucher } from '@core/models/user-voucher.model';

/** Máy bay — API v0.2 mục 2.6. Chỉ STAFF/ADMIN truy cập. */
export const AIRCRAFT_MOCK: Aircraft[] = [
  { id: 1, aircraft_code: 'VN-A350-01', model: 'Airbus A350-900', manufacturer: 'Airbus', seat_capacity: 305, aisle_after: 'C,E', status: 'ACTIVE' },
  { id: 2, aircraft_code: 'VN-A321-05', model: 'Airbus A321neo', manufacturer: 'Airbus', seat_capacity: 203, aisle_after: 'C', status: 'ACTIVE' },
  { id: 3, aircraft_code: 'VJ-A320-12', model: 'Airbus A320', manufacturer: 'Airbus', seat_capacity: 180, aisle_after: 'C', status: 'ACTIVE' },
  { id: 4, aircraft_code: 'VJ-A321-08', model: 'Airbus A321', manufacturer: 'Airbus', seat_capacity: 220, aisle_after: 'C', status: 'ACTIVE' },
  { id: 5, aircraft_code: 'QH-B787-02', model: 'Boeing 787-9', manufacturer: 'Boeing', seat_capacity: 274, aisle_after: 'C,E', status: 'ACTIVE' },
  { id: 6, aircraft_code: 'QH-A321-04', model: 'Airbus A321', manufacturer: 'Airbus', seat_capacity: 203, aisle_after: 'C', status: 'ACTIVE' },
  { id: 7, aircraft_code: 'VU-A321-01', model: 'Airbus A321', manufacturer: 'Airbus', seat_capacity: 220, aisle_after: 'C', status: 'ACTIVE' },
  { id: 8, aircraft_code: 'BL-A320-03', model: 'Airbus A320', manufacturer: 'Airbus', seat_capacity: 180, aisle_after: 'C', status: 'INACTIVE' },
];

/** Loại ghế — API v0.2 mục 2.6. v0.4 nâng thành CRUD đầy đủ. */
export const SEAT_TYPES_MOCK: SeatType[] = [
  { id: 1, seat_type_code: 'ECO', seat_type_name: 'Phổ thông', color_hex: '#90CAF9', seat_class: 'ECONOMY', status: 'ACTIVE' },
  { id: 2, seat_type_code: 'ECO_WIN', seat_type_name: 'Phổ thông - cửa sổ', color_hex: '#64B5F6', seat_class: 'ECONOMY', status: 'ACTIVE' },
  { id: 3, seat_type_code: 'ECO_AIS', seat_type_name: 'Phổ thông - lối đi', color_hex: '#42A5F5', seat_class: 'ECONOMY', status: 'ACTIVE' },
  { id: 4, seat_type_code: 'PREM_ECO', seat_type_name: 'Phổ thông ưu tiên', color_hex: '#1E88E5', seat_class: 'ECONOMY', status: 'ACTIVE' },
  { id: 5, seat_type_code: 'BUS', seat_type_name: 'Ghế thương gia', color_hex: '#F9A825', seat_class: 'BUSINESS', status: 'ACTIVE' },
  { id: 6, seat_type_code: 'BUS_WIN', seat_type_name: 'Thương gia - cửa sổ', color_hex: '#FBC02D', seat_class: 'BUSINESS', status: 'ACTIVE' },
  { id: 7, seat_type_code: 'FIRST', seat_type_name: 'Hạng nhất', color_hex: '#6A1B9A', seat_class: 'FIRST', status: 'ACTIVE' },
  { id: 8, seat_type_code: 'EXIT', seat_type_name: 'Ghế thoát hiểm', color_hex: '#9E9E9E', seat_class: 'ECONOMY', status: 'INACTIVE' },
];

/**
 * Khuyến mãi — API v0.2 mục 2.7. Phase 1 chỉ quản lý định nghĩa.
 *
 * `image_url` / `description` / `badge_label` chưa có cột trong DB v0.4 — đã đề
 * xuất thêm ở `be/docs/De_xuat_bo_sung_DB_v0.5_truong_anh.md`.
 */
export const PROMOTIONS_MOCK: Promotion[] = [
  {
    id: 1,
    promotion_code: 'HE2026',
    promotion_name: 'Khuyến mãi hè 2026',
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=700&q=80',
    description:
      'Nhập mã HE2026 giảm ngay 15% giá vé cho mọi hành trình nội địa. Áp dụng đến hết 31/08.',
    badge_label: 'Giảm 15%',
    discount_type: 'PERCENT',
    discount_value: 15,
    max_discount_amount: 150000,
    min_fare_amount: 500000,
    applicable_trip_type: 'ANY',
    start_date: '2026-06-01',
    end_date: '2027-08-31',
    status: 'ACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 2,
    promotion_code: 'DALAT20',
    promotion_name: 'Đà Lạt mùa sương mù',
    image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=700&q=80',
    description:
      'Nhập mã DALAT20 giảm ngay 20% giá vé trực tiếp khi đặt vé khứ hồi. Áp dụng đến hết 15/11.',
    badge_label: 'Giảm 20%',
    discount_type: 'PERCENT',
    discount_value: 20,
    max_discount_amount: 300000,
    min_fare_amount: 800000,
    applicable_trip_type: 'ROUND_TRIP',
    start_date: '2026-10-01',
    end_date: '2027-11-15',
    status: 'ACTIVE',
    scopes: [{ target_type: 'ROUTE', departure_airport_id: 1, arrival_airport_id: 6 }],
    excluded_flight_ids: [],
  },
  {
    id: 3,
    promotion_code: 'HUE100K',
    promotion_name: 'Giảm 100K tuyến Huế',
    image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=700&q=80',
    description:
      'Vé bay Hà Nội – Huế chỉ từ 499K (chưa thuế phí). Số lượng có hạn cho chuyến bay sáng sớm.',
    badge_label: 'Giá sốc',
    discount_type: 'AMOUNT',
    discount_value: 100000,
    max_discount_amount: null,
    min_fare_amount: 700000,
    applicable_trip_type: 'ONE_WAY',
    start_date: '2026-09-01',
    end_date: '2027-12-31',
    status: 'ACTIVE',
    scopes: [{ target_type: 'ROUTE', departure_airport_id: 1, arrival_airport_id: 7 }],
    excluded_flight_ids: [101],
  },
  {
    id: 4,
    promotion_code: 'TET2027',
    promotion_name: 'Vé Tết 2027',
    image_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=700&q=80',
    description:
      'Săn vé Tết sớm, giảm 10% tối đa 200K mỗi dòng vé cho mọi chuyến bay nội địa.',
    badge_label: 'Săn Tết sớm',
    discount_type: 'PERCENT',
    discount_value: 10,
    max_discount_amount: 200000,
    min_fare_amount: 0,
    applicable_trip_type: 'ANY',
    start_date: '2027-01-10',
    end_date: '2027-02-20',
    status: 'INACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 5,
    promotion_code: 'SUMMER99',
    promotion_name: 'Bay đồng giá 99K',
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=700&q=80',
    description:
      'Mở bán hàng ngàn vé đồng giá 99K toàn mạng bay nội địa vào mỗi thứ 5 hàng tuần. Đặt ngay kẻo lỡ!',
    badge_label: 'Đồng giá',
    discount_type: 'AMOUNT',
    discount_value: 99000,
    max_discount_amount: null,
    min_fare_amount: 300000,
    applicable_trip_type: 'ANY',
    start_date: '2026-11-01',
    end_date: '2027-01-31',
    status: 'ACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 6,
    promotion_code: 'PROMO2025',
    promotion_name: 'Khuyến mãi cũ 2025',
    image_url: null,
    description: null,
    badge_label: null,
    discount_type: 'AMOUNT',
    discount_value: 50000,
    max_discount_amount: null,
    min_fare_amount: 0,
    applicable_trip_type: 'ANY',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'INACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
];

/**
 * Voucher — API v0.2 mục 2.8.
 * Khách KHÔNG gõ mã; khách nhận vào ví rồi chọn khi thanh toán.
 */
export const VOUCHERS_MOCK: Voucher[] = [
  {
    id: 1,
    voucher_code: 'SUMMER50K',
    voucher_name: 'Giảm 50K mùa hè',
    description: 'Áp dụng cho mọi chuyến nội địa, đơn từ 500K',
    distribution_type: 'GLOBAL',
    discount_type: 'AMOUNT',
    discount_value: 50000,
    max_discount_amount: null,
    min_order_amount: 500000,
    applicable_trip_type: 'ANY',
    start_date: '2026-06-01',
    end_date: '2027-12-31',
    claim_limit: 1000,
    claimed_count: 342,
    status: 'ACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 2,
    voucher_code: 'VN10OFF',
    voucher_name: 'Giảm 10% Vietnam Airlines',
    description: 'Chỉ áp dụng chuyến bay Vietnam Airlines. Trần giảm 200.000₫.',
    distribution_type: 'GLOBAL',
    discount_type: 'PERCENT',
    discount_value: 10,
    max_discount_amount: 200000,
    min_order_amount: 800000,
    applicable_trip_type: 'ANY',
    start_date: '2026-09-01',
    end_date: '2027-12-20',
    claim_limit: 500,
    claimed_count: 128,
    status: 'ACTIVE',
    scopes: [{ target_type: 'AIRLINE', airline_id: 1 }],
    excluded_flight_ids: [],
  },
  {
    id: 3,
    voucher_code: 'NEWUSER100K',
    voucher_name: 'Chào khách mới 100K',
    description: 'Dành cho khách đăng ký lần đầu. Đơn tối thiểu 1.000.000₫.',
    distribution_type: 'GLOBAL',
    discount_type: 'AMOUNT',
    discount_value: 100000,
    max_discount_amount: null,
    min_order_amount: 1000000,
    applicable_trip_type: 'ANY',
    start_date: '2026-01-01',
    end_date: '2027-12-31',
    claim_limit: null,
    claimed_count: 89,
    status: 'ACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 4,
    voucher_code: 'VIP500K',
    voucher_name: 'Ưu đãi khách VIP',
    description: 'ADMIN tặng riêng cho khách thân thiết.',
    distribution_type: 'ASSIGNED',
    discount_type: 'AMOUNT',
    discount_value: 500000,
    max_discount_amount: null,
    min_order_amount: 2000000,
    applicable_trip_type: 'ANY',
    start_date: '2026-10-01',
    end_date: '2027-12-31',
    claim_limit: null,
    claimed_count: 0,
    status: 'ACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 6,
    voucher_code: 'BAYHE2027',
    voucher_name: 'Bay hè 2027 giảm 150K',
    description: 'Áp dụng mọi chuyến nội địa, đơn từ 700K.',
    distribution_type: 'GLOBAL',
    discount_type: 'AMOUNT',
    discount_value: 150000,
    max_discount_amount: null,
    min_order_amount: 700000,
    applicable_trip_type: 'ANY',
    start_date: '2026-10-01',
    end_date: '2027-12-31',
    claim_limit: 300,
    claimed_count: 45,
    status: 'ACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
  {
    id: 5,
    voucher_code: 'TET100K',
    voucher_name: 'Giảm 100K Tết 2026',
    description: 'Đã hết hiệu lực.',
    distribution_type: 'GLOBAL',
    discount_type: 'AMOUNT',
    discount_value: 100000,
    max_discount_amount: null,
    min_order_amount: 500000,
    applicable_trip_type: 'ANY',
    start_date: '2026-01-15',
    end_date: '2026-02-28',
    claim_limit: 2000,
    claimed_count: 2000,
    status: 'INACTIVE',
    scopes: [],
    excluded_flight_ids: [],
  },
];

/** Danh mục tin — API v0.2 mục 2.9. */
export const NEWS_CATEGORIES_MOCK: NewsCategory[] = [
  { id: 1, name: 'Khuyến mãi', description: 'Thông tin ưu đãi, giảm giá vé', status: 'ACTIVE' },
  { id: 2, name: 'Hãng hàng không', description: 'Tin tức về các hãng bay nội địa', status: 'ACTIVE' },
  { id: 3, name: 'Cẩm nang du lịch', description: 'Kinh nghiệm bay và du lịch', status: 'ACTIVE' },
  { id: 4, name: 'Điểm đến', description: 'Giới thiệu điểm đến trong nước', status: 'ACTIVE' },
  { id: 5, name: 'Thông báo', description: 'Thay đổi quy định, lịch bay', status: 'ACTIVE' },
  { id: 6, name: 'Tin cũ 2025', description: 'Không còn dùng', status: 'INACTIVE' },
];

/**
 * Tin tức — API v0.2 mục 2.9. `content` là HTML (đã chốt) — khi render phải
 * sanitize chống XSS.
 */
export const NEWS_MOCK: NewsItem[] = [
  {
    id: 1,
    thumbnail_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=70',
    title: 'Vietnam Airlines mở bán vé Tết 2027',
    content:
      '<p>Hãng mở bán vé Tết Nguyên đán 2027 cho toàn bộ đường bay nội địa, áp dụng từ ngày 10/01/2027.</p>',
    status: 'PUBLISHED',
    published_at: '2026-10-05T02:00:00Z',
    created_at: '2026-10-05T02:00:00Z',
    category_ids: [2, 5],
  },
  {
    id: 2,
    thumbnail_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=400&q=70',
    title: 'Bay đồng giá 99K mỗi thứ Năm',
    content:
      '<p>Mở bán hàng ngàn vé đồng giá 99K toàn mạng bay nội địa vào mỗi thứ 5 hàng tuần.</p>',
    status: 'PUBLISHED',
    published_at: '2026-10-08T01:30:00Z',
    created_at: '2026-10-08T01:30:00Z',
    category_ids: [1],
  },
  {
    id: 3,
    thumbnail_url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=70',
    title: 'Kinh nghiệm chọn ghế cửa sổ khi bay nội địa',
    content: '<p>Chọn ghế cửa sổ giúp bạn có tầm nhìn đẹp, nhưng cần lưu ý vài điều sau…</p>',
    status: 'PUBLISHED',
    published_at: '2026-09-28T03:15:00Z',
    created_at: '2026-09-28T03:15:00Z',
    category_ids: [3],
  },
  {
    id: 4,
    thumbnail_url: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&q=70',
    title: 'Phú Quốc vào mùa đẹp nhất năm',
    content: '<p>Từ tháng 11 đến tháng 3 là thời điểm lý tưởng để du lịch Phú Quốc.</p>',
    status: 'PUBLISHED',
    published_at: '2026-09-20T00:00:00Z',
    created_at: '2026-09-20T00:00:00Z',
    category_ids: [4],
  },
  {
    id: 5,
    thumbnail_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=70',
    title: 'Thay đổi quy định hành lý xách tay từ 12/2026',
    content: '<p>Từ 01/12/2026, khối lượng hành lý xách tay được điều chỉnh…</p>',
    status: 'DRAFT',
    published_at: null,
    created_at: '2026-09-01T00:00:00Z',
    category_ids: [5],
  },
  {
    id: 6,
    thumbnail_url: null,
    title: 'Bản nháp: Ưu đãi tháng 12',
    content: '<p>Nội dung đang soạn.</p>',
    status: 'DRAFT',
    published_at: null,
    created_at: '2026-09-01T00:00:00Z',
    category_ids: [1],
  },
  {
    id: 7,
    thumbnail_url: null,
    title: 'Tin cũ năm 2025',
    content: '<p>Đã ẩn.</p>',
    status: 'DRAFT',
    published_at: null,
    created_at: '2026-09-01T00:00:00Z',
    category_ids: [6],
  },
  {
    /**
     * Bài CHỨA NỘI DUNG ĐỘC HẠI — cố ý, để thử chống XSS qua đường thật.
     *
     * Vì sao để trong dữ liệu mẫu: test `sanitize.service.spec.ts` kiểm tra
     * service, nhưng nó không chứng minh được TRANG có gọi service hay không.
     * Bài này đi qua đúng đường mà ADMIN nhập liệu sẽ đi, nên test
     * `news-detail.spec.ts` mới chứng minh được cả chuỗi.
     *
     * Nếu trang chi tiết bind `content` thẳng mà quên sanitize, test sẽ thấy
     * `<script>` trong DOM và fail.
     */
    id: 99,
    thumbnail_url: null,
    title: 'Bài kiểm tra chống XSS',
    content:
      '<p>Đoạn văn bình thường</p>' +
      '<script>window.__xss_ran = true;</script>' +
      '<img src=x onerror="window.__xss_ran = true">' +
      '<a href="javascript:window.__xss_ran=true">bấm</a>',
    status: 'PUBLISHED',
    published_at: '2026-10-01T02:00:00Z',
    created_at: '2026-10-01T02:00:00Z',
    category_ids: [5],
  },
];

/** Vai trò — API v0.2 mục 2.4. Seed cố định, không CRUD. */
export const ROLES_MOCK: Role[] = [
  { id: 1, name: 'CUSTOMER', description: 'Khách hàng đã đăng ký/đăng nhập — nghiệp vụ cá nhân và booking' },
  { id: 2, name: 'STAFF', description: 'Nhân viên vận hành — quản lý flight, fare, seat, booking' },
  { id: 3, name: 'ADMIN', description: 'Quản trị hệ thống — user, RBAC, master data, content' },
];

/**
 * Quyền — trích từ `V2__seed_rbac.sql` của BE để FE thấy đúng dữ liệu thật.
 * Chỉ lấy một phần đủ để thử lọc theo `module`; đủ 7 module khác nhau.
 */
export const PERMISSIONS_MOCK: Permission[] = [
  { id: 1, permission_key: 'LOGIN', description: 'Đăng nhập hệ thống', module: 'AUTH' },
  { id: 2, permission_key: 'LOGOUT', description: 'Đăng xuất', module: 'AUTH' },
  { id: 3, permission_key: 'PASSWORD_CHANGE_SELF', description: 'Đổi mật khẩu của mình', module: 'AUTH' },
  { id: 4, permission_key: 'USER_READ', description: 'Xem danh sách người dùng', module: 'USER' },
  { id: 5, permission_key: 'USER_READ_DETAIL', description: 'Xem chi tiết người dùng', module: 'USER' },
  { id: 6, permission_key: 'USER_CREATE', description: 'Tạo người dùng', module: 'USER' },
  { id: 7, permission_key: 'USER_UPDATE', description: 'Cập nhật người dùng', module: 'USER' },
  { id: 8, permission_key: 'USER_DELETE', description: 'Xóa người dùng', module: 'USER' },
  { id: 9, permission_key: 'ROLE_READ', description: 'Xem vai trò và quyền', module: 'ROLE' },
  { id: 10, permission_key: 'AIRLINE_READ', description: 'Xem danh sách hãng hàng không', module: 'AIRLINE' },
  { id: 11, permission_key: 'AIRLINE_CREATE', description: 'Tạo hãng hàng không', module: 'AIRLINE' },
  { id: 12, permission_key: 'CITY_READ', description: 'Xem danh sách thành phố', module: 'CITY' },
  { id: 13, permission_key: 'AIRPORT_READ', description: 'Xem danh sách sân bay', module: 'AIRPORT' },
  { id: 14, permission_key: 'AIRCRAFT_READ', description: 'Xem danh sách máy bay', module: 'AIRCRAFT' },
  { id: 15, permission_key: 'SEAT_CONFIG_READ', description: 'Xem danh sách cấu hình ghế', module: 'SEAT_CONFIG' },
  { id: 16, permission_key: 'SEAT_CONFIG_UPDATE', description: 'Cập nhật cấu hình ghế', module: 'SEAT_CONFIG' },
  { id: 17, permission_key: 'PROMOTION_READ', description: 'Xem danh sách khuyến mãi', module: 'PROMOTION' },
  { id: 18, permission_key: 'VOUCHER_READ', description: 'Xem danh sách voucher', module: 'VOUCHER' },
  { id: 19, permission_key: 'VOUCHER_CLAIM', description: 'Nhận voucher vào ví', module: 'VOUCHER' },
  { id: 20, permission_key: 'NEWS_READ', description: 'Xem danh sách tin tức', module: 'NEWS' },
  { id: 21, permission_key: 'NEWS_PUBLISH', description: 'Xuất bản tin tức', module: 'NEWS' },
];

/**
 * Ví voucher của khách — API v0.2 mục 2.8.
 *
 * Cố ý có đủ 4 trạng thái để thử giao diện: AVAILABLE (dùng được), RESERVED
 * (đang giữ cho booking chờ thanh toán), USED (đã dùng), EXPIRED (quá hạn).
 * Và đủ 2 nguồn: CLAIMED / GIFTED.
 *
 * `expires_at` KHÁC `voucher.end_date` ở vài dòng — cố ý, để thấy rõ màn hình
 * phải đọc hạn của DÒNG VÍ chứ không phải hạn voucher gốc (DB v0.4 ghi rõ:
 * hạn được chép lúc nhận, ADMIN sửa voucher sau đó không ảnh hưởng).
 */
export const USER_VOUCHERS_MOCK: UserVoucher[] = [
  {
    id: 1, status: 'AVAILABLE', source: 'CLAIMED',
    received_at: '2026-09-01T02:00:00Z', expires_at: '2027-12-31T16:59:59Z',
    used_at: null, discount_amount: null, voucher: VOUCHERS_MOCK[0],
  },
  {
    id: 2, status: 'RESERVED', source: 'CLAIMED',
    received_at: '2026-09-15T02:00:00Z', expires_at: '2027-10-31T16:59:59Z',
    used_at: null, discount_amount: null, voucher: VOUCHERS_MOCK[1],
  },
  {
    id: 3, status: 'USED', source: 'GIFTED',
    received_at: '2026-08-01T02:00:00Z', expires_at: '2026-12-31T16:59:59Z',
    used_at: '2026-08-20T09:30:00Z', discount_amount: 100000, voucher: VOUCHERS_MOCK[2],
  },
  {
    id: 4, status: 'EXPIRED', source: 'GIFTED',
    received_at: '2026-01-05T02:00:00Z', expires_at: '2026-06-30T16:59:59Z',
    used_at: null, discount_amount: null, voucher: VOUCHERS_MOCK[3],
  },
];
