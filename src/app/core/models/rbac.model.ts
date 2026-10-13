/**
 * Role & Permission — API v0.2 mục 2.4, bảng roles/permissions (DB v0.4).
 *
 * Cả hai CHỈ ĐỌC ở MVP: BR-RBAC-03 quy định role cố định (CUSTOMER/STAFF/ADMIN),
 * Permission Matrix v2.0 không định nghĩa quyền tạo/sửa/xóa cho role và permission.
 * Vì vậy không có `...Payload` — không bao giờ gửi lên.
 */

/** Vai trò — chỉ có 3 giá trị, seed sẵn trong DB. */
export interface Role {
  id: number;
  name: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  description: string | null;
}

/**
 * Quyền — catalog seed sẵn, chỉ đọc.
 *
 * LƯU Ý: API v0.2 mục 2.4 trả và lọc theo `module`, nhưng bảng `permissions`
 * trong DB v0.4 KHÔNG có cột `module` (chỉ có id, permission_key, description).
 * Đã nêu trong phần câu hỏi cho BE — tạm làm theo API vì đó là hợp đồng FE đọc.
 */
export interface Permission {
  id: number;
  permission_key: string;
  description: string | null;
  module: string | null;
}
