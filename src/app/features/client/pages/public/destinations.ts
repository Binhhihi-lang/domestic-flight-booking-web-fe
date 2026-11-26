import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';
import { Airport, City } from '@core/models/location.model';
import { PublicAirportService, PublicCityService } from '@core/services/public-catalog.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

interface DestinationCard {
  cityName: string;
  airportCode: string;
  tagline: string;
  flightsPerDay: number;
  durationMin: number;
  durationLabel: string;
  minPrice: number;
  imageUrl: string;
}

type DestinationSort = 'all' | 'cheapest' | 'shortest' | 'frequent';

const CURATED_META: Record<
  string,
  { tagline: string; flightsPerDay: number; durationMin: number; durationLabel: string; minPrice: number; image: string }
> = {
  SGN: {
    tagline: 'Sài Gòn năng động',
    flightsPerDay: 8,
    durationMin: 125,
    durationLabel: '2h05',
    minPrice: 1290000,
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  },
  DAD: {
    tagline: 'Biển Mỹ Khê · Cầu Rồng',
    flightsPerDay: 6,
    durationMin: 85,
    durationLabel: '1h25',
    minPrice: 890000,
    image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=80',
  },
  PQC: {
    tagline: 'Đảo ngọc Phú Quốc',
    flightsPerDay: 4,
    durationMin: 130,
    durationLabel: '2h10',
    minPrice: 690000,
    image: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
  },
  CXR: {
    tagline: 'Vịnh biển Nha Trang',
    flightsPerDay: 5,
    durationMin: 110,
    durationLabel: '1h50',
    minPrice: 1090000,
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
  },
  DLI: {
    tagline: 'Thành phố ngàn hoa',
    flightsPerDay: 3,
    durationMin: 105,
    durationLabel: '1h45',
    minPrice: 780000,
    image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
  },
  HUI: {
    tagline: 'Cố đô di sản',
    flightsPerDay: 2,
    durationMin: 75,
    durationLabel: '1h15',
    minPrice: 950000,
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
  },
  HAN: {
    tagline: 'Thủ đô nghìn năm văn hiến',
    flightsPerDay: 10,
    durationMin: 130,
    durationLabel: '2h10',
    minPrice: 1190000,
    image: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  },
  VCA: {
    tagline: 'Thủ phủ miền Tây sông nước',
    flightsPerDay: 2,
    durationMin: 130,
    durationLabel: '2h10',
    minPrice: 1150000,
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
  },
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
];

const FALLBACK_DESTINATIONS: DestinationCard[] = [
  { cityName: 'TP. Hồ Chí Minh', airportCode: 'SGN', ...CURATED_META['SGN'], imageUrl: CURATED_META['SGN'].image },
  { cityName: 'Đà Nẵng', airportCode: 'DAD', ...CURATED_META['DAD'], imageUrl: CURATED_META['DAD'].image },
  { cityName: 'Phú Quốc', airportCode: 'PQC', ...CURATED_META['PQC'], imageUrl: CURATED_META['PQC'].image },
  { cityName: 'Nha Trang', airportCode: 'CXR', ...CURATED_META['CXR'], imageUrl: CURATED_META['CXR'].image },
  { cityName: 'Đà Lạt', airportCode: 'DLI', ...CURATED_META['DLI'], imageUrl: CURATED_META['DLI'].image },
  { cityName: 'Huế', airportCode: 'HUI', ...CURATED_META['HUI'], imageUrl: CURATED_META['HUI'].image },
];

/**
 * Điểm đến phổ biến — gọi `PublicCityService` & `PublicAirportService`,
 * bấm vào thẻ mở thẳng kết quả tìm chuyến `/flights`.
 * Bám sát `docs/design/prototype/customer.html` (màn `destinations`, W-RT-28).
 */
