import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Airline, AirlinePayload } from '../../../../core/models/airline.model';
import { AirlineService } from '../../../../core/services/airline.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { LoadingState } from '../../../../shared/ui/loading-state/loading-state';
import { AppButton } from '../../../../shared/ui/app-button/app-button';
import { AppCard } from '../../../../shared/ui/app-card/app-card';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AirlineFormDialog } from './airline-form-dialog';

/**
 * Quản lý hãng hàng không — MÀN MẪU cho các module master data còn lại,
 * bám khuôn P7 của mockup (danh sách + bảng CRUD).
 *
 * Vì sao dùng bảng HTML thuần thay vì MatTable: cần khung `.tbl-wrap` có
 * `overflow-x: auto` để bảng tự cuộn ngang trên mobile. MatTable không cấp
 * khung đó, và nếu để bảng rộng nằm trực tiếp trong card `overflow: hidden`
 * thì các cột cuối bị CẮT MẤT chứ không cuộn được.
 *
 * Vì sao màn này là mẫu: nó có đủ mọi thành phần của một màn CRUD (danh sách
 * + lọc + phân trang + thêm/sửa + bật-tắt + xóa mềm). Mẫu chạy đúng thì các
 * module sau chỉ việc đổi tên trường và đường dẫn.
 */
