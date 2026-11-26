import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { UploadService } from '@core/services/upload.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

interface ProfileDraft {
  full_name: string;
  phone: string;
  avatar_url: string;
}

/**
 * Hồ sơ cá nhân — PRO-01/PRO-02 (API v0.4 mục 2.2).
 *
 * Chỉ ba trường sửa được: họ tên, số điện thoại, ảnh đại diện.
 * Ảnh đại diện tải lên Cloudinary qua `UploadService.uploadProfileAvatar(file)`
 * để đảm bảo URL gọn (<= 500 ký tự, không nhồi base64 vào DB).
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
  private readonly uploadService = inject(UploadService);
  private readonly snackBar = inject(MatSnackBar);

  /**
   * Ẩn tiêu đề nội bộ khi được nhúng vào khung admin — nơi đã có `PageHeader`.
   * Mặc định hiện, vì trong `account-layout` đây là màn độc lập.
   */
  readonly hideHeading = input<boolean>(false);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploadingAvatar = signal(false);
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly brokenAvatar = signal(false);

  protected readonly draft = signal<ProfileDraft>({ full_name: '', phone: '', avatar_url: '' });
  private readonly initialDraft = signal<ProfileDraft>({ full_name: '', phone: '', avatar_url: '' });

  protected readonly isDirty = computed(() => {
    const cur = this.draft();
    const init = this.initialDraft();
    return (
      cur.full_name !== init.full_name ||
      cur.phone !== init.phone ||
      cur.avatar_url !== init.avatar_url
    );
  });

  /** Chỉ đọc — lấy từ phiên đăng nhập, không nằm trong form. */
  protected readonly account = this.authService.currentUser;

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.authService.getProfile().subscribe({
      next: (res) => {
        const loaded: ProfileDraft = {
          full_name: res.data.full_name,
          phone: res.data.phone ?? '',
          avatar_url: res.data.avatar_url ?? '',
        };
        this.draft.set(loaded);
        this.initialDraft.set({ ...loaded });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
      },
    });
  }

  protected setField(key: keyof ProfileDraft, value: string): void {
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

  protected resetChanges(): void {
    this.draft.set({ ...this.initialDraft() });
    this.errors.set({});
    this.brokenAvatar.set(false);
  }

  protected onPickAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notify('Vui lòng chọn tệp ảnh');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notify('Ảnh phải nhỏ hơn 2 MB');
      return;
    }

    this.uploadingAvatar.set(true);
    this.uploadService.uploadProfileAvatar(file).subscribe({
      next: (res) => {
        this.uploadingAvatar.set(false);
        const uploadedUrl = (res.data?.avatar_url ?? res.data?.url ?? '').trim();
        if (!uploadedUrl) {
          this.notify('Không nhận được đường dẫn ảnh từ máy chủ');
          return;
        }
        this.setField('avatar_url', uploadedUrl);
        this.notify(res.message || 'Tải ảnh đại diện thành công');
      },
      error: (err: Error) => {
        this.uploadingAvatar.set(false);
        this.notify(err.message || 'Tải ảnh đại diện thất bại');
      },
    });
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
    const payload: ProfileDraft = {
      full_name: d.full_name.trim(),
      phone: d.phone.trim(),
      avatar_url: d.avatar_url.trim(),
    };
    this.saving.set(true);
    this.authService.updateProfile(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.draft.set({ ...payload });
        this.initialDraft.set({ ...payload });
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
