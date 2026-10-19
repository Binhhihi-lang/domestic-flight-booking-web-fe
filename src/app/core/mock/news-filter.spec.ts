import { MockRegistry } from '@core/mock/mock-registry';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { NewsItem } from '@core/models/fleet-news.model';

/**
 * Filter `category_id` trên `GET /news` và `categories` lồng trong response.
 *
 * Vì sao cần: trang tin dùng `category_id` để lấy bài liên quan, và dùng
 * `categories` để dựng dropdown danh mục. Cả hai phụ thuộc vào việc mock trả
 * ĐÚNG hình dạng như backend — sai thì code viết theo mock sẽ vỡ khi gặp API thật.
 */
describe('News mock — filter danh mục và categories lồng', () => {
  it('lọc theo category_id khớp phần tử trong category_ids', () => {
    const reg = new MockRegistry();
    // Danh mục 1 = "Khuyến mãi" — bài 2 (đã đăng) và bài 6 (nháp) cùng thuộc.
    // Mock KHÔNG lọc `status`: backend mới lọc cho GUEST, mock trả hết để trang
    // tự lọc — đúng như hai chế độ đang hành xử.
    const res = reg.resolve('GET', 'http://x/api/admin/news?category_id=1') as ApiResponse<
      PageData<NewsItem>
    >;

    expect(res.data.items.map((n) => n.id).sort()).toEqual([2, 6]);
  });

  it('lọc danh mục có NHIỀU bài trả đủ', () => {
    const reg = new MockRegistry();
    // Danh mục 5 = "Thông báo" — bài 1, 5 và 99 cùng thuộc.
    const res = reg.resolve('GET', 'http://x/api/admin/news?category_id=5') as ApiResponse<
      PageData<NewsItem>
    >;

    expect(res.data.items.map((n) => n.id).sort()).toEqual([1, 5, 99]);
  });

  it('danh mục không có bài trả rỗng, không lỗi', () => {
    const reg = new MockRegistry();
    const res = reg.resolve('GET', 'http://x/api/admin/news?category_id=999') as ApiResponse<
      PageData<NewsItem>
    >;

    expect(res.code).toBe(1000);
    expect(res.data.items.length).toBe(0);
  });

  it('danh sách trả kèm categories lồng (không chỉ category_ids)', () => {
    const reg = new MockRegistry();
    const res = reg.resolve('GET', 'http://x/api/admin/news?size=50') as ApiResponse<
      PageData<NewsItem>
    >;

    const first = res.data.items.find((n) => n.id === 1)!;
    expect(first.categories?.map((c) => c.name)).toEqual([
      'Hãng hàng không',
      'Thông báo',
    ]);
  });

  it('chi tiết CŨNG trả kèm categories (trang chi tiết cần)', () => {
    const reg = new MockRegistry();
    const res = reg.resolve('GET', 'http://x/api/admin/news/1') as ApiResponse<NewsItem>;

    expect(res.data.categories?.length).toBe(2);
  });

  it('không gắn danh mục đã xóa mềm', () => {
    const reg = new MockRegistry();
    // Danh mục 6 ("Tin cũ 2025") có is_deleted = true.
    const res = reg.resolve('GET', 'http://x/api/admin/news?size=50') as ApiResponse<
      PageData<NewsItem>
    >;

    const allCats = res.data.items.flatMap((n) => n.categories ?? []);
    expect(allCats.some((c) => c.id === 6)).toBe(false);
  });
});
