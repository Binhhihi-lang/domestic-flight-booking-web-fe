import { Airline } from '@core/models/airline.model';
import {
  AdminUser,
  AdminUserCreatePayload,
  AdminUserUpdatePayload,
  AuthenticatedUser,
} from '@core/models/auth.model';
import {
  Aircraft,
  AircraftSeat,
  NewsCategory,
  NewsItem,
  SeatMap,
  SeatType,
} from '@core/models/fleet-news.model';
import { Airport, City } from '@core/models/location.model';
import { Promotion, Voucher } from '@core/models/promotion.model';
import { BaggageOption, FareClass, FareRule } from '@core/models/fare-baggage.model';
import { AIRLINES_MOCK } from '@core/mock/data/airlines.mock';
import {
  AIRCRAFT_MOCK,
  NEWS_CATEGORIES_MOCK,
  NEWS_MOCK,
  PERMISSIONS_MOCK,
  PROMOTIONS_MOCK,
  USER_VOUCHERS_MOCK,
  ROLES_MOCK,
  SEAT_TYPES_MOCK,
  toVoucherBrief,
  VOUCHERS_MOCK,
} from '@core/mock/data/catalog.mock';
import {
  BAGGAGE_OPTIONS_MOCK,
  FARE_CLASSES_MOCK,
  FARE_RULES_MOCK,
} from '@core/mock/data/fare-baggage.mock';
import { AIRPORTS_MOCK, CITIES_MOCK } from '@core/mock/data/locations.mock';
import {
  buildLoginResponse,
  findMockUser,
  MOCK_PASSWORD,
  USERS_MOCK,
} from '@core/mock/data/auth.mock';
import { UserVoucher, VoucherStoreItem } from '@core/models/user-voucher.model';
import { NotificationItem } from '@core/models/notification.model';
import { NOTIFICATIONS_MOCK } from '@core/mock/data/notifications.mock';
import { BookingDetail, PaymentCreateRequest, PaymentTransaction } from '@core/models/booking.model';
import {
  buildMockBookingDetail,
  buildMockETickets,
  OPERATIONAL_DASHBOARD_MOCK,
  OVERVIEW_DASHBOARD_MOCK,
} from '@core/mock/data/checkout-dashboard.mock';
import {
  FlightDetailRecord,
  FlightFare,
  FlightFarePayload,
  FlightPayload,
  FlightRecord,
  FlightSeatMap,
  SeatInventoryRequestPayload,
} from '@core/models/flight.model';
import {
  buildMockFlightSeatMap,
  computeFarePrices,
  FLIGHT_FARES_MOCK,
  FLIGHT_PASSENGERS_MOCK,
  FLIGHTS_MOCK,
  recalcSeatMapCounts,
} from '@core/mock/data/flights.mock';
import { MockResource } from '@core/mock/mock-resource';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import {
  businessError,
  duplicate,
  notFound,
  ok,
  paginate,
  readParams,
  readStoredUser,
} from '@core/mock/mock-response';

/**
 * Sổ tra cứu mock: ánh xạ (method + đường dẫn) sang dữ liệu giả.
 *
 * Vì sao dùng lớp có trạng thái thay vì hàm thuần: các thao tác ghi (tạo,
 * sửa, xóa mềm) phải thấy được ở lần đọc sau — nếu không thì không thử được
 * luồng CRUD thật. Dữ liệu chỉ nằm trong bộ nhớ, tải lại trang là về ban đầu.
 *
 * Airlines giữ handler viết riêng (là màn mẫu, có kiểm tra UNIQUE riêng); các
 * module master data còn lại chạy qua `MockResource` tổng quát.
 */
export class MockRegistry {
  private airlines: Airline[] = AIRLINES_MOCK.map((a) => ({ ...a }));
  private readonly deletedAirlines = new Set<number>();
  private nextId = 100;

  /**
   * Người dùng cho màn quản trị — viết handler riêng (không dùng `MockResource`)
   * vì có hai nghiệp vụ mà tài nguyên tổng quát không biểu diễn được: chặn mất
   * ADMIN đang hoạt động cuối cùng, và endpoint `reset-password` trả mật khẩu tạm.
   */
  private users: AdminUser[] = USERS_MOCK.map((u) => ({ ...u }));
  /** Bản ghi đã xóa mềm trong seed — ẩn khỏi mọi truy vấn như DB thật. */
  private readonly deletedUsers = new Set<number>([12]);
  private temporaryPasswordSeq = 1;

  /**
   * Hồ sơ của người đang đăng nhập (mock chỉ giữ một phiên). Tách khỏi `users`
   * để sửa hồ sơ không làm đổi bản ghi ở màn quản trị — đúng như backend, nơi
   * `/profile` thao tác trên user trong token.
   */
  private profileUser: AuthenticatedUser | null = null;

  /** Token đặt lại mật khẩu đã phát; map token → email để confirm tra lại. */
  private readonly resetTokens = new Map<string, string>();
  private resetTokenSeq = 1;

  /**
   * Sơ đồ ghế theo `aircraft_id`. Khởi tạo RỖNG — máy bay chưa cấu hình ghế nào,
   * đúng trạng thái ban đầu của hệ thống thật (chưa ai khai sơ đồ).
   */
  private readonly deletedAircraft = new Set<number>();
  private seatMaps = new Map<number, AircraftSeat[]>();
  private seatIdSeq = 1000;

  /** Ví voucher của khách đang đăng nhập (mock chỉ có một khách). */
  private userVouchers: UserVoucher[] = USER_VOUCHERS_MOCK.map((v) => ({ ...v }));
  private userVoucherIdSeq = 100;

  /** Danh sách thông báo in-app của người dùng đang đăng nhập. */
  private notifications: NotificationItem[] = NOTIFICATIONS_MOCK.map((n) => ({ ...n }));

  /** Dữ liệu mẫu đơn đặt vé & thanh toán cho luồng Checkout (Cụm B6) & Quản lý đặt chỗ (Cụm DA3). */
  private mockBooking: BookingDetail = buildMockBookingDetail();
  private mockBookingsList: BookingDetail[] = this.buildInitialBookings();
  private mockPayments: PaymentTransaction[] = [];
  private paymentIdSeq = 500;

  /** Dữ liệu mẫu Chuyến bay, Giá bán & Tồn ghế (Cụm DA2). */
  private flights: FlightRecord[] = FLIGHTS_MOCK.map((f) => ({ ...f }));
  private readonly deletedFlights = new Set<number>();
  private flightIdSeq = 200;
  private flightFares: FlightFare[] = FLIGHT_FARES_MOCK.map((f) => ({ ...f }));
  private flightFareIdSeq = 100;
  private flightSeatMaps = new Map<number, FlightSeatMap>();

