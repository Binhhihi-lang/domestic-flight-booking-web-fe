/** Hãng hàng không — khớp API Design v0.2 mục 2.5 và bảng airlines (DB v0.4). */
export interface Airline {
  id: number;
  airline_code: string;
  airline_name: string;
  country: string | null;
  logo_url: string | null;
  /** Bật/tắt sử dụng (tách khỏi xóa mềm). */
  is_active: boolean;
  /** Xóa mềm — bản ghi vẫn giữ để tra lịch sử. */
  is_deleted: boolean;
}

export type AirlinePayload = Omit<Airline, 'id' | 'is_deleted'>;
