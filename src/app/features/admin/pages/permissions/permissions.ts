import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Permission } from '@core/models/rbac.model';
import { PermissionService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/** Danh sách module để lọc — khớp 100% với `permissions.module` trong DB V10. */
const MODULES = [
  'AUTH', 'USER', 'RBAC', 'AIRLINE', 'CITY', 'AIRPORT', 'AIRCRAFT',
  'SEAT_TYPE', 'SEAT_CONFIG', 'FARE', 'FLIGHT', 'FLIGHT_FARE',
  'SEAT_INVENTORY', 'BAGGAGE', 'BOOKING', 'PASSENGER', 'PAYMENT',
  'ETICKET', 'PROMOTION', 'VOUCHER', 'NEWS', 'NEWS_CATEGORY',
  'DASHBOARD', 'NOTIFICATION',
];

/**
 * Quyền — RBAC-02 (API v0.2 mục 2.4). CHỈ ĐỌC.
 *
 * Permission Matrix v2.0 không định nghĩa CRUD permission: catalog này seed
 * sẵn và chỉ để tra cứu key nào tồn tại. Bộ lọc theo `module` là công cụ chính
 * — có hơn 60 key, không lọc thì không tìm nổi.
 */
@Component({
  selector: 'app-admin-permissions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminPermissions {
  protected readonly service = inject(PermissionService);

  protected readonly config: CrudConfig<Permission, Partial<Permission>> = {
    readonly: true,
    // Permission trả MẢNG TRẦN (BR-LIST-05) — xem `CrudConfig.unpaginated`.
    unpaginated: true,
    title: 'Quyền',
    subtitle: 'Danh mục quyền của hệ thống — chỉ đọc, lọc theo nhóm chức năng',
    createLabel: '',
    searchPlaceholder: 'Tìm theo mã quyền hoặc mô tả',
    emptyIcon: 'vpn_key',
    emptyMessage: 'Chưa có quyền',
    emptyHint: '',
    editTitle: '',
    deleteTitle: () => '',
    deleteMessage: () => '',
    columns: [
      { label: 'Mã quyền', value: (r) => r.permission_key, kind: 'code', width: '230px' },
      { label: 'Nhóm', value: (r) => r.module ?? '—', width: '140px' },
      { label: 'Mô tả', value: (r) => r.description ?? '—' },
    ],
    fields: [],
    filters: [
      {
        key: 'module',
        label: 'Lọc theo nhóm',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả nhóm' },
          ...MODULES.map((mod) => ({ value: mod, label: mod })),
        ],
      },
    ],
  };
}
