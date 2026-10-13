import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminUsers } from '@features/admin/pages/users/users';

describe('AdminUsers (tích hợp mock)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('render danh sách người dùng đang hoạt động', async () => {
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('admin@demo.local');
    expect(text).toContain('staff@demo.local');
  });

  it('KHÔNG hiện tài khoản đã xóa mềm', async () => {
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('cu@demo.local');
  });

  it('hiện đúng nhãn vai trò và trạng thái', async () => {
    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Quản trị');
    expect(text).toContain('Nhân viên');
    // staff02 có is_active = false -> phải hiện "Ngừng".
    expect(text).toContain('Ngừng');
  });
});
