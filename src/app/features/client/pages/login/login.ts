import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../../core/services/auth.service';

/** AUTH-02 — Đăng nhập (API Design v0.1 mục 2.1). */
@Component({
  selector: 'app-login',
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
        <mat-card-title>Đăng nhập</mat-card-title>
      </mat-card-header>

      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <mat-error>Email không đúng định dạng</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Mật khẩu</mat-label>
            <input
              matInput
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <mat-error>Mật khẩu không được để trống</mat-error>
            }
          </mat-form-field>

          @if (errorMessage()) {
            <p class="auth-error" role="alert">{{ errorMessage() }}</p>
          }

          <button mat-flat-button type="submit" [disabled]="loading()">Đăng nhập</button>
        </form>
      </mat-card-content>

      <mat-card-footer class="auth-footer">
        Chưa có tài khoản? <a routerLink="/register">Đăng ký</a>
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
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.form.getRawValue()).subscribe({
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
