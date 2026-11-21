import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { BookingPassengers } from '@features/client/pages/booking/booking-passengers';
import { BookingSeats } from '@features/client/pages/booking/booking-seats';
import { FlightResults } from '@features/client/pages/flight-results/flight-results';

describe('Luồng Đặt vé Khách hàng Bước 1–3 (Cụm DA3.1)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightResults, BookingSeats, BookingPassengers],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('FlightResults tải danh sách chuyến và mở modal so sánh 3 hạng vé', async () => {
    const fixture = TestBed.createComponent(FlightResults);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('VN-210');

    const compareBtn = el.querySelector('article.fr-card button') as HTMLButtonElement;
    compareBtn.click();
    fixture.detectChanges();

    const modal = el.querySelector('.vf-modal-panel');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Phổ thông tiết kiệm');
    expect(modal?.textContent).toContain('Phổ thông đặc biệt');
    expect(modal?.textContent).toContain('Thương gia linh hoạt');
  });

  it('BookingSeats chỉ cho phép chọn ghế trong khoang đã mua (ECONOMY), khóa ghế khoang khác', async () => {
    const fixture = TestBed.createComponent(BookingSeats);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Hàng 1 là BUSINESS → phải bị disabled khi khoang đã mua là ECONOMY
    const seat1B = el.querySelector('button[aria-label^="Ghế 1B"]') as HTMLButtonElement;
    expect(seat1B).not.toBeNull();
    expect(seat1B.disabled).toBe(true);

    // Hàng 3 là ECONOMY và AVAILABLE → chọn được
    const seat3A = el.querySelector('button[aria-label^="Ghế 3A"]') as HTMLButtonElement;
    expect(seat3A).not.toBeNull();
    expect(seat3A.disabled).toBe(false);
    seat3A.click();
    fixture.detectChanges();

    const flow = TestBed.inject(BookingFlowService);
    expect(flow.draftPassengers()[0].seat_code).toBe('3A');
  });

  it('BookingPassengers mở popup hành lý ký gửi và cập nhật gói hành lý cho hành khách', async () => {
    const fixture = TestBed.createComponent(BookingPassengers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const bagBtn = el.querySelector('.bp-bag-row button') as HTMLButtonElement;
    bagBtn.click();
    fixture.detectChanges();

    const modal = el.querySelector('.vf-modal-panel');
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain('Ký gửi tiêu chuẩn 23kg');
  });
});
