import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** `warn` dùng cho hành động phá hủy (ngừng dùng, xóa mềm, hủy booking). */
  tone?: 'primary' | 'warn';
  /** Nội dung khối cảnh báo phụ; mặc định tự hiển thị lưu ý xóa mềm khi `tone = 'warn'`. */
  warningNote?: string;
  /** Ẩn khối cảnh báo xóa mềm nếu hành động không phải xóa mềm. */
  hideSoftDeleteNote?: boolean;
}

/**
 * Hộp thoại xác nhận trước hành động quan trọng — đồng bộ `#ov-delete-confirm`
 * trong prototype `admin.html` (icon tròn đỏ, nút đóng ×, cảnh báo xóa mềm, nút đỏ có icon).
 *
 * Lưu ý a11y & kiểm thử: icon trong nút xác nhận dùng SVG nội tuyến (`aria-hidden="true"`)
 * để `button.textContent.trim()` giữ nguyên nhãn thuần (ví dụ "Xóa") không bị dính tên glyph.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatIconModule],
  template: `
    <div class="dlg" role="document">
      <div class="dlg__head">
        <div class="dlg__title-wrap">
          <span class="dlg__ic" [class.dlg__ic--primary]="data.tone !== 'warn'" aria-hidden="true">
            <mat-icon>{{ data.tone === 'warn' ? 'delete_forever' : 'help_outline' }}</mat-icon>
          </span>
          <div class="dlg__titles">
            <h3 class="dlg__title">{{ data.title }}</h3>
            <p class="dlg__sub">{{ data.message }}</p>
          </div>
        </div>
        <button class="dlg__close" type="button" aria-label="Đóng" (click)="close(false)">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      </div>

      @if (data.tone === 'warn' && !data.hideSoftDeleteNote) {
        <div class="dlg__body">
          <div class="dlg__note">
            <mat-icon aria-hidden="true">warning</mat-icon>
            <span>
              @if (data.warningNote) {
                {{ data.warningNote }}
              } @else {
                Bản ghi sẽ bị <b>ẩn khỏi mọi danh sách</b> và chuyển sang trạng thái ngừng dùng.
                Vé đã bán và dữ liệu đối soát <b>giữ nguyên</b>.
              }
            </span>
          </div>
        </div>
      }

      <div class="dlg__foot">
        <button class="dlg__btn dlg__btn--secondary" type="button" (click)="close(false)">
          {{ data.cancelText || 'Hủy' }}
        </button>
        <button
          class="dlg__btn"
          [class.dlg__btn--danger]="data.tone === 'warn'"
          [class.dlg__btn--primary]="data.tone !== 'warn'"
          type="button"
          (click)="close(true)"
        >
          @if (data.tone === 'warn') {
            <svg class="dlg__btn-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
          } @else {
            <svg class="dlg__btn-ic" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
              />
            </svg>
          }
          {{ data.confirmText || 'Xác nhận' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 520px;
      width: min(520px, 92vw);
    }

    .dlg {
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      overflow: hidden;
      font-family: var(--font-body);
      color: var(--color-ink);
    }

    .dlg__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-lg);
      padding: var(--sp-xl) var(--sp-xl) var(--sp-md);
    }

    .dlg__title-wrap {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-md);
      min-width: 0;
    }

    .dlg__ic {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--color-danger-soft);
      color: var(--color-danger);
      flex-shrink: 0;
    }

    .dlg__ic--primary {
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }

    .dlg__ic mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .dlg__titles {
      min-width: 0;
    }

    .dlg__title {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 700;
      line-height: var(--leading-tight);
      color: var(--color-ink);
    }

    .dlg__sub {
      margin: var(--sp-sm) 0 0;
      font-size: var(--text-small);
      line-height: var(--leading-normal);
      color: var(--color-ink-muted);
    }

    .dlg__close {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-ink-muted);
      cursor: pointer;
      flex-shrink: 0;
      transition:
        background-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .dlg__close:hover {
      background: var(--color-border-soft);
      color: var(--color-ink);
    }

    .dlg__close mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .dlg__body {
      padding: var(--sp-xs) var(--sp-xl) var(--sp-xl);
    }

    .dlg__note {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-md);
      padding: var(--sp-md) var(--sp-lg);
      border-radius: var(--radius);
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
      font-size: var(--text-small);
      line-height: 1.55;
    }

    .dlg__note mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-on-danger-soft);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .dlg__foot {
      display: flex;
      justify-content: flex-end;
      gap: var(--sp-md);
      padding: var(--sp-lg) var(--sp-xl);
      border-top: 1px solid var(--color-border-soft);
      background: var(--color-surface-alt);
    }

    .dlg__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 40px;
      padding: 0 var(--sp-lg);
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
      transition:
        background-color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .dlg__btn--secondary {
      background: var(--color-surface);
      border-color: var(--color-border);
      color: var(--color-ink);
    }

    .dlg__btn--secondary:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .dlg__btn--danger {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: var(--color-on-primary);
    }

    .dlg__btn--danger:hover {
      filter: brightness(0.93);
    }

    .dlg__btn--primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }

    .dlg__btn--primary:hover {
      background: var(--color-primary-hover);
    }

    .dlg__btn-ic {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `,
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog, boolean>);

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
