import { HttpClient, HttpParams } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { AdminUser, RoleName } from '@core/models/auth.model';
import { BookingStatus, BookingSummary } from '@core/models/booking.model';
import { UserService } from '@core/services/catalog.service';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { BadgeTone, StatusBadge } from '@shared/ui/status-badge/status-badge';

const ROLE_SUMMARIES: Record<RoleName, { label: string; tone: BadgeTone; permissions: string[] }> =
  {
    ADMIN: {
      label: 'Quản trị viên',
      tone: 'danger',
      permissions: [
        'Quản lý toàn bộ danh mục (hãng bay, sân bay, máy bay, hạng vé)',
        'Quản trị người dùng, vai trò, khuyến mãi & voucher',
        'Xem báo cáo doanh thu và quản lý toàn bộ đặt chỗ',
      ],
    },
    STAFF: {
      label: 'Nhân viên vận hành',
      tone: 'info',
      permissions: [
        'Tạo & cập nhật lịch bay, trạng thái vận hành chuyến bay',
        'Cấu hình giá bán theo chuyến và quản lý tồn ghế',
        'Tra cứu & hỗ trợ xử lý đặt chỗ của khách hàng',
      ],
    },
    CUSTOMER: {
      label: 'Khách hàng',
      tone: 'neutral',
      permissions: [
        'Tìm chuyến bay nội địa, đặt vé và chọn ghế trực tuyến',
        'Nhận & sử dụng voucher trong ví cá nhân',
        'Quản lý lịch sử đặt chỗ và hồ sơ cá nhân',
      ],
    },
  };

/**
 * Trang chi tiết Người dùng (`/admin/users/:id`).
 * Hiển thị hồ sơ tài khoản, tóm tắt vai trò/quyền hạn và bảng "Đặt chỗ gần đây"
 * nạp từ `GET /api/admin/bookings?user_id={id}`.
 */
