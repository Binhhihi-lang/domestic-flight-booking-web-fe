import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { SanitizeService } from '@core/services/sanitize.service';

/**
 * So sánh lớp bảo vệ của Angular (`[innerHTML]`) với `SanitizeService`.
 *
 * Vì sao giữ test này: khi viết test chống XSS cho trang tin tức, tôi phát hiện
 * bỏ hẳn `SanitizeService` ra thì test VẪN XANH — vì Angular đã tự làm sạch
 * `[innerHTML]`. Test đó không chứng minh được gì về service.
 *
 * Test này ghi lại SỰ THẬT đã đo: hai lớp chặn gần như cùng một tập vector.
 * Nhờ vậy nếu sau này Angular đổi hành vi (nới lỏng), test sẽ fail và ta biết
 * lớp thứ hai đang gánh việc một mình.
 */
@Component({ selector: 'app-cmp-probe', template: `<div [innerHTML]="html"></div>` })
class CmpProbe {
  html = '';
}

describe('SanitizeService so với Angular [innerHTML]', () => {
  const VECTORS: [string, string, string][] = [
    ['script', '<p>x</p><script>alert(1)</script>', '<script'],
    ['onerror', '<img src=x onerror="alert(1)">', 'onerror'],
    ['javascript-href', '<a href="javascript:alert(1)">x</a>', 'javascript:'],
    ['iframe', '<iframe src="//evil"></iframe>', '<iframe'],
    ['form', '<form action="//evil"><input></form>', '<form'],
    ['style-attr', '<p style="color:red">x</p>', 'style='],
    ['object', '<object data="//evil"></object>', '<object'],
    ['embed', '<embed src="//evil">', '<embed'],
    ['ftp', '<a href="ftp://evil/x">x</a>', 'ftp://'],
    ['proto-relative', '<a href="//evil.com">x</a>', '//evil.com'],
  ];

  it('CẢ HAI lớp đều chặn mọi vector đã thử', () => {
    TestBed.configureTestingModule({ imports: [CmpProbe] });
    const fixture = TestBed.createComponent(CmpProbe);
    const el = fixture.nativeElement as HTMLElement;
    const service = TestBed.inject(SanitizeService);

    const leaks: string[] = [];

    for (const [name, html, marker] of VECTORS) {
      fixture.componentInstance.html = html;
      fixture.detectChanges();
      const angularOut = el.innerHTML;

      if (angularOut.includes(marker)) {
        leaks.push(`Angular để lọt: ${name}`);
      }
      if (service.sanitizeHtml(html).includes(marker)) {
        leaks.push(`SanitizeService để lọt: ${name}`);
      }
    }

    expect(leaks).toEqual([]);
  });

  it('nội dung hợp lệ đi qua CẢ HAI lớp', () => {
    TestBed.configureTestingModule({ imports: [CmpProbe] });
    const fixture = TestBed.createComponent(CmpProbe);
    const el = fixture.nativeElement as HTMLElement;
    const service = TestBed.inject(SanitizeService);

    const safe = '<p>Đoạn <strong>đậm</strong></p><ul><li>mục</li></ul>';

    fixture.componentInstance.html = safe;
    fixture.detectChanges();
    expect(el.innerHTML).toContain('<strong>đậm</strong>');

    const out = service.sanitizeHtml(safe);
    expect(out).toContain('<strong>đậm</strong>');
    expect(out).toContain('<li>mục</li>');
  });
});
