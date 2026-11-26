import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { Airport } from '@core/models/location.model';
import { PublicAirportService } from '@core/services/public-catalog.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

const FALLBACK_AIRPORTS: Airport[] = [
  { id: 1, airport_code: 'HAN', airport_name: 'Sân bay Quốc tế Nội Bài', latitude: 21.2212, longitude: 105.8072, status: 'ACTIVE', city: { id: 1, city_code: 'HAN', city_name: 'Hà Nội', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 2, airport_code: 'SGN', airport_name: 'Sân bay Quốc tế Tân Sơn Nhất', latitude: 10.8188, longitude: 106.6519, status: 'ACTIVE', city: { id: 2, city_code: 'SGN', city_name: 'TP. Hồ Chí Minh', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 3, airport_code: 'DAD', airport_name: 'Sân bay Quốc tế Đà Nẵng', latitude: 16.0439, longitude: 108.1994, status: 'ACTIVE', city: { id: 3, city_code: 'DAD', city_name: 'Đà Nẵng', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 4, airport_code: 'CXR', airport_name: 'Sân bay Quốc tế Cam Ranh', latitude: 11.9982, longitude: 109.2194, status: 'ACTIVE', city: { id: 6, city_code: 'CXR', city_name: 'Nha Trang', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 5, airport_code: 'PQC', airport_name: 'Sân bay Quốc tế Phú Quốc', latitude: 10.1698, longitude: 103.9931, status: 'ACTIVE', city: { id: 9, city_code: 'PQC', city_name: 'Phú Quốc', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 6, airport_code: 'DLI', airport_name: 'Sân bay Liên Khương', latitude: 11.7506, longitude: 108.3736, status: 'ACTIVE', city: { id: 7, city_code: 'DLI', city_name: 'Đà Lạt', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 7, airport_code: 'HUI', airport_name: 'Sân bay Quốc tế Phú Bài', latitude: 16.4015, longitude: 107.7026, status: 'ACTIVE', city: { id: 5, city_code: 'HUI', city_name: 'Huế', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
];

/**
 * Danh sách sân bay công khai (`/airports`) — gọi `PublicAirportService`,
 * hỗ trợ tìm kiếm theo tên sân bay / thành phố / mã IATA và mở thẳng trang `/flights`.
 * Bám sát `docs/design/prototype/customer.html` (màn `airports`, W-RT-30).
 */
@Component({
  selector: 'app-public-airports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, EmptyState, SkeletonBlock],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Sân bay</span>
      </nav>

      <div class="page-h">
        <h1>Sân bay nội địa</h1>
        <p>
          {{ airports().length }} sân bay đang khai thác · chọn sân bay để tìm chuyến bay tới đó.
        </p>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <input
            type="search"
            [ngModel]="keyword()"
            (ngModelChange)="keyword.set($event)"
            placeholder="Tên sân bay, thành phố hoặc mã IATA (HAN, SGN, DAD...)"
            aria-label="Tìm sân bay"
          />
          @if (keyword()) {
            <button type="button" class="btn-clear" (click)="keyword.set('')">Xoá</button>
          }
        </div>
        <span class="badge-primary">Hiển thị {{ filtered().length }} sân bay</span>
      </div>

      @if (loading()) {
        <div class="card pad">
          <app-skeleton-block height="42px" />
          <div style="height: 10px"></div>
          <app-skeleton-block height="36px" />
          <div style="height: 10px"></div>
          <app-skeleton-block height="36px" />
          <div style="height: 10px"></div>
          <app-skeleton-block height="36px" />
        </div>
      } @else if (filtered().length === 0) {
        <div class="card pad">
          <app-empty-state
            icon="local_airport"
            message="Không tìm thấy sân bay phù hợp"
            hint="Thử tìm với tên thành phố hoặc mã IATA 3 chữ cái"
          />
        </div>
      } @else {
        <div class="card table-wrap">
          <table class="airport-table">
            <thead>
              <tr>
                <th>Mã IATA</th>
                <th>Tên sân bay</th>
                <th>Thành phố</th>
                <th>Trạng thái</th>
                <th class="right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              @for (ap of filtered(); track ap.id) {
                <tr>
                  <td><span class="code-pill">{{ ap.airport_code }}</span></td>
                  <td><b>{{ ap.airport_name }}</b></td>
                  <td>
                    {{ ap.city?.city_name || '—' }} · {{ ap.city?.country || 'Việt Nam' }}
                  </td>
                  <td>
                    <span class="status-ok">Đang khai thác</span>
                  </td>
                  <td class="right">
                    <button
                      type="button"
                      class="btn-sec"
                      (click)="findFlights(ap.airport_code)"
                    >
                      Tìm chuyến
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <div class="callout-neutral">
        Danh sách sân bay được đồng bộ từ danh mục hệ thống VinaFly. Bấm <b>Tìm chuyến</b> để xem
        lịch bay thẳng mới nhất tới sân bay tương ứng.
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

    .pad {
      padding: var(--sp-xl);
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
      max-width: 440px;
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

    .table-wrap {
      overflow-x: auto;
    }

    .airport-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 600px;
      font-size: var(--text-small);
    }

    .airport-table th,
    .airport-table td {
      padding: var(--sp-md) var(--sp-lg);
      border-bottom: 1px solid var(--color-border-soft);
      text-align: left;
      color: var(--color-ink);
    }

    .airport-table thead th {
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-size: var(--text-caption);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .airport-table tbody tr:last-child td {
      border-bottom: 0;
    }

    .right {
      text-align: right;
      white-space: nowrap;
    }

    .code-pill {
      display: inline-flex;
      padding: 3px 9px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700;
      font-size: var(--text-small);
      color: var(--color-primary);
    }

    .status-ok {
      display: inline-flex;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .btn-sec {
      padding: 7px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
    }

    .btn-sec:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
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

    .callout-neutral b {
      color: var(--color-ink);
    }
  `,
})
export class PublicAirportsPage implements OnInit {
  private readonly airportService = inject(PublicAirportService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly airports = signal<Airport[]>([]);
  protected readonly keyword = signal('');

  protected readonly filtered = computed(() => {
    const q = this.keyword().trim().toLowerCase();
    const list = this.airports();
    if (!q) return list;
    return list.filter(
      (ap) =>
        ap.airport_code.toLowerCase().includes(q) ||
        ap.airport_name.toLowerCase().includes(q) ||
        (ap.city?.city_name ?? '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.airportService
      .list({ page: 1, size: 100 })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        const items = res?.data?.items;
        this.airports.set(items && items.length > 0 ? items : FALLBACK_AIRPORTS);
        this.loading.set(false);
      });
  }

  protected findFlights(code: string): void {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const from = code === 'HAN' ? 'SGN' : 'HAN';
    this.router.navigate(['/flights'], {
      queryParams: {
        tripType: 'oneway',
        from,
        to: code,
        depart: `${tomorrow.getFullYear()}-${m}-${day}`,
        adults: 1,
      },
    });
  }
}
