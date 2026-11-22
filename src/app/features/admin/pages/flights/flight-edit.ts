import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FlightDetailRecord, FlightOperationStatus } from '@core/models/flight.model';
import { FlightAdminService } from '@core/services/flight-admin.service';
import { ConfirmDialog, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const OP_STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Đúng giờ', tone: 'info' },
  BOARDING: { label: 'Đang lên tàu', tone: 'warning' },
  DELAYED: { label: 'Chậm chuyến', tone: 'warning' },
  DEPARTED: { label: 'Đã cất cánh', tone: 'info' },
  ARRIVED: { label: 'Đã hạ cánh', tone: 'success' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

/**
 * Cập nhật vận hành chuyến bay cho Staff/Admin (`/admin/flights/:id/operation`).
 * Điều chỉnh giờ cất/hạ cánh và trạng thái khai thác với nhãn tiếng Việt rõ ràng;
 * tách riêng vùng nguy hiểm "Hủy chuyến bay" kèm hộp thoại xác nhận.
 */
@Component({
  selector: 'app-admin-flight-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppAlert,
    AppButton,
    SkeletonBlock,
    StatusBadge,
  ],
  template: `
    <section class="wrap fe-page">
      <header class="fe-head">
        <div>
          <h1>Cập nhật vận hành chuyến {{ flight()?.flight_number ?? '' }}</h1>
          <p class="fe-sub">Điều chỉnh giờ cất/hạ cánh và trạng thái khai thác (dành cho Staff/Admin)</p>
        </div>
        <a [routerLink]="['/admin/flights', flightId]" class="fe-back">
          <mat-icon aria-hidden="true">arrow_back</mat-icon>
          Về chi tiết chuyến bay
        </a>
      </header>

      <div class="fe-card">
        @if (error()) {
          <app-alert tone="error" title="Không thể cập nhật" [message]="error()!" />
        }

        @if (loading()) {
          <div class="fe-skel">
            <app-skeleton-block height="44px" />
            <app-skeleton-block height="44px" />
          </div>
        } @else if (flight(); as f) {
          <div class="fe-info">
            <span><strong>Chặng:</strong> {{ f.departure_airport.airport_code }} → {{ f.arrival_airport.airport_code }}</span>
            <span><strong>Hãng:</strong> {{ f.airline.airline_name }}</span>
            <span><strong>Tàu bay:</strong> {{ f.aircraft.aircraft_code }} ({{ f.aircraft.model }})</span>
            <span class="fe-info__status">
              <strong>Hiện tại:</strong>
              <app-status-badge
                [tone]="opStatusMeta(f.operation_status).tone"
                [label]="opStatusMeta(f.operation_status).label"
              />
            </span>
          </div>

          <form class="fe-form" (ngSubmit)="save()">
            <div class="fe-grid">
              <div class="fe-field">
                <label for="fe-op">Trạng thái vận hành *</label>
                <select
                  id="fe-op"
                  name="operation_status"
                  [ngModel]="operationStatus()"
                  (ngModelChange)="operationStatus.set($event)"
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="SCHEDULED">Đúng giờ</option>
                  <option value="BOARDING">Đang lên tàu</option>
                  <option value="DELAYED">Chậm chuyến</option>
                  <option value="DEPARTED">Đã cất cánh</option>
                  <option value="ARRIVED">Đã hạ cánh</option>
                </select>
              </div>

              <div class="fe-field">
                <label for="fe-dep">Giờ khởi hành dự kiến / thực tế *</label>
                <input
                  id="fe-dep"
                  name="scheduled_departure"
                  type="datetime-local"
                  required
                  [ngModel]="scheduledDeparture()"
                  (ngModelChange)="scheduledDeparture.set($event)"
                />
              </div>

              <div class="fe-field">
                <label for="fe-arr">Giờ đến dự kiến / thực tế *</label>
                <input
                  id="fe-arr"
                  name="scheduled_arrival"
                  type="datetime-local"
                  required
                  [ngModel]="scheduledArrival()"
                  (ngModelChange)="scheduledArrival.set($event)"
                />
              </div>

              <div class="fe-field fe-field--full">
                <label for="fe-note">Ghi chú vận hành (tùy chọn)</label>
                <textarea
                  id="fe-note"
                  name="note"
                  rows="3"
                  [ngModel]="note()"
                  (ngModelChange)="note.set($event)"
                  placeholder="VD: Chậm 30 phút do thời tiết tại sân bay Tân Sơn Nhất..."
                ></textarea>
              </div>
            </div>

            <div class="fe-actions">
              <a [routerLink]="['/admin/flights', flightId]" class="fe-cancel">Hủy</a>
              <app-app-button variant="primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Đang lưu...' : 'Lưu cập nhật vận hành' }}
              </app-app-button>
            </div>
          </form>

          @if (f.operation_status !== 'CANCELLED') {
            <section class="fe-danger" aria-label="Vùng hủy chuyến bay">
              <div class="fe-danger__body">
                <div class="fe-danger__title">
                  <mat-icon aria-hidden="true">warning</mat-icon>
                  <h2>Hủy chuyến bay</h2>
                </div>
                <p>
                  Hủy chuyến <strong>{{ f.flight_number }}</strong> sẽ tự động đóng bán vé và chuyển trạng
                  thái vận hành sang <strong>Đã hủy</strong>. Hãy đảm bảo đã thông báo phương án hỗ trợ
                  cho hành khách bị ảnh hưởng.
                </p>
              </div>
              <app-app-button
                variant="danger"
                size="sm"
                [disabled]="saving()"
                (clicked)="confirmCancelFlight()"
              >
                <mat-icon aria-hidden="true">cancel</mat-icon>
                Hủy chuyến bay
              </app-app-button>
            </section>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .fe-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 820px;
    }
    .fe-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .fe-head h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .fe-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .fe-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      text-decoration: none;
      font-size: var(--text-small);
      font-weight: 600;
      transition:
        background-color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }
    .fe-back:hover {
      background: var(--color-surface-alt);
      border-color: var(--color-primary-bright);
      color: var(--color-primary);
    }
    .fe-back mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .fe-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .fe-skel {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .fe-info {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      padding: 12px 14px;
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .fe-info__status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .fe-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    @media (max-width: 768px) {
      .fe-grid {
        grid-template-columns: 1fr;
      }
    }
    .fe-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fe-field--full {
      grid-column: 1 / -1;
    }
    .fe-field label {
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-ink);
    }
    .fe-field input,
    .fe-field select,
    .fe-field textarea {
      padding: 8px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-family: inherit;
    }
    .fe-field input,
    .fe-field select {
      height: 40px;
    }
    .fe-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--color-border-soft);
    }
    .fe-cancel {
      padding: 8px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      color: var(--color-ink);
      text-decoration: none;
      font-size: var(--text-small);
    }
    .fe-danger {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      margin-top: var(--sp-sm);
      padding: var(--sp-lg);
      border: 1px solid var(--color-danger);
      border-radius: var(--radius);
      background: var(--color-danger-soft);
    }
    .fe-danger__body {
      flex: 1 1 320px;
      color: var(--color-on-danger-soft);
    }
    .fe-danger__title {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .fe-danger__title h2 {
      margin: 0;
      font-size: var(--text-body);
      font-weight: 700;
      color: var(--color-on-danger-soft);
    }
    .fe-danger__title mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .fe-danger__body p {
      margin: 0;
      font-size: var(--text-small);
      line-height: var(--leading-normal);
    }
  `,
})
export class AdminFlightEdit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly flightService = inject(FlightAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly flightId = Number(this.route.snapshot.paramMap.get('id'));
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly flight = signal<FlightDetailRecord | null>(null);

  protected readonly operationStatus = signal<FlightOperationStatus>('SCHEDULED');
  protected readonly scheduledDeparture = signal('');
  protected readonly scheduledArrival = signal('');
  protected readonly note = signal('');

  constructor() {
    this.flightService.getById(this.flightId).subscribe({
      next: (res) => {
        const f = res.data;
        this.flight.set(f);
        this.operationStatus.set(f.operation_status === 'CANCELLED' ? 'SCHEDULED' : f.operation_status);
        this.scheduledDeparture.set(f.scheduled_departure.slice(0, 16));
        this.scheduledArrival.set(f.scheduled_arrival.slice(0, 16));
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Không tải được chuyến bay');
        this.loading.set(false);
      },
    });
  }

  protected opStatusMeta(status: FlightOperationStatus | string): { label: string; tone: BadgeTone } {
    return OP_STATUS_META[status] ?? { label: status, tone: 'neutral' };
  }

  protected save(): void {
    const f = this.flight();
    if (!f) return;
    this.error.set(null);
    if (this.scheduledArrival() <= this.scheduledDeparture()) {
      this.error.set('Giờ đến phải sau giờ khởi hành');
      return;
    }
    this.submitUpdate(f, this.operationStatus(), f.sales_status);
  }

  protected confirmCancelFlight(): void {
    const f = this.flight();
    if (!f) return;
    const data: ConfirmDialogData = {
      title: `Xác nhận hủy chuyến bay ${f.flight_number}?`,
      message: `Chặng ${f.departure_airport.airport_code} → ${f.arrival_airport.airport_code}. Chuyến bay sẽ đóng bán ngay lập tức và chuyển sang trạng thái Đã hủy.`,
      confirmText: 'Xác nhận hủy chuyến',
      cancelText: 'Quay lại',
      tone: 'warn',
      warningNote:
        'Hành động này sẽ đóng mở bán chuyến bay ngay lập tức. Hành khách đã đặt vé cần được bộ phận hỗ trợ liên hệ hoàn/đổi theo quy định.',
    };
    this.dialog
      .open(ConfirmDialog, { data, panelClass: 'vf-confirm-panel' })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.submitUpdate(f, 'CANCELLED', 'CLOSED');
      });
  }

  private submitUpdate(
    f: FlightDetailRecord,
    nextStatus: FlightOperationStatus,
    nextSales: 'OPEN' | 'CLOSED',
  ): void {
    this.saving.set(true);
    this.flightService
      .update(f.id, {
        flight_number: f.flight_number,
        airline_id: f.airline.id,
        aircraft_id: f.aircraft.id,
        departure_airport_id: f.departure_airport.id,
        arrival_airport_id: f.arrival_airport.id,
        scheduled_departure: `${this.scheduledDeparture()}:00`,
        scheduled_arrival: `${this.scheduledArrival()}:00`,
        operation_status: nextStatus,
        sales_status: nextSales,
        parent_flight_id: f.parent_flight_id,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open(
            nextStatus === 'CANCELLED'
              ? `Đã hủy chuyến bay ${f.flight_number}`
              : 'Đã cập nhật trạng thái vận hành chuyến bay',
            'Đóng',
            { duration: 3000 },
          );
          this.router.navigate(['/admin/flights', f.id]);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message || 'Không thể cập nhật vận hành');
        },
      });
  }
}
