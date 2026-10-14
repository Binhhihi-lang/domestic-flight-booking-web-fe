import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { Promotion } from '@core/models/promotion.model';
import { NewsService, PromotionService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import {
  FlightSearchCard,
  FlightSearchValue,
} from '@shared/components/flight-search-card/flight-search-card';

interface RouteCard {
  name: string;
  airlines: string;
  duration: string;
  price: string;
  image: string;
}

/** Nhãn + màu nhãn của một thẻ khuyến mãi — dẫn xuất để hiển thị. */
interface PromoView {
  promo: Promotion;
  badge: string;
  tone: 'danger' | 'primary' | 'accent';
}

/**
 * Trang chủ — bám mockup P1 (học theo VietFly: ảnh thật, widget tìm kiếm đè
 * lên hero, nhiều khối marketing).
 *
 * Vì sao nhiều khối marketing: đây là trang chủ của một sản phẩm đặt vé, không
 * phải trang quản trị. Người dùng cần thấy ngay tuyến bay, ưu đãi và lý do tin
 * tưởng trước khi bỏ công nhập thông tin tìm kiếm.
 *
 * Tuyến bay ở đây vẫn là nội dung tĩnh của giai đoạn dựng giao diện; sẽ lấy từ
 * API Flight khi Backend xong Phase 2. Khuyến mãi và tin tức đã đọc từ service.
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
  private readonly newsService = inject(NewsService);
  private readonly promotionService = inject(PromotionService);

  /**
   * Tin tức mới nhất cho trang chủ.
   *
   * Chỉ lấy bài đã đăng: Backend đã lọc theo `status = PUBLISHED` cho GUEST
   * (BR-LIST-04), nhưng khi chạy mock thì phải tự lọc vì mock trả về cả bản
   * nháp. Lọc ở đây để hành vi giống nhau ở cả hai chế độ.
   */
  protected readonly news = signal<NewsItem[]>([]);
  protected readonly newsLoading = signal(true);
  /** id các bài có ảnh tải lỗi — hiện nền thay thế thay vì icon ảnh vỡ. */
  protected readonly brokenThumbs = signal<Set<number>>(new Set());

  /**
   * Khuyến mãi đang hiệu lực cho khối "Ưu đãi hấp dẫn".
   *
   * Cùng lý do lọc như tin tức: API v0.2 mục 2.7 quy định GUEST chỉ thấy
   * promotion `is_active = true` và đang trong khoảng `start_date`–`end_date`,
   * nhưng mock trả về tất cả nên phải tự lọc để hai chế độ hành xử như nhau.
   */
  protected readonly promos = signal<PromoView[]>([]);
  protected readonly promosLoading = signal(true);
  /** id khuyến mãi có ảnh tải lỗi — hiện nền thay thế. */
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
          (p) => p.is_active && !p.is_deleted && p.start_date <= today && p.end_date >= today,
        );
        this.promos.set(active.slice(0, 3).map((p, i) => this.toPromoView(p, i)));
        this.promosLoading.set(false);
      },
      error: () => this.promosLoading.set(false),
    });
  }

  /**
   * Ngày hôm nay dạng `YYYY-MM-DD` theo GIỜ MÁY, không dùng `toISOString()`.
   *
   * Vì sao: `toISOString()` trả ngày theo UTC, mà Việt Nam là UTC+7 — nên từ
   * 00:00 đến 07:00 giờ VN nó vẫn trả về ngày HÔM TRƯỚC. Khuyến mãi bắt đầu
   * đúng hôm nay sẽ bị coi là chưa hiệu lực suốt 7 giờ đầu ngày.
   */
  private static todayIso(): string {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  /**
   * Nhãn in trên ảnh thẻ: ưu tiên `badge_label` do ADMIN nhập (copy marketing
   * như "Giá sốc" không suy ra được từ con số nào); nếu trống thì suy ra từ
   * mức giảm để thẻ không bị trống nhãn.
   *
   * Màu nhãn xoay vòng theo thứ tự thẻ — đây thuần là nhịp thị giác của lưới,
   * không mang thông tin nghiệp vụ, nên không gắn với dữ liệu.
   */
  private toPromoView(p: Promotion, index: number): PromoView {
    const tones: PromoView['tone'][] = ['danger', 'primary', 'accent'];
    const fallback =
      p.discount_type === 'PERCENT'
        ? `Giảm ${p.discount_value}%`
        : `Giảm ${Home.money.format(p.discount_value)}₫`;

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

  /** Nội dung là HTML — bỏ thẻ rồi cắt ngắn để làm dòng mô tả trên thẻ tin. */
  protected excerpt(html: string): string {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 110 ? `${text.slice(0, 110)}…` : text;
  }

  protected readonly routes: RouteCard[] = [
    {
      name: 'Hà Nội → TP. HCM',
      airlines: 'Vietnam Airlines, Vietjet, Bamboo',
      duration: '2h 10m',
      price: '1.290.000',
      image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=600&q=80',
    },
    {
      name: 'Hà Nội → Đà Nẵng',
      airlines: 'Vietnam Airlines, Vietjet, Bamboo',
      duration: '1h 25m',
      price: '890.000',
      image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=600&q=80',
    },
    {
      name: 'TP. HCM → Phú Quốc',
      airlines: 'Vietjet, Bamboo, Vietravel',
      duration: '1h 05m',
      price: '690.000',
      image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=600&q=80',
    },
    {
      name: 'Hà Nội → Nha Trang',
      airlines: 'Vietnam Airlines, Vietjet, Bamboo',
      duration: '1h 50m',
      price: '1.090.000',
      image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=600&q=80',
    },
  ];

  protected readonly reasons = [
    {
      icon: 'sell',
      title: 'Giá tốt nhất',
      text: 'Cam kết giá vé máy bay nội địa rẻ nhất, thường xuyên có nhiều chương trình khuyến mãi hấp dẫn mỗi tuần.',
    },
    {
      icon: 'schedule',
      title: 'Đặt vé nhanh chóng',
      text: 'Hệ thống đặt vé tự động, giúp hoàn tất giao dịch và nhận vé điện tử chỉ trong 3 phút ngắn ngủi.',
    },
    {
      icon: 'headset_mic',
      title: 'Hỗ trợ 24/7',
      text: 'Đội ngũ chăm sóc khách hàng chuyên nghiệp, luôn sẵn sàng giải đáp và xử lý mọi yêu cầu hoàn vé bất kể ngày đêm.',
    },
    {
      icon: 'lock',
      title: 'Thanh toán an toàn',
      text: 'Bảo mật tuyệt đối thông tin thanh toán của khách hàng nhờ hệ thống mã hóa và cổng giao dịch an toàn nhất.',
    },
  ];

  protected readonly partners = [
    { name: 'Vietnam Airlines', color: '#0b4fa8' },
    { name: 'Vietjet Air', color: '#ed1b24' },
    { name: 'Bamboo Airways', color: '#0f8a4d' },
    { name: 'Vietravel Airlines', color: '#e8a33d' },
  ];

  /** Flight Search thuộc Phase 2 — hiện chuyển sang trang kết quả để xem khuôn. */
  /**
   * Flight Search thuộc Phase 2 — hiện chuyển sang trang kết quả để xem khuôn.
   *
   * Truyền cả số hành khách qua query param: API `GET /flights/search` nhận
   * `passengers` (API v0.2 mục 3) và giá vé phụ thuộc số lượng + loại hành khách
   * (trẻ em 75%, em bé 10% giá người lớn). Để sẵn trên URL thì khi nối API chỉ
   * cần đọc lại, không phải sửa luồng điều hướng.
   */
  protected onSearch(value: FlightSearchValue): void {
    this.router.navigate(['/flights'], {
      queryParams: {
        from: value.from || null,
        to: value.to || null,
        depart: value.departDate || null,
        adults: value.passengers.adults,
        children: value.passengers.children || null,
        infants: value.passengers.infants || null,
      },
    });
  }
}
