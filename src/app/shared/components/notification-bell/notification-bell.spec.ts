import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationItem } from '@core/models/notification.model';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { NotificationBell } from '@shared/components/notification-bell/notification-bell';

const MOCK_ITEMS: NotificationItem[] = [
  {
    id: 10,
    type: 'FLIGHT_DELAYED',
    title: 'Chuyến bay VN214 bị trễ giờ',
    body: 'Khởi hành mới dự kiến lúc 15:45.',
    link_url: '/account',
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: 11,
    type: 'ETICKET_ISSUED',
    title: 'Vé điện tử đã phát hành',
    body: 'Vé số 738-2491820415 đã sẵn sàng.',
    link_url: '/account',
    is_read: true,
    read_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
];

describe('NotificationBell Component', () => {
  let unreadCountSignal = signal(2);
  let itemsSignal = signal<NotificationItem[]>(MOCK_ITEMS);
  let loadingSignal = signal(false);
  let isLoggedInSignal = signal(true);

  const mockNotificationService = {
    unreadCount: () => unreadCountSignal(),
    items: () => itemsSignal(),
    loading: () => loadingSignal(),
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    loadNotifications: vi.fn(() =>
      of({
        code: 1000,
        message: 'Thành công',
        data: {
          items: itemsSignal(),
          pagination: { page: 1, size: 10, total_items: itemsSignal().length, total_pages: 1 },
        },
      }),
    ),
    markAsRead: vi.fn((id: number) => {
      itemsSignal.update((list) =>
        list.map((i) => (i.id === id ? { ...i, is_read: true } : i)),
      );
      unreadCountSignal.update((c) => Math.max(0, c - 1));
      return of({ code: 1000, message: 'OK', data: MOCK_ITEMS[0] });
    }),
    markAllAsRead: vi.fn(() => {
      itemsSignal.update((list) => list.map((i) => ({ ...i, is_read: true })));
      unreadCountSignal.set(0);
      return of({ code: 1000, message: 'OK', data: null });
    }),
  };

  beforeEach(async () => {
    unreadCountSignal = signal(2);
    itemsSignal = signal<NotificationItem[]>(MOCK_ITEMS.map((i) => ({ ...i })));
    loadingSignal = signal(false);
    isLoggedInSignal = signal(true);
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthService, useValue: { isLoggedIn: isLoggedInSignal } },
      ],
    }).compileComponents();
  });

  it('khởi động polling khi khởi tạo và hiển thị badge số chưa đọc', async () => {
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockNotificationService.startPolling).toHaveBeenCalledTimes(1);
    const badge = fixture.nativeElement.querySelector('[data-testid="notif-badge"]') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('2');
  });

  it('hiển thị 99+ khi số thông báo chưa đọc lớn hơn 99', async () => {
    unreadCountSignal.set(125);
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
    await fixture.whenStable();

    const badge = fixture.nativeElement.querySelector('[data-testid="notif-badge"]') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('99+');
  });

  it('mở dropdown khi bấm vào chuông và tải danh sách thông báo', async () => {
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.notif__btn') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(mockNotificationService.loadNotifications).toHaveBeenCalledWith(1, 10);
    const panel = fixture.nativeElement.querySelector('[data-testid="notif-panel"]') as HTMLElement;
    expect(panel).toBeTruthy();
    const items = fixture.nativeElement.querySelectorAll('[data-testid="notif-item"]');
    expect(items.length).toBe(2);
    expect(panel.textContent).toContain('Chuyến bay VN214 bị trễ giờ');
  });

  it('đánh dấu tất cả đã đọc khi bấm nút "Đánh dấu tất cả đã đọc"', async () => {
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.notif__btn') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const markAllBtn = fixture.nativeElement.querySelector(
      '[data-testid="notif-mark-all"]',
    ) as HTMLButtonElement;
    expect(markAllBtn).toBeTruthy();
    markAllBtn.click();
    fixture.detectChanges();

    expect(mockNotificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[data-testid="notif-badge"]')).toBeNull();
  });

  it('bấm vào thông báo chưa đọc sẽ gọi markAsRead, đóng dropdown và điều hướng', async () => {
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.notif__btn') as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    const firstItem = fixture.nativeElement.querySelector(
      '[data-testid="notif-item"]',
    ) as HTMLButtonElement;
    firstItem.click();
    fixture.detectChanges();

    expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(10);
    expect(navSpy).toHaveBeenCalledWith('/account');
    expect(fixture.nativeElement.querySelector('[data-testid="notif-panel"]')).toBeNull();
  });
});
