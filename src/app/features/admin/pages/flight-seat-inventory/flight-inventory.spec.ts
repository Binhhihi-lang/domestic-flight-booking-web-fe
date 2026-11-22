import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { ApiResponse } from '@core/models/api-response.model';
import { FlightSeatMap } from '@core/models/flight.model';
import { AdminFlightSeatInventory } from '@features/admin/pages/flight-seat-inventory/flight-seat-inventory';

describe('AdminFlightSeatInventory (Tồn ghế chuyến bay — Cụm DA2.2 / 3A)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFlightSeatInventory],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();
  });

  it('render sơ đồ tồn ghế theo khoang với đầu máy bay, FlightSearchPicker và 4 chỉ số', async () => {
    const fixture = TestBed.createComponent(AdminFlightSeatInventory);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 900));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toContain('VN-210');
    expect(text).toContain('Đầu máy bay');
    expect(text).toContain('Tổng');
    expect(text).toContain('Trống');
    expect(text).toContain('Đang giữ');
    expect(text).toContain('Đã bán');
    expect(text).toContain('Khoá');
    expect(text).toContain('Đồng bộ từ sơ đồ');
    expect(el.querySelector('app-flight-search-picker')).toBeTruthy();
    expect(el.querySelectorAll('button.inv-seat').length).toBe(36);
  });

  it('MockRegistry cho phép khóa ghế trống, mở khóa ghế đã khóa và chặn khóa ghế đã đặt', () => {
    const registry = new MockRegistry();
    const mapRes = registry.resolve(
      'GET',
      '/api/admin/flights/101/seat-map',
    ) as ApiResponse<FlightSeatMap>;
    const availSeat = mapRes.data.seats.find((s) => s.status === 'AVAILABLE')!;
    const bookedSeat = mapRes.data.seats.find((s) => s.status === 'BOOKED')!;

    const blockRes = registry.resolve(
      'POST',
      `/api/admin/flight-seats/${availSeat.id}/block`,
      {},
    ) as ApiResponse<null>;
    expect(blockRes.code).toBe(1000);

    const afterBlock = registry.resolve(
      'GET',
      '/api/admin/flights/101/seat-map',
    ) as ApiResponse<FlightSeatMap>;
    expect(afterBlock.data.blocked_seats).toBe(mapRes.data.blocked_seats + 1);

    const unblockRes = registry.resolve(
      'POST',
      `/api/admin/flight-seats/${availSeat.id}/unblock`,
      {},
    ) as ApiResponse<null>;
    expect(unblockRes.code).toBe(1000);

    const rejectBooked = registry.resolve(
      'POST',
      `/api/admin/flight-seats/${bookedSeat.id}/block`,
      {},
    ) as ApiResponse<null>;
    expect(rejectBooked.code).toBe(1006);
  });

  it('MockRegistry cập nhật được phụ thu ghế theo chuyến qua PUT seat-inventory', () => {
    const registry = new MockRegistry();
    const before = registry.resolve(
      'GET',
      '/api/admin/flights/101/seat-map',
    ) as ApiResponse<FlightSeatMap>;
    const seat = before.data.seats.find((s) => s.seat_code === '3A')!;

    const updated = registry.resolve('PUT', '/api/admin/flights/101/seat-inventory', {
      seats: [{ flight_seat_id: seat.id, seat_code: '3A', seat_surcharge: 95000 }],
    }) as ApiResponse<FlightSeatMap>;

    expect(updated.code).toBe(1000);
    expect(updated.data.seats.find((s) => s.seat_code === '3A')?.seat_surcharge).toBe(95000);
  });
});
