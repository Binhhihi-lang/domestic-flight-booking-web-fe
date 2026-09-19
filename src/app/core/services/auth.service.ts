import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AuthenticatedUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  User,
} from '../models/auth.model';
import { TokenService } from './token.service';

/**
 * Xác thực và hồ sơ người dùng — API Design v0.1 mục 2.1, 2.2.
 * Trạng thái đăng nhập giữ trong signal để template phản ứng tức thì.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  private readonly currentUserSignal = signal<AuthenticatedUser | null>(
    this.tokenService.getUser<AuthenticatedUser>(),
  );

  /** User đang đăng nhập, `null` nếu là GUEST. */
  readonly currentUser = this.currentUserSignal.asReadonly();

  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);

  readonly roles = computed(() => this.currentUserSignal()?.roles ?? []);

  readonly isAdmin = computed(() => this.roles().includes('ADMIN'));

  readonly isStaff = computed(() => this.roles().includes('STAFF') || this.isAdmin());

  /** Kiểm tra quyền theo permission_key — mục 1.5. */
  hasPermission(permissionKey: string): boolean {
    return this.currentUserSignal()?.permissions?.includes(permissionKey) ?? false;
  }

  register(payload: RegisterRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.baseUrl}/auth/register`, payload);
  }

  login(payload: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap((res) => {
        this.tokenService.setToken(res.data.access_token);
        this.tokenService.setUser(res.data.user);
        this.currentUserSignal.set(res.data.user);
      }),
    );
  }

  logout(): Observable<ApiResponse<null>> {
    return this.http
      .post<ApiResponse<null>>(`${this.baseUrl}/auth/logout`, {})
      .pipe(tap(() => this.clearSession()));
  }

  /** Xóa phiên cục bộ (dùng khi logout hoặc khi token hết hạn — mục 1.5). */
  clearSession(): void {
    this.tokenService.clear();
    this.currentUserSignal.set(null);
  }

  getProfile(): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.baseUrl}/profile`);
  }

  updateProfile(payload: UpdateProfileRequest): Observable<ApiResponse<User>> {
    return this.http
      .put<ApiResponse<User>>(`${this.baseUrl}/profile`, payload)
      .pipe(tap((res) => this.patchCurrentUser(res.data)));
  }

  changePassword(payload: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/auth/change-password`, payload);
  }

  requestPasswordReset(email: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.baseUrl}/auth/password-reset/request`, {
      email,
    });
  }

  private patchCurrentUser(user: User): void {
    const current = this.currentUserSignal();
    if (!current) {
      return;
    }
    const merged: AuthenticatedUser = { ...current, ...user };
    this.tokenService.setUser(merged);
    this.currentUserSignal.set(merged);
  }
}
