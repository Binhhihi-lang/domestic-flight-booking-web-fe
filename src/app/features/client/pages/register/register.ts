import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../../core/services/auth.service';

/** AUTH-01 — Đăng ký tài khoản CUSTOMER (API Design v0.1 mục 2.1). */
@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  template: `
    <mat-card appearance="outlined" class="auth-card">
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }

      <mat-card-header>
        <mat-card-title>Đăng ký tài khoản</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Họ và tên</mat-label>
            <input matInput formControlName="full_name" autocomplete="name" />
            @if (form.controls.full_name.touched && form.controls.full_name.invalid) {
              <mat-error>Họ và tên không được để trống</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <mat-error>Email không đúng định dạng</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Số điện thoại</mat-label>
            <input matInput formControlName="phone" autocomplete="tel" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Mật khẩu</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="new-password"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <mat-error>Mật khẩu tối thiểu 8 ký tự</mat-error>
            }
          </mat-form-field>

          @if (errorMessage()) {
            <p class="auth-error" role="alert">{{ errorMessage() }}</p>
          }

          <button mat-flat-button type="submit" [disabled]="loading()">Đăng ký</button>
        </form>
      </mat-card-content>

      <mat-card-footer class="auth-footer">
        Đã có tài khoản? <a routerLink="/login">Đăng nhập</a>
      </mat-card-footer>
    </mat-card>
  `,
  styles: `
    .auth-card {
      max-width: 420px;
      margin: 24px auto;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 16px;
    }

    .auth-error {
      margin: 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
      white-space: pre-line;
    }

    .auth-footer {
      padding: 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
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
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.register(this.form.getRawValue()).subscribe({
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
