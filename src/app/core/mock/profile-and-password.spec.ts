import { MockRegistry } from '@core/mock/mock-registry';
import { ApiResponse } from '@core/models/api-response.model';
import { AuthenticatedUser } from '@core/models/auth.model';

/**
 * Mock hồ sơ + mật khẩu (API v0.4 mục 2.1, 2.2).
 *
 * Vì sao cần: ba luồng này mới được FE nối vào, và mỗi luồng đều có một quy tắc
 * mà mock dễ làm sai — quên mật khẩu KHÔNG được tiết lộ email có tồn tại,
 * token đặt lại chỉ dùng một lần, và `PUT /profile` bỏ qua field ngoài whitelist.
 */
describe('Mock — hồ sơ và mật khẩu', () => {
  describe('GET/PUT /api/profile', () => {
    it('trả user đang đăng nhập, có cả permissions', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('GET', 'http://x/api/profile') as ApiResponse<AuthenticatedUser>;

      expect(res.code).toBe(1000);
      expect(res.data.email).toBeTruthy();
      expect(Array.isArray(res.data.permissions)).toBe(true);
    });

    it('cập nhật họ tên và số điện thoại', () => {
      const reg = new MockRegistry();
      reg.resolve('PUT', 'http://x/api/profile', {
        full_name: 'Nguyễn Văn A',
        phone: '0907654321',
      });

      const res = reg.resolve('GET', 'http://x/api/profile') as ApiResponse<AuthenticatedUser>;
      expect(res.data.full_name).toBe('Nguyễn Văn A');
      expect(res.data.phone).toBe('0907654321');
    });

    it('bỏ qua field ngoài whitelist (email, status, roles)', () => {
      const reg = new MockRegistry();
      const before = (reg.resolve('GET', 'http://x/api/profile') as ApiResponse<AuthenticatedUser>)
        .data;

      reg.resolve('PUT', 'http://x/api/profile', {
        email: 'hacker@evil.local',
        status: 'INACTIVE',
        roles: ['ADMIN'],
      });

      const after = (reg.resolve('GET', 'http://x/api/profile') as ApiResponse<AuthenticatedUser>)
        .data;
      expect(after.email).toBe(before.email);
      expect(after.status).toBe(before.status);
      expect(after.roles).toEqual(before.roles);
    });

    it('số điện thoại rỗng chuyển thành null, không lưu chuỗi rỗng', () => {
      const reg = new MockRegistry();
      reg.resolve('PUT', 'http://x/api/profile', { phone: '' });

      const res = reg.resolve('GET', 'http://x/api/profile') as ApiResponse<AuthenticatedUser>;
      expect(res.data.phone).toBeNull();
    });
  });

  describe('đổi mật khẩu', () => {
    it('sai mật khẩu hiện tại trả 1007', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('POST', 'http://x/api/auth/change-password', {
        current_password: 'sai-mat-khau',
        new_password: 'matkhaumoi123',
      }) as ApiResponse<null>;

      expect(res.code).toBe(1007);
    });

    it('mật khẩu mới ngắn hơn 8 ký tự bị từ chối', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('POST', 'http://x/api/auth/change-password', {
        current_password: '12345678',
        new_password: 'abc',
      }) as ApiResponse<null>;

      expect(res.code).not.toBe(1000);
    });

    it('đúng mật khẩu hiện tại thì thành công', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('POST', 'http://x/api/auth/change-password', {
        current_password: '12345678',
        new_password: 'matkhaumoi123',
      }) as ApiResponse<null>;

      expect(res.code).toBe(1000);
    });
  });

  describe('quên mật khẩu', () => {
    it('email lạ vẫn trả 1000 với message trung tính, token null', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('POST', 'http://x/api/auth/password-reset/request', {
        email: 'khong-ton-tai@demo.local',
      }) as ApiResponse<{ reset_token: string | null }>;

      expect(res.code).toBe(1000);
      expect(res.data.reset_token).toBeNull();
    });

    it('email tồn tại thì phát token', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('POST', 'http://x/api/auth/password-reset/request', {
        email: 'customer@demo.local',
      }) as ApiResponse<{ reset_token: string | null }>;

      expect(res.code).toBe(1000);
      expect(res.data.reset_token).toBeTruthy();
    });

    it('token sai trả lỗi nghiệp vụ', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('POST', 'http://x/api/auth/password-reset/confirm', {
        token: 'khong-co-that',
        new_password: 'matkhaumoi123',
      }) as ApiResponse<null>;

      expect(res.code).not.toBe(1000);
    });

    it('token hợp lệ đổi được mật khẩu, và chỉ dùng được MỘT lần', () => {
      const reg = new MockRegistry();
      const issued = reg.resolve('POST', 'http://x/api/auth/password-reset/request', {
        email: 'customer@demo.local',
      }) as ApiResponse<{ reset_token: string }>;
      const token = issued.data.reset_token;

      const first = reg.resolve('POST', 'http://x/api/auth/password-reset/confirm', {
        token,
        new_password: 'matkhaumoi123',
      }) as ApiResponse<null>;
      expect(first.code).toBe(1000);

      const second = reg.resolve('POST', 'http://x/api/auth/password-reset/confirm', {
        token,
        new_password: 'matkhaumoi456',
      }) as ApiResponse<null>;
      expect(second.code).not.toBe(1000);
    });
  });
});
