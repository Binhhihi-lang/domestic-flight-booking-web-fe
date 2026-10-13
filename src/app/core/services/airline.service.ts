import { Injectable } from '@angular/core';
import { Airline } from '@core/models/airline.model';
import { BaseCrudService } from '@core/services/base-crud.service';

/**
 * Hãng hàng không — kế thừa toàn bộ CRUD từ BaseCrudService.
 *
 * Đây là "con thỏ thử" của kiến trúc: nếu lớp này chạy đúng thì 6 module
 * master data còn lại chỉ cần copy đúng mẫu này, đổi đường dẫn.
 */
@Injectable({ providedIn: 'root' })
export class AirlineService extends BaseCrudService<Airline> {
  constructor() {
    super('airlines');
  }
}
