import { MockRegistry } from '@core/mock/mock-registry';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { AdminUser } from '@core/models/auth.model';
import { SeatMap } from '@core/models/fleet-news.model';
import { UserVoucher, VoucherStoreItem } from '@core/models/user-voucher.model';
import { Permission, Role } from '@core/models/rbac.model';

describe('MockRegistry', () => {
  let registry: MockRegistry;

  beforeEach(() => {
    registry = new MockRegistry();
  });

  it('trả undefined cho đường dẫn không có mock', () => {
    expect(registry.resolve('GET', '/api/v1/khong-ton-tai')).toBeUndefined();
  });

  it('khớp được cả URL tuyệt đối mà HttpClient thực sự gửi', () => {
    // HttpClient đưa URL tuyệt đối vào interceptor, không phải đường dẫn tương đối.
    // Nếu registry chỉ so khớp đường dẫn tương đối thì mọi request đều trượt
    // và rơi ra mạng thật — lỗi này đã từng xảy ra và bị unit test bỏ lọt.
    const absolute = registry.resolve(
      'GET',
      'http://localhost:8080/api/v1/airlines?page=1&size=20',
    ) as any;
    expect(absolute).toBeDefined();
    expect(absolute.code).toBe(1000);
    expect(absolute.data.items.length).toBeGreaterThan(0);
  });

  it('trả danh sách hãng hàng không theo đúng envelope', () => {
    const res = registry.resolve('GET', '/api/v1/airlines?page=1&size=20') as any;
    expect(res.code).toBe(1000);
    expect(Array.isArray(res.data.items)).toBe(true);
    expect(res.data.pagination).toEqual(
      expect.objectContaining({ page: 1, size: 20, total_items: expect.any(Number) }),
    );
  });

  it('dùng snake_case cho trường dữ liệu', () => {
    const res = registry.resolve('GET', '/api/v1/airlines') as any;
    const first = res.data.items[0];
    expect(first).toHaveProperty('airline_code');
    expect(first).toHaveProperty('airline_name');
    expect(first).not.toHaveProperty('airlineCode');
  });

  it('lọc theo keyword', () => {
    const res = registry.resolve('GET', '/api/v1/airlines?keyword=Vietjet') as any;
    expect(res.data.items.length).toBeGreaterThan(0);
    expect(
      res.data.items.every((a: any) => a.airline_name.toLowerCase().includes('vietjet')),
    ).toBe(true);
  });

  it('phân trang đúng — trang 2 khác trang 1', () => {
    const p1 = registry.resolve('GET', '/api/v1/airlines?page=1&size=2') as any;
    const p2 = registry.resolve('GET', '/api/v1/airlines?page=2&size=2') as any;
    expect(p1.data.items[0].id).not.toBe(p2.data.items[0].id);
    expect(p1.data.pagination.total_pages).toBeGreaterThan(1);
  });

  it('trả 1004 khi lấy id không tồn tại', () => {
    const res = registry.resolve('GET', '/api/v1/airlines/99999') as any;
    expect(res.code).toBe(1004);
  });

  it('trả 1005 khi tạo trùng mã hãng', () => {
    const res = registry.resolve('POST', '/api/v1/airlines', {
      airline_code: 'VN',
      airline_name: 'Trùng mã',
    }) as any;
    expect(res.code).toBe(1005);
  });

  it('xóa mềm rồi thì không còn thấy trong danh sách', () => {
    registry.resolve('DELETE', '/api/v1/airlines/1');
    const res = registry.resolve('GET', '/api/v1/airlines?size=100') as any;
    expect(res.data.items.some((a: any) => a.id === 1)).toBe(false);
  });
});

describe('RBAC mock (chỉ đọc)', () => {
  it('GET /roles trả mảng trần đúng 3 role cố định', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/roles') as ApiResponse<Role[]>;

    expect(res.code).toBe(1000);
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toHaveLength(3);
    expect(res.data.map((r) => r.name)).toEqual(['CUSTOMER', 'STAFF', 'ADMIN']);
  });

  it('GET /permissions lọc được theo module', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'GET',
      'http://x/api/v1/permissions?module=USER',
    ) as ApiResponse<Permission[]>;

    expect(res.data.length).toBeGreaterThan(0);
    // Mọi dòng trả về phải thuộc đúng module đã lọc — không lọt dòng module khác.
    expect(res.data.every((p) => p.module === 'USER')).toBe(true);
  });

  it('GET /permissions tìm được theo keyword trong description', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'GET',
      'http://x/api/v1/permissions?keyword=xu%E1%BA%A5t%20b%E1%BA%A3n',
    ) as ApiResponse<Permission[]>;

    expect(res.data.map((p) => p.permission_key)).toContain('NEWS_PUBLISH');
  });
});

