import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Aircraft } from '@core/models/fleet-news.model';
import { AircraftService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý máy bay — AC-01→05 (API v0.2 mục 2.6).
 * Lưu ý: khác master data ở chỗ aircraft KHÔNG public, chỉ STAFF/ADMIN.
 */
@Component({
  selector: 'app-admin-aircrafts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminAircrafts {
  protected readonly service = inject(AircraftService);

  protected readonly config: CrudConfig<Aircraft, Partial<Aircraft>> = {
    title: 'Máy bay',
    subtitle: 'Đội bay phục vụ các chuyến nội địa',
    createLabel: 'Thêm máy bay',
    searchPlaceholder: 'Tìm theo mã hoặc dòng máy bay',
    emptyIcon: 'airlines',
    emptyMessage: 'Chưa có máy bay',
    emptyHint: 'Thêm máy bay đầu tiên để bắt đầu',
    editTitle: 'Sửa máy bay',
    deleteTitle: () => 'Xóa máy bay?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.aircraft_code}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
    columns: [
      { label: 'Mã máy bay', value: (r) => r.aircraft_code, kind: 'code', width: '150px' },
      { label: 'Dòng máy bay', value: (r) => r.model },
      { label: 'Hãng sản xuất', value: (r) => r.manufacturer ?? '—' },
      { label: 'Sức chứa', value: (r) => String(r.seat_capacity), kind: 'num', width: '110px' },
      {
        label: 'Trạng thái',
        value: (r) => (r.is_active ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.is_active ? 'success' : 'neutral'),
      },
    ],
    fields: [
      { key: 'aircraft_code', shownInTable: true, label: 'Mã máy bay', type: 'text', required: true, maxLength: 50, hint: 'Ví dụ VN-A350-01' },
      { key: 'model', shownInTable: true, label: 'Dòng máy bay', type: 'text', required: true, maxLength: 100, hint: 'Ví dụ Airbus A350-900' },
      { key: 'manufacturer', shownInTable: true, label: 'Hãng sản xuất', type: 'text', maxLength: 100 },
      { key: 'seat_capacity', shownInTable: true, label: 'Sức chứa (ghế)', type: 'number', required: true, min: 1 },
      { key: 'is_active', shownInTable: true, label: 'Trạng thái', type: 'toggle', hint: 'Đang hoạt động' },
    ],
    filters: [
      {
        key: 'is_active',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'true', label: 'Đang hoạt động' },
          { value: 'false', label: 'Tạm dừng' },
        ],
      },
    ],
  };
}
