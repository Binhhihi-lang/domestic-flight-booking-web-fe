import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core/services/auth.service';

/**
 * Liên hệ trung tâm trợ giúp — bám sát `docs/design/prototype/customer.html`
 * (màn `help-contact`, W-RT-27).
 */
@Component({
  selector: 'app-public-help-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <a routerLink="/help">Hỗ trợ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Trung tâm trợ giúp</span>
      </nav>

      <div class="page-h page-h--split">
        <div>
          <h1>Trung tâm trợ giúp</h1>
          <p>
            Chọn cách liên hệ phù hợp — chúng tôi phản hồi trong vòng 2 giờ trong khung giờ làm
            việc.
          </p>
        </div>
        <a class="btn-sec" routerLink="/help">Câu hỏi thường gặp</a>
      </div>

      <div class="chan-grid">
        <a class="card chan-card" href="tel:19001234">
          <span class="chan-ic"><mat-icon>call</mat-icon></span>
          <b>1900 1234</b>
          <span>Hằng ngày 06:00 – 22:00<br />Miễn phí cước gọi nội địa</span>
        </a>
        <a class="card chan-card" href="mailto:hotro@vinafly.vn">
          <span class="chan-ic"><mat-icon>mail</mat-icon></span>
          <b>hotro&#64;vinafly.vn</b>
          <span>Phản hồi trong 24 giờ<br />Gửi kèm mã đặt chỗ nếu có</span>
        </a>
        <div class="card chan-card">
          <span class="chan-ic"><mat-icon>place</mat-icon></span>
          <b>Hoàn Kiếm, Hà Nội</b>
          <span>Thứ 2 – Thứ 6, 08:00 – 17:30<br />Vui lòng đặt lịch hẹn trước</span>
        </div>
      </div>

      <div class="side-layout">
        <div class="card">
          <div class="card-head">
            <h2>Gửi yêu cầu hỗ trợ</h2>
            <span class="head-note">Điền càng đủ thông tin, chúng tôi xử lý càng nhanh</span>
          </div>

          <div class="card-body">
            @if (submittedCode(); as ticketCode) {
              <div class="success-box" role="status">
                <div class="success-ic"><mat-icon>check_circle</mat-icon></div>
                <h3>Đã tiếp nhận yêu cầu hỗ trợ</h3>
                <p>
                  Mã tiếp nhận của bạn là <b class="tabular">{{ ticketCode }}</b>. Đội ngũ VinaFly
                  sẽ phản hồi qua email <b>{{ form.controls.email.value }}</b> trong vòng 24 giờ.
                </p>
                <button class="btn-sec" type="button" (click)="resetForm()">Gửi yêu cầu khác</button>
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="submit()">
                <div class="form-grid">
                  <div class="field" [class.err]="showError('fullName')">
                    <label for="hc-name">Họ và tên <span class="req">*</span></label>
                    <input id="hc-name" formControlName="fullName" placeholder="Nguyễn Văn An" />
                    @if (showError('fullName')) {
                      <span class="hint">Vui lòng nhập họ và tên</span>
                    }
                  </div>

                  <div class="field" [class.err]="showError('phone')">
                    <label for="hc-phone">Số điện thoại <span class="req">*</span></label>
                    <input id="hc-phone" formControlName="phone" placeholder="0901 234 567" />
                    @if (showError('phone')) {
                      <span class="hint">Vui lòng nhập số điện thoại</span>
                    }
                  </div>

                  <div class="field" [class.err]="showError('email')">
                    <label for="hc-email">Email <span class="req">*</span></label>
                    <input
                      id="hc-email"
                      type="email"
                      formControlName="email"
                      placeholder="ten@example.com"
                    />
                    @if (showError('email')) {
                      <span class="hint">Email không đúng định dạng</span>
                    }
                  </div>

                  <div class="field">
                    <label for="hc-pnr">Mã đặt chỗ / mã đơn (nếu có)</label>
                    <input id="hc-pnr" formControlName="bookingCode" placeholder="VD: X7K2MP" />
                  </div>

                  <div class="field field--full">
                    <label for="hc-topic">Vấn đề cần hỗ trợ <span class="req">*</span></label>
                    <select id="hc-topic" formControlName="topic">
                      <option value="Thanh toán">Thanh toán</option>
                      <option value="Đặt vé & giữ chỗ">Đặt vé &amp; giữ chỗ</option>
                      <option value="Vé điện tử & mã đặt chỗ">Vé điện tử &amp; mã đặt chỗ</option>
                      <option value="Hành lý">Hành lý</option>
                      <option value="Huỷ vé & hoàn tiền">Huỷ vé &amp; hoàn tiền</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div class="field field--full" [class.err]="showError('message')">
                    <label for="hc-msg">Nội dung <span class="req">*</span></label>
                    <textarea
                      id="hc-msg"
                      rows="4"
                      formControlName="message"
                      placeholder="Mô tả chi tiết vấn đề bạn gặp phải…"
                    ></textarea>
                    @if (showError('message')) {
                      <span class="hint">Vui lòng mô tả ít nhất 10 ký tự</span>
                    } @else {
                      <span class="hint">Kèm mã đơn và thời điểm xảy ra để được xử lý nhanh hơn.</span>
                    }
                  </div>
                </div>

                <div class="form-foot">
                  <span class="foot-note">Chúng tôi phản hồi qua email trong 24 giờ</span>
                  <button class="btn-primary" type="submit">Gửi yêu cầu</button>
                </div>
              </form>
            }
          </div>
        </div>

        <aside class="side-aside">
          <div class="card">
            <div class="card-head">
              <h2>Tự xử lý nhanh hơn</h2>
            </div>
            <div class="card-body quick-list">
              <a class="quick-row" routerLink="/lookup">
                <div>
                  <b>Tra cứu đặt chỗ</b>
                  <span>Xem trạng thái đơn, mã PNR &amp; vé điện tử</span>
                </div>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
              <a class="quick-row" routerLink="/account">
                <div>
                  <b>Huỷ vé / xem đơn</b>
                  <span>Vé của tôi → chọn đơn → Huỷ đặt chỗ</span>
                </div>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
              <a class="quick-row" routerLink="/account/security">
                <div>
                  <b>Đổi mật khẩu</b>
                  <span>Cập nhật bảo mật tài khoản</span>
                </div>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
              <a class="quick-row" routerLink="/refund-policy">
                <div>
                  <b>Chính sách hoàn vé</b>
                  <span>Xem mức hoàn tiền theo từng hạng vé</span>
                </div>
                <mat-icon aria-hidden="true">chevron_right</mat-icon>
              </a>
              <a class="btn-ghost-block" routerLink="/help">Xem câu hỏi thường gặp</a>
            </div>
          </div>

          <div class="urgent-note">
            <mat-icon aria-hidden="true">priority_high</mat-icon>
            <div>
              <b>Khẩn cấp?</b>
              <p>
                Chuyến bay khởi hành trong vòng 4 giờ tới, hãy gọi
                <a href="tel:19001234">hotline 1900 1234</a> để được hỗ trợ ngay thay vì gửi email.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  `,
  styles: `
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-sm);
      flex-wrap: wrap;
      padding: var(--sp-lg) var(--sp-xl);
      border-bottom: 1px solid var(--color-border-soft);
    }

    .card-head h2 {
      font-size: var(--text-h3);
      margin: 0;
    }

    .head-note {
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .card-body {
      padding: var(--sp-xl);
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
      cursor: pointer;
    }

    .btn-sec:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }

    .chan-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--sp-lg);
    }

    .chan-card {
      display: flex;
      flex-direction: column;
      padding: var(--sp-lg);
      text-decoration: none;
      color: inherit;
    }

    a.chan-card:hover {
      border-color: var(--color-primary-bright);
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
      font-size: var(--text-h3);
      color: var(--color-ink);
      margin-bottom: 4px;
    }

    .chan-card span:last-child {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      line-height: 1.6;
    }

    .side-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: var(--sp-xl);
      align-items: start;
      margin-top: var(--sp-2xl);
    }

    .side-aside {
      display: flex;
      flex-direction: column;
      gap: var(--sp-lg);
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-lg);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .field--full {
      grid-column: 1 / -1;
    }

    .field label {
      font-size: var(--text-small);
      font-weight: 600;
      color: var(--color-ink);
    }

    .req {
      color: var(--color-danger);
    }

    .field input,
    .field select,
    .field textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1.5px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-ink);
      font-family: var(--font-body);
      font-size: var(--text-body);
      outline: none;
    }

    .field input:focus,
    .field select:focus,
    .field textarea:focus {
      border-color: var(--color-primary-bright);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }

    .field.err input,
    .field.err textarea {
      border-color: var(--color-danger);
    }

    .hint {
      font-size: var(--text-caption);
      color: var(--color-ink-subtle);
    }

    .field.err .hint {
      color: var(--color-danger);
    }

    .form-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      flex-wrap: wrap;
      margin-top: var(--sp-lg);
    }

    .foot-note {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    .btn-primary {
      border: 0;
      border-radius: var(--radius);
      padding: 11px var(--sp-xl);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-family: var(--font-body);
      font-size: var(--text-body);
      font-weight: 600;
      cursor: pointer;
    }

    .btn-primary:hover {
      background: var(--color-primary-hover);
    }

    .success-box {
      text-align: center;
      padding: var(--sp-xl) var(--sp-md);
    }

    .success-ic {
      display: inline-grid;
      place-items: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--color-success-soft);
      color: var(--color-on-success-soft);
      margin-bottom: var(--sp-md);
    }

    .success-ic mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .success-box h3 {
      font-size: var(--text-h2);
      margin-bottom: var(--sp-sm);
    }

    .success-box p {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
      margin: 0 auto var(--sp-lg);
      max-width: 44ch;
      line-height: 1.65;
    }

    .quick-list {
      display: flex;
      flex-direction: column;
      gap: var(--sp-sm);
    }

    .quick-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-md);
      padding: var(--sp-md);
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius);
      background: var(--color-surface-alt);
      text-decoration: none;
      color: inherit;
      transition: border-color var(--dur-fast) var(--ease);
    }

    .quick-row:hover {
      border-color: var(--color-primary-bright);
    }

    .quick-row b {
      display: block;
      font-size: var(--text-small);
      color: var(--color-ink);
    }

    .quick-row span {
      display: block;
      font-size: var(--text-caption);
      color: var(--color-ink-muted);
    }

    .quick-row mat-icon {
      color: var(--color-ink-subtle);
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .btn-ghost-block {
      display: flex;
      justify-content: center;
      padding: 10px var(--sp-md);
      margin-top: var(--sp-xs);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      color: var(--color-ink-muted);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
    }

    .btn-ghost-block:hover {
      background: var(--color-surface-alt);
      color: var(--color-ink);
    }

    .urgent-note {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-md);
      padding: var(--sp-lg);
      border-radius: var(--radius-lg);
      background: var(--color-warning-soft);
      color: var(--color-on-warning-soft);
      border: 1px solid var(--color-warning);
      font-size: var(--text-small);
      line-height: 1.6;
    }

    .urgent-note p {
      margin: 4px 0 0;
    }

    .urgent-note a {
      color: inherit;
      font-weight: 700;
    }

    @media (max-width: 1020px) {
      .side-layout {
        grid-template-columns: 1fr;
      }

      .chan-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }

      .card-body,
      .card-head {
        padding: var(--sp-lg);
      }
    }
  `,
})
export class PublicHelpContactPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly submittedCode = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required]],
    phone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    bookingCode: [''],
    topic: ['Thanh toán', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.form.patchValue({
        fullName: user.full_name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
      });
    }
  }

  protected showError(control: 'fullName' | 'phone' | 'email' | 'message'): boolean {
    const c = this.form.controls[control];
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const suffix = String(Math.floor(100000 + Math.random() * 900000));
    this.submittedCode.set(`HT-${suffix}`);
  }

  protected resetForm(): void {
    this.submittedCode.set(null);
    this.form.controls.message.reset('');
    this.form.controls.bookingCode.reset('');
  }
}
