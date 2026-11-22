import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Promotion } from '@core/models/promotion.model';
import { PublicPromotionService } from '@core/services/public-catalog.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

interface PromoCard {
  promo: Promotion;
  badge: string;
  tone: 'danger' | 'primary' | 'accent';
  summary: string;
}

/**
 * Khuyến mãi cho khách — PROMO-01 (API v0.2 mục 2.7).
 */
@Component({
  selector: 'app-promotion-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, AppCard, EmptyState, ServerPager, SkeletonBlock],
  templateUrl: './promotion-list.html',
  styleUrl: './promotion-list.css',
})
export class ClientPromotionList {
  private readonly promotionService = inject(PublicPromotionService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly promos = signal<PromoCard[]>([]);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(9);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly totalItems = computed(() => this.promos().length);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );
  protected readonly pagedPromos = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.promos().slice(start, start + this.pageSize());
  });

  constructor() {
    this.promotionService.list({ page: 1, size: 50, sort: 'start_date,desc' }).subscribe({
      next: (res) => {
        const today = ClientPromotionList.todayIso();
        const active = (res.data?.items ?? []).filter(
          (p) => p.status === 'ACTIVE' && p.start_date <= today && p.end_date >= today,
        );
        this.promos.set(active.map((p, i) => this.toCard(p, i)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private static todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toCard(p: Promotion, index: number): PromoCard {
    const tones: PromoCard['tone'][] = ['danger', 'primary', 'accent'];
    const fallback =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${ClientPromotionList.money.format(p.discount_value)}đ`;

    return {
      promo: p,
      badge: p.badge_label?.trim() || fallback,
      tone: tones[index % 3],
      summary: p.description?.trim() || 'Xem chi tiết chương trình để biết điều kiện áp dụng.',
    };
  }

  protected goHome(): void {
    this.router.navigate(['/']);
  }

  protected goVoucherStore(): void {
    this.router.navigate(['/account/voucher-store']);
  }

  protected onPageChange(next: number): void {
    this.page.set(next);
  }

  protected onSizeChange(next: number): void {
    this.pageSize.set(next);
    this.page.set(1);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected daysLeft(endDate: string): number {
    const end = new Date(`${endDate}T23:59:59`);
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
  }
}
