import { BadgeTone } from '@shared/ui/status-badge/status-badge';

/**
 * Khai báo một cột trong bảng CRUD.
 *
 * Vì sao dùng hàm `value` thay vì tên trường dạng chuỗi: `tsconfig` bật
 * `noPropertyAccessFromIndexSignature`, nên `row[col.key]` với T tổng quát
 * không type-safe. Hàm truy cập cho phép TypeScript kiểm tra đúng kiểu của
 * từng module, và cho phép đổi cách hiển thị (ghép chuỗi, thêm đơn vị) ngay
 * tại chỗ khai báo cột.
 */
export interface CrudColumn<T> {
  label: string;
  value: (row: T) => string;
  /** Có `tone` thì ô render thành nhãn trạng thái thay vì chữ thường. */
  tone?: (row: T) => BadgeTone;
  /**
   * Có `image` thì ô render thành ảnh thu nhỏ (logo hãng, ảnh bài viết).
   * Trả `null`/rỗng thì hiện khung nền có icon thay vì ảnh vỡ.
   */
  image?: (row: T) => string | null;
  /**
   * Có `link` thì ô render thành thẻ `<a>` tới đường dẫn này, thay vì chữ thường.
   * Dùng cho cột dẫn sang màn con của bản ghi (ví dụ "Cấu hình sơ đồ ghế" ở
   * danh sách máy bay).
   */
  link?: (row: T) => string;
  /** `code`: chữ đậm, số thẳng cột. `num`: canh phải. */
  kind?: 'code' | 'num';
  width?: string;
}

export type CrudFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'toggle' | 'image';

export interface CrudFieldOption {
  value: string | number | boolean | null;
  label: string;
}

/**
 * Khai báo một ô nhập trong form thêm/sửa.
 * `key` là tên trường trong payload gửi lên API (snake_case, khớp API v0.2).
 */
export interface CrudField {
  key: string;
  label: string;
  type: CrudFieldType;
  required?: boolean;
  hint?: string;
  options?: CrudFieldOption[];
  maxLength?: number;
  min?: number;
  max?: number;
  /** Chiếm cả hàng trong lưới form 2 cột (ô nội dung dài, textarea). */
  fullWidth?: boolean;
  /** Ẩn khỏi form khi đang SỬA (trường chỉ dùng lúc tạo, ví dụ mật khẩu). */
  createOnly?: boolean;
  /** Chỉ hiện khi đang SỬA (ví dụ đổi mật khẩu). */
  editOnly?: boolean;
  /**
   * Trường này đã được hiển thị dưới dạng một CỘT trong bảng, nên không cần
   * lặp lại ở trang chi tiết. So khớp theo `key` (ổn định), KHÔNG theo `label`
   * — nhãn cột và nhãn trường thường đặt khác nhau ("Mã" vs "Mã thành phố"),
   * nên so theo nhãn sẽ làm trường bị lặp ở trang chi tiết.
   */
  shownInTable?: boolean;
}

/** Bộ lọc dạng dropdown đặt cạnh ô tìm kiếm. */
export interface CrudFilter {
  key: string;
  label: string;
  options: CrudFieldOption[];
  defaultValue: string;
}

/**
 * Toàn bộ khai báo của một màn CRUD.
 *
 * Vì sao gom vào một object: 8 module master data dùng chung đúng một khuôn màn
 * hình, chỉ khác cột và trường. Tách khai báo khỏi giao diện thì mỗi module chỉ
 * còn vài chục dòng cấu hình thay vì ~300 dòng component lặp lại.
 */
export interface CrudConfig<T, P> {
  title: string;
  subtitle: string;
  /** Nhãn nút thêm mới, ví dụ "Thêm hãng hàng không". */
  createLabel: string;
  searchPlaceholder: string;
  columns: CrudColumn<T>[];
  fields: CrudField[];
  /** Màn chỉ đọc (Vai trò, Quyền) thì đặt true để ẩn nút thêm/sửa/xóa. */
  readonly?: boolean;
  /**
   * Endpoint trả MẢNG TRẦN thay vì `{items, pagination}` (BR-LIST-05) — hiện có
   * Role và Permission. Bật cờ này thì `CrudPage` gọi `listAll()`/`searchAll()`
   * thay vì `list()`, ẩn thanh phân trang và ẩn ô tìm kiếm nếu `searchPlaceholder`
   * rỗng.
   */
  unpaginated?: boolean;
  filters?: CrudFilter[];
  emptyIcon: string;
  emptyMessage: string;
  emptyHint: string;
  editTitle: string;
  /** Tiêu đề trang chi tiết; mặc định dùng `title`. */
  detailTitle?: (row: T) => string;
  /** Dòng mô tả dưới tiêu đề ở trang form. */
  formSubtitle?: string;
  /** Tiêu đề + nội dung hộp thoại xác nhận xóa mềm. */
  deleteTitle: (row: T) => string;
  deleteMessage: (row: T) => string;
  pageSize?: number;
}
