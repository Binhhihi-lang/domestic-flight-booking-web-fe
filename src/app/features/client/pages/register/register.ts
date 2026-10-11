import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthAside } from '../../../../shared/components/auth-aside/auth-aside';

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
  template: `
    <div class="auth">
      <app-auth-aside
        heading="Tạo tài khoản để đặt vé chỉ trong vài phút"
        subheading="Lưu thông tin hành khách, chọn ghế và nhận vé điện tử ngay sau khi thanh toán."
      />

      <div class="auth__form">
        <div class="auth__box">
          <h1>Tạo tài khoản</h1>
          <p>Điền thông tin bên dưới để bắt đầu đặt vé.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth__fields">
            <div class="field" [class.err]="showError('full_name')">
              <label for="rg-name">Họ và tên</label>
              <input id="rg-name" formControlName="full_name" autocomplete="name" placeholder="Nguyễn Minh Anh" />
              @if (showError('full_name')) {
                <span class="hint">Họ và tên không được để trống</span>
              }
            </div>

            <div class="field" [class.err]="showError('email')">
              <label for="rg-email">Email</label>
              <input
                id="rg-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="ten@example.com"
              />
              @if (showError('email')) {
                <span class="hint">Email không đúng định dạng</span>
              }
            </div>

            <div class="field">
              <label for="rg-phone">Số điện thoại</label>
              <input id="rg-phone" formControlName="phone" autocomplete="tel" placeholder="0912 345 678" />
              <span class="hint">Không bắt buộc</span>
            </div>

            <div class="field" [class.err]="showError('password')">
              <label for="rg-pass">Mật khẩu</label>
              <input
                id="rg-pass"
                type="password"
                formControlName="password"
                autocomplete="new-password"
                placeholder="••••••••"
              />
              @if (showError('password')) {
                <span class="hint">Mật khẩu phải có ít nhất 8 ký tự</span>
              } @else {
                <span class="hint">Tối thiểu 8 ký tự, gồm chữ và số</span>
              }
            </div>

            <div class="auth__row">
              <label>
                <input type="checkbox" formControlName="terms" />
                Tôi đồng ý với Điều khoản và Chính sách bảo mật
              </label>
            </div>

            @if (errorMessage()) {
              <div class="auth__alert" role="alert">
                <mat-icon>error</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <button class="btn btn--primary btn--block" type="submit" [disabled]="loading()">
              @if (loading()) {
                <span class="spinner" aria-hidden="true"></span>
                Đang tạo tài khoản…
              } @else {
                Tạo tài khoản
              }
            </button>
          </form>

          <p class="auth__foot">Đã có tài khoản? <a routerLink="/login">Đăng nhập</a></p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .auth {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: calc(100vh - 60px);
    }

    .auth__form {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 26px;
      background: var(--color-surface);
    }

    .auth__box {
      width: 100%;
      max-width: 392px;
    }

    .auth__box h1 {
      font-size: 25px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .auth__box > p {
      font-size: 13.5px;
      color: var(--color-ink-muted);
      margin: 0 0 26px;
    }

    .auth__fields {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field label {
      font-size: 12px;
      font-weight: 600;
    }

    .field input {
      font-family: var(--font-body);
      font-size: 14.5px;
      padding: 11px 13px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      outline: none;
      width: 100%;
      color: var(--color-ink);
    }

    .field input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px rgba(1, 148, 243, 0.14);
    }

    .field.err input {
      border-color: var(--color-danger);
    }

    .field .hint {
      font-size: 11.5px;
      color: var(--color-ink-subtle);
    }

    .field.err .hint {
      color: var(--color-danger);
    }

    .auth__row {
      display: flex;
      align-items: flex-start;
      font-size: 12.5px;
      line-height: 1.5;
    }

    .auth__row label {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      color: var(--color-ink-muted);
      cursor: pointer;
    }

    .auth__row input {
      accent-color: var(--color-primary);
      cursor: pointer;
      margin-top: 2px;
      flex: 0 0 auto;
    }

    .auth__alert {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
      border-left: 3px solid var(--color-danger);
      padding: 11px 13px;
      border-radius: var(--radius);
      font-size: 12.5px;
      line-height: 1.5;
      white-space: pre-line;
    }

    .auth__alert mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
      flex: 0 0 auto;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1.5px solid transparent;
      border-radius: var(--radius);
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      padding: 12px 18px;
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .btn--primary {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .btn--block {
      width: 100%;
    }

    .btn:disabled {
      background: var(--color-border-soft);
      color: var(--color-ink-subtle);
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .auth__foot {
      text-align: center;
      font-size: 13px;
      color: var(--color-ink-muted);
      margin-top: 24px;
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc.
       ===================================================================== */
    @media (max-width: 880px) {
      .auth {
        grid-template-columns: 1fr;
        min-height: auto;
      }

      .auth__form {
        padding: 32px 20px 40px;
        min-height: auto;
      }
    }
  `,
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
