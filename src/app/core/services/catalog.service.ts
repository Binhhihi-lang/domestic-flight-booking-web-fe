import { Injectable } from '@angular/core';
import { BaseCrudService } from '@core/services/base-crud.service';
import { Aircraft, NewsCategory, NewsItem, SeatType } from '@core/models/fleet-news.model';
import { Airport, City } from '@core/models/location.model';
import { Promotion, Voucher } from '@core/models/promotion.model';

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