  private readonly resources = [
    new MockResource<City>({
      path: 'admin/cities',
      seed: CITIES_MOCK,
      searchFields: ['city_code', 'city_name'],
      uniqueField: 'city_code',
      noun: 'thành phố',
    }),
    new MockResource<Airport>({
      path: 'admin/airports',
      seed: AIRPORTS_MOCK,
      searchFields: ['airport_code', 'airport_name'],
      uniqueField: 'airport_code',
      noun: 'sân bay',
      validate: (p) =>
        p.city_id === undefined || p.city_id === null ? 'Thành phố không được để trống' : null,
    }),
    new MockResource<Promotion>({
      path: 'admin/promotions',
      seed: PROMOTIONS_MOCK,
      searchFields: ['promotion_code', 'promotion_name'],
      uniqueField: 'promotion_code',
      noun: 'khuyến mãi',
      validate: (p) => {
        if (p.start_date && p.end_date && p.end_date < p.start_date) {
          return 'Ngày kết thúc phải sau ngày bắt đầu';
        }
        if (p.discount_type === 'PERCENT' && (p.discount_value ?? 0) > 100) {
          return 'Giảm theo phần trăm không được vượt quá 100';
        }
        if (p.discount_value !== undefined && p.discount_value !== null && p.discount_value <= 0) {
          return 'Giá trị giảm phải lớn hơn 0';
        }
        return null;
      },
    }),
    new MockResource<Voucher>({
      path: 'admin/vouchers',
      seed: VOUCHERS_MOCK,
      searchFields: ['voucher_code', 'voucher_name'],
      uniqueField: 'voucher_code',
      noun: 'voucher',
      validate: (p) => {
        if (p.start_date && p.end_date && p.end_date < p.start_date) {
          return 'Ngày kết thúc phải sau ngày bắt đầu';
        }
        if (p.claim_limit !== undefined && p.claim_limit !== null && p.claim_limit <= 0) {
          return 'Giới hạn lượt nhận phải lớn hơn 0';
        }
        return null;
      },
    }),
    new MockResource<Aircraft>({
      path: 'admin/aircrafts',
      seed: AIRCRAFT_MOCK,
      searchFields: ['aircraft_code', 'model'],
      uniqueField: 'aircraft_code',
      noun: 'máy bay',
      validate: (p) =>
        p.seat_capacity !== undefined && p.seat_capacity !== null && p.seat_capacity <= 0
          ? 'Sức chứa phải lớn hơn 0'
          : null,
    }),
    new MockResource<SeatType>({
      path: 'admin/seat-types',
      seed: SEAT_TYPES_MOCK,
      searchFields: ['seat_type_code', 'seat_type_name'],
      uniqueField: 'seat_type_code',
      noun: 'loại ghế',
      validate: (p) =>
        p.surcharge !== undefined && p.surcharge !== null && p.surcharge < 0
          ? 'Phụ thu không được âm'
          : null,
    }),
    new MockResource<FareClass>({
      path: 'admin/fare-classes',
      seed: FARE_CLASSES_MOCK,
      searchFields: ['fare_class_code', 'fare_class_name', 'airline_code', 'airline_name'],
      uniqueField: 'fare_class_code',
      noun: 'hạng vé',
      validate: (p) => {
        if (p.airline_id === undefined || p.airline_id === null) {
          return 'Hãng áp dụng không được để trống';
        }
        if (!p.seat_class) {
          return 'Khoang dịch vụ không được để trống';
        }
        return null;
      },
      enrich: (fc) => {
        const airline = AIRLINES_MOCK.find((a) => a.id === Number(fc.airline_id));
        const airlineCode = airline?.airline_code ?? fc.airline_code ?? '';
        const rawCode = (fc.fare_class_code ?? '').trim().toUpperCase();
        const prefixedCode =
          airlineCode && rawCode && !rawCode.startsWith(`${airlineCode}_`)
            ? `${airlineCode}_${rawCode}`
            : rawCode;
        return {
          ...fc,
          airline_id: Number(fc.airline_id),
          airline_code: airlineCode,
          airline_name: airline?.airline_name ?? fc.airline_name ?? '',
          fare_class_code: prefixedCode,
        };
      },
    }),
    new MockResource<FareRule>({
      path: 'admin/fare-rules',
      seed: FARE_RULES_MOCK,
      searchFields: ['fare_class_code', 'fare_class_name', 'airline_code', 'description'],
      noun: 'quy định hoàn vé',
      validate: (p) => {
        if (p.fare_class_id === undefined || p.fare_class_id === null) {
          return 'Hạng vé không được để trống';
        }
        if (
          p.refund_min_hours_before_departure !== undefined &&
          (p.refund_min_hours_before_departure < 0 || p.refund_min_hours_before_departure > 720)
        ) {
          return 'Số giờ tối thiểu phải từ 0 đến 720';
        }
        if (
          p.refund_percent !== undefined &&
          (p.refund_percent < 0 || p.refund_percent > 100)
        ) {
          return 'Phần trăm hoàn phải từ 0 đến 100';
        }
        return null;
      },
      enrich: (rule) => {
        const fc = FARE_CLASSES_MOCK.find((f) => f.id === Number(rule.fare_class_id));
        return {
          ...rule,
          fare_class_id: Number(rule.fare_class_id),
          fare_class_code: fc?.fare_class_code ?? rule.fare_class_code ?? '',
          fare_class_name: fc?.fare_class_name ?? rule.fare_class_name ?? '',
          airline_code: fc?.airline_code ?? rule.airline_code ?? '',
          version: rule.version ?? 1,
          is_refundable: Boolean(rule.is_refundable),
          refund_min_hours_before_departure: Number(rule.refund_min_hours_before_departure ?? 0),
          refund_percent: Number(rule.refund_percent ?? 0),
        };
      },
    }),
    new MockResource<BaggageOption>({
      path: 'admin/baggage-options',
      seed: BAGGAGE_OPTIONS_MOCK,
      searchFields: ['name', 'airline_code', 'airline_name'],
      noun: 'gói hành lý',
      validate: (p) => {
        if (p.airline_id === undefined || p.airline_id === null) {
          return 'Hãng áp dụng không được để trống';
        }
        if (p.weight_kg === undefined || p.weight_kg === null || p.weight_kg <= 0 || p.weight_kg > 100) {
          return 'Khối lượng phải lớn hơn 0 và tối đa 100 kg';
        }
        if (p.price === undefined || p.price === null || p.price < 0) {
          return 'Đơn giá không được âm';
        }
        return null;
      },
      enrich: (bg) => {
        const airline = AIRLINES_MOCK.find((a) => a.id === Number(bg.airline_id));
        return {
          ...bg,
          airline_id: Number(bg.airline_id),
          airline_code: airline?.airline_code ?? bg.airline_code ?? '',
          airline_name: airline?.airline_name ?? bg.airline_name ?? '',
          weight_kg: Number(bg.weight_kg),
          price: Number(bg.price),
        };
      },
    }),
    new MockResource<NewsItem>({
      path: 'admin/news',
      seed: NEWS_MOCK,
      searchFields: ['title'],
      noun: 'tin tức',
      // `category_id` khớp phần tử trong `category_ids` — filter thường so chuỗi
      // với một trường vô hướng nên không dùng được cho trường mảng.
      arrayFilters: { category_id: 'category_ids' },
      // News dùng PUBLISHED | UNPUBLISHED cho bulk (DRAFT chỉ đạt được qua
      // unpublish), khác ACTIVE | INACTIVE của các module master data.
      bulkStatuses: ['PUBLISHED', 'UNPUBLISHED'],
      onBulkStatus: (n, status) => {
        if (status === 'PUBLISHED' && !n.published_at) {
          n.published_at = new Date().toISOString();
        }
      },
      // API trả kèm `categories` lồng để client không phải gọi thêm endpoint;
      // trang khách dùng nó cho dropdown danh mục và nhãn ở bài viết.
      enrich: (n) => ({
        ...n,
        categories: (n.category_ids ?? [])
          .map((cid) => NEWS_CATEGORIES_MOCK.find((c) => c.id === cid))
          .filter((c): c is NewsCategory => c !== undefined && c.status === 'ACTIVE'),
      }),
    }),
    new MockResource<NewsCategory>({
      path: 'admin/news-categories',
      seed: NEWS_CATEGORIES_MOCK,
      searchFields: ['name'],
      uniqueField: 'name',
      noun: 'danh mục tin',
    }),
  ];

  /**
   * Rút đường dẫn so sánh được từ URL.
   *
   * HttpClient đưa URL TUYỆT ĐỐI vào interceptor (http://localhost:8080/api/admin/airlines),
   * không phải đường dẫn tương đối. Bỏ phần gốc đi để so khớp được với hằng số
   * đường dẫn trong registry — nếu không, mọi request đều trượt và rơi ra mạng thật.
   */
  private static pathOf(url: string): string {
    const withoutQuery = url.split('?')[0];
    const withoutOrigin = withoutQuery.replace(/^https?:\/\/[^/]+/, '');
    return withoutOrigin || '/';
  }

