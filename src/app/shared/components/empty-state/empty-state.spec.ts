import { TestBed } from '@angular/core/testing';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyState],
    }).compileComponents();
  });

  it('hiển thị thông điệp mặc định khi không có input', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Không có dữ liệu');
  });

  it('hiển thị thông điệp và gợi ý truyền vào', async () => {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('message', 'Chưa có chuyến bay');
    fixture.componentRef.setInput('hint', 'Thử đổi ngày hoặc điểm đến');
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Chưa có chuyến bay');
    expect(compiled.textContent).toContain('Thử đổi ngày hoặc điểm đến');
  });
});
