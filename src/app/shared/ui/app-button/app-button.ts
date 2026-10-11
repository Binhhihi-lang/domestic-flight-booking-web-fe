import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'text';
export type ButtonSize = 'md' | 'sm';

/**
 * Nút dùng chung — 5 biến thể, 2 kích thước.
 *
 * Vì sao không bọc MatButton: MatButton áp màu theo theme Material, rất khó
 * ép về đúng token thương hiệu. Nút chỉ cần đúng màu và đúng hành vi, nên
 * dùng thẻ <button> thật là đủ và vẫn giữ nguyên accessibility.
 *
 * Quy ước sử dụng: chỉ MỘT nút primary trong mỗi vùng nhìn. Nhiều nút primary
 * cạnh nhau làm người dùng không biết bấm cái nào.
 */
@Component({
  selector: 'app-app-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn"
      [class]="classes()"
      [type]="type()"
      [disabled]="disabled()"
      (click)="onClick()"
    >
      <ng-content />
    </button>
  `,
  styles: `
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-weight: 600;
      line-height: 1.2;
      cursor: pointer;
      transition:
        background-color var(--dur-fast) var(--ease),
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .btn--md {
      padding: 11px 20px;
      font-size: var(--text-body);
    }

    .btn--sm {
      padding: 7px 13px;
      font-size: var(--text-small);
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }
    .btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn--secondary {
      background: var(--color-surface);
      color: var(--color-primary);
      border-color: var(--color-primary);
    }
    .btn--secondary:hover:not(:disabled) {
      background: var(--color-primary-soft);
    }

    .btn--ghost {
      background: transparent;
      color: var(--color-ink);
      border-color: var(--color-border);
    }
    .btn--ghost:hover:not(:disabled) {
      background: var(--color-surface-alt);
    }

    .btn--danger {
      background: var(--color-danger);
      color: var(--color-on-primary);
    }
    .btn--danger:hover:not(:disabled) {
      filter: brightness(0.93);
    }

    .btn--text {
      background: transparent;
      color: var(--color-primary);
      padding-left: 6px;
      padding-right: 6px;
    }
    .btn--text:hover:not(:disabled) {
      text-decoration: underline;
    }

    .btn:disabled {
      background: var(--color-border-soft);
      color: var(--color-ink-subtle);
      border-color: var(--color-border);
      cursor: not-allowed;
    }

    .btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  `,
})
export class AppButton {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input<boolean>(false);
  readonly type = input<'button' | 'submit'>('button');

  readonly clicked = output<void>();

  protected readonly classes = computed(() => `btn--${this.size()} btn--${this.variant()}`);

  protected onClick(): void {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
