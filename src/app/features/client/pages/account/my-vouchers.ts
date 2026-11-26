import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UserVoucher, UserVoucherStatus } from '@core/models/user-voucher.model';
import { UserVoucherService } from '@core/services/catalog.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const STATUS_META: Record<UserVoucherStatus, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: 'Dùng được', tone: 'success' },
  RESERVED: { label: 'Đang giữ', tone: 'info' },
  USED: { label: 'Đã dùng', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
};

/**
 * Voucher của tôi — VOU-01/VOU-05 (API v0.2 mục 2.8).
 *
 * Hiện `expires_at` của dòng ví (bản chép lúc nhận), không dùng `voucher.end_date`.
 */
@Component({
  selector: 'app-my-vouchers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, AppCard, EmptyState, SkeletonBlock, StatusBadge],
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
      TOTAL: all.length,
      AVAILABLE: all.filter((v) => v.status === 'AVAILABLE').length,
      RESERVED: all.filter((v) => v.status === 'RESERVED').length,
      USED: all.filter((v) => v.status === 'USED').length,
      EXPIRED: all.filter((v) => v.status === 'EXPIRED').length,
    };
  });

  constructor() {
    this.service.myVouchers({ page: 1, size: 50 }).subscribe({
      next: (res) => {
        this.vouchers.set(res.data?.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusLabel(s: UserVoucherStatus): string {
    return STATUS_META[s].label;
  }

  protected statusTone(s: UserVoucherStatus): BadgeTone {
    return STATUS_META[s].tone;
  }

  protected setFilter(value: UserVoucherStatus | ''): void {
    this.filter.set(value);
  }

  protected isDimmed(v: UserVoucher): boolean {
    return v.status === 'USED' || v.status === 'EXPIRED';
  }

  protected stubValue(v: UserVoucher): string {
    if (v.voucher.discount_type === 'PERCENT') {
      return `${v.voucher.discount_value}%`;
    }
    if (v.voucher.discount_value >= 1000 && v.voucher.discount_value % 1000 === 0) {
      return `${v.voucher.discount_value / 1000}K`;
    }
    return `${MyVouchers.money.format(v.voucher.discount_value)}đ`;
  }

  protected stubType(v: UserVoucher): string {
    return v.voucher.discount_type === 'PERCENT' ? 'Giảm phần trăm' : 'Giảm trực tiếp';
  }

  protected minOrderText(v: UserVoucher): string {
    return v.voucher.min_order_amount
      ? `Đơn từ ${MyVouchers.money.format(v.voucher.min_order_amount)}đ`
      : 'Không yêu cầu đơn tối thiểu';
  }

  protected tripTypeText(v: UserVoucher): string {
    if (v.voucher.applicable_trip_type === 'ONE_WAY') return 'Vé một chiều';
    if (v.voucher.applicable_trip_type === 'ROUND_TRIP') return 'Vé khứ hồi';
    return 'Mọi hành trình';
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
