import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Airport } from '@core/models/location.model';
import { AirportService, CityService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý sân bay — APT-01→05 (API v0.2 mục 2.5).
 *
 * Khác City ở chỗ có FK `city_id` và toạ độ. Dropdown thành phố lấy từ
 * CityService nên thêm thành phố mới là dùng được ngay, không phải sửa màn này.
 */
@Component({
  selector: 'app-admin-airports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config()" [service]="service" />`,
})
export class AdminAirports {
  protected readonly service = inject(AirportService);
  private readonly cityService = inject(CityService);

  /** Danh mục thành phố cho dropdown — nạp một lần khi mở màn. */
  private readonly cities = toSignal(
    this.cityService.list({ page: 1, size: 100 }),
    { initialValue: null },
  );

  protected readonly config = () => {
    const cityOptions = [
      { value: null as number | null, label: '— Chọn thành phố —' },
      ...(this.cities()?.data.items ?? []).map((c) => ({ value: c.id, label: `${c.city_name} (${c.city_code})` })),
    ];

    const config: CrudConfig<Airport, Partial<Airport>> = {
      title: 'Sân bay',
      subtitle: 'Danh mục sân bay nội địa kèm toạ độ',
      createLabel: 'Thêm sân bay',
      searchPlaceholder: 'Tìm theo mã hoặc tên sân bay',
      emptyIcon: 'connecting_airports',
      emptyMessage: 'Chưa có sân bay',
      emptyHint: 'Thêm sân bay đầu tiên để bắt đầu',
      editTitle: 'Sửa sân bay',
      deleteTitle: () => 'Xóa sân bay?',
      deleteMessage: (r) =>
        `Bạn có chắc muốn xóa "${r.airport_name}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
      columns: [
        { label: 'Mã', value: (r) => r.airport_code, kind: 'code', width: '110px' },
        { label: 'Tên sân bay', value: (r) => r.airport_name },
        {
          label: 'Toạ độ',
          value: (r) =>
            r.latitude !== null && r.longitude !== null
              ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}`
              : '—',
          kind: 'num',
        },
        {
          label: 'Trạng thái',
          value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
          tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
        },
      ],
      fields: [
        { key: 'airport_code', shownInTable: true, label: 'Mã sân bay', type: 'text', required: true, maxLength: 10, hint: 'Mã IATA, ví dụ HAN' },
        { key: 'airport_name', shownInTable: true, label: 'Tên sân bay', type: 'text', required: true, maxLength: 150 },
        { key: 'city_id', label: 'Thành phố', type: 'select', required: true, options: cityOptions },
        { key: 'latitude', shownInTable: true, label: 'Vĩ độ', type: 'number', hint: 'Ví dụ 21.2212' },
        { key: 'longitude', shownInTable: true, label: 'Kinh độ', type: 'number', hint: 'Ví dụ 105.8072' },
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
    return config;
  };
}
