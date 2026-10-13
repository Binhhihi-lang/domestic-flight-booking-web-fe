import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockRegistry } from '@core/mock/mock-registry';
import { mockInterceptor } from '@core/mock/mock.interceptor';
import { AdminAirlines } from '@features/admin/pages/airlines/airlines';

/**
 * Thao tác hàng loạt trên bảng danh sách.
 *
 * Vì sao cần test riêng: đây là luồng nhiều bước (chọn -> hiện thanh -> gọi API
 * tuần tự -> đếm thành công/thất bại) mà mắt thường khó thấy hết. Chỗ dễ sai
 * nhất là chọn nhầm hàng sau khi danh sách tải lại — nên có test cho việc đó.
 */
describe('AdminAirlines — thao tác hàng loạt', () => {
  async function mount() {
    await TestBed.configureTestingModule({
      imports: [AdminAirlines],
      providers: [
        provideRouter([]),
        MockRegistry,
        provideHttpClient(withInterceptors([mockInterceptor])),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AdminAirlines);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 700));
    fixture.detectChanges();
    return fixture;
  }

  /** Truy cập state của CrudPage con để kiểm tra logic chọn. */
  function crudOf(fixture: ReturnType<typeof TestBed.createComponent>): any {
    return fixture.debugElement.children.map((c) => c.componentInstance).find((c: any) => 'selectedIds' in c);
  }

  it('chưa chọn gì thì KHÔNG hiện thanh hàng loạt', async () => {
    const fixture = await mount();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.bulkbar')).toBeNull();
  });

  it('render đủ checkbox: 1 ở đầu bảng + 1 mỗi hàng', async () => {
    const fixture = await mount();
    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('tbody tr').length;
    expect(el.querySelectorAll('thead .col-check input').length).toBe(1);
    expect(el.querySelectorAll('tbody .col-check input').length).toBe(rows);
  });

  it('chọn một hàng thì hiện thanh hàng loạt với đúng số lượng', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);
    const firstId = crud.rows()[0].id;

    crud.toggleRow(firstId, new Event('click'));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.bulkbar')).not.toBeNull();
    expect(el.querySelector('.bulkbar__n')?.textContent).toContain('1');
  });

  it('bỏ chọn hết thì thanh hàng loạt ẩn lại', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);
    crud.toggleRow(crud.rows()[0].id, new Event('click'));
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.bulkbar')).not.toBeNull();

    crud.clearSelection();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.bulkbar')).toBeNull();
  });

  it('chọn tất cả chỉ áp cho TRANG HIỆN TẠI', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);
    const onPage = crud.rows().length;

    crud.toggleAllOnPage(new Event('click'));
    fixture.detectChanges();

    expect(crud.selectedIds().size).toBe(onPage);
    expect(crud.allOnPageSelected()).toBe(true);
  });

  it('bulkSetActive(false) đổi is_active của các hàng đã chọn', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);
    const ids = crud.rows().slice(0, 2).map((r: any) => r.id);
    ids.forEach((id: number) => crud.toggleRow(id, new Event('click')));

    crud.bulkSetActive(false);
    await new Promise((r) => setTimeout(r, 1500));
    fixture.detectChanges();

    const updated = crud.rows().filter((r: any) => ids.includes(r.id));
    expect(updated.every((r: any) => r.is_active === false)).toBe(true);
    // Chọn xong thì phải bỏ chọn, không giữ trạng thái chọn cũ.
    expect(crud.selectedIds().size).toBe(0);
  });

  it('xóa hàng loạt: hộp thoại xác nhận hiện và bản ghi biến mất sau khi đồng ý', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);
    const doomed = crud.rows()[0].id;
    crud.toggleRow(doomed, new Event('click'));

    crud.bulkDelete();
    // Hộp thoại xác nhận mở ra — đồng ý.
    await new Promise((r) => setTimeout(r, 300));
    const dlg = document.querySelector('.mat-mdc-dialog-container, mat-dialog-container');
    expect(dlg).not.toBeNull();

    const confirm = [...(dlg?.querySelectorAll('button') ?? [])].find((b) =>
      b.textContent?.trim() === 'Xóa',
    );
    (confirm as HTMLElement | undefined)?.click();
    await new Promise((r) => setTimeout(r, 1500));
    fixture.detectChanges();

    expect(crud.rows().some((r: any) => r.id === doomed)).toBe(false);
  });

  it('KHÔNG xóa gì nếu người dùng bấm Hủy ở hộp thoại', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);
    const before = crud.rows().length;
    crud.toggleRow(crud.rows()[0].id, new Event('click'));

    crud.bulkDelete();
    await new Promise((r) => setTimeout(r, 300));
    const dlg = document.querySelector('.mat-mdc-dialog-container, mat-dialog-container');
    const cancel = [...(dlg?.querySelectorAll('button') ?? [])].find((b) =>
      b.textContent?.trim() === 'Hủy',
    );
    (cancel as HTMLElement | undefined)?.click();
    await new Promise((r) => setTimeout(r, 900));
    fixture.detectChanges();

    // Danh sách giữ nguyên, và hàng vẫn đang được chọn (người dùng chưa quyết).
    expect(crud.rows().length).toBe(before);
    expect(crud.selectedIds().size).toBe(1);
  });

  it('bỏ chọn id KHÔNG còn trong danh sách sau khi tải lại', async () => {
    const fixture = await mount();
    const crud = crudOf(fixture);

    // Chọn một hàng có thật, rồi thêm một id "ma" (không có trong danh sách).
    // Id ma mô phỏng trường hợp bản ghi bị người khác xóa giữa lúc ta đang xem.
    crud.toggleRow(crud.rows()[0].id, new Event('click'));
    const ghostId = 999999;
    crud.selectedIds.set(new Set([...crud.selectedIds(), ghostId]));
    expect(crud.selectedIds().has(ghostId)).toBe(true);

    // Tải lại danh sách — quá trình này phải tự bỏ id không còn tồn tại.
    // Nếu không, thao tác hàng loạt sau đó sẽ gửi id đã chết lên server.
    (crud as unknown as { load: () => void }).load();
    await new Promise((r) => setTimeout(r, 900));

    expect(crud.selectedIds().has(ghostId)).toBe(false);
  });
});
