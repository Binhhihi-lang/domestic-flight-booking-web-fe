import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';

/**
 * Khung trang khách hàng — bám mockup P1 (nguồn chân lý thị giác).
 *
 * Vì sao không dùng mat-toolbar: thanh Material tự áp màu và chiều cao theo
 * theme, rất khó ép về đúng tông thương hiệu và mật độ của mockup. Topbar ở
 * đây chỉ là flexbox thuần, cho phép kiểm soát hoàn toàn ở mọi breakpoint.
 *
 * Mobile: nav ngang bị ẩn và thay bằng nút hamburger + ngăn kéo — nhồi 5 link
 * vào một hàng ở 375px sẽ hoặc tràn ngang, hoặc đẩy topbar cao gần 1/5 màn hình.
 */
@Component({
  selector: 'app-client-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatMenuModule, BrandLogo],
  template: `
    <header class="topbar">
      <button
        class="topbar__menu"
        type="button"
        aria-label="Mở menu"
        [attr.aria-expanded]="menuOpen()"
        (click)="menuOpen.set(!menuOpen())"
      >
        <mat-icon>{{ menuOpen() ? 'close' : 'menu' }}</mat-icon>
      </button>

      <a class="topbar__brand" routerLink="/">
        <app-brand-logo size="md" tone="light" [tagline]="brandTagline" />
      </a>

      <nav class="topbar__nav">
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
          Trang chủ
        </a>
        <a routerLink="/flights" routerLinkActive="on">Đặt vé</a>
        <a routerLink="/promotions" routerLinkActive="on">Khuyến mãi</a>
        <a routerLink="/news" routerLinkActive="on">Tin tức</a>
      </nav>

      <span class="topbar__sp"></span>

      @if (authService.isLoggedIn()) {
        <button class="topbar__user" type="button" [matMenuTriggerFor]="accountMenu">
          <span class="avatar">{{ initials() }}</span>
          <span class="topbar__user-name">{{ authService.currentUser()?.full_name }}</span>
          <mat-icon>expand_more</mat-icon>
        </button>
        <mat-menu #accountMenu="matMenu">
          <button mat-menu-item type="button" routerLink="/account">
            <mat-icon>confirmation_number</mat-icon>
            <span>Vé của tôi</span>
          </button>
          <button mat-menu-item type="button" routerLink="/account/profile">
            <mat-icon>person</mat-icon>
            <span>Hồ sơ cá nhân</span>
          </button>
          @if (authService.isStaff()) {
            <button mat-menu-item type="button" (click)="goToAdmin()">
              <mat-icon>dashboard</mat-icon>
              <span>Khu vực vận hành</span>
            </button>
          }
          <button mat-menu-item type="button" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Đăng xuất</span>
          </button>
        </mat-menu>
      } @else {
        <a class="btn btn--ghost" routerLink="/login">
          <mat-icon>person</mat-icon>
          <span class="btn--hide-sm">Đăng nhập</span>
        </a>
        <a class="btn btn--primary" routerLink="/register">Đăng ký</a>
      }
    </header>

    @if (menuOpen()) {
      <nav class="drawer" aria-label="Menu di động">
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="menuOpen.set(false)">Trang chủ</a>
        <a routerLink="/flights" routerLinkActive="on" (click)="menuOpen.set(false)">Đặt vé</a>
        <a routerLink="/promotions" routerLinkActive="on" (click)="menuOpen.set(false)">Khuyến mãi</a>
        <a routerLink="/news" routerLinkActive="on" (click)="menuOpen.set(false)">Tin tức</a>
      </nav>
    }

    <main class="content">
      <router-outlet />
    </main>

    <footer class="foot">
      <div class="foot__in">
        <div>
          <div class="foot__brand">
            <app-brand-logo size="md" tone="dark" />
          </div>
          <p>
            Hệ thống đặt vé máy bay trực tuyến uy tín hàng đầu Việt Nam. Chúng tôi đồng hành
            cùng bạn trên mọi nẻo đường bay nội địa.
          </p>
          <div class="foot__soc">
            <span class="foot__s"><mat-icon>facebook</mat-icon></span>
            <span class="foot__s"><mat-icon>photo_camera</mat-icon></span>
            <span class="foot__s"><mat-icon>play_circle</mat-icon></span>
            <span class="foot__s"><mat-icon>chat</mat-icon></span>
          </div>
        </div>

        <div>
          <h4>Hỗ trợ</h4>
          <ul>
            <li>Hướng dẫn đặt vé</li>
            <li>Chính sách hoàn vé</li>
            <li>Câu hỏi thường gặp</li>
            <li>Liên hệ hỗ trợ</li>
          </ul>
        </div>

        <div>
          <h4>Khám phá</h4>
          <ul>
            <li>Điểm đến phổ biến</li>
            <li>Cẩm nang du lịch</li>
            <li>Ứng dụng di động</li>
            <li>Khách hàng thân thiết</li>
          </ul>
        </div>

        <div>
          <h4>Liên hệ</h4>
          <ul>
            <li><mat-icon>call</mat-icon> 1900 1234</li>
            <li><mat-icon>mail</mat-icon> support&#64;vedi.local</li>
            <li><mat-icon>place</mat-icon> Hoàn Kiếm, Hà Nội</li>
          </ul>
        </div>
      </div>

      <div class="foot__bot">
        <span>© 2026 VinaFly. Bản quyền thuộc về Công ty Cổ phần Công nghệ.</span>
        <div class="foot__pay">
          <span>VISA</span><span>Napas</span><span>MoMo</span>
        </div>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ---------- Topbar ---------- */
    .topbar {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 22px;
      min-height: 60px;
      padding: 10px 26px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      flex-wrap: nowrap;
    }

    .topbar__brand {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      white-space: nowrap;
    }

    .topbar__nav {
      display: flex;
      gap: 20px;
      font-size: 14px;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .topbar__nav::-webkit-scrollbar {
      display: none;
    }

    .topbar__nav a {
      color: var(--color-ink);
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
    }

    .topbar__nav a.on {
      color: var(--color-primary-bright);
      font-weight: 600;
    }

    .topbar__sp {
      flex: 1 1 auto;
    }

    .topbar__menu {
      display: none;
      border: 0;
      background: transparent;
      padding: 8px;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-ink);
    }

    .topbar__user {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      border: 0;
      background: transparent;
      cursor: pointer;
      font-family: var(--font-body);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--color-ink);
      padding: 4px;
      border-radius: var(--radius);
    }

    .topbar__user-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    .topbar__user mat-icon {
      color: var(--color-ink-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(140deg, var(--color-primary), var(--color-primary-bright));
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 13px;
      flex: 0 0 auto;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      padding: 10px 18px;
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .btn--primary:hover {
      background: var(--color-primary-hover);
    }

    .btn--ghost {
      background: transparent;
      color: var(--color-ink);
      border-color: var(--color-border);
    }

    .btn--ghost:hover {
      background: var(--color-surface-alt);
    }

    /* ---------- Ngăn kéo di động ---------- */
    .drawer {
      display: none;
      flex-direction: column;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 56px;
      z-index: 29;
    }

    .drawer a {
      padding: 14px 18px;
      font-size: 14.5px;
      font-weight: 500;
      color: var(--color-ink);
      text-decoration: none;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .drawer a.on {
      color: var(--color-primary);
      font-weight: 600;
      background: var(--color-primary-soft);
    }

    /* ---------- Nội dung ---------- */
    .content {
      flex: 1 1 auto;
      min-width: 0;
    }

    /* ---------- Footer ---------- */
    .foot {
      background: var(--color-dark);
      color: var(--color-on-dark-muted);
      margin-top: 44px;
    }

    .foot__in {
      max-width: 1240px;
      margin: 0 auto;
      padding: 40px 26px 26px;
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 30px;
    }

    .foot__brand {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }

    .foot p {
      font-size: 12.5px;
      line-height: 1.7;
      margin: 0 0 14px;
      color: var(--color-on-dark-subtle);
    }

    .foot h4 {
      color: #fff;
      font-size: 13.5px;
      font-weight: 700;
      margin: 0 0 13px;
    }

    .foot ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .foot li {
      font-size: 12.5px;
      color: var(--color-on-dark-subtle);
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .foot li mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #6b7f96;
    }

    .foot__soc {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .foot__s {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--color-dark-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .foot__s mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: var(--color-on-dark-subtle);
    }

    .foot__bot {
      border-top: 1px solid var(--color-dark-line);
      padding: 16px 26px;
      max-width: 1240px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #6b7f96;
    }

    .foot__pay {
      display: flex;
      gap: 7px;
      align-items: center;
    }

    .foot__pay span {
      background: var(--color-dark-2);
      padding: 3px 9px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--color-on-dark-subtle);
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc — đặt trước sẽ bị ghi đè.
       ===================================================================== */
    @media (max-width: 900px) {
      .topbar {
        gap: 8px;
        padding: 7px 12px;
        min-height: 52px;
      }

      .topbar__nav {
        display: none;
      }

      .topbar__menu {
        display: inline-flex;
      }

      .drawer {
        display: flex;
      }

      .topbar .btn {
        padding: 8px 12px;
        font-size: 12.5px;
      }

      .topbar__brand {
        font-size: 14.5px;
      }

      .topbar__user-name {
        display: none;
      }
    }

    @media (max-width: 860px) {
      .foot__in {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 560px) {
      .foot__in {
        grid-template-columns: 1fr;
        padding: 30px 18px 20px;
      }
    }

    @media (max-width: 430px) {
      /* iPhone SE 375px: logo + 2 nút vượt quá bề ngang, nên ẩn dòng tagline
         dưới logo và bỏ chữ ở nút phụ, chỉ giữ dấu logo.

         ::ng-deep là bắt buộc: .brand__tagline nằm trong app-brand-logo, mà
         view encapsulation của Angular chặn selector của component cha. */
      .topbar__brand ::ng-deep .brand__tagline {
        display: none;
      }

      .btn--hide-sm {
        display: none;
      }

      .topbar {
        gap: 6px;
        padding: 7px 10px;
      }
    }
  `,
})
export class ClientLayout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Dòng phụ dưới logo trên header. */
  protected readonly brandTagline = 'Bay nội địa, giá tốt mỗi ngày';

  protected readonly menuOpen = signal(false);

  /** Chữ viết tắt cho avatar — "Nguyễn Minh Anh" → "NM". */
  protected readonly initials = () => {
    const name = this.authService.currentUser()?.full_name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  };

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      // Dù Backend lỗi, phiên cục bộ vẫn phải được xóa (API Design mục 1.5)
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/']);
      },
    });
  }

  protected goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}
