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
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/**
 * Tin tức cho khách — NEWS-01 (API v0.4 mục 2.9 + 2.11).
 */
@Component({
  selector: 'app-news-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, ServerPager, SkeletonBlock],
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
  protected readonly activeCategory = signal<number | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(7);

  constructor() {
    this.loadCategories();
    this.load();
  }

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
        this.news.set((res.data?.items ?? []).filter((n) => n.status === 'PUBLISHED'));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected readonly visibleNews = computed(() => {
    const cat = this.activeCategory();
    if (cat === null) {
      return this.news();
    }
    return this.news().filter((n) => (n.categories ?? []).some((c) => c.id === cat));
  });

  protected readonly totalItems = computed(() => this.visibleNews().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );

  protected readonly pagedNews = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.visibleNews().slice(start, start + this.pageSize());
  });

  /** Bài nổi bật đầu tiên trên trang 1. */
  protected readonly featuredArticle = computed<NewsItem | null>(() => {
    if (this.page() !== 1) return null;
    const list = this.pagedNews();
    return list.length > 0 ? list[0] : null;
  });

  /** Danh sách các bài còn lại hiển thị dạng lưới. */
  protected readonly gridArticles = computed<NewsItem[]>(() => {
    const list = this.pagedNews();
    return this.page() === 1 && list.length > 0 ? list.slice(1) : list;
  });

  protected categoryCount(catId: number): number {
    return this.news().filter((n) => (n.categories ?? []).some((c) => c.id === catId)).length;
  }

  protected selectCategory(catId: number | null): void {
    this.activeCategory.set(catId);
    this.page.set(1);
  }

  protected onPageChange(next: number): void {
    this.page.set(next);
  }

  protected onSizeChange(next: number): void {
    this.pageSize.set(next);
    this.page.set(1);
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

  protected excerpt(html: string, maxLen = 135): string {
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
  }
}
