import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api-response.model';
import { OperationalDashboard, OverviewDashboard } from '@core/models/dashboard.model';

/**
 * Dịch vụ Dashboard Tổng quan / Báo cáo (ADMIN) và Vận hành (STAFF).
 * Khớp Backend `DashboardController`:
 * - `GET /api/admin/dashboard` (ADMIN — có doanh thu)
 * - `GET /api/admin/reports` (ADMIN — lọc theo khoảng ngày `from`, `to`)
 * - `GET /api/admin/dashboard/operational` (STAFF — không có doanh thu)
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  getOverview(days = 7): Observable<ApiResponse<OverviewDashboard>> {
    const safeDays = Math.max(1, Math.floor(days));
    const toDate = new Date();
    const fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() - (safeDays - 1));
    const params = new HttpParams()
      .set('from_date', DashboardService.formatLocalDate(fromDate))
      .set('to_date', DashboardService.formatLocalDate(toDate))
      .set('days', String(safeDays));
    return this.http.get<ApiResponse<OverviewDashboard>>(`${this.baseUrl}/dashboard`, { params });
  }

  getReports(
    from?: string,
    to?: string,
    airlineId?: number | null,
    route?: string,
  ): Observable<ApiResponse<OverviewDashboard>> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from_date', from);
    }
    if (to) {
      params = params.set('to_date', to);
    }
    if (airlineId !== undefined && airlineId !== null) {
      params = params.set('airline_id', String(airlineId));
    }
    if (route && route.trim()) {
      params = params.set('route', route.trim());
    }
    return this.http.get<ApiResponse<OverviewDashboard>>(`${this.baseUrl}/dashboard/reports`, {
      params,
    });
  }

  getOperational(): Observable<ApiResponse<OperationalDashboard>> {
    return this.http.get<ApiResponse<OperationalDashboard>>(
      `${this.baseUrl}/dashboard/operational`,
    );
  }

  private static formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
