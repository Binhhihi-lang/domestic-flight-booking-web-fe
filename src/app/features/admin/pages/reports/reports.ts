import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { OverviewDashboard } from '@core/models/dashboard.model';
import { AirlineService } from '@core/services/airline.service';
import { DashboardService } from '@core/services/dashboard.service';
import { PageHeader } from '@shared/components/page-header/page-header';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { CountUpDirective, CountUpFormat } from '@shared/ui/count-up/count-up.directive';

type ReportMode = 'revenue' | 'booking';
type TimePreset = 'day' | '7d' | '30d' | 'quarter' | 'year' | 'custom';

interface ReportKpi {
  label: string;
  value: string;
  numericValue: number;
  format: CountUpFormat;
  sub: string;
}

interface DonutSlice {
  label: string;
  detail: string;
  percentage: number;
  colorVar: string;
}

interface RouteOption {
  value: string;
  label: string;
}

const COMMON_ROUTES: RouteOption[] = [
  { value: 'HAN-SGN', label: 'HAN → SGN' },
  { value: 'SGN-HAN', label: 'SGN → HAN' },
  { value: 'HAN-DAD', label: 'HAN → DAD' },
  { value: 'DAD-SGN', label: 'DAD → SGN' },
  { value: 'HAN-PQC', label: 'HAN → PQC' },
  { value: 'SGN-PQC', label: 'SGN → PQC' },
  { value: 'SGN-CXR', label: 'SGN → CXR' },
  { value: 'HAN-CXR', label: 'HAN → CXR' },
];

const AIRLINE_COLOR_VARS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-info)',
  'var(--color-danger)',
];

const REAL_BOOKING_STATUSES: { key: string; label: string; colorVar: string }[] = [
  { key: 'CONFIRMED', label: 'Đã xác nhận', colorVar: 'var(--color-success)' },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán', colorVar: 'var(--color-warning)' },
  { key: 'CANCELLED', label: 'Đã hủy', colorVar: 'var(--color-danger)' },
  { key: 'EXPIRED', label: 'Hết hạn', colorVar: 'var(--color-ink-subtle)' },
];

/**
 * Màn Báo cáo & Thống kê (ADMIN) — `/admin/reports`.
 * Hỗ trợ chuyển chế độ `Doanh thu | Booking`, preset thời gian (`Theo ngày`, `7 ngày`, `30 ngày`, `Quý`, `Năm`),
 * bộ lọc Từ/Đến ngày + Hãng khai thác + Tuyến bay trong `.adm-filter--card`, 2 biểu đồ cạnh nhau
 * (Cột với `.bar__track` + Donut CSS conic-gradient), bảng Hiệu quả tuyến bay clickable và xuất CSV.
 */
