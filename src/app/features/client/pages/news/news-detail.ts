import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NewsItem } from '@core/models/fleet-news.model';
import { PublicNewsService } from '@core/services/public-catalog.service';
import { SanitizeService } from '@core/services/sanitize.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Chi tiết tin tức — NEWS-02 (API v0.2 mục 2.9).
 *
 * `content` BẮT BUỘC đi qua `SanitizeService` trước khi bind `[innerHTML]`.
 */
@Component({
  selector: 'app-news-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, AppButton, LoadingState],
  templateUrl: './news-detail.html',
  styleUrl: './news-detail.css',
})
export class ClientNewsDetail {
  private readonly newsService = inject(PublicNewsService);
  private readonly sanitizeService = inject(SanitizeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly article = signal<NewsItem | null>(null);
  protected readonly copied = signal(false);

  protected readonly safeContent = computed(() => {
    const a = this.article();
    return a ? this.sanitizeService.sanitizeHtml(a.content) : '';
  });

  protected readonly categoryNames = computed(
    () => this.article()?.categories?.map((c) => c.name) ?? [],
  );

  protected readonly related = signal<NewsItem[]>([]);
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  protected markBroken(id: number): void {
    const next = new Set(this.brokenThumbs());
    next.add(id);
    this.brokenThumbs.set(next);
  }

  constructor() {
    const initialId = this.route.snapshot.paramMap.get('id');
    if (this.route.paramMap) {
      this.route.paramMap.subscribe((params) => {
        this.loadById(params.get('id'));
      });
    } else {
      this.loadById(initialId);
    }
  }

  private loadById(id: string | null): void {
    if (!id) {
      this.router.navigate(['/news']);
      return;
    }
    this.loading.set(true);
    this.newsService.getById(Number(id)).subscribe({
      next: (res) => {
        if (!res.data || res.data.status !== 'PUBLISHED') {
          this.loading.set(false);
          this.router.navigate(['/news']);
          return;
        }

        this.article.set(res.data);
        this.loading.set(false);
        this.loadRelated(res.data);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/news']);
      },
    });
  }

  private loadRelated(current: NewsItem): void {
    const categoryIds = current.categories?.map((c) => c.id) ?? [];
    if (categoryIds.length === 0) {
      this.related.set([]);
      return;
    }
    this.tryCategory(current, categoryIds, 0);
  }

  private tryCategory(current: NewsItem, categoryIds: number[], index: number): void {
    if (index >= categoryIds.length) {
      this.related.set([]);
      return;
    }

    this.newsService
      .list({ page: 1, size: 5, category_id: categoryIds[index], sort: 'published_at,desc' })
      .subscribe({
        next: (res) => {
          const others = (res.data?.items ?? [])
            .filter((n) => n.status === 'PUBLISHED' && n.id !== current.id)
            .slice(0, 4);

          if (others.length > 0) {
            this.related.set(others);
            return;
          }
          this.tryCategory(current, categoryIds, index + 1);
        },
        error: () => this.tryCategory(current, categoryIds, index + 1),
      });
  }

  protected shareLink(): void {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    this.copied.set(true);
    this.snackBar.open('Đã sao chép liên kết bài viết', 'Đóng', { duration: 2500 });
    setTimeout(() => this.copied.set(false), 2500);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected back(): void {
    this.router.navigate(['/news']);
  }
}
