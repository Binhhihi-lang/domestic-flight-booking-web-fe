import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import QRCode from 'qrcode';

/**
 * Hiển thị mã QR chuẩn ISO/IEC 18004 (sinh client-side bằng `qrcode`, hoạt động 100% offline
 * và in sắc nét ở chế độ `@media print`).
 */
@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dataUrl(); as src) {
      <img
        class="qr-img"
        [src]="src"
        [alt]="alt()"
        [width]="size()"
        [height]="size()"
      />
    } @else {
      <span
        class="qr-placeholder"
        [style.width.px]="size()"
        [style.height.px]="size()"
        aria-hidden="true"
      ></span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .qr-img {
      display: block;
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      image-rendering: pixelated;
    }

    .qr-placeholder {
      display: inline-block;
      border-radius: var(--radius-sm);
      background: var(--color-border-soft);
    }
  `,
})
export class QrCodeComponent {
  readonly value = input.required<string>();
  readonly size = input<number>(92);
  readonly alt = input<string>('Mã QR xác thực vé điện tử');

  protected readonly dataUrl = signal<string | null>(null);

  constructor() {
    effect(() => {
      const content = this.value().trim();
      const px = Math.max(48, this.size());
      if (!content) {
        this.dataUrl.set(null);
        return;
      }
      QRCode.toDataURL(content, {
        width: px * 2,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => this.dataUrl.set(url))
        .catch(() => this.dataUrl.set(null));
    });
  }
}
