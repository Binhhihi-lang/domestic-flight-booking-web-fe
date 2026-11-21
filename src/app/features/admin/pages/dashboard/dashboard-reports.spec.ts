import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import {
  OPERATIONAL_DASHBOARD_MOCK,
  OVERVIEW_DASHBOARD_MOCK,
} from '@core/mock/data/checkout-dashboard.mock';
import { AuthService } from '@core/services/auth.service';
import { DashboardService } from '@core/services/dashboard.service';
import { AdminDashboard } from '@features/admin/pages/dashboard/dashboard';
import { AdminReports } from '@features/admin/pages/reports/reports';

describe('AdminDashboard & AdminReports (Cụm B6.2)', () => {
  const isAdminSignal = signal(true);

  const dashboardServiceMock = {
    getOverview: vi.fn(() => of({ code: 1000, message: 'OK', data: OVERVIEW_DASHBOARD_MOCK })),
    getReports: vi.fn(() => of({ code: 1000, message: 'OK', data: OVERVIEW_DASHBOARD_MOCK })),
    getOperational: vi.fn(() => of({ code: 1000, message: 'OK', data: OPERATIONAL_DASHBOARD_MOCK })),
  };

  beforeEach(async () => {
    isAdminSignal.set(true);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminDashboard, AdminReports],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AuthService, useValue: { isAdmin: isAdminSignal } },
      ],
    }).compileComponents();
  });

  it('AdminDashboard hiển thị KPI doanh thu khi vai trò là ADMIN', async () => {
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Doanh thu hôm nay');
    expect(text).toContain('HAN → SGN');
    expect(dashboardServiceMock.getOverview).toHaveBeenCalledTimes(1);
  });

  it('AdminDashboard ẩn tuyệt đối KPI doanh thu khi vai trò là STAFF', async () => {
    isAdminSignal.set(false);
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Doanh thu hôm nay');
    expect(text).toContain('Chuyến bay hôm nay');
    expect(dashboardServiceMock.getOverview).not.toHaveBeenCalled();
    expect(dashboardServiceMock.getOperational).toHaveBeenCalledTimes(1);
  });

  it('AdminReports hiển thị tổng doanh thu, top đường bay và đơn đặt vé gần đây', async () => {
    const fixture = TestBed.createComponent(AdminReports);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Báo cáo & Thống kê doanh thu');
    expect(text).toContain('HAN → SGN');
    expect(text).toContain('VF882194');
  });
});
