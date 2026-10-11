import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  FlightSearchCard,
  FlightSearchValue,
} from '../../../../shared/components/flight-search-card/flight-search-card';

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
  imports: [MatIconModule, FlightSearchCard],
  template: `
    <!-- ===== Hero ===== -->
    <section class="hero">
      <div class="hero__bg"></div>
      <div class="hero__ov"></div>
      <div class="hero__in">
        <h1>Đặt vé máy bay nội địa dễ dàng</h1>
        <p>Tìm chuyến bay phù hợp với lịch trình và ngân sách của bạn</p>
      </div>
    </section>

    <!-- ===== Widget tìm kiếm đè lên hero ===== -->
    <div class="searchbar">
      <app-flight-search-card (searched)="onSearch($event)" />
    </div>

    <!-- ===== Tuyến bay phổ biến ===== -->
    <section class="home-sec">
      <h2>Tuyến bay phổ biến</h2>
      <p>Khám phá các hành trình được lựa chọn nhiều nhất</p>
      <div class="route-grid">
        @for (route of routes; track route.name) {
          <article class="route">
            <div class="route__img" [style.background-image]="'url(' + route.image + ')'"></div>
            <div class="route__bd">
              <div class="route__nm">{{ route.name }}</div>
              <div class="route__al">{{ route.airlines }}</div>
              <div class="route__pr">
                <span>Thời gian: {{ route.duration }}</span>
                <b>{{ route.price }}<small>₫</small></b>
              </div>
            </div>
          </article>
        }
      </div>
    </section>

    <!-- ===== Ưu đãi ===== -->
    <section class="home-sec">
      <h2>Ưu đãi hấp dẫn</h2>
      <p>Săn ngay vé rẻ với các chương trình khuyến mãi độc quyền</p>
      <div class="promo-grid">
        @for (promo of promos; track promo.name) {
          <article class="promo">
            <div class="promo__img" [style.background-image]="'url(' + promo.image + ')'">
              <span class="promo__tag" [class]="'promo__tag--' + promo.tagTone">{{ promo.tag }}</span>
            </div>
            <div class="promo__bd">
              <div class="promo__nm">{{ promo.name }}</div>
              <p class="promo__ds">{{ promo.description }}</p>
              <div class="promo__lk">Xem chi tiết <mat-icon>arrow_forward</mat-icon></div>
            </div>
          </article>
        }
      </div>
    </section>

    <!-- ===== Vì sao chọn ===== -->
    <section class="why">
      <div class="why__in">
        <h2 class="why__title">Tại sao chọn chúng tôi?</h2>
        <p class="why__sub">Cam kết mang lại trải nghiệm đặt vé nội địa tốt nhất cho khách hàng</p>
        <div class="why__grid">
          @for (item of reasons; track item.title) {
            <div class="why__c">
              <div class="why__ic"><mat-icon>{{ item.icon }}</mat-icon></div>
              <b>{{ item.title }}</b>
              <span>{{ item.text }}</span>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ===== Đối tác ===== -->
    <section class="home-sec partners-sec">
      <h2>Đối tác hàng không</h2>
      <p>Hợp tác với các hãng bay nội địa lớn nhất Việt Nam</p>
      <div class="partners">
        @for (partner of partners; track partner.name) {
          <div class="partner">
            <mat-icon [style.color]="partner.color">flight</mat-icon>
            {{ partner.name }}
          </div>
        }
      </div>
    </section>

    <!-- ===== CTA đăng ký nhận ưu đãi ===== -->
    <div class="cta">
      <div class="cta__in">
        <div class="cta__tx">
          <h3>Đăng ký nhận ưu đãi</h3>
          <p>
            Nhận thông tin khuyến mãi sớm nhất và mã giảm giá độc quyền qua hộp thư điện tử
            của bạn hàng tuần.
          </p>
        </div>
        <div class="cta__form">
          <input type="email" placeholder="Nhập email của bạn..." aria-label="Email nhận ưu đãi" />
          <button class="cta__btn" type="button">Đăng ký</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    /* ---------- Hero ---------- */
    .hero {
      position: relative;
      min-height: 340px;
      display: flex;
      align-items: flex-start;
      overflow: hidden;
    }

    /* Ảnh thật, không gradient — theo đúng yêu cầu tham chiếu VietFly. */
    .hero__bg {
      position: absolute;
      inset: 0;
      background-image: url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=80');
      background-size: cover;
      background-position: center 40%;
    }

    .hero__ov {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        100deg,
        rgba(4, 26, 48, 0.86) 0%,
        rgba(4, 26, 48, 0.62) 46%,
        rgba(4, 26, 48, 0.28) 100%
      );
    }

    .hero__in {
      position: relative;
      z-index: 2;
      max-width: 1240px;
      margin: 0 auto;
      padding: 54px 26px 0;
      width: 100%;
    }

    .hero h1 {
      color: #fff;
      font-size: 40px;
      font-weight: 700;
      letter-spacing: -0.8px;
      max-width: 620px;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.28);
    }

    .hero p {
      color: rgba(255, 255, 255, 0.92);
      font-size: 16.5px;
      margin: 13px 0 0;
      max-width: 520px;
      text-shadow: 0 1px 8px rgba(0, 0, 0, 0.3);
    }

    /* Widget tìm kiếm trôi lên đè hero — điểm nhấn thị giác của trang. */
    .searchbar {
      max-width: 1240px;
      margin: -58px auto 0;
      position: relative;
      z-index: 5;
      padding: 0 26px;
    }

    /* ---------- Tuyến bay ---------- */
    .route-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .route {
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      cursor: pointer;
      transition:
        transform var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }

    .route:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    .route__img {
      height: 148px;
      background-size: cover;
      background-position: center;
    }

    .route__bd {
      padding: 14px 16px 16px;
    }

    .route__nm {
      font-family: var(--font-heading);
      font-size: 15.5px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .route__al {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      margin-bottom: 11px;
      line-height: 1.45;
    }

    .route__pr {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .route__pr span {
      font-size: 12px;
      color: var(--color-ink-muted);
    }

    .route__pr b {
      font-family: var(--font-heading);
      font-size: 19px;
      font-weight: 700;
      color: var(--color-primary);
      font-variant-numeric: tabular-nums;
    }

    .route__pr b small {
      font-size: 11.5px;
      font-weight: 600;
    }

    /* ---------- Ưu đãi ---------- */
    .promo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
      gap: 16px;
    }

    .promo {
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      cursor: pointer;
      transition:
        transform var(--dur) var(--ease),
        box-shadow var(--dur) var(--ease);
    }

    .promo:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }

    .promo__img {
      height: 158px;
      background-size: cover;
      background-position: center;
      position: relative;
    }

    .promo__tag {
      position: absolute;
      top: 12px;
      left: 12px;
      font-size: 11.5px;
      font-weight: 800;
      padding: 4px 11px;
      border-radius: var(--radius-sm);
      color: #fff;
    }

    .promo__tag--danger {
      background: var(--color-danger);
    }

    .promo__tag--primary {
      background: var(--color-primary-bright);
    }

    .promo__tag--accent {
      background: var(--color-accent);
      color: var(--color-on-accent);
    }

    .promo__bd {
      padding: 15px 16px 16px;
    }

    .promo__nm {
      font-family: var(--font-heading);
      font-size: 15.5px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .promo__ds {
      font-size: 12.5px;
      color: var(--color-ink-muted);
      line-height: 1.55;
      margin: 0 0 11px;
    }

    .promo__lk {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--color-primary-bright);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .promo__lk mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    /* ---------- Vì sao chọn ---------- */
    .why {
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      border-bottom: 1px solid var(--color-border);
      margin-top: 40px;
    }

    .why__in {
      max-width: 1240px;
      margin: 0 auto;
      padding: 38px 26px;
    }

    .why__title {
      font-size: 23px;
      font-weight: 700;
      margin: 0 0 4px;
    }

    .why__sub {
      font-size: 14px;
      color: var(--color-ink-muted);
      margin: 0;
    }

    .why__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .why__c {
      padding: 18px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-alt);
    }

    .why__ic {
      width: 42px;
      height: 42px;
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 13px;
    }

    .why__ic mat-icon {
      font-size: 23px;
      width: 23px;
      height: 23px;
      color: var(--color-primary);
    }

    .why__c b {
      display: block;
      font-family: var(--font-heading);
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .why__c span {
      font-size: 12.5px;
      color: var(--color-ink-muted);
      line-height: 1.6;
    }

    /* ---------- Đối tác ---------- */
    .partners-sec {
      text-align: center;
    }

    .partners {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 6px;
    }

    .partner {
      display: flex;
      align-items: center;
      gap: 9px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 11px 20px;
      font-size: 14px;
      font-weight: 600;
      background: var(--color-surface);
    }

    .partner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* ---------- CTA ---------- */
    .cta {
      max-width: 1240px;
      margin: 40px auto 0;
      padding: 0 26px;
    }

    .cta__in {
      background: linear-gradient(115deg, #0a4d8c, #0770cd 52%, #0194f3);
      border-radius: var(--radius-xl);
      padding: 30px 34px;
      display: flex;
      align-items: center;
      gap: 26px;
      flex-wrap: wrap;
      position: relative;
      overflow: hidden;
    }

    .cta__in::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(560px 240px at 88% 10%, rgba(255, 255, 255, 0.18), transparent 62%);
    }

    .cta__tx {
      position: relative;
      z-index: 1;
      flex: 1;
      min-width: 250px;
    }

    .cta__tx h3 {
      color: #fff;
      font-size: 21px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .cta__tx p {
      color: rgba(255, 255, 255, 0.88);
      font-size: 13.5px;
      margin: 0;
      max-width: 440px;
    }

    .cta__form {
      position: relative;
      z-index: 1;
      display: flex;
      gap: 9px;
      flex-wrap: wrap;
    }

    .cta__form input {
      border: 0;
      border-radius: var(--radius);
      padding: 12px 15px;
      font-family: var(--font-body);
      font-size: 14px;
      min-width: 236px;
      outline: none;
    }

    .cta__btn {
      border: 0;
      border-radius: var(--radius);
      padding: 12px 20px;
      background: #fff;
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */
    @media (max-width: 900px) {
      .hero {
        min-height: 250px;
      }

      .hero__in {
        padding: 34px 14px 0;
      }

      .hero h1 {
        font-size: 27px;
        letter-spacing: -0.4px;
      }

      .hero p {
        font-size: 14.5px;
      }

      .searchbar {
        padding: 0 14px;
        margin-top: -34px;
      }

      .why__in {
        padding: 26px 14px;
      }

      .cta {
        padding: 0 14px;
      }

      .cta__in {
        padding: 24px 20px;
      }
    }

    @media (max-width: 640px) {
      .route-grid {
        grid-template-columns: 1fr 1fr;
        gap: 11px;
      }

      .route__img {
        height: 112px;
      }

      .route__bd {
        padding: 11px 12px 13px;
      }

      .route__nm {
        font-size: 14px;
      }

      .route__pr b {
        font-size: 16px;
      }

      .promo-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 520px) {
      .hero {
        min-height: 210px;
      }

      .hero h1 {
        font-size: 23px;
      }
    }

    @media (max-width: 420px) {
      .route-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Home {
  private readonly router = inject(Router);

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
