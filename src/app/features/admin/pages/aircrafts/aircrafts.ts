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
        value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
      },
      {
        label: 'Sơ đồ ghế',
        value: () => 'Cấu hình',
        link: (r) => `/admin/seat-configurations/${r.id}`,
        width: '120px',
      },
    ],
    fields: [
      { key: 'aircraft_code', shownInTable: true, label: 'Mã máy bay', type: 'text', required: true, maxLength: 50, hint: 'Ví dụ VN-A350-01' },
      { key: 'model', shownInTable: true, label: 'Dòng máy bay', type: 'text', required: true, maxLength: 100, hint: 'Ví dụ Airbus A350-900' },
      { key: 'manufacturer', shownInTable: true, label: 'Hãng sản xuất', type: 'text', maxLength: 100 },
      { key: 'seat_capacity', shownInTable: true, label: 'Sức chứa (ghế)', type: 'number', required: true, min: 1 },
      {
        key: 'aisle_after',
        label: 'Lối đi sau cột',
        type: 'text',
        maxLength: 20,
        hint: 'Cột sau đó là lối đi: "C" cho 3-3, "C,E" cho 3-2-2. Để trống nếu cabin nhỏ không có lối đi.',
      },
      {
        key: 'status', shownInTable: true,
        label: 'Trạng thái',
        type: 'select',
        hint: 'Đang hoạt động',
        options: [
          { value: 'ACTIVE', label: 'Hoạt động' },
          { value: 'INACTIVE', label: 'Tạm dừng' },
        ],
      },
    ],
    filters: [
      {
        key: 'status',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'ACTIVE', label: 'Đang hoạt động' },
          { value: 'INACTIVE', label: 'Tạm dừng' },
        ],
      },
    ],
  };
}
