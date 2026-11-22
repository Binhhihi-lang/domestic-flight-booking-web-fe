import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { FlightRecord } from '@core/models/flight.model';
import { FlightAdminService } from '@core/services/flight-admin.service';

/**
 * Bộ chọn chuyến bay tìm kiếm phía server (debounce 300ms gọi `FlightAdminService.list`).
 *
 * Hỗ trợ 2 chế độ:
 * - `multiple = false`: chọn 1 chuyến (flight-fares, flight-seat-inventory, scope `FLIGHT`).
 * - `multiple = true`: chọn nhiều chuyến kèm chip có nút `×` (Loại trừ chuyến bay).
 */
@Component({
  selector: 'app-flight-search-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <div class="fsp" [class.is-disabled]="disabled()">
      <!-- Chế độ chọn nhiều: danh sách chip đã chọn -->
      @if (multiple() && selectedIds().length > 0) {
        <div class="fsp__chips" role="list" aria-label="Các chuyến bay đã chọn">
          @for (id of selectedIds(); track id) {
            <span class="fsp__chip" role="listitem">
              <mat-icon class="fsp__chip-ic" aria-hidden="true">flight</mat-icon>
              <span class="fsp__chip-txt">{{ labelFor(id) }}</span>
              @if (!disabled()) {
                <button
                  class="fsp__chip-del"
                  type="button"
                  [attr.aria-label]="'Bỏ chọn ' + labelFor(id)"
                  (click)="removeMulti(id)"
                >
                  <mat-icon aria-hidden="true">close</mat-icon>
                </button>
              }
            </span>
          }
        </div>
      }

      <!-- Chế độ chọn 1 chuyến: hiển thị chuyến đang chọn nếu không ở trạng thái đổi -->
      @if (!multiple() && selectedId() !== null && !changingSingle()) {
        <div class="fsp__selected">
          <div class="fsp__selected-main">
            <mat-icon class="fsp__selected-ic" aria-hidden="true">flight_takeoff</mat-icon>
            <span class="fsp__selected-txt">{{ labelFor(selectedId()!) }}</span>
          </div>
          @if (!disabled()) {
            <div class="fsp__selected-acts">
              <button class="fsp__act" type="button" (click)="startChangeSingle()">Đổi</button>
              <button
                class="fsp__act fsp__act--clear"
                type="button"
                aria-label="Xóa chuyến bay đã chọn"
                (click)="clearSingle()"
              >
                <mat-icon aria-hidden="true">close</mat-icon>
              </button>
            </div>
          }
        </div>
      } @else {
        <!-- Ô tìm kiếm + dropdown kết quả -->
        <div class="fsp__input-wrap">
          <mat-icon class="fsp__search-ic" aria-hidden="true">search</mat-icon>
          <input
            class="fsp__input"
            type="text"
            autocomplete="off"
            [disabled]="disabled()"
            [placeholder]="placeholder()"
            [ngModel]="query()"
            (ngModelChange)="onQueryInput($event)"
            (focus)="onFocus()"
            (keydown.escape)="closeDropdown()"
            [attr.aria-expanded]="open()"
            role="combobox"
          />
          @if (loading()) {
            <span class="fsp__spin" aria-label="Đang tìm chuyến bay"></span>
          } @else if (query()) {
            <button
              class="fsp__clear-q"
              type="button"
              aria-label="Xóa từ khóa"
              (click)="clearQuery()"
            >
              <mat-icon aria-hidden="true">close</mat-icon>
            </button>
          }

          @if (open()) {
            <div class="fsp__drop" role="listbox" [attr.aria-multiselectable]="multiple()">
              @if (loading() && results().length === 0) {
                <div class="fsp__state">Đang tìm kiếm chuyến bay…</div>
              } @else if (results().length === 0) {
                <div class="fsp__state">Không tìm thấy chuyến bay phù hợp</div>
              } @else {
                @for (f of results(); track f.id) {
                  <button
                    class="fsp__opt"
                    type="button"
                    role="option"
                    [class.is-picked]="isPicked(f.id)"
                    [attr.aria-selected]="isPicked(f.id)"
                    (click)="pickFlight(f)"
                  >
                    @if (multiple()) {
                      <span class="fsp__check" [class.is-checked]="isPicked(f.id)" aria-hidden="true">
                        @if (isPicked(f.id)) {
                          <mat-icon>check</mat-icon>
                        }
                      </span>
                    }
                    <span class="fsp__opt-body">
                      <span class="fsp__opt-top">
                        <strong class="fsp__code">{{ f.flight_number }}</strong>
                        <span class="fsp__route">
                          {{ f.departure_airport.airport_code }} → {{ f.arrival_airport.airport_code }}
                        </span>
                      </span>
                      <span class="fsp__opt-sub">
                        {{ formatDateTime(f.scheduled_departure) }} · {{ f.airline.airline_name }}
                      </span>
                    </span>
                    @if (!multiple() && isPicked(f.id)) {
                      <mat-icon class="fsp__opt-done" aria-hidden="true">check</mat-icon>
                    }
                  </button>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      min-width: 0;
    }

    .fsp {
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
    }

    .fsp.is-disabled {
      opacity: 0.7;
    }

    .fsp__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .fsp__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--color-primary-bright);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-caption);
      font-weight: 600;
      max-width: 100%;
    }

    .fsp__chip-ic {
      font-size: 14px;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .fsp__chip-txt {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fsp__chip-del {
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--color-primary);
      cursor: pointer;
      flex-shrink: 0;
    }

    .fsp__chip-del:hover {
      background: var(--color-danger-soft);
      color: var(--color-danger);
    }

    .fsp__chip-del mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .fsp__selected {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      min-height: 42px;
      padding: 6px 10px 6px 12px;
      border: 1.5px solid var(--color-primary-bright);
      border-radius: var(--radius);
      background: var(--color-primary-soft);
    }

    .fsp__selected-main {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      min-width: 0;
    }

    .fsp__selected-ic {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .fsp__selected-txt {
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fsp__selected-acts {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .fsp__act {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-primary);
      font-family: var(--font-body);
      font-size: var(--text-caption);
      font-weight: 600;
      cursor: pointer;
    }

    .fsp__act:hover {
      border-color: var(--color-primary);
    }

    .fsp__act--clear {
      width: 28px;
      padding: 0;
      color: var(--color-ink-muted);
    }

    .fsp__act--clear:hover {
      border-color: var(--color-danger);
      background: var(--color-danger-soft);
      color: var(--color-danger);
    }

    .fsp__act--clear mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .fsp__input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .fsp__search-ic {
      position: absolute;
      left: 11px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-ink-subtle);
      pointer-events: none;
    }

    .fsp__input {
      width: 100%;
      height: 42px;
      padding: 0 34px 0 36px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      outline: none;
      transition:
        border-color var(--dur-fast) var(--ease),
        box-shadow var(--dur-fast) var(--ease);
    }

    .fsp__input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }

    .fsp__input:disabled {
      background: var(--color-surface-alt);
      color: var(--color-ink-subtle);
      cursor: not-allowed;
    }

    .fsp__clear-q {
      position: absolute;
      right: 8px;
      display: inline-grid;
      place-items: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--color-ink-muted);
      cursor: pointer;
    }

    .fsp__clear-q:hover {
      background: var(--color-border-soft);
      color: var(--color-ink);
    }

    .fsp__clear-q mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .fsp__spin {
      position: absolute;
      right: 11px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-primary);
      animation: fsp-spin 0.7s linear infinite;
    }

    @keyframes fsp-spin {
      to {
        transform: rotate(360deg);
      }
    }

    .fsp__drop {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 60;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
    }

    .fsp__state {
      padding: var(--sp-lg);
      text-align: center;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .fsp__opt {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      padding: 9px 10px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-ink);
      font-family: var(--font-body);
      text-align: left;
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .fsp__opt:hover {
      background: var(--color-surface-alt);
    }

    .fsp__opt.is-picked {
      background: var(--color-primary-soft);
    }

    .fsp__check {
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-on-primary);
      flex-shrink: 0;
    }

    .fsp__check.is-checked {
      border-color: var(--color-primary);
      background: var(--color-primary);
    }

    .fsp__check mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .fsp__opt-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .fsp__opt-top {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      font-size: var(--text-small);
    }

    .fsp__code {
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-weight: 700;
      color: var(--color-ink);
    }

    .fsp__route {
      font-weight: 600;
      color: var(--color-primary);
    }

    .fsp__opt-sub {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fsp__opt-done {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-primary);
      flex-shrink: 0;
    }
  `,
})
export class FlightSearchPicker {
  private readonly flightService = inject(FlightAdminService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  readonly multiple = input<boolean>(false);
  readonly selectedId = input<number | null>(null);
  readonly selectedIds = input<number[]>([]);
  readonly selectedLabels = input<Record<number, string>>({});
  readonly placeholder = input<string>('Tìm chuyến bay theo số hiệu (VD: VN210) hoặc tuyến bay…');
  readonly disabled = input<boolean>(false);

  readonly selectedIdChange = output<number | null>();
  readonly selectedIdsChange = output<number[]>();
  readonly flightSelected = output<FlightRecord | null>();

  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly changingSingle = signal(false);
  protected readonly results = signal<FlightRecord[]>([]);

  /** Bộ đệm nhãn chuyến bay theo ID để hiển thị lại ngay sau khi chọn. */
  private readonly labelCache = signal<Record<number, string>>({});
  private readonly search$ = new Subject<string>();
  private hasLoadedOnce = false;

  protected readonly selectedSet = computed(() => {
    if (this.multiple()) {
      return new Set<number>(this.selectedIds());
    }
    const id = this.selectedId();
    return id !== null ? new Set<number>([id]) : new Set<number>();
  });

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        tap(() => this.loading.set(true)),
        switchMap((keyword) =>
          this.flightService.list({ keyword: keyword.trim(), page: 1, size: 20 }).pipe(
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.hasLoadedOnce = true;
        const items = res?.data?.items ?? [];
        this.results.set(items);
        if (items.length > 0) {
          const nextCache = { ...this.labelCache() };
          for (const f of items) {
            nextCache[f.id] = this.formatFlightLabel(f);
          }
          this.labelCache.set(nextCache);
        }
      });
  }

  protected onFocus(): void {
    if (this.disabled()) {
      return;
    }
    this.open.set(true);
    if (!this.hasLoadedOnce) {
      this.fetchImmediate(this.query());
    }
  }

  protected onQueryInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.search$.next(value);
  }

  protected clearQuery(): void {
    this.query.set('');
    this.open.set(true);
    this.fetchImmediate('');
  }

  protected startChangeSingle(): void {
    this.changingSingle.set(true);
    this.open.set(true);
    if (!this.hasLoadedOnce) {
      this.fetchImmediate(this.query());
    }
  }

  protected clearSingle(): void {
    this.changingSingle.set(false);
    this.query.set('');
    this.selectedIdChange.emit(null);
    this.flightSelected.emit(null);
  }

  protected closeDropdown(): void {
    this.open.set(false);
    if (!this.multiple() && this.selectedId() !== null) {
      this.changingSingle.set(false);
    }
  }

  protected isPicked(id: number): boolean {
    return this.selectedSet().has(id);
  }

  protected pickFlight(flight: FlightRecord): void {
    const label = this.formatFlightLabel(flight);
    this.labelCache.set({ ...this.labelCache(), [flight.id]: label });

    if (this.multiple()) {
      const current = this.selectedIds();
      const exists = current.includes(flight.id);
      const next = exists ? current.filter((id) => id !== flight.id) : [...current, flight.id];
      this.selectedIdsChange.emit(next);
      this.flightSelected.emit(flight);
      return;
    }

    this.changingSingle.set(false);
    this.open.set(false);
    this.query.set('');
    this.selectedIdChange.emit(flight.id);
    this.flightSelected.emit(flight);
  }

  protected removeMulti(id: number): void {
    const next = this.selectedIds().filter((item) => item !== id);
    this.selectedIdsChange.emit(next);
  }

  protected labelFor(id: number): string {
    return this.selectedLabels()[id] ?? this.labelCache()[id] ?? `Chuyến bay #${id}`;
  }

  protected formatDateTime(iso: string): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.closeDropdown();
    }
  }

  private fetchImmediate(keyword: string): void {
    this.loading.set(true);
    this.flightService
      .list({ keyword: keyword.trim(), page: 1, size: 20 })
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        this.hasLoadedOnce = true;
        const items = res?.data?.items ?? [];
        this.results.set(items);
        if (items.length > 0) {
          const nextCache = { ...this.labelCache() };
          for (const f of items) {
            nextCache[f.id] = this.formatFlightLabel(f);
          }
          this.labelCache.set(nextCache);
        }
      });
  }

  private formatFlightLabel(f: FlightRecord): string {
    const dep = f.departure_airport?.airport_code ?? '';
    const arr = f.arrival_airport?.airport_code ?? '';
    const time = this.formatDateTime(f.scheduled_departure);
    return `${f.flight_number} · ${dep} → ${arr}${time ? ` · ${time}` : ''}`;
  }
}
