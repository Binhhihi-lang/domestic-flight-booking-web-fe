import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminPermissions } from '@features/admin/pages/permissions/permissions';

/**
 * Kiểm chứng chuỗi component → service → interceptor cho màn chỉ đọc.
 * Đây là chỗ dễ đứt nhất: `RoleService`/`PermissionService` trả MẢNG TRẦN,
 * không phải `{items, pagination}` — nếu `CrudPage` giả định sai shape thì bảng
 * rỗng mà không báo lỗi.
 */
describe('AdminPermissions (tích hợp mock)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPermissions],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('render được mảng trần (không phân trang) thành bảng', async () => {
    const fixture = TestBed.createComponent(AdminPermissions);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('USER_READ');
    expect(text).toContain('VOUCHER_CLAIM');
  });

  it('màn chỉ đọc KHÔNG render nút thêm mới', async () => {
    const fixture = TestBed.createComponent(AdminPermissions);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Không có nút "Thêm" nào — BR-RBAC-03.
    const buttons = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
    expect(buttons.some((b) => b.startsWith('Thêm'))).toBe(false);
  });
});
