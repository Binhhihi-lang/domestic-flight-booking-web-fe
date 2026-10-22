import { ActiveStatus } from '@core/models/airline.model';
import { SeatClass } from '@core/models/fleet-news.model';

/**
 * Phụ thu khi khách chọn ghế khác hạng với hạng vé đã mua.
 *
 * KHÔNG có dòng cho một cặp (from_class, to_class) nghĩa là CHƯA CÓ CHÍNH SÁCH —
 * khác với dòng có `surcharge = 0` (cố ý miễn phí). Đừng gộp hai trạng thái này.
 */
export interface SeatClassSurcharge {
  id: number;
  /** Hạng VÉ khách đã mua. */
  from_class: SeatClass;
  /** Hạng GHẾ vật lý khách chọn. */
  to_class: SeatClass;
  surcharge: number;
  status: ActiveStatus;
}

export type SeatClassSurchargePayload = Omit<SeatClassSurcharge, 'id'>;
