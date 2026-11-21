import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeatClass, SeatType } from '@core/models/fleet-news.model';
import { SeatTypeService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

const SEAT_CLASS_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Quản lý loại ghế — SEAT-01 (API v0.4 mục 2.6 & BE V16).
 * Bổ sung cột Khoang (`seat_class`) và Phụ thu chọn ghế (`surcharge`) thay cho
 * bảng `seat_class_surcharges` đã bỏ từ V16.
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
    subtitle: 'Danh mục loại ghế theo khoang dịch vụ và phụ thu chọn ghế mặc định',
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
        label: 'Khoang',
        value: (r) => SEAT_CLASS_LABELS[r.seat_class] ?? r.seat_class,
      },
      {
        label: 'Phụ thu',
        value: (r) => (r.surcharge > 0 ? `${moneyFmt.format(r.surcharge)}đ` : '0đ'),
        kind: 'num',
        width: '130px',
      },
      {
        label: 'Màu',
        value: (r) => r.color_hex ?? '',
        kind: 'color',
        width: '120px',
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
      },
    ],
    fields: [
      {
        key: 'seat_type_code',
        shownInTable: true,
        label: 'Mã loại ghế',
        type: 'text',
        required: true,
        maxLength: 30,
        hint: 'Ví dụ ECO_WIN',
      },
      {
        key: 'seat_type_name',
        shownInTable: true,
        label: 'Tên loại ghế',
        type: 'text',
        required: true,
        maxLength: 100,
      },
      {
        key: 'seat_class',
        shownInTable: true,
        label: 'Khoang dịch vụ',
        type: 'select',
        required: true,
        options: [
          { value: 'ECONOMY', label: 'Phổ thông' },
          { value: 'PREMIUM_ECONOMY', label: 'Phổ thông đặc biệt' },
          { value: 'BUSINESS', label: 'Thương gia' },
        ],
      },
      {
        key: 'surcharge',
        shownInTable: true,
        label: 'Phụ thu chọn ghế (VNĐ)',
        type: 'number',
        required: true,
        min: 0,
        hint: 'Nhập 0 nếu miễn phí chọn ghế',
      },
      {
        key: 'color_hex',
        label: 'Màu hiển thị',
        type: 'color',
        hint: 'Dùng để tô ô trên sơ đồ ghế. Để trống thì dùng màu mặc định theo khoang.',
      },
      {
        key: 'status',
        shownInTable: true,
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
        key: 'seat_class',
        label: 'Lọc theo khoang',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả khoang' },
          { value: 'ECONOMY', label: 'Phổ thông' },
          { value: 'PREMIUM_ECONOMY', label: 'Phổ thông đặc biệt' },
          { value: 'BUSINESS', label: 'Thương gia' },
        ],
      },
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
