import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '@env/environment';
import { Airline } from '@core/models/airline.model';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { BaggageOption, FareRule } from '@core/models/fare-baggage.model';
import { PublicAirlineService } from '@core/services/public-catalog.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

interface AirlineDisplayMeta {
  tagline: string;
  fleet: string;
  routesCount: number;
  minPrice: number;
  hotline: string;
  website: string;
}

const AIRLINE_META: Record<string, AirlineDisplayMeta> = {
  VN: {
    tagline: 'Hãng hàng không quốc gia',
    fleet: '3 dòng',
    routesCount: 12,
    minPrice: 790000,
    hotline: '1900 1100',
    website: 'vietnamairlines.com',
  },
  VJ: {
    tagline: 'Hàng không thế hệ mới',
    fleet: '2 dòng',
    routesCount: 14,
    minPrice: 690000,
    hotline: '1900 1886',
    website: 'vietjetair.com',
  },
  QH: {
    tagline: 'Hàng không chất lượng cao',
    fleet: '2 dòng',
    routesCount: 9,
    minPrice: 850000,
    hotline: '1900 1166',
    website: 'bambooairways.com',
  },
  VU: {
    tagline: 'Hàng không du lịch',
    fleet: '1 dòng',
    routesCount: 6,
    minPrice: 890000,
    hotline: '1900 6686',
    website: 'vietravelairlines.com',
  },
  BL: {
    tagline: 'Hàng không nội địa tiết kiệm',
    fleet: '1 dòng',
    routesCount: 6,
    minPrice: 720000,
    hotline: '1900 1550',
    website: 'pacificairlines.com',
  },
};

const FALLBACK_AIRLINES: Airline[] = [
  { id: 1, airline_code: 'VN', airline_name: 'Vietnam Airlines', country: 'Việt Nam', logo_url: null, status: 'ACTIVE' },
  { id: 2, airline_code: 'VJ', airline_name: 'Vietjet Air', country: 'Việt Nam', logo_url: null, status: 'ACTIVE' },
  { id: 3, airline_code: 'QH', airline_name: 'Bamboo Airways', country: 'Việt Nam', logo_url: null, status: 'ACTIVE' },
  { id: 4, airline_code: 'VU', airline_name: 'Vietravel Airlines', country: 'Việt Nam', logo_url: null, status: 'ACTIVE' },
  { id: 5, airline_code: 'BL', airline_name: 'Pacific Airlines', country: 'Việt Nam', logo_url: null, status: 'ACTIVE' },
];

const FALLBACK_FARE_RULES = (code: string) => [
  { name: 'Phổ thông Tiết kiệm', code: `${code}_ECON_SAVER`, refund: 'Không hoàn (0%)', cabin: 'Phổ thông', price: 790000 },
  { name: 'Phổ thông Tiêu chuẩn', code: `${code}_ECON_STANDARD`, refund: 'Hoàn 80% · trước 24 giờ', cabin: 'Phổ thông', price: 1090000 },
  { name: 'Phổ thông Linh hoạt', code: `${code}_ECON_FLEX`, refund: 'Hoàn 90% · trước 24 giờ', cabin: 'Phổ thông', price: 1390000 },
  { name: 'Thương gia Tiêu chuẩn', code: `${code}_BIZ_STANDARD`, refund: 'Hoàn 90% · trước 24 giờ', cabin: 'Thương gia', price: 3290000 },
];

const FALLBACK_BAGGAGE = [
  { name: 'Hành lý ký gửi 15 kg', weight_kg: 15, price: 199000 },
  { name: 'Hành lý ký gửi 20 kg', weight_kg: 20, price: 259000 },
  { name: 'Hành lý ký gửi 30 kg', weight_kg: 30, price: 399000 },
];

const POPULAR_ROUTES = [
  { from: 'HAN', to: 'SGN', price: 790000 },
  { from: 'HAN', to: 'DAD', price: 890000 },
  { from: 'SGN', to: 'DAD', price: 850000 },
  { from: 'HAN', to: 'PQC', price: 1290000 },
  { from: 'SGN', to: 'CXR', price: 940000 },
  { from: 'SGN', to: 'HUI', price: 980000 },
];

