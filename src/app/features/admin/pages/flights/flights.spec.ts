import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { FlightRecord } from '@core/models/flight.model';
import { AdminFlightDetail } from '@features/admin/pages/flights/flight-detail';
import { AdminFlights } from '@features/admin/pages/flights/flights';

describe('AdminFlights & Staff FlightDetail (Cụm DA2.1)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFlights, AdminFlightDetail],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('hiển thị danh sách chuyến bay kèm chặng bay và trạng thái vận hành', async () => {
    const fixture = TestBed.createComponent(AdminFlights);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('VN-210');
    expect(text).toContain('VJ-156');
    expect(text).toContain('HAN');
    expect(text).toContain('SGN');
    expect(text).toContain('Đang mở bán');
  });

  it('AdminFlightDetail hiển thị danh sách hành khách của chuyến bay VN-210', async () => {
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
    expect(text).toContain('Nguyễn Minh Anh');
    expect(text).toContain('DH-1049');
    expect(text).toContain('Đã check-in');
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
