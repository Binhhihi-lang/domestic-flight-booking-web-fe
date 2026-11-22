import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SeatClass } from '@core/models/fleet-news.model';
import {
  BookingFlowService,
  FlightFareOption,
  PublicFlightSearchItem,
} from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import {
  FlightSearchCard,
  FlightSearchValue,
  TripType,
} from '@shared/components/flight-search-card/flight-search-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const CABIN_LABELS: Record<string, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

const CITY_NAMES: Record<string, string> = {
  HAN: 'Hà Nội (HAN)',
  SGN: 'TP. Hồ Chí Minh (SGN)',
  DAD: 'Đà Nẵng (DAD)',
  HPH: 'Hải Phòng (HPH)',
  HUI: 'Huế (HUI)',
  CXR: 'Nha Trang (CXR)',
  DLI: 'Đà Lạt (DLI)',
  VCA: 'Cần Thơ (VCA)',
  PQC: 'Phú Quốc (PQC)',
  BMV: 'Buôn Ma Thuột (BMV)',
  VII: 'Vinh (VII)',
  THD: 'Thanh Hóa (THD)',
};

const AIRLINE_COLORS: Record<string, string> = {
  VN: 'var(--color-primary)',
  VJ: 'var(--color-danger)',
  QH: 'var(--color-success)',
  BL: 'var(--color-dark-2)',
  VU: 'var(--color-warning)',
};

