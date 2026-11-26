import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { EmptyState } from '@shared/components/empty-state/empty-state';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  linkLabel?: string;
  linkTo?: string;
  openByDefault?: boolean;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'hold-time',
    category: 'Đặt vé & thanh toán',
    question: 'Chỗ được giữ bao lâu sau khi đặt?',
    answer:
      '15 phút kể từ lúc tạo đơn giữ chỗ. Quá hạn mà chưa thanh toán, đơn tự chuyển sang trạng thái Hết hạn, ghế trả lại kho và bạn không bị trừ tiền.',
    openByDefault: true,
  },
  {
    id: 'ticket-content',
    category: 'Vé & hành trình',
    question: 'Một vé máy bay điện tử gồm những gì?',
    answer:
      'Vé điện tử bao gồm mã đặt chỗ (PNR), thông tin chuyến bay, hành khách, hạng vé kèm quyền lợi hành lý, số ghế (nếu đã chọn) và chi tiết giá vé. Đơn khứ hồi gồm hai chặng trên cùng một mã đơn.',
    linkLabel: 'Xem hướng dẫn đặt vé',
    linkTo: '/booking-guide',
  },
  {
    id: 'mixed-cabin',
    category: 'Vé & hành trình',
    question: 'Tôi có thể chọn hạng vé khác nhau cho hai chiều không?',
    answer:
      'Có. Mỗi chặng bay được chọn hạng vé độc lập — ví dụ chiều đi Phổ thông Tiêu chuẩn, chiều về Thương gia. Hai chặng không bị ràng buộc cùng một hạng.',
  },
  {
    id: 'refund-rate',
    category: 'Hoàn & huỷ vé',
    question: 'Huỷ vé được hoàn bao nhiêu phần trăm?',
    answer:
      'Mức hoàn phụ thuộc vào hạng vé bạn mua: Phổ thông hoàn 0–90%, Phổ thông đặc biệt hoàn 85–95%, Thương gia hoàn 90–100% giá vé khi huỷ trước giờ bay tối thiểu 24 giờ.',
    linkLabel: 'Xem bảng Chính sách hoàn vé',
    linkTo: '/refund-policy',
  },
  {
    id: 'paid-no-ticket',
    category: 'Đặt vé & thanh toán',
    question: 'Thanh toán xong mà chưa nhận được vé điện tử?',
    answer:
      'Vé điện tử được gửi về email liên hệ ngay khi cổng thanh toán xác nhận. Nếu tài khoản đã trừ tiền nhưng chưa thấy vé, đừng thanh toán lại — hãy tra cứu theo mã đơn hoặc gọi hotline 1900 1234.',
    linkLabel: 'Tra cứu đặt chỗ ngay',
    linkTo: '/lookup',
  },
  {
    id: 'checkin-time',
    category: 'Hành lý & sân bay',
    question: 'Cần có mặt ở sân bay trước giờ khởi hành bao lâu?',
    answer:
      'Với chuyến bay nội địa, hành khách nên có mặt trước ít nhất 60 phút (90 phút vào dịp cao điểm). Quầy làm thủ tục thường đóng 40 phút trước giờ cất cánh.',
  },
];

/**
 * Trung tâm trợ giúp & Câu hỏi thường gặp (FAQ accordion) —
 * bám sát `docs/design/prototype/customer.html` (màn `help`, W-RT-23).
 */
