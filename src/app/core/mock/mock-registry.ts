import { Airline } from '@core/models/airline.model';
import {
  AdminUser,
  AdminUserCreatePayload,
  AdminUserUpdatePayload,
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
  VOUCHERS_MOCK,
} from '@core/mock/data/catalog.mock';
import { AIRPORTS_MOCK, CITIES_MOCK } from '@core/mock/data/locations.mock';
import {
  buildLoginResponse,
  findMockUser,
  MOCK_PASSWORD,
  USERS_MOCK,
} from '@core/mock/data/auth.mock';
import { UserVoucher, VoucherStoreItem } from '@core/models/user-voucher.model';
import { MockResource } from '@core/mock/mock-resource';
import { businessError, duplicate, notFound, ok, paginate, readParams } from '@core/mock/mock-response';

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
  private nextId = 100;

  /**
   * Người dùng cho màn quản trị — viết handler riêng (không dùng `MockResource`)
   * vì có hai nghiệp vụ mà tài nguyên tổng quát không biểu diễn được: chặn mất
   * ADMIN đang hoạt động cuối cùng, và endpoint `reset-password` trả mật khẩu tạm.
   */
  private users: AdminUser[] = USERS_MOCK.map((u) => ({ ...u }));
  private temporaryPasswordSeq = 1;

  /**
   * Sơ đồ ghế theo `aircraft_id`. Khởi tạo RỖNG — máy bay chưa cấu hình ghế nào,
   * đúng trạng thái ban đầu của hệ thống thật (chưa ai khai sơ đồ).
   */
  private seatMaps = new Map<number, AircraftSeat[]>();
  private seatIdSeq = 1000;

  /** Ví voucher của khách đang đăng nhập (mock chỉ có một khách). */
  private userVouchers: UserVoucher[] = USER_VOUCHERS_MOCK.map((v) => ({ ...v }));
  private userVoucherIdSeq = 100;

  private readonly resources = [
    new MockResource<City>({
      path: 'cities',
      seed: CITIES_MOCK,
      searchFields: ['city_code', 'city_name'],
      uniqueField: 'city_code',
      noun: 'thành phố',
    }),
    new MockResource<Airport>({
      path: 'airports',
      seed: AIRPORTS_MOCK,
      searchFields: ['airport_code', 'airport_name'],
      uniqueField: 'airport_code',
      noun: 'sân bay',
      validate: (p) =>
        p.city_id === undefined || p.city_id === null ? 'Thành phố không được để trống' : null,
    }),
    new MockResource<Promotion>({
      path: 'promotions',
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
      path: 'vouchers',
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
      path: 'aircrafts',
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
      path: 'seat-types',
      seed: SEAT_TYPES_MOCK,
      searchFields: ['seat_type_code', 'seat_type_name'],
      uniqueField: 'seat_type_code',
      noun: 'loại ghế',
    }),
    new MockResource<NewsItem>({
      path: 'news',
      seed: NEWS_MOCK,
      searchFields: ['title'],
      noun: 'tin tức',
      // `category_id` khớp phần tử trong `category_ids` — filter thường so chuỗi
      // với một trường vô hướng nên không dùng được cho trường mảng.
      arrayFilters: { category_id: 'category_ids' },
      // API trả kèm `categories` lồng để client không phải gọi thêm endpoint;
      // trang khách dùng nó cho dropdown danh mục và nhãn ở bài viết.
      enrich: (n) => ({
        ...n,
        categories: (n.category_ids ?? [])
          .map((cid) => NEWS_CATEGORIES_MOCK.find((c) => c.id === cid))
          .filter((c): c is NewsCategory => c !== undefined && !c.is_deleted),
      }),
    }),
    new MockResource<NewsCategory>({
      path: 'news-categories',
      seed: NEWS_CATEGORIES_MOCK,
      searchFields: ['category_name'],
      uniqueField: 'category_name',
      noun: 'danh mục tin',
    }),
  ];

  /**
   * Rút đường dẫn so sánh được từ URL.
   *
   * HttpClient đưa URL TUYỆT ĐỐI vào interceptor (http://localhost:8080/api/v1/airlines),
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
    if (path === '/api/v1/auth/login' && m === 'POST') {
      return this.login(body);
    }
    if (path === '/api/v1/auth/logout' && m === 'POST') {
      return ok(null, 'Đã đăng xuất');
    }

    if (path === '/api/v1/airlines' && m === 'GET') {
      return this.listAirlines(url);
    }
    if (path === '/api/v1/airlines' && m === 'POST') {
      return this.createAirline(body);
    }

    const idMatch = path.match(/^\/api\/v1\/airlines\/(\d+)$/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      if (m === 'GET') return this.getAirline(id);
      if (m === 'PUT') return this.updateAirline(id, body);
      if (m === 'DELETE') return this.deleteAirline(id);
    }

    // RBAC chỉ đọc — trả mảng trần, không phân trang (BR-LIST-05).
    if (path === '/api/v1/roles' && m === 'GET') {
      return ok(ROLES_MOCK);
    }
    if (path === '/api/v1/permissions' && m === 'GET') {
      return this.listPermissions(url);
    }

    // Người dùng (ADMIN) — API v0.2 mục 2.3.
    if (path === '/api/v1/users' && m === 'GET') {
      return this.listUsers(url);
    }
    if (path === '/api/v1/users' && m === 'POST') {
      return this.createUser(body);
    }
    // Đặt reset-password TRƯỚC regex `/{id}` — nếu không, `\d+` không khớp
    // "2/reset-password" nhưng thứ tự rõ ràng giúp đọc code không phải suy luận.
    const resetMatch = path.match(/^\/api\/v1\/users\/(\d+)\/reset-password$/);
    if (resetMatch && m === 'POST') {
      return this.resetPassword(Number(resetMatch[1]));
    }
    const userMatch = path.match(/^\/api\/v1\/users\/(\d+)$/);
    if (userMatch) {
      const id = Number(userMatch[1]);
      if (m === 'GET') return this.getUser(id);
      if (m === 'PUT') return this.updateUser(id, body);
      if (m === 'DELETE') return this.deleteUser(id);
    }

    // Sơ đồ ghế của máy bay — API v0.2 mục 2.6.
    const seatMapMatch = path.match(/^\/api\/v1\/aircrafts\/(\d+)\/seat-map$/);
    if (seatMapMatch) {
      const aircraftId = Number(seatMapMatch[1]);
      if (m === 'GET') return this.getSeatMap(aircraftId);
      if (m === 'PUT') return this.saveSeatMap(aircraftId, body);
    }

    // Ví voucher của khách — API v0.2 mục 2.8.
    if (path === '/api/v1/voucher-store' && m === 'GET') {
      return this.voucherStore();
    }
    if (path === '/api/v1/my-vouchers' && m === 'GET') {
      return this.myVouchers(url);
    }
    const claimMatch = path.match(/^\/api\/v1\/vouchers\/(\d+)\/claim$/);
    if (claimMatch && m === 'POST') {
      return this.claimVoucher(Number(claimMatch[1]));
    }

    // Các module master data dùng chung một lớp tài nguyên tổng quát.
    for (const resource of this.resources) {
      const result = resource.handle(m, url, body);
      if (result !== undefined) {
        return result;
      }
    }

    return undefined;
  }

  private alive(): Airline[] {
    // Xóa mềm: bản ghi vẫn nằm trong mảng nhưng không được lộ ra ngoài.
    return this.airlines.filter((a) => !a.is_deleted);
  }

  private login(body: unknown): unknown {
    const payload = (body ?? {}) as { email?: string; password?: string };
    const found = findMockUser(payload.email ?? '');

    // Sai email hoặc mật khẩu -> cùng một mã lỗi, không tiết lộ cái nào sai.
    if (!found || payload.password !== MOCK_PASSWORD) {
      return { code: 1007, message: 'Email hoặc mật khẩu không đúng', data: null };
    }
    return ok(buildLoginResponse(found), 'Đăng nhập thành công');
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
    return this.users.filter((u) => !u.is_deleted);
  }

  private listUsers(url: string): unknown {
    const params = readParams(url);
    const keyword = (params.get('keyword') ?? '').trim().toLowerCase();
    const isActive = params.get('is_active');
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
    if (isActive !== null) {
      rows = rows.filter((u) => u.is_active === (isActive === 'true'));
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
      is_active: p.is_active ?? true,
      is_deleted: false,
      // DB v0.4: một user một role. Payload là mảng nhưng chỉ phần tử đầu có nghĩa.
      roles: p.roles?.length ? p.roles : ['CUSTOMER'],
      created_at: now,
      updated_at: now,
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
    const nextActive = p.is_active ?? target.is_active;

    if (this.wouldLoseLastAdmin(target, nextRoles, nextActive)) {
      return businessError(
        'Không thể hạ quyền hoặc ngừng hoạt động tài khoản ADMIN đang hoạt động cuối cùng',
      );
    }

    Object.assign(target, {
      full_name: p.full_name ?? target.full_name,
      phone: p.phone ?? target.phone,
      is_active: nextActive,
      roles: nextRoles,
      updated_at: new Date().toISOString(),
    });
    return ok(target, 'Cập nhật thành công');
  }

  /** Xóa mềm (USR-05): đặt `is_deleted`, KHÔNG xóa khỏi mảng — giữ lịch sử. */
  private deleteUser(id: number): unknown {
    const target = this.aliveUsers().find((u) => u.id === id);
    if (!target) {
      return notFound('Không tìm thấy người dùng');
    }
    if (this.wouldLoseLastAdmin(target, ['CUSTOMER'], false)) {
      return businessError('Không thể xóa tài khoản ADMIN đang hoạt động cuối cùng');
    }

    target.is_deleted = true;
    target.is_active = false;
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
    const wasActiveAdmin = target.roles.includes('ADMIN') && target.is_active;
    const stillActiveAdmin = nextRoles.includes('ADMIN') && nextActive;
    if (!wasActiveAdmin || stillActiveAdmin) {
      return false;
    }

    const otherActiveAdmins = this.aliveUsers().filter(
      (u) => u.id !== target.id && u.is_active && u.roles.includes('ADMIN'),
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
        v.is_active &&
        !v.is_deleted &&
        v.start_date <= today &&
        v.end_date >= today &&
        (v.claim_limit === null || v.claimed_count < v.claim_limit),
    ).map((v) => ({ ...v, claimed: claimedIds.has(v.id) }));

    return ok({
      items,
      pagination: { page: 1, size: 20, total_items: items.length, total_pages: 1 },
    });
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
    const voucher = VOUCHERS_MOCK.find((v) => v.id === voucherId && !v.is_deleted);
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
      discount_amount: null,
      voucher,
    };
    this.userVouchers.push(created);
    return ok({ user_voucher_id: created.id, status: created.status }, 'Đã nhận voucher');
  }

  // ---------- Sơ đồ ghế — API v0.2 mục 2.6 ----------

  /** Máy bay theo id, chỉ tính bản ghi chưa xóa mềm. */
  private aircraftById(id: number): Aircraft | undefined {
    return AIRCRAFT_MOCK.find((a) => a.id === id && !a.is_deleted);
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
    // trong danh mục nên phải kiểm tra `is_active`, không chỉ tồn tại.
    for (const s of seats) {
      const type = SEAT_TYPES_MOCK.find((t) => t.id === s.seat_type_id);
      if (!type) {
        return notFound(`Loại ghế id ${s.seat_type_id} không tồn tại`);
      }
      if (!type.is_active) {
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
    const isActive = params.get('is_active');

    let rows = this.alive();
    if (keyword) {
      rows = rows.filter(
        (a) =>
          a.airline_name.toLowerCase().includes(keyword) ||
          a.airline_code.toLowerCase().includes(keyword),
      );
    }
    if (isActive !== null) {
      rows = rows.filter((a) => a.is_active === (isActive === 'true'));
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
      is_active: payload.is_active ?? true,
      is_deleted: false,
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
      is_active: payload.is_active ?? target.is_active,
    });
    return ok(target, 'Cập nhật thành công');
  }

  private deleteAirline(id: number): unknown {
    const target = this.alive().find((a) => a.id === id);
    if (!target) {
      return notFound('Không tìm thấy hãng hàng không');
    }
    // Xóa mềm: DB v0.4 tách is_active (bật/tắt) khỏi is_deleted (xóa mềm).
    target.is_deleted = true;
    return ok(null, 'Đã xóa hãng hàng không');
  }
}
