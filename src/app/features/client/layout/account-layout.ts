import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

interface AccountLink {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

/**
 * Khung trang tài khoản khách hàng — bám mockup P11.
 *
 * Vì sao có menu dọc bên trái: khách hàng có 5 mục (vé, voucher, ví, hồ sơ,
 * mật khẩu) và luôn quay lại giữa chúng. Menu dọc giữ nguyên vị trí khi chuyển
 * mục; trên mobile nó thành dải ngang cuộn để không chiếm chiều dọc.
 *
 * Vì sao tách khỏi client-layout: trang tài khoản có bố cục hai cột riêng,
 * nhét vào layout chung sẽ phải thêm ngoại lệ cho mọi màn khác.
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

  protected readonly links: AccountLink[] = [
    { path: '/account', label: 'Vé của tôi', icon: 'confirmation_number', exact: true },
    { path: '/account/vouchers', label: 'Voucher của tôi', icon: 'card_membership' },
    { path: '/account/wallet', label: 'Ví của tôi', icon: 'account_balance_wallet' },
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
}
