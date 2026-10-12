import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Promotion } from '@core/models/promotion.model';
import { PromotionService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/** Quản lý khuyến mãi — PROMO-01→05 (API v0.2 mục 2.7). */
@Component({
  selector: 'app-admin-promotions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminPromotions {
  protected readonly service = inject(PromotionService);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly config: CrudConfig<Promotion, Partial<Promotion>> = {
    title: 'Khuyến mãi',
    subtitle: 'Quản lý định nghĩa chương trình khuyến mãi',
    createLabel: 'Thêm khuyến mãi',
    searchPlaceholder: 'Tìm theo mã hoặc tên khuyến mãi',
    emptyIcon: 'local_offer',
    emptyMessage: 'Chưa có khuyến mãi',
    emptyHint: 'Thêm chương trình khuyến mãi đầu tiên',
    editTitle: 'Sửa khuyến mãi',
    deleteTitle: () => 'Xóa khuyến mãi?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.promotion_name}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
    columns: [
      {
        label: 'Ảnh',
        value: (r) => r.image_url ?? '',
        image: (r) => r.image_url,
        width: '76px',
      },
      { label: 'Mã', value: (r) => r.promotion_code, kind: 'code', width: '120px' },
      { label: 'Tên chương trình', value: (r) => r.promotion_name },
      {
        label: 'Mức giảm',
        value: (r) =>
          r.discount_type === 'PERCENT'
            ? `${r.discount_value}%`
            : `${AdminPromotions.money.format(r.discount_value)}₫`,
        kind: 'num',
      },
      {
        label: 'Hiệu lực',
        value: (r) => `${AdminPromotions.short(r.start_date)} – ${AdminPromotions.short(r.end_date)}`,
      },
      {
        label: 'Trạng thái',
        value: (r) => (r.is_active ? 'Đang chạy' : 'Tạm dừng'),
        tone: (r) => (r.is_active ? 'success' : 'neutral'),
      },
    ],
    fields: [
      { key: 'promotion_code', shownInTable: true, label: 'Mã khuyến mãi', type: 'text', required: true, maxLength: 50, hint: 'Ví dụ HE2026' },
      { key: 'promotion_name', shownInTable: true, label: 'Tên chương trình', type: 'text', required: true, maxLength: 150 },
      {
        key: 'image_url', shownInTable: true,
        label: 'Ảnh thẻ khuyến mãi',
        type: 'image',
        maxLength: 500,
        fullWidth: true,
        hint: 'Dán đường dẫn ảnh hoặc chọn ảnh từ máy. Hiển thị trên thẻ ở trang chủ.',
      },
      {
        key: 'description',
        label: 'Mô tả ngắn',
        type: 'textarea',
        maxLength: 500,
        fullWidth: true,
        hint: 'Dòng mô tả hiện trên thẻ khuyến mãi',
      },
      {
        key: 'badge_label',
        label: 'Nhãn nổi bật',
        type: 'text',
        maxLength: 30,
        hint: 'Ví dụ Giá sốc, Đồng giá. Để trống thì hiện mức giảm tự động.',
      },
      {
        key: 'discount_type', shownInTable: true,
        label: 'Loại giảm',
        type: 'select',
        required: true,
        options: [
          { value: 'PERCENT', label: 'Theo phần trăm (%)' },
          { value: 'AMOUNT', label: 'Theo số tiền (₫)' },
        ],
      },
      { key: 'discount_value', shownInTable: true, label: 'Giá trị giảm', type: 'number', required: true, min: 0, hint: 'Nhập 15 nghĩa là 15% hoặc 15₫' },
      { key: 'max_discount_amount', label: 'Trần giảm (₫)', type: 'number', min: 0, hint: 'Chỉ dùng cho loại phần trăm' },
      { key: 'min_fare_amount', label: 'Giá vé tối thiểu (₫)', type: 'number', min: 0, hint: 'Để trống nếu không yêu cầu' },
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
      { key: 'start_date', shownInTable: true, label: 'Ngày bắt đầu', type: 'date', required: true },
      { key: 'end_date', shownInTable: true, label: 'Ngày kết thúc', type: 'date', required: true },
      { key: 'is_active', shownInTable: true, label: 'Trạng thái', type: 'toggle', hint: 'Đang chạy' },
    ],
    filters: [
      {
        key: 'is_active',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'true', label: 'Đang chạy' },
          { value: 'false', label: 'Tạm dừng' },
        ],
      },
      {
        key: 'discount_type',
        label: 'Lọc theo loại giảm',
        defaultValue: '',
        options: [
          { value: '', label: 'Mọi loại giảm' },
          { value: 'PERCENT', label: 'Phần trăm' },
          { value: 'AMOUNT', label: 'Số tiền' },
        ],
      },
    ],
  };

  /** '2026-06-01' → '01/06/2026' cho gọn cột. */
  private static short(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
}
