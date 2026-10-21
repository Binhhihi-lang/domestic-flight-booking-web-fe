import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside } from '@shared/components/auth-aside/auth-aside';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

/**
 * Quên mật khẩu — AUTH-04 (API v0.4 mục 2.1), hai bước trong một màn.
 *
 * Bước 1 gửi email, bước 2 nhập token + mật khẩu mới. Gom vào một màn vì token
 * chỉ sống trong phiên này; tách route riêng thì người dùng phải mang token
 * sang trang khác, mà với MVP token nằm ngay trong response.
 *
 * VÌ SAO KHÔNG BÁO "EMAIL KHÔNG TỒN TẠI": endpoint luôn trả 200 để chống dò
 * tài khoản. Nếu UI báo lỗi khi email lạ, kẻ tấn công dùng màn này để kiểm tra
 * email nào có tài khoản — đúng thứ mà thiết kế endpoint muốn tránh.
 *
 * `reset_token` là điểm tạm của MVP (BE chưa có mail server). Khi BE tích hợp
 * mail thật, trường này biến mất và khối "mã đặt lại" dưới đây tự ẩn.
 */
@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside, BrandLogo],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly step = signal<'request' | 'confirm' | 'done'>('request');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  /** Token do BE trả về ở MVP — hiện ra để người dùng chép sang bước 2. */
  protected readonly issuedToken = signal<string | null>(null);
  /** Email đã gửi yêu cầu — hiện lại ở bước 2 để người dùng đối chiếu. */
  protected readonly requestedEmail = signal('');

  protected readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly confirmForm = this.fb.nonNullable.group({
    token: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  protected showRequestError(): boolean {
    const c = this.requestForm.controls.email;
    return c.touched && c.invalid;
  }

  protected submitRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    const email = this.requestForm.getRawValue().email.trim().toLowerCase();
    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.requestPasswordReset(email).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.requestedEmail.set(email);
        this.issuedToken.set(res.data?.reset_token ?? null);
        // Không có token nghĩa là email không khớp — vẫn sang bước 2 để người
        // dùng tự nhập mã nhận được qua email (khi BE có mail server).
        this.confirmForm.controls.token.setValue(res.data?.reset_token ?? '');
        this.step.set('confirm');
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.errorMessage.set(err.message);
      },
    });
  }

  protected submitConfirm(): void {
    const form = this.confirmForm;
    const { token, new_password, confirm } = form.getRawValue();

    if (form.invalid || confirm !== new_password) {
      form.markAllAsTouched();
      if (confirm !== new_password) {
        form.controls.confirm.setErrors({ mismatch: true });
      }
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService
      .confirmPasswordReset({ token: token.trim(), new_password })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.step.set('done');
        },
        error: (err: Error) => {
          this.loading.set(false);
          this.errorMessage.set(err.message);
        },
      });
  }

  protected backToRequest(): void {
    this.step.set('request');
    this.errorMessage.set('');
    this.confirmForm.reset();
  }

  protected goLogin(): void {
    this.router.navigate(['/login']);
  }
}
