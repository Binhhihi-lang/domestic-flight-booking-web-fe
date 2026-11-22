import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

type PagerToken = number | 'ellipsis-left' | 'ellipsis-right';

/**
 * Thanh phân trang phía server dùng chung cho mọi bảng quản trị (`.adm-pager`).
 *
 * Thiết kế tối ưu cho bảng lớn (100.000+ bản ghi):
 * - Cửa sổ số trang có dấu ba chấm (`1 … 499 500 501 … 5000`)
 * - Nút Đầu / Trước / Sau / Cuối
 * - Chọn số dòng mỗi trang + ô nhảy nhanh tới trang bất kỳ
 */
@Component({
  selector: 'app-server-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="adm-pager" role="navigation" aria-label="Phân trang">
      <span class="adm-pager__info tabular">{{ rangeLabel() }}</span>

      <div class="adm-pager__controls">
        <div class="adm-pager__nums">
          <button
            class="adm-pg adm-pg--nav"
            type="button"
            aria-label="Trang đầu"
            title="Trang đầu"
            [disabled]="currentPage() <= 1"
            (click)="goTo(1)"
          >
            <mat-icon aria-hidden="true">first_page</mat-icon>
          </button>

          <button
            class="adm-pg adm-pg--nav"
            type="button"
            aria-label="Trang trước"
            title="Trang trước"
            [disabled]="currentPage() <= 1"
            (click)="goTo(currentPage() - 1)"
          >
            <mat-icon aria-hidden="true">chevron_left</mat-icon>
          </button>

          @for (token of pageTokens(); track token) {
            @if (token === 'ellipsis-left' || token === 'ellipsis-right') {
              <span class="adm-pg-ellipsis" aria-hidden="true">…</span>
            } @else {
              <button
                class="adm-pg"
                type="button"
                [class.is-on]="token === currentPage()"
                [attr.aria-current]="token === currentPage() ? 'page' : null"
                (click)="goTo(token)"
              >
                {{ token }}
              </button>
            }
          }

          <button
            class="adm-pg adm-pg--nav"
            type="button"
            aria-label="Trang sau"
            title="Trang sau"
            [disabled]="currentPage() >= effectiveTotalPages()"
            (click)="goTo(currentPage() + 1)"
          >
            <mat-icon aria-hidden="true">chevron_right</mat-icon>
          </button>

          <button
            class="adm-pg adm-pg--nav"
            type="button"
            aria-label="Trang cuối"
            title="Trang cuối"
            [disabled]="currentPage() >= effectiveTotalPages()"
            (click)="goTo(effectiveTotalPages())"
          >
            <mat-icon aria-hidden="true">last_page</mat-icon>
          </button>
        </div>

        <select
          class="adm-pager__size"
          aria-label="Số dòng mỗi trang"
          [ngModel]="size()"
          (ngModelChange)="onSizeChange($event)"
        >
          @for (opt of normalizedSizeOptions(); track opt) {
            <option [ngValue]="opt">{{ opt }} / trang</option>
          }
        </select>

        @if (effectiveTotalPages() > 5) {
          <form class="adm-pager__jump" (submit)="$event.preventDefault(); submitJump()">
            <label class="adm-pager__jump-lbl" for="adm-pager-jump-input">Đến</label>
            <input
              id="adm-pager-jump-input"
              class="adm-pager__jump-in"
              type="number"
              min="1"
              [max]="effectiveTotalPages()"
              [placeholder]="String(currentPage())"
              [ngModel]="jumpInput()"
              (ngModelChange)="jumpInput.set($event)"
              name="jumpPage"
              aria-label="Nhập số trang cần đến"
            />
          </form>
        }
      </div>
    </div>
  `,
  styles: `
    .adm-pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      flex-wrap: wrap;
      padding: var(--sp-md) var(--sp-xl);
      border-top: 1px solid var(--color-border-soft);
      background: var(--color-surface);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .adm-pager__info {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      font-variant-numeric: tabular-nums;
    }

    .adm-pager__controls {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      flex-wrap: wrap;
    }

    .adm-pager__nums {
      display: flex;
      align-items: center;
      gap: var(--sp-xs);
    }

    .adm-pg {
      min-width: 30px;
      height: 30px;
      padding: 0 6px;
      display: inline-grid;
      place-items: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease),
        background-color var(--dur-fast) var(--ease);
    }

    .adm-pg:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .adm-pg.is-on {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }

    .adm-pg.is-on:hover:not(:disabled) {
      color: var(--color-on-primary);
    }

    .adm-pg--nav {
      color: var(--color-ink-muted);
    }

    .adm-pg:disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }

    .adm-pg mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .adm-pg-ellipsis {
      min-width: 24px;
      text-align: center;
      font-weight: 600;
      color: var(--color-ink-subtle);
      user-select: none;
    }

    .adm-pager__size {
      height: 30px;
      padding: 0 26px 0 9px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 500;
      background-color: var(--color-surface);
      color: var(--color-ink);
      cursor: pointer;
      appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, var(--color-ink-muted) 50%),
        linear-gradient(135deg, var(--color-ink-muted) 50%, transparent 50%);
      background-position:
        calc(100% - 13px) calc(50% + 1px),
        calc(100% - 9px) calc(50% + 1px);
      background-size: 4px 4px, 4px 4px;
      background-repeat: no-repeat;
    }

    .adm-pager__size:hover,
    .adm-pager__size:focus {
      border-color: var(--color-primary);
      outline: none;
    }

    .adm-pager__jump {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: var(--sp-xs);
    }

    .adm-pager__jump-lbl {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
      white-space: nowrap;
    }

    .adm-pager__jump-in {
      width: 60px;
      height: 30px;
      padding: 0 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }

    .adm-pager__jump-in:focus {
      border-color: var(--color-primary);
      outline: none;
      box-shadow: 0 0 0 2px var(--color-primary-soft);
    }

    @media (max-width: 640px) {
      .adm-pager {
        padding: var(--sp-md);
        justify-content: center;
      }
    }
  `,
})
export class ServerPager {
  protected readonly String = String;

  /** Trang hiện tại (bắt đầu từ 1). */
  readonly page = input<number>(1);
  readonly size = input<number>(20);
  readonly totalItems = input<number>(0);
  readonly totalPages = input<number>(1);
  readonly pageSizeOptions = input<number[]>([20, 50, 100]);
  /** Danh từ tùy chọn nối sau tổng số bản ghi (ví dụ "hãng hàng không"). */
  readonly noun = input<string>('');

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  protected readonly jumpInput = signal<string>('');

  protected readonly effectiveTotalPages = computed(() => {
    const provided = this.totalPages();
    if (provided && provided > 0) {
      return provided;
    }
    const sz = Math.max(1, this.size());
    return Math.max(1, Math.ceil(this.totalItems() / sz));
  });

  protected readonly currentPage = computed(() =>
    Math.min(Math.max(1, this.page()), this.effectiveTotalPages()),
  );

  protected readonly normalizedSizeOptions = computed(() => {
    const set = new Set<number>(this.pageSizeOptions());
    if (this.size() > 0) {
      set.add(this.size());
    }
    return [...set].sort((a, b) => a - b);
  });

  protected readonly rangeLabel = computed(() => {
    const total = this.totalItems();
    const suffix = this.noun().trim() ? ` ${this.noun().trim()}` : '';
    if (total === 0) {
      return `Hiển thị 0 / 0${suffix}`;
    }
    const from = (this.currentPage() - 1) * this.size() + 1;
    const to = Math.min(this.currentPage() * this.size(), total);
    return `Hiển thị ${from.toLocaleString('vi-VN')}–${to.toLocaleString('vi-VN')} / ${total.toLocaleString('vi-VN')}${suffix}`;
  });

  /**
   * Thuật toán hiển thị số trang thông minh (tối đa 7 nút cho mọi quy mô 100.000+ bản ghi):
   * luôn giữ trang 1, trang cuối và cửa sổ xung quanh trang hiện tại.
   */
  protected readonly pageTokens = computed<PagerToken[]>(() => {
    const total = this.effectiveTotalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const tokens: PagerToken[] = [1];

    if (current <= 4) {
      tokens.push(2, 3, 4, 5, 'ellipsis-right', total);
      return tokens;
    }

    if (current >= total - 3) {
      tokens.push('ellipsis-left', total - 4, total - 3, total - 2, total - 1, total);
      return tokens;
    }

    tokens.push('ellipsis-left', current - 1, current, current + 1, 'ellipsis-right', total);
    return tokens;
  });

  protected goTo(target: number): void {
    const clamped = Math.min(Math.max(1, Math.floor(target)), this.effectiveTotalPages());
    if (clamped !== this.currentPage()) {
      this.pageChange.emit(clamped);
    }
  }

  protected onSizeChange(nextSize: number | string): void {
    const parsed = Number(nextSize);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed !== this.size()) {
      this.sizeChange.emit(parsed);
    }
  }

  protected submitJump(): void {
    const parsed = Number(this.jumpInput());
    if (!Number.isFinite(parsed) || parsed < 1) {
      this.jumpInput.set('');
      return;
    }
    this.goTo(parsed);
    this.jumpInput.set('');
  }
}
