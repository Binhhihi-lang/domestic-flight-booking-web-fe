import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UserService, VoucherService } from '@core/services/catalog.service';
import { VoucherAssign } from '@features/admin/pages/vouchers/voucher-assign';

describe('VoucherAssign', () => {
  const mockVoucherService = {
    getById: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          id: 7,
          voucher_code: 'VIP200K',
          voucher_name: 'Tặng khách hàng thân thiết',
          description: 'Giảm 200K cho đơn từ 1 triệu',
          distribution_type: 'ASSIGNED' as const,
          discount_type: 'AMOUNT' as const,
          discount_value: 200000,
          max_discount_amount: null,
          min_order_amount: 1000000,
          applicable_trip_type: 'ANY' as const,
          start_date: '2026-06-01',
          end_date: '2026-12-31',
          claim_limit: null,
          claimed_count: 3,
          status: 'ACTIVE' as const,
        },
      }),
    ),
    assign: vi.fn(() =>
      of({
        code: 1000,
        message: 'Đã tặng voucher thành công',
        data: { assigned_count: 2 },
      }),
    ),
  };

  const mockUserService = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: [
            {
              id: 101,
              email: 'khach1@demo.local',
              full_name: 'Nguyễn Văn A',
              phone: '0901234567',
              avatar_url: null,
              status: 'ACTIVE' as const,
              roles: ['CUSTOMER' as const],
              created_at: '2026-01-01T00:00:00Z',
            },
            {
              id: 102,
              email: 'khach2@demo.local',
              full_name: 'Trần Thị B',
              phone: '0907654321',
              avatar_url: null,
              status: 'ACTIVE' as const,
              roles: ['CUSTOMER' as const],
              created_at: '2026-01-02T00:00:00Z',
            },
          ],
          pagination: { page: 1, size: 20, total_items: 2, total_pages: 1 },
        },
      }),
    ),
  };

  const mockSnackBar = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [VoucherAssign],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
        { provide: VoucherService, useValue: mockVoucherService },
        { provide: UserService, useValue: mockUserService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();
  });

  it('hiển thị thông tin voucher, danh sách khách hàng và gọi VoucherService.assign khi bấm tặng', () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(VoucherAssign);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('VIP200K');
    expect(el.textContent).toContain('Nguyễn Văn A');
    expect(el.textContent).toContain('Trần Thị B');

    const comp = fixture.componentInstance as unknown as {
      toggleSelectAllVisible: () => void;
      submit: () => void;
    };

    comp.toggleSelectAllVisible();
    fixture.detectChanges();
    expect(el.textContent).toContain('Tặng cho 2 khách hàng');

    comp.submit();
    expect(mockVoucherService.assign).toHaveBeenCalledWith(7, [101, 102]);
    expect(mockSnackBar.open).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/admin/vouchers', 7]);
  });
});
