import { TestBed } from '@angular/core/testing';
import {
  SearchableOption,
  SearchableSelect,
} from '@shared/components/searchable-select/searchable-select';

describe('SearchableSelect', () => {
  const OPTIONS: SearchableOption[] = [
    { value: 1, label: 'VN_ECO_SAVER · Phổ thông tiết kiệm', sub: 'Vietnam Airlines' },
    { value: 2, label: 'VN_BIZ_FLEX · Thương gia linh hoạt', sub: 'Vietnam Airlines' },
    { value: 3, label: 'VJ_ECO · Phổ thông Vietjet', sub: 'Vietjet Air' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchableSelect],
    }).compileComponents();
  });

  it('lọc tiếng Việt không dấu và phát valueChange khi chọn', () => {
    const fixture = TestBed.createComponent(SearchableSelect);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();

    const picked: Array<string | number | null> = [];
    fixture.componentInstance.valueChange.subscribe((v) => picked.push(v));

    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button.ssel__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    const search = el.querySelector('.ssel__search input') as HTMLInputElement;
    search.value = 'thuong gia';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const opts = el.querySelectorAll('button.ssel__opt');
    expect(opts.length).toBe(1);
    expect(opts[0].textContent).toContain('VN_BIZ_FLEX');

    (opts[0] as HTMLButtonElement).click();
    expect(picked).toEqual([2]);
  });

  it('nút xóa phát valueChange(null) khi đang có giá trị', () => {
    const fixture = TestBed.createComponent(SearchableSelect);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.componentRef.setInput('value', 3);
    fixture.detectChanges();

    const picked: Array<string | number | null> = [];
    fixture.componentInstance.valueChange.subscribe((v) => picked.push(v));

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ssel__trigger')?.textContent).toContain('VJ_ECO');

    const clearBtn = el.querySelector('.ssel__clear') as HTMLElement;
    clearBtn.click();
    expect(picked).toEqual([null]);
  });
});
