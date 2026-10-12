import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, ListQuery, PageData } from '@core/models/api-response.model';

/**
 * Service CRUD tổng quát cho các module master data.
 *
 * Vì sao cần lớp này: 7 module master data (Airline, City, Airport, Aircraft,
 * Promotion, Voucher, News) có cùng một dạng thao tác. Viết một lần rồi cho
 * các module con kế thừa — chỉ khai đường dẫn — thay vì lặp lại 7 lần.
 *
 * Không chứa logic riêng của module nào; module nào cần thêm thì viết ở lớp con.
 */
export class BaseCrudService<T, P = Partial<T>> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl: string;

  constructor(private readonly resourcePath: string) {
    // Gán trong thân constructor, không khởi tạo ở khai báo field: field
    // initializer chạy TRƯỚC khi tham số constructor được gán, nên
    // `this.resourcePath` lúc đó còn undefined.
    this.baseUrl = `${environment.apiBaseUrl}/${resourcePath}`;
  }

  /** Danh sách có phân trang, lọc, sắp xếp (mục 1.6 API v0.2). */
  list(query: ListQuery = {}): Observable<ApiResponse<PageData<T>>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiResponse<PageData<T>>>(this.baseUrl, { params });
  }

  /**
   * Danh sách KHÔNG phân trang — trả MẢNG TRẦN (BR-LIST-05).
   *
   * Vì sao tách khỏi `list()` thay vì nới kiểu của nó: 8 module master data đang
   * dùng `list()` với kiểu `PageData<T>`, nới kiểu sẽ buộc mọi call site phải xử
   * lý cả hai hình dạng. Chỉ role và permission trả mảng trần, nên để chúng một
   * đường riêng. Màn dùng nó khai `unpaginated: true` trong `CrudConfig`.
   */
  listAll(): Observable<ApiResponse<T[]>> {
    return this.http.get<ApiResponse<T[]>>(this.baseUrl);
  }

  getById(id: number): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${id}`);
  }

  create(payload: P): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.baseUrl, payload);
  }

  update(id: number, payload: P): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}/${id}`, payload);
  }

  /** Xóa mềm — DB v0.4 giữ bản ghi lại để tra lịch sử. */
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