describe('User mock — chặn mất ADMIN cuối cùng', () => {
  it('từ chối hạ quyền ADMIN ACTIVE cuối cùng xuống CUSTOMER', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/users/1', {
      full_name: 'Quản trị viên',
      phone: '0901234567',
      is_active: true,
      roles: ['CUSTOMER'],
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối ngừng hoạt động ADMIN ACTIVE cuối cùng', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/users/1', {
      full_name: 'Quản trị viên',
      phone: '0901234567',
      is_active: false,
      roles: ['ADMIN'],
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('CHO PHÉP hạ quyền khi còn ADMIN ACTIVE khác', () => {
    const registry = new MockRegistry();
    // Tạo thêm một ADMIN đang hoạt động.
    registry.resolve('POST', 'http://x/api/v1/users', {
      email: 'admin2@demo.local',
      password: 'Temp@12345',
      full_name: 'Quản trị viên 2',
      phone: null,
      is_active: true,
      roles: ['ADMIN'],
    });

    const res = registry.resolve('PUT', 'http://x/api/v1/users/1', {
      full_name: 'Quản trị viên',
      phone: '0901234567',
      is_active: true,
      roles: ['CUSTOMER'],
    }) as ApiResponse<AdminUser>;

    expect(res.code).toBe(1000);
    expect(res.data.roles).toEqual(['CUSTOMER']);
  });

  it('từ chối XÓA ADMIN ACTIVE cuối cùng', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('DELETE', 'http://x/api/v1/users/1') as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('reset-password trả mật khẩu tạm', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'POST',
      'http://x/api/v1/users/2/reset-password',
    ) as ApiResponse<{ temporary_password: string }>;

    expect(res.code).toBe(1000);
    expect(res.data.temporary_password).toMatch(/^Temp@\d{5}$/);
  });

  it('reset-password trên user không tồn tại trả 1004', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'POST',
      'http://x/api/v1/users/9999/reset-password',
    ) as ApiResponse<null>;

    expect(res.code).toBe(1004);
  });

  it('danh sách KHÔNG lộ bản ghi đã xóa mềm', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/users') as ApiResponse<
      PageData<AdminUser>
    >;

    expect(res.data.items.some((u) => u.email === 'cu@demo.local')).toBe(false);
  });

  it('tạo user trùng email trả 1005', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', 'http://x/api/v1/users', {
      email: 'admin@demo.local',
      password: 'Temp@12345',
      full_name: 'Trùng',
      phone: null,
      is_active: true,
      roles: ['STAFF'],
    }) as ApiResponse<null>;

    expect(res.code).toBe(1005);
  });

  it('lọc theo role và theo trạng thái hoạt động', () => {
    const registry = new MockRegistry();

    const staff = registry.resolve('GET', 'http://x/api/v1/users?role=STAFF') as ApiResponse<
      PageData<AdminUser>
    >;
    expect(staff.data.items.every((u) => u.roles.includes('STAFF'))).toBe(true);

    const inactive = registry.resolve(
      'GET',
      'http://x/api/v1/users?is_active=false',
    ) as ApiResponse<PageData<AdminUser>>;
    expect(inactive.data.items.every((u) => !u.is_active)).toBe(true);
  });
});

describe('Seat map mock — ràng buộc khi lưu', () => {
  /** Sinh sơ đồ đúng `count` ghế, hàng 1..n, cột A..F. */
  function seatsOf(count: number, seatTypeId = 1) {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const out: { seat_row: number; seat_column: string; seat_type_id: number }[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        seat_row: Math.floor(i / cols.length) + 1,
        seat_column: cols[i % cols.length],
        seat_type_id: seatTypeId,
      });
    }
    return out;
  }

  it('từ chối sơ đồ LỆCH sức chứa', () => {
    const registry = new MockRegistry();
    // Máy bay id 3 có seat_capacity = 180.
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(179),
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối sơ đồ có 2 ghế trùng hàng+cột', () => {
    const registry = new MockRegistry();
    const seats = seatsOf(180);
    seats[1] = { ...seats[0] }; // nhân bản ghế đầu -> trùng khoá
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats,
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối dùng loại ghế đang TẮT (EXIT, id 8)', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(180, 8),
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('từ chối loại ghế KHÔNG tồn tại (1004)', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(180, 9999),
    }) as ApiResponse<null>;

    expect(res.code).toBe(1004);
  });

  it('CHẤP NHẬN sơ đồ khớp đúng sức chứa, loại ghế đang bật', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', {
      seats: seatsOf(180, 1),
    }) as ApiResponse<SeatMap>;

    expect(res.code).toBe(1000);
    expect(res.data.configured_seats).toBe(180);
  });

  it('sau khi lưu, GET trả đúng sơ đồ kèm loại ghế lồng', () => {
    const registry = new MockRegistry();
    registry.resolve('PUT', 'http://x/api/v1/aircrafts/3/seat-map', { seats: seatsOf(180, 1) });

    const res = registry.resolve('GET', 'http://x/api/v1/aircrafts/3/seat-map') as ApiResponse<SeatMap>;
    expect(res.data.configured_seats).toBe(180);
    expect(res.data.seats[0].seat_type?.seat_type_code).toBe('ECO');
  });

  it('GET máy bay chưa cấu hình trả sức chứa và 0 ghế', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/aircrafts/1/seat-map') as ApiResponse<SeatMap>;

    expect(res.data.seat_capacity).toBe(305);
    expect(res.data.configured_seats).toBe(0);
  });

  it('máy bay không tồn tại trả 1004', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/aircrafts/9999/seat-map') as ApiResponse<null>;

    expect(res.code).toBe(1004);
  });
});

