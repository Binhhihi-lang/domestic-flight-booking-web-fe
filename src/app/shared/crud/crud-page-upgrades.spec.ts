import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BaseCrudService } from '@core/services/base-crud.service';
import { CrudConfig } from '@shared/crud/crud-config';
import { CrudPage } from '@shared/crud/crud-page';

interface DummyRow {
  id: number;
  code: string;
  name: string;
  trip_type: string;
  category_ids: number[];
  start_at: string;
  is_admin?: boolean;
}

describe('CrudPage upgrades (Cụm 1B)', () => {
  const sampleRow: DummyRow = {
    id: 10,
    code: 'VN_ECO',
    name: 'Hạng phổ thông',
    trip_type: 'ROUND_TRIP',
    category_ids: [1, 2],
    start_at: '2026-10-15T08:30:00',
    is_admin: true,
  };

  const baseConfig: CrudConfig<DummyRow, Partial<DummyRow>> = {
    title: 'Mẫu thử',
    subtitle: 'Mô tả',
    createLabel: 'Thêm mẫu',
    searchPlaceholder: 'Tìm kiếm…',
    disableBulk: true,
    hideDelete: (r) => Boolean(r.is_admin),
    emptyIcon: 'inbox',
    emptyMessage: 'Trống',
    emptyHint: 'Thêm mới',
    editTitle: 'Sửa mẫu',
    deleteTitle: () => 'Xóa?',
    deleteMessage: () => 'Chắc chắn?',
    columns: [
      { label: 'Mã', value: (r) => r.code, kind: 'code' },
      { label: 'Tên', value: (r) => r.name },
    ],
    fields: [
      { key: 'code', label: 'Mã', type: 'text', required: true, createOnly: true, shownInTable: true },
      { key: 'name', label: 'Tên', type: 'text', required: true, shownInTable: true },
      {
        key: 'trip_type',
        label: 'Loại hành trình',
        type: 'select',
        options: [
          { value: 'ONE_WAY', label: 'Một chiều' },
          { value: 'ROUND_TRIP', label: 'Khứ hồi' },
        ],
      },
      {
        key: 'category_ids',
        label: 'Danh mục',
        type: 'multiselect',
        options: [
          { value: 1, label: 'Khuyến mãi' },
          { value: 2, label: 'Cẩm nang' },
        ],
      },
      { key: 'start_at', label: 'Thời gian bắt đầu', type: 'datetime-local' },
    ],
  };

  function mockService() {
    return {
      list: vi.fn(() =>
        of({
          code: 1000,
          message: 'OK',
          data: {
            items: [sampleRow],
            pagination: { page: 1, size: 10, total_items: 1, total_pages: 1 },
          },
        }),
      ),
      getById: vi.fn(() => of({ code: 1000, message: 'OK', data: sampleRow })),
      update: vi.fn(() => of({ code: 1000, message: 'Đã cập nhật', data: sampleRow })),
      create: vi.fn(() => of({ code: 1000, message: 'Đã tạo', data: sampleRow })),
      remove: vi.fn(() => of({ code: 1000, message: 'Đã xóa', data: null })),
    } as unknown as BaseCrudService<DummyRow, Partial<DummyRow>>;
  }

  it('disableBulk ẩn cột checkbox và hideDelete ẩn nút Xóa trên dòng khớp điều kiện', async () => {
    const svc = mockService();
    await TestBed.configureTestingModule({
      imports: [CrudPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ mode: 'list' }),
            snapshot: { paramMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CrudPage<DummyRow, Partial<DummyRow>>);
    fixture.componentRef.setInput('config', baseConfig);
    fixture.componentRef.setInput('service', svc);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.col-check').length).toBe(0);
    expect(el.querySelector('.rowbtn--danger')).toBeNull();
    expect(el.querySelector('.adm-filter--card')).not.toBeNull();
    expect(el.querySelector('.adm-listcard')).not.toBeNull();
  });

  it('chế độ edit hiển thị trường createOnly ở trạng thái disabled và giữ nguyên giá trị trong payload PUT', async () => {
    const svc = mockService();
    await TestBed.configureTestingModule({
      imports: [CrudPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ mode: 'form' }),
            snapshot: { paramMap: convertToParamMap({ id: '10' }) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CrudPage<DummyRow, Partial<DummyRow>>);
    fixture.componentRef.setInput('config', baseConfig);
    fixture.componentRef.setInput('service', svc);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const codeInput = el.querySelector('#cf-code') as HTMLInputElement;
    expect(codeInput).not.toBeNull();
    expect(codeInput.disabled).toBe(true);

    const dtInput = el.querySelector('#cf-start_at') as HTMLInputElement;
    expect(dtInput.type).toBe('datetime-local');

    (fixture.componentInstance as unknown as { save: () => void }).save();
    expect(svc.update).toHaveBeenCalledTimes(1);
    const [, payload] = (svc.update as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(payload.code).toBe('VN_ECO');
    expect(payload.start_at).toBe('2026-10-15T08:30:00');
    expect(payload.category_ids).toEqual([1, 2]);
  });

  it('chế độ detail ánh xạ nhãn tiếng Việt cho select và multiselect thay vì in raw enum', async () => {
    const svc = mockService();
    await TestBed.configureTestingModule({
      imports: [CrudPage],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ mode: 'detail' }),
            snapshot: { paramMap: convertToParamMap({ id: '10' }) },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CrudPage<DummyRow, Partial<DummyRow>>);
    fixture.componentRef.setInput('config', baseConfig);
    fixture.componentRef.setInput('service', svc);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Khứ hồi');
    expect(text).not.toContain('ROUND_TRIP');
    expect(text).toContain('Khuyến mãi, Cẩm nang');
  });
});
