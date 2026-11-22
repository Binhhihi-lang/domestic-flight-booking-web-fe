import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AirlineService } from '@core/services/airline.service';
import {
  AirportService,
  FareClassService,
  PromotionService,
} from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { UploadService } from '@core/services/upload.service';
import { PromotionForm } from '@features/admin/pages/promotions/promotion-form';

describe('PromotionForm (real catalogs, pickers & upload)', () => {
  const mockPromotionService = {
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
              id: 10,
              airline_code: 'VN',
              airline_name: 'Vietnam Airlines',
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
              id: 20,
              airport_code: 'HAN',
              airport_name: 'Nội Bài',
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
              id: 30,
              airline_id: 10,
              airline_code: 'VN',
              airline_name: 'Vietnam Airlines',
              fare_class_code: 'VN_ECON_SAVER',
              fare_class_name: 'Phổ thông tiết kiệm',
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

  const mockUploadService = {
    uploadAdminImage: vi.fn(() =>
      of({ code: 1000, message: 'OK', data: { url: 'https://cdn.demo.local/promo-banner.jpg' } }),
    ),
  };

  const mockSnackBar = { open: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [PromotionForm],
      providers: [
        provideRouter([]),
        { provide: PromotionService, useValue: mockPromotionService },
        { provide: AirlineService, useValue: mockAirlineService },
        { provide: AirportService, useValue: mockAirportService },
        { provide: FareClassService, useValue: mockFareClassService },
        { provide: FlightAdminService, useValue: mockFlightService },
        { provide: UploadService, useValue: mockUploadService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();
  });

  it('nạp danh mục thật từ API và không còn chuyến bay cứng 101–104', () => {
    const fixture = TestBed.createComponent(PromotionForm);
    fixture.detectChanges();

    expect(mockAirlineService.list).toHaveBeenCalledWith({ page: 1, size: 100 });
    expect(mockAirportService.list).toHaveBeenCalledWith({ page: 1, size: 100 });
    expect(mockFareClassService.list).toHaveBeenCalledWith({ page: 1, size: 100 });

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('VN 165');
    expect(el.textContent).not.toContain('VJ 507');
    expect(el.querySelector('app-flight-search-picker')).not.toBeNull();
  });

  it('hiển thị SearchableSelect hạng vé với nhãn "Theo hạng vé" và định dạng mã — tên (hãng)', () => {
    const fixture = TestBed.createComponent(PromotionForm);
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      addScope: () => void;
      scopes: () => { key: number }[];
      setScopeType: (key: number, type: 'FARE_CLASS') => void;
      fareClassOptions: () => { value: number | string; label: string }[];
    };

    comp.addScope();
    const key = comp.scopes()[0].key;
    comp.setScopeType(key, 'FARE_CLASS');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Theo hạng vé');
    expect(el.querySelector('app-searchable-select')).not.toBeNull();
    expect(comp.fareClassOptions()).toEqual([
      {
        value: 30,
        label: 'VN_ECON_SAVER — Phổ thông tiết kiệm (VN)',
        sub: 'Vietnam Airlines',
        group: 'VN',
      },
    ]);
  });

  it('tải ảnh banner qua UploadService.uploadAdminImage thay vì base64', () => {
    const fixture = TestBed.createComponent(PromotionForm);
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      onPickImage: (e: Event) => void;
      draft: () => { image_url: string };
    };

    const file = new File(['img'], 'banner.png', { type: 'image/png' });
    const fakeInput = { files: [file], value: 'banner.png' } as unknown as HTMLInputElement;
    comp.onPickImage({ target: fakeInput } as unknown as Event);

    expect(mockUploadService.uploadAdminImage).toHaveBeenCalledWith(file);
    expect(comp.draft().image_url).toBe('https://cdn.demo.local/promo-banner.jpg');
  });
});
