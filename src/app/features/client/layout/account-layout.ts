import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

interface AccountLink {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

/**
 * Khung trang tài khoản khách hàng — bám prototype `customer.html`.
 */
@Component({
  selector: 'app-account-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './account-layout.html',
  styleUrl: './account-layout.css',
})
export class AccountLayout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loggingOut = signal(false);

  protected readonly links: AccountLink[] = [
    { path: '/account', label: 'Vé của tôi', icon: 'confirmation_number', exact: true },
    { path: '/account/vouchers', label: 'Voucher của tôi', icon: 'card_membership' },
    { path: '/account/voucher-store', label: 'Kho voucher', icon: 'redeem' },
    { path: '/account/profile', label: 'Hồ sơ cá nhân', icon: 'person' },
    { path: '/account/security', label: 'Đổi mật khẩu', icon: 'lock' },
  ];

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
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.authService.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearSession();
        this.loggingOut.set(false);
        this.router.navigate(['/login']);
      },
    });
  }
}
