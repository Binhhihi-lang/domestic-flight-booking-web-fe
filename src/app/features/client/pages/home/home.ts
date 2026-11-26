import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { Promotion } from '@core/models/promotion.model';
import { PublicNewsService, PublicPromotionService } from '@core/services/public-catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import {
  FlightSearchCard,
  FlightSearchValue,
} from '@shared/components/flight-search-card/flight-search-card';

interface RouteCard {
  name: string;
  fromCode: string;
  toCode: string;
  meta: string;
  price: string;
  image: string;
  alt: string;
}

/** Nhãn + màu nhãn của một thẻ khuyến mãi — dẫn xuất để hiển thị. */
interface PromoView {
  promo: Promotion;
  badge: string;
  tone: 'danger' | 'accent' | 'success';
}

/**
 * Trang chủ — đồng bộ prototype `customer.html` (Hero + Widget tìm chuyến +
 * Tuyến bay phổ biến + Ưu đãi + Tin tức + Vì sao chọn + 5 Đối tác hàng không + CTA).
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIconModule,
    RouterLink,
    FlightSearchCard,
    AppCard,
    EmptyState,
    SkeletonBlock,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly router = inject(Router);
  private readonly newsService = inject(PublicNewsService);
  private readonly promotionService = inject(PublicPromotionService);

  protected readonly news = signal<NewsItem[]>([]);
  protected readonly newsLoading = signal(true);
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  protected readonly promos = signal<PromoView[]>([]);
  protected readonly promosLoading = signal(true);
  protected readonly brokenPromoImages = signal<Set<number>>(new Set());

  private static readonly money = new Intl.NumberFormat('vi-VN');

  constructor() {
    this.newsService.list({ page: 1, size: 3, sort: 'published_at,desc' }).subscribe({
      next: (res) => {
        this.news.set(res.data.items.filter((n) => n.status === 'PUBLISHED').slice(0, 3));
        this.newsLoading.set(false);
      },
      error: () => this.newsLoading.set(false),
    });

    this.promotionService.list({ page: 1, size: 20, sort: 'start_date,desc' }).subscribe({
      next: (res) => {
        const today = Home.todayIso();
        const active = res.data.items.filter(
          (p) => p.status === 'ACTIVE' && p.start_date <= today && p.end_date >= today,
        );
        this.promos.set(active.slice(0, 3).map((p, i) => this.toPromoView(p, i)));
        this.promosLoading.set(false);
      },
      error: () => this.promosLoading.set(false),
    });
  }

  private static todayIso(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private toPromoView(p: Promotion, index: number): PromoView {
    const tones: PromoView['tone'][] = ['danger', 'accent', 'success'];
    const fallback =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${Home.money.format(p.discount_value)}đ`;

    return { promo: p, badge: p.badge_label?.trim() || fallback, tone: tones[index % 3] };
  }

  protected markPromoImageBroken(id: number): void {
    const next = new Set(this.brokenPromoImages());
    next.add(id);
    this.brokenPromoImages.set(next);
  }

  protected markThumbBroken(id: number): void {
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

  protected categoryLabel(item: NewsItem): string {
    return item.categories?.[0]?.name || 'Cẩm nang';
  }

  protected excerpt(html: string): string {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 110 ? `${text.slice(0, 110)}…` : text;
  }

  protected readonly subscribedEmail = signal<string | null>(null);

  protected readonly routes: RouteCard[] = [
    {
      name: 'Hà Nội → Đà Nẵng',
      fromCode: 'HAN',
      toCode: 'DAD',
      meta: 'Bay thẳng 1h25 · 4 hãng khai thác',
      price: '890.000',
      image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=80',
      alt: 'Cầu Rồng và bờ sông Đà Nẵng về đêm',
    },
    {
      name: 'Hà Nội → Phú Quốc',
      fromCode: 'HAN',
      toCode: 'PQC',
      meta: 'Bay thẳng 2h05 · 3 hãng khai thác',
      price: '1.590.000',
      image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
      alt: 'Bãi biển Phú Quốc nhìn từ trên cao',
    },
    {
      name: 'TP. Hồ Chí Minh → Hà Nội',
      fromCode: 'SGN',
      toCode: 'HAN',
      meta: 'Bay thẳng 2h10 · 5 hãng khai thác',
      price: '1.290.000',
      image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
      alt: 'Hồ Hoàn Kiếm và phố cổ Hà Nội',
    },
    {
      name: 'Hà Nội → Nha Trang',
      fromCode: 'HAN',
      toCode: 'CXR',
      meta: 'Bay thẳng 1h50 · 4 hãng khai thác',
      price: '1.090.000',
      image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
      alt: 'Vịnh biển miền Trung nhìn từ trên cao',
    },
  ];

  protected readonly reasons = [
    {
      icon: 'sell',
      title: 'Giá thật, không phụ phí ẩn',
      text: 'Giá hiển thị đã gồm thuế, phí và lệ phí sân bay. Không cộng thêm bất ngờ ở bước thanh toán.',
    },
    {
      icon: 'connecting_airports',
      title: 'Chỉ bán vé bay thẳng',
      text: 'Mọi chặng VinaFly bán đều bay thẳng nội địa. Không quá cảnh, không đổi máy bay giữa đường.',
    },
    {
      icon: 'event_seat',
      title: 'Chọn ghế theo khoang đã mua',
      text: 'Sơ đồ ghế mở đúng khoang trong hạng vé của bạn, phụ thu hiển thị rõ ràng trước khi trả tiền.',
    },
    {
      icon: 'lock',
      title: 'Thanh toán an toàn',
      text: 'Thanh toán qua VNPay hoặc chuyển khoản ngân hàng. Mã PNR cấp ngay sau khi xác nhận thanh toán.',
    },
  ];

  protected onSearch(value: FlightSearchValue): void {
    this.router.navigate(['/flights'], {
      queryParams: {
        tripType: value.tripType,
        from: value.from || 'HAN',
        to: value.to || 'SGN',
        depart: value.departDate || null,
        returnDate: value.tripType === 'round' ? (value.returnDate || null) : null,
        adults: value.passengers.adults,
        children: value.passengers.children || null,
        infants: value.passengers.infants || null,
      },
    });
  }

  protected goRoute(route: RouteCard): void {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    this.router.navigate(['/flights'], {
      queryParams: {
        tripType: 'oneway',
        from: route.fromCode,
        to: route.toCode,
        depart: `${tomorrow.getFullYear()}-${m}-${day}`,
        adults: 1,
      },
    });
  }

  protected subscribeOffer(email: string): void {
    const clean = email.trim();
    if (!clean || !clean.includes('@')) return;
    this.subscribedEmail.set(clean);
  }
}
