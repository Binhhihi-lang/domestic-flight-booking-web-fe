import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { delay, of } from 'rxjs';
import { ApiCode, ApiResponse } from '../models/api-response.model';
import { MockRegistry } from './mock-registry';

/**
 * Chặn request và trả dữ liệu giả khi bật cờ useMock.
 *
 * Vì sao dùng interceptor thay vì thay service: service và component giữ
 * nguyên y như code thật (vẫn gọi HttpClient), nên tắt mock chỉ cần đổi một
 * cờ — không phải sửa code, không có hai nhánh song song trong service.
 */
export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  const registry = inject(MockRegistry);
  const result = registry.resolve(req.method, req.url, req.body);

  // Không có mock cho đường dẫn này -> để request đi tiếp ra mạng thật.
  if (result === undefined) {
    return next(req);
  }

  const envelope = result as ApiResponse<unknown>;
  const httpStatus = statusFor(envelope.code);

  // Độ trễ giả lập để thấy được trạng thái đang tải trên UI.
  return of(new HttpResponse({ status: httpStatus, body: envelope })).pipe(delay(320));
};

/** Ánh xạ mã nghiệp vụ sang HTTP status, giống Backend thật (mục 1.4 API v0.2). */
function statusFor(code: number): number {
  switch (code) {
    case ApiCode.SUCCESS:
      return 200;
    case ApiCode.VALIDATION_ERROR:
    case ApiCode.INVALID_CREDENTIALS:
      return 400;
    case ApiCode.UNAUTHENTICATED:
      return 401;
    case ApiCode.ACCESS_DENIED:
    case ApiCode.ACCOUNT_INACTIVE:
      return 403;
    case ApiCode.RESOURCE_NOT_FOUND:
      return 404;
    case ApiCode.DUPLICATE_RESOURCE:
    case ApiCode.BUSINESS_RULE_VIOLATION:
      return 409;
    default:
      return 500;
  }
}

/** Dùng khi cần trả lỗi HTTP thật (ví dụ test nhánh lỗi). */
export function mockHttpError(code: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status: statusFor(code), error: { code, message, data: null } });
}
