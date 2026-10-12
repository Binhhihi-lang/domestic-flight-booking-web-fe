import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/auth.guard';

/**
 * Sinh bộ 4 route cho một tài nguyên CRUD: danh sách, thêm mới, chi tiết, sửa.
 *
 * Vì sao tách form ra trang riêng thay vì hộp thoại: tài liệu UI đã quy định
 * vậy (F4 `/admin/users/create`, F5 `/admin/users/:id/edit`), và form nghiệp vụ
 * có 8–14 trường (Promotion, Voucher) nên nhét vào hộp thoại phải cuộn, khó
 * nhìn tổng thể. Trang riêng còn cho phép dán link trực tiếp tới form sửa.
 *
 * Cả 4 route trỏ về CÙNG một component; component đọc `data.mode` để quyết định
 * render danh sách, form hay trang chi tiết. Nhờ vậy mỗi module chỉ có một file.
 *
 * Thứ tự khai báo quan trọng: `new` phải đứng TRƯỚC `:id`, nếu không Angular
 * khớp "new" vào `:id` và trang thêm mới không bao giờ mở được.
 */
export function crudRoutes(
  path: string,
  title: string,
  loader: () => Promise<Type<unknown>>,
  options: {
    adminOnly?: boolean;
    detail?: boolean;
    /**
     * Component riêng cho form thêm/sửa — dùng khi module có nghiệp vụ phức tạp
     * (khuyến mãi/voucher có phạm vi áp dụng và loại trừ) mà form chung không
     * biểu diễn được.
     */
    formLoader?: () => Promise<Type<unknown>>;
  } = {},
): Routes {
  const canActivate = options.adminOnly ? [adminGuard] : [];
  const withDetail = options.detail !== false;
  const formComponent = options.formLoader ?? loader;

  const routes: Routes = [
    {
      path,
      canActivate,
      loadComponent: loader,
      data: { title, mode: 'list' },
    },
    {
      path: `${path}/new`,
      canActivate,
      loadComponent: formComponent,
      data: { title: `Thêm ${title.toLowerCase()}`, mode: 'form' },
    },
  ];

  if (withDetail) {
    routes.push(
      {
        path: `${path}/:id`,
        canActivate,
        loadComponent: loader,
        data: { title, mode: 'detail' },
      },
      {
        path: `${path}/:id/edit`,
        canActivate,
        loadComponent: formComponent,
        data: { title: `Sửa ${title.toLowerCase()}`, mode: 'form' },
      },
    );
  } else {
    routes.push({
      path: `${path}/:id/edit`,
      canActivate,
      loadComponent: formComponent,
      data: { title: `Sửa ${title.toLowerCase()}`, mode: 'form' },
    });
  }

  return routes;
}
