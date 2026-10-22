/** Kiểu dữ liệu cho module Authentication — API Design v0.1 mục 2.1, 2.2. */

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type RoleName = 'CUSTOMER' | 'STAFF' | 'ADMIN';

/** Thông tin user trả về từ Backend (không bao giờ chứa password_hash). */
export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  roles: RoleName[];
  created_at?: string;
  updated_at?: string;
}

/** User kèm danh sách permission — chỉ có trong response login. */
export interface AuthenticatedUser extends User {
  permissions: string[];
}

/** `data` của POST /auth/login. */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthenticatedUser;
}

/** Payload POST /auth/register. */
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}

/** Payload POST /auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Payload PUT /profile. */
export interface UpdateProfileRequest {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

/** Payload POST /auth/change-password. */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Payload POST /auth/password-reset/request.
 *
 * Endpoint LUÔN trả 200 kể cả email không tồn tại (chống dò tài khoản), nên
 * UI không được suy ra "email có tồn tại hay không" từ phản hồi.
 */
export interface PasswordResetRequest {
  email: string;
}

/** Payload POST /auth/password-reset/confirm. Token sai/hết hạn → 1006. */
export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

/**
 * `data` của POST /auth/password-reset/request.
 *
 * MVP chưa có mail server nên BE trả token thẳng trong response để luồng đặt
 * lại mật khẩu test được end-to-end. Khi tích hợp mail thật, trường này biến mất
 * và FE chỉ còn hiện thông báo trung tính.
 */
export interface PasswordResetResponse {
  reset_token: string | null;
}

/**
 * Người dùng ở góc nhìn ADMIN — API v0.4 mục 2.3.
 *
 * Backend trả `status` dạng chuỗi `ACTIVE | INACTIVE` (xem `UserMapper`), KHÔNG
 * trả cờ `is_active`/`is_deleted`; bản ghi đã xóa mềm bị lọc ở server.
 *
 * VỀ `roles`: DB v0.4 dùng `users.role_id BIGINT NOT NULL` — MỘT user MỘT role.
 * API vẫn nhận `roles` dạng MẢNG nên FE gửi mảng đúng 1 phần tử.
 */
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  roles: RoleName[];
  created_at: string;
}

/** Payload POST /admin/users — backend nhận `status`, không nhận `is_active`. */
export interface AdminUserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  phone: string | null;
  status: UserStatus;
  roles: RoleName[];
}

/**
 * Payload PUT /admin/users/{id} — KHÔNG có `password`.
 * Đặt lại mật khẩu là endpoint riêng (`POST /admin/users/{id}/reset-password`)
 * vì trả về mật khẩu tạm, không phải nhận mật khẩu mới từ ADMIN.
 */
export interface AdminUserUpdatePayload {
  full_name: string;
  phone: string | null;
  status: UserStatus;
  roles: RoleName[];
}
