import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { FLIGHTS_MOCK } from '@core/mock/data/flights.mock';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { FlightSearchPicker } from '@shared/components/flight-search-picker/flight-search-picker';

describe('FlightSearchPicker', () => {
  const flightServiceMock = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: FLIGHTS_MOCK.slice(0, 2),
          pagination: { page: 1, size: 20, total_items: 2, total_pages: 1 },
        },
      }),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [FlightSearchPicker],
      providers: [{ provide: FlightAdminService, useValue: flightServiceMock }],
    }).compileComponents();
  });

  it('chế độ đơn (multiple=false) tìm và chọn 1 chuyến bay', () => {
    const fixture = TestBed.createComponent(FlightSearchPicker);
    fixture.detectChanges();

    const emittedIds: Array<number | null> = [];
    fixture.componentInstance.selectedIdChange.subscribe((id) => emittedIds.push(id));

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('input.fsp__input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(flightServiceMock.list).toHaveBeenCalledTimes(1);
    const firstOpt = el.querySelector('button.fsp__opt') as HTMLButtonElement;
    expect(firstOpt).not.toBeNull();
    firstOpt.click();
    fixture.detectChanges();

    expect(emittedIds).toEqual([FLIGHTS_MOCK[0].id]);
  });

  it('chế độ nhiều (multiple=true) hiển thị chip và xóa chip khi bấm ×', () => {
    const fixture = TestBed.createComponent(FlightSearchPicker);
    const id = FLIGHTS_MOCK[0].id;
    fixture.componentRef.setInput('multiple', true);
    fixture.componentRef.setInput('selectedIds', [id]);
    fixture.componentRef.setInput('selectedLabels', { [id]: 'VN210 · HAN → SGN' });
    fixture.detectChanges();

    const emitted: number[][] = [];
    fixture.componentInstance.selectedIdsChange.subscribe((ids) => emitted.push(ids));

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('VN210 · HAN → SGN');

    const delBtn = el.querySelector('button.fsp__chip-del') as HTMLButtonElement;
    delBtn.click();
    expect(emitted).toEqual([[]]);
  });
});
