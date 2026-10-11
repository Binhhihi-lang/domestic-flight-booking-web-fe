import { ApiCode, ApiResponse, PageData } from '../models/api-response.model';

/**
 * Dựng envelope giống hệt Backend thật.
 *
 * Vì sao phải giống hệt: mục đích của mock là để khi nối API thật chỉ cần
 * tắt cờ, không phải sửa component. Nếu mock trả shape khác, component sẽ
 * viết theo shape sai và vỡ khi gặp dữ liệu thật.
 */
export function ok<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { code: ApiCode.SUCCESS, message, data };
}

export function notFound(message = 'Không tìm thấy tài nguyên'): ApiResponse<null> {
  return { code: ApiCode.RESOURCE_NOT_FOUND, message, data: null };
}

export function duplicate(message = 'Tài nguyên đã tồn tại'): ApiResponse<null> {
  return { code: ApiCode.DUPLICATE_RESOURCE, message, data: null };
}

export function businessError(message: string): ApiResponse<null> {
  return { code: ApiCode.BUSINESS_RULE_VIOLATION, message, data: null };
}

/**
 * Cắt danh sách theo tham số phân trang (mục 1.6 API v0.2).
 * `page` bắt đầu từ 1; `size` mặc định 20, tối đa 100.
 */
export function paginate<T>(all: T[], page = 1, size = 20): PageData<T> {
  const safeSize = Math.min(Math.max(size, 1), 100);
  const safePage = Math.max(page, 1);
  const start = (safePage - 1) * safeSize;
  const items = all.slice(start, start + safeSize);

  return {
    items,
    pagination: {
      page: safePage,
      size: safeSize,
      total_items: all.length,
      total_pages: Math.max(Math.ceil(all.length / safeSize), 1),
    },
  };
}

/** Đọc tham số từ query string của URL. */
export function readParams(url: string): URLSearchParams {
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  return new URLSearchParams(q);
}