@Component({
  selector: 'app-admin-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, PageHeader, AppButton, AppCard, CountUpDirective],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class AdminReports implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly airlineService = inject(AirlineService, { optional: true });
  private readonly router = inject(Router);

  protected readonly mode = signal<ReportMode>('revenue');
  protected readonly activePreset = signal<TimePreset>('7d');
  protected readonly fromDate = signal<string>(this.daysAgoIso(6));
  protected readonly toDate = signal<string>(this.daysAgoIso(0));
  protected readonly selectedAirlineId = signal<number | null>(null);
  protected readonly routeFilter = signal<string>('');
  protected readonly report = signal<OverviewDashboard | null>(null);
  protected readonly loading = signal<boolean>(true);

  private readonly airlinesRes = toSignal(
    this.airlineService
      ? this.airlineService.list({ page: 1, size: 100 }).pipe(catchError(() => of(null)))
      : of(null),
    { initialValue: null },
  );

  protected readonly airlines = computed(() => this.airlinesRes()?.data.items ?? []);

  protected readonly routeOptions = computed<RouteOption[]>(() => {
    const map = new Map<string, string>();
    for (const rt of COMMON_ROUTES) {
      map.set(rt.value, rt.label);
    }
    for (const r of this.report()?.top_routes ?? []) {
      const dep = r.departure_airport_code?.trim();
      const arr = r.arrival_airport_code?.trim();
      if (dep && arr) {
        const val = `${dep}-${arr}`;
        if (!map.has(val)) {
          map.set(val, `${dep} → ${arr}`);
        }
      }
    }
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  });

  protected readonly kpis = computed<ReportKpi[]>(() => {
    const r = this.report();
    if (!r) return [];
    if (this.mode() === 'revenue') {
      return [
        {
          label: 'Tổng doanh thu',
          value: this.formatVnd(r.revenue_total),
          numericValue: r.revenue_total,
          format: 'vnd',
          sub: `Tháng này: ${this.formatVnd(r.revenue_month)}`,
        },
        {
          label: 'Doanh thu hôm nay',
          value: this.formatVnd(r.revenue_today),
          numericValue: r.revenue_today,
          format: 'vnd',
          sub: `${r.bookings_today.toLocaleString('vi-VN')} đơn hôm nay`,
        },
        {
          label: 'Tỷ lệ lấp đầy',
          value: `${r.occupancy_rate_percent.toFixed(1)}%`,
          numericValue: r.occupancy_rate_percent,
          format: 'percent',
          sub: `${r.pax_month.toLocaleString('vi-VN')} lượt khách trong kỳ`,
        },
        {
          label: 'Tổng đơn đặt vé',
          value: r.bookings_total.toLocaleString('vi-VN'),
          numericValue: r.bookings_total,
          format: 'number',
          sub: `Tỷ lệ hủy vé: ${r.cancel_rate_percent.toFixed(1)}%`,
        },
      ];
    }

    return [
      {
        label: 'Tổng đơn đặt vé',
        value: r.bookings_total.toLocaleString('vi-VN'),
        numericValue: r.bookings_total,
        format: 'number',
        sub: `Tháng này: ${r.bookings_month.toLocaleString('vi-VN')} đơn`,
      },
      {
        label: 'Đơn hôm nay',
        value: r.bookings_today.toLocaleString('vi-VN'),
        numericValue: r.bookings_today,
        format: 'number',
        sub: `${r.flights_today.toLocaleString('vi-VN')} chuyến khai thác`,
      },
      {
        label: 'Hành khách trong kỳ',
        value: r.pax_month.toLocaleString('vi-VN'),
        numericValue: r.pax_month,
        format: 'number',
        sub: `Hôm nay: ${r.pax_today.toLocaleString('vi-VN')} hành khách`,
      },
      {
        label: 'Tỷ lệ hủy vé',
        value: `${r.cancel_rate_percent.toFixed(1)}%`,
        numericValue: r.cancel_rate_percent,
        format: 'percent',
        sub: `${r.flights_delayed_today} chuyến chậm hôm nay`,
      },
    ];
  });

  protected readonly chartBars = computed(() => {
    const days = this.report()?.revenue_by_day ?? [];
    const isRev = this.mode() === 'revenue';
    const maxVal = Math.max(1, ...days.map((d) => (isRev ? d.revenue : d.bookings_count)));
    return days.map((d) => {
      const raw = isRev ? d.revenue : d.bookings_count;
      return {
        ...d,
        displayVal: isRev ? this.formatCompactVnd(d.revenue) : d.bookings_count.toLocaleString('vi-VN'),
        tooltip: isRev
          ? `${d.day_label}: ${this.formatVnd(d.revenue)} (${d.bookings_count} đơn)`
          : `${d.day_label}: ${d.bookings_count.toLocaleString('vi-VN')} đơn`,
        heightPercent: raw <= 0 ? 4 : Math.max(8, Math.round((raw / maxVal) * 100)),
        isPeak: raw > 0 && raw === maxVal,
      };
    });
  });

  protected readonly donutSlices = computed<DonutSlice[]>(() => {
    const r = this.report();
    if (!r) return [];
    if (this.mode() === 'revenue') {
      const items = r.revenue_by_airline ?? [];
      return items.map((item, idx) => ({
        label: `${item.airline_code} — ${item.airline_name}`,
        detail: `${this.formatVnd(item.revenue)} (${item.percentage.toFixed(1)}%)`,
        percentage: Math.max(0, item.percentage),
        colorVar: AIRLINE_COLOR_VARS[idx % AIRLINE_COLOR_VARS.length],
      }));
    }

    const byStatus = r.bookings_by_status ?? [];
    const map = new Map(byStatus.map((s) => [s.status, s]));
    return REAL_BOOKING_STATUSES.map((meta) => {
      const found = map.get(meta.key);
      const count = found?.count ?? 0;
      const pct = found?.percentage ?? 0;
      return {
        label: meta.label,
        detail: `${count.toLocaleString('vi-VN')} đơn (${pct.toFixed(1)}%)`,
        percentage: Math.max(0, pct),
        colorVar: meta.colorVar,
      };
    }).filter((s) => s.percentage > 0 || byStatus.length > 0);
  });

  protected readonly donutGradient = computed(() => {
    const slices = this.donutSlices().filter((s) => s.percentage > 0);
    if (slices.length === 0) {
      return 'conic-gradient(var(--color-border-soft) 0% 100%)';
    }
    const total = slices.reduce((sum, s) => sum + s.percentage, 0) || 100;
    let cursor = 0;
    const stops: string[] = [];
    for (const s of slices) {
      const start = cursor;
      const next = Math.min(100, cursor + (s.percentage / total) * 100);
      stops.push(`${s.colorVar} ${start.toFixed(2)}% ${next.toFixed(2)}%`);
      cursor = next;
    }
    return `conic-gradient(${stops.join(', ')})`;
  });

  ngOnInit(): void {
    this.loadReport();
  }

  protected setMode(next: ReportMode): void {
    this.mode.set(next);
  }

  protected applyPreset(preset: Exclude<TimePreset, 'custom'>): void {
    this.activePreset.set(preset);
    const daysMap: Record<Exclude<TimePreset, 'custom'>, number> = {
      day: 0,
      '7d': 6,
      '30d': 29,
      quarter: 89,
      year: 364,
    };
    this.fromDate.set(this.daysAgoIso(daysMap[preset]));
    this.toDate.set(this.daysAgoIso(0));
    this.loadReport();
  }

  protected onCustomDateChange(): void {
    this.activePreset.set('custom');
  }

  protected loadReport(): void {
    this.loading.set(true);
    this.dashboardService
      .getReports(
        this.fromDate(),
        this.toDate(),
        this.selectedAirlineId(),
        this.routeFilter().trim() || undefined,
      )
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.report.set(res.data);
        }
        this.loading.set(false);
      });
  }

  protected goToRouteBookings(): void {
    this.router.navigate(['/admin/bookings']);
  }

  protected exportCsv(): void {
    const data = this.report();
    if (!data || typeof document === 'undefined') return;
    const header = 'Ngay,SoDonDatCho,DoanhThuVND\n';
    const rows = data.revenue_by_day
      .map((d) => `${d.date},${d.bookings_count},${Math.round(d.revenue)}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinafly-report-${this.mode()}-${this.fromDate()}-to-${this.toDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected formatVnd(amount: number | null | undefined): string {
    return `${Math.round(amount ?? 0).toLocaleString('vi-VN')}đ`;
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

  private daysAgoIso(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
