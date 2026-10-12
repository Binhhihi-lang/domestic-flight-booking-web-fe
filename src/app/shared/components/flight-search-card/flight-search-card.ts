import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export type TripType = 'round' | 'oneway';

export interface FlightSearchValue {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate: string;
}

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
    });
  }
}
