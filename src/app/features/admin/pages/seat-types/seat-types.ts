import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeatType } from '@core/models/fleet-news.model';
import { SeatTypeService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý loại ghế — SEAT-01 (API v0.2 mục 2.6).
 * v0.4 nâng từ read-only thành CRUD đầy đủ.
 */
@Component({
  selector: 'app-admin-seat-types',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminSeatTypes {
  protected readonly service = inject(SeatTypeService);

  protected readonly config: CrudConfig<SeatType, Partial<SeatType>> = {
    title: 'Loại ghế',
    subtitle: 'Danh mục loại ghế dùng khi khai báo sơ đồ máy bay',
    createLabel: 'Thêm loại ghế',
    searchPlaceholder: 'Tìm theo mã hoặc tên loại ghế',
    emptyIcon: 'event_seat',
    emptyMessage: 'Chưa có loại ghế',
    emptyHint: 'Thêm loại ghế đầu tiên để bắt đầu',
    editTitle: 'Sửa loại ghế',
    deleteTitle: () => 'Xóa loại ghế?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.seat_type_name}"? Loại ghế đang được sơ đồ máy bay dùng sẽ bị từ chối xóa.`,
    columns: [
      { label: 'Mã', value: (r) => r.seat_type_code, kind: 'code', width: '130px' },
      { label: 'Tên loại ghế', value: (r) => r.seat_type_name },
      {
        label: 'Hạng ghế',
        value: (r) =>
          r.seat_class === 'ECONOMY'
            ? 'Phổ thông'
            : r.seat_class === 'BUSINESS'
              ? 'Thương gia'
              : 'Hạng nhất',
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
      },
    ],
    fields: [
      { key: 'seat_type_code', shownInTable: true, label: 'Mã loại ghế', type: 'text', required: true, maxLength: 50, hint: 'Ví dụ ECO_WIN' },
      { key: 'seat_type_name', shownInTable: true, label: 'Tên loại ghế', type: 'text', required: true, maxLength: 100 },
      {
        key: 'seat_class', shownInTable: true,
        label: 'Hạng ghế',
        type: 'select',
        required: true,
        options: [
          { value: 'ECONOMY', label: 'Phổ thông' },
          { value: 'BUSINESS', label: 'Thương gia' },
          { value: 'FIRST', label: 'Hạng nhất' },
        ],
      },
      {
        key: 'color_hex', label: 'Màu hiển thị', type: 'text', maxLength: 7,
        hint: 'Mã màu hex, ví dụ #1E88E5. Dùng để tô ô trên sơ đồ ghế.',
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
