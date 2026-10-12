import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

interface FlightRow {
  /** Khoá duy nhất cho @for — mã hãng KHÔNG duy nhất (nhiều chuyến cùng hãng). */
  id: string;
  code: string;
  airline: string;
  aircraft: string;
  airlineColor: string;
  departTime: string;
  departAirport: string;
  arriveTime: string;
  arriveAirport: string;
  duration: string;
  price: string;
  oldPrice: string | null;
  priceTone: 'primary' | 'accent' | 'subtle';
  badge: { tone: 'success' | 'warning' | 'danger' | 'neutral'; label: string } | null;
  soldOut: boolean;
  perks: { text: string; available: boolean }[];
}

interface FilterOption {
  label: string;
  count: string;
  checked: boolean;
}

/**
 * Kết quả tìm chuyến — bám mockup P2, màn dày dữ liệu nhất của Public Website.
 *
 * Vì sao bố cục hai cột bộ lọc + danh sách: người đặt vé luôn muốn thu hẹp
 * theo hãng và giờ bay trước khi so giá. Bộ lọc nằm cạnh danh sách (không phải
 * trong ngăn kéo) để đổi lựa chọn là thấy kết quả ngay.
 *
 * Phạm vi hiện tại chỉ bán vé BAY THẲNG (chủ dự án chốt) — nên không có bộ lọc
 * điểm dừng, và mọi hàng chuyến đều hiển thị "Bay thẳng".
 *
 * Dữ liệu tĩnh: Flight Search thuộc Phase 2. Khi có API, chỉ thay nguồn dữ
 * liệu — phần bố cục và các trạng thái đã dựng đủ ở đây.
 */
@Component({
  selector: 'app-flight-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, StatusBadge],
  templateUrl: './flight-results.html',
  styleUrl: './flight-results.css',
})
export class FlightResults {
  protected readonly activeSort = signal('Rẻ nhất');
  protected readonly sorts = ['Rẻ nhất', 'Nhanh nhất', 'Sớm nhất', 'Muộn nhất'];

  protected readonly airlineFilters: FilterOption[] = [
    { label: 'Vietnam Airlines', count: '8', checked: true },
    { label: 'Vietjet Air', count: '7', checked: true },
    { label: 'Bamboo Airways', count: '5', checked: false },
    { label: 'Vietravel Airlines', count: '4', checked: false },
  ];

  protected readonly timeFilters: FilterOption[] = [
    { label: 'Sáng sớm (00:00–05:59)', count: '3', checked: false },
    { label: 'Sáng (06:00–11:59)', count: '9', checked: true },
    { label: 'Chiều (12:00–17:59)', count: '8', checked: true },
    { label: 'Tối (18:00–23:59)', count: '4', checked: false },
  ];

  protected readonly flights: FlightRow[] = [
    {
      code: 'VN',
      id: 'VN165',
      airline: 'Vietnam Airlines',
      aircraft: 'VN 165 · Airbus A321',
      airlineColor: '#0b4fa8',
      departTime: '06:15',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '07:40',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 25m',
      price: '890.000',
      oldPrice: null,
      priceTone: 'primary',
      badge: { tone: 'warning', label: 'Còn 4 ghế' },
      soldOut: false,
      perks: [
        { text: '23kg ký gửi', available: true },
        { text: '7kg xách tay', available: true },
        { text: 'Hoàn vé trước 24h', available: true },
        { text: 'Đổi ngày', available: true },
      ],
    },
    {
      code: 'VJ',
      id: 'VJ507',
      airline: 'Vietjet Air',
      aircraft: 'VJ 507 · Airbus A320',
      airlineColor: '#ed1b24',
      departTime: '07:20',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '08:50',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 30m',
      price: '760.000',
      oldPrice: '890.000',
      priceTone: 'accent',
      badge: null,
      soldOut: false,
      perks: [
        { text: '20kg ký gửi', available: true },
        { text: '7kg xách tay', available: true },
        { text: 'Không hoàn vé', available: false },
      ],
    },
    {
      code: 'QH',
      id: 'QH205',
      airline: 'Bamboo Airways',
      aircraft: 'QH 205 · Airbus A321',
      airlineColor: '#0f8a4d',
      departTime: '13:05',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '17:40',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '4h 35m',
      price: '1.050.000',
      oldPrice: null,
      priceTone: 'primary',
      badge: null,
      soldOut: false,
      perks: [
        { text: '20kg ký gửi', available: true },
        { text: 'Suất ăn nóng', available: true },
        { text: 'Hoàn vé trước 48h', available: true },
      ],
    },
    {
      code: 'VN',
      id: 'VN173',
      airline: 'Vietnam Airlines',
      aircraft: 'VN 173 · Boeing 787-9',
      airlineColor: '#0b4fa8',
      departTime: '18:30',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '19:55',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 25m',
      price: '1.240.000',
      oldPrice: null,
      priceTone: 'primary',
      badge: { tone: 'success', label: 'Còn nhiều ghế' },
      soldOut: false,
      perks: [
        { text: '23kg ký gửi', available: true },
        { text: 'Suất ăn nóng', available: true },
        { text: 'Hoàn vé trước 24h', available: true },
        { text: 'Đổi ngày', available: true },
      ],
    },
    {
      code: 'VU',
      id: 'VU305',
      airline: 'Vietravel Airlines',
      aircraft: 'VU 305 · Airbus A321',
      airlineColor: '#6b7f96',
      departTime: '21:10',
      departAirport: 'Nội Bài (HAN)',
      arriveTime: '22:40',
      arriveAirport: 'Đà Nẵng (DAD)',
      duration: '1h 30m',
      price: '1.180.000',
      oldPrice: null,
      priceTone: 'subtle',
      badge: { tone: 'danger', label: 'Hết chỗ' },
      soldOut: true,
      perks: [],
    },
  ];

  protected clearFilters(): void {
    this.airlineFilters.forEach((f) => (f.checked = false));
    this.timeFilters.forEach((f) => (f.checked = false));
  }
}
