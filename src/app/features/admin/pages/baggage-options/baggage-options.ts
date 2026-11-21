import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BaggageOption } from '@core/models/fare-baggage.model';
import { AirlineService } from '@core/services/airline.service';
import { BaggageOptionService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Quản lý gói hành lý ký gửi — Phase 2 (`/api/admin/baggage-options`).
 * Mỗi gói gắn với một hãng hàng không, khối lượng (kg) và đơn giá (VNĐ).
 */
@Component({
  selector: 'app-admin-baggage-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config()" [service]="service" />`,
})
export class AdminBaggageOptions {
  protected readonly service = inject(BaggageOptionService);
  private readonly airlineService = inject(AirlineService);

  private readonly airlines = toSignal(this.airlineService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly config = () => {
    const airlineList = this.airlines()?.data.items ?? [];
    const airlineOptions = [
      { value: null as number | null, label: '— Chọn hãng hàng không —' },
      ...airlineList.map((a) => ({ value: a.id, label: `${a.airline_name} (${a.airline_code})` })),
    ];
    const airlineFilterOptions = [
      { value: '', label: 'Tất cả hãng bay' },
      ...airlineList.map((a) => ({ value: String(a.id), label: `${a.airline_code} — ${a.airline_name}` })),
    ];

    const config: CrudConfig<BaggageOption, Partial<BaggageOption>> = {
      title: 'Gói hành lý ký gửi',
      subtitle: 'Danh mục gói hành lý ký gửi bổ sung theo từng hãng hàng không',
      createLabel: 'Thêm gói hành lý',
      searchPlaceholder: 'Tìm theo tên gói hành lý hoặc hãng bay',
      emptyIcon: 'luggage',
      emptyMessage: 'Chưa có gói hành lý',
      emptyHint: 'Thêm gói hành lý đầu tiên (10kg, 20kg, 23kg, 32kg)',
      editTitle: 'Sửa gói hành lý',
      deleteTitle: () => 'Xóa gói hành lý?',
      deleteMessage: (r) =>
        `Bạn có chắc muốn xóa gói "${r.name}" (${r.weight_kg} kg) của ${r.airline_name || r.airline_code}?`,
      columns: [
        {
          label: 'Hãng bay',
          value: (r) => (r.airline_name ? `${r.airline_code} — ${r.airline_name}` : r.airline_code),
        },
        { label: 'Tên gói hành lý', value: (r) => r.name },
        {
          label: 'Khối lượng',
          value: (r) => `${r.weight_kg} kg`,
          kind: 'num',
          width: '120px',
        },
        {
          label: 'Đơn giá',
          value: (r) => `${moneyFmt.format(r.price)}đ`,
          kind: 'num',
          width: '140px',
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
          key: 'name',
          shownInTable: true,
          label: 'Tên gói hành lý',
          type: 'text',
          required: true,
          maxLength: 100,
          hint: 'Ví dụ: Gói ký gửi 20kg',
        },
        {
          key: 'weight_kg',
          shownInTable: true,
          label: 'Khối lượng (kg)',
          type: 'number',
          required: true,
          min: 1,
          max: 100,
          hint: 'Phổ biến: 10, 20, 23, 32 kg',
        },
        {
          key: 'price',
          shownInTable: true,
          label: 'Đơn giá (VNĐ)',
          type: 'number',
          required: true,
          min: 0,
          hint: 'Ví dụ: 216000',
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
