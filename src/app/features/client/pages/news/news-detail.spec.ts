import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ClientNewsDetail } from '@features/client/pages/news/news-detail';

/**
 * Chống XSS ở TRANG CHI TIẾT TIN TỨC.
 *
 * GIỚI HẠN CẦN BIẾT: test này KHÔNG chứng minh `SanitizeService` là lớp bảo vệ
 * đang hoạt động. Đã đo: bỏ hẳn service ra (bind thẳng `a.content`) thì test vẫn
 * xanh, vì Angular tự làm sạch `[innerHTML]`. Test này chứng minh **kết quả cuối
 * cùng** — trang không để lọt script/onerror/javascript: vào DOM — bất kể lớp nào
 * chặn. Đó mới là điều khách quan tâm.
 *
 * Việc "hai lớp chặn giống nhau" được ghi lại ở
 * `src/app/core/sanitize-compare.spec.ts`.
 *
 * Bài mock id 99 chứa `<script>`, `onerror` và `href="javascript:"` — đi qua
 * đúng đường ADMIN nhập liệu sẽ đi.
 */
describe('ClientNewsDetail — chống XSS (kết quả cuối cùng)', () => {
  async function mount(id: string) {
    await TestBed.configureTestingModule({
      imports: [ClientNewsDetail],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ClientNewsDetail);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();
    return fixture;
  }

  it('KHÔNG để thẻ <script> lọt vào DOM', async () => {
    const fixture = await mount('99');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('script')).toBeNull();
    // Nội dung hợp lệ quanh đó vẫn phải còn.
    expect(el.textContent).toContain('Đoạn văn bình thường');
  });

  it('KHÔNG để thuộc tính onerror lọt vào DOM', async () => {
    const fixture = await mount('99');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[onerror]')).toBeNull();
    expect(el.innerHTML).not.toContain('onerror');
  });

  it('KHÔNG để href="javascript:" lọt vào DOM', async () => {
    const fixture = await mount('99');
    const el = fixture.nativeElement as HTMLElement;

    const links = [...el.querySelectorAll('a')];
    expect(links.every((a) => !(a.getAttribute('href') ?? '').startsWith('javascript:'))).toBe(true);
  });

  it('script độc hại KHÔNG chạy (không có cờ trên window)', async () => {
    const fixture = await mount('99');
    // Cờ do chính payload đặt; nếu sanitize hỏng thì nó đã chạy.
    expect((window as unknown as { __xss_ran?: boolean }).__xss_ran).toBeUndefined();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('render được bài bình thường', async () => {
    const fixture = await mount('1');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Vietnam Airlines mở bán vé Tết 2027');
  });

  it('KHÔNG cho khách đọc bài CHƯA ĐĂNG qua URL trực tiếp', async () => {
    // Bài id 5 có status = DRAFT. NEWS-01: GUEST chỉ thấy PUBLISHED.
    // Không có lớp chặn này thì đoán URL là đọc được bài nháp.
    const fixture = await mount('5');
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.title')).toBeNull();
    expect(el.textContent).not.toContain('Thay đổi quy định hành lý');
  });
});
