import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, switchMap, takeUntil, timer } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, BulkResult, ListQuery } from '@core/models/api-response.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UploadService } from '@core/services/upload.service';
import { ConfirmDialog } from '@shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { PageHeader } from '@shared/components/page-header/page-header';
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { CrudBulkConfig, CrudConfig, CrudField } from '@shared/crud/crud-config';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

/**
 * Màn CRUD dùng chung — ba chế độ: danh sách, form, chi tiết.
 *
 * Bám sát bố cục prototype `admin.css`:
 * - Bộ lọc tách thành thẻ trắng riêng (`.adm-filter--card`) phía trên bảng
 * - Thẻ danh sách (`.adm-listcard`) sát mép không thụt lề, tiêu đề bảng sticky,
 *   mã dùng monospace, thanh phân trang `ServerPager` dính sát đáy thẻ
 * - Ô tìm kiếm debounce 300ms tránh spam API
 * - Trường `createOnly` hiển thị ở trạng thái `disabled` khi sửa và giữ nguyên giá trị gốc trong payload `PUT`
 * - Tải ảnh gọi `UploadService.uploadAdminImage()` (chỉ fallback `FileReader` khi chạy mock/test)
 */
@Component({
  selector: 'app-crud-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    PageHeader,
    ServerPager,
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
  private readonly uploadService = inject(UploadService);
  private readonly destroyRef = inject(DestroyRef);

  /** 'list' | 'form' | 'detail' — do crudRoutes() gắn vào route.data. */
  protected readonly mode = signal<'list' | 'form' | 'detail'>('list');

  protected readonly rows = signal<T[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploadingField = signal<string | null>(null);
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

  /** Luồng tìm kiếm có debounce 300ms và hủy kịp thời khi nhấn "Bỏ lọc". */
  private readonly keyword$ = new Subject<string>();
  private readonly cancelSearch$ = new Subject<void>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );

  protected readonly hasFilterBar = computed(
    () =>
      Boolean(this.config().searchPlaceholder) || (this.config().filters?.length ?? 0) > 0,
  );

  protected readonly hasFilters = computed(
    () =>
      this.keyword().trim().length > 0 ||
      Object.values(this.filterValues()).some((v) => v !== '' && v !== undefined),
  );

  /** Chỉ hiện checkbox & thanh thao tác hàng loạt khi không readonly và không disableBulk. */
  protected readonly showBulk = computed(
    () => !this.config().readonly && !this.config().disableBulk,
  );

  /** Đường dẫn gốc của module, suy từ URL hiện tại (bỏ /new, /:id, /:id/edit). */
  protected readonly basePath = computed(() => {
    const url = this.router.url.split('?')[0];
    return url.replace(/\/(new|\d+(\/edit)?)$/, '');
  });

  // =====================================================================
  // Chọn nhiều dòng để thao tác hàng loạt
  // =====================================================================

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

  protected readonly bulkLabels = computed<CrudBulkConfig>(
    () =>
      this.config().bulk ?? {
        activeLabel: 'Kích hoạt',
        inactiveLabel: 'Ngừng',
        activeStatus: 'ACTIVE',
        inactiveStatus: 'INACTIVE',
      },
  );

  protected bulkSetActive(isActive: boolean): void {
    if (!this.showBulk()) {
      return;
    }
    const ids = [...this.selectedIds()];
    if (ids.length === 0) {
      return;
    }
    const bulk = this.bulkLabels();
    const label = isActive ? bulk.activeLabel : bulk.inactiveLabel;
    this.runBulkRequest(
      (svc) => svc.bulkToggle(ids, isActive ? bulk.activeStatus : bulk.inactiveStatus),
      `Đã ${label.toLowerCase()}`,
      ids.length,
    );
  }

  /** Xóa mềm hàng loạt — phải qua hộp thoại xác nhận vì là hành động phá hủy. */
  protected bulkDelete(): void {
    if (!this.showBulk()) {
      return;
    }
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

    this.keyword$
      .pipe(
        switchMap(() => timer(300).pipe(takeUntil(this.cancelSearch$))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.pageIndex.set(0);
        this.load();
      });

    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
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
    // Debounce 300ms — BR-LIST-02 quay về trang 1 khi tải lại.
    this.keyword$.next(value);
  }

  protected clearFilters(): void {
    this.cancelSearch$.next();
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

  protected canDeleteRow(row: T): boolean {
    const hide = this.config().hideDelete;
    return hide ? !hide(row) : true;
  }

  /** Bấm vào hàng để xem chi tiết — màn chỉ đọc thì không điều hướng. */
  protected openDetail(row: T): void {
    if (this.config().readonly) {
      return;
    }
    this.router.navigate([`${this.basePath()}/${row.id}`]);
  }

  protected goCreate(): void {
    this.router.navigate([`${this.basePath()}/new`]);
  }

  protected goEdit(row: T): void {
    this.router.navigate([`${this.basePath()}/${row.id}/edit`]);
  }

  protected onRowKey(event: KeyboardEvent, row: T): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openDetail(row);
    }
  }

  protected confirmDelete(row: T, event: Event): void {
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

    if (this.config().unpaginated) {
      this.loadUnpaginated();
      return;
    }

    const query: ListQuery = {
      page: this.pageIndex() + 1,
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
    const request$ =
      Object.keys(query).length > 0 && svc.searchAll ? svc.searchAll(query) : svc.listAll();

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

  /**
   * Trường hiển thị theo chế độ:
   * - Khi TẠO: ẩn `editOnly`.
   * - Khi SỬA: vẫn HIỂN THỊ `createOnly` ở trạng thái `disabled` (chỉ đọc) để
   *   người dùng thấy khóa gốc và giữ nguyên giá trị trong payload `PUT`.
   */
  protected visibleFields(): CrudField[] {
    const editing = this.current() !== null;
    return this.config().fields.filter((f) => (editing ? true : !f.editOnly));
  }

  protected isFieldDisabled(field: CrudField): boolean {
    return this.isEdit() && !!field.createOnly;
  }

  private buildDraft(row: T | null): Record<string, unknown> {
    const draft: Record<string, unknown> = {};
    const source = row as Record<string, unknown> | null;

    for (const field of this.visibleFields()) {
      let fromRow = source ? source[field.key] : undefined;

      // Fallback cho bài viết Tin tức: BE có thể trả `categories: [{id, name}]` thay vì `category_ids`.
      if (
        field.type === 'multiselect' &&
        (fromRow === undefined || fromRow === null) &&
        field.key === 'category_ids' &&
        source &&
        Array.isArray(source['categories'])
      ) {
        fromRow = (source['categories'] as Array<{ id?: number }>)
          .map((c) => c.id)
          .filter((id): id is number => id !== undefined && id !== null);
      }

      if (fromRow === undefined || fromRow === null) {
        draft[field.key] = this.defaultFor(field);
      } else if (field.type === 'datetime-local') {
        draft[field.key] = CrudPage.toDatetimeLocal(fromRow);
      } else if (field.type === 'multiselect') {
        draft[field.key] = Array.isArray(fromRow) ? [...fromRow] : [];
      } else {
        draft[field.key] = fromRow;
      }
    }
    return draft;
  }

  private defaultFor(field: CrudField): unknown {
    switch (field.type) {
      case 'toggle':
        return true;
      case 'number':
        return null;
      case 'color':
        return null;
      case 'multiselect':
        return [];
      case 'select':
        return field.options?.length ? field.options[0].value : null;
      default:
        return '';
    }
  }

  /** Chuẩn hoá giá trị ô màu: rỗng → null, ngược lại chữ HOA. */
  protected asColor(value: string): string | null {
    const v = (value ?? '').trim();
    return v.length === 0 ? null : v.toUpperCase();
  }

  protected setField(key: string, value: unknown): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (this.fieldErrors()[key]) {
      const next = { ...this.fieldErrors() };
      delete next[key];
      this.fieldErrors.set(next);
    }
  }

  protected fieldValue(key: string): unknown {
    return this.draft()[key];
  }

  protected isMultiSelected(key: string, optionValue: string | number | boolean | null): boolean {
    const current = this.draft()[key];
    if (!Array.isArray(current)) {
      return false;
    }
    return current.some((v) => String(v) === String(optionValue));
  }

  protected toggleMultiOption(key: string, optionValue: string | number | boolean | null): void {
    const current = Array.isArray(this.draft()[key]) ? [...(this.draft()[key] as unknown[])] : [];
    const idx = current.findIndex((v) => String(v) === String(optionValue));
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(optionValue);
    }
    this.setField(key, current);
  }

  /**
   * Tải ảnh lên server qua `UploadService.uploadAdminImage()` để nhận URL gọn
   * (< 500 ký tự). Chỉ fallback sang `FileReader` (data URL) khi chạy trong
   * môi trường mock hoặc Vitest.
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
    if (file.size > 5 * 1024 * 1024) {
      this.notify('Ảnh vượt quá 5 MB. Chọn ảnh nhỏ hơn hoặc dán đường dẫn.');
      input.value = '';
      return;
    }

    if (this.shouldUseFileReaderFallback()) {
      const reader = new FileReader();
      reader.onload = () => {
        this.setField(key, reader.result as string);
        input.value = '';
      };
      reader.onerror = () => {
        this.notify('Không đọc được tệp ảnh');
        input.value = '';
      };
      reader.readAsDataURL(file);
      return;
    }

    this.uploadingField.set(key);
    this.uploadService.uploadAdminImage(file).subscribe({
      next: (res) => {
        this.uploadingField.set(null);
        const url = res.data?.url ?? '';
        if (url) {
          this.clearBrokenImage(url);
          this.setField(key, url);
          this.notify(res.message || 'Tải ảnh lên thành công');
        } else {
          this.notify('Không nhận được đường dẫn ảnh từ máy chủ');
        }
        input.value = '';
      },
      error: (err: Error) => {
        this.uploadingField.set(null);
        this.notify(err.message || 'Không thể tải ảnh lên');
        input.value = '';
      },
    });
  }

  private shouldUseFileReaderFallback(): boolean {
    const isVitest =
      typeof import.meta !== 'undefined' &&
      Boolean((import.meta as unknown as { vitest?: unknown }).vitest);
    return environment.useMock || isVitest;
  }

  protected asString(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private validate(): boolean {
    const errors: Record<string, string> = {};
    for (const f of this.visibleFields()) {
      if (!f.required) {
        continue;
      }
      const v = this.draft()[f.key];
      let empty = false;
      if (f.type === 'multiselect') {
        empty = !Array.isArray(v) || v.length === 0;
      } else if (typeof v === 'string') {
        empty = v.trim().length === 0;
      } else {
        empty = v === null || v === undefined;
      }
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

    const editing = this.current();
    const editingRecord = editing as Record<string, unknown> | null;
    const payload: Record<string, unknown> = {};

    for (const field of this.visibleFields()) {
      let v = this.draft()[field.key];

      // Khi sửa bản ghi, trường `createOnly` giữ nguyên giá trị gốc từ bản ghi
      // để Backend `@NotNull`/`@NotBlank` không trả lỗi 400.
      if (editingRecord && field.createOnly) {
        const original = editingRecord[field.key];
        if (original !== undefined && original !== null) {
          v = original;
        }
      }

      if (field.type === 'datetime-local') {
        v = CrudPage.fromDatetimeLocal(v);
      } else if (field.type === 'multiselect') {
        v = Array.isArray(v) ? v : [];
      } else if (typeof v === 'string') {
        v = v.trim();
        if (field.type === 'number' && v !== '') {
          v = Number(v);
        }
      }
      payload[field.key] = v;
    }

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

  protected readonly brokenImages = signal<Set<string>>(new Set());

  protected markImageBroken(src: string): void {
    const next = new Set(this.brokenImages());
    next.add(src);
    this.brokenImages.set(next);
  }

  private clearBrokenImage(src: string): void {
    if (this.brokenImages().has(src)) {
      const next = new Set(this.brokenImages());
      next.delete(src);
      this.brokenImages.set(next);
    }
  }

  protected isImageBroken(src: string | null): boolean {
    return src === null || src === '' || this.brokenImages().has(src);
  }

  protected isEdit(): boolean {
    return this.current() !== null;
  }

  protected detailHeading(row: T): string {
    const custom = this.config().detailTitle;
    return custom ? custom(row) : this.config().title;
  }

  /**
   * Giá trị của trường form CHƯA xuất hiện trong cột bảng — hiện thêm ở trang
   * chi tiết, tự ánh xạ `select` / `multiselect` sang nhãn tiếng Việt.
   */
  protected detailExtra(field: CrudField, row: T): string {
    if (field.shownInTable || field.type === 'toggle') {
      return '';
    }
    const source = row as Record<string, unknown>;
    let raw = source[field.key];

    if (
      field.type === 'multiselect' &&
      (raw === undefined || raw === null) &&
      field.key === 'category_ids' &&
      Array.isArray(source['categories'])
    ) {
      raw = (source['categories'] as Array<{ id?: number }>)
        .map((c) => c.id)
        .filter((id): id is number => id !== undefined && id !== null);
    }

    if (raw === null || raw === undefined || raw === '') {
      return '';
    }

    if (field.type === 'select' && field.options?.length) {
      const matched = field.options.find((o) => String(o.value) === String(raw));
      return matched ? matched.label : String(raw);
    }

    if (field.type === 'multiselect' && Array.isArray(raw)) {
      if (raw.length === 0) {
        return '';
      }
      const opts = field.options ?? [];
      return raw
        .map((item) => {
          const matched = opts.find((o) => String(o.value) === String(item));
          return matched ? matched.label : String(item);
        })
        .join(', ');
    }

    if (field.type === 'datetime-local' && typeof raw === 'string') {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    return String(raw);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }

  /** Chuẩn hóa chuỗi ISO từ BE sang định dạng `YYYY-MM-DDTHH:mm` của `<input type="datetime-local">`. */
  private static toDatetimeLocal(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 16);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return `${trimmed}T00:00`;
    }
    return trimmed;
  }

  /** Chuẩn hóa giá trị `datetime-local` gửi lên BE (`LocalDateTime` cần `:00` giây). */
  private static fromDatetimeLocal(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }
    return trimmed;
  }
}
