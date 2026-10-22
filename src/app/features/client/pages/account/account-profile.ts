import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Hồ sơ cá nhân — PRO-01/PRO-02 (API v0.4 mục 2.2).
 *
 * Chỉ ba trường sửa được: họ tên, số điện thoại, ảnh đại diện. Email, trạng
 * thái và vai trò do hệ thống quản — BE bỏ qua nếu client gửi lên, nên màn
 * này hiện chúng ở dạng chỉ đọc thay vì ẩn hẳn: người dùng cần biết mình đang
 * dùng email nào và thuộc vai trò gì.
 *
 * Ảnh đại diện nhận URL hoặc file từ máy. File được đọc thành data URL và lưu
 * qua `PUT /profile` — BE thật có `POST /profile/avatar` để đẩy lên Cloudinary;
 * dùng chung một trường `avatar_url` nên đổi sang endpoint upload sau này chỉ
 * cần thay chỗ đọc file, không đổi mô hình dữ liệu.
 */
@Component({
  selector: 'app-account-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, AppButton, AppCard, LoadingState],
  templateUrl: './account-profile.html',
  styleUrl: './account-profile.css',
})
export class AccountProfile {
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  /**
   * Ẩn tiêu đề nội bộ khi được nhúng vào khung admin — nơi đã có `PageHeader`.
   * Mặc định hiện, vì trong `account-layout` đây là màn độc lập.
   */
  readonly hideHeading = input<boolean>(false);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly brokenAvatar = signal(false);

  protected readonly draft = signal({ full_name: '', phone: '', avatar_url: '' });

  /** Chỉ đọc — lấy từ phiên đăng nhập, không nằm trong form. */
  protected readonly account = this.authService.currentUser;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.authService.getProfile().subscribe({
      next: (res) => {
        this.draft.set({
          full_name: res.data.full_name,
          phone: res.data.phone ?? '',
          avatar_url: res.data.avatar_url ?? '',
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
      },
    });
  }

  protected setField(key: 'full_name' | 'phone' | 'avatar_url', value: string): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (key === 'avatar_url') {
      this.brokenAvatar.set(false);
    }
    if (this.errors()[key]) {
      const next = { ...this.errors() };
      delete next[key];
      this.errors.set(next);
    }
  }

  protected fieldError(key: string): string {
    return this.errors()[key] ?? '';
  }

  protected onPickAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notify('Vui lòng chọn tệp ảnh');
      return;
    }
    // 2 MB: base64 phình ~33% và đi kèm payload JSON; ảnh lớn làm request nặng
    // mà ảnh đại diện không cần độ phân giải cao.
    if (file.size > 2 * 1024 * 1024) {
      this.notify('Ảnh phải nhỏ hơn 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.setField('avatar_url', String(reader.result ?? ''));
    reader.onerror = () => this.notify('Không đọc được tệp ảnh');
    reader.readAsDataURL(file);
    input.value = '';
  }

  private validate(): boolean {
    const d = this.draft();
    const errors: Record<string, string> = {};

    if (!d.full_name.trim()) {
      errors['full_name'] = 'Họ tên không được để trống';
    } else if (d.full_name.trim().length > 150) {
      errors['full_name'] = 'Họ tên tối đa 150 ký tự';
    }
    if (d.phone.trim() && !/^0\d{9}$/.test(d.phone.trim())) {
      errors['phone'] = 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0';
    }
    if (d.avatar_url.trim().length > 500) {
      errors['avatar_url'] = 'Đường dẫn ảnh tối đa 500 ký tự';
    }

    this.errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  protected save(): void {
    if (!this.validate()) {
      this.notify('Vui lòng kiểm tra lại các ô được đánh dấu');
      return;
    }

    const d = this.draft();
    this.saving.set(true);
    this.authService
      .updateProfile({
        full_name: d.full_name.trim(),
        phone: d.phone.trim(),
        avatar_url: d.avatar_url.trim(),
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.notify(res.message);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.notify(err.message);
        },
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
