import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NewsItem } from '@core/models/fleet-news.model';
import { NewsService } from '@core/services/catalog.service';
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

interface PromoCard {
  name: string;
  description: string;
  tag: string;
  tagTone: 'danger' | 'primary' | 'accent';
  image: string;
}

/**
 * Trang chủ — bám mockup P1 (học theo VietFly: ảnh thật, widget tìm kiếm đè
 * lên hero, nhiều khối marketing).
 *
 * Vì sao nhiều khối marketing: đây là trang chủ của một sản phẩm đặt vé, không
 * phải trang quản trị. Người dùng cần thấy ngay tuyến bay, ưu đãi và lý do tin
 * tưởng trước khi bỏ công nhập thông tin tìm kiếm.
 *
 * Tuyến bay và ưu đãi ở đây là nội dung tĩnh của giai đoạn dựng giao diện; sẽ
 * lấy từ API Promotion/Flight khi Backend xong Phase 2–3.
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

  constructor() {
    this.newsService.list({ page: 1, size: 3, sort: 'published_at,desc' }).subscribe({
      next: (res) => {
        this.news.set(res.data.items.filter((n) => n.status === 'PUBLISHED').slice(0, 3));
        this.newsLoading.set(false);
      },
      error: () => this.newsLoading.set(false),
    });
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

  protected readonly promos: PromoCard[] = [
    {
      name: 'Đà Lạt Mùa Sương Mù',
      description:
        'Nhập mã DALAT20 giảm ngay 20% giá vé trực tiếp khi đặt vé khứ hồi. Áp dụng đến hết 15/11.',
      tag: 'Giảm 20%',
      tagTone: 'danger',
      image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=700&q=80',
    },
    {
      name: 'Hội An Hoài Cổ',
      description:
        'Vé bay Hà Nội – Đà Nẵng chỉ từ 499K (chưa thuế phí). Số lượng có hạn cho chuyến bay sáng sớm.',
      tag: 'Giá sốc',
      tagTone: 'primary',
      image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=700&q=80',
    },
    {
      name: 'Bay Đồng Giá 99K',
      description:
        'Mở bán hàng ngàn vé đồng giá 99K toàn mạng bay nội địa vào mỗi thứ 5 hàng tuần. Đặt ngay kẻo lỡ!',
      tag: 'Đồng giá',
      tagTone: 'accent',
      image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=700&q=80',
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
  protected onSearch(value: FlightSearchValue): void {
    this.router.navigate(['/flights'], {
      queryParams: {
        from: value.from || null,
        to: value.to || null,
        depart: value.departDate || null,
      },
    });
  }
}
