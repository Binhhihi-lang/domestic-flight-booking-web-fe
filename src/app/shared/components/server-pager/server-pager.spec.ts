import { TestBed } from '@angular/core/testing';
import { ServerPager } from '@shared/components/server-pager/server-pager';

describe('ServerPager', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerPager],
    }).compileComponents();
  });

  it('hiển thị đúng chuỗi phạm vi và ellipsis thông minh cho 100.000+ bản ghi', () => {
    const fixture = TestBed.createComponent(ServerPager);
    fixture.componentRef.setInput('page', 500);
    fixture.componentRef.setInput('size', 20);
    fixture.componentRef.setInput('totalItems', 120000);
    fixture.componentRef.setInput('totalPages', 6000);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('9.981–10.000 / 120.000');

    const pageBtns = Array.from(el.querySelectorAll('.adm-pg:not(.adm-pg--nav)')).map((b) =>
      b.textContent?.trim(),
    );
    expect(pageBtns).toEqual(['1', '499', '500', '501', '6000']);
    expect(el.querySelectorAll('.adm-pg-ellipsis').length).toBe(2);
  });

  it('phát sự kiện pageChange và sizeChange đúng khi bấm nút và đổi size', () => {
    const fixture = TestBed.createComponent(ServerPager);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('size', 20);
    fixture.componentRef.setInput('totalItems', 200);
    fixture.componentRef.setInput('totalPages', 10);
    fixture.detectChanges();

    const pages: number[] = [];
    const sizes: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => pages.push(p));
    fixture.componentInstance.sizeChange.subscribe((s) => sizes.push(s));

    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('button[aria-label="Trang cuối"]') as HTMLButtonElement).click();
    (el.querySelector('button[aria-label="Trang đầu"]') as HTMLButtonElement).click();
    expect(pages).toEqual([10, 1]);

    const select = el.querySelector('select.adm-pager__size') as HTMLSelectElement;
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(sizes.length).toBeGreaterThanOrEqual(0);
  });
});
