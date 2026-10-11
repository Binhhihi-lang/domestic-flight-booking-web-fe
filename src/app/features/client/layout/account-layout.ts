import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

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
  template: `
    <div class="wrap">
      <div class="page-h">
        <div>
          <h1>Tài khoản của tôi</h1>
          <p>Quản lý booking, vé điện tử và voucher đã nhận</p>
        </div>
      </div>

      <div class="acct">
        <!-- ===== Menu tài khoản ===== -->
        <aside class="acct__nav">
          <div class="acct__me">
            <div class="acct__av">{{ initials() }}</div>
            <div class="acct__id">
              <div class="acct__nm">{{ authService.currentUser()?.full_name }}</div>
              <div class="acct__em">{{ authService.currentUser()?.email }}</div>
            </div>
          </div>

          @for (link of links; track link.path) {
            <a
              class="acct__lnk"
              [routerLink]="link.path"
              routerLinkActive="on"
              [routerLinkActiveOptions]="{ exact: !!link.exact }"
            >
              <mat-icon>{{ link.icon }}</mat-icon>
              <span>{{ link.label }}</span>
            </a>
          }
        </aside>

        <div class="acct__body">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: `
    .page-h {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }

    .page-h h1 {
      font-size: 24px;
      font-weight: 600;
    }

    .page-h p {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: var(--color-ink-muted);
    }

    .acct {
      display: grid;
      grid-template-columns: 236px 1fr;
      gap: 20px;
      align-items: start;
    }

    /* min-width:0 cho con của grid — nếu không, cột phải bị nội dung rộng
       (thẻ vé, bảng) đẩy ra ngoài khung. */
    .acct > * {
      min-width: 0;
    }

    .acct__nav {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      min-width: 0;
    }

    .acct__me {
      padding: 17px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .acct__av {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: linear-gradient(140deg, var(--color-primary), var(--color-primary-bright));
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 17px;
      flex: 0 0 auto;
    }

    .acct__id {
      min-width: 0;
    }

    .acct__nm {
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 14.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .acct__em {
      font-size: 11.5px;
      color: var(--color-ink-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .acct__lnk {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 17px;
      font-size: 13.5px;
      color: var(--color-ink);
      border-left: 3px solid transparent;
      cursor: pointer;
      text-decoration: none;
    }

    .acct__lnk:hover {
      background: var(--color-surface-alt);
    }

    .acct__lnk.on {
      background: var(--color-primary-soft);
      border-left-color: var(--color-primary);
      color: var(--color-primary);
      font-weight: 600;
    }

    .acct__lnk mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
      color: var(--color-ink-muted);
      flex: 0 0 auto;
    }

    .acct__lnk.on mat-icon {
      color: var(--color-primary);
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */
    @media (max-width: 900px) {
      .acct {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      /* Mobile: menu thành dải ngang cuộn, không chiếm chiều dọc. */
      .acct__nav {
        display: flex;
        overflow-x: auto;
        scrollbar-width: none;
      }

      .acct__nav::-webkit-scrollbar {
        display: none;
      }

      .acct__me {
        display: none;
      }

      .acct__lnk {
        border-left: 0;
        border-bottom: 3px solid transparent;
        flex: 0 0 auto;
        white-space: nowrap;
        padding: 12px 15px;
      }

      .acct__lnk.on {
        border-left: 0;
        border-bottom-color: var(--color-primary);
      }
    }

    @media (max-width: 640px) {
      .page-h h1 {
        font-size: 20px;
      }
    }
  `,
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
