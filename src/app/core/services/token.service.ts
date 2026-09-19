import { Injectable } from '@angular/core';

const TOKEN_KEY = 'fb_access_token';
const USER_KEY = 'fb_current_user';

/**
 * Lưu/đọc access token và thông tin user giữa các lần tải trang.
 * Bọc localStorage để không văng lỗi ở chế độ private/khóa site data.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  getToken(): string | null {
    return this.read(TOKEN_KEY);
  }

  setToken(token: string): void {
    this.write(TOKEN_KEY, token);
  }

  getUser<T>(): T | null {
    const raw = this.read(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setUser(user: unknown): void {
    this.write(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // localStorage không khả dụng — bỏ qua, coi như chưa đăng nhập
    }
  }

  private read(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ghi thất bại (hết dung lượng / bị chặn) — bỏ qua
    }
  }
}
