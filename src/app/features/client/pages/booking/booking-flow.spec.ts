import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { BookingPassengers } from '@features/client/pages/booking/booking-passengers';
import { BookingSeats } from '@features/client/pages/booking/booking-seats';
import { FlightResults } from '@features/client/pages/flight-results/flight-results';

describe('Luồng Đặt vé Khách hàng Bước 1–3 (Cụm 5A)', () => {
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

  it('FlightResults tải danh sách chuyến và mở modal 3 tầng (tab khoang, thẻ hạng vé, bảng so sánh, gợi ý nâng hạng)', async () => {
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
    expect(modal?.querySelectorAll('.cabtab').length).toBeGreaterThanOrEqual(2);
    expect(modal?.querySelectorAll('.fdcol').length).toBeGreaterThanOrEqual(1);

    const table = modal?.querySelector('table.fr-compare-table');
    expect(table).not.toBeNull();
    expect(table?.textContent).toContain('Giá vé');
    expect(table?.textContent).toContain('Hành lý xách tay');
    expect(table?.textContent).toContain('Hành lý ký gửi');
    expect(table?.textContent).toContain('Đổi vé');
    expect(table?.textContent).toContain('Hoàn vé');
    expect(table?.textContent).toContain('Chọn ghế');
    expect(table?.textContent).toContain('Phổ thông tiết kiệm');

    // Chuyển tab sang Thương gia để kiểm tra lọc theo khoang
    const tabs = modal?.querySelectorAll('.cabtab') as NodeListOf<HTMLButtonElement>;
    const bizTab = Array.from(tabs).find((t) => t.textContent?.includes('Thương gia'));
    expect(bizTab).toBeTruthy();
    bizTab!.click();
    fixture.detectChanges();
    expect(modal?.querySelector('table.fr-compare-table')?.textContent).toContain('Thương gia linh hoạt');
  });

  it('BookingSeats chỉ render ghế thuộc khoang đã mua (ECONOMY), ẩn hoàn toàn ghế BUSINESS khỏi DOM', async () => {
    const fixture = TestBed.createComponent(BookingSeats);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Stepper 5 bước chuẩn (không lặp số)
    expect(el.textContent).toContain('Chọn chuyến');
    expect(el.textContent).toContain('Chọn ghế');
    expect(el.textContent).toContain('Hành khách');
    expect(el.textContent).toContain('Xem lại');
    expect(el.textContent).toContain('Thanh toán');
    expect(el.textContent).not.toContain('2. Chọn ghế');

    // Hàng 1 là BUSINESS và Hàng 2 là PREMIUM_ECONOMY → KHÔNG ĐƯỢC render trong DOM
    const seat1B = el.querySelector('button[aria-label^="Ghế 1B"]');
    const seat2A = el.querySelector('button[aria-label^="Ghế 2A"]');
    expect(seat1B).toBeNull();
    expect(seat2A).toBeNull();

    // Hàng 3 là ECONOMY và AVAILABLE → hiển thị và chọn được
    const seat3A = el.querySelector('button[aria-label^="Ghế 3A"]') as HTMLButtonElement;
    expect(seat3A).not.toBeNull();
    expect(seat3A.disabled).toBe(false);
    seat3A.click();
    fixture.detectChanges();

    const flow = TestBed.inject(BookingFlowService);
    expect(flow.draftPassengers()[0].seat_code).toBe('3A');
    expect(el.textContent).toContain('Chú thích loại ghế & phụ thu');
  });

  it('BookingPassengers mở popup hành lý ký gửi chia 2 cột, chọn gói và tăng số lượng kiện', async () => {
    const fixture = TestBed.createComponent(BookingPassengers);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 600));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Không tự điền dữ liệu giả cho hành khách mới
    expect(el.textContent).toContain('Chưa nhập thông tin');

    // Mở popup hành lý từ card Hành lý ký gửi theo chặng (W-RT-04)
    const bagCard = el.querySelector('.bagf__c') as HTMLElement;
    expect(bagCard).not.toBeNull();
    bagCard.click();
    fixture.detectChanges();

    const modal = el.querySelector('.vf-modal-panel');
    expect(modal).not.toBeNull();
    expect(modal?.querySelector('.bagsplit')).not.toBeNull();
    expect(modal?.textContent).toContain('Ký gửi tiêu chuẩn 23kg');

    // Chọn gói hành lý đầu tiên và tăng số lượng lên 2
    const pickBtns = modal?.querySelectorAll('.bp-bag-opt__pick') as NodeListOf<HTMLButtonElement>;
    expect(pickBtns.length).toBeGreaterThan(0);
    pickBtns[0].click();
    fixture.detectChanges();

    const incBtn = modal?.querySelector('button[aria-label="Tăng số kiện"]') as HTMLButtonElement;
    expect(incBtn).not.toBeNull();
    incBtn.click();
    fixture.detectChanges();

    const flow = TestBed.inject(BookingFlowService);
    expect(flow.draftPassengers()[0].baggage_option_id).not.toBeNull();
    expect(flow.draftPassengers()[0].baggage_price).toBeGreaterThan(0);
  });
});
