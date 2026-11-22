import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside, AuthAsideStat } from '@shared/components/auth-aside/auth-aside';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value ?? '';
  const confirmPassword = group.get('confirmPassword')?.value ?? '';
  if (!confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * AUTH-01 — Đăng ký tài khoản CUSTOMER (API Design v0.2 mục 2.1), bám prototype `customer.html`.
 */
@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside, BrandLogo],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly asideImage =
    'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1600&q=80';

  protected readonly asideStats: AuthAsideStat[] = [
    { value: '15 phút', label: 'giữ chỗ mỗi đơn' },
    { value: '2 phút', label: 'hoàn tất đặt vé' },
    { value: '0đ', label: 'phí tạo tài khoản' },
  ];

  protected readonly form = this.fb.nonNullable.group(
    {
      full_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [passwordsMatchValidator] },
  );

  protected showError(control: 'full_name' | 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }

  protected showConfirmError(): boolean {
    const c = this.form.controls.confirmPassword;
    return c.touched && (c.invalid || this.form.hasError('passwordMismatch'));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.hasError('passwordMismatch')) {
        this.errorMessage.set('Mật khẩu nhập lại không khớp.');
      } else if (this.form.controls.terms.invalid) {
        this.errorMessage.set('Vui lòng đồng ý với Điều khoản sử dụng và Chính sách bảo mật.');
      }
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const { full_name, email, phone, password } = this.form.getRawValue();
    this.authService.register({ full_name, email, phone, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/login']);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.errorMessage.set(error.message);
      },
    });
  }
}
