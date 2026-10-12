import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { PageHeader } from '@shared/components/page-header/page-header';
import { AppAlert } from '@shared/ui/app-alert/app-alert';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';
import { EmptyState } from '@shared/components/empty-state/empty-state';

interface TokenRow {
  name: string;
  value: string;
  usage: string;
}

/**
 * Trang tra cứu design system.
 *
 * Vì sao cần trang này: khi làm trang mới, người làm mở đây đối chiếu thay vì
 * đoán màu hay tự chế component. Cũng là nơi kiểm chứng Tailwind và Material
 * đã dùng chung một nguồn màu chưa.
 */
@Component({
  selector: 'app-style-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageHeader,
    AppButton,
    AppCard,
    AppAlert,
    StatusBadge,
    LoadingState,
    SkeletonBlock,
    EmptyState,
  ],
  templateUrl: './style-guide.html',
  styleUrl: './style-guide.css',
})
export class StyleGuide {
  protected readonly dark = signal(false);

  protected readonly colorTokens: TokenRow[] = [
    { name: '--color-primary', value: '#0770CD', usage: 'Nền nút có chữ trắng' },
    { name: '--color-primary-bright', value: '#0194F3', usage: 'Viền, icon, chữ trên nền sáng' },
    { name: '--color-primary-hover', value: '#0A57A8', usage: 'Hover, nhấn' },
    { name: '--color-primary-soft', value: '#EAF7FF', usage: 'Nền vùng chọn' },
    { name: '--color-accent', value: '#FF5E1F', usage: 'Giá khuyến mãi' },
    { name: '--color-success', value: '#00A651', usage: 'Tốt, tiết kiệm' },
    { name: '--color-success-soft', value: '#DCFCE7', usage: 'Nền nhãn "Hoạt động"' },
    { name: '--color-on-success-soft', value: '#15803D', usage: 'Chữ trên nền nhãn success' },
    { name: '--color-warning', value: '#F2A81D', usage: 'Sắp hết' },
    { name: '--color-warning-soft', value: '#FEF3C7', usage: 'Nền nhãn "Sắp hết"' },
    { name: '--color-on-warning-soft', value: '#B45309', usage: 'Chữ trên nền nhãn warning' },
    { name: '--color-danger', value: '#E5484D', usage: 'Lỗi, hết chỗ' },
    { name: '--color-danger-soft', value: '#FEE2E2', usage: 'Nền nhãn "Hết chỗ"' },
    { name: '--color-on-danger-soft', value: '#B91C1C', usage: 'Chữ trên nền nhãn danger' },
    { name: '--color-dark', value: '#05285D', usage: 'Nền footer, sidebar vận hành' },
    { name: '--color-bg', value: '#F7F9FA', usage: 'Nền trang' },
    { name: '--color-surface', value: '#FFFFFF', usage: 'Card, panel' },
    { name: '--color-ink', value: '#03121A', usage: 'Chữ chính' },
    { name: '--color-ink-muted', value: '#687176', usage: 'Chữ phụ' },
    { name: '--color-ink-subtle', value: '#6A737A', usage: 'Placeholder' },
    { name: '--color-border', value: '#DDE3E8', usage: 'Viền, phân cách' },
    { name: '--color-border-soft', value: '#EDF1F4', usage: 'Phân cách trong bảng' },
  ];

  protected toggleTheme(): void {
    const next = !this.dark();
    this.dark.set(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  }
}
