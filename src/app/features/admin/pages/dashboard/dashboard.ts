import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '@shared/components/page-header/page-header';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { StatusBadge, BadgeTone } from '@shared/ui/status-badge/status-badge';

interface StatCard {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
  delta: string;
  deltaIcon: string;
  deltaTone: 'up' | 'down';
}

interface Bar {
  label: string;
  value: string;
  height: number;
}

interface RouteRank {
  code: string;
  name: string;
  bookings: string;
}

interface AttentionFlight {
  code: string;
  route: string;
  depart: string;
  freeSeats: number;
  totalSeats: number;
  fillRate: string;
  fillTone: BadgeTone;
  statusLabel: string;
  statusTone: BadgeTone;
  action: string;
}

/**
 * Dashboard vận hành — bám mockup P9.
 *
 * Vì sao bố cục này: người trực vận hành cần trả lời ba câu trong 5 giây —
 * hôm nay thế nào (thẻ số liệu), xu hướng ra sao (biểu đồ cột), và việc gì
 * cần xử lý ngay (bảng chuyến sắp hết ghế). Ba khối xếp theo đúng thứ tự đó.
 *
 * Số liệu tĩnh: DASHBOARD_READ_OPERATIONAL (STAFF) và DASHBOARD_READ (ADMIN)
 * thuộc Phase 3. Biểu đồ dựng bằng div — đủ cho 7 cột và tránh thêm thư viện
 * biểu đồ chỉ để vẽ cột.
 */
@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PageHeader, AppButton, AppCard, StatusBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard {
  protected readonly stats: StatCard[] = [
    {
      label: 'Booking hôm nay',
      value: '1.284',
      icon: 'confirmation_number',
      tone: 'primary',
      delta: '+12,4% so với hôm qua',
      deltaIcon: 'trending_up',
      deltaTone: 'up',
    },
    {
      label: 'Doanh thu hôm nay',
      value: '1,42',
      unit: ' tỷ',
      icon: 'payments',
      tone: 'success',
      delta: '+8,1% so với hôm qua',
      deltaIcon: 'trending_up',
      deltaTone: 'up',
    },
    {
      label: 'Chuyến đang mở bán',
      value: '248',
      icon: 'flight',
      tone: 'warning',
      delta: '−3 chuyến so với hôm qua',
      deltaIcon: 'trending_down',
      deltaTone: 'down',
    },
    {
      label: 'Chuyến sắp hết ghế',
      value: '17',
      icon: 'event_seat',
      tone: 'danger',
      delta: 'Cần mở chuyến bổ sung',
      deltaIcon: 'warning',
      deltaTone: 'down',
    },
  ];

  protected readonly bars: Bar[] = [
    { label: '05/11', value: '986', height: 58 },
    { label: '06/11', value: '1.102', height: 66 },
    { label: '07/11', value: '1.340', height: 80 },
    { label: '08/11', value: '1.188', height: 71 },
    { label: '09/11', value: '1.512', height: 90 },
    { label: '10/11', value: '1.672', height: 100 },
    { label: '11/11', value: '1.284', height: 77 },
  ];

  protected readonly ranks: RouteRank[] = [
    { code: 'HAN → SGN', name: 'Hà Nội – TP.HCM', bookings: '412' },
    { code: 'HAN → DAD', name: 'Hà Nội – Đà Nẵng', bookings: '286' },
    { code: 'SGN → DAD', name: 'TP.HCM – Đà Nẵng', bookings: '198' },
    { code: 'HAN → PQC', name: 'Hà Nội – Phú Quốc', bookings: '154' },
    { code: 'SGN → CXR', name: 'TP.HCM – Nha Trang', bookings: '121' },
  ];

  protected readonly attention: AttentionFlight[] = [
    {
      code: 'VN 165',
      route: 'HAN → DAD',
      depart: '15/11 · 06:15',
      freeSeats: 4,
      totalSeats: 180,
      fillRate: '97,8%',
      fillTone: 'danger',
      statusLabel: 'Sắp hết',
      statusTone: 'warning',
      action: 'Mở chuyến bổ sung',
    },
    {
      code: 'VJ 507',
      route: 'HAN → DAD',
      depart: '15/11 · 07:20',
      freeSeats: 2,
      totalSeats: 180,
      fillRate: '98,9%',
      fillTone: 'danger',
      statusLabel: 'Gần đầy',
      statusTone: 'danger',
      action: 'Mở chuyến bổ sung',
    },
    {
      code: 'QH 205',
      route: 'HAN → DAD',
      depart: '15/11 · 13:05',
      freeSeats: 28,
      totalSeats: 180,
      fillRate: '84,4%',
      fillTone: 'warning',
      statusLabel: 'Sắp hết',
      statusTone: 'warning',
      action: 'Xem',
    },
    {
      code: 'VN 173',
      route: 'HAN → DAD',
      depart: '15/11 · 18:30',
      freeSeats: 96,
      totalSeats: 274,
      fillRate: '65,0%',
      fillTone: 'success',
      statusLabel: 'Bình thường',
      statusTone: 'success',
      action: 'Xem',
    },
  ];
}
