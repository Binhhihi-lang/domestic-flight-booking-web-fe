import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PageHeader } from '../../../../shared/components/page-header/page-header';

/**
 * Trang chủ — khung tìm kiếm chuyến bay.
 *
 * Form chưa gọi API: chức năng Flight Search thuộc Phase 2 (API Design v0.1 mục 3).
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    PageHeader,
  ],
  template: `
    <app-page-header
      title="Đặt vé máy bay nội địa"
      subtitle="Tìm chuyến bay phù hợp trên mọi hãng hàng không Việt Nam"
    />

    <mat-card appearance="outlined">
      <mat-card-content>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-start">
          <mat-form-field appearance="outline">
            <mat-label>Điểm khởi hành</mat-label>
            <input matInput placeholder="Hà Nội (HAN)" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Điểm đến</mat-label>
            <input matInput placeholder="TP. Hồ Chí Minh (SGN)" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ngày đi</mat-label>
            <input matInput type="date" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hành khách</mat-label>
            <mat-select value="1">
              <mat-option value="1">1 hành khách</mat-option>
              <mat-option value="2">2 hành khách</mat-option>
              <mat-option value="3">3 hành khách</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-flat-button type="button" class="h-14" disabled>
            <mat-icon>search</mat-icon>
            Tìm chuyến bay
          </button>
        </div>

        <p class="mt-4 text-sm text-slate-500">
          Chức năng tìm kiếm chuyến bay sẽ hoạt động khi Backend hoàn thành Phase 2.
        </p>
      </mat-card-content>
    </mat-card>
  `,
})
export class Home {}
