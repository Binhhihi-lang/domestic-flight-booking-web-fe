import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { FareRule } from '@core/models/fare-baggage.model';
import { SkeletonBlock } from '@shared/ui/skeleton-block/skeleton-block';

interface RefundRuleRow {
  name: string;
  code: string;
  minHours: string;
  rateLabel: string;
  tone: 'danger' | 'primary' | 'success';
}

/** Bảng 7 hạng vé chuẩn V16/V17 + 2 trường hợp ngoại lệ (dùng làm fallback khi API public chưa có dữ liệu). */
const FALLBACK_REFUND_ROWS: RefundRuleRow[] = [
  {
    name: 'Phổ thông Tiết kiệm',
    code: '<HÃNG>_ECON_SAVER',
    minHours: 'Không áp dụng',
    rateLabel: 'Không hoàn (0%)',
    tone: 'danger',
  },
  {
    name: 'Phổ thông Tiêu chuẩn',
    code: '<HÃNG>_ECON_STANDARD',
    minHours: 'Trước 24 giờ',
    rateLabel: 'Hoàn 80% giá vé',
    tone: 'primary',
  },
  {
    name: 'Phổ thông Linh hoạt',
    code: '<HÃNG>_ECON_FLEX',
    minHours: 'Trước 24 giờ',
    rateLabel: 'Hoàn 90% giá vé',
    tone: 'success',
  },
  {
    name: 'Phổ thông đặc biệt Tiêu chuẩn',
    code: '<HÃNG>_PREM_ECO_STANDARD',
    minHours: 'Trước 24 giờ',
    rateLabel: 'Hoàn 85% giá vé',
    tone: 'primary',
  },
  {
    name: 'Phổ thông đặc biệt Linh hoạt',
    code: '<HÃNG>_PREM_ECO_FLEX',
    minHours: 'Trước 24 giờ',
    rateLabel: 'Hoàn 95% giá vé',
    tone: 'success',
  },
  {
    name: 'Thương gia Tiêu chuẩn',
    code: '<HÃNG>_BIZ_STANDARD',
    minHours: 'Trước 24 giờ',
    rateLabel: 'Hoàn 90% giá vé',
    tone: 'success',
  },
  {
    name: 'Thương gia Linh hoạt',
    code: '<HÃNG>_BIZ_FLEX',
    minHours: 'Trước 24 giờ',
    rateLabel: 'Hoàn 100% giá vé',
    tone: 'success',
  },
];

/**
 * Chính sách hoàn vé — gọi `GET /api/public/fare-rules` (có fallback bảng 7 hạng vé chuẩn V16/V17),
 * bám sát `docs/design/prototype/customer.html` (màn `refund-policy`, W-RT-26).
 */
