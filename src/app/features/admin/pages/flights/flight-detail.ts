import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FlightDetailRecord, FlightPassengerItem } from '@core/models/flight.model';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

/**
 * Chi tiết chuyến bay & Danh sách hành khách — Staff/Admin (`/admin/flights/:id`).
 * Bám sát `staff.html` (`flight-detail`): thông tin chặng bay, thống kê tồn ghế,
 * liên kết nhanh tới cập nhật vận hành / tồn ghế / bảng giá, và bảng danh sách hành khách.
 */
@Component({
  selector: 'app-admin-flight-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppAlert, StatusBadge, EmptyState, SkeletonBlock],
  template: `
    <section class="fd-page">
      <header class="fd-head">
        <div>
          <h1>Chi tiết chuyến bay {{ flight()?.flight_number ?? '' }}</h1>
          <p class="fd-sub">Thông tin khai thác, giá vé đang mở và danh sách hành khách</p>
        </div>
        <div class="fd-head__actions">
          <a routerLink="/admin/flights" class="fd-btn">
            <mat-icon aria-hidden="true">arrow_back</mat-icon>
            Danh sách chuyến
          </a>
          @if (flight(); as f) {
            <a [routerLink]="['/admin/flights', f.id, 'operation']" class="fd-btn fd-btn--primary">
              <mat-icon aria-hidden="true">schedule</mat-icon>
              Cập nhật vận hành
            </a>
            <a [routerLink]="['/admin/flights', f.id, 'seat-inventory']" class="fd-btn">
              <mat-icon aria-hidden="true">event_seat</mat-icon>
              Tồn ghế
            </a>
          }
        </div>
      </header>

      @if (error()) {
        <app-alert tone="error" title="Không tải được chuyến bay" [message]="error()!" />
      }

      @if (loading()) {
        <div class="fd-card fd-skel">
          <app-skeleton-block height="80px" />
          <app-skeleton-block height="180px" />
        </div>
      } @else if (flight(); as f) {
        <div class="fd-summary">
          <div class="fd-stat">
            <span class="fd-stat__label">Chặng bay</span>
            <strong class="fd-stat__val">
              {{ f.departure_airport.airport_code }} → {{ f.arrival_airport.airport_code }}
            </strong>
            <span class="fd-stat__note">{{ f.airline.airline_name }} · {{ f.aircraft.aircraft_code }}</span>
          </div>
          <div class="fd-stat">
            <span class="fd-stat__label">Khởi hành dự kiến</span>
            <strong class="fd-stat__val">{{ formatDateTime(f.scheduled_departure) }}</strong>
            <span class="fd-stat__note">Đến {{ formatTime(f.scheduled_arrival) }}</span>
          </div>
          <div class="fd-stat">
            <span class="fd-stat__label">Ghế còn trống</span>
            <strong class="fd-stat__val">{{ f.available_seats }} / {{ f.total_seats }}</strong>
            <span class="fd-stat__note">Sức chứa tàu bay: {{ f.aircraft.seat_capacity }}</span>
          </div>
          <div class="fd-stat">
            <span class="fd-stat__label">Trạng thái</span>
            <div class="fd-badges">
              <app-status-badge
                [tone]="f.operation_status === 'CANCELLED' ? 'danger' : f.operation_status === 'DELAYED' ? 'warning' : 'info'"
                [label]="f.operation_status"
              />
              <app-status-badge
                [tone]="f.sales_status === 'OPEN' ? 'success' : 'neutral'"
                [label]="f.sales_status === 'OPEN' ? 'Đang mở bán' : 'Đóng bán'"
              />
            </div>
          </div>
        </div>

        <div class="fd-card">
          <div class="fd-card__head">
            <h2>Danh sách hành khách ({{ filteredPassengers().length }})</h2>
            <div class="fd-pax-filter">
              <input
                type="search"
                [ngModel]="paxKeyword()"
                (ngModelChange)="paxKeyword.set($event)"
                placeholder="Tìm tên khách, mã đơn, PNR..."
                aria-label="Tìm kiếm hành khách"
              />
              <select
                [ngModel]="checkinFilter()"
                (ngModelChange)="checkinFilter.set($event)"
                aria-label="Lọc trạng thái check-in"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="checked">Đã check-in</option>
                <option value="pending">Chưa check-in</option>
              </select>
            </div>
          </div>

          @if (filteredPassengers().length === 0) {
            <app-empty-state
              icon="groups"
              message="Chưa có hành khách trên chuyến bay này"
              hint="Danh sách hành khách đặt vé sẽ tự động hiển thị tại đây"
            />
          } @else {
            <div class="fd-table-wrap">
              <table class="fd-table">
                <thead>
                  <tr>
                    <th>Mã đơn / PNR</th>
                    <th>Hành khách</th>
                    <th>Loại khách</th>
                    <th>Hạng vé</th>
                    <th>Số ghế</th>
                    <th>Trạng thái đơn</th>
                    <th>Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of filteredPassengers(); track p.booking_code + p.full_name) {
                    <tr>
                      <td>
                        <strong>{{ p.booking_code }}</strong>
                        <div class="fd-muted">PNR: {{ p.pnr_code ?? 'Chưa cấp' }}</div>
                      </td>
                      <td><strong>{{ p.full_name }}</strong></td>
                      <td>{{ passengerTypeLabel(p.passenger_type) }}</td>
                      <td>{{ p.fare_class_name }}</td>
                      <td><strong>{{ p.seat_code ?? '—' }}</strong></td>
                      <td>
                        <app-status-badge
                          [tone]="p.booking_status === 'CONFIRMED' ? 'success' : p.booking_status === 'CANCELLED' ? 'danger' : 'warning'"
                          [label]="bookingStatusLabel(p.booking_status)"
                        />
                      </td>
                      <td>
                        <app-status-badge
                          [tone]="p.checked_in ? 'success' : 'neutral'"
                          [label]="p.checked_in ? 'Đã check-in' : 'Chưa check-in'"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        @if (f.fares.length > 0) {
          <div class="fd-card">
            <div class="fd-card__head">
              <h2>Bảng giá đang áp dụng ({{ f.fares.length }})</h2>
              <a [routerLink]="['/admin/flight-fares']" [queryParams]="{ flight_id: f.id }" class="fd-link">
                Quản lý bảng giá →
              </a>
            </div>
            <div class="fd-table-wrap">
              <table class="fd-table">
                <thead>
                  <tr>
                    <th>Hạng vé</th>
                    <th>Giá người lớn</th>
                    <th>Giá trẻ em (75%)</th>
                    <th>Giá em bé (10%)</th>
                  </tr>
                </thead>
                <tbody>
                  @for (fare of f.fares; track fare.id) {
                    <tr>
                      <td>
                        <strong>{{ fare.fare_class_code }}</strong> — {{ fare.fare_class_name }}
                      </td>
                      <td>{{ formatMoney(fare.adult_price) }}</td>
                      <td>{{ formatMoney(fare.child_price) }}</td>
                      <td>{{ formatMoney(fare.infant_price) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .fd-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .fd-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .fd-head h1 {
      margin: 0;
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .fd-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .fd-head__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .fd-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 500;
      text-decoration: none;
    }
    .fd-btn--primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .fd-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .fd-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 14px;
    }
    .fd-stat {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fd-stat__label {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-weight: 600;
    }
    .fd-stat__val {
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .fd-stat__note {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .fd-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .fd-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .fd-skel {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .fd-card__head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border-soft);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .fd-card__head h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .fd-pax-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .fd-pax-filter input,
    .fd-pax-filter select {
      height: 36px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .fd-link {
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 500;
    }
    .fd-table-wrap {
      overflow-x: auto;
    }
    .fd-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 680px;
    }
    .fd-table th,
    .fd-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .fd-table th {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }
    .fd-muted {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
  `,
})
export class AdminFlightDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly flightService = inject(FlightAdminService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly flight = signal<FlightDetailRecord | null>(null);
  protected readonly paxKeyword = signal('');
  protected readonly checkinFilter = signal('');

  protected readonly filteredPassengers = computed<FlightPassengerItem[]>(() => {
    const list = this.flight()?.passengers ?? [];
    const kw = this.paxKeyword().trim().toLowerCase();
    const cf = this.checkinFilter();
    return list.filter((p) => {
      if (cf === 'checked' && !p.checked_in) return false;
      if (cf === 'pending' && p.checked_in) return false;
      if (!kw) return true;
      return (
        p.full_name.toLowerCase().includes(kw) ||
        p.booking_code.toLowerCase().includes(kw) ||
        (p.pnr_code ?? '').toLowerCase().includes(kw)
      );
    });
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Mã chuyến bay không hợp lệ');
      this.loading.set(false);
      return;
    }
    this.flightService.getById(id).subscribe({
      next: (res) => {
        this.flight.set(res.data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được chi tiết chuyến bay');
        this.loading.set(false);
      },
    });
  }

  protected passengerTypeLabel(t: FlightPassengerItem['passenger_type']): string {
    return t === 'ADULT' ? 'Người lớn' : t === 'CHILD' ? 'Trẻ em' : 'Em bé';
  }

  protected bookingStatusLabel(s: FlightPassengerItem['booking_status']): string {
    return s === 'CONFIRMED' ? 'Đã xác nhận' : s === 'CANCELLED' ? 'Đã hủy' : 'Chờ thanh toán';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatDateTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
}
