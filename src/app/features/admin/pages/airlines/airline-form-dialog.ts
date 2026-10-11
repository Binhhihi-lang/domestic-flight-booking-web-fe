import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Airline, AirlinePayload } from '../../../../core/models/airline.model';

export interface AirlineFormData {
  /** Có giá trị = sửa; null = thêm mới. */
  airline: Airline | null;
}

/** Form thêm/sửa hãng hàng không. Đây là mẫu để nhân bản cho module master data khác. */
@Component({
  selector: 'app-airline-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit() ? 'Sửa hãng hàng không' : 'Thêm hãng hàng không' }}</h2>

    <mat-dialog-content>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Mã hãng</mat-label>
        <input matInput [(ngModel)]="model.airline_code" maxlength="10" required />
        <mat-hint>Tối đa 10 ký tự, ví dụ VN</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Tên hãng</mat-label>
        <input matInput [(ngModel)]="model.airline_name" maxlength="150" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Quốc gia</mat-label>
        <input matInput [(ngModel)]="model.country" maxlength="100" />
      </mat-form-field>

      <mat-slide-toggle [(ngModel)]="model.is_active">Đang hoạt động</mat-slide-toggle>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancel()">Hủy</button>
      <button mat-flat-button type="button" [disabled]="!isValid()" (click)="save()">Lưu</button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      display: block;
      width: 100%;
      margin-bottom: 6px;
    }

    mat-dialog-content {
      min-width: 380px;
      padding-top: 8px;
    }
  `,
})
export class AirlineFormDialog {
  private readonly dialogRef = inject(MatDialogRef<AirlineFormDialog, AirlinePayload | undefined>);
  private readonly data = inject<AirlineFormData>(MAT_DIALOG_DATA);

  protected readonly isEdit = signal(this.data.airline !== null);

  /** Bản nháp của form; khởi tạo từ dữ liệu sửa nếu có. */
  protected model: AirlinePayload = this.data.airline
    ? {
        airline_code: this.data.airline.airline_code,
        airline_name: this.data.airline.airline_name,
        country: this.data.airline.country,
        logo_url: this.data.airline.logo_url,
        is_active: this.data.airline.is_active,
      }
    : {
        airline_code: '',
        airline_name: '',
        country: null,
        logo_url: null,
        is_active: true,
      };

  protected isValid(): boolean {
    return this.model.airline_code.trim().length > 0 && this.model.airline_name.trim().length > 0;
  }

  protected save(): void {
    if (!this.isValid()) {
      return;
    }
    this.dialogRef.close({
      ...this.model,
      airline_code: this.model.airline_code.trim().toUpperCase(),
      airline_name: this.model.airline_name.trim(),
    });
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }
}
