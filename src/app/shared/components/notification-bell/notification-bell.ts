import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { NotificationItem, NotificationType } from '@core/models/notification.model';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

/**
 * Chuông thông báo & Dropdown danh sách thông báo gần nhất.
 *
 * Bám sát đặc tả `00-nghiep-vu-thong-bao.md`:
 * - Tự động khởi động polling 60 giây khi người dùng đang đăng nhập.
 * - Hiển thị badge số thông báo chưa đọc (`99+` nếu vượt quá 99).
 * - Khi bấm mở dropdown: tải danh sách thông báo mới nhất (`GET /api/notifications`),
 *   cho phép bấm vào từng thông báo để đánh dấu đã đọc + điều hướng tới `link_url`,
 *   hoặc bấm "Đánh dấu tất cả đã đọc" (`PATCH /api/notifications/read-all`).
 */
@Component({
  selector: 'app-notification-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit, OnDestroy {
  protected readonly notificationService = inject(NotificationService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Trạng thái đóng/mở của bảng thông báo. */
  protected readonly open = signal(false);

  /** Nhãn hiển thị trên badge (`99+` khi > 99). */
  protected readonly badgeLabel = computed(() => {
    const count = this.notificationService.unreadCount();
    return count > 99 ? '99+' : String(count);
  });

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.notificationService.startPolling();
    }
  }

  ngOnDestroy(): void {
    this.notificationService.stopPolling();
  }

  protected toggleDropdown(): void {
    const nextState = !this.open();
    this.open.set(nextState);
    if (nextState && this.authService.isLoggedIn()) {
      this.notificationService
        .loadNotifications(1, 10)
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
  }

  protected closeDropdown(): void {
    this.open.set(false);
  }

  protected onSelectNotification(item: NotificationItem): void {
    if (!item.is_read) {
      this.notificationService
        .markAsRead(item.id)
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.open.set(false);
    if (item.link_url) {
      this.router.navigateByUrl(item.link_url);
    }
  }

  protected onMarkAllAsRead(event: Event): void {
    event.stopPropagation();
    if (this.notificationService.unreadCount() === 0) {
      return;
    }
    this.notificationService
      .markAllAsRead()
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /** Đóng dropdown khi người dùng click ra ngoài vùng chuông. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  /** Icon Material tương ứng với từng nhóm thông báo. */
  protected iconFor(type: NotificationType): string {
    switch (type) {
      case 'FLIGHT_SCHEDULE_CHANGED':
        return 'schedule';
      case 'FLIGHT_DELAYED':
        return 'flight_takeoff';
      case 'FLIGHT_CANCELLED':
        return 'flight_land';
      case 'BOOKING_PAYMENT_EXPIRING':
        return 'hourglass_top';
      case 'BOOKING_CONFIRMED':
        return 'check_circle';
      case 'BOOKING_CANCELLED':
        return 'cancel';
      case 'ETICKET_ISSUED':
        return 'confirmation_number';
      case 'VOUCHER_ASSIGNED':
      case 'VOUCHER_EXPIRING':
        return 'redeem';
      default:
        return 'notifications';
    }
  }

  /** Tông màu ngữ nghĩa của icon theo loại thông báo. */
  protected toneFor(type: NotificationType): 'info' | 'warning' | 'danger' | 'success' {
    switch (type) {
      case 'FLIGHT_CANCELLED':
      case 'BOOKING_CANCELLED':
        return 'danger';
      case 'FLIGHT_DELAYED':
      case 'FLIGHT_SCHEDULE_CHANGED':
      case 'BOOKING_PAYMENT_EXPIRING':
      case 'VOUCHER_EXPIRING':
        return 'warning';
      case 'BOOKING_CONFIRMED':
      case 'ETICKET_ISSUED':
        return 'success';
      case 'VOUCHER_ASSIGNED':
      default:
        return 'info';
    }
  }

  /** Định dạng thời gian tương đối tiếng Việt ("Vừa xong", "5 phút trước", "2 giờ trước", ...). */
  protected formatRelativeTime(isoDate: string): string {
    if (!isoDate) {
      return '';
    }
    const createdMs = new Date(isoDate).getTime();
    if (Number.isNaN(createdMs)) {
      return '';
    }
    const diffSec = Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
    if (diffSec < 60) {
      return 'Vừa xong';
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin} phút trước`;
    }
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) {
      return `${diffHour} giờ trước`;
    }
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) {
      return `${diffDay} ngày trước`;
    }
    return new Date(createdMs).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
