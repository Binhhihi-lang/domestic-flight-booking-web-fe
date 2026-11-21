import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { NotificationItem, UnreadCountResponse } from '@core/models/notification.model';
import { AuthService } from '@core/services/auth.service';

/**
 * Dịch vụ thông báo trong ứng dụng (In-app Notification) — khớp `00-nghiep-vu-thong-bao.md`.
 *
 * Cơ chế Polling 60 giây:
 * - Gọi `GET /api/notifications/unread-count` mỗi 60.000ms khi người dùng đã đăng nhập
 *   và tab trình duyệt đang hiển thị (`document.visibilityState === 'visible'`).
 * - Khi người dùng quay lại tab (`visibilitychange` sang `visible`), tự động làm mới
 *   số thông báo chưa đọc ngay lập tức.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  /** Chu kỳ polling 60 giây theo thiết kế mục 6.1. */
  static readonly POLL_INTERVAL_MS = 60_000;

  private readonly unreadCountSignal = signal<number>(0);
  private readonly itemsSignal = signal<NotificationItem[]>([]);
  private readonly loadingSignal = signal<boolean>(false);

  /** Số lượng thông báo chưa đọc hiện tại (hiển thị trên badge chuông). */
  readonly unreadCount = this.unreadCountSignal.asReadonly();

  /** Danh sách thông báo gần nhất trong dropdown. */
  readonly items = this.itemsSignal.asReadonly();

  /** Trạng thái đang tải danh sách thông báo. */
  readonly loading = this.loadingSignal.asReadonly();

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private visibilityListenerAttached = false;

  private readonly onVisibilityChange = (): void => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'visible' &&
      this.authService.isLoggedIn()
    ) {
      this.refreshUnreadCount();
    }
  };

  /**
   * Bắt đầu vòng lặp polling 60s.
   * An toàn khi gọi nhiều lần (idempotent): chỉ giữ 1 timer duy nhất.
   */
  startPolling(): void {
    if (this.pollTimer !== null) {
      return;
    }

    if (this.authService.isLoggedIn() && this.isTabVisible()) {
      this.refreshUnreadCount();
    }

    this.pollTimer = setInterval(() => {
      if (this.authService.isLoggedIn() && this.isTabVisible()) {
        this.refreshUnreadCount();
      }
    }, NotificationService.POLL_INTERVAL_MS);

    if (typeof document !== 'undefined' && !this.visibilityListenerAttached) {
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.visibilityListenerAttached = true;
    }
  }

  /** Dừng vòng lặp polling và gỡ sự kiện `visibilitychange`. */
  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (typeof document !== 'undefined' && this.visibilityListenerAttached) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.visibilityListenerAttached = false;
    }
  }

  /** Đặt lại state về rỗng khi đăng xuất. */
  reset(): void {
    this.unreadCountSignal.set(0);
    this.itemsSignal.set([]);
    this.loadingSignal.set(false);
  }

  /** Gọi nhanh `fetchUnreadCount()` và bỏ qua lỗi mạng để không làm gãy giao diện. */
  refreshUnreadCount(): void {
    this.fetchUnreadCount()
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /** `GET /api/notifications/unread-count` — tải nhẹ định kỳ mỗi 60 giây. */
  fetchUnreadCount(): Observable<ApiResponse<UnreadCountResponse>> {
    return this.http
      .get<ApiResponse<UnreadCountResponse>>(`${this.baseUrl}/unread-count`)
      .pipe(
        tap((res) => {
          const count = res?.data?.unread_count ?? 0;
          this.unreadCountSignal.set(Math.max(0, count));
        }),
      );
  }

  /**
   * `GET /api/notifications` — tải danh sách thông báo khi người dùng bấm mở chuông.
   */
  loadNotifications(
    page = 1,
    size = 10,
    unreadOnly?: boolean,
  ): Observable<ApiResponse<PageData<NotificationItem>>> {
    this.loadingSignal.set(true);
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (unreadOnly !== undefined) {
      params = params.set('unread', String(unreadOnly));
    }
    return this.http
      .get<ApiResponse<PageData<NotificationItem>>>(this.baseUrl, { params })
      .pipe(
        tap({
          next: (res) => {
            const list = res?.data?.items ?? [];
            this.itemsSignal.set(list);
            this.loadingSignal.set(false);
          },
          error: () => {
            this.loadingSignal.set(false);
          },
        }),
      );
  }

  /** `PATCH /api/notifications/{id}/read` — đánh dấu 1 thông báo đã đọc. */
  markAsRead(id: number): Observable<ApiResponse<NotificationItem>> {
    return this.http
      .patch<ApiResponse<NotificationItem>>(`${this.baseUrl}/${id}/read`, {})
      .pipe(
        tap(() => {
          const now = new Date().toISOString();
          let decremented = false;
          this.itemsSignal.update((list) =>
            list.map((item) => {
              if (item.id === id && !item.is_read) {
                decremented = true;
                return { ...item, is_read: true, read_at: now };
              }
              return item;
            }),
          );
          if (decremented) {
            this.unreadCountSignal.update((c) => Math.max(0, c - 1));
          }
        }),
      );
  }

  /** `PATCH /api/notifications/read-all` — đánh dấu tất cả thông báo của user là đã đọc. */
  markAllAsRead(): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => {
        const now = new Date().toISOString();
        this.itemsSignal.update((list) =>
          list.map((item) => (item.is_read ? item : { ...item, is_read: true, read_at: now })),
        );
        this.unreadCountSignal.set(0);
      }),
    );
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private isTabVisible(): boolean {
    return typeof document === 'undefined' || document.visibilityState === 'visible';
  }
}
