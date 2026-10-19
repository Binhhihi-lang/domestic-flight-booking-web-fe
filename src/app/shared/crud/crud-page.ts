import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ApiResponse, BulkResult, ListQuery } from '@core/models/api-response.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { PageHeader } from '@shared/components/page-header/page-header';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { MatDialog } from '@angular/material/dialog';
import { CrudConfig, CrudField } from '@shared/crud/crud-config';

/**
 * Màn CRUD dùng chung — ba chế độ: danh sách, form, chi tiết.
 *
 * Vì sao gộp ba chế độ vào một component: cả ba đều xoay quanh cùng một
 * `CrudConfig` (cột, trường, nhãn). Tách thành ba component thì mỗi module phải
 * khai ba nơi và dễ lệch nhau. Chế độ đọc từ `route.data.mode`, do
 * `crudRoutes()` sinh ra.
 *
 * Vì sao form là TRANG RIÊNG chứ không phải hộp thoại: tài liệu UI quy định vậy
 * (F4/F5), và form nghiệp vụ có tới 14 trường nên hộp thoại phải cuộn, khó nhìn
 * tổng thể. Trang riêng cũng cho phép dán link trực tiếp tới form sửa.
 */
@Component({
  selector: 'app-crud-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    PageHeader,
    AppButton,
    AppCard,
    StatusBadge,
    EmptyState,
    LoadingState,
  ],
  templateUrl: './crud-page.html',
  styleUrl: './crud-page.css',
})
export class CrudPage<T extends { id: number }, P = Partial<T>> implements OnInit {
  readonly config = input.required<CrudConfig<T, P>>();
  readonly service = input.required<BaseCrudService<T, P>>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** 'list' | 'form' | 'detail' — do crudRoutes() gắn vào route.data. */
  protected readonly mode = signal<'list' | 'form' | 'detail'>('list');

  protected readonly rows = signal<T[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly keyword = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly totalItems = signal(0);
  protected readonly filterValues = signal<Record<string, string>>({});

  /** Bản ghi đang xem/sửa (chế độ detail/form). */
  protected readonly current = signal<T | null>(null);
  /** Bản nháp của form, khoá theo tên trường. */
  protected readonly draft = signal<Record<string, unknown>>({});
  /** Lỗi validate theo trường, hiện ngay dưới ô nhập. */
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );

  protected readonly hasFilters = computed(
    () =>
      this.keyword().trim().length > 0 ||
      Object.values(this.filterValues()).some((v) => v !== '' && v !== undefined),
  );

  protected readonly rangeLabel = computed(() => {
    const total = this.totalItems();
    const noun = this.config().title.toLowerCase();
    if (total === 0) {
      return `Không có ${noun} nào`;
    }
    const from = this.pageIndex() * this.pageSize() + 1;
    const to = Math.min(from + this.rows().length - 1, total);
    return `Hiển thị ${from}–${to} trong ${total} ${noun}`;
  });

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

  /** Đường dẫn gốc của module, suy từ URL hiện tại (bỏ /new, /:id, /:id/edit). */
  protected readonly basePath = computed(() => {
    const url = this.router.url.split('?')[0];
    return url.replace(/\/(new|\d+(\/edit)?)$/, '');
  });

  // =====================================================================
  // Chọn nhiều dòng để thao tác hàng loạt
  // =====================================================================

  /**
   * Id các hàng đang được chọn.
   *
   * Vì sao lưu theo ID chứ không theo chỉ số hàng: sau khi tải lại danh sách
   * (đổi trang, lọc, xóa xong) thì chỉ số đổi hết, còn id vẫn định danh đúng
   * bản ghi. Lưu chỉ số sẽ chọn nhầm hàng sau mỗi lần tải lại.
   */
  protected readonly selectedIds = signal<Set<number>>(new Set());

  protected readonly selectedCount = computed(() => this.selectedIds().size);

