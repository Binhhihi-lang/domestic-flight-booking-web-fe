import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { FlightRecord } from '@core/models/flight.model';
import { AdminFlightDetail } from '@features/admin/pages/flights/flight-detail';
import { AdminFlightForm } from '@features/admin/pages/flights/flight-form';
import { AdminFlights } from '@features/admin/pages/flights/flights';

describe('AdminFlights & Staff FlightDetail (Cụm DA2.1 / 3A)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFlights, AdminFlightDetail, AdminFlightForm],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('hiển thị danh sách chuyến bay kèm phân trang, cột Ghế trống và thao tác cho STAFF', async () => {
    const fixture = TestBed.createComponent(AdminFlights);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('VN-210');
    expect(text).toContain('VJ-156');
    expect(text).toContain('HAN');
    expect(text).toContain('SGN');
    expect(text).toContain('Đang mở bán');
    expect(text).toContain('Ghế trống');
    expect(text).toContain('Thêm chuyến bay');
    expect(el.querySelector('app-server-pager')).toBeTruthy();
  });

  it('AdminFlightForm mặc định chuyến tạo mới là Nháp (DRAFT) + Đóng bán (CLOSED)', async () => {
    const fixture = TestBed.createComponent(AdminFlightForm);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const opSelect = el.querySelector('#ff-op') as HTMLSelectElement;
    const salesSelect = el.querySelector('#ff-sales') as HTMLSelectElement;
    expect(opSelect.value).toBe('DRAFT');
    expect(salesSelect.value).toBe('CLOSED');
    expect(el.querySelector('app-flight-search-picker')).toBeTruthy();
  });

  it('AdminFlightDetail hiển thị trạng thái tiếng Việt và danh sách hành khách không có Check-in', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({ id: '101' }),
          queryParamMap: convertToParamMap({}),
        },
      },
    });
    const fixture = TestBed.createComponent(AdminFlightDetail);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('VN-210');
    expect(text).toContain('Đúng giờ');
    expect(text).not.toContain('SCHEDULED');
    expect(text).toContain('Nguyễn Minh Anh');
    expect(text).toContain('DH-1049');
    expect(text).toContain('Bảng giá');
    expect(text).not.toContain('Đã check-in');
  });

  it('MockRegistry từ chối tạo chuyến bay trùng sân bay đi và đến (1006)', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/admin/flights', {
      flight_number: 'VN-999',
      airline_id: 1,
      aircraft_id: 1,
      departure_airport_id: 1,
      arrival_airport_id: 1,
      scheduled_departure: '2026-12-01T08:00:00',
      scheduled_arrival: '2026-12-01T10:00:00',
      operation_status: 'SCHEDULED',
      sales_status: 'OPEN',
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('MockRegistry hỗ trợ đóng bán và mở bán chuyến bay', () => {
    const registry = new MockRegistry();
    const closed = registry.resolve(
      'POST',
      '/api/admin/flights/101/deactivate',
      {},
    ) as ApiResponse<FlightRecord>;
    expect(closed.code).toBe(1000);
    expect(closed.data.sales_status).toBe('CLOSED');

    const opened = registry.resolve(
      'POST',
      '/api/admin/flights/101/activate',
      {},
    ) as ApiResponse<FlightRecord>;
    expect(opened.code).toBe(1000);
    expect(opened.data.sales_status).toBe('OPEN');
  });
});
