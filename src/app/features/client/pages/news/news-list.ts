import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { NewsService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/** Một mục trong dropdown lọc danh mục. */
interface CategoryOption {
  id: number;
  name: string;
}

/**
 * Tin tức cho khách — NEWS-01 (API v0.2 mục 2.9).
 *
 * Chỉ hiện bài ĐÃ ĐĂNG. Backend lọc `status = PUBLISHED` cho GUEST, nhưng mock
 * trả cả bản nháp nên phải tự lọc để hai chế độ hành xử như nhau.
 *
 * VỀ DROPDOWN DANH MỤC: danh sách danh mục được SUY TỪ CHÍNH các bài trả về,
 * không gọi `GET /news-categories` — endpoint đó là quyền ADMIN (API v0.2 mục
 * 2.9 ghi rõ "category không public"), khách gọi sẽ bị chặn. Đã nêu trong đề xuất
 * gửi BE để Bình chốt có mở public hay không.
 *
 * Hệ quả của cách suy: dropdown chỉ liệt kê danh mục CÓ bài đã đăng. Với một bộ
 * lọc thì đó là hành vi hợp lý — lọc theo danh mục rỗng thì luôn ra 0 bài.
 */
@Component({
  selector: 'app-news-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './news-list.html',
  styleUrl: './news-list.css',
})
export class ClientNewsList {
  private readonly newsService = inject(NewsService);

  protected readonly loading = signal(true);
  protected readonly news = signal<NewsItem[]>([]);
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  /** Danh mục đang lọc; `null` = tất cả. */
  protected readonly activeCategory = signal<number | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    // Lấy rộng rồi lọc ở client: cần TOÀN BỘ bài đã đăng để suy ra danh mục, mà
    // gọi hai lần (một để lấy danh mục, một để lọc) thì thừa.
    this.newsService.list({ page: 1, size: 50, sort: 'published_at,desc' }).subscribe({
      next: (res) => {
        this.news.set(res.data.items.filter((n) => n.status === 'PUBLISHED'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Danh mục suy từ các bài đã tải — gom id duy nhất, giữ tên.
   *
   * Sắp theo tên để dropdown có thứ tự ổn định; nếu để theo thứ tự bài thì mỗi
   * lần bài mới lên đầu là danh mục nhảy vị trí.
   */
  protected readonly categories = computed<CategoryOption[]>(() => {
    const map = new Map<number, string>();
    for (const item of this.news()) {
      for (const c of item.categories ?? []) {
        map.set(c.id, c.category_name);
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  });

  /** Bài hiển thị theo danh mục đang lọc. */
  protected readonly visibleNews = computed(() => {
    const cat = this.activeCategory();
    if (cat === null) {
      return this.news();
    }
    return this.news().filter((n) => (n.category_ids ?? []).includes(cat));
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
