import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '../../../../core/mock/mock-registry';
import { mockInterceptor } from '../../../../core/mock/mock.interceptor';
import { AdminAirlines } from './airlines';

/**
 * Kiểm chứng luồng thật của màn mẫu: mount component, để nó gọi service,
 * để interceptor trả dữ liệu giả, rồi xem bảng có render đúng không.
 *
 * Vì sao cần test này thay vì chỉ `ng build`: build chỉ chứng minh code hợp lệ,
 * không chứng minh được chuỗi component -> service -> interceptor -> dữ liệu
 * chạy đúng. Đây là chỗ dễ đứt nhất mà mắt thường không thấy khi chưa mở trình duyệt.
 */
describe('AdminAirlines (tích hợp với mock layer)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAirlines],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('tải và render danh sách hãng hàng không từ mock', async () => {
    const fixture = TestBed.createComponent(AdminAirlines);
    fixture.detectChanges();

    // Mock có delay 320ms -> chờ dữ liệu về.
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vietnam Airlines');
    expect(text).toContain('Vietjet Air');
    expect(text).toContain('Bamboo Airways');
  });

  it('hiển thị badge trạng thái đúng theo is_active', async () => {
    const fixture = TestBed.createComponent(AdminAirlines);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // Pacific Airlines có is_active = false trong dữ liệu giả.
    expect(text).toContain('Tạm dừng');
    expect(text).toContain('Hoạt động');
  });

  it('render bảng với đủ cột mong đợi', async () => {
    const fixture = TestBed.createComponent(AdminAirlines);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const headers = Array.from(el.querySelectorAll('th')).map((h) => h.textContent?.trim());
    expect(headers).toContain('Mã');
    expect(headers).toContain('Tên hãng');
    expect(headers).toContain('Quốc gia');
    expect(headers).toContain('Trạng thái');
  });
});
