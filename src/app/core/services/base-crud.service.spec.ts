import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Airline } from '@core/models/airline.model';
import { BaseCrudService } from '@core/services/base-crud.service';

class AirlineService extends BaseCrudService<Airline> {
  constructor() {
    super('airlines');
  }
}

describe('BaseCrudService', () => {
  let service: AirlineService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AirlineService],
    });
    service = TestBed.inject(AirlineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('gọi đúng đường dẫn danh sách', () => {
    service.list().subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/v1/airlines');
    expect(req.request.method).toBe('GET');
    req.flush({ code: 1000, message: 'Success', data: { items: [], pagination: {} } });
  });

  it('truyền tham số lọc và phân trang lên query string', () => {
    service.list({ page: 2, size: 10, keyword: 'viet' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === 'http://localhost:8080/api/v1/airlines');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('keyword')).toBe('viet');
    req.flush({ code: 1000, message: 'Success', data: { items: [], pagination: {} } });
  });

  it('gọi đúng đường dẫn chi tiết theo id', () => {
    service.getById(7).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines/7');
    expect(req.request.method).toBe('GET');
    req.flush({ code: 1000, message: 'Success', data: null });
  });

  it('gửi POST khi tạo mới', () => {
    service.create({ airline_code: 'XX' } as Partial<Airline>).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ airline_code: 'XX' });
    req.flush({ code: 1000, message: 'Success', data: null });
  });

  it('gửi PUT khi cập nhật', () => {
    service.update(7, { airline_name: 'Mới' } as Partial<Airline>).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines/7');
    expect(req.request.method).toBe('PUT');
    req.flush({ code: 1000, message: 'Success', data: null });
  });

  it('gửi DELETE khi xóa', () => {
    service.remove(7).subscribe();
    const req = httpMock.expectOne('http://localhost:8080/api/v1/airlines/7');
    expect(req.request.method).toBe('DELETE');
    req.flush({ code: 1000, message: 'Success', data: null });
  });
});
