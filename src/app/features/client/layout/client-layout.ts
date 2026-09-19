import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../../core/services/auth.service';

/** Khung trang cho khách hàng: header + nội dung + footer. */
@Component({
  selector: 'app-client-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <mat-toolbar class="client-header">
      <a class="brand" routerLink="/">
        <mat-icon>flight_takeoff</mat-icon>
        <span>Vé Máy Bay Nội Địa</span>
      </a>

      <nav class="nav">
        <a
          mat-button
          routerLink="/"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          Trang chủ
        </a>
        <a mat-button routerLink="/news" routerLinkActive="active">Tin tức</a>
      </nav>

      <span class="spacer"></span>

      @if (authService.isLoggedIn()) {
        <button mat-button type="button" [matMenuTriggerFor]="accountMenu">
          <mat-icon>account_circle</mat-icon>
          {{ authService.currentUser()?.full_name }}
        </button>
        <mat-menu #accountMenu="matMenu">
          <button mat-menu-item type="button" (click)="goToProfile()">
            <mat-icon>person</mat-icon>
            <span>Hồ sơ của tôi</span>
          </button>
          @if (authService.isStaff()) {
            <button mat-menu-item type="button" (click)="goToAdmin()">
              <mat-icon>dashboard</mat-icon>
              <span>Khu vực vận hành</span>
            </button>
          }
          <button mat-menu-item type="button" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Đăng xuất</span>
          </button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/login">Đăng nhập</a>
        <a mat-flat-button routerLink="/register">Đăng ký</a>
      }
    </mat-toolbar>

    <main class="client-content">
      <router-outlet />
    </main>

    <footer class="client-footer">
      <p>Website đặt vé máy bay nội địa — đồ án chuyên đề.</p>
    </footer>
  `,
  styles: `
    .client-header {
      position: sticky;
      top: 0;
      z-index: 10;
      gap: 16px;
      background: var(--mat-sys-surface-container);
    }

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-primary);
      text-decoration: none;
    }

    .nav {
      display: flex;
      gap: 4px;
      margin-left: 16px;
    }

    .nav .active {
      color: var(--mat-sys-primary);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .client-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      width: 100%;
      box-sizing: border-box;
    }

    .client-footer {
      border-top: 1px solid var(--mat-sys-outline-variant);
      padding: 24px 16px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }

    .client-footer p {
      margin: 0;
    }
  `,
})
export class ClientLayout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      // Dù Backend lỗi, phiên cục bộ vẫn phải được xóa (mục 1.5)
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/']);
      },
    });
  }

  protected goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  protected goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}
