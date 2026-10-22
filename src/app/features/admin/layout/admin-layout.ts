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
import { AuthService } from '@core/services/auth.service';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

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
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
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
        { path: '/admin/seat-types', label: 'Loại ghế', icon: 'event_seat', adminOnly: true },
        {
          path: '/admin/seat-class-surcharges',
          label: 'Phụ thu nâng hạng',
          icon: 'payments',
          adminOnly: true,
        },
        // KHÔNG có mục "Sơ đồ ghế" riêng: sơ đồ thuộc về MỘT máy bay nên vào từ
        // cột "Cấu hình" ở danh sách máy bay. Thêm mục nav cùng path
        // `/admin/aircrafts` sẽ làm hai mục cùng sáng khi active và Angular báo
        // trùng khoá `@for` (NG0955).
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
