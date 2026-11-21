import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import {
  BookingFlowService,
  FlightFareOption,
  PublicFlightSearchItem,
} from '@core/services/booking-flow.service';
import { SeatClass } from '@core/models/fleet-news.model';
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

/**
 * Kết quả tìm chuyến bay (`/flights`) — DA3.1.
 * Bám `customer.html`: bộ lọc Khoang dịch vụ, Hãng bay, Khung giờ cất cánh,
 * sắp xếp giá tăng dần & Modal so sánh quyền lợi 3 hạng vé có chuyển động mượt mà.
 */
@Component({
  selector: 'app-flight-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, AppButton, StatusBadge, EmptyState, SkeletonBlock],
  template: `
    <div class="wrap fr-page">
      <header class="fr-head">
        <div>
          <h1>Kết quả tìm chuyến bay</h1>
          <p class="fr-sub">
            Hiển thị {{ filteredFlights().length }} chuyến bay thẳng đang mở bán · Giá đã gồm thuế phí cơ bản
          </p>
        </div>
        <div class="fr-sorts" role="tablist" aria-label="Sắp xếp kết quả">
          @for (s of sorts; track s.key) {
            <button
              type="button"
              class="fr-sort"
              [class.fr-sort--active]="activeSort() === s.key"
              (click)="activeSort.set(s.key)"
            >
              {{ s.label }}
            </button>
          }
        </div>
      </header>

      <div class="fr-layout">
        <!-- Bộ lọc trái -->
        <aside class="fr-filters" aria-label="Bộ lọc chuyến bay">
          <div class="fr-fgroup">
            <h3>Khoang dịch vụ</h3>
            <div class="fr-radios">
              <label>
                <input
                  type="radio"
                  name="cabin"
                  value=""
                  [checked]="selectedCabin() === ''"
                  (change)="selectedCabin.set('')"
                />
                <span>Tất cả khoang</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="cabin"
                  value="ECONOMY"
                  [checked]="selectedCabin() === 'ECONOMY'"
                  (change)="selectedCabin.set('ECONOMY')"
                />
                <span>Phổ thông</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="cabin"
                  value="PREMIUM_ECONOMY"
                  [checked]="selectedCabin() === 'PREMIUM_ECONOMY'"
                  (change)="selectedCabin.set('PREMIUM_ECONOMY')"
                />
                <span>Phổ thông đặc biệt</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="cabin"
                  value="BUSINESS"
                  [checked]="selectedCabin() === 'BUSINESS'"
                  (change)="selectedCabin.set('BUSINESS')"
                />
                <span>Thương gia</span>
              </label>
            </div>
          </div>

          <div class="fr-fgroup">
            <h3>Hãng hàng không</h3>
            <div class="fr-checks">
              @for (a of availableAirlines(); track a.code) {
                <label>
                  <input
                    type="checkbox"
                    [checked]="selectedAirlines().has(a.code)"
                    (change)="toggleAirline(a.code)"
                  />
                  <span>{{ a.name }} ({{ a.code }})</span>
                </label>
              }
            </div>
          </div>

          <div class="fr-fgroup">
            <h3>Khung giờ cất cánh</h3>
            <div class="fr-checks">
              @for (slot of timeSlots; track slot.key) {
                <label>
                  <input
                    type="checkbox"
                    [checked]="selectedTimeSlots().has(slot.key)"
                    (change)="toggleTimeSlot(slot.key)"
                  />
                  <span>{{ slot.label }}</span>
                </label>
              }
            </div>
          </div>

          <button type="button" class="fr-reset" (click)="resetFilters()">
            Đặt lại bộ lọc
          </button>
        </aside>

        <!-- Danh sách chuyến -->
        <section class="fr-list">
          @if (loading()) {
            <app-skeleton-block height="120px" />
            <app-skeleton-block height="120px" />
            <app-skeleton-block height="120px" />
          } @else if (filteredFlights().length === 0) {
            <app-empty-state
              icon="flight_takeoff"
              message="Không có chuyến bay phù hợp bộ lọc"
              hint="Thử bỏ bớt điều kiện lọc hãng bay hoặc khung giờ cất cánh"
              actionLabel="Đặt lại bộ lọc"
              (actionClicked)="resetFilters()"
            />
          } @else {
            @for (fl of filteredFlights(); track fl.id) {
              <article class="fr-card">
                <div class="fr-card__main">
                  <div class="fr-airline">
                    <span class="fr-badge-code">{{ fl.airline_code }}</span>
                    <div>
                      <strong>{{ fl.airline_name }}</strong>
                      <div class="fr-muted">{{ fl.flight_number }} · {{ fl.aircraft_model }}</div>
                    </div>
                  </div>

                  <div class="fr-times">
                    <div class="fr-tblock">
                      <strong class="tabular">{{ formatTime(fl.scheduled_departure) }}</strong>
                      <span>{{ fl.departure_airport_code }}</span>
                    </div>
                    <div class="fr-dur">
                      <span>{{ formatDuration(fl.duration_minutes) }}</span>
                      <div class="fr-line"></div>
                      <small>Bay thẳng</small>
                    </div>
                    <div class="fr-tblock">
                      <strong class="tabular">{{ formatTime(fl.scheduled_arrival) }}</strong>
                      <span>{{ fl.arrival_airport_code }}</span>
                    </div>
                  </div>

                  <div class="fr-price-col">
                    <div class="fr-price tabular">{{ formatMoney(lowestPriceOf(fl)) }}</div>
                    <div class="fr-muted">/ người lớn</div>
                    <div class="fr-seats-badge">
                      <app-status-badge
                        [tone]="fl.available_seats <= 8 ? 'warning' : 'success'"
                        [label]="'Còn ' + fl.available_seats + ' ghế'"
                      />
                    </div>
                  </div>
                </div>

                <footer class="fr-card__foot">
                  <div class="fr-perks">
                    <span><mat-icon aria-hidden="true">luggage</mat-icon>7kg xách tay</span>
                    <span><mat-icon aria-hidden="true">airline_seat_recline_normal</mat-icon>{{ fl.fares.length }} hạng vé</span>
                  </div>
                  <app-app-button size="sm" variant="primary" (clicked)="openCompareModal(fl)">
                    So sánh 3 hạng vé & Chọn
                  </app-app-button>
                </footer>
              </article>
            }
          }
        </section>
      </div>
    </div>

    <!-- Modal so sánh quyền lợi 3 hạng vé (flight-detail) với hiệu ứng popup mượt mà -->
    @if (comparingFlight(); as fl) {
      <div
        class="vf-modal-backdrop"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'So sánh hạng vé chuyến ' + fl.flight_number"
        (click)="closeCompareModal()"
      >
        <div class="vf-modal-panel fr-modal" (click)="$event.stopPropagation()">
          <header class="fr-modal__head">
            <div>
              <h2>So sánh quyền lợi 3 hạng vé — {{ fl.flight_number }}</h2>
              <p class="fr-muted">
                {{ fl.airline_name }} · {{ fl.departure_airport_code }} → {{ fl.arrival_airport_code }}
                ({{ formatTime(fl.scheduled_departure) }} – {{ formatTime(fl.scheduled_arrival) }})
              </p>
            </div>
            <button
              type="button"
              class="fr-close"
              aria-label="Đóng hộp thoại"
              (click)="closeCompareModal()"
            >
              <mat-icon>close</mat-icon>
            </button>
          </header>

          <div class="fr-fares-grid">
            @for (fare of fl.fares; track fare.fare_class_code) {
              <div class="fr-fare-col" [class.fr-fare-col--featured]="fare.seat_class === 'PREMIUM_ECONOMY'">
                <div class="fr-fare-col__head">
                  <app-status-badge
                    [tone]="fare.seat_class === 'BUSINESS' ? 'warning' : fare.seat_class === 'PREMIUM_ECONOMY' ? 'info' : 'neutral'"
                    [label]="cabinLabel(fare.seat_class)"
                  />
                  <h3>{{ fare.fare_class_name }}</h3>
                  <div class="fr-fare-price tabular">{{ formatMoney(fare.adult_price) }}</div>
                  <small class="fr-muted">
                    Trẻ em: {{ formatMoney(fare.child_price) }} · Em bé: {{ formatMoney(fare.infant_price) }}
                  </small>
                </div>

                <ul class="fr-fare-list">
                  <li>
                    <mat-icon aria-hidden="true">work_outline</mat-icon>
                    <span>{{ fare.cabin_baggage }}</span>
                  </li>
                  <li>
                    <mat-icon aria-hidden="true">luggage</mat-icon>
                    <span>{{ fare.checked_baggage }}</span>
                  </li>
                  <li>
                    <mat-icon aria-hidden="true">{{ fare.refundable ? 'check_circle' : 'cancel' }}</mat-icon>
                    <span>{{ fare.refund_summary }}</span>
                  </li>
                  <li>
                    <mat-icon aria-hidden="true">sync</mat-icon>
                    <span>{{ fare.change_summary }}</span>
                  </li>
                </ul>

                <app-app-button variant="primary" size="sm" (clicked)="chooseFare(fl, fare)">
                  Chọn {{ fare.fare_class_name }}
                </app-app-button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .fr-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .fr-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .fr-head h1 {
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .fr-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .fr-sorts {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .fr-sort {
      padding: 7px 14px;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 500;
      cursor: pointer;
    }
    .fr-sort--active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .fr-layout {
      display: grid;
      grid-template-columns: 270px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .fr-layout {
        grid-template-columns: 1fr;
      }
    }
    .fr-filters {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .fr-fgroup h3 {
      font-size: var(--text-small);
      margin-bottom: 10px;
      color: var(--color-ink);
    }
    .fr-radios,
    .fr-checks {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: var(--text-small);
      color: var(--color-ink);
    }
    .fr-radios label,
    .fr-checks label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .fr-reset {
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      color: var(--color-primary);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
    }
    .fr-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fr-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
    }
    .fr-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }
    .fr-card__main {
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(170px, 1fr) minmax(200px, 1.2fr) minmax(150px, 0.8fr);
      gap: 16px;
      align-items: center;
    }
    @media (max-width: 720px) {
      .fr-card__main {
        grid-template-columns: 1fr;
      }
    }
    .fr-airline {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .fr-badge-code {
      width: 42px;
      height: 42px;
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .fr-times {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .fr-tblock {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .fr-tblock strong {
      font-size: var(--text-h2);
      color: var(--color-ink);
    }
    .fr-tblock span {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-weight: 600;
    }
    .fr-dur {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .fr-line {
      width: 100%;
      height: 2px;
      background: var(--color-border);
    }
    .fr-price-col {
      text-align: right;
    }
    @media (max-width: 720px) {
      .fr-price-col {
        text-align: left;
      }
    }
    .fr-price {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
      color: var(--color-accent);
    }
    .fr-seats-badge {
      margin-top: 6px;
    }
    .fr-muted {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .fr-card__foot {
      padding: 12px 18px;
      background: var(--color-surface-alt);
      border-top: 1px solid var(--color-border-soft);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .fr-perks {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .fr-perks span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .fr-perks mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    /* Modal so sánh 3 hạng vé */
    .fr-modal {
      max-width: 960px;
      padding: 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .fr-modal__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .fr-modal__head h2 {
      font-size: var(--text-h2);
      color: var(--color-ink);
    }
    .fr-close {
      border: 1px solid var(--color-border);
      background: var(--color-surface-alt);
      border-radius: 999px;
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--color-ink);
    }
    .fr-fares-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }
    @media (max-width: 780px) {
      .fr-fares-grid {
        grid-template-columns: 1fr;
      }
    }
    .fr-fare-col {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      background: var(--color-surface);
    }
    .fr-fare-col--featured {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .fr-fare-col__head h3 {
      margin: 8px 0 4px;
      font-size: var(--text-h3);
    }
    .fr-fare-price {
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
      color: var(--color-primary);
    }
    .fr-fare-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: var(--text-small);
    }
    .fr-fare-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .fr-fare-list mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-primary);
      flex-shrink: 0;
    }
  `,
})
export class FlightResults {
  private readonly bookingFlow = inject(BookingFlowService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly flights = signal<PublicFlightSearchItem[]>([]);
  protected readonly activeSort = signal<'price' | 'duration' | 'depart'>('price');
  protected readonly selectedCabin = signal<string>('');
  protected readonly selectedAirlines = signal<Set<string>>(new Set());
  protected readonly selectedTimeSlots = signal<Set<string>>(new Set());
  protected readonly comparingFlight = signal<PublicFlightSearchItem | null>(null);

  protected readonly sorts: { key: 'price' | 'duration' | 'depart'; label: string }[] = [
    { key: 'price', label: 'Giá tăng dần' },
    { key: 'duration', label: 'Nhanh nhất' },
    { key: 'depart', label: 'Khởi hành sớm nhất' },
  ];

  protected readonly timeSlots = [
    { key: 'early', label: 'Sáng sớm (00:00–05:59)', from: 0, to: 5 },
    { key: 'morning', label: 'Buổi sáng (06:00–11:59)', from: 6, to: 11 },
    { key: 'afternoon', label: 'Buổi chiều (12:00–17:59)', from: 12, to: 17 },
    { key: 'evening', label: 'Buổi tối (18:00–23:59)', from: 18, to: 23 },
  ];

  protected readonly availableAirlines = computed(() => {
    const map = new Map<string, string>();
    for (const f of this.flights()) {
      map.set(f.airline_code, f.airline_name);
    }
    return [...map.entries()].map(([code, name]) => ({ code, name }));
  });

  protected readonly filteredFlights = computed(() => {
    const cabin = this.selectedCabin();
    const airlines = this.selectedAirlines();
    const slots = this.selectedTimeSlots();

    const list = this.flights().filter((f) => {
      if (airlines.size > 0 && !airlines.has(f.airline_code)) return false;
      if (cabin && !f.fares.some((fc) => fc.seat_class === cabin)) return false;
      if (slots.size > 0) {
        const hour = new Date(f.scheduled_departure).getHours();
        const matchSlot = this.timeSlots.some(
          (s) => slots.has(s.key) && hour >= s.from && hour <= s.to,
        );
        if (!matchSlot) return false;
      }
      return true;
    });

    const sort = this.activeSort();
    return [...list].sort((a, b) => {
      if (sort === 'duration') return a.duration_minutes - b.duration_minutes;
      if (sort === 'depart') return a.scheduled_departure.localeCompare(b.scheduled_departure);
      return this.lowestPriceOf(a) - this.lowestPriceOf(b);
    });
  });

  constructor() {
    this.bookingFlow.searchPublicFlights().subscribe({
      next: (res) => {
        this.flights.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected toggleAirline(code: string): void {
    const next = new Set(this.selectedAirlines());
    if (next.has(code)) next.delete(code);
    else next.add(code);
    this.selectedAirlines.set(next);
  }

  protected toggleTimeSlot(key: string): void {
    const next = new Set(this.selectedTimeSlots());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.selectedTimeSlots.set(next);
  }

  protected resetFilters(): void {
    this.selectedCabin.set('');
    this.selectedAirlines.set(new Set());
    this.selectedTimeSlots.set(new Set());
  }

  protected lowestPriceOf(fl: PublicFlightSearchItem): number {
    const cabin = this.selectedCabin();
    const matched = cabin ? fl.fares.filter((f) => f.seat_class === cabin) : fl.fares;
    return matched.length > 0 ? Math.min(...matched.map((f) => f.adult_price)) : fl.min_price;
  }

  protected openCompareModal(fl: PublicFlightSearchItem): void {
    this.comparingFlight.set(fl);
  }

  protected closeCompareModal(): void {
    this.comparingFlight.set(null);
  }

  protected chooseFare(fl: PublicFlightSearchItem, fare: FlightFareOption): void {
    this.bookingFlow.selectFlightAndFare(fl, fare);
    this.comparingFlight.set(null);
    this.router.navigate(['/booking/seats']);
  }

  protected cabinLabel(cls: SeatClass): string {
    return CABIN_LABELS[cls] ?? cls;
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}g ${m}p` : `${m}p`;
  }
}
