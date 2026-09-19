import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** `warn` dùng cho hành động phá hủy (ngừng dùng, hủy booking). */
  tone?: 'primary' | 'warn';
}

/** Hộp thoại xác nhận trước hành động không hoàn tác được. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close(false)">
        {{ data.cancelText || 'Hủy' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [color]="data.tone === 'warn' ? 'warn' : 'primary'"
        (click)="close(true)"
      >
        {{ data.confirmText || 'Xác nhận' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog, boolean>);

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
