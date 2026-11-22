import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Tiêu đề trang + mô tả + slot hành động bên phải — bám sát `.adm-page` của prototype. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="page-header__text">
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-lg);
      flex-wrap: wrap;
      margin-bottom: var(--sp-xl);
    }

    .page-header__text {
      min-width: 0;
    }

    .page-header__text h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h1);
      font-weight: 700;
      line-height: var(--leading-tight);
      color: var(--color-ink);
    }

    .page-header__text p {
      margin: 6px 0 0;
      font-family: var(--font-body);
      font-size: var(--text-small);
      line-height: var(--leading-normal);
      color: var(--color-ink-muted);
    }

    .page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      flex-wrap: wrap;
    }
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