@Component({
  selector: 'app-admin-airlines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatIconModule,
    PageHeader,
    AppButton,
    AppCard,
    StatusBadge,
    EmptyState,
    LoadingState,
  ],
  template: `
    <div class="wrap">
      <app-page-header title="Hãng hàng không" subtitle="Quản lý danh mục hãng bay nội địa">
        <app-app-button (clicked)="openCreate()">
          <mat-icon>add</mat-icon>
          Thêm hãng hàng không
        </app-app-button>
      </app-page-header>

      <app-app-card>
        <!-- ===== Thanh công cụ ===== -->
        <div class="toolbar">
          <div class="search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              placeholder="Tìm theo mã hoặc tên hãng"
              aria-label="Tìm hãng hàng không"
              [ngModel]="keyword()"
              (ngModelChange)="onKeyword($event)"
            />
          </div>

          <select
            class="select"
            aria-label="Lọc theo trạng thái"
            [ngModel]="statusFilter()"
            (ngModelChange)="onStatus($event)"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm dừng</option>
          </select>

          @if (keyword() || statusFilter() !== 'all') {
            <app-app-button variant="ghost" (clicked)="clearFilters()">
              <mat-icon>filter_alt_off</mat-icon>
              Bỏ lọc
            </app-app-button>
          }
        </div>

        @if (loading()) {
          <app-loading-state />
        } @else if (rows().length === 0) {
          <app-empty-state
            icon="flight_takeoff"
            [message]="hasFilters() ? 'Không tìm thấy hãng hàng không' : 'Chưa có hãng hàng không'"
            [hint]="hasFilters() ? 'Thử từ khoá khác hoặc bỏ bộ lọc' : 'Thêm hãng đầu tiên để bắt đầu'"
            [actionLabel]="hasFilters() ? '' : 'Thêm hãng hàng không'"
            (actionClicked)="openCreate()"
          />
        } @else {
          <!-- Khung cuộn ngang: bảng rộng hơn màn hình thì tự cuộn, không đẩy
               cả trang tràn ngang và không cắt mất cột. -->
          <div class="tbl-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th class="col-check">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      [checked]="allSelected()"
                      (change)="toggleAll($event)"
                    />
                  </th>
                  <th>Mã</th>
                  <th>Tên hãng</th>
                  <th>Quốc gia</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td class="col-check">
                      <input
                        type="checkbox"
                        [attr.aria-label]="'Chọn ' + row.airline_name"
                        [checked]="selected().has(row.id)"
                        (change)="toggleRow(row.id)"
                      />
                    </td>
                    <td class="code">{{ row.airline_code }}</td>
                    <td>{{ row.airline_name }}</td>
                    <td>{{ row.country || '—' }}</td>
                    <td>
                      <app-status-badge
                        [tone]="row.is_active ? 'success' : 'neutral'"
                        [label]="row.is_active ? 'Hoạt động' : 'Tạm dừng'"
                      />
                    </td>
                    <td class="rowacts">
                      <app-app-button size="sm" variant="ghost" (clicked)="openEdit(row)">
                        Sửa
                      </app-app-button>
                      <app-app-button size="sm" variant="text" (clicked)="confirmDelete(row)">
                        Xóa
                      </app-app-button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- ===== Phân trang ===== -->
          <div class="pager">
            <span class="tabular">{{ rangeLabel() }}</span>
            <div class="pager__p">
              <button
                class="pg"
                type="button"
                aria-label="Trang trước"
                [disabled]="pageIndex() === 0"
                (click)="goTo(pageIndex() - 1)"
              >
                <mat-icon>chevron_left</mat-icon>
              </button>
              @for (p of pageNumbers(); track p) {
                <button class="pg" type="button" [class.on]="p === pageIndex() + 1" (click)="goTo(p - 1)">
                  {{ p }}
                </button>
              }
              <button
                class="pg"
                type="button"
                aria-label="Trang sau"
                [disabled]="pageIndex() >= totalPages() - 1"
                (click)="goTo(pageIndex() + 1)"
              >
                <mat-icon>chevron_right</mat-icon>
              </button>

              <select
                class="pager__size"
                aria-label="Số dòng mỗi trang"
                [ngModel]="pageSize()"
                (ngModelChange)="onPageSize($event)"
              >
                <option [ngValue]="10">10 / trang</option>
                <option [ngValue]="20">20 / trang</option>
                <option [ngValue]="50">50 / trang</option>
              </select>
            </div>
          </div>
        }
      </app-app-card>
    </div>
  `,
  styles: `
    /* ---------- Thanh công cụ ---------- */
    .toolbar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .search {
      position: relative;
      flex: 1 1 210px;
      max-width: 330px;
      min-width: 0;
    }

    .search mat-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 19px;
      width: 19px;
      height: 19px;
      color: var(--color-ink-subtle);
      pointer-events: none;
    }

    .search input {
      width: 100%;
      font-family: var(--font-body);
      font-size: 14.5px;
      padding: 11px 13px 11px 38px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      outline: none;
    }

    .search input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px rgba(1, 148, 243, 0.14);
    }

    .select {
      font-family: var(--font-body);
      font-size: 14.5px;
      padding: 11px 13px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      outline: none;
      max-width: 100%;
    }

    /* ---------- Bảng ---------- */
    .tbl-wrap {
      overflow-x: auto;
      min-width: 0;
      max-width: 100%;
    }

    .tbl {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      min-width: 620px;
    }

    .tbl th {
      text-align: left;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--color-ink-muted);
      padding: 11px 14px;
      background: var(--color-surface-alt);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    .tbl td {
      padding: 13px 14px;
      border-bottom: 1px solid var(--color-border-soft);
      vertical-align: middle;
    }

    .tbl tbody tr:hover {
      background: #f8fbff;
    }

    .col-check {
      width: 44px;
    }

    .col-check input {
      width: 15px;
      height: 15px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }

    .code {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.3px;
    }

    .rowacts {
      display: flex;
      gap: 5px;
      justify-content: flex-end;
      white-space: nowrap;
    }

    /* ---------- Phân trang ---------- */
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 13px 18px;
      border-top: 1px solid var(--color-border);
      font-size: 13px;
      color: var(--color-ink-muted);
      flex-wrap: wrap;
    }

    .pager__p {
      display: flex;
      gap: 5px;
      align-items: center;
    }

    .pg {
      min-width: 32px;
      height: 32px;
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      border-radius: var(--radius-sm);
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 600;
      color: var(--color-ink);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pg mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .pg.on {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }

    .pg:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .pager__size {
      margin-left: 8px;
      padding: 6px 9px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-body);
      font-size: 12.5px;
      background: var(--color-surface);
      color: var(--color-ink);
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */
    @media (max-width: 640px) {
      .pager {
        justify-content: center;
      }

      .search {
        max-width: none;
      }
    }
  `,
})
export class AdminAirlines {
  private readonly airlineService = inject(AirlineService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly rows = signal<Airline[]>([]);
  protected readonly loading = signal(false);
  protected readonly keyword = signal('');
  protected readonly statusFilter = signal<'all' | 'true' | 'false'>('all');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);
  protected readonly selected = signal<Set<number>>(new Set());

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );

  protected readonly hasFilters = computed(
    () => this.keyword().trim().length > 0 || this.statusFilter() !== 'all',
  );

  protected readonly allSelected = computed(
    () => this.rows().length > 0 && this.rows().every((r) => this.selected().has(r.id)),
  );

  /** Nhãn khoảng đang xem, ví dụ "Hiển thị 1–6 trong 6 hãng hàng không". */
  protected readonly rangeLabel = computed(() => {
    const total = this.totalItems();
    if (total === 0) {
      return 'Không có hãng hàng không nào';
    }
    const from = this.pageIndex() * this.pageSize() + 1;
    const to = Math.min(from + this.rows().length - 1, total);
    return `Hiển thị ${from}–${to} trong ${total} hãng hàng không`;
  });

  /** Tối đa 5 số trang quanh trang hiện tại — nhiều hơn thì pager tràn. */
  protected readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.pageIndex() + 1;
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    const numbers: number[] = [];
    for (let p = start; p <= end; p++) {
      numbers.push(p);
    }
    return numbers;
  });

  constructor() {
    this.load();
  }

  protected onKeyword(value: string): void {
    this.keyword.set(value);
    // BR-LIST-02: đổi từ khoá thì quay về trang 1.
    this.pageIndex.set(0);
    this.load();
  }

  protected onStatus(value: 'all' | 'true' | 'false'): void {
    this.statusFilter.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.keyword.set('');
    this.statusFilter.set('all');
    this.pageIndex.set(0);
    this.load();
  }

  protected goTo(index: number): void {
    if (index < 0 || index >= this.totalPages()) {
      return;
    }
    this.pageIndex.set(index);
    this.load();
  }

  protected onPageSize(size: number): void {
    this.pageSize.set(Number(size));
    this.pageIndex.set(0);
    this.load();
  }

  protected toggleRow(id: number): void {
    const next = new Set(this.selected());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selected.set(next);
  }

  protected toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.set(checked ? new Set(this.rows().map((r) => r.id)) : new Set());
  }

  protected openCreate(): void {
    this.openForm(null);
  }

  protected openEdit(row: Airline): void {
    this.openForm(row);
  }

  private openForm(airline: Airline | null): void {
    this.dialog
      .open(AirlineFormDialog, { data: { airline }, width: '460px', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((payload: AirlinePayload | undefined) => {
        if (!payload) {
          return;
        }
        const request$ = airline
          ? this.airlineService.update(airline.id, payload)
          : this.airlineService.create(payload);

        request$.subscribe({
          next: (res) => {
            this.notify(res.message);
            this.load();
          },
          error: (err: Error) => this.notify(err.message),
        });
      });
  }

  protected confirmDelete(row: Airline): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Xóa hãng hàng không?',
          message: `Bạn có chắc muốn xóa "${row.airline_name}"? Bản ghi vẫn được giữ lại để tra lịch sử, không xóa vĩnh viễn.`,
          confirmText: 'Xóa hãng hàng không',
          tone: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }
        this.airlineService.remove(row.id).subscribe({
          next: (res) => {
            this.notify(res.message);
            this.load();
          },
          error: (err: Error) => this.notify(err.message),
        });
      });
  }

  private load(): void {
    this.loading.set(true);
    this.airlineService
      .list({
        page: this.pageIndex() + 1, // API dùng trang bắt đầu từ 1
        size: this.pageSize(),
        keyword: this.keyword(),
        ...(this.statusFilter() === 'all' ? {} : { is_active: this.statusFilter() }),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.totalItems.set(res.data.pagination.total_items);
          // Bỏ chọn những dòng không còn trên trang này.
          const visible = new Set(res.data.items.map((r) => r.id));
          this.selected.set(new Set([...this.selected()].filter((id) => visible.has(id))));
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.notify(err.message);
          this.loading.set(false);
        },
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
