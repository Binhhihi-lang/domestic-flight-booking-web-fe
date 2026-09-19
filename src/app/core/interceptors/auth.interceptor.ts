import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiCode, ApiResponse, FieldError } from '../models/api-response.model';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

/**
 * Gắn access token vào mọi request và xử lý lỗi tập trung.
 *
 * - 401 (1002): token thiếu/hết hạn → xóa phiên để guard đưa về trang đăng nhập.
 * - Các mã lỗi khác: chuyển envelope của Backend thành `Error` với message
 *   hiển thị được, để component chỉ cần `error.message`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  const authorizedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const body = error.error as ApiResponse<unknown> | null;

      if (error.status === 401 || body?.code === ApiCode.UNAUTHENTICATED) {
        authService.clearSession();
      }

      return throwError(() => new Error(extractMessage(error, body)));
    }),
  );
};

/** Lấy thông điệp hiển thị được từ response lỗi (mục 1.3, 1.4). */
function extractMessage(error: HttpErrorResponse, body: ApiResponse<unknown> | null): string {
  if (body?.code === ApiCode.VALIDATION_ERROR && Array.isArray(body.data)) {
    return (body.data as FieldError[]).map((e) => e.message).join('\n');
  }
  if (body?.message) {
    return body.message;
  }
  if (error.status === 0) {
    return 'Không kết nối được tới máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}
