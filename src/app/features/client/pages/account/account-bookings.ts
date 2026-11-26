import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BookingSegmentSummary, BookingStatus, BookingSummary } from '@core/models/booking.model';
import { BookingFlowService } from '@core/services/booking-flow.service';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { AppButton } from '@shared/ui/app-button/app-button';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const moneyFmt = new Intl.NumberFormat('vi-VN');

const STATUS_TABS: { key: BookingStatus | ''; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'EXPIRED', label: 'Hết hạn' },
];

/**
 * Vé của tôi (`/account`) — bám prototype `customer.html`.
 */
@Component({
  selector: 'app-account-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, StatusBadge, EmptyState, SkeletonBlock],
  templateUrl: './account-bookings.html',
  styleUrl: './account-bookings.css',
})
export class AccountBookings {
  private readonly bookingFlow = inject(BookingFlowService);

  protected readonly tabs = STATUS_TABS;
  protected readonly activeStatus = signal<BookingStatus | ''>('');
  protected readonly loading = signal(true);
  protected readonly allBookings = signal<BookingSummary[]>([]);

  protected readonly tabCounts = computed<Record<BookingStatus | '', number>>(() => {
    const all = this.allBookings();
    return {
      '': all.length,
      PENDING_PAYMENT: all.filter((b) => b.status === 'PENDING_PAYMENT').length,
      CONFIRMED: all.filter((b) => b.status === 'CONFIRMED').length,
      CANCELLED: all.filter((b) => b.status === 'CANCELLED').length,
      EXPIRED: all.filter((b) => b.status === 'EXPIRED').length,
    };
  });

  protected readonly bookings = computed(() => {
    const status = this.activeStatus();
    if (!status) {
      return this.allBookings();
    }
    return this.allBookings().filter((b) => b.status === status);
  });

  constructor() {
    this.load();
  }

  protected selectTab(status: BookingStatus | ''): void {
    this.activeStatus.set(status);
  }

  private load(): void {
    this.loading.set(true);
    this.bookingFlow.listMyBookings('').subscribe({
      next: (res) => {
        this.allBookings.set(res.data?.items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusLabel(s: BookingStatus): string {
    if (s === 'CONFIRMED') return 'Đã xác nhận';
    if (s === 'PENDING_PAYMENT') return 'Chờ thanh toán';
    if (s === 'CANCELLED') return 'Đã hủy';
    return 'Hết hạn';
  }

  protected statusTone(s: BookingStatus): BadgeTone {
    if (s === 'CONFIRMED') return 'success';
    if (s === 'PENDING_PAYMENT') return 'warning';
    if (s === 'CANCELLED' || s === 'EXPIRED') return 'danger';
    return 'neutral';
  }

  protected formatMoney(val: number): string {
    return `${moneyFmt.format(val)}đ`;
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  protected formatDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  protected formatDuration(seg: BookingSegmentSummary): string {
    const dep = new Date(seg.scheduled_departure).getTime();
    const arr = new Date(seg.scheduled_arrival).getTime();
    if (Number.isNaN(dep) || Number.isNaN(arr) || arr <= dep) {
      return 'Bay thẳng';
    }
    const mins = Math.round((arr - dep) / 60_000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}g ${m > 0 ? `${m}p` : ''}`.trim() : `${m}p`;
  }
}
