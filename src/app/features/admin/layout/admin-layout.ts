import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { BrandLogo } from '../../../shared/components/brand-logo/brand-logo';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  /** Chỉ ADMIN mới thấy mục này (STAFF không có User Management/RBAC). */
  adminOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Khung khu vực vận hành (STAFF/ADMIN) — sidebar + header + nội dung + footer.
 *
 * Vì sao dùng sidebar chứ không phải thanh ngang: tài liệu UI đã chốt
 * "Admin Sidebar/Header/Breadcrumb", và khu vực này có ~20 màn chia thành 7
 * nhóm — nhồi hết lên thanh ngang thì không đọc được, còn sidebar hiện được
 * nhóm và giữ nguyên vị trí khi chuyển màn.
 *
 * Vì sao header có breadcrumb: người vận hành đi sâu 2–3 cấp (Danh mục >
 * Hãng hàng không > Sửa), breadcrumb là cách duy nhất biết mình đang ở đâu mà
 * không phải quay lại sidebar.
 *
 * Mobile (≤1024px): sidebar trượt ra ngoài, mở bằng nút hamburger trên header,
 * kèm lớp phủ để bấm ra ngoài là đóng.
 */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    BrandLogo,
  ],
  template: `
    <div class="shell" [class.shell--collapsed]="collapsed()">
      <!-- ============ SIDEBAR ============ -->
      @if (sidebarOpen()) {
        <div class="scrim" (click)="sidebarOpen.set(false)" aria-hidden="true"></div>
      }

      <aside class="sidebar" [class.sidebar--collapsed]="collapsed()" [class.sidebar--open]="sidebarOpen()">
        <div class="sidebar__head">
          <a class="sidebar__brand" routerLink="/admin/dashboard" (click)="sidebarOpen.set(false)">
            <app-brand-logo size="md" tone="dark" [markOnly]="collapsed()" />
          </a>

          <!-- Nút thu gọn: chỉ hiện trên desktop; mobile đã có hamburger. -->
          <button
            class="sidebar__collapse"
            type="button"
            [attr.aria-label]="collapsed() ? 'Mở rộng menu' : 'Thu gọn menu'"
            [attr.aria-expanded]="!collapsed()"
            (click)="toggleCollapse()"
          >
            <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>

        <nav class="sidebar__nav">
          @for (group of visibleGroups(); track group.label) {
            <div class="sidebar__group">
              @if (!collapsed()) {
                <div class="sidebar__label">{{ group.label }}</div>
              } @else {
                <div class="sidebar__sep" aria-hidden="true"></div>
              }
              @for (item of group.items; track item.path) {
                <a
                  class="sidebar__item"
                  [routerLink]="item.path"
                  routerLinkActive="on"
                  [matTooltip]="collapsed() ? item.label : ''"
                  matTooltipPosition="right"
                  (click)="sidebarOpen.set(false)"
                >
                  <mat-icon>{{ item.icon }}</mat-icon>
                  @if (!collapsed()) {
                    <span>{{ item.label }}</span>
                  }
                </a>
              }
            </div>
          }
        </nav>

        <div class="sidebar__foot">
          <a
            class="sidebar__item"
            routerLink="/"
            [matTooltip]="collapsed() ? 'Về trang khách hàng' : ''"
            matTooltipPosition="right"
            (click)="sidebarOpen.set(false)"
          >
            <mat-icon>storefront</mat-icon>
            @if (!collapsed()) {
              <span>Về trang khách hàng</span>
            }
          </a>
        </div>
      </aside>

      <!-- ============ MAIN ============ -->
      <div class="main">
        <!-- Ảnh bìa: dải màu thương hiệu có hoạ tiết, tạo chiều sâu cho khu
             vận hành giống dashboard tham chiếu. Thuần trang trí nên
             aria-hidden; không chứa thông tin. -->
        <div class="cover" aria-hidden="true">
          <span class="cover__blob cover__blob--1"></span>
          <span class="cover__blob cover__blob--2"></span>
          <span class="cover__blob cover__blob--3"></span>
        </div>

        <header class="header">
          <button
            class="header__menu"
            type="button"
            aria-label="Mở menu"
            [attr.aria-expanded]="sidebarOpen()"
            (click)="sidebarOpen.set(!sidebarOpen())"
          >
            <mat-icon>menu</mat-icon>
          </button>

          <nav class="crumbs" aria-label="Đường dẫn">
            <a routerLink="/admin/dashboard">Vận hành</a>
            @if (pageTitle()) {
              <mat-icon>chevron_right</mat-icon>
              <span class="crumbs__here">{{ pageTitle() }}</span>
            }
          </nav>

          <span class="header__sp"></span>

          <span class="header__date">
            <mat-icon>calendar_month</mat-icon>
            <span class="tabular">{{ today }}</span>
          </span>

          <button class="header__icon" type="button" aria-label="Thông báo">
            <mat-icon>notifications_none</mat-icon>
          </button>

          <button class="header__user" type="button" [matMenuTriggerFor]="accountMenu">
            <span class="header__meta">
              <span class="header__name">{{ authService.currentUser()?.full_name }}</span>
              <span class="header__role">{{ roleLabel() }}</span>
            </span>
            <span class="avatar">{{ initials() }}</span>
            <mat-icon class="header__caret">expand_more</mat-icon>
          </button>

          <mat-menu #accountMenu="matMenu">
            <button mat-menu-item type="button" routerLink="/admin/profile">
              <mat-icon>person</mat-icon>
              <span>Hồ sơ cá nhân</span>
            </button>
            <button mat-menu-item type="button" (click)="goToClient()">
              <mat-icon>storefront</mat-icon>
              <span>Về trang khách hàng</span>
            </button>
            <button mat-menu-item type="button" (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Đăng xuất</span>
            </button>
          </mat-menu>
        </header>

        <main class="content">
          <router-outlet />
        </main>

        <footer class="foot">
          <span>© 2026 VinaFly — Khu vực vận hành.</span>
          <span class="foot__v">Phiên bản 0.2 · Phase 1</span>
        </footer>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-w, 248px) 1fr;
      min-height: 100vh;
      background: var(--color-bg);
    }

    /* Thu gọn: chỉ còn cột icon. */
    .shell--collapsed {
      --sidebar-w: 76px;
    }

    /* ---------- Sidebar ---------- */
    /* Gradient dọc (sáng trên → tối dưới) theo ảnh tham chiếu của chủ dự án,
       không phải một màu phẳng. Mục đang chọn đảo ngược: nền trắng, chữ xanh. */
    .sidebar {
      background: linear-gradient(
        180deg,
        var(--color-sidebar-top) 0%,
        var(--color-sidebar-bottom) 100%
      );
      color: var(--color-sidebar-item);
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      overflow-x: hidden;
      z-index: 50;
      transition: width var(--dur) var(--ease);
    }

    .sidebar__head {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 16px 12px 14px;
      border-bottom: 1px solid var(--color-sidebar-line);
      flex: 0 0 auto;
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      text-decoration: none;
      min-width: 0;
      flex: 1 1 auto;
    }

    /* Nút thu gọn nằm mép phải sidebar, chỉ có trên desktop. */
    .sidebar__collapse {
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 1px solid var(--color-sidebar-line);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease);
    }

    .sidebar__collapse:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .sidebar__collapse mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }

    .sidebar__nav {
      padding: 10px 0 16px;
      flex: 1 1 auto;
    }

    .sidebar__group {
      margin-bottom: 6px;
    }

    .sidebar__label {
      padding: 14px 18px 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.8px;
      color: var(--color-sidebar-label);
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* Khi thu gọn, nhãn nhóm thay bằng một vạch ngăn mảnh. */
    .sidebar__sep {
      height: 1px;
      margin: 10px 14px;
      background: var(--color-sidebar-line);
    }

    .sidebar__item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 8px;
      padding: 10px;
      font-size: 13.5px;
      color: var(--color-sidebar-item);
      text-decoration: none;
      border-radius: var(--radius);
      white-space: nowrap;
      transition:
        background var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .sidebar__item:hover {
      background: var(--color-sidebar-hover);
      color: #fff;
    }

    /* Mục đang chọn: nền trắng, chữ và icon xanh đậm. */
    .sidebar__item.on {
      background: var(--color-sidebar-active-bg);
      color: var(--color-sidebar-active-fg);
      font-weight: 600;
    }

    .sidebar__item mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
      color: var(--color-sidebar-icon);
      flex: 0 0 auto;
    }

    .sidebar__item.on mat-icon {
      color: var(--color-sidebar-active-fg);
    }

    .sidebar__foot {
      border-top: 1px solid var(--color-sidebar-line);
      padding: 8px 0;
      flex: 0 0 auto;
    }

    /* ---------- Sidebar thu gọn (desktop) ---------- */
    .sidebar--collapsed .sidebar__head {
      flex-direction: column;
      gap: 10px;
      padding: 14px 8px;
    }

    .sidebar--collapsed .sidebar__item {
      justify-content: center;
      margin: 0 10px;
      padding: 11px 0;
    }

    /* Lớp phủ khi sidebar mở trên mobile — bấm ra ngoài là đóng. */
    .scrim {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(3, 18, 26, 0.5);
      z-index: 45;
    }

    /* ---------- Cột phải ---------- */
    .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
    }

    /* ---------- Ảnh bìa ---------- */
    /* Dải màu thương hiệu có hoạ tiết mờ, tạo chiều sâu cho khu vận hành.
       Dùng radial-gradient thay vì ảnh thật: không phát sinh request, không
       bị vỡ nét, và không lệ thuộc ảnh bên ngoài (mạng nội bộ vẫn hiển thị). */
    .cover {
      position: relative;
      height: 104px;
      overflow: hidden;
      background: linear-gradient(115deg, #0a4d8c 0%, #0770cd 46%, #0194f3 100%);
      flex: 0 0 auto;
    }

    .cover__blob {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.14);
    }

    .cover__blob--1 {
      width: 220px;
      height: 220px;
      top: -120px;
      right: 6%;
    }

    .cover__blob--2 {
      width: 140px;
      height: 140px;
      bottom: -80px;
      right: 26%;
      background: rgba(255, 255, 255, 0.1);
    }

    .cover__blob--3 {
      width: 90px;
      height: 90px;
      top: 12px;
      left: 42%;
      background: rgba(255, 255, 255, 0.08);
    }

    .header {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 60px;
      padding: 10px 24px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .header__menu {
      display: none;
      border: 0;
      background: transparent;
      padding: 8px;
      cursor: pointer;
      border-radius: var(--radius);
      color: var(--color-ink);
    }

    .crumbs {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13.5px;
      min-width: 0;
    }

    .crumbs a {
      color: var(--color-ink-muted);
      text-decoration: none;
      white-space: nowrap;
    }

    .crumbs a:hover {
      color: var(--color-primary);
    }

    .crumbs mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: var(--color-ink-subtle);
      flex: 0 0 auto;
    }

    .crumbs__here {
      color: var(--color-ink);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .header__sp {
      flex: 1 1 auto;
    }

    .header__date {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--color-ink-muted);
      white-space: nowrap;
    }

    .header__date mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-ink-subtle);
    }

    .header__icon {
      border: 0;
      background: transparent;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--color-ink-muted);
      flex: 0 0 auto;
    }

    .header__icon:hover {
      background: var(--color-surface-alt);
      color: var(--color-ink);
    }

    .header__icon mat-icon {
      font-size: 21px;
      width: 21px;
      height: 21px;
    }

    .header__user {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: var(--radius);
      font-family: var(--font-body);
    }

    .header__user:hover {
      background: var(--color-surface-alt);
    }

    .header__meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.25;
    }

    .header__name {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--color-ink);
      white-space: nowrap;
    }

    .header__role {
      font-size: 11.5px;
      color: var(--color-ink-muted);
    }

    .header__caret {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--color-ink-muted);
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

    .content {
      flex: 1 1 auto;
      min-width: 0;
    }

    /* ---------- Footer ---------- */
    .foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      padding: 16px 24px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
      font-size: 12.5px;
      color: var(--color-ink-muted);
    }

    .foot__v {
      color: var(--color-ink-subtle);
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */

    /* ≤1024px: sidebar trượt ra ngoài, mở bằng hamburger + lớp phủ. */
    @media (max-width: 1024px) {
      .shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 264px;
        transform: translateX(-100%);
      }

      .sidebar--open {
        transform: translateX(0);
      }

      .scrim {
        display: block;
      }

      .header__menu {
        display: inline-flex;
      }

      /* Nút thu gọn chỉ có nghĩa trên desktop — mobile đã có hamburger. */
      .sidebar__collapse {
        display: none;
      }
    }

    @media (max-width: 900px) {
      .cover {
        height: 84px;
      }
    }

    @media (max-width: 640px) {
      .header {
        padding: 9px 14px;
        gap: 8px;
      }

      .header__meta {
        display: none;
      }

      .header__date {
        display: none;
      }

      .cover {
        height: 68px;
      }

      .foot {
        padding: 14px;
        justify-content: center;
        text-align: center;
      }
    }
  `,
})
export class AdminLayout implements AfterViewInit {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly sidebarOpen = signal(false);

