import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import {
  ActionRequiredItem,
  FlightOperationItem,
  OperationalDashboard,
  OverviewDashboard,
} from '@core/models/dashboard.model';
import { AuthService } from '@core/services/auth.service';
import { DashboardService } from '@core/services/dashboard.service';
import { PageHeader } from '@shared/components/page-header/page-header';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { CountUpDirective, CountUpFormat } from '@shared/ui/count-up/count-up.directive';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

interface StatCard {
  label: string;
  value: string;
  numericValue: number;
  format: CountUpFormat;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
  delta: string;
  deltaIcon: string;
  deltaTone: 'up' | 'down';
}

interface BarItem {
  date: string;
  label: string;
  value: string;
  fullValue: string;
  bookingsCount: number;
  height: number;
}

const OP_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Đúng giờ', tone: 'info' },
  BOARDING: { label: 'Đang lên tàu', tone: 'warning' },
  DELAYED: { label: 'Chậm chuyến', tone: 'warning' },
  DEPARTED: { label: 'Đã cất cánh', tone: 'info' },
  ARRIVED: { label: 'Đã hạ cánh', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

const BOOKING_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  CONFIRMED: { label: 'Đã xác nhận', tone: 'success' },
  PENDING_PAYMENT: { label: 'Chờ thanh toán', tone: 'warning' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
};

/**
 * Dashboard tổng quan (ADMIN) & vận hành ca trực (STAFF).
 * - ADMIN: 4 KPI (Doanh thu hôm nay, Đơn hôm nay, Hành khách hôm nay, Tỷ lệ lấp đầy),
 *   biểu đồ Doanh thu 7 ngày toàn chiều rộng, lưới 2 cột Top tuyến bay & Đơn gần đây.
 * - STAFF: tuyệt đối không hiển thị doanh thu; gồm 4 KPI ca trực, bảng Chuyến cần xử lý
 *   và bảng Booking chờ xác nhận (`pending_actions`).
 */
@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, PageHeader, AppButton, AppCard, StatusBadge, CountUpDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly dashboardService = inject(DashboardService);

  protected readonly loading = signal(true);
  protected readonly overview = signal<OverviewDashboard | null>(null);
  protected readonly operational = signal<OperationalDashboard | null>(null);

  protected readonly isAdmin = computed(() => this.authService.isAdmin());

  protected readonly stats = computed<StatCard[]>(() => {
    if (this.isAdmin()) {
      const ov = this.overview();
      if (!ov) return [];
      return [
        {
          label: 'Doanh thu hôm nay',
          value: this.formatVnd(ov.revenue_today),
          numericValue: ov.revenue_today,
          format: 'vnd',
          icon: 'payments',
          tone: 'success',
          delta: `Tháng này: ${this.formatCompactVnd(ov.revenue_month)}`,
          deltaIcon: 'trending_up',
          deltaTone: 'up',
        },
        {
          label: 'Đơn hôm nay',
          value: ov.bookings_today.toLocaleString('vi-VN'),
          numericValue: ov.bookings_today,
          format: 'number',
          icon: 'confirmation_number',
          tone: 'primary',
          delta: `Tháng này: ${ov.bookings_month.toLocaleString('vi-VN')} đơn`,
          deltaIcon: 'trending_up',
          deltaTone: 'up',
        },
        {
          label: 'Hành khách hôm nay',
          value: ov.pax_today.toLocaleString('vi-VN'),
          numericValue: ov.pax_today,
          format: 'number',
          icon: 'groups',
          tone: 'warning',
          delta: `Tháng này: ${ov.pax_month.toLocaleString('vi-VN')} lượt khách`,
          deltaIcon: 'groups',
          deltaTone: 'up',
        },
        {
          label: 'Tỷ lệ lấp đầy',
          value: `${ov.occupancy_rate_percent.toFixed(1)}%`,
          numericValue: ov.occupancy_rate_percent,
          format: 'percent',
          icon: 'event_seat',
          tone: 'danger',
          delta: `Tỷ lệ hủy vé: ${ov.cancel_rate_percent.toFixed(1)}%`,
          deltaIcon: 'info',
          deltaTone: ov.cancel_rate_percent > 10 ? 'down' : 'up',
        },
      ];
    }

    const op = this.operational();
    if (!op) return [];
    return [
      {
        label: 'Chuyến bay hôm nay',
        value: op.flights_today.toLocaleString('vi-VN'),
        numericValue: op.flights_today,
        format: 'number',
        icon: 'flight',
        tone: 'primary',
        delta: `${op.flights_scheduled} đúng giờ · ${op.flights_boarding} đang lên tàu`,
        deltaIcon: 'schedule',
        deltaTone: 'up',
      },
      {
        label: 'Đặt chỗ hôm nay',
        value: op.bookings_today.toLocaleString('vi-VN'),
        numericValue: op.bookings_today,
        format: 'number',
        icon: 'confirmation_number',
        tone: 'success',
        delta: `${op.bookings_confirmed_today} đã xác nhận`,
        deltaIcon: 'check_circle',
        deltaTone: 'up',
      },
      {
        label: 'Chờ thanh toán',
        value: op.bookings_pending_payment.toLocaleString('vi-VN'),
        numericValue: op.bookings_pending_payment,
        format: 'number',
        icon: 'hourglass_top',
        tone: 'warning',
        delta: `${op.passengers_today.toLocaleString('vi-VN')} hành khách hôm nay`,
        deltaIcon: 'groups',
        deltaTone: 'up',
      },
      {
        label: 'Chuyến trễ / hủy',
        value: String(op.flights_delayed + op.flights_cancelled),
        numericValue: op.flights_delayed + op.flights_cancelled,
        format: 'number',
        icon: 'warning',
        tone: 'danger',
        delta: `${op.flights_delayed} chậm · ${op.flights_cancelled} hủy`,
        deltaIcon: 'warning',
        deltaTone: 'down',
      },
    ];
  });

  protected readonly revenueBars = computed<BarItem[]>(() => {
    const items = this.overview()?.revenue_by_day ?? [];
    const maxRev = Math.max(1, ...items.map((i) => i.revenue));
    return items.map((i) => ({
      date: i.date,
      label: i.day_label,
      value: this.formatCompactVnd(i.revenue),
      fullValue: this.formatVnd(i.revenue),
      bookingsCount: i.bookings_count,
      height: Math.max(10, Math.round((i.revenue / maxRev) * 100)),
    }));
  });

  protected readonly scheduleFlights = computed<FlightOperationItem[]>(
    () => this.operational()?.today_schedule ?? [],
  );

  protected readonly pendingActions = computed<ActionRequiredItem[]>(
    () => this.operational()?.pending_actions ?? [],
  );

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    if (this.isAdmin()) {
      this.dashboardService
        .getOverview(7)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.data) {
            this.overview.set(res.data);
          }
          this.loading.set(false);
        });
      return;
    }

    this.dashboardService
      .getOperational()
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.operational.set(res.data);
        }
        this.loading.set(false);
      });
  }

  protected exportCsv(): void {
    const data = this.overview();
    if (!data || typeof document === 'undefined') return;
    const header = 'Ngay,SoDonDatCho,DoanhThuVND\n';
    const rows = data.revenue_by_day
      .map((d) => `${d.date},${d.bookings_count},${Math.round(d.revenue)}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vinafly-dashboard-7-ngay.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  protected fillRateOf(f: FlightOperationItem): string {
    if (!f.seat_capacity) return '0%';
    const used = f.booked_seats + f.held_seats;
    return `${((used / f.seat_capacity) * 100).toFixed(1)}%`;
  }

  protected fillToneOf(f: FlightOperationItem): BadgeTone {
    const ratio = f.seat_capacity ? (f.booked_seats + f.held_seats) / f.seat_capacity : 0;
    if (ratio >= 0.9) return 'danger';
    if (ratio >= 0.75) return 'warning';
    return 'success';
  }

  protected opStatusMeta(status: string): { label: string; tone: BadgeTone } {
    return OP_STATUS_META[status] ?? { label: status, tone: 'neutral' };
  }

  protected bookingStatusMeta(status: string): { label: string; tone: BadgeTone } {
    return BOOKING_STATUS_META[status] ?? { label: status, tone: 'neutral' };
  }

  protected bookingLinkOf(action: ActionRequiredItem): string[] {
    const match = action.reference_code?.match(/(\d+)/);
    if (action.type.toUpperCase().includes('BOOKING') && match) {
      return ['/admin/bookings', match[1]];
    }
    return ['/admin/bookings'];
  }

  protected formatDateTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatVnd(amount: number): string {
    return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
  }

  protected formatCompactVnd(amount: number): string {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1).replace('.', ',')} tr`;
    }
    return this.formatVnd(amount);
  }
}
