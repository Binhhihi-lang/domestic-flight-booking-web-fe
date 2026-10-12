import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside } from '@shared/components/auth-aside/auth-aside';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

/**
 * AUTH-02 — Đăng nhập (API Design v0.2 mục 2.1), bám mockup P6.
 *
 * Vì sao chia đôi màn hình: nửa trái là panel giới thiệu (gradient xanh + số
 * liệu), nửa phải là form. Trang đăng nhập là cửa vào duy nhất của khách đã
 * có tài khoản, nên cần vừa gọn vừa đáng tin — không phải một form trơ giữa
 * trang. Trên mobile panel bị ẩn, chỉ giữ form (việc người dùng cần làm).
 */
@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside, BrandLogo],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  /** Chỉ hiện lỗi sau khi người dùng đã chạm vào ô — không mắng khi vừa mở trang. */
  protected showError(control: 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();
    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        const redirect = this.router.parseUrl(this.router.url).queryParams['redirect'];
        this.router.navigateByUrl(redirect ?? '/');
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }
}