describe('Voucher store mock', () => {
  it('kho chỉ trả voucher GLOBAL đang hiệu lực và còn lượt', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/voucher-store') as ApiResponse<
      PageData<VoucherStoreItem>
    >;

    expect(res.data.items.length).toBeGreaterThan(0);
    expect(res.data.items.every((v) => v.distribution_type === 'GLOBAL')).toBe(true);
    expect(res.data.items.every((v) => v.is_active)).toBe(true);
    expect(res.data.items.every((v) => v.claimed_count < (v.claim_limit ?? Infinity))).toBe(true);
  });

  it('kho KHÔNG chứa voucher ASSIGNED (chỉ ADMIN tặng riêng)', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/voucher-store') as ApiResponse<
      PageData<VoucherStoreItem>
    >;

    // Voucher id 4 (VIP500K) là ASSIGNED -> không được xuất hiện trong kho.
    expect(res.data.items.some((v) => v.id === 4)).toBe(false);
  });

  it('kho KHÔNG chứa voucher đã tắt hoặc hết lượt', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/voucher-store') as ApiResponse<
      PageData<VoucherStoreItem>
    >;

    // id 5 (TET100K): is_active = false và claimed_count = claim_limit.
    expect(res.data.items.some((v) => v.id === 5)).toBe(false);
  });

  it('nhận voucher GLOBAL thành công thì ví tăng thêm một', () => {
    const registry = new MockRegistry();
    const before = (
      registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<PageData<UserVoucher>>
    ).data.pagination.total_items;

    // id 6 (BAYHE2027) là GLOBAL và khách CHƯA nhận (ví mẫu chỉ có id 1-4).
    const claim = registry.resolve('POST', 'http://x/api/v1/vouchers/6/claim') as ApiResponse<{
      status: string;
    }>;
    expect(claim.code).toBe(1000);
    expect(claim.data.status).toBe('AVAILABLE');

    const after = (
      registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<PageData<UserVoucher>>
    ).data.pagination.total_items;
    expect(after).toBe(before + 1);
  });

  it('nhận LẦN HAI cùng voucher trả 1005', () => {
    const registry = new MockRegistry();
    registry.resolve('POST', 'http://x/api/v1/vouchers/6/claim');
    const again = registry.resolve('POST', 'http://x/api/v1/vouchers/3/claim') as ApiResponse<null>;

    expect(again.code).toBe(1005);
  });

  it('KHÔNG nhận được voucher ASSIGNED (1006)', () => {
    const registry = new MockRegistry();
    // id 4 (VIP500K) là ASSIGNED — khách không tự nhận.
    const res = registry.resolve('POST', 'http://x/api/v1/vouchers/4/claim') as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('sau khi nhận, kho đánh dấu claimed = true', () => {
    const registry = new MockRegistry();
    registry.resolve('POST', 'http://x/api/v1/vouchers/6/claim');

    const store = registry.resolve('GET', 'http://x/api/v1/voucher-store') as ApiResponse<
      PageData<VoucherStoreItem>
    >;
    expect(store.data.items.find((v) => v.id === 6)?.claimed).toBe(true);
  });

  it('ví có đủ 4 trạng thái trong dữ liệu mẫu', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<
      PageData<UserVoucher>
    >;

    const statuses = new Set(res.data.items.map((v) => v.status));
    expect(statuses).toEqual(new Set(['AVAILABLE', 'RESERVED', 'USED', 'EXPIRED']));
  });

  it('lọc ví theo status', () => {
    const registry = new MockRegistry();
    const res = registry.resolve(
      'GET',
      'http://x/api/v1/my-vouchers?status=USED',
    ) as ApiResponse<PageData<UserVoucher>>;

    expect(res.data.items.every((v) => v.status === 'USED')).toBe(true);
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  it('voucher mới nhận chép hạn từ voucher gốc', () => {
    const registry = new MockRegistry();
    registry.resolve('POST', 'http://x/api/v1/vouchers/6/claim');

    const res = registry.resolve('GET', 'http://x/api/v1/my-vouchers') as ApiResponse<
      PageData<UserVoucher>
    >;
    const claimed = res.data.items.find((v) => v.voucher.id === 6)!;
    // Voucher id 6 có end_date = 2027-12-31.
    expect(claimed.expires_at).toContain('2027-12-31');
  });
});
