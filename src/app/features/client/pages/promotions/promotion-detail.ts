import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Promotion } from '@core/models/promotion.model';
import { PublicPromotionService } from '@core/services/public-catalog.service';
import { SanitizeService } from '@core/services/sanitize.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Chi tiết khuyến mãi — PROMO-02 (API v0.2 mục 2.7).
 */
@Component({
  selector: 'app-promotion-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, AppButton, LoadingState],
  templateUrl: './promotion-detail.html',
  styleUrl: './promotion-detail.css',
})
export class ClientPromotionDetail {
  private readonly service = inject(PublicPromotionService);
  private readonly sanitizeService = inject(SanitizeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly promo = signal<Promotion | null>(null);
  protected readonly otherPromos = signal<Promotion[]>([]);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly safeDescription = computed(() => {
    const desc = this.promo()?.description;
    return desc ? this.sanitizeService.sanitizeHtml(desc) : '';
  });

  protected readonly discountText = computed(() => {
    const p = this.promo();
    if (!p) return '';

    const value =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${ClientPromotionDetail.money.format(p.discount_value)}đ`;

    if (p.discount_type === 'PERCENT' && p.max_discount_amount) {
      return `${value}, tối đa ${ClientPromotionDetail.money.format(p.max_discount_amount)}đ mỗi vé`;
    }
    return value;
  });

  protected readonly tripTypeText = computed(() => {
    switch (this.promo()?.applicable_trip_type) {
      case 'ONE_WAY':
        return 'Chỉ áp dụng vé một chiều';
      case 'ROUND_TRIP':
        return 'Chỉ áp dụng vé khứ hồi';
      default:
        return 'Áp dụng cho mọi hành trình';
    }
  });

  constructor() {
    const initialId = this.route.snapshot.paramMap.get('id');
    if (this.route.paramMap) {
      this.route.paramMap.subscribe((params) => {
        const id = params.get('id');
        this.loadById(id);
      });
    } else {
      this.loadById(initialId);
    }
  }

  private loadById(id: string | null): void {
    if (!id) {
      this.router.navigate(['/promotions']);
      return;
    }
    const numericId = Number(id);
    this.loading.set(true);
    this.service.getById(numericId).subscribe({
      next: (res) => {
        if (!res.data) {
          this.loading.set(false);
          this.router.navigate(['/promotions']);
          return;
        }
        this.promo.set(res.data);
        this.loading.set(false);
        this.loadOthers(numericId);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/promotions']);
      },
    });
  }

  private loadOthers(currentId: number): void {
    this.service.list({ page: 1, size: 10, sort: 'start_date,desc' }).subscribe({
      next: (res) => {
        const others = (res.data?.items ?? [])
          .filter((p) => p.status === 'ACTIVE' && p.id !== currentId)
          .slice(0, 4);
        this.otherPromos.set(others);
      },
      error: () => this.otherPromos.set([]),
    });
  }

  protected shortDiscount(p: Promotion): string {
    if (p.badge_label?.trim()) {
      return p.badge_label.trim();
    }
    return p.discount_type === 'PERCENT'
      ? `Giảm ${p.discount_value}%`
      : `Giảm ${ClientPromotionDetail.money.format(p.discount_value)}đ`;
  }

  protected formatMoney(v: number): string {
    return `${ClientPromotionDetail.money.format(v)}đ`;
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected back(): void {
    this.router.navigate(['/promotions']);
  }
}
