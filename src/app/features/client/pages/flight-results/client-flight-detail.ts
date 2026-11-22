import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of } from 'rxjs';
import { FlightSeatMap } from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import {
  BookingFlowService,
  FlightFareOption,
  PublicFlightSearchItem,
} from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const CABIN_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

const CABIN_ORDER: SeatClass[] = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS'];

/**
 * Chi tiết chuyến bay công khai (`/flights/:id`) — `W-RT-02b`.
 * Hiển thị thông tin hành trình, 3 nhóm hạng vé theo khoang (chỉ đọc để tham khảo),
 * thông số máy bay khai thác từ `/api/public/flights/{id}/seat-map`, chính sách hành lý
 * và nút CTA "Chọn hạng vé" quay về `/flights`.
 */
@Component({
  selector: 'app-client-flight-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, StatusBadge, SkeletonBlock, EmptyState],
  template: `
    <div class="wrap cfd-page">
      <nav class="cfd-crumb" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <a routerLink="/flights" [queryParams]="backQueryParams()">Kết quả tìm chuyến</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Chi tiết chuyến bay</span>
      </nav>

      @if (loading()) {
        <app-skeleton-block height="140px" />
        <app-skeleton-block height="300px" />
      } @else if (!flight() && !seatMap()) {
        <app-empty-state
          icon="flight"
          message="Không tìm thấy thông tin chuyến bay"
          hint="Chuyến bay có thể đã thay đổi lịch trình hoặc ngừng mở bán."
          actionLabel="Quay lại tìm chuyến"
          actionLink="/flights"
        />
      } @else {
        @if (flight(); as fl) {
          <header class="cfd-card cfd-hero">
            <div class="cfd-hero__top">
              <div class="cfd-al">
                <span class="cfd-al__badge">{{ fl.airline.airline_code }}</span>
                <div>
                  <h1>{{ fl.airline.airline_name }} · {{ fl.flight_number }}</h1>
                  <p class="cfd-muted">
                    {{ formatDisplayDate(fl.scheduled_departure) }} · {{ fl.aircraft.model }} ({{ fl.aircraft.aircraft_code }})
                  </p>
                </div>
              </div>
              <a class="cfd-back" routerLink="/flights" [queryParams]="backQueryParams()">
                <mat-icon aria-hidden="true">arrow_back</mat-icon>
                Quay lại danh sách
              </a>
            </div>

            <div class="cfd-route">
              <div>
                <div class="cfd-route__time tabular">{{ formatTime(fl.scheduled_departure) }}</div>
                <div class="cfd-route__code">{{ fl.departure_airport.airport_code }}</div>
                <div class="cfd-muted">{{ fl.departure_airport.airport_name }}</div>
              </div>
              <div class="cfd-route__mid">
                <span class="cfd-muted tabular">{{ formatDuration(fl.duration_minutes) }}</span>
                <div class="cfd-route__line">
                  <mat-icon aria-hidden="true">flight</mat-icon>
                </div>
                <span class="cfd-muted">Bay thẳng</span>
              </div>
              <div class="cfd-route__end">
                <div class="cfd-route__time tabular">{{ formatTime(fl.scheduled_arrival) }}</div>
                <div class="cfd-route__code">{{ fl.arrival_airport.airport_code }}</div>
                <div class="cfd-muted">{{ fl.arrival_airport.airport_name }}</div>
              </div>
            </div>
          </header>
        }

        <div class="split">
          <div class="cfd-main">
            <!-- 3 khối hạng vé theo khoang (tham khảo) -->
            @if (cabinGroups().length > 0) {
              <section class="cfd-card">
                <h2>Các hạng vé đang mở bán</h2>
                <p class="cfd-muted">Thông tin quyền lợi tham khảo theo từng khoang dịch vụ.</p>

                <div class="cfd-cabins">
                  @for (grp of cabinGroups(); track grp.cabin) {
                    <div class="cfd-cabin-blk">
                      <div class="cfd-cabin-blk__hd">
                        <h3>Khoang {{ grp.label }}</h3>
                        <app-status-badge
                          [tone]="grp.cabin === 'BUSINESS' ? 'warning' : grp.cabin === 'PREMIUM_ECONOMY' ? 'info' : 'neutral'"
                          [label]="grp.fares.length + ' hạng vé'"
                        />
                      </div>

                      <div class="cfd-fare-list">
                        @for (fare of grp.fares; track fare.fare_class_code) {
                          <div class="cfd-fare-row">
                            <div>
                              <strong>{{ fare.fare_class_name }}</strong>
                              <span class="cfd-code">{{ fare.fare_class_code }}</span>
                              <div class="cfd-muted">
                                {{ carryOnLabel(fare) }} · {{ checkedBaggageLabel(fare) }} · {{ refundLabel(fare) }}
                              </div>
                            </div>
                            <div class="cfd-fare-row__right">
                              <strong class="cfd-price tabular">{{ formatMoney(fare.adult_price) }}</strong>
                              <span class="cfd-muted">Còn {{ fare.seats_available }} ghế</span>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </section>
            }

            <!-- Máy bay khai thác -->
            <section class="cfd-card">
              <h2>Máy bay khai thác</h2>
              <div class="cfd-aircraft-grid">
                <div class="cfd-stat">
                  <span class="cfd-muted">Dòng máy bay</span>
                  <strong>{{ flight()?.aircraft?.model || seatMap()?.model || 'Đang cập nhật' }}</strong>
                </div>
                <div class="cfd-stat">
                  <span class="cfd-muted">Mã tàu bay</span>
                  <strong class="tabular">{{ flight()?.aircraft?.aircraft_code || ('FL-' + flightId()) }}</strong>
                </div>
                <div class="cfd-stat">
                  <span class="cfd-muted">Tổng số ghế</span>
                  <strong class="tabular">{{ totalAircraftSeats() }} ghế</strong>
                </div>
              </div>

              @if (cabinSeatDistribution().length > 0) {
                <div class="cfd-dist">
                  @for (d of cabinSeatDistribution(); track d.cabin) {
                    <div class="cfd-dist__item">
                      <span>{{ d.label }}</span>
                      <strong class="tabular">{{ d.total }} ghế ({{ d.available }} trống)</strong>
                    </div>
                  }
                </div>
              }
            </section>

            <!-- Tóm tắt hành lý -->
            <section class="cfd-card">
              <h2>Quy định hành lý tiêu chuẩn</h2>
              <ul class="cfd-bag-list">
                <li><strong>Phổ thông:</strong> 7–10 kg xách tay; ký gửi 20 kg (hạng Linh hoạt) hoặc mua thêm ở bước Hành khách.</li>
                <li><strong>Phổ thông đặc biệt:</strong> 10 kg xách tay + 23 kg ký gửi miễn phí.</li>
                <li><strong>Thương gia:</strong> 14 kg xách tay + 32 kg ký gửi miễn phí.</li>
              </ul>
            </section>
          </div>

          <!-- Cột phải: Tóm tắt & CTA -->
          <aside class="cfd-card cfd-side">
            <h2>Tóm tắt chuyến bay</h2>
            @if (flight(); as fl) {
              <dl class="cfd-dl">
                <div>
                  <dt>Hành trình</dt>
                  <dd>{{ fl.departure_airport.airport_code }} → {{ fl.arrival_airport.airport_code }}</dd>
                </div>
                <div>
                  <dt>Số hiệu</dt>
                  <dd>{{ fl.flight_number }}</dd>
                </div>
                <div>
                  <dt>Thời gian bay</dt>
                  <dd class="tabular">{{ formatDuration(fl.duration_minutes) }}</dd>
                </div>
                <div>
                  <dt>Giá từ</dt>
                  <dd class="cfd-price tabular">{{ formatMoney(fl.lowest_adult_price) }}</dd>
                </div>
              </dl>
            }

            <a routerLink="/flights" [queryParams]="backQueryParams()" class="cfd-cta-link">
              <app-app-button variant="primary">
                Chọn hạng vé
                <mat-icon aria-hidden="true">arrow_forward</mat-icon>
              </app-app-button>
            </a>
          </aside>
        </div>
      }
    </div>
  `,
  styles: `
    .cfd-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 20px 16px 48px;
    }
    .cfd-crumb {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .cfd-crumb a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
    }
    .cfd-crumb mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .cfd-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 20px;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .cfd-card h1,
    .cfd-card h2,
    .cfd-card h3 {
      margin: 0;
      color: var(--color-ink);
    }
    .cfd-card h1 {
      font-size: var(--text-h2);
    }
    .cfd-card h2 {
      font-size: var(--text-h3);
    }
    .cfd-muted {
      margin: 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .cfd-hero__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }
    .cfd-al {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cfd-al__badge {
      width: 44px;
      height: 44px;
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-on-primary);
      display: grid;
      place-items: center;
      font-weight: 700;
    }
    .cfd-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
    }
    .cfd-back:hover {
      background: var(--color-surface-alt);
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .cfd-back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .cfd-route {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 20px;
      align-items: center;
      padding: 14px 16px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
    }
    .cfd-route__time {
      font-size: var(--text-h2);
      font-weight: 700;
      color: var(--color-ink);
    }
    .cfd-route__code {
      font-weight: 700;
      color: var(--color-primary);
    }
    .cfd-route__mid {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .cfd-route__line {
      width: 100%;
      border-bottom: 1.5px dashed var(--color-border);
      display: flex;
      justify-content: center;
      position: relative;
      height: 12px;
    }
    .cfd-route__line mat-icon {
      position: absolute;
      top: 2px;
      background: var(--color-surface-alt);
      padding: 0 6px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-primary);
      transform: rotate(90deg);
    }
    .cfd-route__end {
      text-align: right;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) 340px;
      gap: 18px;
      align-items: start;
    }
    @media (max-width: 920px) {
      .split {
        grid-template-columns: 1fr;
      }
    }
    .cfd-main {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cfd-cabins {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .cfd-cabin-blk {
      padding: 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .cfd-cabin-blk__hd {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .cfd-cabin-blk__hd h3 {
      font-size: var(--text-body);
    }
    .cfd-fare-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cfd-fare-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
    }
    .cfd-fare-row__right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .cfd-code {
      margin-left: 6px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .cfd-price {
      font-size: var(--text-h3);
      color: var(--color-primary);
    }
    .cfd-aircraft-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    @media (max-width: 640px) {
      .cfd-aircraft-grid {
        grid-template-columns: 1fr;
      }
    }
    .cfd-stat {
      padding: 12px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .cfd-dist {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .cfd-dist__item {
      flex: 1 1 160px;
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .cfd-bag-list {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: var(--text-small);
      color: var(--color-ink);
    }
    .cfd-side {
      position: sticky;
      top: 78px;
    }
    .cfd-dl {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: var(--text-small);
    }
    .cfd-dl > div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .cfd-dl dt {
      color: var(--color-ink-muted);
    }
    .cfd-dl dd {
      margin: 0;
      font-weight: 600;
      color: var(--color-ink);
    }
    .cfd-cta-link {
      text-decoration: none;
      display: block;
    }
  `,
})
export class ClientFlightDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bookingFlow = inject(BookingFlowService);

  protected readonly loading = signal(true);
  protected readonly flightId = signal<number>(0);
  protected readonly flight = signal<PublicFlightSearchItem | null>(null);
  protected readonly seatMap = signal<FlightSeatMap | null>(null);
  protected readonly backQueryParams = signal<Record<string, string | number | null>>({});

  protected readonly cabinGroups = computed(() => {
    const fl = this.flight();
    if (!fl) return [];
    return CABIN_ORDER.map((cabin) => {
      const fares = fl.fares
        .filter((f) => f.seat_class === cabin)
        .sort((a, b) => a.adult_price - b.adult_price);
      return fares.length > 0 ? { cabin, label: CABIN_LABELS[cabin], fares } : null;
    }).filter((g): g is NonNullable<typeof g> => g !== null);
  });

  protected readonly totalAircraftSeats = computed(() => {
    const seats = this.seatMap()?.seats;
    if (seats && seats.length > 0) return seats.length;
    return this.flight()?.aircraft?.seat_capacity ?? 0;
  });

  protected readonly cabinSeatDistribution = computed(() => {
    const seats = this.seatMap()?.seats ?? [];
    if (seats.length === 0) return [];
    return CABIN_ORDER.map((cabin) => {
      const list = seats.filter((s) => s.seat_type.seat_class === cabin);
      if (list.length === 0) return null;
      return {
        cabin,
        label: CABIN_LABELS[cabin],
        total: list.length,
        available: list.filter((s) => s.status === 'AVAILABLE').length,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.flightId.set(id);

    const q = this.route.snapshot.queryParamMap;
    const params: Record<string, string | number | null> = {};
    for (const key of ['tripType', 'from', 'to', 'depart', 'returnDate', 'adults', 'children', 'infants']) {
      const val = q.get(key);
      if (val) params[key] = val;
    }
    this.backQueryParams.set(params);

    const navState = typeof history !== 'undefined' ? (history.state as { flight?: PublicFlightSearchItem } | null) : null;
    if (navState?.flight && navState.flight.id === id) {
      this.flight.set(navState.flight);
    }

    const search$ = this.flight()
      ? of(null)
      : this.bookingFlow
          .searchPublicFlights({
            departure_airport_code: q.get('from') || undefined,
            arrival_airport_code: q.get('to') || undefined,
            departure_date: q.get('depart') || undefined,
          })
          .pipe(catchError(() => of(null)));

    const seatMap$ = this.bookingFlow.getPublicSeatMap(id).pipe(catchError(() => of(null)));

    forkJoin([search$, seatMap$]).subscribe(([searchRes, mapRes]) => {
      if (!this.flight() && searchRes?.data) {
        const found = searchRes.data.find((f) => f.id === id) ?? null;
        this.flight.set(found);
      }
      if (mapRes?.data) {
        this.seatMap.set(mapRes.data);
      }
      this.loading.set(false);
    });
  }

  protected carryOnLabel(fare: FlightFareOption): string {
    if (fare.seat_class === 'BUSINESS') return '14 kg xách tay';
    if (fare.seat_class === 'PREMIUM_ECONOMY') return '10 kg xách tay';
    return fare.is_refundable ? '10 kg xách tay' : '7 kg xách tay';
  }

  protected checkedBaggageLabel(fare: FlightFareOption): string {
    if (fare.seat_class === 'BUSINESS') return '32 kg ký gửi';
    if (fare.seat_class === 'PREMIUM_ECONOMY') return '23 kg ký gửi';
    return fare.is_refundable ? '20 kg ký gửi' : 'Không gồm ký gửi';
  }

  protected refundLabel(fare: FlightFareOption): string {
    if (fare.is_refundable) {
      return `Hoàn ${fare.refund_percent}% trước ${fare.refund_min_hours_before_departure ?? 24}h`;
    }
    return 'Không hoàn vé';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(Math.round(val))}đ`;
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDisplayDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  protected formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}p`;
  }
}
