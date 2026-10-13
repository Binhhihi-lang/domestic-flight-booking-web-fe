import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Promotion } from '@core/models/promotion.model';
import { PromotionService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Chi tiết khuyến mãi — PROMO-02 (API v0.2 mục 2.7).
 *
 * Vì sao hiện cả điều kiện kỹ thuật (trần giảm, giá tối thiểu, loại hành trình):
 * khách cần biết vì sao vé của mình KHÔNG được giảm. Giấu đi thì họ chỉ thấy
 * "khuyến mãi không hoạt động" mà không hiểu lý do.
 */
@Component({
  selector: 'app-promotion-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, AppButton, LoadingState],
  templateUrl: './promotion-detail.html',
  styleUrl: './promotion-detail.css',
})
export class ClientPromotionDetail {
  private readonly service = inject(PromotionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly promo = signal<Promotion | null>(null);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  /** Câu mô tả mức giảm bằng lời, ví dụ "Giảm 15%, tối đa 150.000₫ mỗi vé". */
  protected readonly discountText = computed(() => {
    const p = this.promo();
    if (!p) return '';

    const value =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${ClientPromotionDetail.money.format(p.discount_value)}₫`;

    if (p.discount_type === 'PERCENT' && p.max_discount_amount) {
      return `${value}, tối đa ${ClientPromotionDetail.money.format(p.max_discount_amount)}₫ mỗi vé`;
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
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/promotions']);
      return;
    }
    this.service.getById(Number(id)).subscribe({
      next: (res) => {
        this.promo.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        // Không tìm thấy (hoặc lỗi mạng) → về danh sách thay vì đứng ở trang trắng.
        this.loading.set(false);
        this.router.navigate(['/promotions']);
      },
    });
  }

  protected formatMoney(v: number): string {
    return ClientPromotionDetail.money.format(v);
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