@Component({
  selector: 'app-public-help',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatIconModule, EmptyState],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Trung tâm trợ giúp</span>
      </nav>

      <div class="help-narrow">
        <div class="page-h page-h--split">
          <div>
            <h1>Trung tâm trợ giúp</h1>
            <p>Câu trả lời nhanh cho các câu hỏi thường gặp khi đặt vé nội địa tại VinaFly.</p>
          </div>
          <a class="btn-sec" routerLink="/help-contact">
            <mat-icon aria-hidden="true">support_agent</mat-icon>
            Liên hệ hỗ trợ
          </a>
        </div>

        <div class="card search-card">
          <div class="search-row">
            <input
              type="search"
              [ngModel]="keyword()"
              (ngModelChange)="keyword.set($event)"
              placeholder="Tìm câu hỏi — ví dụ: hoàn vé, hành lý, thanh toán, giữ chỗ..."
              aria-label="Tìm câu hỏi thường gặp"
            />
            @if (keyword()) {
              <button class="btn-ghost" type="button" (click)="keyword.set('')">Xoá</button>
            }
          </div>
        </div>

        <div class="chan-grid">
          <a class="card chan-card" routerLink="/booking-guide">
            <span class="chan-ic"><mat-icon>confirmation_number</mat-icon></span>
            <b>Đặt vé &amp; thanh toán</b>
            <span>Hướng dẫn 4 bước · giữ chỗ 15 phút · VNPay &amp; VietQR</span>
          </a>
          <a class="card chan-card" routerLink="/refund-policy">
            <span class="chan-ic"><mat-icon>policy</mat-icon></span>
            <b>Chính sách hoàn vé</b>
            <span>Tỉ lệ hoàn theo 7 hạng vé · mốc 24 giờ · phí không hoàn</span>
          </a>
          <a class="card chan-card" routerLink="/help-contact">
            <span class="chan-ic"><mat-icon>headset_mic</mat-icon></span>
            <b>Liên hệ trực tiếp</b>
            <span>Hotline 1900 1234 · email hỗ trợ · gửi phiếu yêu cầu</span>
          </a>
        </div>

        <h2 class="sec-heading">Câu hỏi thường gặp</h2>

        @if (filteredFaqs().length === 0) {
          <div class="card empty-wrap">
            <app-empty-state
              icon="help_outline"
              message="Không tìm thấy câu hỏi phù hợp"
              hint="Thử từ khóa khác hoặc gửi yêu cầu trực tiếp tới đội ngũ hỗ trợ"
            />
          </div>
        } @else {
          <div class="faq-list">
            @for (item of filteredFaqs(); track item.id) {
              <details [open]="item.openByDefault || !!keyword().trim()">
                <summary>{{ item.question }}</summary>
                <div class="faq-answer">
                  <p>{{ item.answer }}</p>
                  @if (item.linkTo && item.linkLabel) {
                    <a class="faq-link" [routerLink]="item.linkTo">
                      {{ item.linkLabel }}
                      <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                    </a>
                  }
                </div>
              </details>
            }
          </div>
        }

        <div class="callout-neutral">
          <b>Chưa tìm được câu trả lời?</b>
          Gọi <a href="tel:19001234">1900 1234</a> (06:00 – 22:00 hằng ngày), gửi email tới
          <a href="mailto:hotro@vinafly.vn">hotro&#64;vinafly.vn</a> hoặc
          <a routerLink="/help-contact">gửi yêu cầu hỗ trợ trực tuyến</a>.
        </div>
      </div>
    </div>
  `,
  styles: `
    .help-narrow {
      max-width: 780px;
      margin: 0 auto;
    }

    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .btn-sec {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px var(--sp-lg);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-ink);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition:
        border-color var(--dur-fast) var(--ease),
        color var(--dur-fast) var(--ease);
    }

    .btn-sec:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .btn-sec mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .search-card {
      padding: var(--sp-lg);
    }

    .search-row {
      display: flex;
      gap: var(--sp-sm);
    }

    .search-row input {
      flex: 1 1 auto;
      min-width: 0;
      height: 44px;
      padding: 0 14px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-body);
      outline: none;
    }

    .search-row input:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }

    .btn-ghost {
      height: 44px;
      padding: 0 var(--sp-lg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-family: var(--font-body);
      font-size: var(--text-small);
      font-weight: 600;
      cursor: pointer;
    }

    .chan-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-lg);
      margin-top: var(--sp-lg);
    }

    .chan-card {
      display: flex;
      flex-direction: column;
      padding: var(--sp-lg);
      text-decoration: none;
      color: inherit;
      transition:
        border-color var(--dur-fast) var(--ease),
        transform var(--dur-fast) var(--ease);
    }

    .chan-card:hover {
      border-color: var(--color-primary-bright);
      transform: translateY(-2px);
    }

    .chan-ic {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      margin-bottom: var(--sp-sm);
    }

    .chan-card b {
      font-family: var(--font-heading);
      font-size: var(--text-body);
      color: var(--color-ink);
      margin-bottom: 4px;
    }

    .chan-card span:last-child {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      line-height: 1.55;
    }

    .sec-heading {
      font-size: var(--text-h2);
      margin: var(--sp-2xl) 0 var(--sp-md);
    }

    .faq-list {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      overflow: hidden;
    }

    .faq-list details {
      border-bottom: 1px solid var(--color-border-soft);
    }

    .faq-list details:last-child {
      border-bottom: 0;
    }

    .faq-list summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-lg);
      padding: var(--sp-lg);
      font-weight: 600;
      font-size: var(--text-body);
      color: var(--color-ink);
      cursor: pointer;
      list-style: none;
    }

    .faq-list summary::-webkit-details-marker {
      display: none;
    }

    .faq-list summary::after {
      content: '+';
      font-size: var(--text-h2);
      font-weight: 400;
      color: var(--color-ink-muted);
      line-height: 1;
      flex-shrink: 0;
    }

    .faq-list summary:hover {
      background: var(--color-surface-alt);
    }

    .faq-list details[open] summary {
      color: var(--color-primary);
      background: transparent;
    }

    .faq-list details[open] summary::after {
      content: '−';
      color: var(--color-primary);
    }

    .faq-answer {
      padding: 0 var(--sp-lg) var(--sp-lg);
      color: var(--color-ink-muted);
      font-size: var(--text-small);
      line-height: 1.75;
    }

    .faq-answer p {
      margin: 0;
    }

    .faq-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: var(--sp-sm);
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
    }

    .faq-link:hover {
      text-decoration: underline;
    }

    .faq-link mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .empty-wrap {
      padding: var(--sp-lg);
    }

    .callout-neutral {
      margin-top: var(--sp-xl);
      padding: var(--sp-lg);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
      font-size: var(--text-small);
      line-height: 1.7;
    }

    .callout-neutral b {
      color: var(--color-ink);
    }

    @media (max-width: 760px) {
      .chan-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PublicHelpPage {
  protected readonly keyword = signal('');

  protected readonly filteredFaqs = computed(() => {
    const q = this.keyword().trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  });
}
