import { AuthenticatedUser, LoginResponse } from '../../models/auth.model';

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
