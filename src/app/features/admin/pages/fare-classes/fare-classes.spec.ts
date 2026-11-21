import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { FareClass } from '@core/models/fare-baggage.model';
import { AdminFareClasses } from '@features/admin/pages/fare-classes/fare-classes';

describe('AdminFareClasses (Quản lý Hạng vé Phase 2)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFareClasses],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('tải và render danh sách hạng vé cùng cột Hãng bay và Khoang dịch vụ', async () => {
    const fixture = TestBed.createComponent(AdminFareClasses);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((h) => h.textContent?.trim());
    expect(headers).toContain('Mã hạng vé');
    expect(headers).toContain('Tên hạng vé');
    expect(headers).toContain('Hãng bay');
    expect(headers).toContain('Khoang dịch vụ');
    expect(headers).toContain('Trạng thái');

    const text = el.textContent ?? '';
    expect(text).toContain('VN_ECO_SAVER');
    expect(text).toContain('Phổ thông tiết kiệm');
    expect(text).toContain('Phổ thông đặc biệt');
    expect(text).toContain('Thương gia');
  });

  it('MockRegistry tự gắn tiền tố mã hãng khi tạo hạng vé mới', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/admin/fare-classes', {
      airline_id: 1,
      fare_class_code: 'ECO_PROMO',
      fare_class_name: 'Phổ thông khuyến mãi',
      seat_class: 'ECONOMY',
      status: 'ACTIVE',
    }) as ApiResponse<FareClass>;

    expect(res.code).toBe(1000);
    expect(res.data.fare_class_code).toBe('VN_ECO_PROMO');
    expect(res.data.airline_code).toBe('VN');
  });
});
