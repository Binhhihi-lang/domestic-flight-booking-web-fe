import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Trang giữ chỗ cho chức năng thuộc sprint sau.
 *
 * Dùng cho route đã khai báo nhưng chưa có màn hình thật, để điều hướng
 * không rơi vào link chết trong lúc chờ Backend hoàn thành phase tương ứng.
 */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="coming-soon">
      <mat-icon aria-hidden="true">construction</mat-icon>
      <h2>{{ title() }}</h2>
      <p>Chức năng này sẽ được hoàn thành ở sprint tiếp theo.</p>
    </div>
  `,
  styles: `
    .coming-soon {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 64px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .coming-soon mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
      opacity: 0.6;
    }

    .coming-soon h2 {
      margin: 0;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
    }

    .coming-soon p {
      margin: 0;
      font: var(--mat-sys-body-small);
    }
  `,
})
export class ComingSoon {
  readonly title = input<string>('Đang phát triển');
}
