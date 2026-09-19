import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Trạng thái danh sách rỗng.
 *
 * BR-LIST-02: kết quả rỗng là trạng thái hợp lệ, không phải lỗi — nên đây là
 * một component hiển thị bình thường, không phải màn hình lỗi.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <p class="empty-state__title">{{ message() }}</p>
      @if (hint()) {
        <p class="empty-state__hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 48px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .empty-state mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
      opacity: 0.6;
    }

    .empty-state__title {
      margin: 0;
      font: var(--mat-sys-title-medium);
    }

    .empty-state__hint {
      margin: 0;
      font: var(--mat-sys-body-small);
    }
  `,
})
export class EmptyState {
  readonly message = input<string>('Không có dữ liệu');
  readonly hint = input<string>('');
  readonly icon = input<string>('inbox');
}
