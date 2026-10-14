import { TestBed } from '@angular/core/testing';
import { FlightSearchCard, FlightSearchValue } from '@shared/components/flight-search-card/flight-search-card';

/**
 * Quy tắc số lượng hành khách.
 *
 * Vì sao test ở tầng component chứ không chỉ kiểm mắt: các giới hạn (tối đa 9,
 * em bé ≤ người lớn) là ràng buộc NGHIỆP VỤ — sai thì dữ liệu gửi lên backend
 * không hợp lệ, và lỗi chỉ lộ ra ở bước đặt chỗ (Phase 3) chứ không ở đây.
 */
describe('FlightSearchCard — số hành khách', () => {
  async function mount() {
    await TestBed.configureTestingModule({ imports: [FlightSearchCard] }).compileComponents();
    const fixture = TestBed.createComponent(FlightSearchCard);
    fixture.detectChanges();
    return fixture;
  }

  /** Truy cập state protected để kiểm tra logic đếm. */
  function cmp(fixture: ReturnType<typeof TestBed.createComponent>): any {
    return fixture.componentInstance as any;
  }

  it('mặc định 1 người lớn, 0 trẻ em, 0 em bé', async () => {
    const c = cmp(await mount());
    expect(c.adults()).toBe(1);
    expect(c.children()).toBe(0);
    expect(c.infants()).toBe(0);
    expect(c.total()).toBe(1);
  });

  it('KHÔNG cho giảm người lớn xuống 0', async () => {
    const c = cmp(await mount());
    c.changeCount('adults', -1);
    expect(c.adults()).toBe(1);
    expect(c.canRemoveAdult()).toBe(false);
  });

  it('KHÔNG cho tổng vượt 9', async () => {
    const c = cmp(await mount());
    for (let i = 0; i < 20; i++) {
      c.changeCount('adults', 1);
    }
    expect(c.total()).toBe(9);
    expect(c.canAddAdult()).toBe(false);
    expect(c.canAddChild()).toBe(false);
    expect(c.canAddInfant()).toBe(false);
  });

  it('KHÔNG cho số em bé vượt số người lớn', async () => {
    const c = cmp(await mount());
    // 1 người lớn -> tối đa 1 em bé
    c.changeCount('infants', 1);
    expect(c.infants()).toBe(1);

    c.changeCount('infants', 1);
    expect(c.infants()).toBe(1); // lần thứ hai bị chặn
    expect(c.canAddInfant()).toBe(false);
  });

  it('thêm người lớn thì mở lại chỗ cho em bé', async () => {
    const c = cmp(await mount());
    c.changeCount('infants', 1);
    expect(c.canAddInfant()).toBe(false);

    c.changeCount('adults', 1); // 2 người lớn
    expect(c.canAddInfant()).toBe(true);
    c.changeCount('infants', 1);
    expect(c.infants()).toBe(2);
  });

  it('GIẢM người lớn thì tự cắt em bé cho hợp lệ', async () => {
    const c = cmp(await mount());
    c.changeCount('adults', 1); // 2 người lớn
    c.changeCount('infants', 1);
    c.changeCount('infants', 1); // 2 em bé
    expect(c.infants()).toBe(2);

    c.changeCount('adults', -1); // còn 1 người lớn
    // 1 người lớn không thể đi cùng 2 em bé -> phải tự cắt còn 1.
    expect(c.infants()).toBe(1);
    expect(c.adults()).toBe(1);
  });

  it('nhãn tóm tắt liệt kê đúng loại đang có', async () => {
    const c = cmp(await mount());
    expect(c.summary()).toBe('1 người lớn');

    c.changeCount('children', 1);
    c.changeCount('infants', 1);
    expect(c.summary()).toBe('1 người lớn, 1 trẻ em, 1 em bé');
  });

  it('phát sự kiện kèm đủ số hành khách', async () => {
    const fixture = await mount();
    const c = cmp(fixture);
    c.changeCount('adults', 1);
    c.changeCount('children', 1);

    let emitted: FlightSearchValue | null = null;
    fixture.componentInstance.searched.subscribe((v) => (emitted = v));

    c.submit();

    expect(emitted).not.toBeNull();
    expect(emitted!.passengers).toEqual({ adults: 2, children: 1, infants: 0 });
  });
});
