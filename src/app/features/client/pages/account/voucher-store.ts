import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VoucherStoreItem } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { AppButton } from '@shared/ui/app-button/app-button';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

/**
 * Kho voucher — VOU-02 (API v0.2 mục 2.8).
 */
@Component({
  selector: 'app-voucher-store',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, AppButton, EmptyState, SkeletonBlock, StatusBadge],
  templateUrl: './voucher-store.html',
  styleUrl: './voucher-store.css',
})
export class VoucherStore {
  private readonly service = inject(UserVoucherService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly items = signal<VoucherStoreItem[]>([]);
  protected readonly claiming = signal<Set<number>>(new Set());

  private static readonly money = new Intl.NumberFormat('vi-VN');

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.store().subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected stubValue(v: VoucherStoreItem): string {
    if (v.discount_type === 'PERCENT') {
      return `${v.discount_value}%`;
    }
    if (v.discount_value >= 1000 && v.discount_value % 1000 === 0) {
      return `${v.discount_value / 1000}K`;
    }
    return `${VoucherStore.money.format(v.discount_value)}đ`;
  }

  protected discountText(v: VoucherStoreItem): string {
    const value =
      v.discount_type === 'PERCENT'
        ? `Giảm ${v.discount_value}%`
        : `Giảm ${VoucherStore.money.format(v.discount_value)}đ`;
    if (v.discount_type === 'PERCENT' && v.max_discount_amount) {
      return `${value}, tối đa ${VoucherStore.money.format(v.max_discount_amount)}đ`;
    }
    return value;
  }

  protected minOrderText(v: VoucherStoreItem): string {
    return v.min_order_amount
      ? `Đơn từ ${VoucherStore.money.format(v.min_order_amount)}đ`
      : 'Không yêu cầu đơn tối thiểu';
  }

  protected remainingCount(v: VoucherStoreItem): number | null {
    if (v.claim_limit === null || v.claim_limit === undefined) {
      return null;
    }
    return Math.max(0, v.claim_limit - (v.claimed_count ?? 0));
  }

  protected isExhausted(v: VoucherStoreItem): boolean {
    const rem = this.remainingCount(v);
    return rem !== null && rem <= 0;
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
    if (item.claimed || this.isExhausted(item) || this.isClaiming(item.id)) {
      return;
    }

    this.claiming.set(new Set(this.claiming()).add(item.id));
    this.service.claim(item.id).subscribe({
      next: (res) => {
        this.claiming.set(new Set([...this.claiming()].filter((x) => x !== item.id)));
        this.items.set(
          this.items().map((v) =>
            v.id === item.id
              ? { ...v, claimed: true, claimed_count: (v.claimed_count ?? 0) + 1 }
              : v,
          ),
        );
        this.snackBar.open(res.message || 'Đã lưu voucher vào ví', 'Đóng', { duration: 3000 });
      },
      error: (err: Error) => {
        this.claiming.set(new Set([...this.claiming()].filter((x) => x !== item.id)));
        this.snackBar.open(err.message, 'Đóng', { duration: 4000 });
      },
    });
  }
}
