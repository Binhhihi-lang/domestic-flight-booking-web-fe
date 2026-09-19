/**
 * Kiểu dữ liệu dùng chung cho mọi response của Backend.
 * Khớp mục 1.3 — API Design v0.1.
 */

/** Envelope bọc mọi response. */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** Một phần tử lỗi validate (code 1001). */
export interface FieldError {
  field: string;
  message: string;
}

/** Khối phân trang trả kèm mọi endpoint danh sách. */
export interface Pagination {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
}

/** `data` của endpoint danh sách. */
export interface PageData<T> {
  items: T[];
  pagination: Pagination;
}

/** Query params chuẩn cho endpoint danh sách (mục 1.6). */
export interface ListQuery {
  page?: number;
  size?: number;
  keyword?: string;
  sort?: string;
  [filter: string]: string | number | boolean | undefined;
}

/** Mã kết quả nghiệp vụ — mục 1.4. */
export const ApiCode = {
  SUCCESS: 1000,
  VALIDATION_ERROR: 1001,
  UNAUTHENTICATED: 1002,
  ACCESS_DENIED: 1003,
  RESOURCE_NOT_FOUND: 1004,
  DUPLICATE_RESOURCE: 1005,
  BUSINESS_RULE_VIOLATION: 1006,
  INVALID_CREDENTIALS: 1007,
  ACCOUNT_INACTIVE: 1008,
  INTERNAL_ERROR: 9999,
} as const;
