import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AccountProfile } from '@features/client/pages/account/account-profile';
import { PageHeader } from '@shared/components/page-header/page-header';

/**
 * Hồ sơ cá nhân trong khu vực vận hành — cùng dữ liệu với `/account/profile`.
 *
 * Vì sao dùng lại component của khách thay vì viết bản riêng: cả hai gọi đúng
 * một endpoint `GET/PUT /api/profile` trên user trong token. Chép sang bản thứ
 * hai chỉ tạo hai chỗ phải sửa khi hợp đồng đổi.
 *
 * Khác biệt duy nhất là khung trang: khu vận hành dùng `PageHeader` của admin,
 * còn khách đã có tiêu đề trong `account-layout`.
 */
@Component({
  selector: 'app-admin-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccountProfile, PageHeader],
  template: `
    <div class="wrap">
      <app-page-header
        title="Hồ sơ cá nhân"
        subtitle="Thông tin tài khoản đang đăng nhập khu vực vận hành"
      />
      <app-account-profile [hideHeading]="true" />
    </div>
  `,
})
export class AdminProfile {}
