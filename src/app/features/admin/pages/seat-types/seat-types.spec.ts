import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminSeatTypes } from '@features/admin/pages/seat-types/seat-types';

describe('AdminSeatTypes (đồng bộ V16: Khoang & Phụ thu)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminSeatTypes],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('hiển thị đủ cột Khoang và Phụ thu định dạng VND', async () => {
    const fixture = TestBed.createComponent(AdminSeatTypes);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((h) => h.textContent?.trim());
    expect(headers).toContain('Khoang');
    expect(headers).toContain('Phụ thu');

    const text = el.textContent ?? '';
    expect(text).toContain('Phổ thông đặc biệt');
    expect(text).toContain('50.000đ');
    expect(text).toContain('250.000đ');
  });

  it('MockRegistry không còn phục vụ endpoint seat-class-surcharges đã bỏ ở V16', () => {
    const registry = new MockRegistry();
    expect(registry.resolve('GET', '/api/admin/seat-class-surcharges')).toBeUndefined();
  });
});