function defaultTomorrowIso(): string {
  const d = new Date(Date.now() + 86_400_000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Kết quả tìm chuyến bay (`/flights`) — bám prototype `customer.html` (results + flight-detail),
 * đọc đầy đủ tham số tìm kiếm từ URL, hỗ trợ Một chiều & Khứ hồi, và nối API `GET /api/public/flights/search`.
 */
@Component({
  selector: 'app-flight-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppButton,
    StatusBadge,
    EmptyState,
    SkeletonBlock,
    FlightSearchCard,
  ],
  templateUrl: './flight-results.html',
  styleUrl: './flight-results.css',
})
export class FlightResults implements OnInit {
  protected readonly bookingFlow = inject(BookingFlowService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly flights = signal<PublicFlightSearchItem[]>([]);
  protected readonly activeSort = signal<'price' | 'duration' | 'depart' | 'late'>('price');
  protected readonly selectedCabin = signal<string>('');
  protected readonly selectedAirlines = signal<Set<string>>(new Set());
  protected readonly selectedTimeSlots = signal<Set<string>>(new Set());
  protected readonly maxPriceFilter = signal<number>(10_000_000);
  protected readonly comparingFlight = signal<PublicFlightSearchItem | null>(null);
  protected readonly showSearchEditor = signal(false);
  protected readonly visibleLimit = signal(10);

  // Tham số tìm kiếm từ URL
  protected readonly tripType = signal<TripType>('oneway');
  protected readonly fromCode = signal('HAN');
  protected readonly toCode = signal('SGN');
  protected readonly departDate = signal(defaultTomorrowIso());
  protected readonly returnDate = signal('');
  protected readonly adultsCount = signal(1);
  protected readonly childrenCount = signal(0);
  protected readonly infantsCount = signal(0);
  protected readonly selectingReturn = signal(false);

  protected readonly sorts: { key: 'price' | 'duration' | 'depart' | 'late'; label: string }[] = [
    { key: 'price', label: 'Giá tăng dần' },
    { key: 'duration', label: 'Nhanh nhất' },
    { key: 'depart', label: 'Sớm nhất' },
    { key: 'late', label: 'Muộn nhất' },
  ];

  protected readonly timeSlots = [
    { key: 'early', label: 'Sáng sớm (00:00–05:59)', from: 0, to: 5 },
    { key: 'morning', label: 'Buổi sáng (06:00–11:59)', from: 6, to: 11 },
    { key: 'afternoon', label: 'Buổi chiều (12:00–17:59)', from: 12, to: 17 },
    { key: 'evening', label: 'Buổi tối (18:00–23:59)', from: 18, to: 23 },
  ];

  protected readonly fromLabel = computed(() => CITY_NAMES[this.fromCode()] ?? this.fromCode());
  protected readonly toLabel = computed(() => CITY_NAMES[this.toCode()] ?? this.toCode());
  protected readonly activeSearchDate = computed(() =>
    this.selectingReturn() ? this.returnDate() || this.departDate() : this.departDate(),
  );

  protected readonly passengerSummary = computed(() => {
    const parts = [`${this.adultsCount()} người lớn`];
    if (this.childrenCount() > 0) parts.push(`${this.childrenCount()} trẻ em`);
    if (this.infantsCount() > 0) parts.push(`${this.infantsCount()} em bé`);
    return parts.join(', ');
  });

  protected readonly availableAirlines = computed(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    for (const f of this.flights()) {
      const code = f.airline.airline_code;
      const cur = map.get(code);
      if (cur) cur.count++;
      else map.set(code, { code, name: f.airline.airline_name, count: 1 });
    }
    return [...map.values()];
  });

  protected readonly priceBounds = computed(() => {
    const prices = this.flights().map((f) => this.lowestPriceOf(f));
    if (prices.length === 0) return { min: 500_000, max: 5_000_000 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  });

  protected readonly filteredFlights = computed(() => {
    const cabin = this.selectedCabin();
    const airlines = this.selectedAirlines();
    const slots = this.selectedTimeSlots();
    const maxP = this.maxPriceFilter();

    const list = this.flights().filter((f) => {
      if (airlines.size > 0 && !airlines.has(f.airline.airline_code)) return false;
      if (cabin && !f.fares.some((fc) => fc.seat_class === cabin)) return false;
      if (this.lowestPriceOf(f) > maxP) return false;
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
      if (sort === 'late') return b.scheduled_departure.localeCompare(a.scheduled_departure);
      return this.lowestPriceOf(a) - this.lowestPriceOf(b);
    });
  });

  protected readonly visibleFlights = computed(() =>
    this.filteredFlights().slice(0, this.visibleLimit()),
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      const tt = (q.get('tripType') as TripType) || 'oneway';
      const from = (q.get('from') || 'HAN').trim().toUpperCase();
      const to = (q.get('to') || 'SGN').trim().toUpperCase();
      const depart = q.get('depart') || defaultTomorrowIso();
      const ret = q.get('returnDate') || '';
      const adults = Math.max(1, Number(q.get('adults') || 1));
      const children = Math.max(0, Number(q.get('children') || 0));
      const infants = Math.max(0, Math.min(Number(q.get('infants') || 0), adults));

      this.tripType.set(tt);
      this.fromCode.set(from);
      this.toCode.set(to);
      this.departDate.set(depart);
      this.returnDate.set(ret);
      this.adultsCount.set(adults);
      this.childrenCount.set(children);
      this.infantsCount.set(infants);
      this.selectingReturn.set(false);
      this.bookingFlow.tripType.set(tt === 'round' ? 'ROUND_TRIP' : 'ONE_WAY');
      this.bookingFlow.selectReturnFlightAndFare(null, null);
      this.bookingFlow.setPassengerCounts(adults, children, infants);

      this.loadFlights();
    });
  }

  protected loadFlights(): void {
    this.loading.set(true);
    this.error.set(null);
    this.visibleLimit.set(10);

    const dep = this.selectingReturn() ? this.toCode() : this.fromCode();
    const arr = this.selectingReturn() ? this.fromCode() : this.toCode();
    const date = this.selectingReturn() ? this.returnDate() || this.departDate() : this.departDate();

    this.bookingFlow
      .searchPublicFlights({
        departure_airport_code: dep,
        arrival_airport_code: arr,
        departure_date: date,
        adults: this.adultsCount(),
        children: this.childrenCount(),
        infants: this.infantsCount(),
        trip_type: this.tripType() === 'round' ? 'ROUND_TRIP' : 'ONE_WAY',
      })
      .subscribe({
        next: (res) => {
          const items = res.data ?? [];
          this.flights.set(items);
          const maxP = items.length > 0 ? Math.max(...items.map((f) => this.lowestPriceOf(f))) : 10_000_000;
          this.maxPriceFilter.set(maxP);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Không tải được danh sách chuyến bay');
          this.loading.set(false);
        },
      });
  }

  protected onModifySearch(value: FlightSearchValue): void {
    this.showSearchEditor.set(false);
    this.router.navigate(['/flights'], {
      queryParams: {
        tripType: value.tripType,
        from: value.from || 'HAN',
        to: value.to || 'SGN',
        depart: value.departDate || defaultTomorrowIso(),
        returnDate: value.tripType === 'round' ? value.returnDate || null : null,
        adults: value.passengers.adults,
        children: value.passengers.children || null,
        infants: value.passengers.infants || null,
      },
    });
  }

  protected backToOutbound(): void {
    this.selectingReturn.set(false);
    this.bookingFlow.selectReturnFlightAndFare(null, null);
    this.loadFlights();
  }

  protected showMore(): void {
    this.visibleLimit.update((n) => n + 10);
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
    this.maxPriceFilter.set(this.priceBounds().max);
  }

  protected lowestPriceOf(fl: PublicFlightSearchItem): number {
    const cabin = this.selectedCabin();
    const matched = cabin ? fl.fares.filter((f) => f.seat_class === cabin) : fl.fares;
    return matched.length > 0 ? Math.min(...matched.map((f) => f.adult_price)) : fl.lowest_adult_price;
  }

  protected cheapestFareOf(fl: PublicFlightSearchItem): FlightFareOption | null {
    if (!fl.fares || fl.fares.length === 0) return null;
    return [...fl.fares].sort((a, b) => a.adult_price - b.adult_price)[0];
  }

  protected totalSeatsOf(fl: PublicFlightSearchItem): number {
    if (!fl.fares || fl.fares.length === 0) return 0;
    return Math.max(...fl.fares.map((f) => f.seats_available));
  }

  protected openCompareModal(fl: PublicFlightSearchItem): void {
    this.comparingFlight.set(fl);
  }

  protected closeCompareModal(): void {
    this.comparingFlight.set(null);
  }

  protected chooseFare(fl: PublicFlightSearchItem, fare: FlightFareOption): void {
    this.comparingFlight.set(null);
    if (this.tripType() === 'round' && !this.selectingReturn()) {
      this.bookingFlow.selectFlightAndFare(fl, fare);
      this.selectingReturn.set(true);
      this.loadFlights();
      return;
    }

    if (this.selectingReturn()) {
      this.bookingFlow.selectReturnFlightAndFare(fl, fare);
    } else {
      this.bookingFlow.selectFlightAndFare(fl, fare);
      this.bookingFlow.selectReturnFlightAndFare(null, null);
    }
    this.router.navigate(['/booking/seats']);
  }

  protected airlineColor(code: string): string {
    return AIRLINE_COLORS[code] ?? 'var(--color-primary)';
  }

  protected cabinLabel(cls: SeatClass | string): string {
    return CABIN_LABELS[cls] ?? cls;
  }

  protected carryOnLabel(fare: FlightFareOption): string {
    if (fare.seat_class === 'BUSINESS') return '14 kg xách tay';
    if (fare.seat_class === 'PREMIUM_ECONOMY') return '10 kg xách tay';
    return fare.is_refundable ? '10 kg xách tay' : '7 kg xách tay';
  }

  protected checkedBaggageLabel(fare: FlightFareOption): string {
    if (fare.seat_class === 'BUSINESS') return '32 kg ký gửi';
    if (fare.seat_class === 'PREMIUM_ECONOMY') return '23 kg ký gửi';
    return fare.is_refundable ? '20 kg ký gửi' : 'Không bao gồm (mua thêm)';
  }

  protected changePolicyLabel(fare: FlightFareOption): string {
    if (fare.seat_class === 'BUSINESS') return 'Đổi miễn phí (trả chênh lệch)';
    if (fare.is_refundable) return 'Đổi có phí trước 24h';
    return 'Hạn chế đổi vé';
  }

  protected refundPolicyLabel(fare: FlightFareOption): string {
    if (fare.refund_description) return fare.refund_description;
    if (fare.is_refundable) {
      return `Hoàn ${fare.refund_percent}% trước ${fare.refund_min_hours_before_departure ?? 24}h`;
    }
    return 'Không hoàn vé';
  }

  protected seatSelectionLabel(fare: FlightFareOption): string {
    if (fare.seat_class === 'BUSINESS') return 'Miễn phí trong khoang Thương gia';
    if (fare.seat_class === 'PREMIUM_ECONOMY') return 'Miễn phí ghế tiêu chuẩn';
    return fare.is_refundable ? 'Miễn phí ghế giữa · phụ thu cửa sổ' : 'Phụ thu theo vị trí ghế';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(Math.round(val))}đ`;
  }

  protected formatMoneyNumber(val: number): string {
    return moneyFmt.format(Math.round(val));
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
