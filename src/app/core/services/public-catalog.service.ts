import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, ListQuery, PageData } from '@core/models/api-response.model';
import { Airline } from '@core/models/airline.model';
import { NewsCategoryBrief, NewsItem } from '@core/models/fleet-news.model';
import { Airport, City } from '@core/models/location.model';
import { Promotion } from '@core/models/promotion.model';

/**
 * Lớp cơ sở cho vùng khách — CHỈ CÓ ĐỌC, path `/api/public/**` (API v0.4 mục 2.11).
 *
 * Vì sao tách khỏi `catalog.service.ts`: hai vùng trả hình dạng khác nhau. Vùng
 * admin trả cả bản ghi `INACTIVE` và cần token + permission; vùng public chỉ trả
 * bản ghi `ACTIVE`, không cần token. Dùng lẫn thì trang chủ sẽ gọi endpoint admin
 * và bị 401 với khách chưa đăng nhập.
 *
 * Vì sao không kế thừa `BaseCrudService`: nó có create/update/remove — vùng
 * public không có các thao tác đó, để lộ ra là mời gọi nhầm.
 */
export abstract class PublicCrudService<T> {
  protected readonly http = inject(HttpClient);
  protected readonly baseUrl: string;

  constructor(resourcePath: string) {
    this.baseUrl = `${environment.apiBaseUrl}/${resourcePath}`;
  }

  list(query: ListQuery = {}): Observable<ApiResponse<PageData<T>>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiResponse<PageData<T>>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.baseUrl}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class PublicAirlineService extends PublicCrudService<Airline> {
  constructor() {
    super('public/airlines');
  }
}

@Injectable({ providedIn: 'root' })
export class PublicCityService extends PublicCrudService<City> {
  constructor() {
    super('public/cities');
  }
}

@Injectable({ providedIn: 'root' })
export class PublicAirportService extends PublicCrudService<Airport> {
  constructor() {
    super('public/airports');
  }
}

@Injectable({ providedIn: 'root' })
export class PublicPromotionService extends PublicCrudService<Promotion> {
  constructor() {
    super('public/promotions');
  }
}

@Injectable({ providedIn: 'root' })
export class PublicNewsService extends PublicCrudService<NewsItem> {
  constructor() {
    super('public/news');
  }
}

/**
 * Danh mục tin cho khách — trả MẢNG TRẦN chỉ `{id, name}`.
 * Không kế thừa `PublicCrudService` vì response không có envelope phân trang.
 */
@Injectable({ providedIn: 'root' })
export class PublicNewsCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/public/news-categories`;

  listAll(): Observable<ApiResponse<NewsCategoryBrief[]>> {
    return this.http.get<ApiResponse<NewsCategoryBrief[]>>(this.baseUrl);
  }
}
