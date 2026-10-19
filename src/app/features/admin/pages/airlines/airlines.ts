import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Airline } from '@core/models/airline.model';
import { AirlineService } from '@core/services/airline.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý hãng hàng không — AIR-01→05 (API v0.2 mục 2.5).
 *
 * Đây là màn mẫu của kiến trúc CRUD: dùng chung `CrudPage` với 7 module master
 * data khác, chỉ khác phần khai báo cột/trường bên dưới. Trước đây màn này
 * viết riêng (bảng và form Material) nên giao diện lệch với các màn còn lại;
 * nay thống nhất một khuôn.
 */
@Component({
  selector: 'app-admin-airlines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminAirlines {
  protected readonly service = inject(AirlineService);

  protected readonly config: CrudConfig<Airline, Partial<Airline>> = {
    title: 'Hãng hàng không',
    subtitle: 'Quản lý danh mục hãng bay nội địa',
    createLabel: 'Thêm hãng hàng không',
    searchPlaceholder: 'Tìm theo mã hoặc tên hãng',
    emptyIcon: 'connecting_airports',
    emptyMessage: 'Chưa có hãng hàng không',
    emptyHint: 'Thêm hãng đầu tiên để bắt đầu',
    editTitle: 'Sửa hãng hàng không',
    deleteTitle: () => 'Xóa hãng hàng không?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.airline_name}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
    columns: [
      { label: 'Mã', value: (r) => r.airline_code, kind: 'code', width: '110px' },
      {
        label: 'Logo',
        value: (r) => r.logo_url ?? '',
        image: (r) => r.logo_url,
        width: '76px',
      },
      { label: 'Tên hãng', value: (r) => r.airline_name },
      { label: 'Quốc gia', value: (r) => r.country ?? '—' },
      {
        label: 'Trạng thái',
        value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
      },
    ],
    fields: [
      {
        key: 'airline_code', shownInTable: true,
        label: 'Mã hãng',
        type: 'text',
        required: true,
        maxLength: 10,
        hint: 'Tối đa 10 ký tự, ví dụ VN',
      },
      { key: 'airline_name', shownInTable: true, label: 'Tên hãng', type: 'text', required: true, maxLength: 150 },
      { key: 'country', shownInTable: true, label: 'Quốc gia', type: 'text', maxLength: 100 },
      {
        key: 'logo_url', shownInTable: true,
        label: 'Logo hãng',
        type: 'image',
        maxLength: 500,
        fullWidth: true,
        hint: 'Dán đường dẫn ảnh hoặc chọn ảnh từ máy. Để trống thì bảng hiện khung nền.',
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