  /**
   * Trả dữ liệu giả, hoặc `undefined` nếu đường dẫn này không có mock
   * (để request đi tiếp ra mạng thật).
   */
  resolve(method: string, url: string, body?: unknown): unknown | undefined {
    const path = MockRegistry.pathOf(url);
    const m = method.toUpperCase();

    // Auth: cần thiết để vào được khu vực có guard khi Backend chưa có endpoint thật.
    if (path === '/api/auth/login' && m === 'POST') {
      return this.login(body);
    }
    if (path === '/api/auth/logout' && m === 'POST') {
      return ok(null, 'Đã đăng xuất');
    }
    if (path === '/api/auth/change-password' && m === 'POST') {
      return this.changePassword(body);
    }
    if (path === '/api/auth/password-reset/request' && m === 'POST') {
      return this.requestPasswordReset(body);
    }
    if (path === '/api/auth/password-reset/confirm' && m === 'POST') {
      return this.confirmPasswordReset(body);
    }

    // Hồ sơ của chính người đang đăng nhập (API v0.4 mục 2.2).
    if (path === '/api/profile') {
      if (m === 'GET') return this.getProfile();
      if (m === 'PUT') return this.updateProfile(body);
    }
    if (path === '/api/profile/avatar' && m === 'POST') {
      return this.uploadAvatar();
    }

    if (path === '/api/admin/airlines' && m === 'GET') {
      return this.listAirlines(url);
    }
    if (path === '/api/admin/airlines' && m === 'POST') {
      return this.createAirline(body);
    }

    // Thao tác hàng loạt (API v0.4 mục 2.10) — phải đứng TRƯỚC regex `/{id}`,
    // nếu không "bulk" không khớp `\d+` và request rơi ra mạng thật.
    if (path === '/api/admin/airlines/bulk') {
      if (m === 'PATCH') return this.bulkAirlines(body, true);
      if (m === 'DELETE') return this.bulkAirlines(body, false);
    }

    const idMatch = path.match(/^\/api\/admin\/airlines\/(\d+)$/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      if (m === 'GET') return this.getAirline(id);
      if (m === 'PUT') return this.updateAirline(id, body);
      if (m === 'DELETE') return this.deleteAirline(id);
    }

    // RBAC chỉ đọc — trả mảng trần, không phân trang (BR-LIST-05).
    if (path === '/api/admin/roles' && m === 'GET') {
      return ok(ROLES_MOCK);
    }
    if (path === '/api/admin/permissions' && m === 'GET') {
      return this.listPermissions(url);
    }

    // Người dùng (ADMIN) — API v0.2 mục 2.3.
    if (path === '/api/admin/users' && m === 'GET') {
      return this.listUsers(url);
    }
    if (path === '/api/admin/users' && m === 'POST') {
      return this.createUser(body);
    }
    // Đặt reset-password TRƯỚC regex `/{id}` — nếu không, `\d+` không khớp
    // "2/reset-password" nhưng thứ tự rõ ràng giúp đọc code không phải suy luận.
    const resetMatch = path.match(/^\/api\/admin\/users\/(\d+)\/reset-password$/);
    if (resetMatch && m === 'POST') {
      return this.resetPassword(Number(resetMatch[1]));
    }
    const userMatch = path.match(/^\/api\/admin\/users\/(\d+)$/);
    if (userMatch) {
      const id = Number(userMatch[1]);
      if (m === 'GET') return this.getUser(id);
      if (m === 'PUT') return this.updateUser(id, body);
      if (m === 'DELETE') return this.deleteUser(id);
    }

    // Sơ đồ ghế của máy bay — API v0.2 mục 2.6.
    const seatMapMatch = path.match(/^\/api\/admin\/aircrafts\/(\d+)\/seat-map$/);
    if (seatMapMatch) {
      const aircraftId = Number(seatMapMatch[1]);
      if (m === 'GET') return this.getSeatMap(aircraftId);
      if (m === 'PUT') return this.saveSeatMap(aircraftId, body);
    }

    // Ví voucher của khách — API v0.2 mục 2.8.
    if (path === '/api/voucher-store' && m === 'GET') {
      return this.voucherStore();
    }
    if (path === '/api/my-vouchers' && m === 'GET') {
      return this.myVouchers(url);
    }
    const claimMatch = path.match(/^\/api\/vouchers\/(\d+)\/claim$/);
    if (claimMatch && m === 'POST') {
      return this.claimVoucher(Number(claimMatch[1]));
    }

    // Thông báo in-app — 00-nghiep-vu-thong-bao.md.
    if (path === '/api/notifications' && m === 'GET') {
      return this.listNotifications(url);
    }
    if (path === '/api/notifications/unread-count' && m === 'GET') {
      return this.getUnreadNotificationCount();
    }
    if (path === '/api/notifications/read-all' && m === 'PATCH') {
      return this.markAllNotificationsRead();
    }
    const notifReadMatch = path.match(/^\/api\/notifications\/(\d+)\/read$/);
    if (notifReadMatch && m === 'PATCH') {
      return this.markNotificationRead(Number(notifReadMatch[1]));
    }

    // Checkout, Payment, E-Ticket (Cụm B6) & Quản lý đặt chỗ Khách / Admin (Cụm DA3).
    if (path === '/api/public/flights/search' && m === 'GET') {
      return this.searchPublicFlights(url);
    }
    if (path === '/api/bookings' && m === 'GET') {
      return this.listBookings(url);
    }
    const bookingCancelMatch = path.match(/^\/api\/bookings\/(\d+)\/cancel$/);
    if (bookingCancelMatch && m === 'POST') {
      return this.cancelBooking(Number(bookingCancelMatch[1]), body);
    }
    if (path === '/api/admin/bookings' && m === 'GET') {
      return this.listBookings(url);
    }
    const adminBookingCancelMatch = path.match(/^\/api\/admin\/bookings\/(\d+)\/cancel$/);
    if (adminBookingCancelMatch && m === 'POST') {
      return this.cancelBooking(Number(adminBookingCancelMatch[1]), body);
    }
    const adminBookingDetailMatch = path.match(/^\/api\/admin\/bookings\/(\d+)$/);
    if (adminBookingDetailMatch && m === 'GET') {
      return this.getBookingById(Number(adminBookingDetailMatch[1]));
    }
    const bookingDetailMatch = path.match(/^\/api\/bookings\/(\d+)$/);
    if (bookingDetailMatch && m === 'GET') {
      return this.getBookingById(Number(bookingDetailMatch[1]));
    }
    const bookingVoucherMatch = path.match(/^\/api\/bookings\/(\d+)\/voucher$/);
    if (bookingVoucherMatch) {
      if (m === 'POST') return this.applyMockVoucher(body);
      if (m === 'DELETE') return this.removeMockVoucher();
    }
    const bookingPayMatch = path.match(/^\/api\/bookings\/(\d+)\/payments$/);
    if (bookingPayMatch && m === 'POST') {
      return this.createMockPayment(body);
    }
    const bookingEticketMatch = path.match(/^\/api\/bookings\/(\d+)\/e-tickets$/);
    if (bookingEticketMatch && m === 'GET') {
      return ok(buildMockETickets(this.mockBooking));
    }
    const payosSyncMatch = path.match(/^\/api\/payments\/(\d+)\/payos\/sync$/);
    if (payosSyncMatch && m === 'POST') {
      return ok({ paid: this.mockBooking.status === 'CONFIRMED' });
    }
    const paymentGetMatch = path.match(/^\/api\/payments\/(\d+)$/);
    if (paymentGetMatch && m === 'GET') {
      const found = this.mockPayments.find((p) => p.id === Number(paymentGetMatch[1]));
      return found ? ok(found) : notFound('Giao dịch thanh toán không tồn tại');
    }

    // Dashboard & Reports (Cụm B6).
    if (path === '/api/admin/dashboard/operational' && m === 'GET') {
      return ok(OPERATIONAL_DASHBOARD_MOCK);
    }
    if ((path === '/api/admin/dashboard' || path === '/api/admin/dashboard/overview' || path === '/api/admin/reports') && m === 'GET') {
      return ok(OVERVIEW_DASHBOARD_MOCK);
    }

    // Quản trị Chuyến bay, Giá bán & Tồn ghế (Cụm DA2).
    if (path === '/api/admin/flights') {
      if (m === 'GET') return this.listFlights(url);
      if (m === 'POST') return this.createFlight(body);
    }
    const flightActivateMatch = path.match(/^\/api\/admin\/flights\/(\d+)\/(activate|deactivate)$/);
    if (flightActivateMatch && m === 'POST') {
      return this.toggleFlightSales(
        Number(flightActivateMatch[1]),
        flightActivateMatch[2] === 'activate' ? 'OPEN' : 'CLOSED',
      );
    }
    const flightSeatInvMatch = path.match(/^\/api\/admin\/flights\/(\d+)\/(seat-map|seat-inventory)$/);
    if (flightSeatInvMatch) {
      const flightId = Number(flightSeatInvMatch[1]);
      if (m === 'GET') return this.getFlightSeatMap(flightId);
      if (m === 'PUT') return this.saveFlightSeatInventory(flightId, body);
    }
    const flightSeatBlockMatch = path.match(/^\/api\/admin\/flight-seats\/(\d+)\/(block|unblock)$/);
    if (flightSeatBlockMatch && m === 'POST') {
      return this.toggleFlightSeatBlock(
        Number(flightSeatBlockMatch[1]),
        flightSeatBlockMatch[2] === 'block',
      );
    }
    const flightIdMatch = path.match(/^\/api\/admin\/flights\/(\d+)$/);
    if (flightIdMatch) {
      const id = Number(flightIdMatch[1]);
      if (m === 'GET') return this.getFlightDetail(id);
      if (m === 'PUT') return this.updateFlight(id, body);
      if (m === 'DELETE') return this.deleteFlight(id);
    }
    if (path === '/api/admin/flight-fares') {
      if (m === 'GET') return this.listFlightFares(url);
      if (m === 'POST') return this.createFlightFare(body);
    }
    const flightFareIdMatch = path.match(/^\/api\/admin\/flight-fares\/(\d+)$/);
    if (flightFareIdMatch) {
      const id = Number(flightFareIdMatch[1]);
      if (m === 'GET') return this.getFlightFare(id);
      if (m === 'PUT') return this.updateFlightFare(id, body);
      if (m === 'DELETE') return this.deleteFlightFare(id);
    }

    // Các module master data dùng chung một lớp tài nguyên tổng quát.
    for (const resource of this.resources) {
      const result = resource.handle(m, url, body);
      if (result !== undefined) {
        return result;
      }
    }

    // Vùng khách (`/api/public/**`) — chỉ đọc, ánh xạ sang tài nguyên admin
    // tương ứng rồi lọc bản ghi đang hoạt động. Mock giữ một nguồn dữ liệu duy
    // nhất nên sửa bên admin thấy ngay bên public, đúng như DB thật.
    if (m === 'GET' && path.startsWith('/api/public/')) {
      // Danh mục tin trả MẢNG TRẦN `{id, name}`, không phân trang và không lộ
      // description/status (API v0.4 mục 2.11) — không đi qua `handlePublic`.
      if (path === '/api/public/news-categories') {
        const categories = this.resources.find((r) => r.matchesPath('admin/news-categories'));
        const envelope = categories?.handle('GET', '/api/admin/news-categories?size=100');
        const rows = (envelope as ApiResponse<PageData<NewsCategory>> | undefined)?.data.items ?? [];
        return ok(
          rows
            .filter((c) => c.status === 'ACTIVE')
            .map((c) => ({ id: c.id, name: c.name })),
        );
      }
      return this.handlePublic(path.replace('/api/public/', ''), url);
    }

    return undefined;
  }

  /** Đọc vùng khách: dùng lại tài nguyên admin, chỉ trả bản ghi đang hoạt động. */
  private handlePublic(resourcePath: string, url: string): unknown {
    // Tách '/news/99' → tài nguyên 'news' + id 99; '/news' → chỉ tài nguyên.
    const [name, idPart] = resourcePath.split('/');
    const resource = this.resources.find((r) => r.matchesPath(`admin/${name}`));
    if (!resource) {
      return undefined;
    }
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    const adminPath = `/api/admin/${name}${idPart ? `/${idPart}` : ''}${query}`;
    const result = resource.handle('GET', adminPath, undefined);
    if (result === undefined) {
      return undefined;
    }

    // News dùng `status` = DRAFT/PUBLISHED/UNPUBLISHED; các module khác dùng
    // ACTIVE/INACTIVE. Khách chỉ thấy bài PUBLISHED.
    const visible = (r: { status?: string }) =>
      name === 'news' ? r.status === 'PUBLISHED' : r.status === 'ACTIVE';

    // Chi tiết: bản ghi đã tắt coi như không tồn tại (đúng như backend).
    if (idPart) {
      const envelope = result as ApiResponse<{ status?: string }>;
      if (!envelope.data || !visible(envelope.data)) {
        return notFound('Không tìm thấy tài nguyên');
      }
      return envelope;
    }

    const envelope = result as ApiResponse<PageData<{ status?: string }>>;
    envelope.data.items = envelope.data.items.filter(visible);
    envelope.data.pagination.total_items = envelope.data.items.length;
    return envelope;
  }

  private alive(): Airline[] {
    // Xóa mềm: bản ghi vẫn nằm trong mảng nhưng không được lộ ra ngoài.
    return this.airlines.filter((a) => !this.deletedAirlines.has(a.id));
  }

