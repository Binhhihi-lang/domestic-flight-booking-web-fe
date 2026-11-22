import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { UserVoucherService } from '@core/services/catalog.service';
import { UploadService } from '@core/services/upload.service';
import { AccountProfile } from '@features/client/pages/account/account-profile';
import { VoucherDetailPage } from '@features/client/pages/account/voucher-detail';
import { signal } from '@angular/core';

describe('Cluster 4B — AccountProfile & VoucherDetailPage', () => {
  it('AccountProfile tải ảnh đại diện qua UploadService.uploadProfileAvatar và hỗ trợ Hủy thay đổi', async () => {
    const uploadSpy = vi.fn().mockReturnValue(
      of({
        code: 1000,
        message: 'Tải ảnh thành công',
        data: { avatar_url: 'https://cdn.vinafly.vn/avatars/u1.png' },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [AccountProfile],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: signal({
              id: 1,
              full_name: 'Nguyễn Minh Anh',
              email: 'minhanh@vinafly.vn',
              phone: '0912345678',
              avatar_url: null,
              roles: ['CUSTOMER'],
              permissions: [],
            }).asReadonly(),
            getProfile: () =>
              of({
                code: 1000,
                message: 'OK',
                data: {
                  id: 1,
                  full_name: 'Nguyễn Minh Anh',
                  email: 'minhanh@vinafly.vn',
                  phone: '0912345678',
                  avatar_url: null,
                },
              }),
            updateProfile: vi.fn().mockReturnValue(of({ code: 1000, message: 'OK', data: {} })),
          },
        },
        {
          provide: UploadService,
          useValue: { uploadProfileAvatar: uploadSpy },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AccountProfile);
    fixture.detectChanges();

    const file = new File(['img-bytes'], 'avatar.png', { type: 'image/png' });
    const fileInput = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(uploadSpy).toHaveBeenCalledWith(file);
    const avatarText = fixture.nativeElement.querySelector('#pf-avatar') as HTMLInputElement;
    expect(avatarText.value).toBe('https://cdn.vinafly.vn/avatars/u1.png');

    // Bấm Hủy thay đổi → khôi phục giá trị gốc
    const cancelBtn = [...fixture.nativeElement.querySelectorAll('button')].find((b: HTMLButtonElement) =>
      b.textContent?.includes('Hủy thay đổi'),
    ) as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(avatarText.value).toBe('');
  });

  it('VoucherDetailPage hiển thị mã voucher, mức giảm định dạng đ và fallback khi getById lỗi', async () => {
    await TestBed.configureTestingModule({
      imports: [VoucherDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } },
        },
        {
          provide: UserVoucherService,
          useValue: {
            getById: () => throwError(() => new Error('404')),
            myVouchers: () =>
              of({
                code: 1000,
                message: 'OK',
                data: {
                  items: [
                    {
                      id: 7,
                      status: 'AVAILABLE',
                      source: 'CLAIMED',
                      received_at: '2026-10-01T08:00:00Z',
                      expires_at: '2026-12-31T23:59:59Z',
                      used_at: null,
                      voucher: {
                        id: 10,
                        voucher_code: 'BAYNOIDIA100',
                        voucher_name: 'Giảm 100K bay nội địa',
                        description: 'Áp dụng cho mọi tuyến bay nội địa',
                        discount_type: 'AMOUNT',
                        discount_value: 100000,
                        min_order_amount: 1000000,
                        applicable_trip_type: 'ANY',
                        start_date: '2026-10-01',
                        end_date: '2026-12-31',
                      },
                    },
                  ],
                  pagination: { page: 1, size: 50, total_items: 1, total_pages: 1 },
                },
              }),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(VoucherDetailPage);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('BAYNOIDIA100');
    expect(text).toContain('100.000đ');
    expect(text).toContain('1.000.000đ');
    expect(text).toContain('Dùng ngay khi đặt vé');
  });
});
