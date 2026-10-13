import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Promotion } from '@core/models/promotion.model';
import { PromotionService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/** Một thẻ khuyến mãi — dữ liệu đã kèm nhãn và màu để template không phải tính. */
interface PromoCard {
  promo: Promotion;
  badge: string;
  tone: 'danger' | 'primary' | 'accent';
  /** Mô tả ngắn để hiện trên thẻ. */
  summary: string;
}

/**
 * Khuyến mãi cho khách — PROMO-01 (API v0.2 mục 2.7).
 *
 * Chỉ hiện chương trình ĐANG HIỆU LỰC: `is_active` và hôm nay nằm trong khoảng
 * `start_date`–`end_date`. Backend đã lọc cho GUEST nhưng mock trả về tất cả,
 * nên lọc ở đây để hai chế độ hành xử giống nhau.
 */
@Component({
  selector: 'app-promotion-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './promotion-list.html',
  styleUrl: './promotion-list.css',
})
export class ClientPromotionList {
  private readonly promotionService = inject(PromotionService);

  protected readonly loading = signal(true);
  protected readonly promos = signal<PromoCard[]>([]);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  constructor() {
    this.promotionService.list({ page: 1, size: 50, sort: 'start_date,desc' }).subscribe({
      next: (res) => {
        const today = ClientPromotionList.todayIso();
        const active = res.data.items.filter(
          (p) => p.is_active && !p.is_deleted && p.start_date <= today && p.end_date >= today,
        );
        this.promos.set(active.map((p, i) => this.toCard(p, i)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Ngày hôm nay theo GIỜ MÁY — không dùng `toISOString()` vì nó trả ngày UTC,
   * lệch một ngày so với giờ Việt Nam trong 7 giờ đầu ngày. Khuyến mãi bắt đầu
   * đúng hôm nay sẽ bị coi là chưa hiệu lực suốt 7 giờ đầu.
   */
  private static todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * Nhãn in trên ảnh: ưu tiên `badge_label` do ADMIN nhập (copy marketing như
   * "Giá sốc" không suy ra được từ con số nào); nếu trống thì suy từ mức giảm.
   *
   * Màu nhãn xoay vòng theo thứ tự thẻ — thuần nhịp thị giác của lưới, không
   * mang thông tin nghiệp vụ.
   */
  private toCard(p: Promotion, index: number): PromoCard {
    const tones: PromoCard['tone'][] = ['danger', 'primary', 'accent'];
    const fallback =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${ClientPromotionList.money.format(p.discount_value)}₫`;

    return {
      promo: p,
      badge: p.badge_label?.trim() || fallback,
      tone: tones[index % 3],
      summary: p.description?.trim() || 'Xem chi tiết chương trình để biết điều kiện áp dụng.',
    };
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /** Số ngày còn lại — nhắc khách sắp hết hạn. */
  protected daysLeft(endDate: string): number {
    const end = new Date(`${endDate}T23:59:59`);
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
  }
}
