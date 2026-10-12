import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, ListQuery } from '@core/models/api-response.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Aircraft, NewsCategory, NewsItem, SeatType } from '@core/models/fleet-news.model';
import { Airport, City } from '@core/models/location.model';
import { Promotion, Voucher } from '@core/models/promotion.model';
import { Permission, Role } from '@core/models/rbac.model';

/**
 * Service CRUD cho các module master data.
 *
 * Vì sao gom nhiều service nhỏ vào một file: mỗi lớp chỉ có một constructor
 * gọi `super('đường-dẫn')` — tách thành 8 file thì phải mở 8 chỗ để đối chiếu
 * đường dẫn với API v0.2. Một file giúp thấy ngay module nào trỏ vào đâu.
 */
@Injectable({ providedIn: 'root' })
export class CityService extends BaseCrudService<City> {
  constructor() {
    super('cities');
  }
}

@Injectable({ providedIn: 'root' })
export class AirportService extends BaseCrudService<Airport> {
  constructor() {
    super('airports');
  }
}

@Injectable({ providedIn: 'root' })
export class PromotionService extends BaseCrudService<Promotion> {
  constructor() {
    super('promotions');
  }
}

@Injectable({ providedIn: 'root' })
export class VoucherService extends BaseCrudService<Voucher> {
  constructor() {
    super('vouchers');
  }
}

@Injectable({ providedIn: 'root' })
export class AircraftService extends BaseCrudService<Aircraft> {
  constructor() {
    super('aircrafts');
  }
}

@Injectable({ providedIn: 'root' })
export class SeatTypeService extends BaseCrudService<SeatType> {
  constructor() {
    super('seat-types');
  }
}

@Injectable({ providedIn: 'root' })
export class NewsService extends BaseCrudService<NewsItem> {
  constructor() {
    super('news');
  }
}

@Injectable({ providedIn: 'root' })
export class NewsCategoryService extends BaseCrudService<NewsCategory> {
  constructor() {
    super('news-categories');
  }
}

/**
 * Vai trò và quyền — CHỈ ĐỌC.
 *
 * Vì sao vẫn kế thừa `BaseCrudService` dù không dùng create/update/remove:
 * `CrudPage` khai `service = input.required<BaseCrudService<T, P>>()`, nên service
 * đưa vào bắt buộc phải là lớp con của nó. Không gọi tới các method ghi ở đâu cả —
 * việc chặn ghi nằm ở `readonly: true` của `CrudConfig` (ẩn mọi nút thêm/sửa/xóa).
 *
 * Hai module này trả MẢNG TRẦN (BR-LIST-05) nên màn của chúng dùng `listAll()`
 * qua cờ `unpaginated: true`, không dùng `list()`.
 */
@Injectable({ providedIn: 'root' })
export class RoleService extends BaseCrudService<Role> {
  constructor() {
    super('roles');
  }
}

@Injectable({ providedIn: 'root' })
export class PermissionService extends BaseCrudService<Permission> {
  constructor() {
    super('permissions');
  }

  /**
   * Quyền có search/filter/sort theo BR-LIST-05 nhưng vẫn trả mảng trần.
   * Vì vậy cần bản có query — `listAll()` của lớp cha không nhận tham số.
   */
  searchAll(query: ListQuery = {}): Observable<ApiResponse<Permission[]>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiResponse<Permission[]>>(this.baseUrl, { params });
  }
}
