import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import {
  OPERATIONAL_DASHBOARD_MOCK,
  OVERVIEW_DASHBOARD_MOCK,
} from '@core/mock/data/checkout-dashboard.mock';
import { OverviewDashboard } from '@core/models/dashboard.model';
import { AirlineService } from '@core/services/airline.service';
import { AuthService } from '@core/services/auth.service';
import { DashboardService } from '@core/services/dashboard.service';
import { AdminDashboard } from '@features/admin/pages/dashboard/dashboard';
import { AdminReports } from '@features/admin/pages/reports/reports';

const RICH_OVERVIEW_MOCK: OverviewDashboard = {
  ...OVERVIEW_DASHBOARD_MOCK,
  revenue_by_airline: [
    {
      airline_code: 'VN',
      airline_name: 'Vietnam Airlines',
      revenue: 85_000_000_000,
      bookings_count: 68_000,
      percentage: 59.5,
    },
    {
      airline_code: 'VJ',
      airline_name: 'Vietjet Air',
      revenue: 57_900_000_000,
      bookings_count: 50_500,
      percentage: 40.5,
    },
  ],
  bookings_by_status: [
    { status: 'CONFIRMED', count: 96000, percentage: 81.0 },
    { status: 'PENDING_PAYMENT', count: 12000, percentage: 10.1 },
    { status: 'CANCELLED', count: 6500, percentage: 5.5 },
    { status: 'EXPIRED', count: 4000, percentage: 3.4 },
  ],
};

describe('AdminDashboard & AdminReports (Cụm B6.2 / 3A)', () => {
  const isAdminSignal = signal(true);

  const dashboardServiceMock = {
    getOverview: vi.fn(() => of({ code: 1000, message: 'OK', data: RICH_OVERVIEW_MOCK })),
    getReports: vi.fn(() => of({ code: 1000, message: 'OK', data: RICH_OVERVIEW_MOCK })),
    getOperational: vi.fn(() => of({ code: 1000, message: 'OK', data: OPERATIONAL_DASHBOARD_MOCK })),
  };

  const airlineServiceMock = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: [
            { id: 1, airline_code: 'VN', airline_name: 'Vietnam Airlines', status: 'ACTIVE' },
          ],
          pagination: { page: 1, size: 100, total_items: 1, total_pages: 1 },
        },
      }),
    ),
  };

  beforeEach(async () => {
    isAdminSignal.set(true);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [AdminDashboard, AdminReports],
      providers: [
        provideRouter([]),
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: AirlineService, useValue: airlineServiceMock },
        { provide: AuthService, useValue: { isAdmin: isAdminSignal } },
      ],
    }).compileComponents();
  });

  it('AdminDashboard hiển thị 4 KPI ADMIN, Doanh thu 7 ngày, Top tuyến bay và Đơn gần đây', async () => {
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Doanh thu hôm nay');
    expect(text).toContain('Đơn hôm nay');
    expect(text).toContain('Hành khách hôm nay');
    expect(text).toContain('Tỷ lệ lấp đầy');
    expect(text).toContain('Doanh thu 7 ngày');
    expect(text).toContain('Top tuyến bay');
    expect(text).toContain('Đơn gần đây');
    expect(text).toContain('HAN → SGN');
    expect(text).toContain('DH-1001');
    expect(dashboardServiceMock.getOverview).toHaveBeenCalledWith(7);
  });

  it('AdminDashboard ẩn doanh thu khi là STAFF và hiển thị Chuyến cần xử lý + Booking chờ xác nhận', async () => {
    isAdminSignal.set(false);
    const fixture = TestBed.createComponent(AdminDashboard);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Doanh thu hôm nay');
    expect(text).toContain('Chuyến bay hôm nay');
    expect(text).toContain('Chuyến cần xử lý');
    expect(text).toContain('Booking chờ xác nhận');
    expect(text).toContain('Đúng giờ');
    expect(text).not.toContain('SCHEDULED');
    expect(dashboardServiceMock.getOverview).not.toHaveBeenCalled();
    expect(dashboardServiceMock.getOperational).toHaveBeenCalledTimes(1);
  });

  it('AdminReports hỗ trợ chuyển chế độ Doanh thu | Booking, Donut chart và bảng hiệu quả tuyến bay', async () => {
    const fixture = TestBed.createComponent(AdminReports);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('Báo cáo & Thống kê');
    expect(text).toContain('Doanh thu');
    expect(text).toContain('Booking');
    expect(text).toContain('Tỷ trọng doanh thu theo hãng');
    expect(text).toContain('Vietnam Airlines');
    expect(text).toContain('Hiệu quả khai thác tuyến bay');
    expect(text).toContain('HAN → SGN');
    expect(text).not.toContain('Đơn đặt vé gần đây');
    expect(el.querySelector('.donut')).toBeTruthy();

    // Chuyển sang chế độ Booking
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const bookingTab = tabs.find((b) => b.textContent?.trim() === 'Booking');
    bookingTab?.click();
    fixture.detectChanges();

    const bookingText = el.textContent ?? '';
    expect(bookingText).toContain('Cơ cấu trạng thái booking');
    expect(bookingText).toContain('Đã xác nhận');
    expect(bookingText).toContain('Chờ thanh toán');
    expect(bookingText).toContain('Đã hủy');
    expect(bookingText).toContain('Hết hạn');
    expect(bookingText).not.toContain('REFUNDED');
  });
});
