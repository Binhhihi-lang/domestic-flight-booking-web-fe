import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserVoucher, UserVoucherStatus } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

/** Nhãn + tông màu cho từng trạng thái ví — một chỗ duy nhất để không lệch giữa các màn. */
const STATUS_META: Record<UserVoucherStatus, { label: string; tone: string }> = {
  AVAILABLE: { label: 'Dùng được', tone: 'success' },
  RESERVED: { label: 'Đang giữ', tone: 'info' },
  USED: { label: 'Đã dùng', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
};

/**
 * Voucher của tôi — VOU-01/VOU-05 (API v0.2 mục 2.8).
 *
 * Hiện `expires_at` của DÒNG VÍ, KHÔNG phải `voucher.end_date`: hạn được chép
 * lúc nhận, ADMIN sửa hạn voucher sau đó không ảnh hưởng voucher đã phát
 * (DB v0.4 ghi rõ). Hiện nhầm trường là nói sai hạn cho khách.
 */
@Component({
  selector: 'app-my-vouchers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppCard, EmptyState, SkeletonBlock],
  templateUrl: './my-vouchers.html',
  styleUrl: './my-vouchers.css',
})
export class MyVouchers {
  private readonly service = inject(UserVoucherService);

  protected readonly loading = signal(true);
  protected readonly vouchers = signal<UserVoucher[]>([]);
  protected readonly filter = signal<UserVoucherStatus | ''>('');

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly filtered = computed(() => {
    const f = this.filter();
    return f ? this.vouchers().filter((v) => v.status === f) : this.vouchers();
  });

  protected readonly counts = computed(() => {
    const all = this.vouchers();
    return {
      AVAILABLE: all.filter((v) => v.status === 'AVAILABLE').length,
      USED: all.filter((v) => v.status === 'USED').length,
      EXPIRED: all.filter((v) => v.status === 'EXPIRED').length,
    };
  });

  constructor() {
    this.service.myVouchers({ page: 1, size: 50 }).subscribe({
      next: (res) => {
        this.vouchers.set(res.data.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusLabel(s: UserVoucherStatus): string {
    return STATUS_META[s].label;
  }

  protected statusTone(s: UserVoucherStatus): string {
    return STATUS_META[s].tone;
  }

  protected setFilter(value: UserVoucherStatus | ''): void {
    this.filter.set(value);
  }

  /** Voucher đã dùng / hết hạn thì làm mờ — không còn hành động nào. */
  protected isDimmed(v: UserVoucher): boolean {
    return v.status === 'USED' || v.status === 'EXPIRED';
  }

  protected discountText(v: UserVoucher): string {
    const value =
      v.voucher.discount_type === 'PERCENT'
        ? `${v.voucher.discount_value}%`
        : `${MyVouchers.money.format(v.voucher.discount_value)}₫`;
    return `Giảm ${value}`;
  }

  protected formatDate(iso: string | null): string {
    return iso
      ? new Date(iso).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—';
  }
}
