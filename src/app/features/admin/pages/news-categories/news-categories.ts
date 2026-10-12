import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NewsCategory } from '@core/models/fleet-news.model';
import { NewsCategoryService } from '@core/services/catalog.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

/**
 * Quản lý danh mục tin — NEWS-CAT-01→05 (API v0.2 mục 2.9).
 * Khác News: danh mục KHÔNG public, chỉ ADMIN.
 */
@Component({
  selector: 'app-admin-news-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrudPage],
  template: `<app-crud-page [config]="config" [service]="service" />`,
})
export class AdminNewsCategories {
  protected readonly service = inject(NewsCategoryService);

  protected readonly config: CrudConfig<NewsCategory, Partial<NewsCategory>> = {
    title: 'Danh mục tin',
    subtitle: 'Phân loại bài viết trên trang khách hàng',
    createLabel: 'Thêm danh mục',
    searchPlaceholder: 'Tìm theo tên danh mục',
    emptyIcon: 'label',
    emptyMessage: 'Chưa có danh mục',
    emptyHint: 'Thêm danh mục đầu tiên để bắt đầu',
    editTitle: 'Sửa danh mục',
    deleteTitle: () => 'Xóa danh mục?',
    deleteMessage: (r) =>
      `Bạn có chắc muốn xóa "${r.category_name}"? Danh mục còn bài viết tham chiếu sẽ bị từ chối xóa.`,
    columns: [
      { label: 'Tên danh mục', value: (r) => r.category_name },
      { label: 'Mô tả', value: (r) => r.description ?? '—' },
      {
        label: 'Trạng thái',
        value: (r) => (r.is_active ? 'Hoạt động' : 'Tạm dừng'),
        tone: (r) => (r.is_active ? 'success' : 'neutral'),
      },
    ],
    fields: [
      { key: 'category_name', shownInTable: true, label: 'Tên danh mục', type: 'text', required: true, maxLength: 150 },
      { key: 'description', shownInTable: true, label: 'Mô tả', type: 'textarea', fullWidth: true, maxLength: 500 },
      { key: 'is_active', shownInTable: true, label: 'Trạng thái', type: 'toggle', hint: 'Đang hoạt động' },
    ],
    filters: [
      {
        key: 'is_active',
        label: 'Lọc theo trạng thái',
        defaultValue: '',
        options: [
          { value: '', label: 'Tất cả trạng thái' },
          { value: 'true', label: 'Đang hoạt động' },
          { value: 'false', label: 'Tạm dừng' },
        ],
      },
    ],
  };
}
