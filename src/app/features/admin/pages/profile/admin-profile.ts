import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { AccountProfile } from '@features/client/pages/account/account-profile';
import { PageHeader } from '@shared/components/page-header/page-header';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';

/**
 * Hồ sơ cá nhân & đổi mật khẩu trong khu vực vận hành (ADMIN / STAFF).
 *
 * Dùng lại `AccountProfile` cho phần thông tin cá nhân (`GET/PUT /api/profile`)
 * và bổ sung card Đổi mật khẩu (`POST /api/auth/change-password`) ngay cùng trang
 * vì khu vận hành không có thanh tab phụ riêng như `/account/security`.
 */
@Component({
  selector: 'app-admin-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountProfile, PageHeader, FormsModule, MatIconModule, AppButton, AppCard],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css',
})
export class AdminProfile {
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly savingPassword = signal(false);
  protected readonly passwordErrors = signal<Record<string, string>>({});
  protected readonly showCurrent = signal(false);
  protected readonly showNew = signal(false);
  protected readonly showConfirm = signal(false);

  protected readonly passwordDraft = signal({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  protected setPasswordField(
    key: 'current_password' | 'new_password' | 'confirm_password',
    value: string,
  ): void {
    this.passwordDraft.set({ ...this.passwordDraft(), [key]: value });
    if (this.passwordErrors()[key]) {
      const next = { ...this.passwordErrors() };
      delete next[key];
      this.passwordErrors.set(next);
    }
  }

  protected passwordError(key: string): string {
    return this.passwordErrors()[key] ?? '';
  }

  protected toggleShow(which: 'current' | 'new' | 'confirm'): void {
    if (which === 'current') {
      this.showCurrent.set(!this.showCurrent());
    } else if (which === 'new') {
      this.showNew.set(!this.showNew());
    } else {
      this.showConfirm.set(!this.showConfirm());
    }
  }

  private validatePassword(): boolean {
    const d = this.passwordDraft();
    const errors: Record<string, string> = {};

    if (!d.current_password) {
      errors['current_password'] = 'Vui lòng nhập mật khẩu hiện tại';
    }
    if (!d.new_password) {
      errors['new_password'] = 'Vui lòng nhập mật khẩu mới';
    } else if (d.new_password.length < 8) {
      errors['new_password'] = 'Mật khẩu mới phải có ít nhất 8 ký tự';
    } else if (d.new_password === d.current_password) {
      errors['new_password'] = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }
    if (!d.confirm_password) {
      errors['confirm_password'] = 'Vui lòng nhập lại mật khẩu mới';
    } else if (d.confirm_password !== d.new_password) {
      errors['confirm_password'] = 'Mật khẩu nhập lại không khớp';
    }

    this.passwordErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  protected submitPassword(): void {
    if (!this.validatePassword()) {
      return;
    }

    const d = this.passwordDraft();
    this.savingPassword.set(true);
    this.authService
      .changePassword({
        current_password: d.current_password,
        new_password: d.new_password,
      })
      .subscribe({
        next: (res) => {
          this.savingPassword.set(false);
          this.passwordDraft.set({
            current_password: '',
            new_password: '',
            confirm_password: '',
          });
          this.passwordErrors.set({});
          this.snackBar.open(res.message || 'Đổi mật khẩu thành công', 'Đóng', { duration: 3500 });
        },
        error: (err: Error) => {
          this.savingPassword.set(false);
          this.passwordErrors.set({ current_password: err.message });
        },
      });
  }
}
