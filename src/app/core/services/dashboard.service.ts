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
    const params = new HttpParams().set('days', String(days));
    return this.http.get<ApiResponse<OverviewDashboard>>(`${this.baseUrl}/dashboard`, { params });
  }

  getReports(from?: string, to?: string): Observable<ApiResponse<OverviewDashboard>> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from_date', from);
    }
    if (to) {
      params = params.set('to_date', to);
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
}
