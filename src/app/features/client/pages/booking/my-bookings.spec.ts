import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { BookingDetail } from '@core/models/booking.model';
import { AdminBookings } from '@features/admin/pages/bookings/bookings';
import { AccountBookings } from '@features/client/pages/account/account-bookings';
import { BookingDetailPage } from '@features/client/pages/booking/booking-detail';

describe('Quản lý Đặt chỗ Khách hàng & Admin/Staff (Cụm DA3.2)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBookings, BookingDetailPage, AdminBookings],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('AccountBookings hiển thị danh sách vé của tôi và các tab lọc trạng thái', async () => {
    const fixture = TestBed.createComponent(AccountBookings);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('DH-1049');
    expect(text).toContain('Chờ thanh toán');
    expect(text).toContain('Đã xác nhận');
    expect(text).toContain('Đã hủy');
  });

  it('BookingDetailPage mở modal hủy vé ghi rõ không tự hoàn tiền và thông tin đại lý 1900 1234', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: convertToParamMap({ id: '1049' }),
          data: {},
        },
      },
    });
    const fixture = TestBed.createComponent(BookingDetailPage);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('DH-1049');
    expect(el.textContent).toContain('2.959.000đ');

    const cancelBtn = el.querySelector('.bd-head__actions button') as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    const modal = el.querySelector('.vf-modal-panel');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('KHÔNG tự động hoàn tiền');
    expect(modal?.textContent).toContain('1900 1234');
    expect(modal?.textContent).toContain('hotro@vinafly.vn');
  });

  it('AdminBookings hiển thị danh sách đơn đặt chỗ cho Admin/Staff', async () => {
    const fixture = TestBed.createComponent(AdminBookings);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('DH-1049');
    expect(text).toContain('DH-1055');
  });

  it('MockRegistry hủy đơn đặt chỗ chuyển trạng thái CANCELLED và trả thông tin đại lý', () => {
    const registry = new MockRegistry();
    const res = registry.resolve('POST', '/api/bookings/1049/cancel', {
      reason: 'Thay đổi lịch bay',
    }) as ApiResponse<BookingDetail>;

    expect(res.code).toBe(1000);
    expect(res.data.status).toBe('CANCELLED');
    expect(res.data.agency_contact?.hotline).toBe('1900 1234');
  });
});
