import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Hướng dẫn đặt vé 4 bước — bám sát `docs/design/prototype/customer.html`
 * (màn `booking-guide`, W-RT-25).
 */
@Component({
  selector: 'app-public-booking-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="wrap">
      <nav class="crumbs" aria-label="Đường dẫn">
        <a routerLink="/">Trang chủ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <a routerLink="/help">Hỗ trợ</a>
        <mat-icon aria-hidden="true">chevron_right</mat-icon>
        <span>Hướng dẫn đặt vé</span>
      </nav>

      <article class="doc">
        <div class="doc__meta">
          <span class="badge-primary">Hướng dẫn</span>
          <span>4 bước · khoảng 3 phút</span>
        </div>

        <h1>Hướng dẫn đặt vé</h1>
        <p class="doc__lead">
          Bốn bước đơn giản, hoàn tất trong khoảng 3 phút và nhận vé điện tử ngay sau thanh toán.
        </p>

        <div class="callout callout--primary">
          <b>Chuẩn bị trước:</b> giấy tờ tuỳ thân của hành khách (tên trên vé phải trùng khớp),
          email nhận vé điện tử và phương thức thanh toán. Chỗ được giữ <b>15 phút</b> kể từ lúc
          tạo đơn.
        </div>

        <h2>Bước 1 · Tìm chuyến bay</h2>
        <p>
          Tại <a routerLink="/">Trang chủ</a>, chọn <b>Một chiều</b> hoặc <b>Khứ hồi</b>, sau đó
          chọn điểm đi, điểm đến, ngày bay và số lượng hành khách.
        </p>
        <ul>
          <li>
            Danh sách sân bay chỉ hiển thị các sân bay nội địa đang khai thác (HAN, SGN, DAD, PQC,
            CXR, DLI…).
          </li>
          <li>
            Số hành khách chia rõ <b>Người lớn</b> (từ 12 tuổi), <b>Trẻ em</b> (2–11 tuổi),
            <b>Em bé</b> (dưới 2 tuổi). Tối đa 9 khách mỗi đơn và mỗi em bé đi cùng 1 người lớn.
          </li>
        </ul>

        <h2>Bước 2 · Chọn chuyến bay và hạng vé</h2>
        <p>
          Trang <a routerLink="/flights">Kết quả tìm chuyến</a> hiển thị giá đã gồm thuế và phí
          sân bay. Bấm <b>Chọn</b> trên chuyến bay mong muốn để xem chi tiết từng hạng vé.
        </p>
        <ul>
          <li>
            Lọc nhanh theo hãng hàng không, khung giờ cất cánh, hạng dịch vụ (Phổ thông · Phổ thông
            đặc biệt · Thương gia) và khoảng giá.
          </li>
          <li>
            Mỗi hạng vé ghi rõ hạn mức hành lý xách tay, hành lý ký gửi và điều kiện hoàn vé trước
            khi bạn xác nhận.
          </li>
          <li>
            Với hành trình <b>Khứ hồi</b>, bạn có thể chọn hạng vé khác nhau cho chiều đi và chiều
            về.
          </li>
        </ul>

        <h2>Bước 3 · Chọn ghế và nhập thông tin hành khách</h2>
        <ul>
          <li>
            Chọn vị trí ghế trực quan theo sơ đồ khoang thực tế của máy bay (có thể bỏ qua nếu
            không cần chọn ghế trước).
          </li>
          <li>
            Điền đầy đủ họ tên, giới tính, ngày sinh, số giấy tờ tuỳ thân.
            <b>Tên phải trùng khớp với CCCD/Hộ chiếu</b> để làm thủ tục lên máy bay thuận lợi.
          </li>
          <li>
            Mua thêm hành lý ký gửi theo từng hành khách và từng chặng bay ngay tại bước này.
          </li>
          <li>
            Kiểm tra kỹ email &amp; số điện thoại liên hệ — vé điện tử sẽ được gửi tới địa chỉ này.
          </li>
        </ul>

        <h2>Bước 4 · Xem lại đơn, áp dụng voucher và thanh toán</h2>
        <ul>
          <li>
            Kiểm tra tổng hợp hành trình, danh sách hành khách, ghế ngồi, hành lý và chọn
            <b>Voucher từ ví</b> của bạn (nếu đủ điều kiện đơn tối thiểu).
          </li>
          <li>
            Hoàn tất thanh toán trong thời hạn đồng hồ đếm ngược <b>15 phút</b> qua cổng VNPay hoặc
            chuyển khoản VietQR. Nếu quá hạn, đơn tự chuyển Hết hạn và ghế được giải phóng tự động.
          </li>
          <li>
            Ngay sau khi thanh toán thành công, mã đặt chỗ (PNR) hiển thị tức thì và vé điện tử được
            lưu tại mục <a routerLink="/account">Vé của tôi</a>.
          </li>
        </ul>

        <div class="callout callout--neutral">
          <b>Sau khi đặt:</b> bạn có thể theo dõi trạng thái vé tại
          <a routerLink="/account">Vé của tôi</a> hoặc <a routerLink="/lookup">Tra cứu đặt chỗ</a>.
          Khi cần huỷ vé, vui lòng tham khảo trước
          <a routerLink="/refund-policy">Chính sách hoàn vé</a>.
        </div>

        <div class="doc__actions">
          <a class="btn-primary" routerLink="/flights">
            <mat-icon aria-hidden="true">search</mat-icon>
            Tìm chuyến bay ngay
          </a>
          <div class="doc__links">
            Xem thêm:
            <a routerLink="/refund-policy">Chính sách hoàn vé</a> ·
            <a routerLink="/help">Câu hỏi thường gặp</a> ·
            <a routerLink="/help-contact">Trung tâm trợ giúp</a>
          </div>
        </div>
      </article>
    </div>
  `,
  styles: `
    .doc {
      max-width: 820px;
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

    .badge-primary {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: var(--text-caption);
      font-weight: 700;
    }

    .doc h1 {
      font-size: var(--text-h1);
      font-weight: 700;
      color: var(--color-ink);
    }

    .doc__lead {
      font-size: var(--text-body);
      color: var(--color-ink-muted);
      margin: var(--sp-sm) 0 0;
      line-height: 1.65;
    }

    .doc h2 {
      font-size: var(--text-h2);
      color: var(--color-ink);
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

    .callout--primary b {
      color: inherit;
    }

    .callout--neutral {
      border-left: 4px solid var(--color-border);
      background: var(--color-surface-alt);
      color: var(--color-ink-muted);
    }

    .doc__actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-lg);
      flex-wrap: wrap;
      margin-top: var(--sp-2xl);
      padding-top: var(--sp-lg);
      border-top: 1px solid var(--color-border-soft);
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-sm);
      padding: 10px var(--sp-xl);
      border-radius: var(--radius);
      background: var(--color-primary);
      color: var(--color-on-primary);
      font-size: var(--text-small);
      font-weight: 600;
      text-decoration: none;
    }

    .btn-primary:hover {
      background: var(--color-primary-hover);
    }

    .btn-primary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .doc__links {
      font-size: var(--text-small);
      color: var(--color-ink-muted);
    }

    @media (max-width: 640px) {
      .doc {
        padding: var(--sp-lg);
      }
    }
  `,
})
export class PublicBookingGuidePage {}
