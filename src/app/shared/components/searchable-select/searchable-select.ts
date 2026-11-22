import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface SearchableOption {
  value: number | string;
  label: string;
  sub?: string;
  group?: string;
}

/**
 * Combobox có ô gõ lọc phía client (hỗ trợ bỏ dấu tiếng Việt, lọc theo nhãn/mã/nhóm).
 * Dùng cho các danh sách dài như Hạng vé, Sân bay, Thành phố ở form quản trị.
 */
@Component({
  selector: 'app-searchable-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <div class="ssel" [class.is-open]="open()" [class.is-disabled]="disabled()">
      <button
        class="ssel__trigger"
        type="button"
        role="combobox"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="placeholder()"
        (click)="toggle()"
        (keydown.escape)="close()"
      >
        <span class="ssel__val" [class.is-placeholder]="!selectedOption()">
          @if (selectedOption(); as opt) {
            <span class="ssel__val-main">{{ opt.label }}</span>
            @if (opt.sub) {
              <span class="ssel__val-sub">{{ opt.sub }}</span>
            }
          } @else {
            {{ placeholder() }}
          }
        </span>

        <span class="ssel__suffix">
          @if (allowClear() && !disabled() && selectedOption()) {
            <span
              class="ssel__clear"
              role="button"
              tabindex="0"
              aria-label="Xóa lựa chọn"
              (click)="clear($event)"
              (keydown.enter)="clear($event)"
            >
              <mat-icon aria-hidden="true">close</mat-icon>
            </span>
          }
          <mat-icon class="ssel__chev" aria-hidden="true">
            {{ open() ? 'expand_less' : 'expand_more' }}
          </mat-icon>
        </span>
      </button>

      @if (open()) {
        <div class="ssel__panel">
          <div class="ssel__search">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input
              #searchInput
              type="text"
              autocomplete="off"
              [placeholder]="searchPlaceholder()"
              [ngModel]="filterText()"
              (ngModelChange)="onFilterChange($event)"
              (keydown.arrowdown)="moveActive(1, $event)"
              (keydown.arrowup)="moveActive(-1, $event)"
              (keydown.enter)="pickActive($event)"
              (keydown.escape)="close()"
            />
          </div>

          <div class="ssel__list" role="listbox">
            @if (filteredOptions().length === 0) {
              <div class="ssel__empty">{{ emptyText() }}</div>
            } @else {
              @for (opt of filteredOptions(); track opt.value; let i = $index) {
                <button
                  class="ssel__opt"
                  type="button"
                  role="option"
                  [class.is-selected]="isSelected(opt.value)"
                  [class.is-active]="i === activeIndex()"
                  [attr.aria-selected]="isSelected(opt.value)"
                  (mouseenter)="activeIndex.set(i)"
                  (click)="selectOption(opt)"
                >
                  <span class="ssel__opt-main">
                    <span class="ssel__opt-lbl">{{ opt.label }}</span>
                    @if (opt.sub) {
                      <span class="ssel__opt-sub">{{ opt.sub }}</span>
                    }
                  </span>
                  @if (isSelected(opt.value)) {
                    <mat-icon class="ssel__opt-check" aria-hidden="true">check</mat-icon>
                  }
                </button>
              }
            }
          </div>
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

    .ssel {
      position: relative;
    }

    .ssel__trigger {
      width: 100%;
      min-height: 42px;
      padding: 6px 10px 6px 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      text-align: left;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        box-shadow var(--dur-fast) var(--ease);
    }

    .ssel__trigger:hover:not(:disabled) {
      border-color: var(--color-primary-bright);
    }

    .ssel.is-open .ssel__trigger,
    .ssel__trigger:focus-visible {
      outline: none;
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }

    .ssel__trigger:disabled {
      background: var(--color-surface-alt);
      color: var(--color-ink-subtle);
      cursor: not-allowed;
    }

    .ssel__val {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
    }

    .ssel__val.is-placeholder {
      color: var(--color-ink-subtle);
    }

    .ssel__val-main {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }

    .ssel__val-sub {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .ssel__suffix {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
      color: var(--color-ink-muted);
    }

    .ssel__clear {
      display: inline-grid;
      place-items: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      color: var(--color-ink-muted);
    }

    .ssel__clear:hover {
      background: var(--color-border-soft);
      color: var(--color-danger);
    }

    .ssel__clear mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
    }

    .ssel__chev {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .ssel__panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 60;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }

    .ssel__search {
      position: relative;
      display: flex;
      align-items: center;
      padding: var(--sp-sm);
      border-bottom: 1px solid var(--color-border-soft);
      background: var(--color-surface-alt);
    }

    .ssel__search mat-icon {
      position: absolute;
      left: 16px;
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: var(--color-ink-subtle);
      pointer-events: none;
    }

    .ssel__search input {
      width: 100%;
      height: 34px;
      padding: 0 10px 0 32px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      outline: none;
    }

    .ssel__search input:focus {
      border-color: var(--color-primary-bright);
    }

    .ssel__list {
      max-height: 240px;
      overflow-y: auto;
      padding: 4px;
    }

    .ssel__empty {
      padding: var(--sp-lg);
      text-align: center;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .ssel__opt {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      padding: 8px 10px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      text-align: left;
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .ssel__opt.is-active,
    .ssel__opt:hover {
      background: var(--color-surface-alt);
    }

    .ssel__opt.is-selected {
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-weight: 600;
    }

    .ssel__opt-main {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      flex: 1;
    }

    .ssel__opt-lbl {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ssel__opt-sub {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      font-weight: 400;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ssel__opt-check {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: var(--color-primary);
      flex-shrink: 0;
    }
  `,
})
export class SearchableSelect {
  private readonly hostRef = inject(ElementRef<HTMLElement>);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly options = input<SearchableOption[]>([]);
  readonly value = input<number | string | null>(null);
  readonly placeholder = input<string>('Chọn một mục…');
  readonly searchPlaceholder = input<string>('Gõ để lọc theo mã hoặc tên…');
  readonly allowClear = input<boolean>(true);
  readonly disabled = input<boolean>(false);
  readonly emptyText = input<string>('Không tìm thấy kết quả phù hợp');

  readonly valueChange = output<number | string | null>();

  protected readonly open = signal(false);
  protected readonly filterText = signal('');
  protected readonly activeIndex = signal(0);

  protected readonly selectedOption = computed(() => {
    const val = this.value();
    if (val === null || val === undefined || val === '') {
      return null;
    }
    return this.options().find((o) => String(o.value) === String(val)) ?? null;
  });

  protected readonly filteredOptions = computed(() => {
    const q = SearchableSelect.normalize(this.filterText());
    if (!q) {
      return this.options();
    }
    return this.options().filter((o) => {
      const hay = SearchableSelect.normalize(
        `${o.label} ${o.sub ?? ''} ${o.group ?? ''} ${String(o.value)}`,
      );
      return hay.includes(q);
    });
  });

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.close();
    } else {
      this.open.set(true);
      this.filterText.set('');
      this.activeIndex.set(0);
      setTimeout(() => this.searchInput()?.nativeElement.focus(), 0);
    }
  }

  protected close(): void {
    this.open.set(false);
    this.filterText.set('');
  }

  protected onFilterChange(text: string): void {
    this.filterText.set(text);
    this.activeIndex.set(0);
  }

  protected isSelected(optValue: number | string): boolean {
    const val = this.value();
    return val !== null && val !== undefined && String(val) === String(optValue);
  }

  protected selectOption(opt: SearchableOption): void {
    this.valueChange.emit(opt.value);
    this.close();
  }

  protected clear(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.valueChange.emit(null);
    this.close();
  }

  protected moveActive(delta: number, event: Event): void {
    event.preventDefault();
    const list = this.filteredOptions();
    if (list.length === 0) {
      return;
    }
    const next = (this.activeIndex() + delta + list.length) % list.length;
    this.activeIndex.set(next);
  }

  protected pickActive(event: Event): void {
    event.preventDefault();
    const list = this.filteredOptions();
    const opt = list[this.activeIndex()];
    if (opt) {
      this.selectOption(opt);
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  private static normalize(text: string): string {
    return (text ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
}
