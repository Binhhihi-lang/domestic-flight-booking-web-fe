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
 * Người dùng ở góc nhìn ADMIN — API v0.2 mục 2.3.
 *
 * Khác `User` ở chỗ có `is_active`/`is_deleted` (DB v0.4 tách hai cờ) và
 * `created_at` bắt buộc (màn danh sách hiện ngày tạo).
 *
 * VỀ `roles`: DB v0.4 dùng `users.role_id BIGINT NOT NULL` — MỘT user MỘT role.
 * API v0.2 vẫn ghi `roles` dạng MẢNG nên FE gửi mảng đúng 1 phần tử và không
 * thiết kế UI chọn nhiều role. Nếu BE chốt đổi sang `role` (số ít) thì sửa ở
 * đây và ở `AdminUserUpdatePayload`.
 */
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_deleted: boolean;
  roles: RoleName[];
  created_at: string;
  updated_at: string;
}

/** Payload POST /users — ADMIN chọn role ngay khi tạo (BR-RBAC-02). */
export interface AdminUserCreatePayload {
  email: string;
  password: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  roles: RoleName[];
}

/**
 * Payload PUT /users/{id} — KHÔNG có `password`.
 * Đặt lại mật khẩu là endpoint riêng (`POST /users/{id}/reset-password`) vì
 * trả về mật khẩu tạm, không phải nhận mật khẩu mới từ ADMIN.
 */
export interface AdminUserUpdatePayload {
  full_name: string;
  phone: string | null;
  is_active: boolean;
  roles: RoleName[];
}
