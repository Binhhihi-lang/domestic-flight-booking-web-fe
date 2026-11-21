import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import {
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
import { StatusBadge, BadgeTone } from '@shared/ui/status-badge/status-badge';

interface StatCard {
  label: string;
  value: string;
  numericValue: number;
  format: CountUpFormat;
  unit?: string;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'danger';
  delta: string;
  deltaIcon: string;
  deltaTone: 'up' | 'down';
}

interface BarItem {
  label: string;
  value: string;
  height: number;
}

/**
 * Dashboard vận hành & tổng quan — kết nối API thật (`GET /api/admin/dashboard` cho ADMIN,
 * `GET /api/admin/dashboard/operational` cho STAFF — tuyệt đối không hiện doanh thu cho STAFF).
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
  protected readonly selectedDays = signal<7 | 30>(7);

  protected readonly isAdmin = computed(() => this.authService.isAdmin());

  protected readonly stats = computed<StatCard[]>(() => {
    if (this.isAdmin()) {
      const ov = this.overview();
      if (!ov) return [];
      return [
        {
          label: 'Booking hôm nay',
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
          label: 'Doanh thu hôm nay',
          value: this.formatCompactVnd(ov.revenue_today),
          numericValue: ov.revenue_today,
          format: 'compact-vnd',
          icon: 'payments',
          tone: 'success',
          delta: `Tháng này: ${this.formatCompactVnd(ov.revenue_month)}`,
          deltaIcon: 'trending_up',
          deltaTone: 'up',
        },
        {
          label: 'Chuyến bay hôm nay',
          value: ov.flights_today.toLocaleString('vi-VN'),
          numericValue: ov.flights_today,
          format: 'number',
          icon: 'flight',
          tone: 'warning',
          delta: `${ov.flights_delayed_today} chuyến trễ giờ`,
          deltaIcon: ov.flights_delayed_today > 0 ? 'warning' : 'check_circle',
          deltaTone: ov.flights_delayed_today > 0 ? 'down' : 'up',
        },
        {
          label: 'Hệ số lấp đầy',
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
        label: 'Đang chờ thanh toán',
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
        delta: `${op.flights_delayed} trễ · ${op.flights_cancelled} hủy`,
        deltaIcon: 'warning',
        deltaTone: 'down',
      },
    ];
  });

  protected readonly bars = computed<BarItem[]>(() => {
    const items = this.overview()?.revenue_by_day ?? [];
    const maxBookings = Math.max(1, ...items.map((i) => i.bookings_count));
    return items.map((i) => ({
      label: i.day_label,
      value: i.bookings_count.toLocaleString('vi-VN'),
      height: Math.max(12, Math.round((i.bookings_count / maxBookings) * 100)),
    }));
  });

  protected readonly scheduleFlights = computed<FlightOperationItem[]>(
    () => this.operational()?.today_schedule ?? [],
  );

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected switchRange(days: 7 | 30): void {
    if (this.selectedDays() === days) return;
    this.selectedDays.set(days);
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    if (this.isAdmin()) {
      this.dashboardService
        .getOverview(this.selectedDays())
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (res?.data) {
            this.overview.set(res.data);
          }
          this.loading.set(false);
        });
    }

    this.dashboardService
      .getOperational()
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.operational.set(res.data);
        }
        if (!this.isAdmin()) {
          this.loading.set(false);
        }
      });
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

  protected opStatusTone(status: string): BadgeTone {
    if (status === 'CANCELLED') return 'danger';
    if (status === 'DELAYED') return 'warning';
    if (status === 'BOARDING') return 'info';
    return 'success';
  }

  protected formatVnd(amount: number): string {
    return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
  }

  private formatCompactVnd(amount: number): string {
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
    }
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1).replace('.', ',')} tr`;
    }
    return this.formatVnd(amount);
  }
}
