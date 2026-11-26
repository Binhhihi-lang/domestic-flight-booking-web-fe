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
import { PromotionScope, TripType, Voucher } from '@core/models/promotion.model';
import { AirlineService } from '@core/services/airline.service';
import {
  AirportService,
  FareClassService,
  VoucherService,
} from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

interface ResolvedScope {
  typeLabel: string;
  detail: string;
}

/**
 * Trang chi tiết Voucher (`/admin/vouchers/:id`).
 * Hiển thị thông tin phát hành, mức giảm, lượt nhận, phạm vi áp dụng, chuyến bay loại trừ
 * và nút CTA "Tặng voucher" dẫn sang `/admin/vouchers/:id/assign`.
 */
@Component({
  selector: 'app-voucher-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, AppCard, LoadingState, StatusBadge],
  template: `
    <div class="wrap wrap--narrow">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/admin/vouchers">Voucher</a>
        <mat-icon>chevron_right</mat-icon>
        <span>{{ voucher()?.voucher_code || 'Chi tiết' }}</span>
      </nav>

      @if (loading()) {
        <app-app-card><app-loading-state /></app-app-card>
      } @else if (voucher(); as v) {
        <header class="detail-head">
          <div class="detail-head__left">
            <div class="detail-head__meta">
              <span class="code-pill">{{ v.voucher_code }}</span>
              <app-status-badge
                [label]="v.status === 'ACTIVE' ? 'Đang phát' : 'Tạm dừng'"
                [tone]="v.status === 'ACTIVE' ? 'success' : 'neutral'"
              />
              <app-status-badge
                [label]="v.distribution_type === 'GLOBAL' ? 'Kho chung' : 'Tặng riêng'"
                [tone]="v.distribution_type === 'ASSIGNED' ? 'info' : 'neutral'"
              />
            </div>
            <h1>{{ v.voucher_name }}</h1>
            @if (v.description) {
              <p class="detail-head__desc">{{ v.description }}</p>
            }
          </div>

          <div class="detail-head__acts">
            <app-app-button variant="ghost" size="sm" (clicked)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Quay lại
            </app-app-button>
            <app-app-button
              variant="ghost"
              size="sm"
              [disabled]="toggling()"
              (clicked)="toggleStatus()"
            >
              <mat-icon>{{ v.status === 'ACTIVE' ? 'pause_circle' : 'play_circle' }}</mat-icon>
              {{ v.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt' }}
            </app-app-button>
            <app-app-button
              [variant]="v.distribution_type === 'ASSIGNED' ? 'primary' : 'secondary'"
              size="sm"
              (clicked)="goAssign()"
            >
              <mat-icon>card_giftcard</mat-icon>
              Tặng voucher
            </app-app-button>
            <app-app-button
              [variant]="v.distribution_type === 'ASSIGNED' ? 'secondary' : 'primary'"
              size="sm"
              (clicked)="goEdit()"
            >
              <mat-icon>edit</mat-icon>
              Chỉnh sửa
            </app-app-button>
          </div>
        </header>

        <app-app-card title="Quy tắc giảm giá & phát hành" class="blk">
          <dl class="kv-grid">
            <div class="kv">
              <dt>Mức giảm</dt>
              <dd class="kv__strong">{{ formatDiscount(v) }}</dd>
            </div>
            <div class="kv">
              <dt>Kiểu phát hành</dt>
              <dd>
                {{
                  v.distribution_type === 'GLOBAL'
                    ? 'Kho chung (khách tự nhận)'
                    : 'Tặng riêng (ADMIN chỉ định)'
                }}
              </dd>
            </div>
            <div class="kv">
              <dt>Trần giảm cả đơn</dt>
              <dd>
                {{
                  v.max_discount_amount !== null ? formatMoney(v.max_discount_amount) : 'Không giới hạn'
                }}
              </dd>
            </div>
            <div class="kv">
              <dt>Đơn hàng tối thiểu</dt>
              <dd>
                {{ v.min_order_amount !== null ? formatMoney(v.min_order_amount) : 'Không yêu cầu' }}
              </dd>
            </div>
            <div class="kv">
              <dt>Lượt đã nhận / Giới hạn</dt>
              <dd>
                <strong>{{ v.claimed_count }}</strong> /
                {{ v.claim_limit !== null ? v.claim_limit : 'Không giới hạn' }}
              </dd>
            </div>
            <div class="kv">
              <dt>Loại hành trình</dt>
              <dd>{{ formatTripType(v.applicable_trip_type) }}</dd>
            </div>
            <div class="kv">
              <dt>Thời gian hiệu lực</dt>
              <dd>{{ formatDate(v.start_date) }} – {{ formatDate(v.end_date) }}</dd>
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
export class VoucherDetail {
  private readonly service = inject(VoucherService);
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
  protected readonly voucher = signal<Voucher | null>(null);

  private readonly airlines = signal<Airline[]>([]);
  private readonly airports = signal<Airport[]>([]);
  private readonly fareClasses = signal<FareClass[]>([]);
  private readonly flightLabels = signal<Record<number, string>>({});

  protected readonly resolvedScopes = computed<ResolvedScope[]>(() => {
    const v = this.voucher();
    if (!v?.scopes?.length) {
      return [];
    }
    const airlineMap = new Map(this.airlines().map((a) => [a.id, a]));
    const airportMap = new Map(this.airports().map((a) => [a.id, a]));
    const fareClassMap = new Map(this.fareClasses().map((fc) => [fc.id, fc]));
    const flights = this.flightLabels();

    return v.scopes.map((s: PromotionScope) => {
      switch (s.target_type) {
        case 'AIRLINE': {
          const a = s.airline_id ? airlineMap.get(s.airline_id) : undefined;
          return {
            typeLabel: 'Theo hãng bay',
            detail: a ? `${a.airline_code} — ${a.airline_name}` : `Hãng #${s.airline_id ?? '?'}`,
          };
        }
        case 'FARE_CLASS': {
          const fc = s.fare_class_id ? fareClassMap.get(s.fare_class_id) : undefined;
          return {
            typeLabel: 'Theo hạng vé',
            detail: fc
              ? `${fc.fare_class_code} — ${fc.fare_class_name} (${fc.airline_code})`
              : `Hạng vé #${s.fare_class_id ?? '?'}`,
          };
        }
        case 'FLIGHT': {
          const fid = s.flight_id ?? 0;
          return {
            typeLabel: 'Theo chuyến bay',
            detail: flights[fid] ?? `Chuyến bay #${fid || '?'}`,
          };
        }
        default: {
          const dep = s.departure_airport_id ? airportMap.get(s.departure_airport_id) : undefined;
          const arr = s.arrival_airport_id ? airportMap.get(s.arrival_airport_id) : undefined;
          const depTxt = dep
            ? `${dep.airport_code} (${dep.airport_name})`
            : `Sân bay #${s.departure_airport_id ?? '?'}`;
          const arrTxt = arr
            ? `${arr.airport_code} (${arr.airport_name})`
            : s.arrival_airport_id
              ? `Sân bay #${s.arrival_airport_id}`
              : 'Mọi điểm đến';
          return {
            typeLabel: 'Theo tuyến bay',
            detail: `${depTxt} → ${arrTxt}`,
          };
        }
      }
    });
  });

  protected readonly excludedLabels = computed(() => {
    const ids = this.voucher()?.excluded_flight_ids ?? [];
    const labels = this.flightLabels();
    return ids.map((id) => ({
      id,
      label: labels[id] ?? `Chuyến bay #${id}`,
    }));
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/admin/vouchers']);
      return;
    }
    this.loadData(id);
  }

  private loadData(id: number): void {
    this.loading.set(true);
    forkJoin({
      voucher: this.service.getById(id),
      airlines: this.airlineService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      airports: this.airportService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null))),
      fareClasses: this.fareClassService
        .list({ page: 1, size: 100 })
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ voucher, airlines, airports, fareClasses }) => {
          this.voucher.set(voucher.data);
          this.airlines.set(airlines?.data?.items ?? []);
          this.airports.set(airports?.data?.items ?? []);
          this.fareClasses.set(fareClasses?.data?.items ?? []);
          this.loading.set(false);

          const flightIds = [
            ...(voucher.data.scopes ?? [])
              .filter((s) => s.target_type === 'FLIGHT' && s.flight_id)
              .map((s) => s.flight_id as number),
            ...(voucher.data.excluded_flight_ids ?? []),
          ];
          this.hydrateFlights(flightIds);
        },
        error: (err: Error) => {
          this.snackBar.open(err.message || 'Không tải được chi tiết voucher', 'Đóng', {
            duration: 3000,
          });
          this.loading.set(false);
          this.router.navigate(['/admin/vouchers']);
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
            map[res.data.id] = VoucherDetail.formatFlight(res.data);
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
    const v = this.voucher();
    if (!v) {
      return;
    }
    const nextStatus = v.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.toggling.set(true);
    this.service
      .bulkToggle([v.id], nextStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toggling.set(false);
          this.voucher.set({ ...v, status: nextStatus });
          this.snackBar.open(
            nextStatus === 'ACTIVE' ? 'Đã kích hoạt voucher' : 'Đã tạm dừng voucher',
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
    this.router.navigate(['/admin/vouchers']);
  }

  protected goEdit(): void {
    const id = this.voucher()?.id;
    if (id) {
      this.router.navigate(['/admin/vouchers', id, 'edit']);
    }
  }

  protected goAssign(): void {
    const id = this.voucher()?.id;
    if (id) {
      this.router.navigate(['/admin/vouchers', id, 'assign']);
    }
  }

  protected formatDiscount(v: Voucher): string {
    return v.discount_type === 'PERCENT'
      ? `${v.discount_value}%`
      : this.formatMoney(v.discount_value);
  }

  protected formatMoney(amount: number): string {
    return `${VoucherDetail.money.format(amount)}đ`;
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
