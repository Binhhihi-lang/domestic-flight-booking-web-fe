import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

export interface AuthAsideStat {
  value: string;
  label: string;
}

const DEFAULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80';

const DEFAULT_STATS: AuthAsideStat[] = [
  { value: '5', label: 'hãng hàng không' },
  { value: '12', label: 'sân bay nội địa' },
  { value: '24/7', label: 'hỗ trợ khách hàng' },
];

/**
 * Panel giới thiệu bên trái của trang đăng nhập / đăng ký / quên mật khẩu —
 * bám sát `customer.html` (.cust-auth__aside) với ảnh nền thật + overlay navy tối.
 */
@Component({
  selector: 'app-auth-aside',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandLogo, RouterLink],
  template: `
    <aside class="auth__aside">
      <img class="auth__img" [src]="imageUrl()" [alt]="imageAlt()" loading="lazy" />
      <div class="auth__ov" aria-hidden="true"></div>

      <a class="auth__brand" routerLink="/" aria-label="Về trang chủ VinaFly">
        <app-brand-logo size="lg" tone="dark" [tagline]="''" />
      </a>

      <div class="auth__quote">
        <h2>{{ heading() }}</h2>
        @if (subheading()) {
          <p>{{ subheading() }}</p>
        }
      </div>

      <div class="auth__stats">
        @for (stat of stats(); track stat.label) {
          <div class="auth__stat">
            <b>{{ stat.value }}</b>
            <span>{{ stat.label }}</span>
          </div>
        }
      </div>
    </aside>
  `,
  styles: `
    :host {
      display: flex;
    }

    .auth__aside {
      flex: 1 1 auto;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: var(--sp-2xl);
      padding: var(--sp-3xl);
      background: var(--color-dark);
      color: var(--color-on-dark);
      overflow: hidden;
    }

    .auth__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: var(--color-border-soft);
    }

    .auth__ov {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        165deg,
        color-mix(in srgb, var(--color-dark) 88%, transparent) 0%,
        color-mix(in srgb, var(--color-dark) 72%, transparent) 55%,
        color-mix(in srgb, var(--color-dark) 92%, transparent) 100%
      );
    }

    .auth__brand {
      position: relative;
      z-index: 1;
      display: inline-flex;
      align-items: center;
      text-decoration: none;
    }

    .auth__brand ::ng-deep .brand__name {
      color: var(--color-on-dark);
    }

    .auth__brand ::ng-deep .brand__name-accent {
      color: var(--color-primary-bright);
    }

    .auth__quote {
      position: relative;
      z-index: 1;
      margin-top: auto;
    }

    .auth__quote h2 {
      color: var(--color-on-dark);
      font-size: clamp(1.375rem, 2.2vw, 1.875rem);
      font-weight: 700;
      letter-spacing: -0.5px;
      max-width: 22ch;
      line-height: 1.24;
    }

    .auth__quote p {
      color: var(--color-on-dark-muted);
      margin: var(--sp-md) 0 0;
      font-size: var(--text-body);
      max-width: 42ch;
      line-height: 1.6;
    }

    .auth__stats {
      position: relative;
      z-index: 1;
      display: flex;
      gap: var(--sp-2xl);
      flex-wrap: wrap;
      padding-top: var(--sp-xl);
      border-top: 1px solid color-mix(in srgb, var(--color-on-dark) 20%, transparent);
    }

    .auth__stat b {
      display: block;
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-on-dark);
    }

    .auth__stat span {
      font-size: var(--text-caption);
      color: var(--color-on-dark-subtle);
    }

    @media (max-width: 900px) {
      .auth__aside {
        display: none;
      }
    }
  `,
})
export class AuthAside {
  readonly heading = input.required<string>();
  readonly subheading = input<string>('');
  readonly imageUrl = input<string>(DEFAULT_IMAGE_URL);
  readonly imageAlt = input<string>('Máy bay cất cánh trên nền trời xanh');
  readonly stats = input<AuthAsideStat[]>(DEFAULT_STATS);
}
