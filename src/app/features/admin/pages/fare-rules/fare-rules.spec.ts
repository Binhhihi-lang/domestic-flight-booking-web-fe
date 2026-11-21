import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { AdminFareRules } from '@features/admin/pages/fare-rules/fare-rules';

describe('AdminFareRules (Quản lý Quy định hoàn vé Phase 2)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFareRules],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('tải và render danh sách quy định hoàn vé với đủ cột nghiệp vụ', async () => {
    const fixture = TestBed.createComponent(AdminFareRules);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((h) => h.textContent?.trim());
    expect(headers).toContain('Mã hạng vé');
    expect(headers).toContain('Phiên bản');
    expect(headers).toContain('Hoàn vé');
    expect(headers).toContain('Tỷ lệ hoàn');
    expect(headers).toContain('Báo trước tối thiểu');

    const text = el.textContent ?? '';
    expect(text).toContain('VN_ECO_FLEX');
    expect(text).toContain('Được hoàn');
    expect(text).toContain('Không hoàn');
    expect(text).toContain('70%');
    expect(text).toContain('24 giờ');
  });

  it('MockRegistry từ chối tỷ lệ hoàn vượt quá 100%', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/admin/fare-rules', {
      fare_class_id: 2,
      is_refundable: true,
      refund_min_hours_before_departure: 24,
      refund_percent: 120,
      status: 'ACTIVE',
    }) as ApiResponse<null>;

    expect(res.code).toBe(1006);
  });
});
