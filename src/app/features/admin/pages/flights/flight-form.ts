import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { FlightOperationStatus, FlightSalesStatus } from '@core/models/flight.model';
import { AirlineService } from '@core/services/airline.service';
import { AircraftService, AirportService } from '@core/services/catalog.service';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/**
 * Biểu mẫu Tạo / Sửa chuyến bay (`/admin/flights/new`, `/admin/flights/:id/edit`).
 * Bám sát `admin.html` (`flight-form`): chọn hãng bay, tàu bay đang hoạt động,
 * sân bay đi/đến (không trùng nhau), giờ khởi hành/đến dự kiến, trạng thái bán.
 */
@Component({
  selector: 'app-admin-flight-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppAlert, AppButton, SkeletonBlock],
  template: `
    <section class="ff-page">
      <header class="ff-head">
        <div>
          <h1>{{ isEdit() ? 'Sửa chuyến bay' : 'Thêm chuyến bay mới' }}</h1>
          <p class="ff-sub">Cấu hình lịch khai thác, tàu bay và trạng thái mở bán</p>
        </div>
        <a routerLink="/admin/flights" class="ff-back">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
          Quay lại danh sách
        </a>
      </header>

      <div class="ff-card">
        @if (error()) {
          <app-alert tone="error" title="Dữ liệu chưa hợp lệ" [message]="error()!" />
        }

        @if (loading()) {
          <div class="ff-skel">
            <app-skeleton-block height="42px" />
            <app-skeleton-block height="42px" />
            <app-skeleton-block height="42px" />
          </div>
        } @else {
          <form class="ff-form" (ngSubmit)="submit()">
            <div class="ff-grid">
              <div class="ff-field">
                <label for="ff-number">Số hiệu chuyến bay *</label>
                <input
                  id="ff-number"
                  name="flight_number"
                  type="text"
                  required
                  maxlength="20"
                  [ngModel]="flightNumber()"
                  (ngModelChange)="flightNumber.set($event)"
                  placeholder="VD: VN-210"
                />
              </div>

              <div class="ff-field">
                <label for="ff-airline">Hãng hàng không *</label>
                <select
                  id="ff-airline"
                  name="airline_id"
                  required
                  [ngModel]="airlineId()"
                  (ngModelChange)="airlineId.set(+$event)"
                >
                  <option [ngValue]="0">— Chọn hãng bay —</option>
                  @for (a of airlines(); track a.id) {
                    <option [ngValue]="a.id">{{ a.airline_code }} — {{ a.airline_name }}</option>
                  }
                </select>
              </div>

              <div class="ff-field">
                <label for="ff-aircraft">Tàu bay khai thác (đang hoạt động) *</label>
                <select
                  id="ff-aircraft"
                  name="aircraft_id"
                  required
                  [ngModel]="aircraftId()"
                  (ngModelChange)="aircraftId.set(+$event)"
                >
                  <option [ngValue]="0">— Chọn tàu bay —</option>
                  @for (ac of activeAircrafts(); track ac.id) {
                    <option [ngValue]="ac.id">
                      {{ ac.aircraft_code }} — {{ ac.model }} ({{ ac.seat_capacity }} ghế)
                    </option>
                  }
                </select>
              </div>

              <div class="ff-field">
                <label for="ff-sales">Trạng thái mở bán</label>
                <select
                  id="ff-sales"
                  name="sales_status"
                  [ngModel]="salesStatus()"
                  (ngModelChange)="salesStatus.set($event)"
                >
                  <option value="OPEN">Mở bán (OPEN)</option>
                  <option value="CLOSED">Đóng bán (CLOSED)</option>
                </select>
              </div>

              <div class="ff-field">
                <label for="ff-dep">Sân bay khởi hành *</label>
                <select
                  id="ff-dep"
                  name="departure_airport_id"
                  required
                  [ngModel]="departureAirportId()"
                  (ngModelChange)="departureAirportId.set(+$event)"
                >
                  <option [ngValue]="0">— Chọn sân bay đi —</option>
                  @for (ap of airports(); track ap.id) {
                    <option [ngValue]="ap.id">{{ ap.airport_code }} — {{ ap.airport_name }}</option>
                  }
                </select>
              </div>

              <div class="ff-field">
                <label for="ff-arr">Sân bay đến *</label>
                <select
                  id="ff-arr"
                  name="arrival_airport_id"
                  required
                  [ngModel]="arrivalAirportId()"
                  (ngModelChange)="arrivalAirportId.set(+$event)"
                >
                  <option [ngValue]="0">— Chọn sân bay đến —</option>
                  @for (ap of airports(); track ap.id) {
                    <option [ngValue]="ap.id">{{ ap.airport_code }} — {{ ap.airport_name }}</option>
                  }
                </select>
              </div>

              <div class="ff-field">
                <label for="ff-dep-time">Giờ khởi hành dự kiến *</label>
                <input
                  id="ff-dep-time"
                  name="scheduled_departure"
                  type="datetime-local"
                  required
                  [ngModel]="scheduledDeparture()"
                  (ngModelChange)="scheduledDeparture.set($event)"
                />
              </div>

              <div class="ff-field">
                <label for="ff-arr-time">Giờ đến dự kiến *</label>
                <input
                  id="ff-arr-time"
                  name="scheduled_arrival"
                  type="datetime-local"
                  required
                  [ngModel]="scheduledArrival()"
                  (ngModelChange)="scheduledArrival.set($event)"
                />
              </div>

              <div class="ff-field">
                <label for="ff-op">Trạng thái vận hành</label>
                <select
                  id="ff-op"
                  name="operation_status"
                  [ngModel]="operationStatus()"
                  (ngModelChange)="operationStatus.set($event)"
                >
                  <option value="SCHEDULED">Đúng giờ (SCHEDULED)</option>
                  <option value="DRAFT">Bản nháp (DRAFT)</option>
                  <option value="BOARDING">Đang lên tàu (BOARDING)</option>
                  <option value="DELAYED">Chậm chuyến (DELAYED)</option>
                  <option value="DEPARTED">Đã cất cánh (DEPARTED)</option>
                  <option value="ARRIVED">Đã hạ cánh (ARRIVED)</option>
                  <option value="CANCELLED">Đã hủy (CANCELLED)</option>
                </select>
              </div>
            </div>

            <div class="ff-actions">
              <a routerLink="/admin/flights" class="ff-cancel">Hủy</a>
              <app-app-button variant="primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Đang lưu...' : isEdit() ? 'Lưu thay đổi' : 'Tạo chuyến bay' }}
              </app-app-button>
            </div>
          </form>
        }
      </div>
    </section>
  `,
  styles: `
    .ff-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 920px;
    }
    .ff-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .ff-head h1 {
      margin: 0;
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .ff-sub {
      margin: 4px 0 0;
      color: var(--color-ink-muted);
      font-size: var(--text-small);
    }
    .ff-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--color-primary);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 500;
    }
    .ff-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .ff-skel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ff-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    @media (max-width: 768px) {
      .ff-grid {
        grid-template-columns: 1fr;
      }
    }
    .ff-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ff-field label {
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-ink);
    }
    .ff-field input,
    .ff-field select {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .ff-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border-soft);
    }
    .ff-cancel {
      padding: 8px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      color: var(--color-ink);
      text-decoration: none;
      font-size: var(--text-small);
    }
  `,
})
export class AdminFlightForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly flightService = inject(FlightAdminService);
  private readonly airlineService = inject(AirlineService);
  private readonly aircraftService = inject(AircraftService);
  private readonly airportService = inject(AirportService);
  private readonly snackBar = inject(MatSnackBar);

  private readonly idParam = this.route.snapshot.paramMap.get('id');
  protected readonly editId = this.idParam ? Number(this.idParam) : null;
  protected readonly isEdit = computed(() => this.editId !== null);

  protected readonly loading = signal(this.editId !== null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly flightNumber = signal('');
  protected readonly airlineId = signal(1);
  protected readonly aircraftId = signal(1);
  protected readonly departureAirportId = signal(1);
  protected readonly arrivalAirportId = signal(2);
  protected readonly scheduledDeparture = signal('2026-11-28T08:00');
  protected readonly scheduledArrival = signal('2026-11-28T10:10');
  protected readonly operationStatus = signal<FlightOperationStatus>('SCHEDULED');
  protected readonly salesStatus = signal<FlightSalesStatus>('OPEN');

  private readonly airlinesRes = toSignal(this.airlineService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });
  private readonly aircraftsRes = toSignal(this.aircraftService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });
  private readonly airportsRes = toSignal(this.airportService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly airlines = computed(() => this.airlinesRes()?.data.items ?? []);
  protected readonly activeAircrafts = computed(() =>
    (this.aircraftsRes()?.data.items ?? []).filter((a) => a.status === 'ACTIVE'),
  );
  protected readonly airports = computed(() => this.airportsRes()?.data.items ?? []);

  constructor() {
    if (this.editId !== null) {
      this.flightService.getById(this.editId).subscribe({
        next: (res) => {
          const f = res.data;
          this.flightNumber.set(f.flight_number);
          this.airlineId.set(f.airline.id);
          this.aircraftId.set(f.aircraft.id);
          this.departureAirportId.set(f.departure_airport.id);
          this.arrivalAirportId.set(f.arrival_airport.id);
          this.scheduledDeparture.set(f.scheduled_departure.slice(0, 16));
          this.scheduledArrival.set(f.scheduled_arrival.slice(0, 16));
          this.operationStatus.set(f.operation_status);
          this.salesStatus.set(f.sales_status);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Không tải được thông tin chuyến bay');
          this.loading.set(false);
        },
      });
    }
  }

  protected submit(): void {
    this.error.set(null);
    if (!this.flightNumber().trim()) {
      this.error.set('Số hiệu chuyến bay không được để trống');
      return;
    }
    if (this.departureAirportId() === this.arrivalAirportId()) {
      this.error.set('Sân bay đi và sân bay đến không được trùng nhau');
      return;
    }
    if (this.scheduledArrival() <= this.scheduledDeparture()) {
      this.error.set('Giờ đến dự kiến phải sau giờ khởi hành');
      return;
    }

    const payload = {
      flight_number: this.flightNumber().trim().toUpperCase(),
      airline_id: this.airlineId(),
      aircraft_id: this.aircraftId(),
      departure_airport_id: this.departureAirportId(),
      arrival_airport_id: this.arrivalAirportId(),
      scheduled_departure: `${this.scheduledDeparture()}:00`,
      scheduled_arrival: `${this.scheduledArrival()}:00`,
      operation_status: this.operationStatus(),
      sales_status: this.salesStatus(),
    };

    this.saving.set(true);
    const req$ =
      this.editId !== null
        ? this.flightService.update(this.editId, payload)
        : this.flightService.create(payload);

    req$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.snackBar.open(res.message || 'Đã lưu chuyến bay', 'Đóng', { duration: 3000 });
        this.router.navigate(['/admin/flights']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'Không thể lưu chuyến bay');
      },
    });
  }
}
