import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { FlightFare } from '@core/models/flight.model';
import { AdminFlightFares } from '@features/admin/pages/flight-fares/flight-fares';

describe('AdminFlightFares (Bảng giá chuyến bay — Cụm DA2.2 / 3A)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFlightFares],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('render bảng giá với Hạng dịch vụ, ServerPager, FlightSearchPicker và nút Sửa', async () => {
    const fixture = TestBed.createComponent(AdminFlightFares);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('VN-210');
    expect(text).toContain('VN_ECO_SAVER');
    expect(text).toContain('Hạng vé & Hạng dịch vụ');
    expect(text).toContain('1.640.000đ');
    expect(text).toContain('1.230.000đ');
    expect(text).toContain('164.000đ');
    expect(text).toContain('Sửa');
    expect(el.querySelector('app-server-pager')).toBeTruthy();
    expect(el.querySelector('app-flight-search-picker')).toBeTruthy();
  });

  it('MockRegistry tự động tính giá trẻ em 75% & em bé 10% khi tạo dòng giá hợp lệ', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/admin/flight-fares', {
      flight_id: 101,
      fare_class_id: 1,
      base_fare: 1500000,
      tax_fee: 500000,
      currency: 'VND',
      effective_from: '2026-12-05T00:00:00',
      effective_to: '2026-12-31T23:59:00',
    }) as ApiResponse<FlightFare>;

    expect(res.code).toBe(1000);
    expect(res.data.adult_price).toBe(2000000);
    expect(res.data.child_price).toBe(1500000);
    expect(res.data.infant_price).toBe(200000);
  });

  it('MockRegistry chặn chồng lấn khoảng hiệu lực cùng chuyến và hạng vé (1006)', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/admin/flight-fares', {
      flight_id: 101,
      fare_class_id: 1,
      base_fare: 1200000,
      tax_fee: 490000,
      effective_from: '2026-11-15T00:00:00',
      effective_to: '2026-11-25T23:59:00',
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });

  it('MockRegistry chặn gán hạng vé không thuộc hãng bay của chuyến (1006)', () => {
    const registry = new MockRegistry();
    // Chuyến 101 của VN, hạng vé 5 (VJ_ECO) của VJ
    const res = registry.resolve('POST', '/api/admin/flight-fares', {
      flight_id: 101,
      fare_class_id: 5,
      base_fare: 900000,
      tax_fee: 480000,
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });
});
