import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: 'empty' | 'weak' | 'fair' | 'good' | 'strong';
}

/**
 * Đổi mật khẩu — AUTH-05 (API v0.4 mục 2.1).
 */
@Component({
  selector: 'app-account-security',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppButton, AppCard],
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

  protected readonly strength = computed<PasswordStrength>(() => {
    const pw = this.draft().new_password;
    if (!pw) {
      return { score: 0, label: '', tone: 'empty' };
    }
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;

    const clamped = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;
    if (clamped === 1) return { score: 1, label: 'Yếu', tone: 'weak' };
    if (clamped === 2) return { score: 2, label: 'Trung bình', tone: 'fair' };
    if (clamped === 3) return { score: 3, label: 'Khá', tone: 'good' };
    return { score: 4, label: 'Mạnh', tone: 'strong' };
  });

  protected readonly hasInput = computed(() => {
    const d = this.draft();
    return Boolean(d.current_password || d.new_password || d.confirm);
  });

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

  protected resetForm(): void {
    this.draft.set({ current_password: '', new_password: '', confirm: '' });
    this.errors.set({});
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
          this.draft.set({ current_password: '', new_password: '', confirm: '' });
          this.snackBar.open(res.message, 'Đóng', { duration: 3500 });
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.errors.set({ current_password: err.message });
        },
      });
  }
}
