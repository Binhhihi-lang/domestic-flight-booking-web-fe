import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { adminGuard } from '@core/guards/auth.guard';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AuthenticatedUser } from '@core/models/auth.model';
import { AuthService } from '@core/services/auth.service';
import { AdminLayout } from '@features/admin/layout/admin-layout';
import { AdminAircrafts } from '@features/admin/pages/aircrafts/aircrafts';
import { AdminCities } from '@features/admin/pages/cities/cities';
import { AdminFareRules } from '@features/admin/pages/fare-rules/fare-rules';
import { AdminNews } from '@features/admin/pages/news/news';
import { AdminProfile } from '@features/admin/pages/profile/admin-profile';
import { AdminUsers } from '@features/admin/pages/users/users';

function makeAuthMock(role: 'ADMIN' | 'STAFF') {
  const user: AuthenticatedUser = {
    id: role === 'ADMIN' ? 1 : 2,
    email: role === 'ADMIN' ? 'admin@vinafly.vn' : 'staff@vinafly.vn',
    full_name: role === 'ADMIN' ? 'Phạm Thu Dung' : 'Lê Hoàng Cường',
    phone: '0901234567',
    avatar_url: null,
    status: 'ACTIVE',
    roles: [role],
    permissions: [],
  };
  const userSig = signal<AuthenticatedUser | null>(user);
  return {
    currentUser: userSig.asReadonly(),
    isLoggedIn: signal(true).asReadonly(),
    roles: signal([role]).asReadonly(),
    isAdmin: signal(role === 'ADMIN').asReadonly(),
    isStaff: signal(true).asReadonly(),
    hasPermission: () => true,
    logout: vi.fn(() => of({ code: 1000, message: 'OK', data: null })),
    clearSession: vi.fn(),
    getProfile: vi.fn(() => of({ code: 1000, message: 'OK', data: user })),
    updateProfile: vi.fn(() => of({ code: 1000, message: 'OK', data: user })),
    changePassword: vi.fn(() =>
      of({ code: 1000, message: 'Đổi mật khẩu thành công', data: null }),
    ),
  };
}

