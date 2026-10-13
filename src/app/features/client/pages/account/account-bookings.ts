import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StatusBadge, BadgeTone } from '@shared/ui/status-badge/status-badge';

interface Ticket {
  code: string;
  departTime: string;
  departPlace: string;
  arriveTime: string;
  arrivePlace: string;
  date: string;
  flight: string;
  passengers: string;
  seat: string;
  total: string;
  statusLabel: string;
  statusTone: BadgeTone;
  action: { label: string; variant: 'primary' | 'accent' | 'secondary' };
  note: string | null;
}

interface Voucher {
  value: string;
  unit: string;
  type: string;
  gradient: string;
  name: string;
  description: string;
  meta: string[];
  statusLabel: string;
  statusTone: BadgeTone;
  action: { label: string; disabled: boolean } | null;
  dimmed: boolean;
}

interface WalletTx {
  title: string;
  detail: string;
  amount: string;
  amountTone: 'up' | 'down';
  balance: string;
  icon: string;
  iconTone: 'success' | 'danger';
}

/**
 * Vé của tôi — bám mockup P11 (khuôn "Tài khoản khách").
 *
 * Vì sao gom ví + vé + voucher + lịch sử vào một trang: đây là thứ khách hàng
 * mở ra thường xuyên nhất và luôn muốn thấy cùng nhau — "chuyến tới của tôi,
 * còn voucher nào dùng được, ví còn bao nhiêu". Tách thành 4 trang riêng thì
 * mỗi lần kiểm tra phải đi 4 chỗ.
 *
 * Dữ liệu tĩnh: BOOKING_READ_SELF, VOUCHER_READ, WALLET_READ_SELF thuộc
 * Phase 1/3. Khi có API, thay nguồn dữ liệu, giữ nguyên bố cục và trạng thái.
 */
@Component({
  selector: 'app-account-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, StatusBadge],
  templateUrl: './account-bookings.html',
  styleUrl: './account-bookings.css',
})
export class AccountBookings {
  protected readonly tickets: Ticket[] = [
    {
      code: 'ABC123',
      departTime: '06:15',
      departPlace: 'Hà Nội (HAN)',
      arriveTime: '07:40',
      arrivePlace: 'Đà Nẵng (DAD)',
      date: 'Thứ Bảy, 15/11/2026',
      flight: 'VN 165 · Vietnam Airlines',
      passengers: '1 người lớn',
      seat: 'Ghế 12A',
      total: '890.000₫',
      statusLabel: 'Đã xác nhận',
      statusTone: 'success',
      action: { label: 'Xem vé điện tử', variant: 'primary' },
      note: null,
    },
    {
      code: 'XYZ789',
      departTime: '18:30',
      departPlace: 'Hà Nội (HAN)',
      arriveTime: '19:55',
      arrivePlace: 'Đà Nẵng (DAD)',
      date: 'Chủ Nhật, 23/11/2026',
      flight: 'VN 173 · Vietnam Airlines',
      passengers: '2 người lớn, 1 trẻ em',
      seat: 'Chưa chọn ghế',
      total: '3.240.000₫',
      statusLabel: 'Chờ thanh toán',
      statusTone: 'warning',
      action: { label: 'Thanh toán ngay', variant: 'accent' },
      note: 'Còn 8 phút để hoàn tất',
    },
  ];

  protected readonly vouchers: Voucher[] = [
    {
      value: '50K',
      unit: '',
      type: 'giảm tiền',
      gradient: 'linear-gradient(150deg, var(--color-primary), var(--color-primary-bright))',
      name: 'Giảm 50.000₫ mùa hè',
      description:
        'Áp dụng mọi chuyến bay nội địa. Đơn tối thiểu 500.000₫. Không áp dụng cho hành khách em bé.',
      meta: ['HSD: 31/12/2026', 'Đơn tối thiểu 500.000₫', 'Một chiều & khứ hồi'],
      statusLabel: 'Khả dụng',
      statusTone: 'success',
      action: { label: 'Dùng ngay', disabled: false },
      dimmed: false,
    },
    {
      value: '10',
      unit: '%',
      type: 'giảm phần trăm',
      gradient: 'linear-gradient(150deg, #b8420a, #ff7a45)',
      name: 'Giảm 10% Vietnam Airlines',
      description: 'Chỉ áp dụng chuyến bay Vietnam Airlines. Trần giảm 200.000₫.',
      meta: ['HSD: 20/12/2026', 'Trần giảm 200.000₫', 'Chỉ hãng VN'],
      statusLabel: 'Đang giữ',
      statusTone: 'info',
      action: { label: 'Đang dùng', disabled: true },
      dimmed: false,
    },
    {
      value: '100K',
      unit: '',
      type: 'giảm tiền',
      gradient: 'linear-gradient(150deg, #6b7f96, #93a7be)',
      name: 'Giảm 100.000₫ Tết 2026',
      description: 'Đã dùng cho booking ABC100 ngày 02/10/2026.',
      meta: ['Đã dùng lúc 02/10/2026'],
      statusLabel: 'Đã dùng',
      statusTone: 'neutral',
      action: null,
      dimmed: true,
    },
  ];

  protected readonly walletHistory: WalletTx[] = [
    {
      title: 'Hoàn tiền hủy vé',
      detail: 'Booking ABC100 · 09/10/2026 14:22',
      amount: '+1.848.000₫',
      amountTone: 'up',
      balance: 'Số dư: 1.848.000₫',
      icon: 'south_west',
      iconTone: 'success',
    },
    {
      title: 'Thanh toán vé',
      detail: 'Booking ABC123 · 05/10/2026 09:41',
      amount: '−890.000₫',
      amountTone: 'down',
      balance: 'Số dư: 0₫',
      icon: 'north_east',
      iconTone: 'danger',
    },
    {
      title: 'Hoàn tiền hủy vé',
      detail: 'Booking ABC099 · 28/09/2026 16:05',
      amount: '+890.000₫',
      amountTone: 'up',
      balance: 'Số dư: 890.000₫',
      icon: 'south_west',
      iconTone: 'success',
    },
  ];
}
