import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside } from '@shared/components/auth-aside/auth-aside';

/**
 * AUTH-01 — Đăng ký tài khoản CUSTOMER (API Design v0.2 mục 2.1), bám mockup P6.
 *
 * Cùng khuôn chia đôi với trang đăng nhập; khác ở chỗ thêm ô họ tên, số điện
 * thoại và điều khoản. Role do Backend gán cứng CUSTOMER — client không gửi.
 */
@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    password: ['', [Validators.required, Validators.minLength(8)]],
    terms: [false, [Validators.requiredTrue]],
  });

  protected showError(control: 'full_name' | 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.terms.invalid) {
        this.errorMessage.set('Vui lòng đồng ý với Điều khoản và Chính sách bảo mật.');
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
