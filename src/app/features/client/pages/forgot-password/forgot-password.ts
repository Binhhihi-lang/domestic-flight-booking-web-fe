import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';
import { AuthAside } from '@shared/components/auth-aside/auth-aside';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

/**
 * Quên mật khẩu — AUTH-04 (API v0.4 mục 2.1), đồng bộ prototype `customer.html`.
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
  private readonly route = inject(ActivatedRoute);

  protected readonly step = signal<'request' | 'sent' | 'confirm' | 'done'>('request');
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly issuedToken = signal<string | null>(null);
  protected readonly requestedEmail = signal('');

  /** Nấc tiến trình 1 -> 2 -> 3 hiển thị trên thanh `.cust-progress`. */
  protected readonly progressStep = computed(() => {
    switch (this.step()) {
      case 'request':
        return 1;
      case 'sent':
      case 'confirm':
        return 2;
      case 'done':
        return 3;
    }
  });

  protected readonly requestForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly confirmForm = this.fb.nonNullable.group({
    token: ['', [Validators.required]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.confirmForm.controls.token.setValue(token);
      this.step.set('confirm');
    }
  }

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

        if (res.data?.reset_token) {
          this.confirmForm.controls.token.setValue(res.data.reset_token);
          this.step.set('confirm');
        } else {
          this.step.set('sent');
        }
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
