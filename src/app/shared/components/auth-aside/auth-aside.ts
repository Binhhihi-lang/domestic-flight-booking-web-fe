import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandLogo } from '../brand-logo/brand-logo';

/**
 * Panel giới thiệu bên trái của trang đăng nhập/đăng ký — bám mockup P6.
 *
 * Vì sao tách component: login và register dùng CHUNG đúng panel này, chỉ
 * khác tiêu đề. Viết hai lần thì sửa một bên là bên kia lệch.
 *
 * Panel bị ẩn ở ≤880px (xem styles trong trang cha): trên điện thoại nó chiếm
 * hết màn hình và đẩy form xuống dưới, mà form mới là việc người dùng cần làm.
 */
@Component({
  selector: 'app-auth-aside',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandLogo],
  template: `
    <aside class="auth__aside">
      <div class="auth__brand">
        <app-brand-logo size="lg" tone="dark" [tagline]="brandTagline" />
      </div>

      <div class="auth__quote">
        <h2>{{ heading() }}</h2>
        <p>{{ subheading() }}</p>
      </div>

      <div class="auth__stats">
        <div class="auth__stat"><b>6</b><span>hãng hàng không</span></div>
        <div class="auth__stat"><b>32</b><span>đường bay nội địa</span></div>
        <div class="auth__stat"><b>24/7</b><span>hỗ trợ khách hàng</span></div>
      </div>
    </aside>
  `,
  styles: `
    /* Host là grid item của .auth — phải tự giãn hết chiều cao ô, nếu không
       panel chỉ cao bằng nội dung và hở một khoảng trắng bên dưới. */
    :host {
      display: flex;
    }

    .auth__aside {
      flex: 1 1 auto;
      background: linear-gradient(160deg, #0a4d8c, #0770cd 55%, #0194f3);
      padding: 44px 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #fff;
      position: relative;
      overflow: hidden;
      gap: 40px;
    }

    .auth__aside::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(700px 300px at 75% 15%, rgba(255, 255, 255, 0.15), transparent 60%);
    }

    .auth__brand {
      position: relative;
      z-index: 1;
    }

    .auth__quote {
      position: relative;
      z-index: 1;
    }

    .auth__quote h2 {
      font-size: 27px;
      font-weight: 700;
      letter-spacing: -0.4px;
      max-width: 420px;
      color: #fff;
    }

    .auth__quote p {
      color: rgba(255, 255, 255, 0.85);
      margin: 12px 0 0;
      font-size: 14.5px;
      max-width: 380px;
    }

    .auth__stats {
      display: flex;
      gap: 30px;
      position: relative;
      z-index: 1;
      flex-wrap: wrap;
    }

    .auth__stat b {
      display: block;
      font-family: var(--font-heading);
      font-size: 24px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .auth__stat span {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
    }

    @media (max-width: 880px) {
      .auth__aside {
        display: none;
      }
    }
  `,
})
export class AuthAside {
  readonly heading = input.required<string>();
  readonly subheading = input<string>('');

  protected readonly brandTagline = 'Bay nội địa, giá tốt mỗi ngày';
}