@Component({
  selector: 'app-public-refund-policy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, SkeletonBlock],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <a routerLink="/help">Hỗ trợ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Chính sách hoàn vé</span>
      </nav>

      <article class="doc">
        <div class="doc__meta">
          <span class="badge-warning">Chính sách</span>
          <span>Áp dụng cho toàn bộ vé nội địa mua trên VinaFly</span>
        </div>

        <h1>Chính sách hoàn vé</h1>

        <div class="callout callout--primary">
          <b>Điều quan trọng nhất:</b> mức hoàn phụ thuộc vào <b>hạng vé</b> bạn chọn khi mua.
          Phổ thông hoàn 0–90%, Phổ thông đặc biệt hoàn 85–95%, Thương gia hoàn 90–100% giá vé khi
          huỷ trước giờ khởi hành ít nhất 24 giờ.
        </div>

        <h2>1. Khi nào được hoàn vé</h2>
        <p>
          Vé đã xác nhận và đã thanh toán được áp dụng mức hoàn theo quy định hạng vé khi yêu cầu
          huỷ thực hiện trước giờ khởi hành ít nhất 24 giờ. Vé hạng tiết kiệm hoặc vé trong chương
          trình khuyến mãi đặc biệt có thể không được hoàn — điều kiện luôn hiển thị rõ khi chọn
          hạng vé.
        </p>

        <h2>2. Mức hoàn theo hạng vé</h2>

        @if (loading()) {
          <div class="skeleton-box">
            <app-skeleton-block height="42px" />
            <app-skeleton-block height="38px" />
            <app-skeleton-block height="38px" />
            <app-skeleton-block height="38px" />
          </div>
        } @else {
          <div class="table-wrap">
            <table class="policy-table">
              <thead>
                <tr>
                  <th>Hạng vé</th>
                  <th>Mã hạng</th>
                  <th>Điều kiện thời gian</th>
                  <th class="num">Mức hoàn</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.code + row.name) {
                  <tr>
                    <td><b>{{ row.name }}</b></td>
                    <td class="mono">{{ row.code }}</td>
                    <td>{{ row.minHours }}</td>
                    <td class="num">
                      <span class="pill" [class]="'pill--' + row.tone">{{ row.rateLabel }}</span>
                    </td>
                  </tr>
                }
                <tr>
                  <td>Huỷ trong vòng 24 giờ trước giờ bay</td>
                  <td class="muted">—</td>
                  <td>Dưới 24 giờ</td>
                  <td class="num"><span class="pill pill--danger">Không hoàn</span></td>
                </tr>
                <tr>
                  <td>Đã bay / không có mặt (No-show)</td>
                  <td class="muted">—</td>
                  <td>Sau giờ đóng quầy</td>
                  <td class="num"><span class="pill pill--danger">Không hoàn</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        }

        <h2>3. Các khoản phí không hoàn</h2>
        <ul>
          <li>Phụ thu chọn ghế ngồi đã thanh toán không được hoàn.</li>
          <li>Gói hành lý ký gửi mua thêm đã thanh toán không được hoàn.</li>
          <li>Thuế và phí sân bay nằm trong cấu phần giá vé sẽ hoàn theo đúng tỉ lệ của hạng vé.</li>
        </ul>

        <h2>4. Quy trình xử lý hoàn tiền</h2>
        <p>
          VinaFly không tự động hoàn tiền trực tuyến về tài khoản ngân hàng. Sau khi bạn xác nhận
          huỷ đơn trên hệ thống, vui lòng liên hệ tổng đài <b>1900 1234</b> hoặc đại lý hỗ trợ để
          đối soát và hoàn tiền theo chính sách hạng vé; thời gian nhận tiền phụ thuộc ngân hàng
          phát hành thẻ.
        </p>
        <p>
          Lưu ý: hệ thống hỗ trợ huỷ trọn đơn đặt chỗ, không tách lẻ một chặng trong đơn khứ hồi.
        </p>

        <div class="callout callout--warning">
          <b>Cần huỷ vé?</b> Truy cập <a routerLink="/account">Vé của tôi</a> → chọn đơn đặt chỗ →
          bấm <b>Huỷ đặt chỗ</b> để xem mức hoàn ước tính trước khi xác nhận.
        </div>

        <p class="doc__links">
          Xem thêm:
          <a routerLink="/booking-guide">Hướng dẫn đặt vé</a> ·
          <a routerLink="/help">Câu hỏi thường gặp</a> ·
          <a routerLink="/help-contact">Trung tâm trợ giúp</a>
        </p>
      </article>
    </div>
  `,
  styles: `
    .doc {
      max-width: 860px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--sp-2xl);
      box-shadow: var(--shadow-sm);
    }

    .doc__meta {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      flex-wrap: wrap;
      font-size: var(--text-small);
      color: var(--color-ink-subtle);
      margin-bottom: var(--sp-md);
    }

    .badge-warning {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .doc h1 {
      font-size: var(--text-h1);
      font-weight: 700;
    }

    .doc h2 {
      font-size: var(--text-h2);
      margin: var(--sp-2xl) 0 var(--sp-sm);
    }

    .doc p,
    .doc li {
      color: var(--color-ink-muted);
      line-height: 1.75;
      font-size: var(--text-body);
    }

    .doc ul {
      margin: var(--sp-sm) 0 0;
      padding-left: var(--sp-xl);
      list-style: disc;
    }

    .doc li {
      margin-bottom: var(--sp-xs);
    }

    .doc b {
      color: var(--color-ink);
    }

    .callout {
      margin-top: var(--sp-lg);
      padding: var(--sp-lg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      font-size: var(--text-small);
      line-height: 1.7;
    }

    .callout--primary {
      border-left: 4px solid var(--color-primary);
      background: var(--color-primary-soft);
      color: var(--color-on-info-soft);
    }

    .callout--warning {
      border-left: 4px solid var(--color-warning);
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
    }

    .callout b {
      color: inherit;
    }

    .skeleton-box {
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
      margin-top: var(--sp-md);
    }

    .table-wrap {
      margin-top: var(--sp-md);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      overflow-x: auto;
    }

    .policy-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 560px;
      font-size: var(--text-small);
    }

    .policy-table th,
    .policy-table td {
      padding: var(--sp-md) var(--sp-lg);
      border-bottom: 1px solid var(--color-border-soft);
      text-align: left;
      color: var(--color-ink);
    }

    .policy-table thead th {
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-size: var(--text-caption);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .policy-table tbody tr:last-child td {
      border-bottom: 0;
    }

    .policy-table .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .muted {
      color: var(--color-ink-subtle);
    }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .pill--danger {
      background: var(--color-danger-soft);
      color: var(--color-on-danger-soft);
    }

    .pill--primary {
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }

    .pill--success {
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
    }

    .doc__links {
      margin-top: var(--sp-xl);
      padding-top: var(--sp-lg);
      border-top: 1px solid var(--color-border-soft);
      font-size: var(--text-small);
    }

    @media (max-width: 640px) {
      .doc {
        padding: var(--sp-lg);
      }
    }
  `,
})
export class PublicRefundPolicyPage implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(true);
  protected readonly rows = signal<RefundRuleRow[]>(FALLBACK_REFUND_ROWS);

  ngOnInit(): void {
    this.http
      .get<ApiResponse<PageData<FareRule>>>(`${environment.apiBaseUrl}/public/fare-rules`, {
        params: { page: 1, size: 50 },
      })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        const items = res?.data?.items;
        if (items && items.length > 0) {
          this.rows.set(
            items
              .filter((r) => r.status === 'ACTIVE')
              .map((r) => ({
                name: r.fare_class_name,
                code: r.fare_class_code,
                minHours: r.is_refundable
                  ? `Trước ${r.refund_min_hours_before_departure} giờ`
                  : 'Không áp dụng',
                rateLabel:
                  r.is_refundable && r.refund_percent > 0
                    ? `Hoàn ${r.refund_percent}% giá vé`
                    : 'Không hoàn (0%)',
                tone:
                  !r.is_refundable || r.refund_percent <= 0
                    ? 'danger'
                    : r.refund_percent >= 90
                      ? 'success'
                      : 'primary',
              })),
          );
        }
        this.loading.set(false);
      });
  }
}
