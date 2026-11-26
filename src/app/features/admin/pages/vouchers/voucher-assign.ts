import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { AdminUser } from '@core/models/auth.model';
import { Voucher } from '@core/models/promotion.model';
import { UserService, VoucherService } from '@core/services/catalog.service';
import { ServerPager } from '@shared/components/server-pager/server-pager';
import { AppButton } from '@shared/ui/app-button/app-button';
import { AppCard } from '@shared/ui/app-card/app-card';
import { LoadingState } from '@shared/ui/loading-state/loading-state';
import { StatusBadge } from '@shared/ui/status-badge/status-badge';

/**
 * Trang Tặng voucher cho khách hàng (`/admin/vouchers/:id/assign`).
 * Cho phép tìm kiếm khách hàng, chọn hàng loạt bằng checkbox và gọi
 * `POST /api/admin/vouchers/:id/assign`.
 */
@Component({
  selector: 'app-voucher-assign',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
    AppButton,
    AppCard,
    LoadingState,
    StatusBadge,
    ServerPager,
  ],
  template: `
    <div class="wrap wrap--narrow">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/admin/vouchers">Voucher</a>
        <mat-icon>chevron_right</mat-icon>
        <a [routerLink]="['/admin/vouchers', voucherId()]">
          {{ voucher()?.voucher_code || 'Chi tiết' }}
        </a>
        <mat-icon>chevron_right</mat-icon>
        <span>Tặng voucher</span>
      </nav>

      @if (loadingVoucher()) {
        <app-app-card><app-loading-state /></app-app-card>
      } @else if (voucher(); as v) {
        <header class="page-h">
          <div>
            <div class="meta-row">
              <span class="code-pill">{{ v.voucher_code }}</span>
              <app-status-badge
                [label]="v.distribution_type === 'ASSIGNED' ? 'Tặng riêng' : 'Kho chung'"
                [tone]="v.distribution_type === 'ASSIGNED' ? 'info' : 'neutral'"
              />
            </div>
            <h1>Tặng voucher: {{ v.voucher_name }}</h1>
            <p>
              Mức giảm <strong>{{ formatDiscount(v) }}</strong> · Đã nhận
              <strong>{{ v.claimed_count }}</strong> /
              {{ v.claim_limit !== null ? v.claim_limit : 'Không giới hạn' }}
            </p>
          </div>
          <app-app-button variant="ghost" size="sm" (clicked)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Quay lại
          </app-app-button>
        </header>

        <app-app-card title="Chọn khách hàng nhận voucher" class="blk">
          <div class="search-bar">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input
              type="text"
              autocomplete="off"
              placeholder="Tìm khách hàng theo họ tên, email hoặc số điện thoại…"
              [ngModel]="keyword()"
              (ngModelChange)="onKeywordChange($event)"
            />
            @if (keyword()) {
              <button
                class="search-clear"
                type="button"
                aria-label="Xóa từ khóa"
                (click)="onKeywordChange('')"
              >
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          @if (loadingUsers()) {
            <app-loading-state />
          } @else if (customers().length === 0) {
            <p class="empty-line">Không tìm thấy khách hàng phù hợp.</p>
          } @else {
            <div class="table-scroll">
              <table class="cust-table">
                <thead>
                  <tr>
                    <th class="col-check">
                      <input
                        type="checkbox"
                        aria-label="Chọn tất cả khách hàng trên trang này"
                        [checked]="allVisibleSelected()"
                        (change)="toggleSelectAllVisible()"
                      />
                    </th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Điện thoại</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of customers(); track u.id) {
                    <tr
                      [class.is-picked]="isSelected(u.id)"
                      (click)="toggleUser(u.id)"
                    >
                      <td class="col-check" (click)="$event.stopPropagation()">
                        <input
                          type="checkbox"
                          [attr.aria-label]="'Chọn ' + u.full_name"
                          [checked]="isSelected(u.id)"
                          (change)="toggleUser(u.id)"
                        />
                      </td>
                      <td class="col-name">{{ u.full_name }}</td>
                      <td class="col-code">{{ u.email }}</td>
                      <td>{{ u.phone || '—' }}</td>
                      <td>
                        <app-status-badge
                          [label]="u.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng'"
                          [tone]="u.status === 'ACTIVE' ? 'success' : 'neutral'"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (totalPages() > 1) {
              <div class="pager-wrap">
                <app-server-pager
                  [page]="page()"
                  [size]="pageSize()"
                  [totalItems]="totalItems()"
                  [totalPages]="totalPages()"
                  noun="khách hàng"
                  (pageChange)="onPageChange($event)"
                  (sizeChange)="onSizeChange($event)"
                />
              </div>
            }
          }
        </app-app-card>

        <div class="summary-bar">
          <div class="summary-bar__info">
            <mat-icon aria-hidden="true">group</mat-icon>
            <span>
              Đã chọn <strong>{{ selectedIds().length }}</strong> khách hàng
            </span>
            @if (selectedIds().length > 0) {
              <button class="clear-btn" type="button" (click)="clearSelection()">
                Bỏ chọn tất cả
              </button>
            }
          </div>

          <div class="summary-bar__acts">
            <app-app-button variant="ghost" (clicked)="goBack()">Hủy</app-app-button>
            <app-app-button
              [disabled]="selectedIds().length === 0 || submitting()"
              (clicked)="submit()"
            >
              <mat-icon>card_giftcard</mat-icon>
              {{
                submitting()
                  ? 'Đang tặng…'
                  : 'Tặng cho ' + selectedIds().length + ' khách hàng'
              }}
            </app-app-button>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .blk {
      display: block;
      margin-bottom: var(--sp-md);
    }

    .page-h {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--sp-md);
      margin-bottom: var(--sp-md);
      flex-wrap: wrap;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      margin-bottom: 6px;
    }

    .code-pill {
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-size: var(--text-caption);
      font-weight: 700;
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-alt);
      border: 1px solid var(--color-border);
      color: var(--color-ink);
    }

    .search-bar {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: var(--sp-md);
    }

    .search-bar > mat-icon {
      position: absolute;
      left: 12px;
      font-size: 19px;
      width: 19px;
      height: 19px;
      color: var(--color-ink-subtle);
      pointer-events: none;
    }

    .search-bar input {
      width: 100%;
      height: 42px;
      padding: 0 36px 0 38px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-small);
      outline: none;
    }

    .search-bar input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }

    .search-clear {
      position: absolute;
      right: 8px;
      border: 0;
      background: transparent;
      color: var(--color-ink-muted);
      cursor: pointer;
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
    }

    .search-clear:hover {
      background: var(--color-border-soft);
      color: var(--color-ink);
    }

    .table-scroll {
      overflow-x: auto;
    }

    .cust-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-small);
    }

    .cust-table th,
    .cust-table td {
      padding: 11px 12px;
      text-align: left;
      border-bottom: 1px solid var(--color-border-soft);
    }

    .cust-table th {
      font-size: var(--text-caption);
      font-weight: 700;
      color: var(--color-ink-muted);
      background: var(--color-surface-alt);
    }

    .cust-table tbody tr {
      cursor: pointer;
      transition: background-color var(--dur-fast) var(--ease);
    }

    .cust-table tbody tr:hover {
      background: var(--color-surface-alt);
    }

    .cust-table tbody tr.is-picked {
      background: var(--color-primary-soft);
    }

    .col-check {
      width: 44px;
      text-align: center;
    }

    .col-check input {
      width: 16px;
      height: 16px;
      accent-color: var(--color-primary);
      cursor: pointer;
    }

    .col-name {
      font-weight: 600;
      color: var(--color-ink);
    }

    .col-code {
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-size: var(--text-caption);
    }

    .pager-wrap {
      margin-top: var(--sp-md);
      border-top: 1px solid var(--color-border-soft);
      padding-top: var(--sp-sm);
    }

    .summary-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      flex-wrap: wrap;
      padding: var(--sp-md);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }

    .summary-bar__info {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .summary-bar__info mat-icon {
      color: var(--color-primary);
    }

    .clear-btn {
      border: 0;
      background: transparent;
      color: var(--color-danger);
      font-family: var(--font-body);
      font-size: var(--text-caption);
      font-weight: 600;
      cursor: pointer;
      padding: 4px 6px;
    }

    .clear-btn:hover {
      text-decoration: underline;
    }

    .summary-bar__acts {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
    }
  `,
})
export class VoucherAssign {
  private readonly voucherService = inject(VoucherService);
  private readonly userService = inject(UserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly money = new Intl.NumberFormat('vi-VN');

  protected readonly voucherId = signal<number>(0);
  protected readonly voucher = signal<Voucher | null>(null);
  protected readonly loadingVoucher = signal(true);

  protected readonly customers = signal<AdminUser[]>([]);
  protected readonly loadingUsers = signal(false);
  protected readonly keyword = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(20);
  protected readonly totalItems = signal(0);

  protected readonly selectedIds = signal<number[]>([]);
  protected readonly submitting = signal(false);

  private readonly search$ = new Subject<string>();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalItems() / this.pageSize())),
  );

  protected readonly allVisibleSelected = computed(() => {
    const visible = this.customers();
    if (visible.length === 0) {
      return false;
    }
    const picked = new Set(this.selectedIds());
    return visible.every((u) => picked.has(u.id));
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/admin/vouchers']);
      return;
    }
    this.voucherId.set(id);

    this.search$
      .pipe(
        debounceTime(300),
        tap(() => {
          this.page.set(1);
          this.loadingUsers.set(true);
        }),
        switchMap((kw) => this.fetchCustomersObs(kw, 1)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loadingUsers.set(false);
        this.customers.set(res?.data?.items ?? []);
        this.totalItems.set(res?.data?.pagination?.total_items ?? 0);
      });

    this.loadVoucher(id);
    this.loadCustomers('', 1);
  }

  private loadVoucher(id: number): void {
    this.loadingVoucher.set(true);
    this.voucherService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.voucher.set(res.data);
          this.loadingVoucher.set(false);
        },
        error: (err: Error) => {
          this.snackBar.open(err.message || 'Không tải được thông tin voucher', 'Đóng', {
            duration: 3000,
          });
          this.loadingVoucher.set(false);
          this.router.navigate(['/admin/vouchers']);
        },
      });
  }

  private fetchCustomersObs(keyword: string, page: number) {
    return this.userService
      .list({
        role: 'CUSTOMER',
        keyword: keyword.trim(),
        page,
        size: this.pageSize(),
      })
      .pipe(catchError(() => of(null)));
  }

  private loadCustomers(keyword: string, page: number): void {
    this.loadingUsers.set(true);
    this.fetchCustomersObs(keyword, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.loadingUsers.set(false);
        this.customers.set(res?.data?.items ?? []);
        this.totalItems.set(res?.data?.pagination?.total_items ?? 0);
      });
  }

  protected onKeywordChange(value: string): void {
    this.keyword.set(value);
    this.search$.next(value);
  }

  protected onPageChange(nextPage: number): void {
    this.page.set(nextPage);
    this.loadCustomers(this.keyword(), nextPage);
  }

  protected onSizeChange(nextSize: number): void {
    this.pageSize.set(nextSize);
    this.page.set(1);
    this.loadCustomers(this.keyword(), 1);
  }

  protected isSelected(userId: number): boolean {
    return this.selectedIds().includes(userId);
  }

  protected toggleUser(userId: number): void {
    const current = this.selectedIds();
    this.selectedIds.set(
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  protected toggleSelectAllVisible(): void {
    const visibleIds = this.customers().map((u) => u.id);
    if (this.allVisibleSelected()) {
      const drop = new Set(visibleIds);
      this.selectedIds.set(this.selectedIds().filter((id) => !drop.has(id)));
    } else {
      const merged = new Set([...this.selectedIds(), ...visibleIds]);
      this.selectedIds.set(Array.from(merged));
    }
  }

  protected clearSelection(): void {
    this.selectedIds.set([]);
  }

  protected submit(): void {
    const ids = this.selectedIds();
    const vid = this.voucherId();
    if (ids.length === 0 || !vid) {
      return;
    }

    this.submitting.set(true);
    this.voucherService
      .assign(vid, ids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          const count = res.data?.assigned_count ?? ids.length;
          this.snackBar.open(
            res.message || `Đã tặng voucher cho ${count} khách hàng`,
            'Đóng',
            { duration: 3500 },
          );
          this.router.navigate(['/admin/vouchers', vid]);
        },
        error: (err: Error) => {
          this.submitting.set(false);
          this.snackBar.open(err.message || 'Tặng voucher thất bại', 'Đóng', {
            duration: 3500,
          });
        },
      });
  }

  protected goBack(): void {
    this.router.navigate(['/admin/vouchers', this.voucherId()]);
  }

  protected formatDiscount(v: Voucher): string {
    return v.discount_type === 'PERCENT'
      ? `${v.discount_value}%`
      : `${VoucherAssign.money.format(v.discount_value)}đ`;
  }
}
