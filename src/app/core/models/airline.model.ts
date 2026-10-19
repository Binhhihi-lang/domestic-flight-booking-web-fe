/** Hãng hàng không — khớp API Design v0.4 mục 2.5 và bảng airlines (DB v0.4). */

/** Trạng thái dùng chung của master data — API v0.4 trả chuỗi, KHÔNG trả cờ boolean. */
export type ActiveStatus = 'ACTIVE' | 'INACTIVE';

export interface Airline {
  id: number;
  airline_code: string;
  airline_name: string;
  country: string | null;
  logo_url: string | null;
  /** Bật/tắt sử dụng (tách khỏi xóa mềm). */
  status: ActiveStatus;
}

export type AirlinePayload = Omit<Airline, 'id'>;
