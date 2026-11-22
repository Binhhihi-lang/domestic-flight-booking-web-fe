import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '@core/services/auth.service';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';
import { NotificationBell } from '@shared/components/notification-bell/notification-bell';

/**
 * Khung trang khách hàng — đồng bộ prototype `customer.html`:
 * - Topbar nền tối navy (`--color-dark`), chữ sáng, gạch chân 3px dưới link đang mở.
 * - Footer nền xám sáng nhạt, chữ tối, liên kết đầy đủ tới các trang Hỗ trợ & Khám phá.
 */
@Component({
  selector: 'app-client-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatMenuModule,
    BrandLogo,
    NotificationBell,
  ],
  templateUrl: './client-layout.html',
  styleUrl: './client-layout.css',
})
export class ClientLayout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  /** Chữ viết tắt cho avatar — "Nguyễn Minh Anh" → "NA". */
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

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
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