describe('Cụm 2 — Admin Layout, Routes & Master Data', () => {
  it('app.routes.ts không trùng route airlines, mở đọc aircrafts & tạo flights cho STAFF', () => {
    const adminRoute = routes.find((r) => r.path === 'admin');
    const children = adminRoute?.children ?? [];

    const airlineListRoutes = children.filter((r) => r.path === 'airlines');
    expect(airlineListRoutes.length).toBe(1);

    const aircraftList = children.find((r) => r.path === 'aircrafts');
    const aircraftDetail = children.find((r) => r.path === 'aircrafts/:id');
    const aircraftNew = children.find((r) => r.path === 'aircrafts/new');
    const aircraftEdit = children.find((r) => r.path === 'aircrafts/:id/edit');

    expect(aircraftList?.canActivate ?? []).not.toContain(adminGuard);
    expect(aircraftDetail?.canActivate ?? []).not.toContain(adminGuard);
    expect(aircraftNew?.canActivate ?? []).toContain(adminGuard);
    expect(aircraftEdit?.canActivate ?? []).toContain(adminGuard);

    const flightNew = children.find((r) => r.path === 'flights/new');
    expect(flightNew?.canActivate ?? []).not.toContain(adminGuard);
  });

  it('AdminLayout ADMIN: không có .cover, đủ 7 nhóm, ẩn Design system, có .adm-who', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
        { provide: AuthService, useValue: makeAuthMock('ADMIN') },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.cover')).toBeNull();

    const labels = [...el.querySelectorAll('.sidebar__label')].map((n) => n.textContent?.trim());
    expect(labels).toEqual([
      'Tổng quan',
      'Người dùng & phân quyền',
      'Danh mục hàng không',
      'Giá vé & hành lý',
      'Bán vé & khuyến mãi',
      'Nội dung',
      'Hệ thống',
    ]);

    const sidebarText = el.querySelector('.sidebar')?.textContent ?? '';
    expect(sidebarText).not.toContain('Design system');
    expect(sidebarText).not.toContain('Hạng dịch vụ');
    expect(el.querySelector('.adm-who')?.textContent).toContain('Phạm Thu Dung');
    expect(el.querySelector('.adm-who')?.textContent).toContain('Quản trị viên');
  });

  it('AdminLayout STAFF: đúng 3 nhóm gọn theo staff.html + Máy bay chỉ đọc', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
        { provide: AuthService, useValue: makeAuthMock('STAFF') },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminLayout);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const labels = [...el.querySelectorAll('.sidebar__label')].map((n) => n.textContent?.trim());
    expect(labels).toEqual(['Vận hành', 'Danh mục', 'Cá nhân']);

    const sidebarText = el.querySelector('.sidebar')?.textContent ?? '';
    expect(sidebarText).toContain('Máy bay');
    expect(sidebarText).not.toContain('Người dùng');
    expect(sidebarText).not.toContain('Design system');
    expect(el.querySelector('.adm-who')?.textContent).toContain('Nhân viên vận hành');
  });

  it('AdminAircrafts ở vai trò STAFF bật chế độ chỉ đọc và ẩn link cấu hình ghế', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAircrafts],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
        { provide: AuthService, useValue: makeAuthMock('STAFF') },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminAircrafts);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.col-check').length).toBe(0);
    expect(el.querySelector('.rowlink')).toBeNull();
    const buttons = [...el.querySelectorAll('button')].map((b) => b.textContent?.trim() ?? '');
    expect(buttons.some((b) => b.includes('Thêm máy bay'))).toBe(false);
  });

  it('AdminUsers tắt bulk checkbox, hiện cột Điện thoại và ẩn nút Xóa trên tài khoản ADMIN', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminUsers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.col-check').length).toBe(0);

    const headers = [...el.querySelectorAll('th')].map((h) => h.textContent?.trim());
    expect(headers).toContain('Điện thoại');

    const rows = [...el.querySelectorAll('tbody tr')];
    const adminRow = rows.find((r) => r.textContent?.includes('admin@demo.local'));
    const staffRow = rows.find((r) => r.textContent?.includes('staff@demo.local'));
    expect(adminRow?.querySelector('.rowbtn--danger')).toBeNull();
    expect(staffRow?.querySelector('.rowbtn--danger')).not.toBeNull();
  });

  it('AdminNews hiện cột Danh mục và filter trạng thái bỏ UNPUBLISHED', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNews],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminNews);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const headers = [...el.querySelectorAll('th')].map((h) => h.textContent?.trim());
    expect(headers).toContain('Danh mục');

    const statusSelect = el.querySelector('select[aria-label="Lọc theo trạng thái"]');
    const optionValues = [...(statusSelect?.querySelectorAll('option') ?? [])].map((o) =>
      o.getAttribute('value'),
    );
    expect(optionValues).toEqual(['', 'PUBLISHED', 'DRAFT']);
  });

  it('AdminCities hiển thị cột Ảnh và AdminFareRules hiển thị cột Hiệu lực từ', async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCities, AdminFareRules],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();

    const cityFx = TestBed.createComponent(AdminCities);
    const ruleFx = TestBed.createComponent(AdminFareRules);
    cityFx.detectChanges();
    ruleFx.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    cityFx.detectChanges();
    ruleFx.detectChanges();

    const cityHeaders = [...(cityFx.nativeElement as HTMLElement).querySelectorAll('th')].map((h) =>
      h.textContent?.trim(),
    );
    expect(cityHeaders).toContain('Ảnh');

    const ruleHeaders = [...(ruleFx.nativeElement as HTMLElement).querySelectorAll('th')].map((h) =>
      h.textContent?.trim(),
    );
    expect(ruleHeaders).toContain('Hiệu lực từ');
  });

  it('AdminProfile validate mật khẩu nhập lại và gọi AuthService.changePassword khi hợp lệ', async () => {
    const authMock = makeAuthMock('STAFF');
    await TestBed.configureTestingModule({
      imports: [AdminProfile],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminProfile);
    fixture.detectChanges();

    const cmp = fixture.componentInstance as unknown as {
      setPasswordField: (k: 'current_password' | 'new_password' | 'confirm_password', v: string) => void;
      submitPassword: () => void;
    };

    cmp.setPasswordField('current_password', 'OldPass123!');
    cmp.setPasswordField('new_password', 'NewPass123!');
    cmp.setPasswordField('confirm_password', 'WrongConfirm!');
    cmp.submitPassword();
    fixture.detectChanges();

    expect(authMock.changePassword).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('không khớp');

    cmp.setPasswordField('confirm_password', 'NewPass123!');
    cmp.submitPassword();
    fixture.detectChanges();

    expect(authMock.changePassword).toHaveBeenCalledWith({
      current_password: 'OldPass123!',
      new_password: 'NewPass123!',
    });
  });
});
