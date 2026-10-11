import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppButton } from '../../ui/app-button/app-button';

/**
 * Trạng thái danh sách rỗng.
 *
 * BR-LIST-02: kết quả rỗng là trạng thái hợp lệ, không phải lỗi — nên đây là
 * một component hiển thị bình thường, không phải màn hình lỗi. Có nút hành động
 * để biến màn rỗng thành lời mời làm việc, thay vì để người dùng bế tắc.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, AppButton],
  template: `
    <div class="empty-state">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <p class="empty-state__title">{{ message() }}</p>
      @if (hint()) {
        <p class="empty-state__hint">{{ hint() }}</p>
      }
      @if (actionLabel()) {
        <app-app-button size="sm" (clicked)="actionClicked.emit()">
          {{ actionLabel() }}
        </app-app-button>
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
      padding: 44px 16px;
      text-align: center;
      color: var(--color-ink-muted);
    }

    .empty-state mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
      color: var(--color-ink-subtle);
    }

    .empty-state__title {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 600;
      color: var(--color-ink);
    }

    .empty-state__hint {
      margin: 0;
      font-size: var(--text-small);
    }
  `,
})
export class EmptyState {
  readonly message = input<string>('Không có dữ liệu');
  readonly hint = input<string>('');
  readonly icon = input<string>('inbox');
  readonly actionLabel = input<string>('');

  readonly actionClicked = output<void>();
}
