import { TestBed } from '@angular/core/testing';
import { SanitizeService } from '@core/services/sanitize.service';

/**
 * Chống XSS cho nội dung bài tin.
 *
 * Vì sao test kỹ ở đây: `content` là HTML do ADMIN nhập và được render vào trang
 * của MỌI khách. Một lỗ hổng ở đây không phải lỗi giao diện — nó là chiếm phiên
 * đăng nhập của khách. Mỗi vector dưới đây là một cách tấn công có thật.
 */
describe('SanitizeService', () => {
  let service: SanitizeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SanitizeService);
  });

  // ---------- Vector tấn công phải bị chặn ----------

  it('loại bỏ thẻ script', () => {
    const out = service.sanitizeHtml('<p>An toàn</p><script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toContain('An toàn');
  });

  it('loại bỏ thuộc tính onerror trên ảnh (vector phổ biến nhất)', () => {
    const out = service.sanitizeHtml('<img src=x onerror="alert(1)">');
    expect(out).not.toContain('onerror');
  });

  it('loại bỏ href dùng javascript:', () => {
    const out = service.sanitizeHtml('<a href="javascript:alert(1)">bấm</a>');
    expect(out).not.toContain('javascript:');
  });

  it('loại bỏ src dùng data:text/html (chèn trang lạ)', () => {
    const out = service.sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
    expect(out).not.toContain('data:text/html');
  });

  it('loại bỏ iframe và form', () => {
    const out = service.sanitizeHtml('<iframe src="//evil"></iframe><form><input></form>');
    expect(out).not.toContain('<iframe');
    expect(out).not.toContain('<form');
  });

  it('loại bỏ thẻ svg chứa script (vector lách qua allowlist thẻ)', () => {
    const out = service.sanitizeHtml('<svg><script>alert(1)</script></svg>');
    expect(out).not.toContain('<script');
  });

  it('loại bỏ thuộc tính style (chèn CSS để che nội dung hoặc theo dõi)', () => {
    const out = service.sanitizeHtml('<p style="position:fixed;top:0;left:0">x</p>');
    expect(out).not.toContain('style=');
  });

  it('loại bỏ onclick và các thuộc tính sự kiện khác', () => {
    const out = service.sanitizeHtml('<p onclick="alert(1)" onload="alert(2)">x</p>');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onload');
  });

  it('loại bỏ object và embed', () => {
    const out = service.sanitizeHtml('<object data="//evil"></object><embed src="//evil">');
    expect(out).not.toContain('<object');
    expect(out).not.toContain('<embed');
  });

  /**
   * Hai vector dưới đây LỌT nếu thiếu `ALLOWED_URI_REGEXP` — đã kiểm chứng bằng
   * cách bỏ dòng đó ra và đo lại. DOMPurify chỉ tự chặn `javascript:` và
   * `data:text/html`; `ftp:` và URL protocol-relative (`//host`) thì không.
   * Không có test này thì việc xóa `ALLOWED_URI_REGEXP` sẽ không ai phát hiện.
   */
  it('loại bỏ giao thức ftp (ngoài allowlist https/mailto/tel)', () => {
    const out = service.sanitizeHtml('<a href="ftp://evil.com/x">tải</a>');
    expect(out).not.toContain('ftp://');
  });

  it('loại bỏ URL protocol-relative //host', () => {
    const out = service.sanitizeHtml('<a href="//evil.com/x">bấm</a>');
    expect(out).not.toContain('//evil.com');
  });

  // ---------- Nội dung hợp lệ phải được giữ ----------

  it('GIỮ định dạng văn bản hợp lệ', () => {
    const out = service.sanitizeHtml(
      '<p>Đoạn <strong>đậm</strong> và <em>nghiêng</em></p><ul><li>mục</li></ul>',
    );
    expect(out).toContain('<strong>đậm</strong>');
    expect(out).toContain('<em>nghiêng</em>');
    expect(out).toContain('<li>mục</li>');
  });

  it('GIỮ link http bình thường', () => {
    const out = service.sanitizeHtml('<a href="https://example.com">xem</a>');
    expect(out).toContain('href="https://example.com"');
  });

  it('GIỮ ảnh có src https', () => {
    const out = service.sanitizeHtml('<img src="https://cdn.example.com/a.jpg" alt="ảnh">');
    expect(out).toContain('src="https://cdn.example.com/a.jpg"');
    expect(out).toContain('alt="ảnh"');
  });

  it('GIỮ bảng và tiêu đề', () => {
    const out = service.sanitizeHtml('<h2>Tiêu đề</h2><table><tr><td>ô</td></tr></table>');
    expect(out).toContain('<h2>Tiêu đề</h2>');
    expect(out).toContain('<td>ô</td>');
  });

  it('GIỮ link mailto và tel', () => {
    expect(service.sanitizeHtml('<a href="mailto:a@b.com">mail</a>')).toContain('mailto:a@b.com');
    expect(service.sanitizeHtml('<a href="tel:19001234">gọi</a>')).toContain('tel:19001234');
  });

  // ---------- Đầu vào biên ----------

  it('chuỗi rỗng trả chuỗi rỗng, không ném lỗi', () => {
    expect(service.sanitizeHtml('')).toBe('');
  });

  it('văn bản thuần (không thẻ) giữ nguyên nội dung', () => {
    expect(service.sanitizeHtml('Chỉ là chữ thường')).toContain('Chỉ là chữ thường');
  });
});
