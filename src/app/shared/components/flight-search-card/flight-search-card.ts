import {
  ChangeDetectionStrategy,
  Component,
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

const FALLBACK_AIRPORTS: Pick<Airport, 'id' | 'airport_code' | 'airport_name' | 'city'>[] = [
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

const MAX_TOTAL = 9;
const MAX_INFANTS = (adults: number) => adults;

function offsetLocalDate(daysFromToday: number): string {
  const d = new Date(Date.now() + daysFromToday * 86_400_000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Widget tìm chuyến bay — bám mockup P1 (.searchbar / .trip / .searchform).
 * Chọn sân bay nội địa từ danh sách chuẩn (/api/public/airports), độ tuổi hành khách
 * đúng quyết định D2=A (Người lớn >= 12 · Trẻ em 2–11 · Em bé < 2).
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

  readonly initialTripType = input<TripType>('oneway');
  readonly initialFrom = input<string>('HAN');
  readonly initialTo = input<string>('SGN');
  readonly initialDepartDate = input<string>('');
  readonly initialReturnDate = input<string>('');
  readonly initialAdults = input<number>(1);
  readonly initialChildren = input<number>(0);
  readonly initialInfants = input<number>(0);

  readonly searched = output<FlightSearchValue>();

  protected readonly airports = signal(FALLBACK_AIRPORTS);
  protected readonly tripType = signal<TripType>('oneway');
  protected from = 'HAN';
  protected to = 'SGN';
  protected departDate = offsetLocalDate(1);
  protected returnDate = offsetLocalDate(4);

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

  ngOnInit(): void {
    this.tripType.set(this.initialTripType());
    if (this.initialFrom()) this.from = this.initialFrom();
    if (this.initialTo()) this.to = this.initialTo();
    if (this.initialDepartDate()) this.departDate = this.initialDepartDate();
    if (this.initialReturnDate()) this.returnDate = this.initialReturnDate();
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

  protected togglePax(): void {
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
    this.to = previousFrom;
  }

  protected submit(): void {
    this.searched.emit({
      tripType: this.tripType(),
      from: this.from,
      to: this.to,
      departDate: this.departDate || offsetLocalDate(1),
      returnDate: this.tripType() === 'round' ? (this.returnDate || offsetLocalDate(4)) : '',
      passengers: {
        adults: this.adults(),
        children: this.children(),
        infants: this.infants(),
      },
    });
  }
}
