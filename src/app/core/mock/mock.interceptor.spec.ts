import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';

/**
 * Bộ lọc/tìm kiếm phải tới được mock.
 *
 * Vì sao cần test riêng ở tầng interceptor: `HttpRequest.url` KHÔNG chứa query
 * string — chỉ `urlWithParams` mới có. Nếu interceptor truyền nhầm `url` thì mọi
 * bộ lọc chết im lặng (màn hình vẫn hiện dữ liệu, chỉ là chưa lọc) — `ng build`
 * và test component đều không bắt được.
 */
describe('mockInterceptor — query params tới được mock', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockRegistry, provideHttpClient(withInterceptors([mockInterceptor]))],
    });
  });

  /** Gọi qua HttpClient thật để đi đúng đường interceptor. */
  async function get(url: string, params?: Record<string, string>): Promise<any> {
    const http = TestBed.inject(HttpClient);
    return new Promise((resolve, reject) =>
      http.get(url, { params }).subscribe({ next: resolve, error: reject }),
    );
  }

  it('lọc permission theo module', async () => {
    const res = await get('http://x/api/v1/permissions', { module: 'USER' });
    expect(res.data.length).toBe(5);
    expect(res.data.every((p: any) => p.module === 'USER')).toBe(true);
  });

  it('tìm permission theo keyword', async () => {
    const res = await get('http://x/api/v1/permissions', { keyword: 'xuất bản' });
    expect(res.data.map((p: any) => p.permission_key)).toContain('NEWS_PUBLISH');
  });

  it('tìm airline theo keyword', async () => {
    const res = await get('http://x/api/v1/airlines', { keyword: 'bamboo' });
    expect(res.data.items.length).toBe(1);
    expect(res.data.items[0].airline_code).toBe('QH');
  });

  it('lọc city theo keyword', async () => {
    const res = await get('http://x/api/v1/cities', { keyword: 'Đà' });
    expect(res.data.items.length).toBeGreaterThan(0);
  });

  it('phân trang vẫn hoạt động (page/size tới được mock)', async () => {
    const res = await get('http://x/api/v1/cities', { page: '1', size: '2' });
    expect(res.data.items.length).toBe(2);
    expect(res.data.pagination.size).toBe(2);
  });
});
