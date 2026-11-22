import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { Airline } from '@core/models/airline.model';
import { FareClass } from '@core/models/fare-baggage.model';
import { FlightDetailRecord } from '@core/models/flight.model';
import { Airport } from '@core/models/location.model';
import { Promotion, PromotionScope, TripType } from '@core/models/promotion.model';
import { AirlineService } from '@core/services/airline.service';
import {
  AirportService,
  FareClassService,
  PromotionService,
} from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

interface ResolvedScope {
  typeLabel: string;
  targetType: PromotionScope['target_type'];
  detail: string;
}

/**
 * Trang chi tiết Khuyến mãi (`/admin/promotions/:id`).
 * Hiển thị banner, quy tắc giảm giá, phạm vi áp dụng (đã phân giải tên danh mục)
 * và danh sách chuyến bay bị loại trừ.
 */
@Component({
  selector: 'app-promotion-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, AppCard, LoadingState, StatusBadge],
  template: `
    <div class="wrap wrap--narrow">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/admin/promotions">Khuyến mãi</a>
        <mat-icon>chevron_right</mat-icon>
        <span>{{ promo()?.promotion_code || 'Chi tiết' }}</span>
      </nav>

      @if (loading()) {
        <app-app-card><app-loading-state /></app-app-card>
      } @else if (promo(); as p) {
        <header class="detail-head">
          <div class="detail-head__left">
            <div class="detail-head__meta">
              <span class="code-pill">{{ p.promotion_code }}</span>
              <app-status-badge
                [label]="p.status === 'ACTIVE' ? 'Đang chạy' : 'Tạm dừng'"
                [tone]="p.status === 'ACTIVE' ? 'success' : 'neutral'"
              />
              @if (p.badge_label) {
                <span class="tag-pill">{{ p.badge_label }}</span>
              }
            </div>
            <h1>{{ p.promotion_name }}</h1>
            @if (p.description) {
              <p class="detail-head__desc">{{ p.description }}</p>
            }
          </div>

          <div class="detail-head__acts">
            <app-app-button variant="ghost" size="sm" (clicked)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Quay lại
            </app-app-button>
            <app-app-button
              variant="secondary"
              size="sm"
              [disabled]="toggling()"
              (clicked)="toggleStatus()"
            >
              <mat-icon>{{ p.status === 'ACTIVE' ? 'pause_circle' : 'play_circle' }}</mat-icon>
              {{ p.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt' }}
            </app-app-button>
            <app-app-button size="sm" (clicked)="goEdit()">
              <mat-icon>edit</mat-icon>
              Chỉnh sửa
            </app-app-button>
          </div>
        </header>

        @if (p.image_url) {
          <app-app-card title="Ảnh banner khuyến mãi" class="blk">
            <div class="banner-box">
              @if (!imageBroken()) {
                <img
                  class="banner-img"
                  [src]="p.image_url"
                  [alt]="p.promotion_name"
                  loading="lazy"
                  (error)="imageBroken.set(true)"
                />
              } @else {
                <div class="banner-fallback" aria-hidden="true">
                  <mat-icon>image_not_supported</mat-icon>
                  <span>Không tải được ảnh banner</span>
                </div>
              }
            </div>
          </app-app-card>
        }

        <app-app-card title="Quy tắc giảm giá & hiệu lực" class="blk">
          <dl class="kv-grid">
            <div class="kv">
              <dt>Mức giảm</dt>
              <dd class="kv__strong">{{ formatDiscount(p) }}</dd>
            </div>
            <div class="kv">
              <dt>Loại giảm</dt>
              <dd>{{ p.discount_type === 'PERCENT' ? 'Theo phần trăm (%)' : 'Theo số tiền (đ)' }}</dd>
            </div>
            <div class="kv">
              <dt>Trần giảm mỗi dòng vé</dt>
              <dd>
                {{
                  p.max_discount_amount !== null ? formatMoney(p.max_discount_amount) : 'Không giới hạn'
                }}
              </dd>
            </div>
            <div class="kv">
              <dt>Giá dòng vé tối thiểu</dt>
              <dd>
                {{ p.min_fare_amount !== null ? formatMoney(p.min_fare_amount) : 'Không yêu cầu' }}
              </dd>
            </div>
            <div class="kv">
              <dt>Loại hành trình</dt>
              <dd>{{ formatTripType(p.applicable_trip_type) }}</dd>
            </div>
            <div class="kv">
              <dt>Thời gian hiệu lực</dt>
              <dd>{{ formatDate(p.start_date) }} – {{ formatDate(p.end_date) }}</dd>
            </div>
          </dl>
        </app-app-card>

        <app-app-card title="Phạm vi áp dụng" class="blk">
          @if (resolvedScopes().length === 0) {
            <p class="empty-line">Áp dụng cho <strong>tất cả chuyến bay</strong> nội địa.</p>
          } @else {
            <div class="table-scroll">
              <table class="scope-table">
                <thead>
                  <tr>
                    <th>Loại phạm vi</th>
                    <th>Đối tượng áp dụng</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of resolvedScopes(); track $index) {
                    <tr>
                      <td>
                        <span class="scope-badge">{{ s.typeLabel }}</span>
                      </td>
                      <td>{{ s.detail }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </app-app-card>

        <app-app-card title="Chuyến bay loại trừ" class="blk">
          @if (excludedLabels().length === 0) {
            <p class="empty-line">Không có chuyến bay nào bị loại trừ.</p>
          } @else {
            <div class="chip-list" role="list">
              @for (item of excludedLabels(); track item.id) {
                <span class="ex-chip" role="listitem">
                  <mat-icon aria-hidden="true">block</mat-icon>
                  <span>{{ item.label }}</span>
                </span>
              }
            </div>
          }
        </app-app-card>
      }
    </div>
  `,
  styles: `
    .blk {
      display: block;
      margin-bottom: var(--sp-md);
    }

    .detail-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-md);
      margin-bottom: var(--sp-md);
      flex-wrap: wrap;
    }

    .detail-head__left {
      min-width: 0;
      flex: 1 1 280px;
    }

    .detail-head__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--sp-sm);
      margin-bottom: 6px;
    }

    .detail-head h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      color: var(--color-ink);
    }

    .detail-head__desc {
      margin: 6px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .detail-head__acts {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--sp-sm);
    }

    .code-pill {
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-size: var(--text-caption);
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      color: var(--color-ink);
    }

    .tag-pill {
      font-size: var(--text-caption);
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }

    .banner-box {
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      max-height: 260px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .banner-img {
      width: 100%;
      max-height: 260px;
      object-fit: cover;
      display: block;
    }

    .banner-fallback {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: var(--sp-xl);
      color: var(--color-ink-subtle);
      font-size: var(--text-small);
    }

    .kv-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-md);
      margin: 0;
    }

    .kv {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kv dt {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-weight: 600;
    }

    .kv dd {
      margin: 0;
      font-size: var(--text-body);
      color: var(--color-ink);
    }

    .kv__strong {
      font-weight: 700;
      color: var(--color-primary);
    }

    .table-scroll {
      overflow-x: auto;
    }

    .scope-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-small);
    }

    .scope-table th,
    .scope-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .scope-table th {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }

    .scope-badge {
      display: inline-flex;
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--color-info-soft);
      color: var(--color-on-info-soft);
      font-size: var(--text-caption);
      font-weight: 600;
      white-space: nowrap;
    }

    .chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sp-sm);
    }

    .ex-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 11px;
      border-radius: 999px;
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
      font-size: var(--text-caption);
      font-weight: 600;
    }

    .ex-chip mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    @media (max-width: 640px) {
      .kv-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PromotionDetail {
  private readonly service = inject(PromotionService);
  private readonly airlineService = inject(AirlineService);
  private readonly airportService = inject(AirportService);
  private readonly fareClassService = inject(FareClassService);
  private readonly flightService = inject(FlightAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly loading = signal(true);
  protected readonly toggling = signal(false);
  protected readonly imageBroken = signal(false);
  protected readonly promo = signal<Promotion | null>(null);

  private readonly airlines = signal<Airline[]>([]);
  private readonly airports = signal<Airport[]>([]);
  private readonly fareClasses = signal<FareClass[]>([]);
  private readonly flightLabels = signal<Record<number, string>>({});

  protected readonly resolvedScopes = computed<ResolvedScope[]>(() => {
    const p = this.promo();
    if (!p?.scopes?.length) {
      return [];
    }
    const airlineMap = new Map(this.airlines().map((a) => [a.id, a]));
    const airportMap = new Map(this.airports().map((a) => [a.id, a]));
    const fareClassMap = new Map(this.fareClasses().map((fc) => [fc.id, fc]));
    const flights = this.flightLabels();

    return p.scopes.map((s) => {
      switch (s.target_type) {
        case 'AIRLINE': {
          const a = s.airline_id ? airlineMap.get(s.airline_id) : undefined;
          return {
            targetType: 'AIRLINE',
            typeLabel: 'Theo hãng bay',
            detail: a ? `${a.airline_code} — ${a.airline_name}` : `Hãng #${s.airline_id ?? '?'}`,
          };
        }
        case 'FARE_CLASS': {
          const fc = s.fare_class_id ? fareClassMap.get(s.fare_class_id) : undefined;
          return {
            targetType: 'FARE_CLASS',
            typeLabel: 'Theo hạng vé',
            detail: fc
              ? `${fc.fare_class_code} — ${fc.fare_class_name} (${fc.airline_code})`
              : `Hạng vé #${s.fare_class_id ?? '?'}`,
          };
        }
        case 'FLIGHT': {
          const fid = s.flight_id ?? 0;
          return {
            targetType: 'FLIGHT',
            typeLabel: 'Theo chuyến bay',
            detail: flights[fid] ?? `Chuyến bay #${fid || '?'}`,
          };
        }
        default: {
          const dep = s.departure_airport_id ? airportMap.get(s.departure_airport_id) : undefined;
          const arr = s.arrival_airport_id ? airportMap.get(s.arrival_airport_id) : undefined;
          const depTxt = dep ? `${dep.airport_code} (${dep.airport_name})` : `Sân bay #${s.departure_airport_id ?? '?'}`;
          const arrTxt = arr
            ? `${arr.airport_code} (${arr.airport_name})`
            : s.arrival_airport_id
              ? `Sân bay #${s.arrival_airport_id}`
              : 'Mọi điểm đến';
          return {
            targetType: 'ROUTE',
            typeLabel: 'Theo tuyến bay',
            detail: `${depTxt} → ${arrTxt}`,
          };
        }
      }
    });
  });

  protected readonly excludedLabels = computed(() => {
    const ids = this.promo()?.excluded_flight_ids ?? [];
    const labels = this.flightLabels();
    return ids.map((id) => ({
      id,
      label: labels[id] ?? `Chuyến bay #${id}`,
    }));
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/admin/promotions']);
      return;
    }
    this.loadData(id);
  }

  private loadData(id: number): void {
    this.loading.set(true);
    forkJoin({
      promo: this.service.getById(id),
      airlines: this.airlineService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      airports: this.airportService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      fareClasses: this.fareClassService
        .list({ page: 1, size: 100 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ promo, airlines, airports, fareClasses }) => {
          this.promo.set(promo.data);
          this.airlines.set(airlines?.data?.items ?? []);
          this.airports.set(airports?.data?.items ?? []);
          this.fareClasses.set(fareClasses?.data?.items ?? []);
          this.loading.set(false);

          const flightIds = [
            ...(promo.data.scopes ?? [])
              .filter((s) => s.target_type === 'FLIGHT' && s.flight_id)
              .map((s) => s.flight_id as number),
            ...(promo.data.excluded_flight_ids ?? []),
          ];
          this.hydrateFlights(flightIds);
        },
        error: (err: Error) => {
          this.snackBar.open(err.message || 'Không tải được chi tiết khuyến mãi', 'Đóng', {
            duration: 3000,
          });
          this.loading.set(false);
          this.router.navigate(['/admin/promotions']);
        },
      });
  }

  private hydrateFlights(ids: number[]): void {
    const unique = Array.from(new Set(ids)).filter((x) => x > 0);
    if (unique.length === 0) {
      return;
    }
    forkJoin(unique.map((fid) => this.flightService.getById(fid).pipe(catchError(() => of(null)))))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((responses) => {
        const map: Record<number, string> = {};
        for (const res of responses) {
          if (res?.data) {
            map[res.data.id] = PromotionDetail.formatFlight(res.data);
          }
        }
        this.flightLabels.set(map);
      });
  }

  private static formatFlight(f: FlightDetailRecord): string {
    const dep = f.departure_airport?.airport_code ?? '';
    const arr = f.arrival_airport?.airport_code ?? '';
    const d = f.scheduled_departure ? new Date(f.scheduled_departure) : null;
    const time =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';
    return `${f.flight_number} · ${dep} → ${arr}${time ? ` · ${time}` : ''}`;
  }

  protected toggleStatus(): void {
    const p = this.promo();
    if (!p) {
      return;
    }
    const nextStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.toggling.set(true);
    this.service
      .bulkToggle([p.id], nextStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toggling.set(false);
          this.promo.set({ ...p, status: nextStatus });
          this.snackBar.open(
            nextStatus === 'ACTIVE' ? 'Đã kích hoạt khuyến mãi' : 'Đã tạm dừng khuyến mãi',
            'Đóng',
            { duration: 3000 },
          );
        },
        error: (err: Error) => {
          this.toggling.set(false);
          this.snackBar.open(err.message || 'Không cập nhật được trạng thái', 'Đóng', {
            duration: 3000,
          });
        },
      });
  }

  protected goBack(): void {
    this.router.navigate(['/admin/promotions']);
  }

  protected goEdit(): void {
    const id = this.promo()?.id;
    if (id) {
      this.router.navigate(['/admin/promotions', id, 'edit']);
    }
  }

  protected formatDiscount(p: Promotion): string {
    return p.discount_type === 'PERCENT'
      ? `${p.discount_value}%`
      : this.formatMoney(p.discount_value);
  }

  protected formatMoney(amount: number): string {
    return `${PromotionDetail.money.format(amount)}đ`;
  }

  protected formatTripType(type: TripType): string {
    switch (type) {
      case 'ONE_WAY':
        return 'Chỉ một chiều';
      case 'ROUND_TRIP':
        return 'Chỉ khứ hồi';
      default:
        return 'Mọi hành trình';
    }
  }

  protected formatDate(iso: string): string {
    if (!iso) {
      return '—';
    }
    const [y, m, d] = iso.split('-');
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }
}
