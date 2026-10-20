import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VoucherStoreItem } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/**
 * Kho voucher — VOU-02 (API v0.2 mục 2.8).
 *
 * Vì sao hiện nút theo trạng thái chứ không luôn cho bấm: server từ chối nhận
 * trùng (`1005`) và hết lượt (`1006`). Để khách bấm rồi mới báo lỗi là trải
 * nghiệm tệ — nút phải nói trước được hay không.
 */
@Component({
  selector: 'app-voucher-store',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, AppCard, AppButton, EmptyState, SkeletonBlock],
  templateUrl: './voucher-store.html',
  styleUrl: './voucher-store.css',
})
export class VoucherStore {
  private readonly service = inject(UserVoucherService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly items = signal<VoucherStoreItem[]>([]);
  /** id voucher đang gửi yêu cầu nhận — để khoá nút, tránh bấm hai lần. */
  protected readonly claiming = signal<Set<number>>(new Set());

  private static readonly money = new Intl.NumberFormat('vi-VN');

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.store().subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Câu mô tả mức giảm, ví dụ "Giảm 50.000₫" hoặc "Giảm 10%, tối đa 200.000₫". */
  protected discountText(v: VoucherStoreItem): string {
    const value =
      v.discount_type === 'PERCENT'
        ? `Giảm ${v.discount_value}%`
        : `Giảm ${VoucherStore.money.format(v.discount_value)}₫`;
    if (v.discount_type === 'PERCENT' && v.max_discount_amount) {
      return `${value}, tối đa ${VoucherStore.money.format(v.max_discount_amount)}₫`;
    }
    return value;
  }

  protected minOrderText(v: VoucherStoreItem): string {
    return v.min_order_amount
      ? `Đơn từ ${VoucherStore.money.format(v.min_order_amount)}₫`
      : 'Không yêu cầu đơn tối thiểu';
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected isClaiming(id: number): boolean {
    return this.claiming().has(id);
  }

  protected claim(item: VoucherStoreItem): void {
    if (item.claimed || this.isClaiming(item.id)) {
      return;
    }

    this.claiming.set(new Set(this.claiming()).add(item.id));
    this.service.claim(item.id).subscribe({
      next: (res) => {
        this.claiming.set(new Set([...this.claiming()].filter((x) => x !== item.id)));
        // Đánh dấu tại chỗ thay vì tải lại cả kho — nhanh hơn và không nhảy vị trí.
        this.items.set(this.items().map((v) => (v.id === item.id ? { ...v, claimed: true } : v)));
        this.snackBar.open(res.message, 'Đóng', { duration: 3000 });
      },
      error: (err: Error) => {
        this.claiming.set(new Set([...this.claiming()].filter((x) => x !== item.id)));
        this.snackBar.open(err.message, 'Đóng', { duration: 4000 });
      },
    });
  }
}
