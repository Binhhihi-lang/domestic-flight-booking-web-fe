import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Voucher } from '@core/models/promotion.model';
import { VoucherService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý voucher — VOU-01→05 (API v0.2 mục 2.8).
 *
 * Lưu ý mô hình v0.4: khách KHÔNG gõ mã. `voucher_code` chỉ để ADMIN tra cứu;
 * khách nhận voucher vào ví rồi chọn khi thanh toán.
 */
@Component({
  selector: 'app-admin-vouchers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminVouchers {
  protected readonly service = inject(VoucherService);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly config: CrudConfig<Voucher, Partial<Voucher>> = {
    title: 'Voucher',
    subtitle: 'Định nghĩa voucher phát vào ví khách hàng',
    createLabel: 'Thêm voucher',
    searchPlaceholder: 'Tìm theo mã hoặc tên voucher',
    emptyIcon: 'redeem',
    emptyMessage: 'Chưa có voucher',
    emptyHint: 'Thêm voucher đầu tiên để bắt đầu',
    editTitle: 'Sửa voucher',
    deleteTitle: () => 'Xóa voucher?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.voucher_name}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
    columns: [
      { label: 'Mã nội bộ', value: (r) => r.voucher_code, kind: 'code', width: '140px' },
      { label: 'Tên voucher', value: (r) => r.voucher_name },
      {
        label: 'Mức giảm',
        value: (r) =>
          r.discount_type === 'PERCENT'
            ? `${r.discount_value}%`
            : `${AdminVouchers.money.format(r.discount_value)}₫`,
        kind: 'num',
      },
      {
        label: 'Phát hành',
        value: (r) => (r.distribution_type === 'GLOBAL' ? 'Kho chung' : 'Tặng riêng'),
      },
      {
        label: 'Lượt nhận',
        value: (r) =>
          r.claim_limit === null ? `${r.claimed_count} / ∞` : `${r.claimed_count} / ${r.claim_limit}`,
        kind: 'num',
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.status === 'ACTIVE' ? 'Đang phát' : 'Tạm dừng'),
        tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
      },
    ],
    fields: [
      { key: 'voucher_code', shownInTable: true, label: 'Mã nội bộ', type: 'text', required: true, maxLength: 50, hint: 'Chỉ ADMIN tra cứu, khách không nhập' },
      { key: 'voucher_name', shownInTable: true, label: 'Tên voucher', type: 'text', required: true, maxLength: 150 },
      { key: 'description', label: 'Mô tả', type: 'textarea', fullWidth: true, maxLength: 500 },
      {
        key: 'distribution_type', shownInTable: true,
        label: 'Kiểu phát hành',
        type: 'select',
        required: true,
        options: [
          { value: 'GLOBAL', label: 'Kho chung (khách tự nhận)' },
          { value: 'ASSIGNED', label: 'Tặng riêng cho khách' },
        ],
      },
      {
        key: 'discount_type', shownInTable: true,
        label: 'Loại giảm',
        type: 'select',
        required: true,
        options: [
          { value: 'AMOUNT', label: 'Theo số tiền (₫)' },
          { value: 'PERCENT', label: 'Theo phần trăm (%)' },
        ],
      },
      { key: 'discount_value', shownInTable: true, label: 'Giá trị giảm', type: 'number', required: true, min: 0 },
      { key: 'max_discount_amount', label: 'Trần giảm (₫)', type: 'number', min: 0, hint: 'Tính trên cả booking' },
      { key: 'min_order_amount', label: 'Đơn tối thiểu (₫)', type: 'number', min: 0 },
      {
        key: 'applicable_trip_type',
        label: 'Loại hành trình',
        type: 'select',
        options: [
          { value: 'ANY', label: 'Mọi hành trình' },
          { value: 'ONE_WAY', label: 'Một chiều' },
          { value: 'ROUND_TRIP', label: 'Khứ hồi' },
        ],
      },
      { key: 'start_date', label: 'Ngày bắt đầu', type: 'date', required: true },
      { key: 'end_date', label: 'Ngày kết thúc', type: 'date', required: true },
      { key: 'claim_limit', shownInTable: true, label: 'Giới hạn lượt nhận', type: 'number', min: 1, hint: 'Để trống = không giới hạn' },
      { key: 'is_active', shownInTable: true, label: 'Trạng thái', type: 'toggle', hint: 'Đang phát' },
    ],
    filters: [
      {
        key: 'is_active',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'true', label: 'Đang phát' },
          { value: 'false', label: 'Tạm dừng' },
        ],
      },
      {
        key: 'distribution_type',
        label: 'Lọc theo kiểu phát hành',
        defaultValue: '',
        options: [
          { value: '', label: 'Mọi kiểu phát hành' },
          { value: 'GLOBAL', label: 'Kho chung' },
          { value: 'ASSIGNED', label: 'Tặng riêng' },
        ],
      },
    ],
  };
}
