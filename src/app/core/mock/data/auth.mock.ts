import { AdminUser, AuthenticatedUser, LoginResponse } from '@core/models/auth.model';

/**
 * Tài khoản giả để đăng nhập khi bật mock.
 *
 * Vì sao cần: mọi route khu vực vận hành đều có guard, nên không đăng nhập
 * được thì không xem được màn hình nào trong đó. Backend chưa có endpoint
 * auth thật, nên mock phải trả về một user đủ quyền.
 *
 * Mật khẩu giả ở đây chỉ để chặn nhập bừa — không phải cơ chế bảo mật.
 */
export const MOCK_PASSWORD = '12345678';

function user(role: 'ADMIN' | 'STAFF' | 'CUSTOMER'): AuthenticatedUser {
  return {
    id: role === 'ADMIN' ? 1 : role === 'STAFF' ? 2 : 10,
    email: `${role.toLowerCase()}@demo.local`,
    full_name: role === 'ADMIN' ? 'Quản trị viên' : role === 'STAFF' ? 'Nhân viên vận hành' : 'Khách hàng',
    phone: null,
    avatar_url: null,
    status: 'ACTIVE',
    roles: [role],
    permissions: buildPermissions(role),
  };
}

/** Bộ quyền tối thiểu để đi hết các màn đang có. */
function buildPermissions(role: 'ADMIN' | 'STAFF' | 'CUSTOMER'): string[] {
  const customer = ['PROFILE_READ_SELF', 'PROFILE_UPDATE_SELF', 'BOOKING_READ_SELF'];
  const staff = [
    ...customer,
    'FLIGHT_READ',
    'FLIGHT_CREATE',
    'FLIGHT_UPDATE',
    'BOOKING_READ',
    'DASHBOARD_READ_OPERATIONAL',
  ];
  const admin = [
    ...staff,
    'AIRCRAFT_READ',
    'AIRCRAFT_CREATE',
    'AIRCRAFT_UPDATE',
    'AIRCRAFT_DELETE',
    'PROMOTION_READ',
    'VOUCHER_READ',
    'VOUCHER_CLAIM',
    'WALLET_READ_SELF',
    'USER_READ',
    'DASHBOARD_READ',
  ];

  if (role === 'ADMIN') return admin;
  if (role === 'STAFF') return staff;
  return customer;
}

/** Tra user giả theo email; trả undefined nếu không khớp tài khoản nào. */
export function findMockUser(email: string): AuthenticatedUser | undefined {
  const key = email.trim().toLowerCase();
  if (key === 'admin@demo.local') return user('ADMIN');
  if (key === 'staff@demo.local') return user('STAFF');
  if (key === 'customer@demo.local') return user('CUSTOMER');
  return undefined;
}

/** Dựng payload login giống hệt Backend thật (API v0.2 mục 2.1). */
export function buildLoginResponse(found: AuthenticatedUser): LoginResponse {
  return {
    access_token: 'mock-access-token',
    token_type: 'Bearer',
    expires_in: 3600,
    user: found,
  };
}

/**
 * Người dùng cho màn quản trị — API v0.2 mục 2.3.
 *
 * Cố ý có đủ các ca khó để thử giao diện: ADMIN đang hoạt động (để thử chặn tự
 * hạ quyền), một tài khoản INACTIVE, một CUSTOMER, và một bản ghi đã xóa mềm
 * (không được lộ ra danh sách).
 */
export const USERS_MOCK: AdminUser[] = [
  {
    id: 1, email: 'admin@demo.local', full_name: 'Quản trị viên', phone: '0901234567',
    avatar_url: null, is_active: true, is_deleted: false, roles: ['ADMIN'],
    created_at: '2026-01-05T02:00:00Z', updated_at: '2026-09-20T03:00:00Z',
  },
  {
    id: 2, email: 'staff@demo.local', full_name: 'Nhân viên vận hành', phone: '0912345678',
    avatar_url: null, is_active: true, is_deleted: false, roles: ['STAFF'],
    created_at: '2026-02-11T02:00:00Z', updated_at: '2026-09-18T03:00:00Z',
  },
  {
    id: 3, email: 'staff02@demo.local', full_name: 'Trần Đức Anh', phone: '0987654321',
    avatar_url: null, is_active: false, is_deleted: false, roles: ['STAFF'],
    created_at: '2026-03-02T02:00:00Z', updated_at: '2026-08-30T03:00:00Z',
  },
  {
    id: 10, email: 'customer@demo.local', full_name: 'Khách hàng', phone: null,
    avatar_url: null, is_active: true, is_deleted: false, roles: ['CUSTOMER'],
    created_at: '2026-04-15T02:00:00Z', updated_at: '2026-09-01T03:00:00Z',
  },
  {
    id: 11, email: 'khach02@demo.local', full_name: 'Nguyễn Thị Mai', phone: '0905556677',
    avatar_url: null, is_active: true, is_deleted: false, roles: ['CUSTOMER'],
    created_at: '2026-05-20T02:00:00Z', updated_at: '2026-09-10T03:00:00Z',
  },
  {
    id: 12, email: 'cu@demo.local', full_name: 'Tài khoản đã xóa', phone: null,
    avatar_url: null, is_active: false, is_deleted: true, roles: ['CUSTOMER'],
    created_at: '2026-01-01T02:00:00Z', updated_at: '2026-06-01T03:00:00Z',
  },
];
