import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Card 3 phần: đầu / thân / chân.
 *
 * Vì sao chân chỉ hiện khi có nội dung: nếu luôn render, mọi card đều có
 * một dải trống ở dưới — chi tiết nhỏ nhưng làm giao diện trông thiếu chăm sóc.
 */
@Component({
  selector: 'app-app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      @if (title()) {
        <div class="card__header">
          <div>
            <h3 class="card__title">{{ title() }}</h3>
            @if (subtitle()) {
              <p class="card__subtitle">{{ subtitle() }}</p>
            }
          </div>
          <div class="card__actions">
            <ng-content select="[cardActions]" />
          </div>
        </div>
      }

      <div class="card__body">
        <ng-content />
      </div>

      @if (hasFooter()) {
        <div class="card__footer">
          <ng-content select="[cardFooter]" />
        </div>
      }
    </div>
  `,
  styles: `
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 17px;
      border-bottom: 1px solid var(--color-border);
    }

    .card__title {
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 600;
      margin: 0;
    }

    .card__subtitle {
      margin: 3px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .card__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
    }

    .card__body {
      padding: 17px;
    }

    .card__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 17px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-alt);
    }
  `,
})
export class AppCard {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  /** Đặt true khi có nội dung ở slot cardFooter. */
  readonly hasFooter = input<boolean>(false);
}
