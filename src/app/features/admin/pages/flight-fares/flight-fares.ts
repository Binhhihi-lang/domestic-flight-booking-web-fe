import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { FlightFare, FlightRecord } from '@core/models/flight.model';
import { SeatClass } from '@core/models/fleet-news.model';
import { FareClassService } from '@core/services/catalog.service';
import { FlightFareService } from '@core/services/flight-admin.service';
import { ConfirmDialog, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { FlightSearchPicker } from '@shared/components/flight-search-picker/flight-search-picker';
import { ServerPager } from '@shared/components/server-pager/server-pager';
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
 * Bám sát `admin.html`: bộ lọc `.adm-filter--card` với `<app-flight-search-picker>`,
 * lọc hạng vé, nút `Sao chép từ chuyến khác` (modal sao chép hàng loạt),
 * và bảng 9 cột: `Hạng vé`, `Hạng dịch vụ`, `Giá cơ bản`, `Thuế & phí`,
 * `Giá người lớn`, `Trẻ em 75%`, `Em bé 10%`, `Hiệu lực`, `Thao tác`.
 */
@Component({
  selector: 'app-admin-flight-fares',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatIconModule,
    AppAlert,
    AppButton,
    EmptyState,
    FlightSearchPicker,
    ServerPager,
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
          <app-app-button variant="ghost" size="sm" (clicked)="openCopyModal()">
            <mat-icon aria-hidden="true">content_copy</mat-icon>
            Sao chép từ chuyến khác
          </app-app-button>
          <app-app-button variant="primary" size="sm" (clicked)="toggleCreateForm()">
            <mat-icon aria-hidden="true">{{ showForm() ? 'close' : 'add' }}</mat-icon>
            {{ showForm() ? 'Đóng biểu mẫu' : 'Thêm dòng giá' }}
          </app-app-button>
        </div>
      </header>

      <div class="adm-filter adm-filter--card" role="search" aria-label="Bộ lọc bảng giá">
        <div class="ffare-field ffare-field--picker">
          <label>Chuyến bay</label>
          <app-flight-search-picker
            [multiple]="false"
            [selectedId]="filterFlightId()"
            placeholder="Tìm chuyến bay để lọc bảng giá..."
            (selectedIdChange)="onFilterFlightChange($event)"
          />
        </div>
        <div class="ffare-field ffare-field--select">
          <label for="fc-filter">Hạng vé</label>
          <select
            id="fc-filter"
            [ngModel]="filterFareClassId()"
            (ngModelChange)="filterFareClassId.set($event); onFilterChange()"
          >
            <option value="">Tất cả hạng vé</option>
            @for (fc of allFareClasses(); track fc.id) {
              <option [value]="fc.id">{{ fc.fare_class_code }} — {{ fc.fare_class_name }}</option>
            }
          </select>
        </div>
      </div>

      @if (showForm()) {
        <div class="ffare-card ffare-form-card ffare-card--overflow">
          <div class="ffare-form-head">
            <h2>{{ editingFareId() !== null ? 'Cập nhật bảng giá' : 'Thêm bảng giá mới' }}</h2>
            @if (editingFareId() !== null) {
              <button type="button" class="ffare-btn-ghost" (click)="closeForm()">Hủy chỉnh sửa</button>
            }
          </div>

          @if (formError()) {
            <app-alert tone="error" title="Không thể lưu bảng giá" [message]="formError()!" />
          }

          <form class="ffare-form" (ngSubmit)="saveFare()">
            <div class="ffare-grid">
              <div class="ffare-field">
                <label>Chuyến bay *</label>
                <app-flight-search-picker
                  [multiple]="false"
                  [selectedId]="formFlightId()"
                  [selectedLabels]="formFlightLabels()"
                  [disabled]="editingFareId() !== null"
                  placeholder="Tìm chuyến bay theo số hiệu hoặc tuyến..."
                  (selectedIdChange)="formFlightId.set($event)"
                  (flightSelected)="onFormFlightSelected($event)"
                />
              </div>

              <div class="ffare-field">
                <label for="ff-fc">Hạng vé *</label>
                <select
                  id="ff-fc"
                  name="fare_class_id"
                  [disabled]="editingFareId() !== null"
                  [ngModel]="formFareClassId()"
                  (ngModelChange)="formFareClassId.set(+$event)"
                >
                  <option [ngValue]="0">— Chọn hạng vé —</option>
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
                <label for="ff-tax">Thuế & phí (VNĐ) *</label>
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
                <strong class="tabular">{{ formatMoney(previewAdult()) }}</strong>
              </div>
              <div class="ffare-preview__item">
                <span>Trẻ em (75%)</span>
                <strong class="tabular">{{ formatMoney(previewChild()) }}</strong>
              </div>
              <div class="ffare-preview__item">
                <span>Em bé (10%)</span>
                <strong class="tabular">{{ formatMoney(previewInfant()) }}</strong>
              </div>
            </div>

            <div class="ffare-form-actions">
              <app-app-button variant="ghost" size="sm" (clicked)="closeForm()">Hủy</app-app-button>
              <app-app-button variant="primary" size="sm" type="submit" [disabled]="saving()">
                {{
                  saving()
                    ? 'Đang lưu...'
                    : editingFareId() !== null
                      ? 'Cập nhật bảng giá'
                      : 'Lưu bảng giá'
                }}
              </app-app-button>
            </div>
          </form>
        </div>
      }

      <div class="ffare-card">
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
            hint="Bấm 'Thêm dòng giá' hoặc 'Sao chép từ chuyến khác' để cấu hình giá bán"
          />
        } @else {
          <div class="ffare-table-wrap">
            <table class="ffare-table">
              <thead>
                <tr>
                  <th>Hạng vé</th>
                  <th>Hạng dịch vụ</th>
                  <th class="col-num">Giá cơ bản</th>
                  <th class="col-num">Thuế & phí</th>
                  <th class="col-num">Giá người lớn</th>
                  <th class="col-num">Trẻ em 75%</th>
                  <th class="col-num">Em bé 10%</th>
                  <th>Hiệu lực</th>
                  <th class="col-actions">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>
                      <div class="ffare-primary">{{ row.fare_class_code }} — {{ row.fare_class_name }}</div>
                      <div class="ffare-flight-sub">{{ row.flight_number }}</div>
                    </td>
                    <td>
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
                      <div class="ffare-row-acts">
                        <button
                          type="button"
                          class="ffare-edit"
                          (click)="startEdit(row)"
                          [attr.aria-label]="'Sửa giá vé ' + row.fare_class_code"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          class="ffare-del"
                          (click)="confirmRemoveFare(row)"
                          [attr.aria-label]="'Xóa giá vé ' + row.fare_class_code"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-server-pager
            [page]="page()"
            [size]="size()"
            [totalItems]="totalItems()"
            [totalPages]="totalPages()"
            [pageSizeOptions]="[20, 50, 100]"
            noun="dòng giá"
            (pageChange)="onPageChange($event)"
            (sizeChange)="onSizeChange($event)"
          />
        }
      </div>

      @if (copyModalOpen()) {
        <div class="vf-modal-backdrop" (click)="closeCopyModal()">
          <div
            class="vf-modal-panel ffare-copy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="copy-fare-title"
            (click)="$event.stopPropagation()"
          >
            <div class="ffare-modal-head">
              <h2 id="copy-fare-title">Sao chép bảng giá từ chuyến khác</h2>
              <button
                type="button"
                class="ffare-modal-close"
                aria-label="Đóng"
                (click)="closeCopyModal()"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="ffare-modal-body">
              @if (copyError()) {
                <app-alert tone="error" title="Không thể sao chép" [message]="copyError()!" />
              }

              <div class="ffare-field">
                <label>Chuyến bay nguồn *</label>
                <app-flight-search-picker
                  [multiple]="false"
                  [selectedId]="copySourceFlightId()"
                  placeholder="Chọn chuyến bay đã có bảng giá..."
                  (selectedIdChange)="onCopySourceChange($event)"
                />
              </div>

              <div class="ffare-field">
                <label>Chuyến bay đích *</label>
                <app-flight-search-picker
                  [multiple]="false"
                  [selectedId]="copyTargetFlightId()"
                  placeholder="Chọn chuyến bay nhận bảng giá..."
                  (selectedIdChange)="copyTargetFlightId.set($event)"
                />
              </div>

              @if (copySourceFares().length > 0) {
                <div class="ffare-copy-preview">
                  <span class="ffare-copy-lbl">
                    Sẽ sao chép {{ copySourceFares().length }} dòng giá:
                  </span>
                  <ul>
                    @for (f of copySourceFares(); track f.id) {
                      <li>
                        <strong>{{ f.fare_class_code }}</strong> · Người lớn
                        <span class="tabular">{{ formatMoney(f.adult_price) }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>

            <div class="ffare-modal-foot">
              <app-app-button variant="ghost" size="sm" (clicked)="closeCopyModal()">Hủy</app-app-button>
              <app-app-button
                variant="primary"
                size="sm"
                [disabled]="copying() || copySourceFares().length === 0 || !copyTargetFlightId()"
                (clicked)="executeCopyFares()"
              >
                {{ copying() ? 'Đang sao chép...' : 'Xác nhận sao chép' }}
              </app-app-button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .ffare-page {
      display: flex;
      flex-direction: column;
      gap: 18px;
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
      font-family: var(--font-heading);
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
    .adm-filter--card {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--sp-md);
      padding: var(--sp-md) var(--sp-lg);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }
    .ffare-field--picker {
      flex: 1 1 300px;
      min-width: 240px;
    }
    .ffare-field--select {
      flex: 0 1 240px;
      min-width: 200px;
    }
    .ffare-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    .ffare-card--overflow {
      overflow: visible;
    }
    .ffare-form-card {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ffare-form-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .ffare-form-card h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .ffare-btn-ghost {
      padding: 5px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink-muted);
      font-size: var(--text-caption);
      cursor: pointer;
    }
    .ffare-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
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
      height: 42px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
    }
    .ffare-field select:disabled {
      background: var(--color-surface-alt);
      color: var(--color-ink-subtle);
      cursor: not-allowed;
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
    .tabular {
      font-variant-numeric: tabular-nums;
    }
    .ffare-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
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
      min-width: 880px;
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
    }
    .ffare-flight-sub {
      margin-top: 2px;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }
    .ffare-eff {
      display: flex;
      flex-direction: column;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      white-space: nowrap;
    }
    .ffare-row-acts {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .ffare-edit {
      padding: 4px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-primary);
      font-size: var(--text-caption);
      font-weight: 600;
      cursor: pointer;
    }
    .ffare-edit:hover {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .ffare-del {
      padding: 4px 10px;
      border: 1px solid var(--color-danger);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-danger);
      font-size: var(--text-caption);
      font-weight: 600;
      cursor: pointer;
    }
    .ffare-del:hover {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }
    .ffare-copy-modal {
      max-width: 520px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .ffare-modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .ffare-modal-head h2 {
      margin: 0;
      font-size: var(--text-h3);
      color: var(--color-ink);
    }
    .ffare-modal-close {
      border: 0;
      background: transparent;
      color: var(--color-ink-muted);
      cursor: pointer;
      display: inline-flex;
      padding: 4px;
      border-radius: var(--radius-sm);
    }
    .ffare-modal-close:hover {
      background: var(--color-surface-alt);
      color: var(--color-ink);
    }
    .ffare-modal-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ffare-copy-preview {
      padding: 12px;
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }
    .ffare-copy-lbl {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--color-ink);
    }
    .ffare-copy-preview ul {
      margin: 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: var(--color-ink-muted);
    }
    .ffare-modal-foot {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
})
export class AdminFlightFares {
  private readonly route = inject(ActivatedRoute);
  private readonly fareService = inject(FlightFareService);
  private readonly fareClassService = inject(FareClassService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly showForm = signal(false);
  protected readonly editingFareId = signal<number | null>(null);
  protected readonly rows = signal<FlightFare[]>([]);

  protected readonly page = signal(1);
  protected readonly size = signal(20);
  protected readonly totalItems = signal(0);
  protected readonly totalPages = signal(1);

  private readonly initialFlightQuery = this.route.snapshot.queryParamMap.get('flight_id');
  protected readonly filterFlightId = signal<number | null>(
    this.initialFlightQuery ? Number(this.initialFlightQuery) || null : null,
  );
  protected readonly filterFareClassId = signal('');

  protected readonly formFlightId = signal<number | null>(null);
  protected readonly formFlightLabels = signal<Record<number, string>>({});
  protected readonly selectedFormFlight = signal<FlightRecord | null>(null);
  protected readonly formFareClassId = signal<number>(0);
  protected readonly formBaseFare = signal(1200000);
  protected readonly formTaxFee = signal(490000);
  protected readonly formEffectiveFrom = signal('2026-12-01T00:00');
  protected readonly formEffectiveTo = signal('');

  protected readonly copyModalOpen = signal(false);
  protected readonly copySourceFlightId = signal<number | null>(null);
  protected readonly copyTargetFlightId = signal<number | null>(null);
  protected readonly copySourceFares = signal<FlightFare[]>([]);
  protected readonly copyError = signal<string | null>(null);
  protected readonly copying = signal(false);

  private readonly fareClassesRes = toSignal(this.fareClassService.list({ page: 1, size: 100 }), {
    initialValue: null,
  });

  protected readonly allFareClasses = computed(() => this.fareClassesRes()?.data.items ?? []);

  protected readonly matchingFareClasses = computed(() => {
    const fl = this.selectedFormFlight();
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

  protected onFilterFlightChange(flightId: number | null): void {
    this.filterFlightId.set(flightId);
    this.onFilterChange();
  }

  protected onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  protected onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.load();
  }

  protected onSizeChange(nextSize: number): void {
    this.size.set(nextSize);
    this.page.set(1);
    this.load();
  }

  protected openCopyModal(): void {
    this.copyError.set(null);
    this.copySourceFlightId.set(null);
    this.copyTargetFlightId.set(this.filterFlightId());
    this.copySourceFares.set([]);
    this.copyModalOpen.set(true);
  }

  protected closeCopyModal(): void {
    this.copyModalOpen.set(false);
  }

  protected onCopySourceChange(flightId: number | null): void {
    this.copySourceFlightId.set(flightId);
    this.copyError.set(null);
    this.copySourceFares.set([]);
    if (!flightId) return;
    this.fareService.list({ page: 1, size: 100, flight_id: flightId }).subscribe({
      next: (res) => {
        this.copySourceFares.set(res.data.items);
        if (res.data.items.length === 0) {
          this.copyError.set('Chuyến bay nguồn chưa có dòng giá nào.');
        }
      },
      error: (err: Error) => {
        this.copyError.set(err.message || 'Không tải được bảng giá chuyến nguồn');
      },
    });
  }

  protected executeCopyFares(): void {
    const targetId = this.copyTargetFlightId();
    const sourceId = this.copySourceFlightId();
    const fares = this.copySourceFares();
    if (!targetId || !sourceId || fares.length === 0) return;
    if (targetId === sourceId) {
      this.copyError.set('Chuyến bay đích phải khác chuyến bay nguồn.');
      return;
    }
    this.copying.set(true);
    this.copyError.set(null);
    const reqs = fares.map((f) =>
      this.fareService
        .create({
          flight_id: targetId,
          fare_class_id: f.fare_class_id,
          base_fare: f.base_fare,
          tax_fee: f.tax_fee,
          currency: f.currency || 'VND',
          effective_from: f.effective_from,
          effective_to: f.effective_to,
        })
        .pipe(catchError(() => of(null))),
    );
    forkJoin(reqs).subscribe((results) => {
      this.copying.set(false);
      const okCount = results.filter(Boolean).length;
      this.closeCopyModal();
      this.filterFlightId.set(targetId);
      this.snackBar.open(`Đã sao chép ${okCount}/${fares.length} dòng giá`, 'Đóng', {
        duration: 3000,
      });
      this.load();
    });
  }

  protected toggleCreateForm(): void {
    if (this.showForm()) {
      this.closeForm();
      return;
    }
    this.editingFareId.set(null);
    this.formError.set(null);
    this.formFlightId.set(this.filterFlightId());
    this.selectedFormFlight.set(null);
    this.formFareClassId.set(this.allFareClasses()[0]?.id ?? 0);
    this.formBaseFare.set(1200000);
    this.formTaxFee.set(490000);
    this.formEffectiveFrom.set('2026-12-01T00:00');
    this.formEffectiveTo.set('');
    this.showForm.set(true);
  }

  protected startEdit(row: FlightFare): void {
    this.editingFareId.set(row.id);
    this.formError.set(null);
    this.formFlightId.set(row.flight_id);
    this.formFlightLabels.set({ [row.flight_id]: row.flight_number });
    this.selectedFormFlight.set(null);
    this.formFareClassId.set(row.fare_class_id);
    this.formBaseFare.set(row.base_fare);
    this.formTaxFee.set(row.tax_fee);
    this.formEffectiveFrom.set(row.effective_from ? row.effective_from.slice(0, 16) : '');
    this.formEffectiveTo.set(row.effective_to ? row.effective_to.slice(0, 16) : '');
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingFareId.set(null);
    this.formError.set(null);
  }

  protected onFormFlightSelected(flight: FlightRecord | null): void {
    this.selectedFormFlight.set(flight);
    if (flight) {
      const matching = this.matchingFareClasses();
      if (matching.length > 0 && !matching.some((fc) => fc.id === this.formFareClassId())) {
        this.formFareClassId.set(matching[0].id);
      }
    }
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.fareService
      .list({
        page: this.page(),
        size: this.size(),
        flight_id: this.filterFlightId() ?? undefined,
        fare_class_id: this.filterFareClassId() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.data.items);
          this.totalItems.set(res.data.pagination.total_items);
          this.totalPages.set(res.data.pagination.total_pages || 1);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'Không tải được bảng giá chuyến bay');
          this.loading.set(false);
        },
      });
  }

  protected saveFare(): void {
    this.formError.set(null);
    const flightId = this.formFlightId();
    if (!flightId) {
      this.formError.set('Vui lòng chọn chuyến bay');
      return;
    }
    if (!this.formFareClassId()) {
      this.formError.set('Vui lòng chọn hạng vé');
      return;
    }
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

    const payload = {
      flight_id: flightId,
      fare_class_id: this.formFareClassId(),
      base_fare: this.formBaseFare(),
      tax_fee: this.formTaxFee(),
      currency: 'VND',
      effective_from: this.formEffectiveFrom() ? `${this.formEffectiveFrom()}:00` : null,
      effective_to: this.formEffectiveTo() ? `${this.formEffectiveTo()}:00` : null,
    };

    this.saving.set(true);
    const editId = this.editingFareId();
    const req$ =
      editId !== null ? this.fareService.update(editId, payload) : this.fareService.create(payload);

    req$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.closeForm();
        this.snackBar.open(
          res.message || (editId !== null ? 'Đã cập nhật bảng giá' : 'Đã thêm bảng giá mới'),
          'Đóng',
          { duration: 3000 },
        );
        this.load();
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.formError.set(
          err.message || (editId !== null ? 'Không thể cập nhật bảng giá' : 'Không thể tạo bảng giá'),
        );
      },
    });
  }

  protected confirmRemoveFare(row: FlightFare): void {
    const data: ConfirmDialogData = {
      title: `Xóa dòng giá ${row.fare_class_code}?`,
      message: `Chuyến bay ${row.flight_number} — ${row.fare_class_name} (${this.formatMoney(row.adult_price)}).`,
      confirmText: 'Xóa dòng giá',
      cancelText: 'Hủy',
      tone: 'warn',
    };
    this.dialog
      .open(ConfirmDialog, { data, panelClass: 'vf-confirm-panel' })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.fareService.remove(row.id).subscribe({
          next: () => {
            this.snackBar.open('Đã xóa dòng giá vé', 'Đóng', { duration: 2500 });
            this.load();
          },
          error: (err: Error) => {
            this.snackBar.open(err.message || 'Không thể xóa dòng giá', 'Đóng', {
              duration: 4000,
            });
          },
        });
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
