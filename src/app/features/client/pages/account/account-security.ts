import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';

/**
 * Đổi mật khẩu — AUTH-05 (API v0.4 mục 2.1).
 *
 * Không có ô "xác nhận mật khẩu mới" ở tầng API, nhưng vẫn cần ở UI: gõ sai
 * một lần là mất luôn quyền truy cập, nên chặn ngay tại form thay vì để người
 * dùng phát hiện ở lần đăng nhập sau.
 *
 * Đổi xong BE thu hồi toàn bộ refresh token của user. FE không tự đăng xuất:
 * access token hiện tại vẫn dùng được tới khi hết hạn, và đá người dùng ra ngay
 * giữa màn hình là hành vi gây bất ngờ.
 */
@Component({
  selector: 'app-account-security',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, AppButton, AppCard],
  templateUrl: './account-security.html',
  styleUrl: './account-security.css',
})
export class AccountSecurity {
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly showCurrent = signal(false);
  protected readonly showNew = signal(false);

  protected readonly draft = signal({ current_password: '', new_password: '', confirm: '' });

  protected setField(key: 'current_password' | 'new_password' | 'confirm', value: string): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (this.errors()[key]) {
      const next = { ...this.errors() };
      delete next[key];
      this.errors.set(next);
    }
  }

  protected fieldError(key: string): string {
    return this.errors()[key] ?? '';
  }

  protected toggleShow(which: 'current' | 'new'): void {
    if (which === 'current') {
      this.showCurrent.set(!this.showCurrent());
    } else {
      this.showNew.set(!this.showNew());
    }
  }

  private validate(): boolean {
    const d = this.draft();
    const errors: Record<string, string> = {};

    if (!d.current_password) {
      errors['current_password'] = 'Vui lòng nhập mật khẩu hiện tại';
    }
    if (!d.new_password) {
      errors['new_password'] = 'Vui lòng nhập mật khẩu mới';
    } else if (d.new_password.length < 8) {
      errors['new_password'] = 'Mật khẩu phải có ít nhất 8 ký tự';
    } else if (d.new_password === d.current_password) {
      errors['new_password'] = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }
    if (!d.confirm) {
      errors['confirm'] = 'Vui lòng nhập lại mật khẩu mới';
    } else if (d.confirm !== d.new_password) {
      errors['confirm'] = 'Mật khẩu nhập lại không khớp';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  protected submit(): void {
    if (!this.validate()) {
      return;
    }

    const d = this.draft();
    this.saving.set(true);
    this.authService
      .changePassword({
        current_password: d.current_password,
        new_password: d.new_password,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          // Xóa form sau khi đổi thành công — không để mật khẩu nằm lại trong DOM.
          this.draft.set({ current_password: '', new_password: '', confirm: '' });
          this.snackBar.open(res.message, 'Đóng', { duration: 3500 });
        },
        error: (err: Error) => {
          this.saving.set(false);
          // Sai mật khẩu hiện tại (1007) là lỗi phổ biến nhất — gắn vào đúng ô.
          this.errors.set({ current_password: err.message });
        },
      });
  }
}
