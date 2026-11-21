import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import {
  FlightDetailRecord,
  FlightFare,
  FlightFarePayload,
  FlightPayload,
  FlightRecord,
  FlightSeatMap,
  SeatInventoryRequestPayload,
} from '@core/models/flight.model';

export interface FlightListQuery {
  page?: number;
  size?: number;
  keyword?: string;
  airline_id?: number | string;
  departure_airport_id?: number | string;
  arrival_airport_id?: number | string;
  departure_date?: string;
  operation_status?: string;
  sales_status?: string;
}

export interface FlightFareListQuery {
  page?: number;
  size?: number;
  keyword?: string;
  flight_id?: number | string;
  fare_class_id?: number | string;
}

function buildParams(query: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

/** Quản trị Chuyến bay — `/api/admin/flights` (ADMIN & STAFF). */
@Injectable({ providedIn: 'root' })
export class FlightAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/flights`;

  list(query: FlightListQuery = {}): Observable<ApiResponse<PageData<FlightRecord>>> {
    return this.http.get<ApiResponse<PageData<FlightRecord>>>(this.baseUrl, {
      params: buildParams(query as Record<string, unknown>),
    });
  }

  getById(id: number): Observable<ApiResponse<FlightDetailRecord>> {
    return this.http.get<ApiResponse<FlightDetailRecord>>(`${this.baseUrl}/${id}`);
  }

  create(payload: FlightPayload): Observable<ApiResponse<FlightRecord>> {
    return this.http.post<ApiResponse<FlightRecord>>(this.baseUrl, payload);
  }

  update(id: number, payload: FlightPayload): Observable<ApiResponse<FlightRecord>> {
    return this.http.put<ApiResponse<FlightRecord>>(`${this.baseUrl}/${id}`, payload);
  }

  activate(id: number): Observable<ApiResponse<FlightRecord>> {
    return this.http.post<ApiResponse<FlightRecord>>(`${this.baseUrl}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<ApiResponse<FlightRecord>> {
    return this.http.post<ApiResponse<FlightRecord>>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  remove(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}

/** Quản trị Giá bán theo chuyến — `/api/admin/flight-fares`. */
@Injectable({ providedIn: 'root' })
export class FlightFareService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/flight-fares`;

  list(query: FlightFareListQuery = {}): Observable<ApiResponse<PageData<FlightFare>>> {
    return this.http.get<ApiResponse<PageData<FlightFare>>>(this.baseUrl, {
      params: buildParams(query as Record<string, unknown>),
    });
  }

  getById(id: number): Observable<ApiResponse<FlightFare>> {
    return this.http.get<ApiResponse<FlightFare>>(`${this.baseUrl}/${id}`);
  }

  create(payload: FlightFarePayload): Observable<ApiResponse<FlightFare>> {
    return this.http.post<ApiResponse<FlightFare>>(this.baseUrl, payload);
  }

  update(id: number, payload: FlightFarePayload): Observable<ApiResponse<FlightFare>> {
    return this.http.put<ApiResponse<FlightFare>>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}

/** Quản trị Tồn ghế chuyến bay — `/api/admin/flights/{id}/seat-inventory` & `/flight-seats/{id}/block`. */
@Injectable({ providedIn: 'root' })
export class SeatInventoryService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = `${environment.apiBaseUrl}/admin`;

  getSeatMap(flightId: number): Observable<ApiResponse<FlightSeatMap>> {
    return this.http.get<ApiResponse<FlightSeatMap>>(
      `${this.adminUrl}/flights/${flightId}/seat-map`,
    );
  }

  saveInventory(
    flightId: number,
    payload?: SeatInventoryRequestPayload,
  ): Observable<ApiResponse<FlightSeatMap>> {
    return this.http.put<ApiResponse<FlightSeatMap>>(
      `${this.adminUrl}/flights/${flightId}/seat-inventory`,
      payload ?? { seats: [] },
    );
  }

  blockSeat(flightSeatId: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.adminUrl}/flight-seats/${flightSeatId}/block`,
      {},
    );
  }

  unblockSeat(flightSeatId: number): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.adminUrl}/flight-seats/${flightSeatId}/unblock`,
      {},
    );
  }
}
