import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ClientPromotionList } from '@features/client/pages/promotions/promotion-list';

/**
 * Lọc chương trình ĐANG HIỆU LỰC.
 *
 * Vì sao cần test: đây là quy tắc nghiệp vụ của API v0.2 mục 2.7 mà mock KHÔNG
 * tự áp (mock trả về cả bản tạm dừng và chưa tới ngày). Nếu lọc sai, khách thấy
 * chương trình không dùng được — hoặc tệ hơn, không thấy chương trình đang chạy.
 */
describe('ClientPromotionList — lọc đang hiệu lực', () => {
  async function mount() {
    await TestBed.configureTestingModule({
      imports: [ClientPromotionList],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ClientPromotionList);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();
    return fixture;
  }

  it('chỉ hiện chương trình đang chạy, trong khoảng ngày', async () => {
    const fixture = await mount();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    // Đang hiệu lực trong mock.
    expect(text).toContain('Khuyến mãi hè 2026');
    expect(text).toContain('Đà Lạt mùa sương mù');

    // TET2027 có is_active = false -> không được hiện.
    expect(text).not.toContain('Vé Tết 2027');
    // SUMMER99 bắt đầu 2026-11-01, hôm nay 2026-10-13 -> chưa tới ngày.
    expect(text).not.toContain('Bay đồng giá 99K');
    // PROMO2025 đã xóa mềm.
    expect(text).not.toContain('Khuyến mãi cũ 2025');
  });

  it('mỗi thẻ có nhãn, hạn dùng và link tới chi tiết', async () => {
    const fixture = await mount();
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('article.promo');

    expect(cards.length).toBeGreaterThan(0);
    expect(el.querySelector('.promo__tag')?.textContent?.trim()).toBeTruthy();
    expect(el.querySelector('.promo__meta')?.textContent).toContain('Đến');
    expect(el.querySelector('a')?.getAttribute('href')).toMatch(/^\/promotions\/\d+$/);
  });
});
