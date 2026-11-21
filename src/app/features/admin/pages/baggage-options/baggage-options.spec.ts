import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { AdminBaggageOptions } from '@features/admin/pages/baggage-options/baggage-options';

describe('AdminBaggageOptions (Quản lý Gói hành lý ký gửi Phase 2)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminBaggageOptions],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('tải và render danh sách gói hành lý với khối lượng và đơn giá chuẩn VND', async () => {
    const fixture = TestBed.createComponent(AdminBaggageOptions);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((h) => h.textContent?.trim());
    expect(headers).toContain('Hãng bay');
    expect(headers).toContain('Tên gói hành lý');
    expect(headers).toContain('Khối lượng');
    expect(headers).toContain('Đơn giá');
    expect(headers).toContain('Trạng thái');

    const text = el.textContent ?? '';
    expect(text).toContain('Ký gửi tiêu chuẩn 23kg');
    expect(text).toContain('23 kg');
    expect(text).toContain('320.000đ');
  });

  it('MockRegistry từ chối gói hành lý có khối lượng <= 0', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/admin/baggage-options', {
      airline_id: 1,
      name: 'Gói không hợp lệ',
      weight_kg: 0,
      price: 100000,
      status: 'ACTIVE',
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });
});
