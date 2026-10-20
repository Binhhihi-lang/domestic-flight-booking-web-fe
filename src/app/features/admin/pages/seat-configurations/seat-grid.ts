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
 *
 * Vì sao màu đi qua `[style]` chứ không qua class CSS: màu do ADMIN đặt trong
 * `seat_types.color_hex` là dữ liệu động, không phải tập hữu hạn — không sinh
 * được class cho từng giá trị.
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
  /**
   * Cột mà SAU ĐÓ là lối đi — "C" (3-3) hoặc "C,E" (3-2-2). `null` = không có.
   *
   * Vì sao nhận từ ngoài thay vì tự suy: máy bay thân rộng có 2 lối đi, thân hẹp
   * có 1 — không suy được từ số cột. Cấu hình nằm ở `aircrafts.aisle_after`.
   */
  readonly aisleAfter = input<string | null>(null);

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

  /** Tập cột mà sau đó có lối đi, ví dụ {'C'} hoặc {'C','E'}. */
  private readonly aisleColumns = computed(() => {
    const raw = this.aisleAfter();
    if (!raw) {
      return new Set<string>();
    }
    return new Set(
      raw
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0),
    );
  });

  /** Cột này có lối đi ngay sau nó không. */
  protected hasAisleAfter(column: string): boolean {
    return this.aisleColumns().has(column);
  }

  /**
   * Tra cứu nhanh theo id — tránh `find()` trong vòng lặp lồng.
   * Với 300 ghế × 300 ô, `find()` mỗi ô là ~90.000 phép so sánh mỗi lần render.
   */
  private readonly seatTypeById = computed(() => {
    const map = new Map<number, SeatType>();
    for (const t of this.seatTypes()) {
      map.set(t.id, t);
    }
    return map;
  });

  /** Bản đồ (hàng, cột) → ghế — cùng lý do với `seatTypeById`. */
  private readonly seatByKey = computed(() => {
    const map = new Map<string, AircraftSeat>();
    for (const s of this.seats()) {
      map.set(`${s.seat_row}-${s.seat_column}`, s);
    }
    return map;
  });

  /** Ghế tại (hàng, cột); `null` nếu hàng đó khuyết ô này. */
  protected seatAt(row: number, column: string): AircraftSeat | null {
    return this.seatByKey().get(`${row}-${column}`) ?? null;
  }

  /** Mã loại ghế để hiện trong ô, ví dụ "ECO". */
  protected typeCode(seatTypeId: number): string {
    return this.seatTypeById().get(seatTypeId)?.seat_type_code ?? '?';
  }

  /** Tên loại ghế cho aria-label — đọc lên mới hiểu, khác mã thô. */
  protected typeName(seatTypeId: number): string {
    return this.seatTypeById().get(seatTypeId)?.seat_type_name ?? 'Không rõ loại ghế';
  }

  /** Màu nền: ưu tiên `color_hex`, fallback theo `seat_class`. */
  protected cellBackground(seat: AircraftSeat): string {
    const type = this.seatTypeById().get(seat.seat_type_id);
    if (type?.color_hex) {
      return type.color_hex;
    }
    return this.fallbackColor(type?.seat_class ?? 'ECONOMY');
  }

  /** Màu chữ theo độ tương phản WCAG 2.1 — nền sáng thì chữ tối. */
  protected cellTextColor(seat: AircraftSeat): string {
    const bg = this.cellBackground(seat);
    // `var(--...)` không parse được thành hex → đó là các token màu đậm của
    // design system (accent/danger), chữ trắng mới đọc được.
    if (!bg.startsWith('#')) {
      return '#fff';
    }
    return contrastRatio(bg, '#ffffff') >= 4.5 ? '#fff' : '#111';
  }

  /** Màu mặc định theo hạng — dùng cho lưới và legend khi `color_hex` null. */
  protected fallbackColor(seatClass: SeatType['seat_class']): string {
    switch (seatClass) {
      case 'BUSINESS':
        return 'var(--color-accent)';
      case 'FIRST':
        return 'var(--color-danger)';
      default:
        return 'var(--color-primary-bright)';
    }
  }

  /** Chú thích màu — chỉ loại ghế CÓ MẶT trong sơ đồ đang xem. */
  protected readonly legendItems = computed(() => {
    const usedIds = new Set(this.seats().map((s) => s.seat_type_id));
    return [...usedIds]
      .map((id) => this.seatTypeById().get(id))
      .filter((t): t is SeatType => t !== undefined)
      .sort((a, b) => a.seat_type_code.localeCompare(b.seat_type_code));
  });

  protected onCell(seat: AircraftSeat): void {
    this.cellClicked.emit({
      row: seat.seat_row,
      column: seat.seat_column,
      seatTypeId: seat.seat_type_id,
    });
  }
}

/** Kênh màu [0..255] → độ sáng tuyến tính sRGB (WCAG 2.1). */
function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Độ sáng tương đối của màu hex `#RRGGBB` hoặc `#RGB`. */
export function relativeLuminance(hex: string): number {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) {
    return 0; // màu CSS khác (var(...)) → coi như tối
  }
  const raw = m[1];
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

/** Tỉ lệ tương phản giữa hai màu hex (WCAG 2.1). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}