  private login(body: unknown): unknown {
    const payload = (body ?? {}) as { email?: string; password?: string };
    const found = findMockUser(payload.email ?? '');

    // Sai email hoặc mật khẩu -> cùng một mã lỗi, không tiết lộ cái nào sai.
    if (!found || payload.password !== MOCK_PASSWORD) {
      return { code: 1007, message: 'Email hoặc mật khẩu không đúng', data: null };
    }
    // Mỗi lần đăng nhập lấy lại hồ sơ từ seed: sửa hồ sơ ở phiên trước không
    // được rò sang phiên sau (mock không có DB để phân biệt).
    this.profileUser = { ...found };
    return ok(buildLoginResponse(found), 'Đăng nhập thành công');
  }

  // ---------- Hồ sơ cá nhân — API v0.4 mục 2.2 ----------

  /**
   * User đang đăng nhập.
   *
   * Ưu tiên `profileUser` (đặt ở lần login trong phiên này); nếu trống — vừa
   * tải lại trang, mock mất state nhưng localStorage vẫn giữ phiên — thì đọc
   * user đã lưu để trả đúng người, không rơi về tài khoản khách mẫu.
   */
  private currentProfile(): AuthenticatedUser {
    if (!this.profileUser) {
      this.profileUser =
        readStoredUser<AuthenticatedUser>() ?? { ...findMockUser('customer@demo.local')! };
    }
    return this.profileUser;
  }

  private getProfile(): unknown {
    return ok(this.currentProfile());
  }

  /** Chỉ `full_name`, `phone`, `avatar_url` sửa được; field khác bị bỏ qua. */
  private updateProfile(body: unknown): unknown {
    const p = (body ?? {}) as { full_name?: string; phone?: string; avatar_url?: string };
    const user = this.currentProfile();

    if (p.full_name !== undefined && p.full_name.trim() !== '') {
      user.full_name = p.full_name.trim();
    }
    if (p.phone !== undefined) {
      user.phone = p.phone.trim() === '' ? null : p.phone.trim();
    }
    if (p.avatar_url !== undefined) {
      user.avatar_url = p.avatar_url.trim() === '' ? null : p.avatar_url.trim();
    }
    return ok(user, 'Cập nhật hồ sơ thành công');
  }

  /**
   * Upload avatar — mock không nhận multipart nên trả về một URL cố định.
   * BE thật đẩy file lên Cloudinary rồi trả URL công khai.
   */
  private uploadAvatar(): unknown {
    const user = this.currentProfile();
    user.avatar_url = 'https://res.cloudinary.com/demo/image/upload/avatar-mock.png';
    return ok({ avatar_url: user.avatar_url }, 'Cập nhật ảnh đại diện thành công');
  }

  // ---------- Mật khẩu ----------

  /** Sai mật khẩu hiện tại → 1007 (API v0.4 mục 2.1). */
  private changePassword(body: unknown): unknown {
    const p = (body ?? {}) as { current_password?: string; new_password?: string };
    if ((p.current_password ?? '') !== MOCK_PASSWORD) {
      return { code: 1007, message: 'Mật khẩu hiện tại không đúng', data: null };
    }
    if ((p.new_password ?? '').length < 8) {
      return businessError('Mật khẩu phải từ 8 đến 100 ký tự');
    }
    return ok(null, 'Đổi mật khẩu thành công');
  }

  /**
   * Luôn trả 200 với message trung tính — KHÔNG tiết lộ email có tồn tại hay
   * không (chống dò tài khoản). `reset_token` chỉ có khi email khớp, đúng như
   * MVP của backend.
   */
  private requestPasswordReset(body: unknown): unknown {
    const email = ((body ?? {}) as { email?: string }).email?.trim().toLowerCase() ?? '';
    const found = findMockUser(email);
    let token: string | null = null;
    if (found) {
      token = `mock-reset-${this.resetTokenSeq++}`;
      this.resetTokens.set(token, email);
    }
    return ok({ reset_token: token }, 'Nếu email tồn tại, hướng dẫn đã được gửi');
  }

  /** Token sai/hết hạn → 1006 (BUSINESS_RULE_VIOLATION). */
  private confirmPasswordReset(body: unknown): unknown {
    const p = (body ?? {}) as { token?: string; new_password?: string };
    const token = p.token?.trim() ?? '';
    if (!this.resetTokens.has(token)) {
      return businessError('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }
    if ((p.new_password ?? '').length < 8) {
      return businessError('Mật khẩu phải từ 8 đến 100 ký tự');
    }
    // Token dùng một lần: xác nhận xong là hủy, giống backend.
    this.resetTokens.delete(token);
    return ok(null, 'Đặt lại mật khẩu thành công');
  }

  /**
   * Quyền — lọc theo `keyword` (permission_key hoặc description) và `module`,
   * đúng whitelist API v0.2 mục 2.4. Trả mảng trần, không phân trang.
   */
  private listPermissions(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const module = params.get('module') ?? '';

    let rows = PERMISSIONS_MOCK;
    if (keyword) {
      rows = rows.filter(
        (p) =>
          p.permission_key.toLowerCase().includes(keyword) ||
          (p.description ?? '').toLowerCase().includes(keyword),
      );
    }
    if (module) {
      rows = rows.filter((p) => p.module === module);
    }
    return ok(rows);
  }

  // ---------- Người dùng (ADMIN) — API v0.2 mục 2.3 ----------

  /** Bản ghi chưa xóa mềm — mọi truy vấn phải lọc qua đây (BR-LIST-04). */
  private aliveUsers(): AdminUser[] {
    return this.users.filter((u) => !this.deletedUsers.has(u.id));
  }

  private listUsers(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const status = params.get('status');
    const role = params.get('role') ?? '';

    let rows = this.aliveUsers();
    if (keyword) {
      rows = rows.filter(
        (u) =>
          u.email.toLowerCase().includes(keyword) ||
          u.full_name.toLowerCase().includes(keyword) ||
          (u.phone ?? '').includes(keyword),
      );
    }
    if (status !== null) {
      rows = rows.filter((u) => u.status === status);
    }
    if (role) {
      rows = rows.filter((u) => u.roles.includes(role as AdminUser['roles'][number]));
    }

    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getUser(id: number): unknown {
    const found = this.aliveUsers().find((u) => u.id === id);
    return found ? ok(found) : notFound('Không tìm thấy người dùng');
  }

  private createUser(body: unknown): unknown {
    const p = (body ?? {}) as Partial<AdminUserCreatePayload>;
    const email = (p.email ?? '').trim().toLowerCase();
    if (!email) {
      return businessError('Email không được để trống');
    }
    if (this.aliveUsers().some((u) => u.email === email)) {
      return duplicate(`Email "${email}" đã tồn tại`);
    }

    const now = new Date().toISOString();
    const created: AdminUser = {
      id: this.nextId++,
      email,
      full_name: p.full_name ?? '',
      phone: p.phone ?? null,
      avatar_url: null,
      status: p.status ?? 'ACTIVE',
      // DB v0.4: một user một role. Payload là mảng nhưng chỉ phần tử đầu có nghĩa.
      roles: p.roles?.length ? p.roles : ['CUSTOMER'],
      created_at: now,
    };
    this.users.push(created);
    return ok(created, 'Tạo người dùng thành công');
  }

  private updateUser(id: number, body: unknown): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) {
      return notFound('Không tìm thấy người dùng');
    }

    const p = (body ?? {}) as Partial<AdminUserUpdatePayload>;
    const nextRoles = p.roles?.length ? p.roles : target.roles;
    const nextActive = p.status ?? target.status;

    if (this.wouldLoseLastAdmin(target, nextRoles, nextActive === 'ACTIVE')) {
      return businessError(
        'Không thể hạ quyền hoặc ngừng hoạt động tài khoản ADMIN đang hoạt động cuối cùng',
      );
    }

    Object.assign(target, {
      full_name: p.full_name ?? target.full_name,
      phone: p.phone ?? target.phone,
      status: nextActive,
      roles: nextRoles,
    });
    return ok(target, 'Cập nhật thành công');
  }

  /** Xóa mềm (USR-05): ẩn khỏi danh sách nhưng giữ bản ghi — chỉ tra lịch sử. */
  private deleteUser(id: number): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) {
      return notFound('Không tìm thấy người dùng');
    }
    if (this.wouldLoseLastAdmin(target, ['CUSTOMER'], false)) {
      return businessError('Không thể xóa tài khoản ADMIN đang hoạt động cuối cùng');
    }

