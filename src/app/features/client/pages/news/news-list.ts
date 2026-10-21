import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsCategoryBrief, NewsItem } from '@core/models/fleet-news.model';
import {
  PublicNewsCategoryService,
  PublicNewsService,
} from '@core/services/public-catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/**
 * Tin tức cho khách — NEWS-01 (API v0.4 mục 2.9 + 2.11).
 *
 * Chỉ hiện bài ĐÃ ĐĂNG. Backend lọc `status = PUBLISHED` cho GUEST, nhưng mock
 * trả cả bản nháp nên phải tự lọc để hai chế độ hành xử như nhau.
 *
 * VỀ DROPDOWN DANH MỤC: lấy từ `GET /public/news-categories` (API v0.4 mục 2.11)
 * — mảng trần chỉ `{id, name}`, chỉ danh mục đang hoạt động. Trước đây danh sách
 * được suy từ chính các bài đã tải vì endpoint cũ là quyền ADMIN; nay BE đã mở
 * vùng public nên dropdown hiện đủ danh mục, kể cả danh mục chưa có bài.
 */
@Component({
  selector: 'app-news-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './news-list.html',
  styleUrl: './news-list.css',
})
export class ClientNewsList {
  private readonly newsService = inject(PublicNewsService);
  private readonly categoryService = inject(PublicNewsCategoryService);

  protected readonly loading = signal(true);
  protected readonly news = signal<NewsItem[]>([]);
  protected readonly categories = signal<NewsCategoryBrief[]>([]);
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  /** Danh mục đang lọc; `null` = tất cả. */
  protected readonly activeCategory = signal<number | null>(null);

  constructor() {
    this.loadCategories();
    this.load();
  }

  /**
   * Danh mục cho dropdown — không chặn việc tải bài.
   *
   * Lỗi ở đây thì dropdown rỗng và trang vẫn hiện đủ bài; chặn cả trang vì
   * một bộ lọc phụ là đánh đổi sai.
   */
  private loadCategories(): void {
    this.categoryService.listAll().subscribe({
      next: (res) => this.categories.set(res.data ?? []),
      error: () => this.categories.set([]),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.newsService.list({ page: 1, size: 50, sort: 'published_at,desc' }).subscribe({
      next: (res) => {
        this.news.set(res.data.items.filter((n) => n.status === 'PUBLISHED'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Bài hiển thị theo danh mục đang lọc. */
  protected readonly visibleNews = computed(() => {
    const cat = this.activeCategory();
    if (cat === null) {
      return this.news();
    }
    return this.news().filter((n) => (n.categories ?? []).some((c) => c.id === cat));
  });

  protected onCategoryChange(value: string): void {
    this.activeCategory.set(value === '' ? null : Number(value));
  }

  protected markBroken(id: number): void {
    const next = new Set(this.brokenThumbs());
    next.add(id);
    this.brokenThumbs.set(next);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Mô tả ngắn cho thẻ tin — cắt từ `content`.
   *
   * CHỈ dùng để hiện chữ, KHÔNG render HTML. Bỏ thẻ bằng regex ở đây là đủ an
   * toàn vì kết quả đi vào nội suy `{{ }}` (Angular tự escape). Việc render HTML
   * thật chỉ xảy ra ở trang chi tiết, và ở đó BẮT BUỘC qua `SanitizeService`.
   */
  protected excerpt(html: string): string {
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 130 ? `${text.slice(0, 130)}…` : text;
  }
}
