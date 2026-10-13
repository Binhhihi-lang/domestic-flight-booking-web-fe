import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminSeatConfigurations } from '@features/admin/pages/seat-configurations/seat-configurations';

/** Máy bay id 3 có seat_capacity = 180 trong mock. */
function setup(aircraftId: string) {
  return TestBed.configureTestingModule({
    imports: [AdminSeatConfigurations],
    providers: [
      provideRouter([]),
      MockRegistry,
      provideHttpClient(withInterceptors([mockInterceptor])),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: aircraftId }) } },
      },
    ],
  }).compileComponents();
}

describe('AdminSeatConfigurations (tích hợp mock)', () => {
  it('nạp đúng sức chứa của máy bay', async () => {
    await setup('3');
    const fixture = TestBed.createComponent(AdminSeatConfigurations);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('180');
    expect(text).toContain('VJ-A320-12');
  });

  it('chưa khai khối nào thì chưa lưu được', async () => {
    await setup('3');
    const fixture = TestBed.createComponent(AdminSeatConfigurations);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const saveBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Lưu sơ đồ ghế'),
    );
    expect(saveBtn?.disabled).toBe(true);
  });
});
