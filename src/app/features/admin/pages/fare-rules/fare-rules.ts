import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FareRule } from '@core/models/fare-baggage.model';
import { FareClassService, FareRuleService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý quy định hoàn/đổi vé — Phase 2 (`/api/admin/fare-rules`).
 * Quy định chỉ dùng để hiển thị cho khách (snapshot theo phiên bản); hệ thống
 * không tự động tính hay hoàn tiền.
 */
@Component({
  selector: 'app-admin-fare-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config()" [service]="service" />`,
})
export class AdminFareRules {
  protected readonly service = inject(FareRuleService);
  private readonly fareClassService = inject(FareClassService);

  private readonly fareClasses = toSignal(this.fareClassService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly config = computed<CrudConfig<FareRule, Partial<FareRule>>>(() => {
    const fareClassList = this.fareClasses()?.data.items ?? [];
    const fareClassOptions = [
      { value: null as number | null, label: '— Chọn hạng vé —' },
      ...fareClassList.map((fc) => ({
        value: fc.id,
        label: `${fc.fare_class_code} — ${fc.fare_class_name}`,
      })),
    ];
    const fareClassFilterOptions = [
      { value: '', label: 'Tất cả hạng vé' },
      ...fareClassList.map((fc) => ({
        value: String(fc.id),
        label: `${fc.fare_class_code} — ${fc.fare_class_name}`,
      })),
    ];

    return {
      title: 'Quy định hoàn vé',
      subtitle: 'Chính sách hoàn và đổi vé theo từng hạng vé (hiển thị cho khách khi đặt & hủy vé)',
      createLabel: 'Thêm quy định',
      searchPlaceholder: 'Tìm theo mã hạng vé hoặc mô tả quy định',
      emptyIcon: 'gavel',
      emptyMessage: 'Chưa có quy định hoàn vé',
      emptyHint: 'Thêm quy định đầu tiên cho các hạng vé đang áp dụng',
      editTitle: 'Sửa quy định hoàn vé',
      detailTitle: (r) => `${r.fare_class_code} — Phiên bản v${r.version}`,
      deleteTitle: () => 'Xóa quy định hoàn vé?',
      deleteMessage: (r) =>
        `Bạn có chắc muốn xóa quy định v${r.version} của hạng vé "${r.fare_class_code}"?`,
      columns: [
        { label: 'Mã hạng vé', value: (r) => r.fare_class_code, kind: 'code', width: '150px' },
        { label: 'Tên hạng vé', value: (r) => r.fare_class_name },
        { label: 'Phiên bản', value: (r) => `v${r.version}`, kind: 'code', width: '100px' },
        {
          label: 'Hoàn vé',
          value: (r) => (r.is_refundable ? 'Được hoàn' : 'Không hoàn'),
          tone: (r) => (r.is_refundable ? 'success' : 'neutral'),
        },
        {
          label: 'Tỷ lệ hoàn',
          value: (r) => (r.is_refundable ? `${r.refund_percent}%` : '0%'),
          kind: 'num',
          width: '110px',
        },
        {
          label: 'Báo trước tối thiểu',
          value: (r) => (r.is_refundable ? `${r.refund_min_hours_before_departure} giờ` : '—'),
          kind: 'num',
          width: '150px',
        },
        {
          label: 'Hiệu lực từ',
          value: (r) => AdminFareRules.formatDateTime(r.effective_from),
          kind: 'num',
          width: '150px',
        },
        {
          label: 'Trạng thái',
          value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
          tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
        },
      ],
      fields: [
        {
          key: 'fare_class_id',
          label: 'Hạng vé áp dụng',
          type: 'select',
          required: true,
          createOnly: true,
          options: fareClassOptions,
        },
        {
          key: 'is_refundable',
          shownInTable: true,
          label: 'Cho phép hoàn vé',
          type: 'toggle',
          hint: 'Bật nếu hạng vé hỗ trợ hoàn vé theo tỷ lệ',
        },
        {
          key: 'refund_percent',
          shownInTable: true,
          label: 'Tỷ lệ hoàn vé (%)',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          hint: 'Giá trị từ 0 đến 100',
        },
        {
          key: 'refund_min_hours_before_departure',
          shownInTable: true,
          label: 'Báo trước tối thiểu (giờ)',
          type: 'number',
          required: true,
          min: 0,
          max: 720,
          hint: 'Số giờ tối thiểu trước giờ khởi hành (0–720 giờ)',
        },
        {
          key: 'effective_from',
          shownInTable: true,
          label: 'Hiệu lực từ',
          type: 'datetime-local',
          hint: 'Để trống nếu áp dụng ngay',
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
        {
          key: 'description',
          label: 'Mô tả chi tiết quy định hoàn / đổi vé',
          type: 'textarea',
          maxLength: 500,
          fullWidth: true,
          hint: 'Ví dụ: Hoàn 70% giá vé trước 24 giờ, đổi ngày bay thu phí 360.000đ.',
        },
      ],
      filters: [
        {
          key: 'fare_class_id',
          label: 'Lọc theo hạng vé',
          defaultValue: '',
          options: fareClassFilterOptions,
        },
        {
          key: 'is_refundable',
          label: 'Điều kiện hoàn vé',
          defaultValue: '',
          options: [
            { value: '', label: 'Tất cả điều kiện' },
            { value: 'true', label: 'Được hoàn vé' },
            { value: 'false', label: 'Không hoàn vé' },
          ],
        },
      ],
    };
  });

  /** Định dạng ISO `LocalDateTime` sang `dd/MM/yyyy HH:mm`. */
  private static formatDateTime(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
