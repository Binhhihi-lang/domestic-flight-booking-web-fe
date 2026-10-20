import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { PublicNewsService } from '@core/services/public-catalog.service';
import { SanitizeService } from '@core/services/sanitize.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Chi tiết tin tức — NEWS-02 (API v0.2 mục 2.9).
 *
 * Vì sao `content` PHẢI qua `SanitizeService` trước khi bind `[innerHTML]`:
 * nội dung là HTML do ADMIN nhập. Bind thẳng là mở đường cho XSS chạy trên máy
 * của MỌI khách đọc bài — không phải lỗi giao diện mà là chiếm phiên đăng nhập.
 * Xem `sanitize.service.ts` để biết allowlist và các vector bị chặn.
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

  protected readonly loading = signal(true);
  protected readonly article = signal<NewsItem | null>(null);

  /**
   * Nội dung ĐÃ làm sạch — đây là thứ DUY NHẤT được bind vào `[innerHTML]`.
   * Template KHÔNG được bind `article()!.content` ở bất kỳ đâu.
   */
  protected readonly safeContent = computed(() => {
    const a = this.article();
    return a ? this.sanitizeService.sanitizeHtml(a.content) : '';
  });

  /** Tên danh mục để hiện nhãn — API trả kèm `categories` ở endpoint chi tiết. */
  protected readonly categoryNames = computed(
    () => this.article()?.categories?.map((c) => c.name) ?? [],
  );

  /**
   * Bài liên quan — cùng danh mục, KHÁC bài đang đọc, tối đa 3 bài.
   *
   * Vì sao KHÔNG gộp mọi danh mục của bài: một bài có thể gắn nhiều danh mục (vd
   * "Hãng hàng không" + "Thông báo"); gộp hết thì "liên quan" loãng thành "mọi
   * bài cùng bất kỳ danh mục nào". Thay vào đó thử LẦN LƯỢT từng danh mục — xem
   * `loadRelated`.
   */
  protected readonly related = signal<NewsItem[]>([]);

  /** id bài có ảnh tải lỗi — hiện nền thay thế thay vì icon ảnh vỡ. */
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  protected markBroken(id: number): void {
    const next = new Set(this.brokenThumbs());
    next.add(id);
    this.brokenThumbs.set(next);
  }

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/news']);
      return;
    }
    this.newsService.getById(Number(id)).subscribe({
      next: (res) => {
        // BE trả `1004` (data = null) cho bài DRAFT/UNPUBLISHED/không tồn tại —
        // mục 2.9 API v0.4: không xác nhận id có tồn tại hay không. Kiểm `res.data`
        // trước khi đọc `status`, nếu không sẽ ném TypeError và trang trắng.
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
        // Không tìm thấy (hoặc lỗi mạng) → về danh sách thay vì đứng ở trang trắng.
        this.loading.set(false);
        this.router.navigate(['/news']);
      },
    });
  }

  /**
   * Nạp bài liên quan — cùng danh mục, KHÁC bài đang đọc, tối đa 3 bài.
   *
   * Vì sao thử LẦN LƯỢT từng danh mục thay vì chỉ lấy danh mục đầu: một bài có
   * thể gắn nhiều danh mục, và danh mục đầu có thể chỉ có đúng bài này (vd bài
   * "Tết 2027" thuộc "Hãng hàng không" mà danh mục đó chỉ có nó). Lấy mỗi danh
   * mục đầu thì trang chi tiết trống phần liên quan dù vẫn còn danh mục khác có
   * bài. Thử lần lượt vừa giữ được độ sát chủ đề, vừa không để trống.
   *
   * Vì sao lọc `status` ở client: mock trả cả bản nháp, backend thì đã lọc cho
   * GUEST — lọc ở đây để hai chế độ giống nhau.
   */
  private loadRelated(current: NewsItem): void {
    const categoryIds = current.categories?.map((c) => c.id) ?? [];
    if (categoryIds.length === 0) {
      return;
    }
    this.tryCategory(current, categoryIds, 0);
  }

  private tryCategory(current: NewsItem, categoryIds: number[], index: number): void {
    if (index >= categoryIds.length) {
      this.related.set([]);
      return;
    }

    // Dùng filter `category_id` — có trong whitelist của `GET /news` (API v0.2
    // mục 2.9), nên backend lọc sẵn thay vì tải hết rồi lọc.
    this.newsService
      .list({ page: 1, size: 5, category_id: categoryIds[index], sort: 'published_at,desc' })
      .subscribe({
        next: (res) => {
          const others = res.data.items
            .filter((n) => n.status === 'PUBLISHED' && n.id !== current.id)
            .slice(0, 3);

          if (others.length > 0) {
            this.related.set(others);
            return;
          }
          // Danh mục này không có bài nào khác — thử danh mục kế tiếp.
          this.tryCategory(current, categoryIds, index + 1);
        },
        // Lỗi mạng không phải lỗi chí mạng: thử danh mục kế, cuối cùng thì để
        // trống. Phần còn lại của trang vẫn dùng được.
        error: () => this.tryCategory(current, categoryIds, index + 1),
      });
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
