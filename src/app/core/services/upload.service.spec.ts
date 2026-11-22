import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import {
  AirportService,
  PublicFareRuleService,
  UserVoucherService,
  VoucherService,
} from '@core/services/catalog.service';
import { DashboardService } from '@core/services/dashboard.service';
import { UploadService } from '@core/services/upload.service';

describe('Core Services Foundations (Cụm 1B)', () => {
  let httpMock: HttpTestingController;
  let uploadService: UploadService;
  let dashboardService: DashboardService;
  let voucherService: VoucherService;
  let userVoucherService: UserVoucherService;
  let publicFareRuleService: PublicFareRuleService;
  let airportService: AirportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    uploadService = TestBed.inject(UploadService);
    dashboardService = TestBed.inject(DashboardService);
    voucherService = TestBed.inject(VoucherService);
    userVoucherService = TestBed.inject(UserVoucherService);
    publicFareRuleService = TestBed.inject(PublicFareRuleService);
    airportService = TestBed.inject(AirportService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('UploadService gửi FormData field file tới /admin/uploads/image và /profile/avatar', () => {
    const file = new File(['img'], 'logo.png', { type: 'image/png' });

    uploadService.uploadAdminImage(file).subscribe((res) => {
      expect(res.data.url).toBe('https://cdn.example/logo.png');
    });
    const req1 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/uploads/image`);
    expect(req1.request.method).toBe('POST');
    expect(req1.request.body instanceof FormData).toBe(true);
    expect((req1.request.body as FormData).get('file')).toBe(file);
    req1.flush({ code: 1000, message: 'OK', data: { url: 'https://cdn.example/logo.png' } });

    uploadService.uploadProfileAvatar(file).subscribe((res) => {
      expect(res.data.avatar_url).toBe('https://cdn.example/avt.png');
    });
    const req2 = httpMock.expectOne(`${environment.apiBaseUrl}/profile/avatar`);
    expect(req2.request.method).toBe('POST');
    expect((req2.request.body as FormData).get('file')).toBe(file);
    req2.flush({ code: 1000, message: 'OK', data: { avatar_url: 'https://cdn.example/avt.png' } });
  });

  it('DashboardService.getOverview truyền đủ from_date, to_date và days', () => {
    dashboardService.getOverview(7).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${environment.apiBaseUrl}/admin/dashboard`);
    expect(req.request.params.get('days')).toBe('7');
    expect(req.request.params.get('from_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(req.request.params.get('to_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    req.flush({ code: 1000, message: 'OK', data: {} });
  });

  it('DashboardService.getReports truyền from_date, to_date, airline_id, route', () => {
    dashboardService.getReports('2026-10-01', '2026-10-31', 2, 'HAN-SGN').subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/admin/dashboard/reports`,
    );
    expect(req.request.params.get('from_date')).toBe('2026-10-01');
    expect(req.request.params.get('to_date')).toBe('2026-10-31');
    expect(req.request.params.get('airline_id')).toBe('2');
    expect(req.request.params.get('route')).toBe('HAN-SGN');
    req.flush({ code: 1000, message: 'OK', data: {} });
  });

  it('VoucherService.assign & UserVoucherService.getById gọi đúng endpoint', () => {
    voucherService.assign(5, [10, 11]).subscribe((res) => {
      expect(res.data.assigned_count).toBe(2);
    });
    const req1 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/vouchers/5/assign`);
    expect(req1.request.method).toBe('POST');
    expect(req1.request.body).toEqual({ user_ids: [10, 11] });
    req1.flush({ code: 1000, message: 'OK', data: { assigned_count: 2 } });

    userVoucherService.getById(99).subscribe((res) => {
      expect(res.data.id).toBe(99);
    });
    const req2 = httpMock.expectOne(`${environment.apiBaseUrl}/my-vouchers/99`);
    expect(req2.request.method).toBe('GET');
    req2.flush({ code: 1000, message: 'OK', data: { id: 99 } });
  });

  it('PublicFareRuleService.list chuẩn hóa cả mảng trần lẫn PageData', () => {
    publicFareRuleService.list(1).subscribe((res) => {
      expect(res.data.length).toBe(1);
      expect(res.data[0].fare_class_code).toBe('VN_ECO_FLEX');
    });
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/public/fare-rules`,
    );
    expect(req.request.params.get('airline_id')).toBe('1');
    req.flush({
      code: 1000,
      message: 'OK',
      data: {
        items: [{ id: 1, fare_class_code: 'VN_ECO_FLEX' }],
        pagination: { page: 1, size: 10, total_items: 1, total_pages: 1 },
      },
    });
  });

  it('AirportService.getById tự ánh xạ city.id vào city_id khi BE chỉ trả object city lồng', () => {
    airportService.getById(3).subscribe((res) => {
      expect(res.data.city_id).toBe(7);
    });
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/airports/3`);
    req.flush({
      code: 1000,
      message: 'OK',
      data: {
        id: 3,
        airport_code: 'DAD',
        airport_name: 'Đà Nẵng',
        latitude: 16.04,
        longitude: 108.19,
        status: 'ACTIVE',
        city: { id: 7, city_code: 'DAD', city_name: 'Đà Nẵng', country: 'VN', image_url: null, status: 'ACTIVE' },
      },
    });
  });
});
