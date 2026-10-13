import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminUserCreatePayload, AdminUserUpdatePayload, RoleName } from '@core/models/auth.model';
import { UserService } from '@core/services/catalog.service';
import { AuthService } from '@core/services/auth.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';

/**
 * Form người dùng — trang riêng, KHÔNG dùng `CrudPage`.
 *
 * Vì sao phải tách: hai hành động không biểu diễn được bằng danh sách trường
 * phẳng — (1) "Đặt lại mật khẩu" trả mật khẩu TẠM từ server rồi hiện ra cho
 * ADMIN chép, không phải một ô nhập; (2) chặn tự hạ quyền khi đây là ADMIN
 * ACTIVE cuối cùng, một ràng buộc phụ thuộc cả danh sách user chứ không chỉ
 * bản ghi đang sửa.
 */
@Component({
  selector: 'app-user-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, AppButton, AppCard, LoadingState],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm {
  private readonly service = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly isEdit = signal(false);
  protected readonly userId = signal<number | null>(null);

  /** Mật khẩu tạm vừa sinh — chỉ hiện sau khi ADMIN bấm Đặt lại. */
  protected readonly tempPassword = signal<string | null>(null);

  protected readonly draft = signal({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    is_active: true,
    role: 'CUSTOMER' as RoleName,
  });

  protected readonly errors = signal<Record<string, string>>({});

  /** Chỉ ADMIN đang đăng nhập mới thấy cảnh báo "đây là chính bạn". */
  protected readonly isSelf = computed(() => this.userId() === this.authService.currentUser()?.id);

  constructor() {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.userId.set(Number(id));
      this.loadOne(Number(id));
    }
  }

  private loadOne(id: number): void {
    this.loading.set(true);
    this.service.getById(id).subscribe({
      next: (res) => {
        const u = res.data;
        this.draft.set({
          email: u.email,
          password: '',
          full_name: u.full_name,
          phone: u.phone ?? '',
          is_active: u.is_active,
          role: u.roles[0] ?? 'CUSTOMER',
        });
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.notify(err.message);
        this.loading.set(false);
        this.router.navigate(['/admin/users']);
      },
    });
  }

  protected setDraft<K extends keyof ReturnType<typeof this.draft>>(
    key: K,
    value: ReturnType<typeof this.draft>[K],
  ): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (this.errors()[key as string]) {
      const next = { ...this.errors() };
      delete next[key as string];
      this.errors.set(next);
    }
  }

  protected fieldError(key: string): string {
    return this.errors()[key] ?? '';
  }

  private validate(): boolean {
    const d = this.draft();
    const errors: Record<string, string> = {};

    // Email và mật khẩu chỉ có ở lần TẠO: email là định danh không đổi được, còn
    // mật khẩu đổi qua luồng riêng (`reset-password`), không qua form này.
    if (!this.isEdit()) {
      if (!d.email.trim()) {
        errors['email'] = 'Email không được để trống';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
        errors['email'] = 'Email không hợp lệ';
      }
      if (!d.password) {
        errors['password'] = 'Mật khẩu không được để trống';
      } else if (d.password.length < 8) {
        errors['password'] = 'Mật khẩu phải có ít nhất 8 ký tự';
      }
    }

    if (!d.full_name.trim()) {
      errors['full_name'] = 'Họ tên không được để trống';
    }
    if (d.phone && !/^0\d{9}$/.test(d.phone.trim())) {
      errors['phone'] = 'Số điện thoại phải gồm 10 số, bắt đầu bằng 0';
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
    const id = this.userId();
    this.saving.set(true);

    const request$ = id
      ? this.service.update(id, {
          full_name: d.full_name.trim(),
          phone: d.phone.trim() || null,
          is_active: d.is_active,
          // DB v0.4: một user một role. API v0.2 vẫn nhận mảng nên gửi 1 phần tử.
          roles: [d.role],
        } satisfies AdminUserUpdatePayload)
      : this.service.create({
          email: d.email.trim().toLowerCase(),
          password: d.password,
          full_name: d.full_name.trim(),
          phone: d.phone.trim() || null,
          is_active: d.is_active,
          roles: [d.role],
        } satisfies AdminUserCreatePayload);

    request$.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.notify(res.message);
        this.router.navigate(['/admin/users']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        // Lỗi 1006 khi hạ quyền ADMIN cuối cùng rơi vào đây.
        this.notify(err.message);
      },
    });
  }

  /**
   * Đặt lại mật khẩu — server sinh mật khẩu tạm và trả về; FE chỉ hiện ra cho
   * ADMIN chép rồi đưa cho nhân viên. Không cho ADMIN tự nhập mật khẩu mới vì
   * như vậy ADMIN sẽ biết mật khẩu của người khác.
   *
   * CHỜ BE CHỐT (API v0.2 mục 5, open item #5): nếu Bình chọn GỬI EMAIL thay vì
   * trả mật khẩu tạm thì bỏ `tempPassword` và khối hiện mật khẩu trong template,
   * chỉ giữ thông báo "đã gửi email".
   */
  protected resetPassword(): void {
    const id = this.userId();
    if (!id) return;

    this.service.resetPassword(id).subscribe({
      next: (res) => {
        this.tempPassword.set(res.data.temporary_password);
        this.notify(res.message);
      },
      error: (err: Error) => this.notify(err.message),
    });
  }

  protected cancel(): void {
    this.router.navigate(['/admin/users']);
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Đóng', { duration: 3000 });
  }
}
