import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Role } from '@core/models/rbac.model';
import { RoleService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Vai trò — RBAC-01 (API v0.2 mục 2.4). CHỈ ĐỌC.
 *
 * Vì sao không có nút thêm/sửa/xóa: BR-RBAC-03 chốt role cố định
 * CUSTOMER/STAFF/ADMIN, ADMIN không tạo role mới. Màn này để tra cứu role nào
 * có mô tả gì, không phải để quản lý.
 */
@Component({
  selector: 'app-admin-roles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminRoles {
  protected readonly service = inject(RoleService);

  protected readonly config: CrudConfig<Role, Partial<Role>> = {
    readonly: true,
    // Role trả MẢNG TRẦN (BR-LIST-05) — xem `CrudConfig.unpaginated`.
    unpaginated: true,
    title: 'Vai trò',
    subtitle: 'Ba vai trò cố định của hệ thống — không sửa được (BR-RBAC-03)',
    createLabel: '',
    // Rỗng để `CrudPage` ẩn luôn thanh công cụ — xem Step 5. API v0.2 mục 2.4
    // KHÔNG định nghĩa `keyword` cho role nên ô tìm kiếm sẽ là ô chết.
    searchPlaceholder: '',
    emptyIcon: 'admin_panel_settings',
    emptyMessage: 'Chưa có vai trò',
    emptyHint: '',
    editTitle: '',
    deleteTitle: () => '',
    deleteMessage: () => '',
    columns: [
      {
        label: 'Vai trò',
        value: (r) => r.name,
        tone: (r) => (r.name === 'ADMIN' ? 'danger' : r.name === 'STAFF' ? 'info' : 'neutral'),
        width: '160px',
      },
      { label: 'Mô tả', value: (r) => r.description ?? '—' },
    ],
    fields: [],
  };
}
