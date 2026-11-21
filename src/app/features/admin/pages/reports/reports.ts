import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { OverviewDashboard } from '@core/models/dashboard.model';
import { DashboardService } from '@core/services/dashboard.service';
import { PageHeader } from '@shared/components/page-header/page-header';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { StatusBadge, BadgeTone } from '@shared/ui/status-badge/status-badge';

/**
 * Màn Báo cáo & Thống kê Doanh thu (ADMIN) — `/admin/reports`.
 * Kết nối `GET /api/admin/reports?from=...&to=...`, hỗ trợ lọc khoảng ngày và xuất CSV nhanh.
 */
@Component({
  selector: 'app-admin-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, PageHeader, AppButton, AppCard, StatusBadge],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class AdminReports implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  protected readonly fromDate = signal<string>(this.daysAgoIso(6));
  protected readonly toDate = signal<string>(this.daysAgoIso(0));
  protected readonly report = signal<OverviewDashboard | null>(null);
  protected readonly loading = signal<boolean>(true);

  protected readonly revenueBars = computed(() => {
    const days = this.report()?.revenue_by_day ?? [];
    const maxRev = Math.max(1, ...days.map((d) => d.revenue));
    return days.map((d) => ({
      ...d,
      heightPercent: Math.max(10, Math.round((d.revenue / maxRev) * 100)),
    }));
  });

  ngOnInit(): void {
    this.loadReport();
  }

  protected loadReport(): void {
    this.loading.set(true);
    this.dashboardService
      .getReports(this.fromDate(), this.toDate())
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.data) {
          this.report.set(res.data);
        }
        this.loading.set(false);
      });
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
    a.download = `vinafly-report-${this.fromDate()}-to-${this.toDate()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected formatVnd(amount: number | null | undefined): string {
    return `${Math.round(amount ?? 0).toLocaleString('vi-VN')}đ`;
  }

  protected statusTone(status: string): BadgeTone {
    if (status === 'CONFIRMED') return 'success';
    if (status === 'PENDING_PAYMENT') return 'warning';
    if (status === 'CANCELLED' || status === 'EXPIRED') return 'danger';
    return 'neutral';
  }

  private daysAgoIso(daysAgo: number): string {
    const d = new Date(Date.now() - daysAgo * 86400_000);
    return d.toISOString().slice(0, 10);
  }
}
