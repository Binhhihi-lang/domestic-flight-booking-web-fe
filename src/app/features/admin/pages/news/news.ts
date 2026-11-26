import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NewsItem } from '@core/models/fleet-news.model';
import { NewsCategoryService, NewsService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý tin tức — NEWS-01→07 (API v0.4 mục 2.9).
 *
 * Lưu ý: `content` là HTML. Màn này chỉ soạn nội dung; khi HIỂN THỊ ở trang
 * khách phải sanitize chống XSS, không dùng [innerHTML] lên dữ liệu thô.
 *
 * Publish/unpublish là endpoint RIÊNG (`POST /{id}/publish`), không đi qua PUT —
 * nên `status` không có trong form; đổi trạng thái bằng thao tác hàng loạt.
 * Bài mới luôn tạo ở `DRAFT` và bắt buộc gắn ít nhất một danh mục (`category_ids`).
 */
@Component({
  selector: 'app-admin-news',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config()" [service]="service" />`,
})
export class AdminNews {
  protected readonly service = inject(NewsService);
  private readonly categoryService = inject(NewsCategoryService);

  private readonly categories = toSignal(this.categoryService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly config = computed<CrudConfig<NewsItem, Partial<NewsItem>>>(() => {
    const categoryList = this.categories()?.data.items ?? [];
    const categoryNameById = new Map(categoryList.map((c) => [c.id, c.name]));
    const categoryFieldOptions = categoryList
      .filter((c) => c.status === 'ACTIVE')
      .map((c) => ({ value: c.id, label: c.name }));
    const categoryFilterOptions = [
      { value: '', label: 'Tất cả danh mục' },
      ...categoryList.map((c) => ({ value: String(c.id), label: c.name })),
    ];

    return {
      title: 'Tin tức',
      subtitle: 'Bài viết hiển thị trên trang khách hàng',
      createLabel: 'Viết bài mới',
      searchPlaceholder: 'Tìm theo tiêu đề',
      emptyIcon: 'feed',
      emptyMessage: 'Chưa có bài viết',
      emptyHint: 'Viết bài đầu tiên để bắt đầu',
      editTitle: 'Sửa bài viết',
      detailTitle: (r) => r.title,
      deleteTitle: () => 'Xóa bài viết?',
      deleteMessage: (r) =>
        `Bạn có chắc muốn xóa "${r.title}"? Bản ghi vẫn được giữ lại để tra lịch sử.`,
      columns: [
        {
          label: 'Ảnh',
          value: (r) => r.thumbnail_url ?? '',
          image: (r) => r.thumbnail_url,
          width: '76px',
        },
        { label: 'Tiêu đề', value: (r) => r.title },
        {
          label: 'Danh mục',
          value: (r) => {
            if (r.categories?.length) {
              return r.categories.map((c) => c.name).join(', ');
            }
            if (r.category_ids?.length) {
              const names = r.category_ids
                .map((id) => categoryNameById.get(id))
                .filter((n): n is string => Boolean(n));
              if (names.length > 0) {
                return names.join(', ');
              }
            }
            return '—';
          },
        },
        {
          label: 'Trạng thái',
          value: (r) => (r.status === 'PUBLISHED' ? 'Đã đăng' : 'Bản nháp'),
          tone: (r) => (r.status === 'PUBLISHED' ? 'success' : 'warning'),
        },
        {
          label: 'Ngày đăng',
          value: (r) => (r.published_at ? AdminNews.shortDate(r.published_at) : '—'),
          kind: 'num',
        },
      ],
      fields: [
        {
          key: 'title',
          shownInTable: true,
          label: 'Tiêu đề',
          type: 'text',
          required: true,
          maxLength: 250,
          fullWidth: true,
        },
        {
          key: 'category_ids',
          shownInTable: true,
          label: 'Danh mục tin',
          type: 'multiselect',
          required: true,
          fullWidth: true,
          options: categoryFieldOptions,
          hint: 'Chọn ít nhất một danh mục để phân loại và xuất bản bài viết.',
        },
        {
          key: 'thumbnail_url',
          shownInTable: true,
          label: 'Ảnh đại diện',
          type: 'image',
          maxLength: 500,
          fullWidth: true,
          hint: 'Dán đường dẫn ảnh hoặc chọn ảnh từ máy.',
        },
        {
          key: 'content',
          label: 'Nội dung (HTML)',
          type: 'textarea',
          required: true,
          fullWidth: true,
          hint: 'Cho phép thẻ HTML. Nội dung sẽ được làm sạch trước khi hiển thị.',
        },
      ],
      filters: [
        {
          key: 'category_id',
          label: 'Lọc theo danh mục',
          defaultValue: '',
          options: categoryFilterOptions,
        },
        {
          key: 'status',
          label: 'Lọc theo trạng thái',
          defaultValue: '',
          options: [
            { value: '', label: 'Tất cả trạng thái' },
            { value: 'PUBLISHED', label: 'Đã đăng' },
            { value: 'DRAFT', label: 'Bản nháp' },
          ],
        },
      ],
      bulk: {
        activeLabel: 'Xuất bản',
        inactiveLabel: 'Ngừng xuất bản',
        activeStatus: 'PUBLISHED',
        inactiveStatus: 'UNPUBLISHED',
      },
    };
  });

  /** '2026-10-05T02:00:00Z' → '05/10/2026'. */
  private static shortDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN');
  }
}
