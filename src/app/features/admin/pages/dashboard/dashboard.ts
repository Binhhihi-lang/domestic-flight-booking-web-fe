import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

/**
 * Dashboard vận hành — khung chờ số liệu.
 *
 * DASHBOARD_READ_OPERATIONAL (STAFF) và DASHBOARD_READ (ADMIN) thuộc Phase 3
 * (API Design v0.1 mục 3).
 */
@Component({
  selector: 'app-admin-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatIconModule, PageHeader],
  template: `
    <app-page-header title="Dashboard" subtitle="Tổng quan vận hành" />

    <div class="stat-grid">
      @for (stat of stats; track stat.label) {
        <mat-card appearance="outlined">
          <mat-card-content class="stat">
            <mat-icon aria-hidden="true">{{ stat.icon }}</mat-icon>
            <div>
              <p class="stat__label">{{ stat.label }}</p>
              <p class="stat__value">{{ stat.value }}</p>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>

    <p class="note">Số liệu sẽ hiển thị khi Backend hoàn thành Phase 3.</p>
  `,
  styles: `
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat mat-icon {
      color: var(--mat-sys-primary);
    }

    .stat__label {
      margin: 0;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }

    .stat__value {
      margin: 4px 0 0;
      font: var(--mat-sys-headline-small);
    }

    .note {
      margin-top: 24px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class AdminDashboard {
  protected readonly stats = [
    { label: 'Booking hôm nay', value: '—', icon: 'confirmation_number' },
    { label: 'Chuyến bay đang mở bán', value: '—', icon: 'flight' },
    { label: 'Doanh thu tháng', value: '—', icon: 'payments' },
    { label: 'Người dùng hoạt động', value: '—', icon: 'group' },
  ];
}
