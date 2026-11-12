import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiResponse } from '@core/models/api-response.model';
import { SeatMap } from '@core/models/fleet-news.model';
import { SeatMapService } from '@core/services/catalog.service';

const URL = 'http://localhost:8080/api/admin/aircrafts/1/seat-map';

/**
 * Response đúng như Backend trả: `seat_type` lồng, KHÔNG có `seat_type_id`.
 * Ép kiểu vì `SeatMap` mô tả dữ liệu SAU chuẩn hoá của service, còn đây là
 * payload thô của Backend.
 */
const BE_RESPONSE = {
  code: 1000,
  message: 'Success',
  data: {
    aircraft_id: 1,
    seat_capacity: 2,
    configured_seats: 2,
    seats: [
      {
        id: 10,
        seat_row: 1,
        seat_column: 'A',
        seat_type: {
          id: 5,
          seat_type_code: 'BUS',
          seat_type_name: 'Ghế thương gia',
          seat_class: 'BUSINESS',
          color_hex: '#FF8C00',
          status: 'ACTIVE',
        },
      },
      {
        id: 11,
        seat_row: 1,
        seat_column: 'B',
        seat_type: {
          id: 1,
          seat_type_code: 'ECO',
          seat_type_name: 'Phổ thông',
          seat_class: 'ECONOMY',
          color_hex: '#90CAF9',
          status: 'ACTIVE',
        },
      },
    ],
  },
} as unknown as ApiResponse<SeatMap>;

describe('SeatMapService — bù seat_type_id từ seat_type lồng', () => {
  let service: SeatMapService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SeatMapService],
    });
    service = TestBed.inject(SeatMapService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GET: mỗi ghế có seat_type_id lấy từ seat_type.id', () => {
    let result: SeatMap | undefined;
    service.getMap(1).subscribe((res) => (result = res.data));

    httpMock.expectOne(URL).flush(BE_RESPONSE);

    expect(result?.seats.map((s) => s.seat_type_id)).toEqual([5, 1]);
  });

  it('GET: giữ nguyên seat_type để tra color_hex', () => {
    let result: SeatMap | undefined;
    service.getMap(1).subscribe((res) => (result = res.data));

    httpMock.expectOne(URL).flush(BE_RESPONSE);

    expect(result?.seats[0].seat_type?.color_hex).toBe('#FF8C00');
  });

  it('PUT: response cũng được bù seat_type_id', () => {
    let result: SeatMap | undefined;
    service
      .saveMap(1, [{ seat_row: 1, seat_column: 'A', seat_type_id: 5 }])
      .subscribe((res) => (result = res.data));

    httpMock.expectOne(URL).flush(BE_RESPONSE);

    expect(result?.seats[1].seat_type_id).toBe(1);
  });

  it('response lỗi (không có data) đi qua nguyên vẹn', () => {
    let code: number | undefined;
    service.getMap(1).subscribe((res) => (code = res.code));

    httpMock.expectOne(URL).flush({ code: 1004, message: 'Không tìm thấy', data: null });

    expect(code).toBe(1004);
  });
});
