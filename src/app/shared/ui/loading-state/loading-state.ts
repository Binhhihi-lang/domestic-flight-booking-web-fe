import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Trạng thái đang tải — spinner + thông điệp. */
@Component({
  selector: 'app-loading-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status">
      <span class="loading__spinner" aria-hidden="true"></span>
      <p class="loading__message">{{ message() }}</p>
    </div>
  `,
  styles: `
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 34px 16px;
      color: var(--color-ink-muted);
    }

    .loading__spinner {
      width: 22px;
      height: 22px;
      border: 2.5px solid var(--color-primary-soft);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading__message {
      margin: 0;
      font-size: var(--text-small);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .loading__spinner {
        animation-duration: 2.5s;
      }
    }
  `,
})
export class LoadingState {
  readonly message = input<string>('Đang tải dữ liệu…');
}