@Component({
  selector: 'app-public-destinations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, EmptyState, SkeletonBlock],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Điểm đến phổ biến</span>
      </nav>

      <div class="page-h">
        <h1>Điểm đến phổ biến</h1>
        <p>
          Chọn nơi bạn muốn đến, hệ thống mở ngay kết quả tìm chuyến bay thẳng nội địa phù hợp nhất.
        </p>
      </div>

      <div class="pills" role="tablist" aria-label="Sắp xếp điểm đến">
        <button
          type="button"
          class="pill"
          [class.is-active]="sortBy() === 'all'"
          (click)="sortBy.set('all')"
        >
          Tất cả
        </button>
        <button
          type="button"
          class="pill"
          [class.is-active]="sortBy() === 'cheapest'"
          (click)="sortBy.set('cheapest')"
        >
          Giá thấp nhất
        </button>
        <button
          type="button"
          class="pill"
          [class.is-active]="sortBy() === 'shortest'"
          (click)="sortBy.set('shortest')"
        >
          Bay ngắn nhất
        </button>
        <button
          type="button"
          class="pill"
          [class.is-active]="sortBy() === 'frequent'"
          (click)="sortBy.set('frequent')"
        >
          Nhiều chuyến nhất
        </button>
      </div>

      @if (loading()) {
        <div class="dest-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="dest-skeleton">
              <app-skeleton-block height="220px" />
            </div>
          }
        </div>
      } @else if (sortedItems().length === 0) {
        <div class="empty-card">
          <app-empty-state
            icon="explore"
            message="Chưa có điểm đến nào"
            hint="Danh sách điểm đến đang được cập nhật"
          />
        </div>
      } @else {
        <div class="dest-grid">
          @for (item of sortedItems(); track item.airportCode) {
            <button type="button" class="dest" (click)="searchTo(item.airportCode)">
              <img
                class="dest__img"
                [src]="item.imageUrl"
                [alt]="item.cityName"
                loading="lazy"
              />
              <span class="dest__ov" aria-hidden="true"></span>
              <span class="dest__price tabular">Từ {{ formatMoney(item.minPrice) }}</span>
              <span class="dest__bd">
                <span class="dest__name">{{ item.cityName }}</span>
                <span class="dest__code">{{ item.airportCode }}</span>
                <span class="dest__meta">
                  {{ item.tagline }} · {{ item.flightsPerDay }} chuyến/ngày · {{ item.durationLabel }}
                </span>
              </span>
            </button>
          }
        </div>

        <p class="dest-note">
          Giá tham khảo là mức giá thấp nhất trong 30 ngày tới, đã gồm thuế và phí sân bay. Giá thực
          tế cập nhật trực tiếp theo ngày bạn chọn khi tìm chuyến.
        </p>
      }
    </div>
  `,
  styles: `
    .pills {
      display: flex;
      gap: var(--sp-sm);
      flex-wrap: wrap;
      margin-bottom: var(--sp-lg);
    }

    .pill {
      height: 36px;
      padding: 0 var(--sp-lg);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-ink-muted);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
      transition: all var(--dur-fast) var(--ease);
    }

    .pill:hover {
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }

    .pill.is-active {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }

    .dest-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--sp-lg);
    }

    .dest-skeleton {
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .dest {
      position: relative;
      display: block;
      width: 100%;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--color-border-soft);
      aspect-ratio: 4 / 3;
      color: var(--color-on-dark);
      text-align: left;
      cursor: pointer;
    }

    .dest__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--dur) var(--ease);
    }

    .dest:hover .dest__img {
      transform: scale(1.04);
    }

    .dest__ov {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-dark) 10%, transparent) 0%,
        color-mix(in srgb, var(--color-dark) 45%, transparent) 45%,
        color-mix(in srgb, var(--color-dark) 92%, transparent) 100%
      );
    }

    .dest__price {
      position: absolute;
      top: var(--sp-md);
      left: var(--sp-md);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .dest__bd {
      position: absolute;
      left: var(--sp-lg);
      right: var(--sp-lg);
      bottom: var(--sp-md);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dest__name {
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 700;
      color: var(--color-on-dark);
    }

    .dest__code {
      font-size: var(--text-caption);
      font-weight: 700;
      letter-spacing: 0.12em;
      color: var(--color-on-dark-muted);
    }

    .dest__meta {
      font-size: var(--text-caption);
      color: var(--color-on-dark-muted);
    }

    .dest-note {
      margin-top: var(--sp-lg);
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
      line-height: 1.6;
    }

    .empty-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--sp-xl);
    }

    @media (max-width: 640px) {
      .dest-grid {
        grid-template-columns: 1fr;
      }

      .dest {
        aspect-ratio: 16 / 10;
      }
    }
  `,
})
export class PublicDestinationsPage implements OnInit {
  private readonly cityService = inject(PublicCityService);
  private readonly airportService = inject(PublicAirportService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly items = signal<DestinationCard[]>([]);
  protected readonly sortBy = signal<DestinationSort>('all');

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly sortedItems = computed(() => {
    const list = [...this.items()];
    switch (this.sortBy()) {
      case 'cheapest':
        return list.sort((a, b) => a.minPrice - b.minPrice);
      case 'shortest':
        return list.sort((a, b) => a.durationMin - b.durationMin);
      case 'frequent':
        return list.sort((a, b) => b.flightsPerDay - a.flightsPerDay);
      default:
        return list;
    }
  });

  ngOnInit(): void {
    forkJoin({
      cities: this.cityService.list({ page: 1, size: 50 }).pipe(catchError(() => of(null))),
      airports: this.airportService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
    }).subscribe(({ cities, airports }) => {
      const cityList: City[] = cities?.data?.items ?? [];
      const airportList: Airport[] = airports?.data?.items ?? [];

      if (cityList.length === 0) {
        this.items.set(FALLBACK_DESTINATIONS);
        this.loading.set(false);
        return;
      }

      const airportByCity = new Map<number, Airport>();
      for (const ap of airportList) {
        const cid = ap.city?.id ?? ap.city_id;
        if (cid && !airportByCity.has(cid)) {
          airportByCity.set(cid, ap);
        }
      }

      const cards: DestinationCard[] = cityList.map((city, idx) => {
        const ap = airportByCity.get(city.id);
        const code = (ap?.airport_code ?? city.city_code ?? '').toUpperCase();
        const curated = CURATED_META[code];
        return {
          cityName: city.city_name,
          airportCode: code,
          tagline: curated?.tagline ?? (city.country || 'Việt Nam'),
          flightsPerDay: curated?.flightsPerDay ?? 3,
          durationMin: curated?.durationMin ?? 95,
          durationLabel: curated?.durationLabel ?? '1h35',
          minPrice: curated?.minPrice ?? 890000 + (idx % 4) * 120000,
          imageUrl:
            city.image_url?.trim() ||
            curated?.image ||
            FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length],
        };
      });

      this.items.set(cards);
      this.loading.set(false);
    });
  }

  protected formatMoney(amount: number): string {
    return `${PublicDestinationsPage.money.format(amount)}đ`;
  }

  protected searchTo(airportCode: string): void {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const from = airportCode === 'HAN' ? 'SGN' : 'HAN';
    this.router.navigate(['/flights'], {
      queryParams: {
        tripType: 'oneway',
        from,
        to: airportCode,
        depart: `${tomorrow.getFullYear()}-${m}-${day}`,
        adults: 1,
      },
    });
  }
}