@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, AppButton, AppCard, LoadingState, StatusBadge],
  template: `
    <div class="wrap wrap--narrow">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/admin/users">Người dùng</a>
        <mat-icon>chevron_right</mat-icon>
        <span>{{ user()?.full_name || 'Chi tiết' }}</span>
      </nav>

      @if (loading()) {
        <app-app-card><app-loading-state /></app-app-card>
      } @else if (user(); as u) {
        <header class="profile-head">
          <div class="profile-head__main">
            <div class="avatar">
              @if (u.avatar_url && !avatarBroken()) {
                <img
                  [src]="u.avatar_url"
                  [alt]="u.full_name"
                  loading="lazy"
                  (error)="avatarBroken.set(true)"
                />
              } @else {
                <span class="avatar__init" aria-hidden="true">{{ initials() }}</span>
              }
            </div>

            <div class="profile-head__info">
              <div class="profile-head__badges">
                <app-status-badge
                  [label]="u.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'"
                  [tone]="u.status === 'ACTIVE' ? 'success' : 'neutral'"
                />
                @for (r of u.roles; track r) {
                  <app-status-badge [label]="roleMeta(r).label" [tone]="roleMeta(r).tone" />
                }
              </div>
              <h1>{{ u.full_name }}</h1>
              <p class="profile-head__sub">{{ u.email }}</p>
            </div>
          </div>

          <div class="profile-head__acts">
            <app-app-button variant="ghost" size="sm" (clicked)="goBack()">
              <mat-icon>arrow_back</mat-icon>
              Quay lại
            </app-app-button>
            <app-app-button size="sm" (clicked)="goEdit()">
              <mat-icon>edit</mat-icon>
              Chỉnh sửa
            </app-app-button>
          </div>
        </header>

        <app-app-card title="Thông tin tài khoản" class="blk">
          <dl class="kv-grid">
            <div class="kv">
              <dt>Họ và tên</dt>
              <dd>{{ u.full_name }}</dd>
            </div>
            <div class="kv">
              <dt>Email</dt>
              <dd class="mono">{{ u.email }}</dd>
            </div>
            <div class="kv">
              <dt>Số điện thoại</dt>
              <dd>{{ u.phone || 'Chưa cập nhật' }}</dd>
            </div>
            <div class="kv">
              <dt>Ngày tạo tài khoản</dt>
              <dd>{{ formatDateTime(u.created_at) }}</dd>
            </div>
          </dl>
        </app-app-card>

        <app-app-card title="Vai trò & quyền hạn" class="blk">
          <ul class="perm-list">
            @for (item of rolePermissions(); track item) {
              <li>
                <mat-icon aria-hidden="true">check_circle_outline</mat-icon>
                <span>{{ item }}</span>
              </li>
            }
          </ul>
        </app-app-card>

        <app-app-card title="Đặt chỗ gần đây" class="blk">
          @if (bookings().length === 0) {
            <p class="empty-line">Người dùng này chưa có đơn đặt chỗ nào.</p>
          } @else {
            <div class="table-scroll">
              <table class="bk-table">
                <thead>
                  <tr>
                    <th>Mã đặt chỗ</th>
                    <th>Hành trình</th>
                    <th>Loại</th>
                    <th class="col-num">Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th>Ngày đặt</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of bookings(); track b.id) {
                    <tr (click)="openBooking(b.id)">
                      <td class="mono col-link">{{ b.booking_code }}</td>
                      <td>{{ formatRoute(b) }}</td>
                      <td>{{ b.trip_type === 'ROUND_TRIP' ? 'Khứ hồi' : 'Một chiều' }}</td>
                      <td class="col-num">{{ formatMoney(b.total_amount) }}</td>
                      <td>
                        <app-status-badge
                          [label]="bookingStatusLabel(b.status)"
                          [tone]="bookingStatusTone(b.status)"
                        />
                      </td>
                      <td>{{ formatDateTime(b.created_at) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </app-app-card>
      }
    </div>
  `,
  styles: `
    .blk {
      display: block;
      margin-bottom: var(--sp-md);
    }

    .profile-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      margin-bottom: var(--sp-md);
      flex-wrap: wrap;
    }

    .profile-head__main {
      display: flex;
      align-items: center;
      gap: var(--sp-md);
      min-width: 0;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      background: var(--color-primary-soft);
      border: 2px solid var(--color-border);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar__init {
      font-family: var(--font-heading);
      font-size: var(--text-h3);
      font-weight: 700;
      color: var(--color-primary);
    }

    .profile-head__info {
      min-width: 0;
    }

    .profile-head__badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 4px;
    }

    .profile-head h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: var(--text-h2);
      color: var(--color-ink);
    }

    .profile-head__sub {
      margin: 2px 0 0;
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .profile-head__acts {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
    }

    .kv-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--sp-md);
      margin: 0;
    }

    .kv {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kv dt {
      font-size: var(--text-caption);
      font-weight: 600;
      color: var(--color-ink-muted);
    }

    .kv dd {
      margin: 0;
      font-size: var(--text-body);
      color: var(--color-ink);
    }

    .mono {
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-size: var(--text-small);
    }

    .perm-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
    }

    .perm-list li {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .perm-list mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-success);
      flex-shrink: 0;
    }

    .table-scroll {
      overflow-x: auto;
    }

    .bk-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-small);
    }

    .bk-table th,
    .bk-table td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
      white-space: nowrap;
    }

    .bk-table th {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }

    .bk-table tbody tr {
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .bk-table tbody tr:hover {
      background: var(--color-surface-alt);
    }

    .col-link {
      font-weight: 700;
      color: var(--color-primary);
    }

    .col-num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }

    @media (max-width: 640px) {
      .kv-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class UserDetail {
  private readonly userService = inject(UserService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly loading = signal(true);
  protected readonly avatarBroken = signal(false);
  protected readonly user = signal<AdminUser | null>(null);
  protected readonly bookings = signal<BookingSummary[]>([]);

  protected readonly initials = computed(() => {
    const name = this.user()?.full_name?.trim() ?? '';
    if (!name) {
      return '?';
    }
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return `${first}${last}`.toUpperCase();
  });

  protected readonly rolePermissions = computed(() => {
    const roles = this.user()?.roles ?? ['CUSTOMER'];
    const items: string[] = [];
    for (const r of roles) {
      const meta = ROLE_SUMMARIES[r] ?? ROLE_SUMMARIES.CUSTOMER;
      items.push(...meta.permissions);
    }
    return Array.from(new Set(items));
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/admin/users']);
      return;
    }
    this.loadData(id);
  }

  private loadData(id: number): void {
    this.loading.set(true);
    const bookingParams = new HttpParams()
      .set('user_id', String(id))
      .set('page', '1')
      .set('size', '10');

    forkJoin({
      user: this.userService.getById(id),
      bookings: this.http
        .get<ApiResponse<PageData<BookingSummary>>>(`${environment.apiBaseUrl}/admin/bookings`, {
          params: bookingParams,
        })
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ user, bookings }) => {
          this.user.set(user.data);
          this.bookings.set(bookings?.data?.items ?? []);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.snackBar.open(err.message || 'Không tải được chi tiết người dùng', 'Đóng', {
            duration: 3000,
          });
          this.loading.set(false);
          this.router.navigate(['/admin/users']);
        },
      });
  }

  protected roleMeta(role: RoleName) {
    return ROLE_SUMMARIES[role] ?? ROLE_SUMMARIES.CUSTOMER;
  }

  protected openBooking(bookingId: number): void {
    this.router.navigate(['/admin/bookings', bookingId]);
  }

  protected goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  protected goEdit(): void {
    const id = this.user()?.id;
    if (id) {
      this.router.navigate(['/admin/users', id, 'edit']);
    }
  }

  protected formatRoute(b: BookingSummary): string {
    if (!b.segments?.length) {
      return '—';
    }
    return b.segments
      .map((s) => `${s.departure_airport_code} → ${s.arrival_airport_code}`)
      .join(' / ');
  }

  protected formatMoney(amount: number): string {
    return `${UserDetail.money.format(amount)}đ`;
  }

  protected formatDateTime(iso: string): string {
    if (!iso) {
      return '—';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleDateString('vi-VN');
  }

  protected bookingStatusLabel(status: BookingStatus): string {
    switch (status) {
      case 'CONFIRMED':
        return 'Đã xác nhận';
      case 'PENDING_PAYMENT':
        return 'Chờ thanh toán';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return 'Hết hạn';
    }
  }

  protected bookingStatusTone(status: BookingStatus): BadgeTone {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'PENDING_PAYMENT':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
