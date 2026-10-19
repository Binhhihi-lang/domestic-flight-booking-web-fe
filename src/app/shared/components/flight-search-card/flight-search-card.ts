import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export type TripType = 'round' | 'oneway';

/** Ba loại hành khách — DB v0.4 `passengers.passenger_type` (ADULT/CHILD/INFANT). */
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

/**
 * Giới hạn hành khách.
 *
 * `MAX_TOTAL = 9`: mỗi hành khách chiếm một ghế (trừ em bé ngồi cùng người lớn),
 * và hầu hết máy bay nội địa có 9 ghế một hàng — đặt quá 9 người thường phải
 * tách booking. Đây là giới hạn thực tế của ngành, không phải con số tuỳ ý.
 *
 * `MAX_INFANTS = adults`: mỗi em bé (<2 tuổi) phải ngồi cùng một người lớn. Cho
 * phép 1 người lớn + 2 em bé là dữ liệu sai ngay từ lúc tìm kiếm.
 */
const MAX_TOTAL = 9;
const MAX_INFANTS = (adults: number) => adults;

/**
 * Widget tìm chuyến bay — bám mockup P1 (.searchbar / .trip / .searchform).
 *
 * Vì sao tách riêng khỏi trang chủ: đây là "visual focus" của Public Website
 * (tài liệu UI mục 10) và còn xuất hiện lại ở trang kết quả khi bấm "Sửa tìm
 * kiếm". Tách ra thì chỉ có một chỗ để sửa hành vi.
 *
 * Chưa gọi API: Flight Search thuộc Phase 2. Component phát sự kiện `searched`
 * để trang cha quyết định điều hướng, nhờ vậy khi có API thật chỉ đổi ở cha.
 */
@Component({
  selector: 'app-flight-search-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  templateUrl: './flight-search-card.html',
  styleUrl: './flight-search-card.css',
})
export class FlightSearchCard {
  readonly searched = output<FlightSearchValue>();

  protected readonly tripType = signal<TripType>('round');
  protected from = '';
  protected to = '';
  protected departDate = '';
  protected returnDate = '';

  protected readonly adults = signal(1);
  protected readonly children = signal(0);
  protected readonly infants = signal(0);

  /** Popup chọn hành khách đang mở hay không. */
  protected readonly paxOpen = signal(false);

  protected readonly maxTotal = MAX_TOTAL;

  protected readonly total = computed(() => this.adults() + this.children() + this.infants());

  /** Em bé tối đa bằng số người lớn — mỗi em phải ngồi cùng một người lớn. */
  protected readonly maxInfants = computed(() => MAX_INFANTS(this.adults()));

  protected readonly canAddAdult = computed(() => this.total() < MAX_TOTAL);
  protected readonly canAddChild = computed(() => this.total() < MAX_TOTAL);
  protected readonly canAddInfant = computed(
    () => this.total() < MAX_TOTAL && this.infants() < this.maxInfants(),
  );

  protected readonly canRemoveAdult = computed(() => this.adults() > 1);
  protected readonly canRemoveChild = computed(() => this.children() > 0);
  protected readonly canRemoveInfant = computed(() => this.infants() > 0);

  /** Nhãn hiện trên nút, ví dụ "2 người lớn, 1 em bé". */
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

  protected togglePax(): void {
    this.paxOpen.set(!this.paxOpen());
  }

  protected closePax(): void {
    this.paxOpen.set(false);
  }

  /**
   * Đổi số lượng một loại hành khách.
   *
   * Chặn ở đây chứ không chỉ ở template: template ẩn/disable nút, nhưng logic
   * giới hạn nằm một chỗ thì không lệch khi thêm cách nhập khác (bàn phím, paste).
   */
  protected changeCount(kind: keyof PassengerCounts, delta: number): void {
    if (kind === 'adults') {
      const next = this.adults() + delta;
      if (next < 1 || next > MAX_TOTAL) return;
      this.adults.set(next);
      // Giảm người lớn có thể làm số em bé vượt trần — cắt bớt cho hợp lệ.
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
      departDate: this.departDate,
      returnDate: this.tripType() === 'round' ? this.returnDate : '',
      passengers: {
        adults: this.adults(),
        children: this.children(),
        infants: this.infants(),
      },
    });
  }
}
