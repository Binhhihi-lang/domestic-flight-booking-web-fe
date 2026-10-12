import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '@core/services/auth.service';
import { BrandLogo } from '@shared/components/brand-logo/brand-logo';

/**
 * Khung trang khách hàng — bám mockup P1 (nguồn chân lý thị giác).
 *
 * Vì sao không dùng mat-toolbar: thanh Material tự áp màu và chiều cao theo
 * theme, rất khó ép về đúng tông thương hiệu và mật độ của mockup. Topbar ở
 * đây chỉ là flexbox thuần, cho phép kiểm soát hoàn toàn ở mọi breakpoint.
 *
 * Mobile: nav ngang bị ẩn và thay bằng nút hamburger + ngăn kéo — nhồi 5 link
 * vào một hàng ở 375px sẽ hoặc tràn ngang, hoặc đẩy topbar cao gần 1/5 màn hình.
 */
@Component({
  selector: 'app-client-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatMenuModule, BrandLogo],
  templateUrl: './client-layout.html',
  styleUrl: './client-layout.css',
})
export class ClientLayout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /** Dòng phụ dưới logo trên header. */
  protected readonly brandTagline = 'Bay nội địa, giá tốt mỗi ngày';

  protected readonly menuOpen = signal(false);

  /** Chữ viết tắt cho avatar — "Nguyễn Minh Anh" → "NM". */
  protected readonly initials = () => {
    const name = this.authService.currentUser()?.full_name ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase();
  };

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      // Dù Backend lỗi, phiên cục bộ vẫn phải được xóa (API Design mục 1.5)
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/']);
      },
    });
  }

  protected goToAdmin(): void {
    this.router.navigate(['/admin']);
  }
}