    this.deletedUsers.add(id);
    target.status = 'INACTIVE';
    return ok(null, 'Đã xóa người dùng');
  }

  /**
   * Ràng buộc chống leo thang đặc quyền (API v0.2 mục 2.3): hệ thống phải luôn
   * còn ít nhất một ADMIN đang hoạt động. Trả `true` nếu thao tác sẽ làm mất
   * ADMIN cuối cùng.
   *
   * Dùng chung cho cả `updateUser` và `deleteUser` vì hai đường khác nhau nhưng
   * cùng một ràng buộc — viết hai lần thì dễ lệch.
   */
  private wouldLoseLastAdmin(
    target: AdminUser,
    nextRoles: AdminUser['roles'],
    nextActive: boolean,
  ): boolean {
    const wasActiveAdmin = target.roles.includes('ADMIN') && target.status === 'ACTIVE';
    const stillActiveAdmin = nextRoles.includes('ADMIN') && nextActive;
    if (!wasActiveAdmin || stillActiveAdmin) {
      return false;
    }

    const otherActiveAdmins = this.aliveUsers().filter(
      (u) => u.id !== target.id && u.status === 'ACTIVE' && u.roles.includes('ADMIN'),
    );
    return otherActiveAdmins.length === 0;
  }

  /**
   * Đặt lại mật khẩu — trả mật khẩu TẠM.
   *
   * CHỜ BE CHỐT (API v0.2 mục 5, open item #5): "trả mật khẩu tạm hay gửi email?".
   * Tạm làm theo phần mô tả endpoint ở mục 2.3 ("trả mật khẩu tạm"). Nếu Bình
   * chốt gửi email thì đổi chỗ này thành `ok(null, ...)` và bỏ khối hiện mật
   * khẩu trong `user-form.html`.
   */
  private resetPassword(id: number): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) {
      return notFound('Không tìm thấy người dùng');
    }
    const temp = `Temp@${String(this.temporaryPasswordSeq++).padStart(5, '0')}`;
    return ok({ temporary_password: temp }, 'Đã đặt lại mật khẩu');
  }

  // ---------- Ví voucher của khách — API v0.2 mục 2.8 ----------

  /**
   * Kho voucher — chỉ GLOBAL, đang hiệu lực, còn lượt nhận (API v0.2 mục 2.8).
   *
   * Voucher ASSIGNED KHÔNG vào kho: loại đó ADMIN tặng riêng, khách không tự
   * nhận. Kèm cờ `claimed` để FE chọn hiện nút Nhận hay nhãn Đã nhận.
   */
  private voucherStore(): unknown {
    const today = new Date().toISOString().slice(0, 10);
    const claimedIds = new Set(this.userVouchers.map((uv) => uv.voucher.id));

    const items: VoucherStoreItem[] = VOUCHERS_MOCK.filter(
      (v) =>
        v.distribution_type === 'GLOBAL' &&
        v.status === 'ACTIVE' &&
        v.start_date <= today &&
        v.end_date >= today &&
        (v.claim_limit === null || v.claimed_count < v.claim_limit),
    ).map((v) => ({ ...v, claimed: claimedIds.has(v.id) }));

    return ok(items);
  }

  private myVouchers(url: string): unknown {
    const params = readParams(url);
    const status = params.get('status') ?? '';
    const rows = status ? this.userVouchers.filter((v) => v.status === status) : this.userVouchers;
    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  /**
   * Nhận voucher — mô phỏng đúng ràng buộc Backend (API v0.2 mục 2.8):
   *   - voucher ASSIGNED không nhận được → `1006`
   *   - hết lượt → `1006`
   *   - đã nhận rồi → `1005` (UNIQUE `user_id` + `voucher_id`)
   *
   * Thứ tự kiểm tra quan trọng: kiểm ASSIGNED trước hết lượt, vì voucher
   * ASSIGNED thường `claim_limit = null` (không giới hạn) — nếu kiểm lượt trước
   * thì nó lọt qua và khách nhận được voucher lẽ ra chỉ ADMIN tặng.
   */
  private claimVoucher(voucherId: number): unknown {
    const voucher = VOUCHERS_MOCK.find((v) => v.id === voucherId);
    if (!voucher) {
      return notFound('Không tìm thấy voucher');
    }
    if (voucher.distribution_type !== 'GLOBAL') {
      return businessError('Voucher này do hệ thống tặng riêng, không tự nhận được');
    }
    if (this.userVouchers.some((uv) => uv.voucher.id === voucherId)) {
      return duplicate('Bạn đã nhận voucher này rồi');
    }
    if (voucher.claim_limit !== null && voucher.claimed_count >= voucher.claim_limit) {
      return businessError('Voucher đã hết lượt nhận');
    }

    voucher.claimed_count += 1;
    const created: UserVoucher = {
      id: this.userVoucherIdSeq++,
      status: 'AVAILABLE',
      source: 'CLAIMED',
      received_at: new Date().toISOString(),
      // Chép hạn của voucher lúc nhận (DB v0.4 ghi rõ lý do).
      expires_at: `${voucher.end_date}T16:59:59Z`,
      used_at: null,
      voucher: toVoucherBrief(voucher),
    };
    this.userVouchers.push(created);
    return ok({ user_voucher_id: created.id, status: created.status }, 'Đã nhận voucher');
  }

  // ---------- Sơ đồ ghế — API v0.2 mục 2.6 ----------

  /** Máy bay theo id, chỉ tính bản ghi chưa xóa mềm. */
  private aircraftById(id: number): Aircraft | undefined {
    return AIRCRAFT_MOCK.find((a) => a.id === id && !this.deletedAircraft.has(a.id));
  }

  private getSeatMap(aircraftId: number): unknown {
    const aircraft = this.aircraftById(aircraftId);
    if (!aircraft) {
      return notFound('Không tìm thấy máy bay');
    }
    return ok(this.seatMapPayload(aircraftId, aircraft));
  }

  /**
   * Dựng `data` của seat-map — tách khỏi `getSeatMap` vì `saveSeatMap` cũng cần
   * phần này để trả về sơ đồ vừa lưu. Nếu `saveSeatMap` gọi thẳng `getSeatMap`
   * thì envelope bị bọc hai lớp (`data.code`, `data.data`), và client đọc
   * `res.data.configured_seats` sẽ ra `undefined`.
   */
  private seatMapPayload(aircraftId: number, aircraft: Aircraft): SeatMap {
    const seats = this.seatMaps.get(aircraftId) ?? [];
    return {
      aircraft_id: aircraftId,
      seat_capacity: aircraft.seat_capacity,
      configured_seats: seats.length,
      // API trả kèm loại ghế lồng trong từng ghế — màn cấu hình cần tên loại để
      // hiện, không chỉ id. Dùng `undefined` khi không tìm thấy (không phải
      // `null`) vì `AircraftSeat.seat_type` khai `SeatType | undefined`.
      seats: seats.map((s) => ({
        ...s,
        seat_type: SEAT_TYPES_MOCK.find((t) => t.id === s.seat_type_id),
      })),
    };
  }

  private saveSeatMap(aircraftId: number, body: unknown): unknown {
    const aircraft = this.aircraftById(aircraftId);
    if (!aircraft) {
      return notFound('Không tìm thấy máy bay');
    }

    const seats = ((body ?? {}) as { seats?: AircraftSeat[] }).seats ?? [];

    // Ràng buộc 1: không trùng (seat_row, seat_column) — UNIQUE trong DB v0.4.
    const seen = new Set<string>();
    for (const s of seats) {
      const key = `${s.seat_row}-${s.seat_column}`;
      if (seen.has(key)) {
        return businessError(`Ghế ${s.seat_row}${s.seat_column} bị lặp trong sơ đồ`);
      }
      seen.add(key);
    }

    // Ràng buộc 2: loại ghế phải tồn tại VÀ đang bật. Loại ghế đã tắt vẫn còn
    // trong danh mục nên phải kiểm tra `status`, không chỉ tồn tại.
    for (const s of seats) {
      const type = SEAT_TYPES_MOCK.find((t) => t.id === s.seat_type_id);
      if (!type) {
        return notFound(`Loại ghế id ${s.seat_type_id} không tồn tại`);
      }
      if (type.status !== 'ACTIVE') {
        return businessError(`Loại ghế "${type.seat_type_name}" đang tắt, không dùng được`);
      }
    }

    // Ràng buộc 3: tổng số ghế phải KHỚP CHÍNH XÁC sức chứa. DB v0.4 yêu cầu khớp
    // đúng, không phải "không vượt" — thiếu ghế cũng là sơ đồ sai.
    if (seats.length !== aircraft.seat_capacity) {
      return businessError(
        `Sơ đồ có ${seats.length} ghế nhưng máy bay cần đúng ${aircraft.seat_capacity} ghế`,
      );
    }

    this.seatMaps.set(
      aircraftId,
      seats.map((s) => ({ ...s, id: s.id ?? this.seatIdSeq++ })),
    );
    return ok(this.seatMapPayload(aircraftId, aircraft), 'Đã lưu sơ đồ ghế');
  }

  private listAirlines(url: string): unknown {    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const status = params.get('status');

    let rows = this.alive();
    if (keyword) {
      rows = rows.filter(
        (a) =>
          a.airline_name.toLowerCase().includes(keyword) ||
          a.airline_code.toLowerCase().includes(keyword),
      );
    }
    if (status !== null) {
      rows = rows.filter((a) => a.status === status);
    }

    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getAirline(id: number): unknown {
    const found = this.alive().find((a) => a.id === id);
    return found ? ok(found) : notFound('Không tìm thấy hãng hàng không');
  }

  private createAirline(body: unknown): unknown {
    const payload = (body ?? {}) as Partial<Airline>;
    const code = (payload.airline_code ?? '').trim().toUpperCase();

    if (!code) {
      return businessError('Mã hãng hàng không không được để trống');
    }
    if (this.alive().some((a) => a.airline_code === code)) {
      return duplicate(`Mã hãng "${code}" đã tồn tại`);
    }

    const created: Airline = {
      id: this.nextId++,
      airline_code: code,
      airline_name: payload.airline_name ?? '',
      country: payload.country ?? null,
      logo_url: payload.logo_url ?? null,
      status: payload.status ?? 'ACTIVE',
    };
    this.airlines.push(created);
    return ok(created, 'Tạo hãng hàng không thành công');
  }

  private updateAirline(id: number, body: unknown): unknown {
    const target = this.alive().find((a) => a.id === id);
    if (!target) {
      return notFound('Không tìm thấy hãng hàng không');
    }

    const payload = (body ?? {}) as Partial<Airline>;
    const code = (payload.airline_code ?? target.airline_code).trim().toUpperCase();

    if (this.alive().some((a) => a.airline_code === code && a.id !== id)) {
      return duplicate(`Mã hãng "${code}" đã tồn tại`);
    }

    Object.assign(target, {
      airline_code: code,
      airline_name: payload.airline_name ?? target.airline_name,
      country: payload.country ?? target.country,
      logo_url: payload.logo_url ?? target.logo_url,
      status: payload.status ?? target.status,
    });
    return ok(target, 'Cập nhật thành công');
  }

  private deleteAirline(id: number): unknown {
    const target = this.alive().find((a) => a.id === id);
    if (!target) {
      return notFound('Không tìm thấy hãng hàng không');
    }
    // Xóa mềm: ẩn khỏi danh sách, khác với tắt hoạt động (`status`).
    this.deletedAirlines.add(id);
    return ok(null, 'Đã xóa hãng hàng không');
  }

  /**
   * Thao tác hàng loạt trên airline — `PATCH`/`DELETE /api/admin/airlines/bulk`.
   * Trả kết quả TỪNG PHẦN giống backend: id không tồn tại vào `failed`.
   */
  private bulkAirlines(body: unknown, toggle: boolean): unknown {
    const ids = ((body ?? {}) as { ids?: number[]; status?: string }).ids ?? [];
    const status = (((body ?? {}) as { status?: string }).status ?? 'ACTIVE') as Airline['status'];
    const succeeded: number[] = [];
    const failed: { id: number; code: number; message: string }[] = [];

    for (const id of ids) {
      const target = this.alive().find((a) => a.id === id);
      if (!target) {
        failed.push({ id, code: 1004, message: 'Không tìm thấy hãng hàng không' });
        continue;
      }
      if (toggle) {
        target.status = status;
      } else {
        this.deletedAirlines.add(id);
      }
      succeeded.push(id);
    }
    return ok({ succeeded, failed }, 'Thao tác hàng loạt hoàn tất');
  }

  // ---------- Thông báo In-App — 00-nghiep-vu-thong-bao.md ----------

  private listNotifications(url: string): unknown {
    const params = readParams(url);
    const unreadParam = params.get('unread');
    let rows = [...this.notifications].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    if (unreadParam === 'true') {
      rows = rows.filter((n) => !n.is_read);
    }
    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getUnreadNotificationCount(): unknown {
    const unreadCount = this.notifications.filter((n) => !n.is_read).length;
    return ok({ unread_count: unreadCount });
  }

  private markNotificationRead(id: number): unknown {
    const target = this.notifications.find((n) => n.id === id);
    if (!target) {
      return notFound('Không tìm thấy thông báo');
    }
    if (!target.is_read) {
      target.is_read = true;
      target.read_at = new Date().toISOString();
    }
    return ok(target, 'Đã đánh dấu đã đọc');
  }

  private markAllNotificationsRead(): unknown {
    const now = new Date().toISOString();
    for (const item of this.notifications) {
      if (!item.is_read) {
        item.is_read = true;
        item.read_at = now;
      }
    }
    return ok(null, 'Đã đánh dấu tất cả thông báo là đã đọc');
  }

  // ---------- Checkout, Payment & E-Ticket (Cụm B6) ----------

  private applyMockVoucher(body: unknown): unknown {
    const payload = (body ?? {}) as { user_voucher_id?: number };
    const uv = this.userVouchers.find((v) => v.id === payload.user_voucher_id);
    const discount = uv ? 150000 : 100000;
    this.mockBooking = {
      ...this.mockBooking,
      voucher_discount_amount: discount,
      total_amount: Math.max(
        0,
        this.mockBooking.fare_amount -
          this.mockBooking.promotion_discount_amount -
          discount +
          this.mockBooking.seat_surcharge_amount +
          this.mockBooking.baggage_amount,
      ),
      applied_voucher: {
        user_voucher_id: payload.user_voucher_id ?? 1,
        voucher_id: uv?.voucher.id ?? 1,
        voucher_code: uv?.voucher.voucher_code ?? 'HE2026',
        voucher_name: uv?.voucher.voucher_name ?? 'Voucher Ưu đãi Hè 2026',
        discount_amount: discount,
        status: 'RESERVED',
      },
    };
    return ok(this.mockBooking, 'Đã áp dụng voucher');
  }

  private removeMockVoucher(): unknown {
    this.mockBooking = {
      ...this.mockBooking,
      voucher_discount_amount: 0,
      total_amount:
        this.mockBooking.fare_amount -
        this.mockBooking.promotion_discount_amount +
        this.mockBooking.seat_surcharge_amount +
        this.mockBooking.baggage_amount,
      applied_voucher: null,
    };
    return ok(this.mockBooking, 'Đã gỡ voucher');
  }

  private createMockPayment(body: unknown): unknown {
    const req = (body ?? {}) as PaymentCreateRequest;
    const id = this.paymentIdSeq++;
    const isSuccess = req.simulate_result === 'SUCCESS';
    const isFailed = req.simulate_result === 'FAILED';
    const method = (req.payment_method ?? 'VNPAY').toUpperCase();
    if (isSuccess) {
      this.mockBooking = {
        ...this.mockBooking,
        status: 'CONFIRMED',
        seat_holds: this.mockBooking.seat_holds.map((h) => ({ ...h, status: 'CONFIRMED' })),
      };
    }
    const txn: PaymentTransaction = {
      id,
      booking_id: this.mockBooking.id,
      booking_code: this.mockBooking.booking_code,
      booking_status: this.mockBooking.status,
      amount: this.mockBooking.total_amount,
      currency: this.mockBooking.currency,
      payment_method: method === 'PAYOS' || method === 'VIETQR' ? 'BANK_TRANSFER' : method,
      gateway_name: method === 'VNPAY' ? 'VNPAY' : 'PAYOS',
      gateway_transaction_id: isSuccess ? `MOCK-${method}-${id}` : null,
      status: isSuccess ? 'SUCCESS' : isFailed ? 'FAILED' : 'PENDING',
      retry_count: this.mockPayments.length,
      payment_url:
        method === 'VNPAY'
          ? `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${this.mockBooking.booking_code}-${id}`
          : null,
      viet_qr:
        method === 'VNPAY'
          ? null
          : {
              bank_name: 'Vietcombank — CN TP. Hồ Chí Minh',
              account_number: '1029384756',
              account_holder: 'CONG TY CO PHAN HANG KHONG VINAFLY',
              amount: this.mockBooking.total_amount,
              transfer_content: `VINAFLY ${this.mockBooking.booking_code}`,
              qr_image_url: `https://img.vietqr.io/image/VCB-1029384756-compact2.png?amount=${this.mockBooking.total_amount}&addInfo=VINAFLY%20${this.mockBooking.booking_code}`,
              qr_code_raw: null,
              checkout_url: null,
            },
      created_at: new Date().toISOString(),
      paid_at: isSuccess ? new Date().toISOString() : null,
    };
    this.mockPayments.push(txn);
    return ok(txn, 'Khởi tạo giao dịch thanh toán thành công');
  }

  // ---------- Quản trị Chuyến bay, Giá bán & Tồn ghế (Cụm DA2) ----------

  private aliveFlights(): FlightRecord[] {
    return this.flights.filter((f) => !this.deletedFlights.has(f.id));
  }

  private ensureFlightSeatMap(flight: FlightRecord): FlightSeatMap {
    let existing = this.flightSeatMaps.get(flight.id);
    if (!existing) {
      existing = buildMockFlightSeatMap(flight);
      this.flightSeatMaps.set(flight.id, existing);
    }
    return existing;
  }

  private listFlights(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const airlineId = params.get('airline_id');
    const depId = params.get('departure_airport_id');
    const arrId = params.get('arrival_airport_id');
    const depDate = params.get('departure_date');
    const opStatus = params.get('operation_status') ?? params.get('status');
    const salesStatus = params.get('sales_status');

    let rows = this.aliveFlights();
    if (keyword) {
      rows = rows.filter(
        (f) =>
          f.flight_number.toLowerCase().includes(keyword) ||
          f.airline.airline_name.toLowerCase().includes(keyword) ||
          f.departure_airport.airport_code.toLowerCase().includes(keyword) ||
          f.arrival_airport.airport_code.toLowerCase().includes(keyword),
      );
    }
    if (airlineId) rows = rows.filter((f) => String(f.airline.id) === airlineId);
    if (depId) rows = rows.filter((f) => String(f.departure_airport.id) === depId);
    if (arrId) rows = rows.filter((f) => String(f.arrival_airport.id) === arrId);
    if (depDate) rows = rows.filter((f) => f.scheduled_departure.startsWith(depDate));
    if (opStatus) rows = rows.filter((f) => f.operation_status === opStatus);
    if (salesStatus) rows = rows.filter((f) => f.sales_status === salesStatus);

    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getFlightDetail(id: number): unknown {
    const found = this.aliveFlights().find((f) => f.id === id);
    if (!found) return notFound('Không tìm thấy chuyến bay');
    const seatMap = this.ensureFlightSeatMap(found);
    const fares = this.flightFares.filter((ff) => ff.flight_id === id);
    const detail: FlightDetailRecord = {
      ...found,
      total_seats: seatMap.total_seats,
      available_seats: seatMap.available_seats,
      fares,
      passengers: FLIGHT_PASSENGERS_MOCK[id] ?? [],
    };
    return ok(detail);
  }

  private createFlight(body: unknown): unknown {
    const p = (body ?? {}) as Partial<FlightPayload>;
    if (!p.flight_number?.trim()) return businessError('Số hiệu chuyến bay không được để trống');
    if (p.departure_airport_id === p.arrival_airport_id) {
      return businessError('Sân bay đi và sân bay đến không được trùng nhau');
    }
    if (!p.scheduled_departure || !p.scheduled_arrival || p.scheduled_arrival <= p.scheduled_departure) {
      return businessError('Giờ đến dự kiến phải sau giờ khởi hành');
    }
    const airline = AIRLINES_MOCK.find((a) => a.id === Number(p.airline_id));
    const aircraft = AIRCRAFT_MOCK.find((a) => a.id === Number(p.aircraft_id));
    const dep = AIRPORTS_MOCK.find((a) => a.id === Number(p.departure_airport_id));
    const arr = AIRPORTS_MOCK.find((a) => a.id === Number(p.arrival_airport_id));
    if (!airline || !aircraft || !dep || !arr) {
      return businessError('Hãng bay, tàu bay hoặc sân bay không hợp lệ');
    }
    const duration = Math.max(
      30,
      Math.round(
        (new Date(p.scheduled_arrival).getTime() - new Date(p.scheduled_departure).getTime()) /
          60000,
      ),
    );
    const now = new Date().toISOString();
    const created: FlightRecord = {
      id: this.flightIdSeq++,
      flight_number: p.flight_number.trim().toUpperCase(),
      airline,
      aircraft,
      departure_airport: dep,
      arrival_airport: arr,
      scheduled_departure: p.scheduled_departure,
      scheduled_arrival: p.scheduled_arrival,
      duration_minutes: duration,
      operation_status: p.operation_status ?? 'SCHEDULED',
      sales_status: p.sales_status ?? 'OPEN',
      parent_flight_id: p.parent_flight_id ?? null,
      parent_flight_number: null,
      created_at: now,
      updated_at: now,
    };
    this.flights.unshift(created);
    return ok(created, 'Tạo chuyến bay thành công');
  }

  private updateFlight(id: number, body: unknown): unknown {
    const target = this.aliveFlights().find((f) => f.id === id);
    if (!target) return notFound('Không tìm thấy chuyến bay');
    const p = (body ?? {}) as Partial<FlightPayload>;
    if (p.departure_airport_id && p.arrival_airport_id && p.departure_airport_id === p.arrival_airport_id) {
      return businessError('Sân bay đi và sân bay đến không được trùng nhau');
    }
    const nextDep = p.scheduled_departure ?? target.scheduled_departure;
    const nextArr = p.scheduled_arrival ?? target.scheduled_arrival;
    if (nextArr <= nextDep) {
      return businessError('Giờ đến dự kiến phải sau giờ khởi hành');
    }
    const airline = p.airline_id
      ? AIRLINES_MOCK.find((a) => a.id === Number(p.airline_id)) ?? target.airline
      : target.airline;
    const aircraft = p.aircraft_id
      ? AIRCRAFT_MOCK.find((a) => a.id === Number(p.aircraft_id)) ?? target.aircraft
      : target.aircraft;
    const dep = p.departure_airport_id
      ? AIRPORTS_MOCK.find((a) => a.id === Number(p.departure_airport_id)) ?? target.departure_airport
      : target.departure_airport;
    const arr = p.arrival_airport_id
      ? AIRPORTS_MOCK.find((a) => a.id === Number(p.arrival_airport_id)) ?? target.arrival_airport
      : target.arrival_airport;

    Object.assign(target, {
      flight_number: p.flight_number ? p.flight_number.trim().toUpperCase() : target.flight_number,
      airline,
      aircraft,
      departure_airport: dep,
      arrival_airport: arr,
      scheduled_departure: nextDep,
      scheduled_arrival: nextArr,
      duration_minutes: Math.max(
        30,
        Math.round((new Date(nextArr).getTime() - new Date(nextDep).getTime()) / 60000),
      ),
      operation_status: p.operation_status ?? target.operation_status,
      sales_status: p.sales_status ?? target.sales_status,
      updated_at: new Date().toISOString(),
    });
    return ok(target, 'Cập nhật chuyến bay thành công');
  }

  private toggleFlightSales(id: number, status: 'OPEN' | 'CLOSED'): unknown {
    const target = this.aliveFlights().find((f) => f.id === id);
    if (!target) return notFound('Không tìm thấy chuyến bay');
    target.sales_status = status;
    target.updated_at = new Date().toISOString();
    return ok(target, status === 'OPEN' ? 'Mở bán chuyến bay thành công' : 'Đóng bán chuyến bay thành công');
  }

  private deleteFlight(id: number): unknown {
    const target = this.aliveFlights().find((f) => f.id === id);
    if (!target) return notFound('Không tìm thấy chuyến bay');
    this.deletedFlights.add(id);
    return ok(null, 'Đã xóa chuyến bay');
  }

  private listFlightFares(url: string): unknown {
    const params = readParams(url);
    const flightId = params.get('flight_id');
    const fareClassId = params.get('fare_class_id');
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();

    let rows = [...this.flightFares];
    if (flightId) rows = rows.filter((f) => String(f.flight_id) === flightId);
    if (fareClassId) rows = rows.filter((f) => String(f.fare_class_id) === fareClassId);
    if (keyword) {
      rows = rows.filter(
        (f) =>
          f.flight_number.toLowerCase().includes(keyword) ||
          f.fare_class_code.toLowerCase().includes(keyword) ||
          f.fare_class_name.toLowerCase().includes(keyword),
      );
    }
    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getFlightFare(id: number): unknown {
    const found = this.flightFares.find((f) => f.id === id);
    return found ? ok(found) : notFound('Không tìm thấy dòng giá vé');
  }

  private hasOverlapFare(
    flightId: number,
    fareClassId: number,
    from: string | null,
    to: string | null,
    excludeId: number | null,
  ): boolean {
    const startA = from ? new Date(from).getTime() : 0;
    const endA = to ? new Date(to).getTime() : Number.MAX_SAFE_INTEGER;
    return this.flightFares.some((f) => {
      if (f.id === excludeId || f.flight_id !== flightId || f.fare_class_id !== fareClassId) {
        return false;
      }
      const startB = f.effective_from ? new Date(f.effective_from).getTime() : 0;
      const endB = f.effective_to ? new Date(f.effective_to).getTime() : Number.MAX_SAFE_INTEGER;
      return startA < endB && startB < endA;
    });
  }

  private createFlightFare(body: unknown): unknown {
    const p = (body ?? {}) as Partial<FlightFarePayload>;
    const fl = this.aliveFlights().find((f) => f.id === Number(p.flight_id));
    const fc = FARE_CLASSES_MOCK.find((c) => c.id === Number(p.fare_class_id));
    if (!fl || !fc) return businessError('Chuyến bay hoặc hạng vé không hợp lệ');
    if (fc.airline_id !== fl.airline.id) {
      return businessError(`Hạng vé ${fc.fare_class_code} không thuộc hãng ${fl.airline.airline_code}`);
    }
    if (p.effective_from && p.effective_to && p.effective_to <= p.effective_from) {
      return businessError('Thời điểm kết thúc hiệu lực phải sau thời điểm bắt đầu');
    }
    if (this.hasOverlapFare(fl.id, fc.id, p.effective_from ?? null, p.effective_to ?? null, null)) {
      return businessError('Khoảng hiệu lực bị chồng lấn với dòng giá đã tồn tại của cùng chuyến và hạng vé');
    }
    const baseFare = Number(p.base_fare ?? 0);
    const taxFee = Number(p.tax_fee ?? 0);
    if (baseFare < 0 || taxFee < 0) return businessError('Giá cơ bản và thuế phí không được âm');

    const created: FlightFare = {
      id: this.flightFareIdSeq++,
      flight_id: fl.id,
      flight_number: fl.flight_number,
      fare_class_id: fc.id,
      fare_class_code: fc.fare_class_code,
      fare_class_name: fc.fare_class_name,
      seat_class: fc.seat_class,
      base_fare: baseFare,
      tax_fee: taxFee,
      ...computeFarePrices(baseFare, taxFee),
      currency: p.currency ?? 'VND',
      effective_from: p.effective_from ?? new Date().toISOString().slice(0, 19),
      effective_to: p.effective_to ?? null,
      created_at: new Date().toISOString(),
    };
    this.flightFares.unshift(created);
    return ok(created, 'Tạo giá vé theo chuyến thành công');
  }

  private updateFlightFare(id: number, body: unknown): unknown {
    const target = this.flightFares.find((f) => f.id === id);
    if (!target) return notFound('Không tìm thấy dòng giá vé');
    const p = (body ?? {}) as Partial<FlightFarePayload>;
    const nextFrom = p.effective_from !== undefined ? p.effective_from : target.effective_from;
    const nextTo = p.effective_to !== undefined ? p.effective_to : target.effective_to;
    if (nextFrom && nextTo && nextTo <= nextFrom) {
      return businessError('Thời điểm kết thúc hiệu lực phải sau thời điểm bắt đầu');
    }
    if (this.hasOverlapFare(target.flight_id, target.fare_class_id, nextFrom, nextTo, id)) {
      return businessError('Khoảng hiệu lực bị chồng lấn với dòng giá khác');
    }
    const baseFare = Number(p.base_fare ?? target.base_fare);
    const taxFee = Number(p.tax_fee ?? target.tax_fee);
    Object.assign(target, {
      base_fare: baseFare,
      tax_fee: taxFee,
      ...computeFarePrices(baseFare, taxFee),
      effective_from: nextFrom,
      effective_to: nextTo,
    });
    return ok(target, 'Cập nhật giá vé theo chuyến thành công');
  }

  private deleteFlightFare(id: number): unknown {
    const idx = this.flightFares.findIndex((f) => f.id === id);
    if (idx < 0) return notFound('Không tìm thấy dòng giá vé');
    this.flightFares.splice(idx, 1);
    return ok(null, 'Đã xóa dòng giá vé');
  }

  private getFlightSeatMap(flightId: number): unknown {
    const fl = this.aliveFlights().find((f) => f.id === flightId);
    if (!fl) return notFound('Không tìm thấy chuyến bay');
    return ok(this.ensureFlightSeatMap(fl));
  }

  private saveFlightSeatInventory(flightId: number, body: unknown): unknown {
    const fl = this.aliveFlights().find((f) => f.id === flightId);
    if (!fl) return notFound('Không tìm thấy chuyến bay');
    const map = this.ensureFlightSeatMap(fl);
    const req = (body ?? {}) as Partial<SeatInventoryRequestPayload>;
    for (const item of req.seats ?? []) {
      const seat = map.seats.find(
        (s) =>
          (item.flight_seat_id !== undefined && s.id === item.flight_seat_id) ||
          (item.seat_code !== undefined && s.seat_code === item.seat_code),
      );
      if (!seat) continue;
      if (item.status && (seat.status === 'BOOKED' || seat.status === 'HELD')) {
        return businessError(`Không thể đổi trạng thái ghế ${seat.seat_code} đang được đặt hoặc giữ`);
      }
      if (item.status) seat.status = item.status;
      if (item.seat_surcharge !== undefined) {
        if (item.seat_surcharge < 0) return businessError('Phụ thu ghế không được âm');
        seat.seat_surcharge = Number(item.seat_surcharge);
      }
    }
    const updated = recalcSeatMapCounts(map);
    this.flightSeatMaps.set(flightId, updated);
    return ok(updated, 'Cập nhật tồn ghế chuyến bay thành công');
  }

  private toggleFlightSeatBlock(flightSeatId: number, block: boolean): unknown {
    for (const [flightId, map] of this.flightSeatMaps.entries()) {
      const seat = map.seats.find((s) => s.id === flightSeatId);
      if (!seat) continue;
      if (seat.status === 'BOOKED' || seat.status === 'HELD') {
        return businessError(`Ghế ${seat.seat_code} đang có hành khách đặt/giữ, không thể ${block ? 'khóa' : 'mở khóa'}`);
      }
      seat.status = block ? 'BLOCKED' : 'AVAILABLE';
      this.flightSeatMaps.set(flightId, recalcSeatMapCounts(map));
      return ok(null, block ? 'Đã khóa ghế' : 'Đã mở khóa ghế');
    }
    return notFound('Không tìm thấy ghế chuyến bay');
  }

  // ---------- Luồng tìm chuyến & Quản lý đặt chỗ (Cụm DA3) ----------

  private buildInitialBookings(): BookingDetail[] {
    const primary = buildMockBookingDetail();
    const confirmed: BookingDetail = {
      ...primary,
      id: 1049,
      booking_code: 'DH-1049',
      status: 'CONFIRMED',
      total_amount: 2959000,
      fare_amount: 2790000,
      seat_surcharge_amount: 50000,
      baggage_amount: 219000,
      promotion_discount_amount: 100000,
      voucher_discount_amount: 0,
      agency_contact: {
        agency_name: 'VinaFly Domestic Booking',
        hotline: '1900 1234',
        support_email: 'hotro@vinafly.vn',
        note: 'Hệ thống không tự động hoàn tiền. Vui lòng liên hệ tổng đài đại lý để xử lý hoàn vé theo quy định hạng vé.',
      },
    };
    const pending: BookingDetail = {
      ...primary,
      id: 1055,
      booking_code: 'DH-1055',
      customer_name: 'Lê Thu Hà',
      customer_email: 'thuha@demo.local',
      status: 'PENDING_PAYMENT',
      total_amount: 1690000,
      fare_amount: 1640000,
      seat_surcharge_amount: 50000,
      baggage_amount: 0,
      promotion_discount_amount: 0,
      voucher_discount_amount: 0,
    };
    const cancelled: BookingDetail = {
      ...primary,
      id: 1038,
      booking_code: 'DH-1038',
      customer_name: 'Trần Quốc Huy',
      customer_email: 'quochuy@demo.local',
      status: 'CANCELLED',
      cancelled_at: '2026-11-18T09:15:00Z',
      cancel_reason: 'Khách thay đổi lịch công tác',
      total_amount: 2040000,
      fare_amount: 2040000,
      seat_surcharge_amount: 0,
      baggage_amount: 0,
      promotion_discount_amount: 0,
      voucher_discount_amount: 0,
    };
    return [confirmed, pending, cancelled];
  }

  private searchPublicFlights(url: string): unknown {
    const params = readParams(url);
    const dep = (params.get('departure_airport_code') ?? '').trim().toUpperCase();
    const arr = (params.get('arrival_airport_code') ?? '').trim().toUpperCase();
    const seatClass = (params.get('seat_class') ?? '').trim().toUpperCase();

    const openFlights = this.aliveFlights().filter(
      (f) => f.sales_status === 'OPEN' && f.operation_status !== 'CANCELLED',
    );

    const items = openFlights
      .filter((f) => {
        if (dep && f.departure_airport.airport_code !== dep) return false;
        if (arr && f.arrival_airport.airport_code !== arr) return false;
        return true;
      })
      .map((f) => {
        const seatMap = this.ensureFlightSeatMap(f);
        const fares = [
          {
            fare_class_id: f.airline.id === 2 ? 5 : 1,
            fare_class_code: `${f.airline.airline_code}_ECO_SAVER`,
            fare_class_name: 'Phổ thông tiết kiệm',
            seat_class: 'ECONOMY' as const,
            adult_price: f.airline.id === 2 ? 1270000 : 1640000,
            child_price: f.airline.id === 2 ? 952500 : 1230000,
            infant_price: f.airline.id === 2 ? 127000 : 164000,
            cabin_baggage: '7kg xách tay',
            checked_baggage: 'Không gồm ký gửi (mua thêm)',
            refundable: false,
            refund_summary: 'Không hỗ trợ hoàn vé',
            change_summary: 'Đổi chuyến thu phí 360.000đ + chênh lệch',
          },
          {
            fare_class_id: f.airline.id === 2 ? 6 : 3,
            fare_class_code: `${f.airline.airline_code}_PREM_ECO`,
            fare_class_name: 'Phổ thông đặc biệt',
            seat_class: 'PREMIUM_ECONOMY' as const,
            adult_price: f.airline.id === 2 ? 1870000 : 2640000,
            child_price: f.airline.id === 2 ? 1402500 : 1980000,
            infant_price: f.airline.id === 2 ? 187000 : 264000,
            cabin_baggage: '10kg xách tay',
            checked_baggage: '23kg ký gửi miễn phí',
            refundable: true,
            refund_summary: 'Hoàn 85% trước 12 giờ bay',
            change_summary: 'Miễn phí đổi ngày trước 24 giờ',
          },
          {
            fare_class_id: f.airline.id === 2 ? 7 : 4,
            fare_class_code: `${f.airline.airline_code}_BUS_FLEX`,
            fare_class_name: 'Thương gia linh hoạt',
            seat_class: 'BUSINESS' as const,
            adult_price: f.airline.id === 2 ? 3470000 : 3940000,
            child_price: f.airline.id === 2 ? 2602500 : 2955000,
            infant_price: f.airline.id === 2 ? 347000 : 394000,
            cabin_baggage: '14kg xách tay + phòng chờ',
            checked_baggage: '32kg ký gửi miễn phí',
            refundable: true,
            refund_summary: 'Hoàn 100% trước 3 giờ bay',
            change_summary: 'Đổi giờ bay miễn phí không giới hạn',
          },
        ].filter((fc) => !seatClass || fc.seat_class === seatClass);

        return {
          id: f.id,
          flight_number: f.flight_number,
          airline_id: f.airline.id,
          airline_code: f.airline.airline_code,
          airline_name: f.airline.airline_name,
          aircraft_model: f.aircraft.model,
          departure_airport_code: f.departure_airport.airport_code,
          departure_airport_name: f.departure_airport.airport_name,
          arrival_airport_code: f.arrival_airport.airport_code,
          arrival_airport_name: f.arrival_airport.airport_name,
          scheduled_departure: f.scheduled_departure,
          scheduled_arrival: f.scheduled_arrival,
          duration_minutes: f.duration_minutes,
          available_seats: seatMap.available_seats,
          min_price: fares[0]?.adult_price ?? 1640000,
          fares,
        };
      });

    return ok(items);
  }

  private listBookings(url: string): unknown {
    const params = readParams(url);
    const status = (params.get('status') ?? '').trim().toUpperCase();
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    let rows = [...this.mockBookingsList];
    if (status) {
      rows = rows.filter((b) => b.status === status);
    }
    if (keyword) {
      rows = rows.filter(
        (b) =>
          b.booking_code.toLowerCase().includes(keyword) ||
          b.customer_name.toLowerCase().includes(keyword) ||
          b.customer_email.toLowerCase().includes(keyword),
      );
    }
    const page = Number(params.get('page') ?? 1);
    const size = Number(params.get('size') ?? 20);
    return ok(paginate(rows, page, size));
  }

  private getBookingById(id: number): unknown {
    const found = this.mockBookingsList.find((b) => b.id === id);
    if (found) return ok(found);
    // Giữ tương thích với booking-checkout.spec.ts (id 1049 hoặc id bất kỳ dùng mockBooking)
    return ok(this.mockBooking);
  }

  private cancelBooking(id: number, body: unknown): unknown {
    const target = this.mockBookingsList.find((b) => b.id === id);
    if (!target) return notFound('Không tìm thấy đơn đặt chỗ');
    if (target.status === 'CANCELLED') {
      return businessError('Đơn đặt chỗ đã được hủy trước đó');
    }
    const reason = ((body ?? {}) as { reason?: string }).reason?.trim() || 'Khách hàng yêu cầu hủy vé';
    target.status = 'CANCELLED';
    target.cancelled_at = new Date().toISOString();
    target.cancel_reason = reason;
    target.agency_contact = {
      agency_name: 'VinaFly Domestic Booking',
      hotline: '1900 1234',
      support_email: 'hotro@vinafly.vn',
      note: 'Hệ thống không tự động hoàn tiền. Vui lòng liên hệ 1900 1234 hoặc hotro@vinafly.vn để xử lý hoàn vé.',
    };
    return ok(target, 'Đã hủy đơn đặt chỗ thành công');
  }
}
