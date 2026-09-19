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