  /** Chọn-tất-cả chỉ áp cho TRANG HIỆN TẠI — không chọn xuyên trang. */
  protected readonly allOnPageSelected = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every((r) => this.selectedIds().has(r.id));
  });

  /** Có hàng được chọn VÀ có hàng chưa chọn — để hiện trạng thái nửa chọn. */
  protected readonly someOnPageSelected = computed(() => {
    const rows = this.rows();
    const n = rows.filter((r) => this.selectedIds().has(r.id)).length;
    return n > 0 && n < rows.length;
  });

  protected isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleRow(id: number, event: Event): void {
    // Checkbox nằm trong hàng có handler mở chi tiết — chặn nổi bọt để bấm ô
    // chọn không mở luôn trang chi tiết.
    event.stopPropagation();
    const next = new Set(this.selectedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedIds.set(next);
  }

  protected toggleAllOnPage(event: Event): void {
    event.stopPropagation();
    const next = new Set(this.selectedIds());
    if (this.allOnPageSelected()) {
      for (const r of this.rows()) {
        next.delete(r.id);
      }
    } else {
      for (const r of this.rows()) {
        next.add(r.id);
      }
    }
    this.selectedIds.set(next);
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  /** Bỏ chọn những id không còn trong danh sách — tránh giữ id đã bị xóa. */
  private pruneSelection(): void {
    const alive = new Set(this.rows().map((r) => r.id));
    const kept = [...this.selectedIds()].filter((id) => alive.has(id));
    if (kept.length !== this.selectedIds().size) {
      this.selectedIds.set(new Set(kept));
    }
  }

  /**
   * Bật/tắt trạng thái cho các hàng đang chọn — gọi endpoint bulk thật
   * (`PATCH /admin/{resource}/bulk`, API v0.4 mục 2.10).
   *
   * Trước đây gọi tuần tự từng `PUT /{id}` vì BE chưa có bulk; nay BE đã có nên
   * dùng bulk: một request, kết quả TỪNG PHẦN (`succeeded`/`failed`) thay vì
   * phải tự đếm.
   */
  protected bulkSetActive(isActive: boolean): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) {
      return;
    }
    this.runBulkRequest(
      (svc) => svc.bulkToggle(ids, isActive ? 'ACTIVE' : 'INACTIVE'),
      isActive ? 'Đã kích hoạt' : 'Đã ngừng hoạt động',
      ids.length,
    );
  }

  /** Xóa mềm hàng loạt — phải qua hộp thoại xác nhận vì là hành động phá hủy. */
  protected bulkDelete(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) {
      return;
    }
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: `Xóa ${ids.length} bản ghi?`,
          message: `Bạn có chắc muốn xóa ${ids.length} bản ghi đang chọn? Dữ liệu vẫn được giữ lại để tra lịch sử nhưng sẽ không hiện trong danh sách.`,
          confirmText: 'Xóa',
          tone: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }
        this.runBulkRequest(
          (svc) => svc.bulkRemove(ids),
          'Đã xóa',
          ids.length,
        );
      });
  }

  /**
   * Chạy một lời gọi bulk và báo kết quả từng phần.
   *
   * Backend không chặn cả lô khi một bản ghi vi phạm — nó trả `failed` kèm mã
   * lỗi. Vì vậy phải đọc `failed` chứ không coi HTTP 200 là tất cả thành công.
   */
  private runBulkRequest(
    request: (svc: BaseCrudService<T, P>) => Observable<ApiResponse<BulkResult>>,
    verb: string,
    total: number,
  ): void {
    this.saving.set(true);
    request(this.service()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.clearSelection();
        this.load();

        const failed = res.data?.failed ?? [];
        if (failed.length === 0) {
          this.notify(`${verb} ${total} bản ghi`);
          return;
        }
        const detail = failed.map((f) => `#${f.id} (${f.message})`).join('; ');
        this.notify(
          `${verb} ${total - failed.length}/${total} bản ghi. Không xử lý được ${failed.length}: ${detail}`,
        );
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.notify(err.message);
      },
    });
  }

  ngOnInit(): void {
    this.pageSize.set(this.config().pageSize ?? 10);
    this.initFilters();

    this.route.data.subscribe((data) => {
      const mode = (data['mode'] as 'list' | 'form' | 'detail') ?? 'list';
      this.mode.set(mode);
      if (mode === 'list') {
        this.load();
      } else {
        this.loadOne();
      }
    });
  }

  // =====================================================================
  // Chế độ danh sách
  // =====================================================================

  private initFilters(): void {
    const initial: Record<string, string> = {};
    for (const f of this.config().filters ?? []) {
      initial[f.key] = f.defaultValue;
    }
    this.filterValues.set(initial);
  }

  protected filterValue(key: string): string {
    return this.filterValues()[key] ?? '';
  }

  protected onFilter(key: string, value: string): void {
    this.filterValues.set({ ...this.filterValues(), [key]: value });
    this.pageIndex.set(0);
    this.load();
  }

  protected onKeyword(value: string): void {
    this.keyword.set(value);
    // BR-LIST-02: đổi từ khoá thì quay về trang 1.
    this.pageIndex.set(0);
    this.load();
  }

  protected clearFilters(): void {
    this.keyword.set('');
    this.initFilters();
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

  protected onPageSize(size: string | number): void {
    this.pageSize.set(Number(size));
    this.pageIndex.set(0);
    this.load();
  }

  /** Bấm vào hàng để xem chi tiết — màn chỉ đọc thì không điều hướng. */
  protected openDetail(row: T): void {
    if (this.config().readonly) {
      return;
    }
    this.router.navigate([`${this.basePath()}/${row.id}`]);
  }

  /** Mở trang thêm mới. Điều hướng bằng TS vì AppButton là <button>, không
   *  gắn được routerLink (directive của router chỉ áp cho thẻ <a>). */
  protected goCreate(): void {
    this.router.navigate([`${this.basePath()}/new`]);
  }

  /** Mở trang sửa của một bản ghi. */
  protected goEdit(row: T): void {
    this.router.navigate([`${this.basePath()}/${row.id}/edit`]);
  }

  /** Bàn phím: Enter/Space trên hàng cũng mở chi tiết (a11y). */
  protected onRowKey(event: KeyboardEvent, row: T): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openDetail(row);
    }
  }

  protected confirmDelete(row: T, event: Event): void {
    // Nút Xóa nằm trong hàng có handler mở chi tiết — chặn nổi bọt.
    event.stopPropagation();
    const cfg = this.config();
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: cfg.deleteTitle(row),
          message: cfg.deleteMessage(row),
          confirmText: 'Xóa',
          tone: 'warn',
        },
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (!confirmed) {
          return;
        }
        this.service().remove(row.id).subscribe({
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

    // Endpoint trả MẢNG TRẦN (BR-LIST-05) — Role, Permission. Không phân trang,
    // không nhận `page`/`size`, nên đi đường riêng thay vì nhồi vào `list()`.
    if (this.config().unpaginated) {
      this.loadUnpaginated();
      return;
    }

    const query: ListQuery = {
      page: this.pageIndex() + 1, // API dùng trang bắt đầu từ 1
      size: this.pageSize(),
      keyword: this.keyword(),
    };
    for (const [key, value] of Object.entries(this.filterValues())) {
      if (value !== '' && value !== undefined && value !== null) {
        query[key] = value;
      }
    }

    this.service()
      .list(query)
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.totalItems.set(res.data.pagination.total_items);
          this.pruneSelection();
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.notify(err.message);
          this.loading.set(false);
        },
      });
  }

  /**
   * Nạp danh sách không phân trang.
   *
   * Vì sao dùng `searchAll` khi có và không có từ khoá/bộ lọc: `PermissionService`
   * có bản nhận query (lọc theo `module`), còn `RoleService` chỉ có `listAll()`.
   * Kiểm tra theo thực tế service cung cấp gì thay vì buộc mọi service phải có
   * cùng bộ method.
   */
  private loadUnpaginated(): void {
    const query: ListQuery = {};
    if (this.keyword().trim()) {
      query['keyword'] = this.keyword();
    }
    for (const [key, value] of Object.entries(this.filterValues())) {
      if (value !== '' && value !== undefined && value !== null) {
        query[key] = value;
      }
    }

    const svc = this.service() as unknown as {
      searchAll?: (q: ListQuery) => Observable<ApiResponse<unknown[]>>;
      listAll: () => Observable<ApiResponse<unknown[]>>;
    };
    const request$ = Object.keys(query).length > 0 && svc.searchAll
      ? svc.searchAll(query)
      : svc.listAll();

    request$.subscribe({
      next: (res) => {
        const items = res.data as T[];
        this.rows.set(items);
        this.totalItems.set(items.length);
        this.pruneSelection();
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
      },
    });
  }

  // =====================================================================
  // Chế độ chi tiết & form
  // =====================================================================

  private loadOne(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      // Chế độ form thêm mới: dựng bản nháp từ giá trị mặc định.
      this.current.set(null);
      this.draft.set(this.buildDraft(null));
      return;
    }

    this.loading.set(true);
    this.service()
      .getById(Number(idParam))
      .subscribe({
        next: (res) => {
          this.current.set(res.data);
          this.draft.set(this.buildDraft(res.data));
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.notify(err.message);
          this.loading.set(false);
          this.router.navigate([this.basePath()]);
        },
      });
  }

  /** Trường hiển thị theo chế độ: `createOnly` ẩn khi sửa, `editOnly` ẩn khi tạo. */
  protected visibleFields(): CrudField[] {
    const editing = this.current() !== null;
    return this.config().fields.filter((f) => (editing ? !f.createOnly : !f.editOnly));
  }

  private buildDraft(row: T | null): Record<string, unknown> {
    const draft: Record<string, unknown> = {};
    const source = row as Record<string, unknown> | null;

    for (const field of this.visibleFields()) {
      const fromRow = source ? source[field.key] : undefined;
      draft[field.key] =
        fromRow !== undefined && fromRow !== null ? fromRow : this.defaultFor(field);
    }
    return draft;
  }

  private defaultFor(field: CrudField): unknown {
    switch (field.type) {
      case 'toggle':
        return true;
      case 'number':
        return null;
      case 'select':
        return field.options?.length ? field.options[0].value : null;
      default:
        return '';
    }
  }

  protected setField(key: string, value: unknown): void {
    this.draft.set({ ...this.draft(), [key]: value });
    // Xoá lỗi của ô vừa sửa để người dùng thấy phản hồi ngay.
    if (this.fieldErrors()[key]) {
      const next = { ...this.fieldErrors() };
      delete next[key];
      this.fieldErrors.set(next);
    }
  }

  protected fieldValue(key: string): unknown {
    return this.draft()[key];
  }

  /**
   * Đọc ảnh người dùng chọn từ máy thành data URL (base64) và lưu vào trường.
   *
   * Vì sao data URL thay vì upload ngay: BE chưa có endpoint upload ảnh cho
   * các module này (chỉ Cloudinary cho avatar ở Profile). Data URL cho phép xem
   * trước tức thì và vẫn gửi được trong payload JSON. Khi BE có endpoint, chỉ
   * cần đổi chỗ này thành gọi upload rồi lưu URL trả về — phần còn lại giữ nguyên.
   *
   * Giới hạn 2 MB: base64 phình ~33% và đi kèm payload JSON, ảnh lớn sẽ làm
   * request nặng và có thể vượt giới hạn body của server.
   */
  protected onPickImage(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.notify('Vui lòng chọn một tệp ảnh');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notify('Ảnh vượt quá 2 MB. Chọn ảnh nhỏ hơn hoặc dán đường dẫn.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.setField(key, reader.result as string);
      // Xoá giá trị input file để chọn lại cùng tệp vẫn kích hoạt (change).
      input.value = '';
    };
    reader.onerror = () => {
      this.notify('Không đọc được tệp ảnh');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  protected asString(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  /** Kiểm tra trường bắt buộc; ghi lỗi vào `fieldErrors` và trả về true nếu hợp lệ. */
  private validate(): boolean {
    const errors: Record<string, string> = {};
    for (const f of this.visibleFields()) {
      if (!f.required) {
        continue;
      }
      const v = this.draft()[f.key];
      const empty = typeof v === 'string' ? v.trim().length === 0 : v === null || v === undefined;
      if (empty) {
        errors[f.key] = `${f.label} không được để trống`;
      }
    }
    this.fieldErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  protected save(): void {
    if (!this.validate()) {
      this.notify('Vui lòng kiểm tra lại các ô được đánh dấu');
      return;
    }

    // Chuẩn hoá: bỏ khoảng trắng thừa ở trường chữ, đổi chuỗi số thành number.
    const payload: Record<string, unknown> = {};
    for (const field of this.visibleFields()) {
      let v = this.draft()[field.key];
      if (typeof v === 'string') {
        v = v.trim();
        if (field.type === 'number' && v !== '') {
          v = Number(v);
        }
      }
      payload[field.key] = v;
    }

    const editing = this.current();
    this.saving.set(true);
    const request$ = editing
      ? this.service().update(editing.id, payload as P)
      : this.service().create(payload as P);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notify(res.message);
        this.router.navigate([this.basePath()]);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.notify(err.message);
      },
    });
  }

  protected cancel(): void {
    this.router.navigate([this.basePath()]);
  }

  /** Ảnh trong bảng tải lỗi (URL hỏng, chặn hotlink) → đánh dấu để hiện khung nền. */
  protected readonly brokenImages = signal<Set<string>>(new Set());

  /** Đánh dấu một URL ảnh là hỏng để không hiện icon ảnh vỡ của trình duyệt. */
  protected markImageBroken(src: string): void {
    const next = new Set(this.brokenImages());
    next.add(src);
    this.brokenImages.set(next);
  }

  protected isImageBroken(src: string | null): boolean {
    return src === null || src === '' || this.brokenImages().has(src);
  }

  protected isEdit(): boolean {
    return this.current() !== null;
  }

  /** Tiêu đề trang chi tiết — dùng `detailTitle` của module nếu có. */
  protected detailHeading(row: T): string {
    const custom = this.config().detailTitle;
    return custom ? custom(row) : this.config().title;
  }

  /**
   * Giá trị của một trường form CHƯA xuất hiện trong cột bảng — hiện thêm ở
   * trang chi tiết. Trả chuỗi rỗng nếu trường đã có cột (tránh lặp) hoặc rỗng.
   *
   * So khớp theo `key` + cờ `shownInTable` của module, KHÔNG theo nhãn: nhãn cột
   * và nhãn trường thường khác nhau ("Mã" vs "Mã thành phố") nên so theo nhãn
   * sẽ làm trường bị lặp.
   */
  protected detailExtra(field: CrudField, row: T): string {
    if (field.shownInTable || field.type === 'toggle') {
      return '';
    }
    const raw = (row as Record<string, unknown>)[field.key];
    if (raw === null || raw === undefined || raw === '') {
      return '';
    }
    return String(raw);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