  /**
   * Sidebar thu gọn (chỉ icon). Giữ trong bộ nhớ của layout, không lưu
   * localStorage — mỗi lần vào lại khu vận hành nên thấy menu đầy đủ.
   */
  protected readonly collapsed = signal(false);

  protected toggleCollapse(): void {
    this.collapsed.set(!this.collapsed());
  }

  /** Ngày hiện tại cho header, định dạng dd/MM/yyyy. */
  protected readonly today = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  /** Tiêu đề màn đang mở — lấy từ `data.title` của route con sâu nhất. */
  protected readonly pageTitle = signal('');

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.pageTitle.set(this.deepestTitle()));
  }

  /**
   * Đọc tiêu đề sau khi router đã kích hoạt route con.
   * Không đọc trong constructor: lúc đó `route.firstChild` còn undefined.
   */
  ngAfterViewInit(): void {
    this.pageTitle.set(this.deepestTitle());
  }

  private deepestTitle(): string {
    let child = this.route.firstChild;
    let title = '';
    while (child) {
      title = (child.snapshot.data['title'] as string) ?? title;
      child = child.firstChild;
    }
    return title;
  }

  private readonly navGroups: NavGroup[] = [
    {
      label: 'Tổng quan',
      items: [{ path: '/admin/dashboard', label: 'Dashboard', icon: 'space_dashboard' }],
    },
    {
      label: 'Người dùng & phân quyền',
      items: [
        { path: '/admin/users', label: 'Người dùng', icon: 'manage_accounts', adminOnly: true },
        { path: '/admin/roles', label: 'Vai trò', icon: 'admin_panel_settings', adminOnly: true },
        { path: '/admin/permissions', label: 'Quyền', icon: 'vpn_key', adminOnly: true },
      ],
    },
    {
      label: 'Danh mục hàng không',
      items: [
        { path: '/admin/airlines', label: 'Hãng hàng không', icon: 'connecting_airports', adminOnly: true },
        { path: '/admin/cities', label: 'Thành phố', icon: 'location_city', adminOnly: true },
        { path: '/admin/airports', label: 'Sân bay', icon: 'local_airport', adminOnly: true },
        { path: '/admin/aircrafts', label: 'Máy bay', icon: 'airlines', adminOnly: true },
        {
          path: '/admin/seat-configurations',
          label: 'Sơ đồ ghế',
          icon: 'event_seat',
          adminOnly: true,
        },
      ],
    },
    {
      label: 'Bán vé & khuyến mãi',
      items: [
        { path: '/admin/flights', label: 'Chuyến bay', icon: 'flight_takeoff' },
        { path: '/admin/bookings', label: 'Đặt chỗ', icon: 'confirmation_number' },
        { path: '/admin/promotions', label: 'Khuyến mãi', icon: 'local_offer', adminOnly: true },
        { path: '/admin/vouchers', label: 'Voucher', icon: 'redeem', adminOnly: true },
      ],
    },
    {
      label: 'Nội dung',
      items: [
        { path: '/admin/news', label: 'Tin tức', icon: 'feed', adminOnly: true },
        {
          path: '/admin/news-categories',
          label: 'Danh mục tin',
          icon: 'label',
          adminOnly: true,
        },
      ],
    },
    {
      label: 'Hệ thống',
      items: [
        { path: '/admin/profile', label: 'Hồ sơ cá nhân', icon: 'account_circle' },
        { path: '/admin/style-guide', label: 'Design system', icon: 'palette' },
      ],
    },
  ];

  /** STAFF không có User Management/RBAC (Permission Matrix v2.0). */
  protected readonly visibleGroups = computed(() => {
    const isAdmin = this.authService.isAdmin();
    return this.navGroups
      .map((group) => ({
        label: group.label,
        items: group.items.filter((item) => !item.adminOnly || isAdmin),
      }))
      .filter((group) => group.items.length > 0);
  });

  protected readonly roleLabel = computed(() =>
    this.authService.isAdmin() ? 'Quản trị viên' : 'Nhân viên',
  );

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

  protected goToClient(): void {
    this.router.navigate(['/']);
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/']);
      },
    });
  }
}
