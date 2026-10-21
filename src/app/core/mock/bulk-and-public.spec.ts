import { MockRegistry } from '@core/mock/mock-registry';
import { ApiResponse, PageData } from '@core/models/api-response.model';
import { NewsCategoryBrief, NewsItem } from '@core/models/fleet-news.model';

/**
 * Bulk (API v0.4 mục 2.10) và vùng khách `/public/news-categories` (mục 2.11).
 *
 * Vì sao cần: cả hai là hợp đồng MỚI mà FE vừa bám theo. Nếu mock trả hình dạng
 * khác backend — mảng có phân trang thay vì mảng trần, hay chấp nhận ACTIVE cho
 * news — thì code viết theo mock sẽ vỡ đúng lúc nối API thật.
 */
describe('Mock — bulk và danh mục tin công khai', () => {
  describe('thao tác hàng loạt', () => {
    it('PATCH /bulk đổi trạng thái nhiều bản ghi và trả kết quả từng phần', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('PATCH', 'http://x/api/admin/cities/bulk', {
        ids: [1, 2],
        status: 'INACTIVE',
      }) as ApiResponse<{ succeeded: number[]; failed: unknown[] }>;

      expect(res.code).toBe(1000);
      expect(res.data.succeeded.sort()).toEqual([1, 2]);
      expect(res.data.failed).toEqual([]);

      const after = reg.resolve('GET', 'http://x/api/admin/cities?status=INACTIVE') as ApiResponse<
        PageData<{ id: number }>
      >;
      expect(after.data.items.map((c) => c.id)).toEqual(expect.arrayContaining([1, 2]));
    });

    it('id không tồn tại vào `failed`, không chặn cả lô', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('DELETE', 'http://x/api/admin/airports/bulk', {
        ids: [1, 9999],
      }) as ApiResponse<{ succeeded: number[]; failed: { id: number; code: number }[] }>;

      expect(res.data.succeeded).toEqual([1]);
      expect(res.data.failed).toHaveLength(1);
      expect(res.data.failed[0].id).toBe(9999);
      expect(res.data.failed[0].code).toBe(1004);
    });

    it('news nhận PUBLISHED/UNPUBLISHED và gán published_at khi xuất bản', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('PATCH', 'http://x/api/admin/news/bulk', {
        ids: [6],
        status: 'PUBLISHED',
      }) as ApiResponse<{ succeeded: number[]; failed: unknown[] }>;

      expect(res.data.failed).toEqual([]);
      expect(res.data.succeeded).toEqual([6]);

      const detail = reg.resolve('GET', 'http://x/api/admin/news/6') as ApiResponse<NewsItem>;
      expect(detail.data.status).toBe('PUBLISHED');
      expect(detail.data.published_at).toBeTruthy();
    });

    it('news TỪ CHỐI ACTIVE — backend cũng từ chối', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('PATCH', 'http://x/api/admin/news/bulk', {
        ids: [1],
        status: 'ACTIVE',
      }) as ApiResponse<null>;

      expect(res.code).not.toBe(1000);
      expect(res.data).toBeNull();
    });

    it('danh sách id rỗng trả lỗi nghiệp vụ', () => {
      const reg = new MockRegistry();
      const res = reg.resolve('PATCH', 'http://x/api/admin/cities/bulk', {
        ids: [],
        status: 'ACTIVE',
      }) as ApiResponse<null>;

      expect(res.code).not.toBe(1000);
    });
  });

  describe('/public/news-categories', () => {
    it('trả mảng trần chỉ id + name, không phân trang', () => {
      const reg = new MockRegistry();
      const res = reg.resolve(
        'GET',
        'http://x/api/public/news-categories',
      ) as ApiResponse<NewsCategoryBrief[]>;

      expect(res.code).toBe(1000);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(Object.keys(res.data[0]).sort()).toEqual(['id', 'name']);
    });

    it('chỉ trả danh mục đang hoạt động', () => {
      const reg = new MockRegistry();
      const res = reg.resolve(
        'GET',
        'http://x/api/public/news-categories',
      ) as ApiResponse<NewsCategoryBrief[]>;

      // Danh mục 6 ("Tin cũ 2025") ở trạng thái INACTIVE.
      expect(res.data.some((c) => c.id === 6)).toBe(false);
    });

    it('danh mục bị tắt bên admin thì biến mất khỏi vùng khách', () => {
      const reg = new MockRegistry();
      reg.resolve('PUT', 'http://x/api/admin/news-categories/1', {
        name: 'Khuyến mãi',
        description: 'Thông tin ưu đãi, giảm giá vé',
        status: 'INACTIVE',
      });

      const res = reg.resolve(
        'GET',
        'http://x/api/public/news-categories',
      ) as ApiResponse<NewsCategoryBrief[]>;

      expect(res.data.some((c) => c.id === 1)).toBe(false);
    });
  });
});
