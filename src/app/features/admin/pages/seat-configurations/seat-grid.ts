import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AircraftSeat, SeatType } from '@core/models/fleet-news.model';

/** Một ô trong lưới xem trước. */
export interface GridCell {
  row: number;
  column: string;
  seatTypeId: number;
}

/**
 * Lưới xem trước sơ đồ ghế — chỉ hiển thị và báo ô được bấm.
 *
 * Vì sao tách khỏi màn cấu hình: màn đó đã lo phần khai báo theo khối, đếm ghế
 * và gọi API. Lưới chỉ có một việc là vẽ và bắt sự kiện, nên tách ra thì mỗi
 * file giữ được một trách nhiệm và dễ đọc hơn.
 *
 * Vì sao lưới dựng từ `seats` chứ không vẽ theo `rows × cols` cố định: sơ đồ
 * thật không phải hình chữ nhật — hàng thương gia 2-2, hàng phổ thông 3-3, có
 * hàng khuyết. Nên phải vẽ theo đúng danh sách ghế đang có.
 */
@Component({
  selector: 'app-seat-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seat-grid.html',
  styleUrl: './seat-grid.css',
})
export class SeatGrid {
  readonly seats = input.required<AircraftSeat[]>();
  readonly seatTypes = input.required<SeatType[]>();

  /** Bấm một ô để mở bảng đổi loại ghế cho riêng ô đó. */
  readonly cellClicked = output<GridCell>();

  /** Các hàng có ghế, sắp tăng dần — dùng làm nhãn trục dọc. */
  protected readonly rows = computed(() => {
    const set = new Set(this.seats().map((s) => s.seat_row));
    return [...set].sort((a, b) => a - b);
  });

  /** Các cột có ghế, sắp theo alphabet — dùng làm nhãn trục ngang. */
  protected readonly columns = computed(() => {
    const set = new Set(this.seats().map((s) => s.seat_column));
    return [...set].sort();
  });

  /** Ghế tại (hàng, cột); `null` nếu hàng đó khuyết ô này. */
  protected seatAt(row: number, column: string): AircraftSeat | null {
    return this.seats().find((s) => s.seat_row === row && s.seat_column === column) ?? null;
  }

  /** Mã loại ghế để hiện trong ô, ví dụ "ECO" — tra từ `seat_type_id`. */
  protected typeCode(seatTypeId: number): string {
    return this.seatTypes().find((t) => t.id === seatTypeId)?.seat_type_code ?? '?';
  }

  /** Lớp CSS theo hạng ghế — màu ô phản ánh ECONOMY/BUSINESS/FIRST. */
  protected classOf(seat: AircraftSeat): string {
    const cls = this.seatTypes().find((t) => t.id === seat.seat_type_id)?.seat_class ?? 'ECONOMY';
    return `cell cell--${cls.toLowerCase()}`;
  }

  protected onCell(seat: AircraftSeat): void {
    this.cellClicked.emit({
      row: seat.seat_row,
      column: seat.seat_column,
      seatTypeId: seat.seat_type_id,
    });
  }
}
