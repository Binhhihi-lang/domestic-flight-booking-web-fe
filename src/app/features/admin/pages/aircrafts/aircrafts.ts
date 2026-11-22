import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Aircraft } from '@core/models/fleet-news.model';
import { AuthService } from '@core/services/auth.service';
import { AircraftService } from '@core/services/catalog.service';
import { CrudColumn, CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý máy bay — AC-01→05 (API v0.2 mục 2.6).
 *
 * Phân quyền theo Permission Matrix & prototype `staff.html`:
 * - ADMIN: toàn quyền CRUD + link sang màn cấu hình sơ đồ ghế.
 * - STAFF: chế độ chỉ đọc (`readonly`, `disableBulk`), không có link cấu hình ghế.
 */
@Component({
  selector: 'app-admin-aircrafts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config()" [service]="service" />`,
})
export class AdminAircrafts {
  protected readonly service = inject(AircraftService);
  private readonly authService = inject(AuthService);

  protected readonly config = computed<CrudConfig<Aircraft, Partial<Aircraft>>>(() => {
    const isAdmin = this.authService.isAdmin();

    const seatMapColumn: CrudColumn<Aircraft> = isAdmin
      ? {
          label: 'Sơ đồ ghế',
          value: () => 'Cấu hình',
          link: (r) => `/admin/seat-configurations/${r.id}`,
          width: '120px',
        }
      : {
          label: 'Sơ đồ ghế',
          value: (r) =>
            r.aisle_after
              ? `${r.seat_capacity} ghế (lối đi ${r.aisle_after})`
              : `${r.seat_capacity} ghế`,
          width: '170px',
        };

    return {
      readonly: !isAdmin,
      disableBulk: !isAdmin,
      title: 'Máy bay',
      subtitle: isAdmin
        ? 'Đội bay phục vụ các chuyến nội địa'
        : 'Danh mục máy bay để tra cứu khi điều phối chuyến · chỉ đọc',
      createLabel: 'Thêm máy bay',
      searchPlaceholder: 'Tìm theo mã hoặc dòng máy bay',
      emptyIcon: 'airlines',
      emptyMessage: 'Chưa có máy bay',
      emptyHint: isAdmin ? 'Thêm máy bay đầu tiên để bắt đầu' : 'Chưa có máy bay trong hệ thống',
      editTitle: 'Sửa máy bay',
      detailTitle: (r) => `${r.aircraft_code} — ${r.model}`,
      deleteTitle: () => 'Xóa máy bay?',
      deleteMessage: (r) =>
        `Bạn có chắc muốn xóa "${r.aircraft_code}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
      columns: [
        { label: 'Mã máy bay', value: (r) => r.aircraft_code, kind: 'code', width: '150px' },
        { label: 'Dòng máy bay', value: (r) => r.model },
        { label: 'Hãng sản xuất', value: (r) => r.manufacturer ?? '—' },
        { label: 'Sức chứa', value: (r) => String(r.seat_capacity), kind: 'num', width: '110px' },
        {
          label: 'Trạng thái',
          value: (r) => (r.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'),
          tone: (r) => (r.status === 'ACTIVE' ? 'success' : 'neutral'),
        },
        seatMapColumn,
      ],
      fields: [
        {
          key: 'aircraft_code',
          shownInTable: true,
          label: 'Mã máy bay',
          type: 'text',
          required: true,
          maxLength: 30,
          hint: 'Ví dụ VN-A350-01',
        },
        {
          key: 'model',
          shownInTable: true,
          label: 'Dòng máy bay',
          type: 'text',
          required: true,
          maxLength: 100,
          hint: 'Ví dụ Airbus A350-900',
        },
        {
          key: 'manufacturer',
          shownInTable: true,
          label: 'Hãng sản xuất',
          type: 'text',
          maxLength: 100,
        },
        {
          key: 'seat_capacity',
          shownInTable: true,
          label: 'Sức chứa (ghế)',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          key: 'aisle_after',
          label: 'Lối đi sau cột',
          type: 'text',
          maxLength: 20,
          hint: 'Cột sau đó là lối đi: "C" cho 3-3, "C,E" cho 3-2-2. Để trống nếu cabin nhỏ không có lối đi.',
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
          key: 'manufacturer',
          label: 'Lọc theo hãng sản xuất',
          defaultValue: '',
          options: [
            { value: '', label: 'Tất cả hãng sản xuất' },
            { value: 'Airbus', label: 'Airbus' },
            { value: 'Boeing', label: 'Boeing' },
            { value: 'ATR', label: 'ATR' },
            { value: 'Embraer', label: 'Embraer' },
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
