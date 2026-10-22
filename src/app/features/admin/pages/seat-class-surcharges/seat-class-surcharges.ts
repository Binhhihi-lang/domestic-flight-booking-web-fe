import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SeatClassSurcharge } from '@core/models/seat-surcharge.model';
import { SeatClassSurchargeService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

const CLASS_LABEL: Record<string, string> = {
  ECONOMY: 'Phổ thông',
  BUSINESS: 'Thương gia',
  FIRST: 'Hạng nhất',
};

const CLASS_OPTIONS = [
  { value: 'ECONOMY', label: 'Phổ thông' },
  { value: 'BUSINESS', label: 'Thương gia' },
  { value: 'FIRST', label: 'Hạng nhất' },
];

/**
 * Phụ thu nâng hạng ghế — mặc định dùng chung mọi chuyến.
 *
 * Không có dòng cho một cặp nghĩa là CHƯA CÓ CHÍNH SÁCH; muốn miễn phí thì
 * tạo dòng phụ thu 0 tường minh.
 */
@Component({
  selector: 'app-admin-seat-class-surcharges',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminSeatClassSurcharges {
  protected readonly service = inject(SeatClassSurchargeService);

  protected readonly config: CrudConfig<SeatClassSurcharge, Partial<SeatClassSurcharge>> = {
    title: 'Phụ thu nâng hạng',
    subtitle: 'Phụ thu khi khách chọn ghế khác hạng với hạng vé đã mua',
    createLabel: 'Thêm mức phụ thu',
    searchPlaceholder: 'Tìm theo hạng vé hoặc hạng ghế',
    emptyIcon: 'payments',
    emptyMessage: 'Chưa có mức phụ thu nào',
    emptyHint: 'Thêm mức phụ thu đầu tiên để bắt đầu',
    editTitle: 'Sửa mức phụ thu',
    deleteTitle: () => 'Xóa mức phụ thu?',
    deleteMessage: (r) =>
      `Xóa phụ thu ${CLASS_LABEL[r.from_class]} → ${CLASS_LABEL[r.to_class]}? `
      + 'Sau khi xóa, cặp này được coi là CHƯA CÓ CHÍNH SÁCH.',
    columns: [
      {
        label: 'Hạng vé',
        value: (r) => CLASS_LABEL[r.from_class] ?? r.from_class,
        kind: 'code',
        width: '140px',
      },
      {
        label: 'Hạng ghế',
        value: (r) => CLASS_LABEL[r.to_class] ?? r.to_class,
        kind: 'code',
        width: '140px',
      },
      {
        label: 'Phụ thu',
        value: (r) =>
          r.surcharge === 0 ? 'Miễn phí' : `${r.surcharge.toLocaleString('vi-VN')}₫`,
        kind: 'num',
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.status === 'ACTIVE' ? 'Đang áp dụng' : 'Tạm dừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
      },
    ],
    fields: [
      {
        key: 'from_class',
        shownInTable: true,
        label: 'Hạng vé',
        type: 'select',
        required: true,
        options: CLASS_OPTIONS,
        hint: 'Hạng vé khách đã mua',
      },
      {
        key: 'to_class',
        shownInTable: true,
        label: 'Hạng ghế',
        type: 'select',
        required: true,
        options: CLASS_OPTIONS,
        hint: 'Hạng của ghế khách chọn',
      },
      {
        key: 'surcharge',
        shownInTable: true,
        label: 'Phụ thu (₫)',
        type: 'number',
        required: true,
        min: 0,
        hint: 'Nhập 0 nếu muốn miễn phí cho cặp này',
      },
      {
        key: 'status',
        shownInTable: true,
        label: 'Trạng thái',
        type: 'select',
        hint: 'Đang áp dụng',
        options: [
          { value: 'ACTIVE', label: 'Đang áp dụng' },
          { value: 'INACTIVE', label: 'Tạm dừng' },
        ],
      },
    ],
    filters: [
      {
        key: 'from_class',
        label: 'Lọc theo hạng vé',
        defaultValue: '',
        options: [{ value: '', label: 'Tất cả hạng vé' }, ...CLASS_OPTIONS],
      },
      {
        key: 'to_class',
        label: 'Lọc theo hạng ghế',
        defaultValue: '',
        options: [{ value: '', label: 'Tất cả hạng ghế' }, ...CLASS_OPTIONS],
      },
      {
        key: 'status',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'ACTIVE', label: 'Đang áp dụng' },
          { value: 'INACTIVE', label: 'Tạm dừng' },
        ],
      },
    ],
  };
}
