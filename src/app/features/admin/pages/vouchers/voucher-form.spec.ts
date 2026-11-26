import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AirlineService } from '@core/services/airline.service';
import {
  AirportService,
  FareClassService,
  VoucherService,
} from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { VoucherForm } from '@features/admin/pages/vouchers/voucher-form';

describe('VoucherForm (real catalogs & FlightSearchPicker)', () => {
  const mockVoucherService = {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockAirlineService = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: [
            {
              id: 11,
              airline_code: 'VJ',
              airline_name: 'Vietjet Air',
              country: 'VN',
              logo_url: null,
              status: 'ACTIVE' as const,
            },
          ],
          pagination: { page: 1, size: 100, total_items: 1, total_pages: 1 },
        },
      }),
    ),
  };

  const mockAirportService = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: [
            {
              id: 21,
              airport_code: 'SGN',
              airport_name: 'Tân Sơn Nhất',
              latitude: null,
              longitude: null,
              status: 'ACTIVE' as const,
            },
          ],
          pagination: { page: 1, size: 100, total_items: 1, total_pages: 1 },
        },
      }),
    ),
  };

  const mockFareClassService = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: [
            {
              id: 31,
              airline_id: 11,
              airline_code: 'VJ',
              airline_name: 'Vietjet Air',
              fare_class_code: 'VJ_ECO',
              fare_class_name: 'Eco',
              seat_class: 'ECONOMY' as const,
              status: 'ACTIVE' as const,
            },
          ],
          pagination: { page: 1, size: 100, total_items: 1, total_pages: 1 },
        },
      }),
    ),
  };

  const mockFlightService = {
    list: vi.fn(() =>
      of({
        code: 1000,
        message: 'OK',
        data: {
          items: [],
          pagination: { page: 1, size: 20, total_items: 0, total_pages: 0 },
        },
      }),
    ),
    getById: vi.fn(),
  };

  const mockSnackBar = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [VoucherForm],
      providers: [
        provideRouter([]),
        { provide: VoucherService, useValue: mockVoucherService },
        { provide: AirlineService, useValue: mockAirlineService },
        { provide: AirportService, useValue: mockAirportService },
        { provide: FareClassService, useValue: mockFareClassService },
        { provide: FlightAdminService, useValue: mockFlightService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();
  });

  it('nạp danh mục thật từ API và dùng FlightSearchPicker cho loại trừ chuyến bay', () => {
    const fixture = TestBed.createComponent(VoucherForm);
    fixture.detectChanges();

    expect(mockAirlineService.list).toHaveBeenCalledWith({ page: 1, size: 100 });
    expect(mockAirportService.list).toHaveBeenCalledWith({ page: 1, size: 100 });
    expect(mockFareClassService.list).toHaveBeenCalledWith({ page: 1, size: 100 });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('VN 165');
    expect(el.textContent).not.toContain('QH 205');
    expect(el.querySelector('app-flight-search-picker')).not.toBeNull();
  });

  it('hiển thị SearchableSelect cho FARE_CLASS với nhãn "Theo hạng vé"', () => {
    const fixture = TestBed.createComponent(VoucherForm);
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      addScope: () => void;
      scopes: () => { key: number }[];
      setScopeType: (key: number, type: 'FARE_CLASS' | 'FLIGHT') => void;
    };

    comp.addScope();
    const key = comp.scopes()[0].key;
    comp.setScopeType(key, 'FARE_CLASS');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Theo hạng vé');
    expect(el.querySelector('app-searchable-select')).not.toBeNull();

    // Chuyển sang FLIGHT -> render thêm FlightSearchPicker đơn lẻ
    comp.setScopeType(key, 'FLIGHT');
    fixture.detectChanges();
    expect(el.querySelectorAll('app-flight-search-picker').length).toBe(2);
  });
});
