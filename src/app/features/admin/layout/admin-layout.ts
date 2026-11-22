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
import { NotificationBell } from '@shared/components/notification-bell/notification-bell';

interface NavItem {
  id: string;
  path?: string;
  action?: 'logout';
  label: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Khung khu vực vận hành (ADMIN / STAFF) — sidebar dọc + header breadcrumb + nội dung + footer.
 *
 * Tách riêng cấu trúc menu theo đúng vai trò (bám sát prototype `admin.html` & `staff.html`):
 * - ADMIN: 7 nhóm quản trị đầy đủ (bỏ Hạng dịch vụ V16 và bỏ Design system khỏi menu vận hành).
 * - STAFF: 3 nhóm gọn (Vận hành, Danh mục máy bay chỉ đọc, Cá nhân).
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
    NotificationBell,
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

  private readonly adminNavGroups: NavGroup[] = [
    {
      label: 'Tổng quan',
      items: [
        { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
        { id: 'reports', path: '/admin/reports', label: 'Báo cáo & thống kê', icon: 'insights' },
      ],
    },
    {
      label: 'Người dùng & phân quyền',
      items: [
        { id: 'users', path: '/admin/users', label: 'Người dùng', icon: 'manage_accounts' },
        { id: 'roles', path: '/admin/roles', label: 'Vai trò', icon: 'admin_panel_settings' },
        { id: 'permissions', path: '/admin/permissions', label: 'Quyền', icon: 'vpn_key' },
      ],
    },
    {
      label: 'Danh mục hàng không',
      items: [
        { id: 'airlines', path: '/admin/airlines', label: 'Hãng hàng không', icon: 'connecting_airports' },
        { id: 'cities', path: '/admin/cities', label: 'Thành phố', icon: 'location_city' },
        { id: 'airports', path: '/admin/airports', label: 'Sân bay', icon: 'local_airport' },
        { id: 'aircrafts', path: '/admin/aircrafts', label: 'Máy bay', icon: 'airlines' },
        { id: 'seat-types', path: '/admin/seat-types', label: 'Loại ghế', icon: 'event_seat' },
      ],
    },
    {
      label: 'Giá vé & hành lý',
      items: [
        { id: 'fare-classes', path: '/admin/fare-classes', label: 'Hạng vé', icon: 'sell' },
        { id: 'fare-rules', path: '/admin/fare-rules', label: 'Quy định hoàn vé', icon: 'gavel' },
        { id: 'baggage-options', path: '/admin/baggage-options', label: 'Gói hành lý', icon: 'luggage' },
        { id: 'flight-fares', path: '/admin/flight-fares', label: 'Giá bán theo chuyến', icon: 'price_change' },
        { id: 'flight-seat-inventory', path: '/admin/flight-seat-inventory', label: 'Tồn ghế', icon: 'event_available' },
      ],
    },
    {
      label: 'Bán vé & khuyến mãi',
      items: [
        { id: 'flights', path: '/admin/flights', label: 'Chuyến bay', icon: 'flight_takeoff' },
        { id: 'bookings', path: '/admin/bookings', label: 'Đặt chỗ', icon: 'confirmation_number' },
        { id: 'promotions', path: '/admin/promotions', label: 'Khuyến mãi', icon: 'local_offer' },
        { id: 'vouchers', path: '/admin/vouchers', label: 'Voucher', icon: 'redeem' },
      ],
    },
    {
      label: 'Nội dung',
      items: [
        { id: 'news', path: '/admin/news', label: 'Tin tức', icon: 'feed' },
        { id: 'news-categories', path: '/admin/news-categories', label: 'Danh mục tin', icon: 'label' },
      ],
    },
    {
      label: 'Hệ thống',
      items: [
        { id: 'profile', path: '/admin/profile', label: 'Hồ sơ cá nhân', icon: 'account_circle' },
        { id: 'logout', action: 'logout', label: 'Đăng xuất', icon: 'logout' },
      ],
    },
  ];

  private readonly staffNavGroups: NavGroup[] = [
    {
      label: 'Vận hành',
      items: [
        { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: 'space_dashboard' },
        { id: 'flights', path: '/admin/flights', label: 'Chuyến bay', icon: 'flight_takeoff' },
        { id: 'flight-fares', path: '/admin/flight-fares', label: 'Bảng giá chuyến', icon: 'price_change' },
        { id: 'flight-seat-inventory', path: '/admin/flight-seat-inventory', label: 'Tồn ghế chuyến', icon: 'event_available' },
        { id: 'bookings', path: '/admin/bookings', label: 'Đặt chỗ', icon: 'confirmation_number' },
      ],
    },
    {
      label: 'Danh mục',
      items: [
        { id: 'aircrafts', path: '/admin/aircrafts', label: 'Máy bay', icon: 'airlines' },
      ],
    },
    {
      label: 'Cá nhân',
      items: [
        { id: 'profile', path: '/admin/profile', label: 'Hồ sơ cá nhân', icon: 'account_circle' },
      ],
    },
  ];

  protected readonly visibleGroups = computed(() =>
    this.authService.isAdmin() ? this.adminNavGroups : this.staffNavGroups,
  );

  protected readonly roleLabel = computed(() =>
    this.authService.isAdmin() ? 'Quản trị viên' : 'Nhân viên vận hành',
  );

  protected readonly roleCode = computed(() =>
    this.authService.isAdmin() ? 'ADMIN' : 'STAFF',
  );

  protected readonly initials = computed(() => {
    const name = this.authService.currentUser()?.full_name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  });

  protected onItemAction(item: NavItem): void {
    this.sidebarOpen.set(false);
    if (item.action === 'logout') {
      this.logout();
    }
  }

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