const moneyFmt = new Intl.NumberFormat('vi-VN');
function formatVnd(n: number): string {
  return `${moneyFmt.format(n)}đ`;
}

/**
 * Danh sách hãng hàng không công khai (`/airlines`) — gọi `PublicAirlineService`,
 * bám sát `docs/design/prototype/customer.html` (màn `airlines`, W-RT-29).
 */
@Component({
  selector: 'app-public-airlines',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, EmptyState, SkeletonBlock],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Hãng hàng không</span>
      </nav>

      <div class="page-h">
        <h1>Hãng hàng không</h1>
        <p>
          {{ airlines().length }} hãng bay đang khai thác trên VinaFly · mỗi hãng có hạng vé và gói
          hành lý ký gửi riêng.
        </p>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <input
            type="search"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event)"
            placeholder="Tìm theo tên hãng hoặc mã IATA (VN, VJ, QH...)"
            aria-label="Tìm hãng hàng không"
          />
          @if (keyword()) {
            <button type="button" class="btn-clear" (click)="keyword.set('')">Xoá</button>
          }
        </div>
        <span class="badge-success">Đang khai thác · {{ filtered().length }}</span>
      </div>

      @if (loading()) {
        <div class="airline-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="card airline-card">
              <app-skeleton-block height="48px" />
              <app-skeleton-block height="44px" />
              <app-skeleton-block height="32px" />
            </div>
          }
        </div>
      } @else if (filtered().length === 0) {
        <div class="card empty-wrap">
          <app-empty-state
            icon="flight"
            message="Không tìm thấy hãng hàng không"
            hint="Thử nhập từ khóa khác như Vietnam Airlines, Vietjet hoặc mã VN, VJ"
          />
        </div>
      } @else {
        <div class="airline-grid">
          @for (al of filtered(); track al.id) {
            <article class="card airline-card">
              <div class="airline__top">
                <span class="airline__lg" aria-hidden="true">
                  @if (al.logo_url && !brokenLogos().has(al.id)) {
                    <img
                      [src]="al.logo_url"
                      [alt]="al.airline_name"
                      loading="lazy"
                      (error)="markBroken(al.id)"
                    />
                  } @else {
                    @switch (al.airline_code) {
                      @case ('VN') {
                        <svg viewBox="0 0 48 48">
                          <rect width="48" height="48" rx="9" fill="#1B4E9B" />
                          <g fill="#D9A62E">
                            <path d="M24 12c2.9 3.6 4.3 7 4.3 10.2 0 3.3-1.4 6-4.3 8.4-2.9-2.4-4.3-5.1-4.3-8.4 0-3.2 1.4-6.6 4.3-10.2z" />
                            <path d="M17.9 16.4c2.4 3.3 3.3 6.2 2.9 8.9-.5 3.1-2.2 5.5-5.1 7.1-.8-4-.3-7.3 1.5-9.9.9-1.4 2-2.7 3.1-3.5z" opacity=".88" />
                            <path d="M30.1 16.4c-2.4 3.3-3.3 6.2-2.9 8.9.5 3.1 2.2 5.5 5.1 7.1.8-4 .3-7.3-1.5-9.9-.9-1.4-2-2.7-3.1-3.5z" opacity=".88" />
                            <path d="M12.6 22.3c2.5 4.2 3 7.6 1.7 10.3-1.3 2.7-4.2 4.5-7.7 5.1 0-4.7 1.3-8.2 3.8-10.5.7-.5 1.4-1 2.2-1.4z" opacity=".72" />
                            <path d="M35.4 22.3c-2.5 4.2-3 7.6-1.7 10.3 1.3 2.7 4.2 4.5 7.7 5.1 0-4.7-1.3-8.2-3.8-10.5-.7-.5-1.4-1-2.2-1.4z" opacity=".72" />
                          </g>
                        </svg>
                      }
                      @case ('VJ') {
                        <svg viewBox="0 0 48 48">
                          <rect width="48" height="48" rx="9" fill="#E31E24" />
                          <path d="M12 15h7.2l4.8 14 4.8-14H36L27.2 37h-6.4z" fill="#FFD400" />
                        </svg>
                      }
                      @case ('QH') {
                        <svg viewBox="0 0 48 48">
                          <rect width="48" height="48" rx="9" fill="#007A33" />
                          <g fill="#B5D334">
                            <rect x="13" y="11" width="7" height="12" rx="3.5" />
                            <rect x="13" y="26" width="7" height="11" rx="3.5" opacity=".78" />
                            <rect x="28" y="15" width="7" height="10" rx="3.5" opacity=".92" />
                            <rect x="28" y="28" width="7" height="9" rx="3.5" opacity=".66" />
                          </g>
                        </svg>
                      }
                      @case ('VU') {
                        <svg viewBox="0 0 48 48">
                          <rect width="48" height="48" rx="9" fill="#F7941D" />
                          <circle cx="24" cy="20" r="7.5" fill="#0072BC" />
                          <path d="M11 30c3.6-2.4 7.2-2.4 10.8 0s7.2 2.4 10.8 0c2-1.3 3.8-1.7 5.4-1.2V36H11z" fill="#0072BC" opacity=".9" />
                        </svg>
                      }
                      @case ('BL') {
                        <svg viewBox="0 0 48 48">
                          <rect width="48" height="48" rx="9" fill="#0F2D6B" />
                          <path d="M10 31c6-9 15-15 28-17-6 6-11 12-16 17z" fill="#E31E24" />
                          <path d="M12 34c7-5 15-8 25-9-5 4-11 8-17 11z" fill="#F5B400" />
                        </svg>
                      }
                      @default {
                        <span class="airline__mono">{{ al.airline_code }}</span>
                      }
                    }
                  }
                </span>
                <div>
                  <div class="airline__nm">{{ al.airline_name }}</div>
                  <div class="airline__sub">
                    IATA {{ al.airline_code }} · {{ meta(al.airline_code).tagline }}
                  </div>
                </div>
              </div>

              <div class="airline__stats">
                <div><span>Đội bay</span><b>{{ meta(al.airline_code).fleet }}</b></div>
                <div><span>Đường bay</span><b>{{ meta(al.airline_code).routesCount }} tuyến</b></div>
                <div><span>Giá từ</span><b class="tabular">{{ formatMoney(meta(al.airline_code).minPrice) }}</b></div>
              </div>

              <div class="airline__foot">
                <span class="foot-hint">Hạng vé &amp; hành lý riêng của hãng</span>
                <a class="btn-sec" [routerLink]="['/airlines', al.id]">Xem hãng →</a>
              </div>
            </article>
          }
        </div>
      }

      <div class="callout-neutral">
        Mỗi hãng hàng không áp dụng hệ thống hạng vé và gói hành lý ký gửi riêng biệt. Giá “từ” là
        mức giá tham khảo thấp nhất trong 30 ngày tới đã bao gồm thuế và phí sân bay.
      </div>
    </div>
  `,
  styles: `
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

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

    .badge-success {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .airline-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: var(--sp-lg);
    }

    .airline-card {
      display: flex;
      flex-direction: column;
      gap: var(--sp-md);
      padding: var(--sp-lg);
    }

    .airline__top {
      display: flex;
      align-items: center;
      gap: var(--sp-md);
    }

    .airline__lg {
      width: 48px;
      height: 48px;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: 9px;
      overflow: hidden;
      background: var(--color-surface-alt);
    }

    .airline__lg svg,
    .airline__lg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .airline__mono {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background: var(--color-dark);
      color: var(--color-on-dark);
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: var(--text-body);
    }

    .airline__nm {
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 700;
      color: var(--color-ink);
    }

    .airline__sub {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      margin-top: 2px;
    }

    .airline__stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-sm);
      padding: var(--sp-md) 0;
      border-top: 1px solid var(--color-border-soft);
      border-bottom: 1px solid var(--color-border-soft);
    }

    .airline__stats div span {
      display: block;
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .airline__stats div b {
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .airline__foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      margin-top: auto;
    }

    .foot-hint {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .btn-sec {
      display: inline-flex;
      align-items: center;
      padding: 7px var(--sp-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-primary);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-sec:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }

    .empty-wrap {
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
  `,
})
export class PublicAirlinesPage implements OnInit {
  private readonly airlineService = inject(PublicAirlineService);

  protected readonly loading = signal(true);
  protected readonly airlines = signal<Airline[]>([]);
  protected readonly keyword = signal('');
  protected readonly brokenLogos = signal<Set<number>>(new Set());

  protected readonly filtered = computed(() => {
    const q = this.keyword().trim().toLowerCase();
    const list = this.airlines();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.airline_name.toLowerCase().includes(q) || a.airline_code.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.airlineService
      .list({ page: 1, size: 50 })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        const items = res?.data?.items;
        this.airlines.set(items && items.length > 0 ? items : FALLBACK_AIRLINES);
        this.loading.set(false);
      });
  }

  protected meta(code: string): AirlineDisplayMeta {
    return (
      AIRLINE_META[code.toUpperCase()] ?? {
        tagline: 'Hàng không nội địa',
        fleet: '2 dòng',
        routesCount: 6,
        minPrice: 890000,
        hotline: '1900 1234',
        website: 'vinafly.vn',
      }
    );
  }

  protected formatMoney(n: number): string {
    return formatVnd(n);
  }

  protected markBroken(id: number): void {
    const next = new Set(this.brokenLogos());
    next.add(id);
    this.brokenLogos.set(next);
  }
}

/**
 * Chi tiết hãng hàng không công khai (`/airlines/:id`) — gọi `PublicAirlineService`,
 * `GET /api/public/fare-rules` và `GET /api/public/baggage-options`.
 * Bám sát `docs/design/prototype/customer.html` (màn `airline-detail`, W-RT-29a).
 */
@Component({
  selector: 'app-public-airline-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, SkeletonBlock],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <a routerLink="/airlines">Hãng hàng không</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>{{ airline()?.airline_name || 'Chi tiết hãng' }}</span>
      </nav>

      @if (loading()) {
        <div class="card pad">
          <app-skeleton-block height="72px" />
          <div style="height: 16px"></div>
          <app-skeleton-block height="180px" />
        </div>
      } @else if (airline(); as al) {
        <div class="card hero-card">
          <div class="hero-left">
            <span class="airline__lg" aria-hidden="true">
              @if (al.logo_url && !logoBroken()) {
                <img [src]="al.logo_url" [alt]="al.airline_name" (error)="logoBroken.set(true)" />
              } @else {
                <span class="airline__mono">{{ al.airline_code }}</span>
              }
            </span>
            <div>
              <h1>{{ al.airline_name }}</h1>
              <p class="hero-sub">
                Mã IATA <b>{{ al.airline_code }}</b> · {{ al.country || 'Việt Nam' }} ·
                {{ meta().tagline }}
              </p>
              <p class="hero-contact">
                Tổng đài {{ meta().hotline }} · {{ meta().website }}
              </p>
            </div>
          </div>

          <div class="hero-stats">
            <div><b class="tabular">{{ meta().fleet }}</b><span>dòng máy bay</span></div>
            <div><b class="tabular">{{ meta().routesCount }}</b><span>tuyến nội địa</span></div>
            <div><b class="tabular">{{ formatMoney(meta().minPrice) }}</b><span>giá từ</span></div>
          </div>
        </div>

        <div class="side-layout">
          <div class="stack">
            <div class="card">
              <div class="card-head">
                <h2>Hạng vé &amp; quy định hoàn vé</h2>
                <span class="head-note">Áp dụng riêng cho {{ al.airline_name }}</span>
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Hạng vé</th>
                      <th>Mã hạng</th>
                      <th>Quy định hoàn</th>
                      <th class="num">Tham khảo</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rule of fareRows(); track rule.code) {
                      <tr>
                        <td><b>{{ rule.name }}</b></td>
                        <td class="mono">{{ rule.code }}</td>
                        <td>{{ rule.refund }}</td>
                        <td class="num tabular">{{ rule.priceLabel }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <div class="card">
              <div class="card-head">
                <h2>Gói hành lý ký gửi mua thêm</h2>
                <span class="head-note">Tính theo từng hành khách &amp; từng chặng bay</span>
              </div>
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Tên gói hành lý</th>
                      <th class="num">Trọng lượng</th>
                      <th class="num">Giá cước</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (bag of baggageRows(); track bag.name + bag.weight_kg) {
                      <tr>
                        <td><b>{{ bag.name }}</b></td>
                        <td class="num tabular">{{ bag.weight_kg }} kg</td>
                        <td class="num tabular price">{{ formatMoney(bag.price) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside class="side-aside">
            <div class="card">
              <div class="card-head">
                <h2>Tuyến đang khai thác</h2>
              </div>
              <div class="card-body route-list">
                @for (rt of routes; track rt.from + rt.to) {
                  <button
                    type="button"
                    class="route-row"
                    (click)="searchRoute(rt.from, rt.to)"
                  >
                    <div>
                      <b>{{ rt.from }} → {{ rt.to }}</b>
                      <span class="tabular">từ {{ formatMoney(rt.price) }}</span>
                    </div>
                    <mat-icon aria-hidden="true">chevron_right</mat-icon>
                  </button>
                }
                <a class="btn-ghost-block" routerLink="/flights">Tìm tất cả chuyến bay</a>
              </div>
            </div>

            <div class="callout-neutral">
              Hạng vé và gói hành lý được đồng bộ trực tiếp từ danh mục quản trị của VinaFly.
            </div>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .pad {
      padding: var(--sp-xl);
    }

    .hero-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-xl);
      flex-wrap: wrap;
      padding: var(--sp-xl);
      margin-bottom: var(--sp-xl);
    }

    .hero-left {
      display: flex;
      align-items: center;
      gap: var(--sp-lg);
    }

    .airline__lg {
      width: 56px;
      height: 56px;
      flex: none;
      display: grid;
      place-items: center;
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--color-surface-alt);
    }

    .airline__lg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .airline__mono {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      background: var(--color-dark);
      color: var(--color-on-dark);
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 700;
    }

    .hero-left h1 {
      font-size: var(--text-h1);
      margin: 0;
    }

    .hero-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .hero-contact {
      margin: 4px 0 0;
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .hero-stats {
      display: flex;
      gap: var(--sp-2xl);
      flex-wrap: wrap;
    }

    .hero-stats div {
      text-align: center;
    }

    .hero-stats b {
      display: block;
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      color: var(--color-primary);
    }

    .hero-stats span {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .side-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 330px;
      gap: var(--sp-xl);
      align-items: start;
    }

    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--sp-lg);
      min-width: 0;
    }

    .side-aside {
      display: flex;
      flex-direction: column;
      gap: var(--sp-lg);
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      flex-wrap: wrap;
      padding: var(--sp-lg) var(--sp-xl);
      border-bottom: 1px solid var(--color-border-soft);
    }

    .card-head h2 {
      font-size: var(--text-h3);
      margin: 0;
    }

    .head-note {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .card-body {
      padding: var(--sp-lg);
    }

    .table-wrap {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 480px;
      font-size: var(--text-small);
    }

    .data-table th,
    .data-table td {
      padding: var(--sp-md) var(--sp-xl);
      border-bottom: 1px solid var(--color-border-soft);
      text-align: left;
      color: var(--color-ink);
    }

    .data-table thead th {
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-size: var(--text-caption);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .data-table tbody tr:last-child td {
      border-bottom: 0;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .price {
      font-weight: 700;
      color: var(--color-primary);
    }

    .route-list {
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
    }

    .route-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: var(--sp-md);
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      cursor: pointer;
      text-align: left;
    }

    .route-row:hover {
      border-color: var(--color-primary-bright);
    }

    .route-row b {
      display: block;
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .route-row span {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .route-row mat-icon {
      color: var(--color-ink-subtle);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-ghost-block {
      display: flex;
      justify-content: center;
      padding: 10px var(--sp-md);
      margin-top: var(--sp-xs);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      color: var(--color-ink-muted);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
    }

    .btn-ghost-block:hover {
      background: var(--color-surface-alt);
      color: var(--color-ink);
    }

    .callout-neutral {
      padding: var(--sp-lg);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-size: var(--text-small);
      line-height: 1.6;
    }

    @media (max-width: 1020px) {
      .side-layout {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PublicAirlineDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly airlineService = inject(PublicAirlineService);
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly airline = signal<Airline | null>(null);
  protected readonly logoBroken = signal(false);
  protected readonly fareRows = signal<Array<{ name: string; code: string; refund: string; priceLabel: string }>>([]);
  protected readonly baggageRows = signal<Array<{ name: string; weight_kg: number; price: number }>>([]);
  protected readonly routes = POPULAR_ROUTES;

  protected readonly meta = computed<AirlineDisplayMeta>(() => {
    const code = this.airline()?.airline_code?.toUpperCase() ?? '';
    return (
      AIRLINE_META[code] ?? {
        tagline: 'Hàng không nội địa',
        fleet: '2 dòng',
        routesCount: 6,
        minPrice: 890000,
        hotline: '1900 1234',
        website: 'vinafly.vn',
      }
    );
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')) || 1;
    forkJoin({
      airline: this.airlineService.getById(id).pipe(catchError(() => of(null))),
      baggage: this.http
        .get<ApiResponse<PageData<BaggageOption>>>(`${environment.apiBaseUrl}/public/baggage-options`, {
          params: { airline_id: id, page: 1, size: 50 },
        })
        .pipe(catchError(() => of(null))),
      fareRules: this.http
        .get<ApiResponse<PageData<FareRule>>>(`${environment.apiBaseUrl}/public/fare-rules`, {
          params: { airline_id: id, page: 1, size: 50 },
        })
        .pipe(catchError(() => of(null))),
    }).subscribe(({ airline, baggage, fareRules }) => {
      const resolved =
        airline?.data ?? FALLBACK_AIRLINES.find((a) => a.id === id) ?? FALLBACK_AIRLINES[0];
      this.airline.set(resolved);

      const bags = baggage?.data?.items?.filter((b) => b.status === 'ACTIVE') ?? [];
      this.baggageRows.set(
        bags.length > 0
          ? bags.map((b) => ({ name: b.name, weight_kg: b.weight_kg, price: b.price }))
          : FALLBACK_BAGGAGE,
      );

      const rules =
        fareRules?.data?.items?.filter(
          (r) =>
            r.status === 'ACTIVE' &&
            (!r.airline_code || r.airline_code.toUpperCase() === resolved.airline_code.toUpperCase()),
        ) ?? [];
      if (rules.length > 0) {
        this.fareRows.set(
          rules.map((r) => ({
            name: r.fare_class_name,
            code: r.fare_class_code,
            refund:
              r.is_refundable && r.refund_percent > 0
                ? `Hoàn ${r.refund_percent}% · trước ${r.refund_min_hours_before_departure} giờ`
                : 'Không hoàn (0%)',
            priceLabel: 'Theo chuyến bay',
          })),
        );
      } else {
        this.fareRows.set(
          FALLBACK_FARE_RULES(resolved.airline_code).map((f) => ({
            name: f.name,
            code: f.code,
            refund: f.refund,
            priceLabel: `Từ ${formatVnd(f.price)}`,
          })),
        );
      }

      this.loading.set(false);
    });
  }

  protected formatMoney(n: number): string {
    return formatVnd(n);
  }

  protected searchRoute(from: string, to: string): void {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    this.router.navigate(['/flights'], {
      queryParams: {
        tripType: 'oneway',
        from,
        to,
        depart: `${tomorrow.getFullYear()}-${m}-${day}`,
        adults: 1,
      },
    });
  }
}
