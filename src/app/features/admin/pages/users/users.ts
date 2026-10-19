import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminUser, AdminUserUpdatePayload } from '@core/models/auth.model';
import { UserService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/** USR-01→05 — API v0.2 mục 2.3. */
@Component({
  selector: 'app-admin-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminUsers {
  protected readonly service = inject(UserService);

  protected readonly config: CrudConfig<AdminUser, AdminUserUpdatePayload> = {
    title: 'Người dùng',
    subtitle: 'Quản lý tài khoản, vai trò và trạng thái hoạt động',
    createLabel: 'Thêm người dùng',
    searchPlaceholder: 'Tìm theo email, họ tên hoặc số điện thoại',
    emptyIcon: 'manage_accounts',
    emptyMessage: 'Chưa có người dùng',
    emptyHint: 'Thêm tài khoản đầu tiên',
    editTitle: 'Sửa người dùng',
    // Form riêng: có nút "Đặt lại mật khẩu" và ràng buộc ADMIN cuối cùng.
    deleteTitle: () => 'Ngừng sử dụng tài khoản?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.full_name}"? Tài khoản được giữ lại để tra lịch sử nhưng không đăng nhập được nữa.`,
    columns: [
      { label: 'Họ tên', value: (r) => r.full_name },
      { label: 'Email', value: (r) => r.email, kind: 'code' },
      {
        label: 'Vai trò',
        value: (r) => (r.roles[0] === 'ADMIN' ? 'Quản trị' : r.roles[0] === 'STAFF' ? 'Nhân viên' : 'Khách hàng'),
        tone: (r) => (r.roles[0] === 'ADMIN' ? 'danger' : r.roles[0] === 'STAFF' ? 'info' : 'neutral'),
        width: '130px',
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
        width: '120px',
      },
      {
        label: 'Ngày tạo',
        value: (r) => new Date(r.created_at).toLocaleDateString('vi-VN'),
        width: '110px',
      },
    ],
    fields: [],
    filters: [
      {
        key: 'status',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'ACTIVE', label: 'Hoạt động' },
          { value: 'INACTIVE', label: 'Ngừng' },
        ],
      },
      {
        key: 'role',
        label: 'Lọc theo vai trò',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả vai trò' },
          { value: 'ADMIN', label: 'Quản trị' },
          { value: 'STAFF', label: 'Nhân viên' },
          { value: 'CUSTOMER', label: 'Khách hàng' },
        ],
      },
    ],
  };
}
