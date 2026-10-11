import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthAside } from '../../../../shared/components/auth-aside/auth-aside';

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
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, AuthAside],
  template: `
    <div class="auth">
      <app-auth-aside
        heading="Đăng nhập để đặt vé và quản lý chuyến đi của bạn"
        subheading="Theo dõi booking, nhận vé điện tử, và dùng voucher đã nhận ngay khi thanh toán."
      />

      <div class="auth__form">
        <div class="auth__box">
          <h1>Đăng nhập</h1>
          <p>Chào mừng trở lại. Nhập thông tin tài khoản của bạn.</p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth__fields">
            <div class="field" [class.err]="showError('email')">
              <label for="lg-email">Email</label>
              <input
                id="lg-email"
                type="email"
                formControlName="email"
                autocomplete="email"
                placeholder="ten@example.com"
              />
              @if (showError('email')) {
                <span class="hint">Email không đúng định dạng</span>
              }
            </div>

            <div class="field" [class.err]="showError('password')">
              <label for="lg-pass">Mật khẩu</label>
              <input
                id="lg-pass"
                type="password"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••"
              />
              @if (showError('password')) {
                <span class="hint">Mật khẩu không được để trống</span>
              }
            </div>

            <div class="auth__row">
              <label><input type="checkbox" formControlName="remember" /> Ghi nhớ đăng nhập</label>
              <a routerLink="/forgot-password">Quên mật khẩu?</a>
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
                Đang đăng nhập…
              } @else {
                Đăng nhập
              }
            </button>
          </form>

          <p class="auth__foot">Chưa có tài khoản? <a routerLink="/register">Đăng ký ngay</a></p>

          <div class="auth__demo">
            <div class="auth__demo-t">Tài khoản demo (mock)</div>
            <div class="auth__demo-b tabular">
              admin&#64;demo.local · staff&#64;demo.local · customer&#64;demo.local<br />
              Mật khẩu: <b>12345678</b>
            </div>
          </div>
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
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
    }

    .auth__row label {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--color-ink-muted);
      cursor: pointer;
    }

    .auth__row input {
      accent-color: var(--color-primary);
      cursor: pointer;
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

    .auth__demo {
      margin-top: 26px;
      padding: 13px 15px;
      background: var(--color-primary-soft);
      border-radius: var(--radius);
      border-left: 3px solid var(--color-primary-bright);
    }

    .auth__demo-t {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-on-info-soft);
      margin-bottom: 5px;
    }

    .auth__demo-b {
      font-size: 12px;
      color: var(--color-on-info-soft);
      line-height: 1.6;
    }

    /* =====================================================================
       Media query đặt SAU tất cả rule gốc — đặt trước sẽ bị ghi đè.
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
