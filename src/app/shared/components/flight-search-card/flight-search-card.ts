import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { Airport } from '@core/models/location.model';
import { PublicAirportService } from '@core/services/public-catalog.service';

export type TripType = 'round' | 'oneway';

/** Ba loại hành khách — DB v0.5 `passengers.passenger_type` (ADULT/CHILD/INFANT). */
export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightSearchValue {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
  passengers: PassengerCounts;
}

type AirportLite = Pick<Airport, 'id' | 'airport_code' | 'airport_name' | 'city'>;

const FALLBACK_AIRPORTS: AirportLite[] = [
  { id: 1, airport_code: 'HAN', airport_name: 'Sân bay Quốc tế Nội Bài', city: { id: 1, city_code: 'HAN', city_name: 'Hà Nội', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 2, airport_code: 'SGN', airport_name: 'Sân bay Quốc tế Tân Sơn Nhất', city: { id: 2, city_code: 'SGN', city_name: 'TP. Hồ Chí Minh', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 3, airport_code: 'DAD', airport_name: 'Sân bay Quốc tế Đà Nẵng', city: { id: 3, city_code: 'DAD', city_name: 'Đà Nẵng', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 4, airport_code: 'HPH', airport_name: 'Sân bay Quốc tế Cát Bi', city: { id: 4, city_code: 'HPH', city_name: 'Hải Phòng', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 5, airport_code: 'HUI', airport_name: 'Sân bay Quốc tế Phú Bài', city: { id: 5, city_code: 'HUI', city_name: 'Huế', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 6, airport_code: 'CXR', airport_name: 'Sân bay Quốc tế Cam Ranh', city: { id: 6, city_code: 'CXR', city_name: 'Nha Trang', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 7, airport_code: 'DLI', airport_name: 'Sân bay Liên Khương', city: { id: 7, city_code: 'DLI', city_name: 'Đà Lạt', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 8, airport_code: 'VCA', airport_name: 'Sân bay Quốc tế Trà Nóc', city: { id: 8, city_code: 'VCA', city_name: 'Cần Thơ', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 9, airport_code: 'PQC', airport_name: 'Sân bay Quốc tế Phú Quốc', city: { id: 9, city_code: 'PQC', city_name: 'Phú Quốc', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 10, airport_code: 'BMV', airport_name: 'Sân bay Buôn Ma Thuột', city: { id: 10, city_code: 'BMV', city_name: 'Buôn Ma Thuột', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 11, airport_code: 'VII', airport_name: 'Sân bay Vinh', city: { id: 11, city_code: 'VII', city_name: 'Vinh', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
  { id: 12, airport_code: 'THD', airport_name: 'Sân bay Thọ Xuân', city: { id: 12, city_code: 'THD', city_name: 'Thanh Hóa', country: 'Việt Nam', image_url: null, status: 'ACTIVE' } },
];

const RECENT_STORAGE_KEY = 'vinafly_recent_airports';
const MAX_TOTAL = 9;
const MAX_INFANTS = (adults: number) => adults;

function offsetLocalDate(daysFromToday: number): string {
  const d = new Date(Date.now() + daysFromToday * 86_400_000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function normalizeVi(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Widget tìm chuyến bay (`W-RT-01a`) — type-to-search sân bay với tìm kiếm gần đây,
 * nút hoán đổi đặt chính giữa Điểm đi & Điểm đến, và bộ chọn hành khách.
 */
@Component({
  selector: 'app-flight-search-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  templateUrl: './flight-search-card.html',
  styleUrl: './flight-search-card.css',
})
export class FlightSearchCard implements OnInit {
  private readonly airportService = inject(PublicAirportService, { optional: true });
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly initialTripType = input<TripType>('oneway');
  readonly initialFrom = input<string>('HAN');
  readonly initialTo = input<string>('SGN');
  readonly initialDepartDate = input<string>('');
  readonly initialReturnDate = input<string>('');
  readonly initialAdults = input<number>(1);
  readonly initialChildren = input<number>(0);
  readonly initialInfants = input<number>(0);

  readonly searched = output<FlightSearchValue>();

  protected readonly airports = signal<AirportLite[]>(FALLBACK_AIRPORTS);
  protected readonly tripType = signal<TripType>('oneway');
  protected readonly fromSignal = signal('HAN');
  protected readonly toSignal = signal('SGN');
  protected from = 'HAN';
  protected to = 'SGN';
  protected readonly minDate = offsetLocalDate(0);
  protected departDate = offsetLocalDate(1);
  protected returnDate = offsetLocalDate(4);

  // Trạng thái type-to-search dropdown sân bay
  protected readonly openField = signal<'from' | 'to' | null>(null);
  protected readonly fromQuery = signal('');
  protected readonly toQuery = signal('');
  protected readonly activeOptionIdx = signal(0);
  protected readonly recentCodes = signal<string[]>(this.readRecentCodes());
  protected readonly swapRotated = signal(false);

  /** Loại bỏ điểm đi khỏi danh sách điểm đến để không bao giờ chọn trùng sân bay. */
  protected readonly destinationAirports = computed(() => {
    const origin = this.fromSignal();
    const list = this.airports();
    const filtered = list.filter((ap) => ap.airport_code !== origin);
    return filtered.length > 0 ? filtered : list;
  });

  protected readonly fromDisplayValue = computed(() => {
    if (this.openField() === 'from') return this.fromQuery();
    const found = this.airports().find((a) => a.airport_code === this.fromSignal());
    return found ? this.airportLabel(found) : this.fromSignal();
  });

  protected readonly toDisplayValue = computed(() => {
    if (this.openField() === 'to') return this.toQuery();
    const found = this.airports().find((a) => a.airport_code === this.toSignal());
    return found ? this.airportLabel(found) : this.toSignal();
  });

  protected readonly fromRecentOptions = computed(() => {
    if (this.fromQuery().trim()) return [];
    return this.resolveRecent(this.airports());
  });

  protected readonly fromPopularOptions = computed(() =>
    this.filterAirports(this.airports(), this.fromQuery()),
  );

  protected readonly toRecentOptions = computed(() => {
    if (this.toQuery().trim()) return [];
    return this.resolveRecent(this.destinationAirports());
  });

  protected readonly toPopularOptions = computed(() =>
    this.filterAirports(this.destinationAirports(), this.toQuery()),
  );

  protected readonly adults = signal(1);
  protected readonly children = signal(0);
  protected readonly infants = signal(0);

  /** Popup chọn hành khách đang mở hay không. */
  protected readonly paxOpen = signal(false);

  protected readonly maxTotal = MAX_TOTAL;

  protected readonly total = computed(() => this.adults() + this.children() + this.infants());
  protected readonly maxInfants = computed(() => MAX_INFANTS(this.adults()));

  protected readonly canAddAdult = computed(() => this.total() < MAX_TOTAL);
  protected readonly canAddChild = computed(() => this.total() < MAX_TOTAL);
  protected readonly canAddInfant = computed(
    () => this.total() < MAX_TOTAL && this.infants() < this.maxInfants(),
  );

  protected readonly canRemoveAdult = computed(() => this.adults() > 1);
  protected readonly canRemoveChild = computed(() => this.children() > 0);
  protected readonly canRemoveInfant = computed(() => this.infants() > 0);

  protected readonly summary = computed(() => {
    const parts: string[] = [`${this.adults()} người lớn`];
    if (this.children() > 0) {
      parts.push(`${this.children()} trẻ em`);
    }
    if (this.infants() > 0) {
      parts.push(`${this.infants()} em bé`);
    }
    return parts.join(', ');
  });

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.openField()) return;
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.closeAirportDropdown();
    }
  }

  ngOnInit(): void {
    this.tripType.set(this.initialTripType());
    if (this.initialFrom()) {
      this.from = this.initialFrom();
      this.fromSignal.set(this.from);
    }
    if (this.initialTo()) {
      this.to = this.initialTo();
      this.toSignal.set(this.to);
    }
    if (this.to === this.from) {
      this.to = this.pickAlternativeAirport(this.from);
      this.toSignal.set(this.to);
    }
    if (this.initialDepartDate()) {
      this.departDate = this.initialDepartDate() < this.minDate ? this.minDate : this.initialDepartDate();
    }
    if (this.initialReturnDate()) {
      this.returnDate = this.initialReturnDate() < this.departDate ? this.departDate : this.initialReturnDate();
    }
    if (this.initialAdults() >= 1) this.adults.set(this.initialAdults());
    if (this.initialChildren() >= 0) this.children.set(this.initialChildren());
    if (this.initialInfants() >= 0) {
      this.infants.set(Math.min(this.initialInfants(), this.adults()));
    }

    if (this.airportService) {
      this.airportService
        .list({ page: 1, size: 100 })
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          const items = res?.data?.items;
          if (items && items.length > 0) {
            this.airports.set(items);
          }
        });
    }
  }

  protected airportLabel(ap: Pick<Airport, 'airport_code' | 'airport_name' | 'city'>): string {
    const cityName = ap.city?.city_name;
    return cityName ? `${cityName} (${ap.airport_code})` : `${ap.airport_name} (${ap.airport_code})`;
  }

  protected airportTitle(ap: Pick<Airport, 'airport_code' | 'airport_name' | 'city'>): string {
    return ap.city?.city_name || ap.airport_name;
  }

  protected openAirportDropdown(field: 'from' | 'to'): void {
    this.paxOpen.set(false);
    this.openField.set(field);
    this.activeOptionIdx.set(0);
    if (field === 'from') {
      this.fromQuery.set('');
    } else {
      this.toQuery.set('');
    }
  }

  protected closeAirportDropdown(): void {
    this.openField.set(null);
    this.fromQuery.set('');
    this.toQuery.set('');
  }

  protected onSearchQueryInput(field: 'from' | 'to', value: string): void {
    if (this.openField() !== field) {
      this.openField.set(field);
    }
    this.activeOptionIdx.set(0);
    if (field === 'from') {
      this.fromQuery.set(value);
    } else {
      this.toQuery.set(value);
    }
  }

  protected selectAirport(field: 'from' | 'to', ap: AirportLite): void {
    if (field === 'from') {
      this.onFromChange(ap.airport_code);
    } else {
      this.onToChange(ap.airport_code);
    }
    this.pushRecentCode(ap.airport_code);
    this.closeAirportDropdown();
  }

  protected onAirportKeydown(field: 'from' | 'to', event: KeyboardEvent): void {
    const options =
      field === 'from'
        ? [...this.fromRecentOptions(), ...this.fromPopularOptions()]
        : [...this.toRecentOptions(), ...this.toPopularOptions()];

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeAirportDropdown();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.openField() !== field) {
        this.openAirportDropdown(field);
        return;
      }
      if (options.length > 0) {
        this.activeOptionIdx.update((i) => (i + 1) % options.length);
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (options.length > 0) {
        this.activeOptionIdx.update((i) => (i - 1 + options.length) % options.length);
      }
      return;
    }
    if (event.key === 'Enter' && this.openField() === field) {
      event.preventDefault();
      const picked = options[this.activeOptionIdx()] ?? options[0];
      if (picked) {
        this.selectAirport(field, picked);
      }
    }
  }

  protected onFromChange(code: string): void {
    this.from = code;
    this.fromSignal.set(code);
    if (this.to === code) {
      this.to = this.pickAlternativeAirport(code);
      this.toSignal.set(this.to);
    }
  }

  protected onToChange(code: string): void {
    this.to = code;
    this.toSignal.set(code);
  }

  protected togglePax(): void {
    this.closeAirportDropdown();
    this.paxOpen.set(!this.paxOpen());
  }

  protected closePax(): void {
    this.paxOpen.set(false);
  }

  protected changeCount(kind: keyof PassengerCounts, delta: number): void {
    if (kind === 'adults') {
      const next = this.adults() + delta;
      if (next < 1 || next > MAX_TOTAL) return;
      this.adults.set(next);
      if (this.infants() > MAX_INFANTS(next)) {
        this.infants.set(MAX_INFANTS(next));
      }
      return;
    }

    if (kind === 'children') {
      const next = this.children() + delta;
      if (next < 0 || this.total() + delta > MAX_TOTAL) return;
      this.children.set(next);
      return;
    }

    const next = this.infants() + delta;
    if (next < 0 || this.total() + delta > MAX_TOTAL || next > this.maxInfants()) return;
    this.infants.set(next);
  }

  protected swap(): void {
    const previousFrom = this.from;
    this.from = this.to;
    this.fromSignal.set(this.from);
    this.to = previousFrom;
    this.toSignal.set(this.to);
    this.swapRotated.update((v) => !v);
    this.closeAirportDropdown();
  }

  protected onDepartDateChange(value: string): void {
    this.departDate = value && value >= this.minDate ? value : this.minDate;
    if (this.returnDate && this.returnDate < this.departDate) {
      this.returnDate = this.departDate;
    }
  }

  protected onReturnDateChange(value: string): void {
    const minRet = this.departDate && this.departDate >= this.minDate ? this.departDate : this.minDate;
    this.returnDate = value && value >= minRet ? value : minRet;
  }

  protected submit(): void {
    const safeDepart =
      this.departDate && this.departDate >= this.minDate ? this.departDate : this.minDate;
    const safeReturn =
      this.tripType() === 'round'
        ? this.returnDate && this.returnDate >= safeDepart
          ? this.returnDate
          : safeDepart
        : '';
    this.departDate = safeDepart;
    if (this.tripType() === 'round') {
      this.returnDate = safeReturn;
    }
    this.searched.emit({
      tripType: this.tripType(),
      from: this.from,
      to: this.to,
      departDate: safeDepart,
      returnDate: safeReturn,
      passengers: {
        adults: this.adults(),
        children: this.children(),
        infants: this.infants(),
      },
    });
  }

  private filterAirports(list: AirportLite[], rawQuery: string): AirportLite[] {
    const q = normalizeVi(rawQuery);
    if (!q) return list;
    return list.filter((ap) => {
      const code = normalizeVi(ap.airport_code);
      const name = normalizeVi(ap.airport_name);
      const city = normalizeVi(ap.city?.city_name ?? '');
      return code.includes(q) || name.includes(q) || city.includes(q);
    });
  }

  private resolveRecent(pool: AirportLite[]): AirportLite[] {
    const codes = this.recentCodes();
    const result: AirportLite[] = [];
    for (const c of codes) {
      const found = pool.find((ap) => ap.airport_code === c);
      if (found) result.push(found);
    }
    return result;
  }

  private readRecentCodes(): string[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(RECENT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, 4) : [];
    } catch {
      return [];
    }
  }

  private pushRecentCode(code: string): void {
    const next = [code, ...this.recentCodes().filter((c) => c !== code)].slice(0, 4);
    this.recentCodes.set(next);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      }
    } catch {
      // Bỏ qua nếu môi trường chặn localStorage
    }
  }

  private pickAlternativeAirport(excluded: string): string {
    const alt = this.airports().find((ap) => ap.airport_code !== excluded);
    return alt ? alt.airport_code : excluded === 'HAN' ? 'SGN' : 'HAN';
  }
}
