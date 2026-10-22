import { TestBed } from '@angular/core/testing';
import { AircraftSeat, SeatType } from '@core/models/fleet-news.model';
import {
  SeatGrid,
  contrastRatio,
  relativeLuminance,
} from '@features/admin/pages/seat-configurations/seat-grid';

function seatType(id: number, cls: SeatType['seat_class'], color: string | null): SeatType {
  return {
    id,
    seat_type_code: `T${id}`,
    seat_type_name: `Loại ${id}`,
    seat_class: cls,
    color_hex: color,
    status: 'ACTIVE',
  };
}

function mount(seats: AircraftSeat[], seatTypes: SeatType[], aisleAfter: string | null = null) {
  TestBed.configureTestingModule({ imports: [SeatGrid] });
  const fixture = TestBed.createComponent(SeatGrid);
  fixture.componentRef.setInput('seats', seats);
  fixture.componentRef.setInput('seatTypes', seatTypes);
  fixture.componentRef.setInput('aisleAfter', aisleAfter);
  fixture.detectChanges();
  return fixture;
}

function firstCell(fixture: ReturnType<typeof mount>): HTMLButtonElement {
  return (fixture.nativeElement as HTMLElement).querySelector('button.cell') as HTMLButtonElement;
}

describe('SeatGrid — màu theo color_hex', () => {
  it('dùng color_hex khi có', () => {
    const f = mount(
      [{ seat_row: 1, seat_column: 'A', seat_type_id: 1 }],
      [seatType(1, 'ECONOMY', '#90CAF9')],
    );
    expect(firstCell(f).style.background).toBe('rgb(144, 202, 249)');
  });

  it('fallback theo seat_class khi color_hex null', () => {
    const f = mount(
      [{ seat_row: 1, seat_column: 'A', seat_type_id: 2 }],
      [seatType(2, 'BUSINESS', null)],
    );
    // CSS var chưa resolve trong test → style chứa đúng chuỗi khai báo.
    expect(firstCell(f).getAttribute('style')).toContain('--color-accent');
  });

  it('#90CAF9 là nền SÁNG → nếu có chữ thì phải là chữ tối', () => {
    expect(contrastRatio('#90CAF9', '#ffffff')).toBeLessThan(4.5);
  });

  it('#05285D là nền RẤT TỐI → chữ trắng', () => {
    expect(contrastRatio('#05285D', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('ô ghế KHÔNG hiện mã loại ghế (chữ tràn khỏi ô 40px)', () => {
    const f = mount(
      [{ seat_row: 1, seat_column: 'A', seat_type_id: 1 }],
      [seatType(1, 'ECONOMY', '#90CAF9')],
    );
    expect(firstCell(f).textContent?.trim()).toBe('');
  });

  it('có lối đi sau đúng cột đã cấu hình (3-3)', () => {
    const f = mount(
      ['A', 'B', 'C', 'D', 'E', 'F'].map((c) => ({
        seat_row: 1,
        seat_column: c,
        seat_type_id: 1,
      })),
      [seatType(1, 'ECONOMY', '#90CAF9')],
      'C',
    );
    expect((f.nativeElement as HTMLElement).querySelectorAll('.grid__aisle').length).toBe(1);
  });

  it('hỗ trợ 2 lối đi (3-2-2) khi cấu hình "C,E"', () => {
    const f = mount(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c) => ({
        seat_row: 1,
        seat_column: c,
        seat_type_id: 1,
      })),
      [seatType(1, 'ECONOMY', '#90CAF9')],
      'C,E',
    );
    expect((f.nativeElement as HTMLElement).querySelectorAll('.grid__aisle').length).toBe(2);
  });

  it('không có lối đi khi cấu hình null', () => {
    const f = mount(
      ['A', 'B', 'C', 'D'].map((c) => ({ seat_row: 1, seat_column: c, seat_type_id: 1 })),
      [seatType(1, 'ECONOMY', '#90CAF9')],
      null,
    );
    expect((f.nativeElement as HTMLElement).querySelectorAll('.grid__aisle').length).toBe(0);
  });

  it('legend chỉ gồm loại ghế CÓ MẶT trong sơ đồ', () => {
    const f = mount(
      [
        { seat_row: 1, seat_column: 'A', seat_type_id: 1 },
        { seat_row: 1, seat_column: 'B', seat_type_id: 2 },
      ],
      [
        seatType(1, 'ECONOMY', '#90CAF9'),
        seatType(2, 'BUSINESS', '#F9A825'),
        seatType(3, 'FIRST', '#6A1B9A'),
      ],
    );
    const names = [...(f.nativeElement as HTMLElement).querySelectorAll('.legend__name')].map(
      (el) => el.textContent?.trim(),
    );
    expect(names).toEqual(['Loại 1', 'Loại 2']);
  });

  it('aria-label dùng TÊN loại ghế, không phải mã', () => {
    const f = mount(
      [{ seat_row: 1, seat_column: 'A', seat_type_id: 1 }],
      [seatType(1, 'ECONOMY', '#90CAF9')],
    );
    expect(firstCell(f).getAttribute('aria-label')).toContain('Loại 1');
  });

  it('hàm tương phản có gamma linearization — #90CAF9 sáng hơn #1E88E5', () => {
    expect(relativeLuminance('#90CAF9')).toBeGreaterThan(relativeLuminance('#1E88E5'));
  });
});
