import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../../../core/services/auth.service';

/** Khung khu vực vận hành (STAFF/ADMIN): sidebar + header + nội dung. */
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="admin-shell">
      <mat-sidenav mode="side" opened class="admin-sidenav">
        <div class="admin-brand">
          <mat-icon>flight_takeoff</mat-icon>
          <span>Vận hành</span>
        </div>

        <mat-nav-list>
          <a
            mat-list-item
            routerLink="/admin"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
          >
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/admin/flights" routerLinkActive="active">
            <mat-icon matListItemIcon>flight</mat-icon>
            <span matListItemTitle>Chuyến bay</span>
          </a>
          <a mat-list-item routerLink="/admin/bookings" routerLinkActive="active">
            <mat-icon matListItemIcon>confirmation_number</mat-icon>
            <span matListItemTitle>Booking</span>
          </a>
          @if (authService.isAdmin()) {
            <a mat-list-item routerLink="/admin/users" routerLinkActive="active">
              <mat-icon matListItemIcon>manage_accounts</mat-icon>
              <span matListItemTitle>Người dùng</span>
            </a>
            <a mat-list-item routerLink="/admin/master-data" routerLinkActive="active">
              <mat-icon matListItemIcon>database</mat-icon>
              <span matListItemTitle>Dữ liệu nền</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="admin-header">
          <span class="admin-header__title">Khu vực vận hành</span>
          <span class="spacer"></span>
          <span class="admin-header__user">{{ authService.currentUser()?.full_name }}</span>
          <button
            mat-icon-button
            type="button"
            matTooltip="Về trang khách hàng"
            (click)="goToClient()"
          >
            <mat-icon>storefront</mat-icon>
          </button>
        </mat-toolbar>

        <div class="admin-content">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .admin-shell {
      height: 100vh;
    }

    .admin-sidenav {
      width: 240px;
      background: var(--mat-sys-surface-container);
    }

    .admin-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-primary);
    }

    .admin-sidenav .active {
      background: var(--mat-sys-secondary-container);
    }

    .admin-header {
      position: sticky;
      top: 0;
      z-index: 10;
      gap: 12px;
      background: var(--mat-sys-surface-container);
    }

    .admin-header__title {
      font: var(--mat-sys-title-medium);
    }

    .admin-header__user {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }

    .spacer {
      flex: 1 1 auto;
    }

    .admin-content {
      padding: 24px;
    }
  `,
})
export class AdminLayout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected goToClient(): void {
    this.router.navigate(['/']);
  }
}
