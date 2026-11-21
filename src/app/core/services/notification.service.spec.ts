import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NotificationItem } from '@core/models/notification.model';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

const BASE_URL = 'http://localhost:8080/api/notifications';

const SAMPLE_ITEMS: NotificationItem[] = [
  {
    id: 1,
    type: 'FLIGHT_DELAYED',
    title: 'Chuyến bay VN214 bị trễ giờ',
    body: 'Chuyến VN214 dự kiến khởi hành lúc 15:45.',
    link_url: '/account',
    is_read: false,
    read_at: null,
    created_at: '2026-04-16T10:00:00Z',
  },
  {
    id: 2,
    type: 'BOOKING_CONFIRMED',
    title: 'Đặt chỗ VF882194 thành công',
    body: 'Đơn đặt chỗ đã được xác nhận.',
    link_url: '/account',
    is_read: true,
    read_at: '2026-04-16T09:30:00Z',
    created_at: '2026-04-16T09:00:00Z',
  },
];

describe('NotificationService — Polling 60s & quản lý thông báo in-app', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let isLoggedInSignal = signal(true);

  beforeEach(() => {
    isLoggedInSignal = signal(true);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationService,
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: isLoggedInSignal,
          },
        },
      ],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopPolling();
    vi.useRealTimers();
    httpMock.verify();
  });

  it('fetchUnreadCount: cập nhật signal unreadCount từ API', () => {
    service.fetchUnreadCount().subscribe();

    httpMock
      .expectOne(`${BASE_URL}/unread-count`)
      .flush({ code: 1000, message: 'Thành công', data: { unread_count: 4 } });

    expect(service.unreadCount()).toBe(4);
  });

  it('loadNotifications: tải danh sách phân trang và cập nhật items signal', () => {
    service.loadNotifications(1, 10).subscribe();
    expect(service.loading()).toBe(true);

    httpMock.expectOne(`${BASE_URL}?page=1&size=10`).flush({
      code: 1000,
      message: 'Thành công',
      data: {
        items: SAMPLE_ITEMS,
        pagination: { page: 1, size: 10, total_items: 2, total_pages: 1 },
      },
    });

    expect(service.loading()).toBe(false);
    expect(service.items().length).toBe(2);
    expect(service.items()[0].title).toBe('Chuyến bay VN214 bị trễ giờ');
  });

  it('markAsRead: đánh dấu 1 thông báo chưa đọc và giảm unreadCount đi 1', () => {
    service.fetchUnreadCount().subscribe();
    httpMock
      .expectOne(`${BASE_URL}/unread-count`)
      .flush({ code: 1000, message: 'Thành công', data: { unread_count: 1 } });

    service.loadNotifications(1, 10).subscribe();
    httpMock.expectOne(`${BASE_URL}?page=1&size=10`).flush({
      code: 1000,
      message: 'Thành công',
      data: {
        items: SAMPLE_ITEMS,
        pagination: { page: 1, size: 10, total_items: 2, total_pages: 1 },
      },
    });

    service.markAsRead(1).subscribe();
    httpMock
      .expectOne(`${BASE_URL}/1/read`)
      .flush({ code: 1000, message: 'Đã đọc', data: { ...SAMPLE_ITEMS[0], is_read: true } });

    expect(service.items()[0].is_read).toBe(true);
    expect(service.unreadCount()).toBe(0);
  });

  it('markAllAsRead: đánh dấu toàn bộ thông báo là đã đọc và đặt unreadCount = 0', () => {
    service.fetchUnreadCount().subscribe();
    httpMock
      .expectOne(`${BASE_URL}/unread-count`)
      .flush({ code: 1000, message: 'Thành công', data: { unread_count: 3 } });

    service.loadNotifications(1, 10).subscribe();
    httpMock.expectOne(`${BASE_URL}?page=1&size=10`).flush({
      code: 1000,
      message: 'Thành công',
      data: {
        items: SAMPLE_ITEMS,
        pagination: { page: 1, size: 10, total_items: 2, total_pages: 1 },
      },
    });

    service.markAllAsRead().subscribe();
    httpMock
      .expectOne(`${BASE_URL}/read-all`)
      .flush({ code: 1000, message: 'Đã đánh dấu tất cả', data: null });

    expect(service.unreadCount()).toBe(0);
    expect(service.items().every((i) => i.is_read)).toBe(true);
  });

  it('startPolling: gọi unread-count ngay lập tức và lặp lại mỗi 60 giây khi đã đăng nhập', () => {
    vi.useFakeTimers();

    service.startPolling();

    // Lần gọi đầu tiên ngay khi startPolling
    httpMock
      .expectOne(`${BASE_URL}/unread-count`)
      .flush({ code: 1000, message: 'Thành công', data: { unread_count: 2 } });
    expect(service.unreadCount()).toBe(2);

    // Sau 60 giây gọi lần tiếp theo
    vi.advanceTimersByTime(NotificationService.POLL_INTERVAL_MS);
    httpMock
      .expectOne(`${BASE_URL}/unread-count`)
      .flush({ code: 1000, message: 'Thành công', data: { unread_count: 5 } });
    expect(service.unreadCount()).toBe(5);

    // Khi user đăng xuất (isLoggedIn = false), chu kỳ 60s tiếp theo không bắn request
    isLoggedInSignal.set(false);
    vi.advanceTimersByTime(NotificationService.POLL_INTERVAL_MS);
    httpMock.expectNone(`${BASE_URL}/unread-count`);
  });
});
