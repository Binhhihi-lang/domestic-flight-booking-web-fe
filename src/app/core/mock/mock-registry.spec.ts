import { MockRegistry } from '@core/mock/mock-registry';
import { ApiResponse } from '@core/models/api-response.model';
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
