import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';
import { Airport, City } from '@core/models/location.model';
import { PublicAirportService, PublicCityService } from '@core/services/public-catalog.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

interface CityCardView {
  id: number;
  cityName: string;
  country: string;
  primaryCode: string;
  airportCount: number;
  airportNames: string;
  imageUrl: string;
}

const CITY_IMAGES: Record<string, string> = {
  HAN: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  SGN: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=80',
  DAD: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
  CXR: 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
  PQC: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
  DLI: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
};

const FALLBACK_IMAGES = Object.values(CITY_IMAGES);

const FALLBACK_CITIES: CityCardView[] = [
  { id: 1, cityName: 'Hà Nội', country: 'Việt Nam', primaryCode: 'HAN', airportCount: 1, airportNames: 'Nội Bài (HAN)', imageUrl: CITY_IMAGES['HAN'] },
  { id: 2, cityName: 'TP. Hồ Chí Minh', country: 'Việt Nam', primaryCode: 'SGN', airportCount: 1, airportNames: 'Tân Sơn Nhất (SGN)', imageUrl: CITY_IMAGES['SGN'] },
  { id: 3, cityName: 'Đà Nẵng', country: 'Việt Nam', primaryCode: 'DAD', airportCount: 1, airportNames: 'Đà Nẵng (DAD)', imageUrl: CITY_IMAGES['DAD'] },
  { id: 4, cityName: 'Nha Trang', country: 'Việt Nam', primaryCode: 'CXR', airportCount: 1, airportNames: 'Cam Ranh (CXR)', imageUrl: CITY_IMAGES['CXR'] },
  { id: 5, cityName: 'Phú Quốc', country: 'Việt Nam', primaryCode: 'PQC', airportCount: 1, airportNames: 'Phú Quốc (PQC)', imageUrl: CITY_IMAGES['PQC'] },
  { id: 6, cityName: 'Đà Lạt', country: 'Việt Nam', primaryCode: 'DLI', airportCount: 1, airportNames: 'Liên Khương (DLI)', imageUrl: CITY_IMAGES['DLI'] },
];

/**
 * Danh sách thành phố công khai (`/cities`) — gọi `PublicCityService` & `PublicAirportService`,
 * hiển thị ảnh `image_url` (có ảnh dự phòng) và điều hướng sang `/flights`.
 * Bám sát `docs/design/prototype/customer.html` (màn `cities`, W-RT-31).
 */
@Component({
  selector: 'app-public-cities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, EmptyState, SkeletonBlock],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Thành phố</span>
      </nav>

      <div class="page-h">
        <h1>Thành phố</h1>
        <p>
          {{ cities().length }} thành phố có đường bay nội địa · bấm vào một thành phố để tìm chuyến
          bay.
        </p>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <input
            type="search"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event)"
            placeholder="Tìm tên thành phố hoặc mã sân bay..."
            aria-label="Tìm thành phố"
          />
          @if (keyword()) {
            <button type="button" class="btn-clear" (click)="keyword.set('')">Xoá</button>
          }
        </div>
        <span class="badge-primary">{{ filtered().length }} thành phố</span>
      </div>

      @if (loading()) {
        <div class="city-grid">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="city-skeleton">
              <app-skeleton-block height="220px" />
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty-card">
          <app-empty-state
            icon="location_city"
            message="Không tìm thấy thành phố phù hợp"
            hint="Thử nhập từ khóa khác như Hà Nội, Đà Nẵng hoặc Phú Quốc"
          />
        </div>
      } @else {
        <div class="city-grid">
          @for (city of filtered(); track city.id) {
            <button type="button" class="dest" (click)="searchCity(city.primaryCode)">
              <img
                class="dest__img"
                [src]="city.imageUrl"
                [alt]="city.cityName"
                loading="lazy"
              />
              <span class="dest__ov" aria-hidden="true"></span>
              <span class="dest__code-badge">{{ city.primaryCode }}</span>
              <span class="dest__bd">
                <span class="dest__name">{{ city.cityName }}</span>
                <span class="dest__meta">
                  {{ city.airportCount }} sân bay · {{ city.airportNames || city.country }}
                </span>
              </span>
            </button>
          }
        </div>
      }

      <div class="callout-neutral">
        Ảnh và danh sách thành phố được đồng bộ trực tiếp từ danh mục Thành phố &amp; Sân bay trên
        hệ thống VinaFly.
      </div>
    </div>
  `,
  styles: `
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      flex-wrap: wrap;
      margin-bottom: var(--sp-lg);
    }

    .search-box {
      display: flex;
      gap: var(--sp-sm);
      width: 100%;
      max-width: 420px;
    }

    .search-box input {
      flex: 1 1 auto;
      min-width: 0;
      height: 42px;
      padding: 0 13px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-body);
      outline: none;
    }

    .search-box input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }

    .btn-clear {
      height: 42px;
      padding: 0 var(--sp-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-weight: 600;
      cursor: pointer;
    }

    .badge-primary {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .city-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--sp-lg);
    }

    .city-skeleton {
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

    .dest__code-badge {
      position: absolute;
      top: var(--sp-md);
      left: var(--sp-md);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: var(--text-caption);
      font-weight: 700;
      letter-spacing: 0.06em;
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

    .dest__meta {
      font-size: var(--text-caption);
      color: var(--color-on-dark-muted);
    }

    .empty-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--sp-xl);
    }

    .callout-neutral {
      margin-top: var(--sp-xl);
      padding: var(--sp-lg);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-size: var(--text-small);
      line-height: 1.65;
    }

    @media (max-width: 640px) {
      .city-grid {
        grid-template-columns: 1fr;
      }

      .dest {
        aspect-ratio: 16 / 10;
      }
    }
  `,
})
export class PublicCitiesPage implements OnInit {
  private readonly cityService = inject(PublicCityService);
  private readonly airportService = inject(PublicAirportService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly cities = signal<CityCardView[]>([]);
  protected readonly keyword = signal('');

  protected readonly filtered = computed(() => {
    const q = this.keyword().trim().toLowerCase();
    const list = this.cities();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.cityName.toLowerCase().includes(q) ||
        c.primaryCode.toLowerCase().includes(q) ||
        c.airportNames.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    forkJoin({
      cities: this.cityService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      airports: this.airportService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
    }).subscribe(({ cities, airports }) => {
      const cityList: City[] = cities?.data?.items ?? [];
      const airportList: Airport[] = airports?.data?.items ?? [];

      if (cityList.length === 0) {
        this.cities.set(FALLBACK_CITIES);
        this.loading.set(false);
        return;
      }

      const airportsByCity = new Map<number, Airport[]>();
      for (const ap of airportList) {
        const cid = ap.city?.id ?? ap.city_id;
        if (!cid) continue;
        const arr = airportsByCity.get(cid) ?? [];
        arr.push(ap);
        airportsByCity.set(cid, arr);
      }

      this.cities.set(
        cityList.map((c, idx) => {
          const aps = airportsByCity.get(c.id) ?? [];
          const primaryCode = (aps[0]?.airport_code ?? c.city_code ?? '').toUpperCase();
          return {
            id: c.id,
            cityName: c.city_name,
            country: c.country || 'Việt Nam',
            primaryCode,
            airportCount: Math.max(aps.length, 1),
            airportNames: aps.map((a) => `${a.airport_name} (${a.airport_code})`).join(', '),
            imageUrl:
              c.image_url?.trim() ||
              CITY_IMAGES[primaryCode] ||
              FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length],
          };
        }),
      );
      this.loading.set(false);
    });
  }

  protected searchCity(airportCode: string): void {
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
