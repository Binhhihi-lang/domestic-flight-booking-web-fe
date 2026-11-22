import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FareClass } from '@core/models/fare-baggage.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { AirlineService } from '@core/services/airline.service';
import { FareClassService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

const SEAT_CLASS_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

/**
 * Quản lý hạng vé — Phase 2 (`/api/admin/fare-classes`).
 * Mỗi hạng vé gắn với một hãng hàng không và một khoang dịch vụ; mã hạng vé
 * mang tiền tố `<HÃNG>_` (VD: `VN_ECO_SAVER`).
 */
@Component({
  selector: 'app-admin-fare-classes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config()" [service]="service" />`,
})
export class AdminFareClasses {
  protected readonly service = inject(FareClassService);
  private readonly airlineService = inject(AirlineService);

  private readonly airlines = toSignal(this.airlineService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly config = computed<CrudConfig<FareClass, Partial<FareClass>>>(() => {
    const airlineList = this.airlines()?.data.items ?? [];
    const airlineOptions = [
      { value: null as number | null, label: '— Chọn hãng hàng không —' },
      ...airlineList.map((a) => ({ value: a.id, label: `${a.airline_name} (${a.airline_code})` })),
    ];
    const airlineFilterOptions = [
      { value: '', label: 'Tất cả hãng bay' },
      ...airlineList.map((a) => ({ value: String(a.id), label: `${a.airline_code} — ${a.airline_name}` })),
    ];

    return {
      title: 'Hạng vé',
      subtitle: 'Danh mục hạng vé theo hãng hàng không và khoang dịch vụ',
      createLabel: 'Thêm hạng vé',
      searchPlaceholder: 'Tìm theo mã hoặc tên hạng vé',
      emptyIcon: 'airline_seat_recline_extra',
      emptyMessage: 'Chưa có hạng vé',
      emptyHint: 'Thêm hạng vé đầu tiên cho các hãng hàng không',
      editTitle: 'Sửa hạng vé',
      detailTitle: (r) => `${r.fare_class_code} — ${r.fare_class_name}`,
      deleteTitle: () => 'Xóa hạng vé?',
      deleteMessage: (r) =>
        `Bạn có chắc muốn xóa hạng vé "${r.fare_class_name}" (${r.fare_class_code})? Hạng vé đang được cấu hình giá chuyến bay sẽ bị từ chối xóa.`,
      columns: [
        { label: 'Mã hạng vé', value: (r) => r.fare_class_code, kind: 'code', width: '160px' },
        { label: 'Tên hạng vé', value: (r) => r.fare_class_name },
        {
          label: 'Hãng bay',
          value: (r) => (r.airline_name ? `${r.airline_code} — ${r.airline_name}` : r.airline_code),
        },
        {
          label: 'Khoang dịch vụ',
          value: (r) => SEAT_CLASS_LABELS[r.seat_class] ?? r.seat_class,
        },
        {
          label: 'Trạng thái',
          value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
          tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
        },
      ],
      fields: [
        {
          key: 'airline_id',
          label: 'Hãng hàng không',
          type: 'select',
          required: true,
          createOnly: true,
          options: airlineOptions,
        },
        {
          key: 'fare_class_code',
          shownInTable: true,
          label: 'Mã hạng vé',
          type: 'text',
          required: true,
          createOnly: true,
          maxLength: 19,
          hint: 'Ví dụ ECO_SAVER (hệ thống tự gắn tiền tố mã hãng như VN_ECO_SAVER)',
        },
        {
          key: 'fare_class_name',
          shownInTable: true,
          label: 'Tên hạng vé',
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
          key: 'airline_id',
          label: 'Lọc theo hãng bay',
          defaultValue: '',
          options: airlineFilterOptions,
        },
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
  });
}
