import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { FlightFare } from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { FareClassService } from '@core/services/catalog.service';
import { FlightAdminService, FlightFareService } from '@core/services/flight-admin.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const SEAT_CLASS_LABELS: Record<SeatClass, string> = {
  ECONOMY: 'Phổ thông',
  PREMIUM_ECONOMY: 'Phổ thông đặc biệt',
  BUSINESS: 'Thương gia',
};

/**
 * Quản lý bảng giá theo chuyến bay & hạng vé (`/admin/flight-fares`).
 * Tự động tính giá Người lớn (`base_fare + tax_fee`), Trẻ em (75%) và Em bé (10%),
 * kiểm tra trùng khoảng hiệu lực `[effective_from, effective_to)` và khớp hãng bay.
 */
@Component({
  selector: 'app-admin-flight-fares',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppAlert,
    AppButton,
    EmptyState,
    SkeletonBlock,
    StatusBadge,
  ],
  template: `
    <section class="ffare-page">
      <header class="ffare-head">
        <div>
          <h1>Bảng giá chuyến bay</h1>
          <p class="ffare-sub">
            Cấu hình giá cơ bản + thuế phí người lớn theo từng chuyến và hạng vé (Trẻ em 75%, Em bé 10%)
          </p>
        </div>
        <div class="ffare-head__actions">
          <a routerLink="/admin/flights" class="ffare-link-btn">
            <mat-icon aria-hidden="true">flight_takeoff</mat-icon>
            Danh sách chuyến bay
          </a>
          <app-app-button
            variant="primary"
            size="sm"
            (clicked)="showForm.set(!showForm()); formError.set(null)"
          >
            <mat-icon aria-hidden="true">{{ showForm() ? 'close' : 'add' }}</mat-icon>
            {{ showForm() ? 'Đóng biểu mẫu' : 'Thêm dòng giá' }}
          </app-app-button>
        </div>
      </header>

      @if (showForm()) {
        <div class="ffare-card ffare-form-card">
          <h2>Thêm bảng giá mới</h2>
          @if (formError()) {
            <app-alert tone="error" title="Không thể lưu bảng giá" [message]="formError()!" />
          }
          <form class="ffare-form" (ngSubmit)="createFare()">
            <div class="ffare-grid">
              <div class="ffare-field">
                <label for="ff-fl">Chuyến bay *</label>
                <select
                  id="ff-fl"
                  name="flight_id"
                  [ngModel]="formFlightId()"
                  (ngModelChange)="formFlightId.set(+$event)"
                >
                  @for (fl of flights(); track fl.id) {
                    <option [ngValue]="fl.id">
                      {{ fl.flight_number }} ({{ fl.departure_airport.airport_code }} →
                      {{ fl.arrival_airport.airport_code }} · {{ fl.airline.airline_code }})
                    </option>
                  }
                </select>
              </div>

              <div class="ffare-field">
                <label for="ff-fc">Hạng vé *</label>
                <select
                  id="ff-fc"
                  name="fare_class_id"
                  [ngModel]="formFareClassId()"
                  (ngModelChange)="formFareClassId.set(+$event)"
                >
                  @for (fc of matchingFareClasses(); track fc.id) {
                    <option [ngValue]="fc.id">
                      {{ fc.fare_class_code }} — {{ fc.fare_class_name }}
                    </option>
                  }
                </select>
              </div>

              <div class="ffare-field">
                <label for="ff-base">Giá vé cơ bản (VNĐ) *</label>
                <input
                  id="ff-base"
                  name="base_fare"
                  type="number"
                  min="0"
                  step="10000"
                  [ngModel]="formBaseFare()"
                  (ngModelChange)="formBaseFare.set(+$event)"
                />
              </div>

              <div class="ffare-field">
                <label for="ff-tax">Thuế và phí (VNĐ) *</label>
                <input
                  id="ff-tax"
                  name="tax_fee"
                  type="number"
                  min="0"
                  step="10000"
                  [ngModel]="formTaxFee()"
                  (ngModelChange)="formTaxFee.set(+$event)"
                />
              </div>

              <div class="ffare-field">
                <label for="ff-from">Hiệu lực từ</label>
                <input
                  id="ff-from"
                  name="effective_from"
                  type="datetime-local"
                  [ngModel]="formEffectiveFrom()"
                  (ngModelChange)="formEffectiveFrom.set($event)"
                />
              </div>

              <div class="ffare-field">
                <label for="ff-to">Hiệu lực đến (để trống = không giới hạn)</label>
                <input
                  id="ff-to"
                  name="effective_to"
                  type="datetime-local"
                  [ngModel]="formEffectiveTo()"
                  (ngModelChange)="formEffectiveTo.set($event)"
                />
              </div>
            </div>

            <div class="ffare-preview" aria-label="Xem trước giá tự động tính">
              <div class="ffare-preview__item">
                <span>Người lớn (100%)</span>
                <strong>{{ formatMoney(previewAdult()) }}</strong>
              </div>
              <div class="ffare-preview__item">
                <span>Trẻ em (75%)</span>
                <strong>{{ formatMoney(previewChild()) }}</strong>
              </div>
              <div class="ffare-preview__item">
                <span>Em bé (10%)</span>
                <strong>{{ formatMoney(previewInfant()) }}</strong>
              </div>
            </div>

            <div class="ffare-form-actions">
              <app-app-button variant="primary" type="submit" [disabled]="saving()">
                {{ saving() ? 'Đang lưu...' : 'Lưu bảng giá' }}
              </app-app-button>
            </div>
          </form>
        </div>
      }

      <div class="ffare-card">
        <div class="ffare-filters">
          <div class="ffare-field">
            <label for="flt-filter">Lọc theo chuyến bay</label>
            <select
              id="flt-filter"
              [ngModel]="filterFlightId()"
              (ngModelChange)="filterFlightId.set($event); load()"
            >
              <option value="">Tất cả chuyến bay</option>
              @for (fl of flights(); track fl.id) {
                <option [value]="fl.id">
                  {{ fl.flight_number }} ({{ fl.departure_airport.airport_code }} →
                  {{ fl.arrival_airport.airport_code }})
                </option>
              }
            </select>
          </div>
          <div class="ffare-field">
            <label for="fc-filter">Lọc theo hạng vé</label>
            <select
              id="fc-filter"
              [ngModel]="filterFareClassId()"
              (ngModelChange)="filterFareClassId.set($event); load()"
            >
              <option value="">Tất cả hạng vé</option>
              @for (fc of allFareClasses(); track fc.id) {
                <option [value]="fc.id">{{ fc.fare_class_code }} — {{ fc.fare_class_name }}</option>
              }
            </select>
          </div>
        </div>

        @if (error()) {
          <div class="ffare-pad">
            <app-alert tone="error" title="Không thể tải bảng giá" [message]="error()!" />
          </div>
        }

        @if (loading()) {
          <div class="ffare-pad ffare-skel">
            <app-skeleton-block height="42px" />
            <app-skeleton-block height="42px" />
            <app-skeleton-block height="42px" />
          </div>
        } @else if (rows().length === 0) {
          <app-empty-state
            icon="sell"
            message="Chưa có bảng giá cho bộ lọc hiện tại"
            hint="Bấm 'Thêm dòng giá' để cấu hình giá bán theo chuyến và hạng vé"
          />
        } @else {
          <div class="ffare-table-wrap">
            <table class="ffare-table">
              <thead>
                <tr>
                  <th>Chuyến bay</th>
                  <th>Hạng vé & Khoang</th>
                  <th class="col-num">Giá cơ bản</th>
                  <th class="col-num">Thuế phí</th>
                  <th class="col-num">Người lớn</th>
                  <th class="col-num">Trẻ em (75%)</th>
                  <th class="col-num">Em bé (10%)</th>
                  <th>Hiệu lực</th>
                  <th class="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td><strong>{{ row.flight_number }}</strong></td>
                    <td>
                      <div class="ffare-primary">{{ row.fare_class_code }} — {{ row.fare_class_name }}</div>
                      <app-status-badge tone="info" [label]="seatClassLabel(row.seat_class)" />
                    </td>
                    <td class="col-num">{{ formatMoney(row.base_fare) }}</td>
                    <td class="col-num">{{ formatMoney(row.tax_fee) }}</td>
                    <td class="col-num"><strong>{{ formatMoney(row.adult_price) }}</strong></td>
                    <td class="col-num">{{ formatMoney(row.child_price) }}</td>
                    <td class="col-num">{{ formatMoney(row.infant_price) }}</td>
                    <td class="ffare-eff">
                      <span>{{ formatDate(row.effective_from) }}</span>
                      <span>→ {{ row.effective_to ? formatDate(row.effective_to) : 'Không giới hạn' }}</span>
                    </td>
                    <td class="col-actions">
                      <button
                        type="button"
                        class="ffare-del"
                        (click)="removeFare(row)"
                        [attr.aria-label]="'Xóa giá vé ' + row.fare_class_code"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .ffare-page {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .ffare-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .ffare-head h1 {
      margin: 0;
      font-size: var(--text-h1);
      color: var(--color-ink);
    }
    .ffare-sub {
      margin: 4px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }
    .ffare-head__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .ffare-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      text-decoration: none;
    }
    .ffare-link-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .ffare-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .ffare-form-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ffare-form-card h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .ffare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .ffare-filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      padding: 16px;
      background: var(--color-surface-alt);
      border-bottom: 1px solid var(--color-border-soft);
    }
    .ffare-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .ffare-field label {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
    }
    .ffare-field input,
    .ffare-field select {
      height: 38px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .ffare-preview {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius);
      background: var(--color-primary-soft);
    }
    @media (max-width: 640px) {
      .ffare-preview {
        grid-template-columns: 1fr;
      }
    }
    .ffare-preview__item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ffare-preview__item span {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .ffare-preview__item strong {
      font-size: var(--text-h3);
      color: var(--color-primary);
    }
    .ffare-form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 14px;
    }
    .ffare-pad {
      padding: 16px;
    }
    .ffare-skel {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ffare-table-wrap {
      overflow-x: auto;
    }
    .ffare-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 860px;
    }
    .ffare-table th,
    .ffare-table td {
      padding: 12px 14px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
      vertical-align: middle;
    }
    .ffare-table th {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
      white-space: nowrap;
    }
    .col-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .col-actions {
      text-align: right;
    }
    .ffare-primary {
      font-weight: 600;
      color: var(--color-ink);
      margin-bottom: 4px;
    }
    .ffare-eff {
      display: flex;
      flex-direction: column;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      white-space: nowrap;
    }
    .ffare-del {
      padding: 4px 10px;
      border: 1px solid var(--color-danger);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-danger);
      font-size: var(--text-caption);
      cursor: pointer;
    }
  `,
})
export class AdminFlightFares {
  private readonly route = inject(ActivatedRoute);
  private readonly fareService = inject(FlightFareService);
  private readonly flightService = inject(FlightAdminService);
  private readonly fareClassService = inject(FareClassService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly rows = signal<FlightFare[]>([]);

  protected readonly filterFlightId = signal(
    this.route.snapshot.queryParamMap.get('flight_id') ?? '',
  );
  protected readonly filterFareClassId = signal('');

  protected readonly formFlightId = signal(101);
  protected readonly formFareClassId = signal(1);
  protected readonly formBaseFare = signal(1200000);
  protected readonly formTaxFee = signal(490000);
  protected readonly formEffectiveFrom = signal('2026-12-01T00:00');
  protected readonly formEffectiveTo = signal('');

  private readonly flightsRes = toSignal(this.flightService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });
  private readonly fareClassesRes = toSignal(this.fareClassService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly flights = computed(() => this.flightsRes()?.data.items ?? []);
  protected readonly allFareClasses = computed(() => this.fareClassesRes()?.data.items ?? []);

  protected readonly matchingFareClasses = computed(() => {
    const fl = this.flights().find((f) => f.id === this.formFlightId());
    if (!fl) return this.allFareClasses();
    const byAirline = this.allFareClasses().filter((fc) => fc.airline_id === fl.airline.id);
    return byAirline.length > 0 ? byAirline : this.allFareClasses();
  });

  protected readonly previewAdult = computed(() =>
    Math.max(0, Math.round((this.formBaseFare() || 0) + (this.formTaxFee() || 0))),
  );
  protected readonly previewChild = computed(() => Math.round(this.previewAdult() * 0.75));
  protected readonly previewInfant = computed(() => Math.round(this.previewAdult() * 0.1));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.fareService
      .list({
        page: 1,
        size: 100,
        flight_id: this.filterFlightId() || undefined,
        fare_class_id: this.filterFareClassId() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Không tải được bảng giá chuyến bay');
          this.loading.set(false);
        },
      });
  }

  protected createFare(): void {
    this.formError.set(null);
    if (this.formBaseFare() < 0 || this.formTaxFee() < 0) {
      this.formError.set('Giá cơ bản và thuế phí không được âm');
      return;
    }
    if (
      this.formEffectiveFrom() &&
      this.formEffectiveTo() &&
      this.formEffectiveTo() <= this.formEffectiveFrom()
    ) {
      this.formError.set('Thời điểm kết thúc phải sau thời điểm bắt đầu');
      return;
    }
    this.saving.set(true);
    this.fareService
      .create({
        flight_id: this.formFlightId(),
        fare_class_id: this.formFareClassId(),
        base_fare: this.formBaseFare(),
        tax_fee: this.formTaxFee(),
        currency: 'VND',
        effective_from: this.formEffectiveFrom() ? `${this.formEffectiveFrom()}:00` : null,
        effective_to: this.formEffectiveTo() ? `${this.formEffectiveTo()}:00` : null,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.showForm.set(false);
          this.snackBar.open(res.message || 'Đã thêm bảng giá mới', 'Đóng', { duration: 3000 });
          this.load();
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.formError.set(err.message || 'Không thể tạo bảng giá');
        },
      });
  }

  protected removeFare(row: FlightFare): void {
    this.fareService.remove(row.id).subscribe({
      next: () => {
        this.snackBar.open('Đã xóa dòng giá vé', 'Đóng', { duration: 2500 });
        this.load();
      },
      error: (err: Error) => {
        this.snackBar.open(err.message || 'Không thể xóa dòng giá', 'Đóng', { duration: 4000 });
      },
    });
  }

  protected seatClassLabel(cls: SeatClass): string {
    return SEAT_CLASS_LABELS[cls] ?? cls;
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatDate(iso: string | null): string {
    if (!iso) return 'Ngay lập tức';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
