import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { City } from '@core/models/location.model';
import { CityService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/** Quản lý thành phố — CITY-01→05 (API v0.2 mục 2.5). */
@Component({
  selector: 'app-admin-cities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminCities {
  protected readonly service = inject(CityService);

  protected readonly config: CrudConfig<City, Partial<City>> = {
    title: 'Thành phố',
    subtitle: 'Danh mục thành phố có sân bay nội địa',
    createLabel: 'Thêm thành phố',
    searchPlaceholder: 'Tìm theo mã hoặc tên thành phố',
    emptyIcon: 'location_city',
    emptyMessage: 'Chưa có thành phố',
    emptyHint: 'Thêm thành phố đầu tiên để bắt đầu',
    editTitle: 'Sửa thành phố',
    deleteTitle: (r) => 'Xóa thành phố?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.city_name}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
    columns: [
      { label: 'Mã', value: (r) => r.city_code, kind: 'code', width: '110px' },
      { label: 'Tên thành phố', value: (r) => r.city_name },
      { label: 'Quốc gia', value: (r) => r.country ?? '—' },
      {
        label: 'Trạng thái',
        value: (r) => (r.is_active ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.is_active ? 'success' : 'neutral'),
      },
    ],
    fields: [
      { key: 'city_code', shownInTable: true, label: 'Mã thành phố', type: 'text', required: true, maxLength: 10, hint: 'Tối đa 10 ký tự, ví dụ HAN' },
      { key: 'city_name', shownInTable: true, label: 'Tên thành phố', type: 'text', required: true, maxLength: 100 },
      { key: 'country', shownInTable: true, label: 'Quốc gia', type: 'text', maxLength: 100 },
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
