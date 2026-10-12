import { MockRegistry } from '@core/mock/mock-registry';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { AdminUser } from '@core/models/auth.model';
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
