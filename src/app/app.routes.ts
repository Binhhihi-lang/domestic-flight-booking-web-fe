import { Routes } from '@angular/router';
import { adminGuard, authGuard, staffGuard } from '@core/guards/auth.guard';
import { crudRoutes } from '@shared/crud/crud-routes';

/**
 * Định tuyến gốc — lazy load theo khu vực.
 *
 * Cấu trúc route bám danh sách UI đã duyệt (docs: Danh_sach_toan_bo_UI):
 * Public Website (tra cứu, không cần đăng nhập), Customer Account (cần token)
 * và khu vực vận hành (STAFF/ADMIN) tách layout và guard riêng.
 *
 * Các route đã khai nhưng chưa có màn hình thật dùng `coming-soon` để điều
 * hướng không rơi vào link chết trong lúc chờ sprint tương ứng.
 */
export const routes: Routes = [
  // Trang xác thực nằm NGOÀI client-layout: mockup P6 là bố cục chia đôi toàn
  // màn hình, không có topbar/footer. Để trong layout thì khách vừa đăng nhập
  // vừa thấy thanh điều hướng và footer của trang chủ — sai thiết kế.
  {
    path: 'login',
    loadComponent: () => import('@features/client/pages/login/login').then((m) => m.Login),
    data: { title: 'Đăng nhập' },
  },
  {
    path: 'register',
    loadComponent: () => import('@features/client/pages/register/register').then((m) => m.Register),
    data: { title: 'Đăng ký' },
  },
  {
    path: '',
    loadComponent: () =>
      import('@features/client/layout/client-layout').then((m) => m.ClientLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('@features/client/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'flights',
        loadComponent: () =>
          import('@features/client/pages/flight-results/flight-results').then(
            (m) => m.FlightResults,
          ),
        data: { title: 'Kết quả tìm chuyến' },
      },
      // `promotions` phải đứng TRƯỚC `promotions/:id`, nếu không Angular khớp
      // chuỗi rỗng vào `:id` và trang danh sách không bao giờ mở được.
      {
        path: 'promotions',
        loadComponent: () =>
          import('@features/client/pages/promotions/promotion-list').then(
            (m) => m.ClientPromotionList,
          ),
        data: { title: 'Khuyến mãi' },
      },
      {
        path: 'promotions/:id',
        loadComponent: () =>
          import('@features/client/pages/promotions/promotion-detail').then(
            (m) => m.ClientPromotionDetail,
          ),
        data: { title: 'Chi tiết khuyến mãi' },
      },
      // `news` phải đứng TRƯỚC `news/:id`, nếu không Angular khớp chuỗi rỗng
      // vào `:id` và trang danh sách không bao giờ mở được.
      {
        path: 'news',
        loadComponent: () =>
          import('@features/client/pages/news/news-list').then((m) => m.ClientNewsList),
        data: { title: 'Tin tức' },
      },
      {
        path: 'news/:id',
        loadComponent: () =>
          import('@features/client/pages/news/news-detail').then((m) => m.ClientNewsDetail),
        data: { title: 'Chi tiết tin tức' },
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () =>
          import('@features/client/layout/account-layout').then((m) => m.AccountLayout),
        children: [
          {
            path: '',
            loadComponent: () =>
              import('@features/client/pages/account/account-bookings').then(
                (m) => m.AccountBookings,
              ),
            data: { title: 'Vé của tôi' },
          },
          ...comingSoonAccount('wallet', 'Ví của tôi'),
          {
            path: 'vouchers',
            loadComponent: () =>
              import('@features/client/pages/account/my-vouchers').then((m) => m.MyVouchers),
            data: { title: 'Voucher của tôi' },
          },
          {
            path: 'voucher-store',
            loadComponent: () =>
              import('@features/client/pages/account/voucher-store').then((m) => m.VoucherStore),
            data: { title: 'Kho voucher' },
          },
          ...comingSoonAccount('profile', 'Hồ sơ cá nhân'),
          ...comingSoonAccount('security', 'Đổi mật khẩu'),
        ],
      },
      {
        path: 'profile',
        redirectTo: 'account/profile',
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [staffGuard],
    loadComponent: () => import('@features/admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/admin/pages/dashboard/dashboard').then((m) => m.AdminDashboard),
        data: { title: 'Dashboard' },
      },
      {
        path: 'airlines',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/airlines/airlines').then((m) => m.AdminAirlines),
        data: { title: 'Hãng hàng không' },
      },
      {
        path: 'style-guide',
        loadComponent: () => import('@features/style-guide/style-guide').then((m) => m.StyleGuide),
        data: { title: 'Design system' },
      },

      // ---- Master data (Phase 1) ----
      // Mỗi module 4 route: danh sách / thêm mới / chi tiết / sửa. Form là TRANG
      // RIÊNG (không phải hộp thoại) theo tài liệu UI, và hàng trong bảng bấm
      // được để xem chi tiết.
      ...crudRoutes('airlines', 'Hãng hàng không', () =>
        import('@features/admin/pages/airlines/airlines').then((m) => m.AdminAirlines),
        { adminOnly: true },
      ),
      ...crudRoutes('cities', 'Thành phố', () =>
        import('@features/admin/pages/cities/cities').then((m) => m.AdminCities),
        { adminOnly: true },
      ),
      ...crudRoutes('airports', 'Sân bay', () =>
        import('@features/admin/pages/airports/airports').then((m) => m.AdminAirports),
        { adminOnly: true },
      ),
      ...crudRoutes('aircrafts', 'Máy bay', () =>
        import('@features/admin/pages/aircrafts/aircrafts').then((m) => m.AdminAircrafts),
        { adminOnly: true },
      ),
      ...crudRoutes('seat-types', 'Loại ghế', () =>
        import('@features/admin/pages/seat-types/seat-types').then((m) => m.AdminSeatTypes),
        { adminOnly: true },
      ),
      ...crudRoutes('promotions', 'Khuyến mãi', () =>
        import('@features/admin/pages/promotions/promotions').then((m) => m.AdminPromotions),
        {
          adminOnly: true,
          formLoader: () =>
            import('@features/admin/pages/promotions/promotion-form').then(
              (m) => m.PromotionForm,
            ),
        },
      ),
      ...crudRoutes('vouchers', 'Voucher', () =>
        import('@features/admin/pages/vouchers/vouchers').then((m) => m.AdminVouchers),
        {
          adminOnly: true,
          formLoader: () =>
            import('@features/admin/pages/vouchers/voucher-form').then((m) => m.VoucherForm),
        },
      ),
      ...crudRoutes('news', 'Tin tức', () =>
        import('@features/admin/pages/news/news').then((m) => m.AdminNews),
        { adminOnly: true },
      ),
      ...crudRoutes('news-categories', 'Danh mục tin', () =>
        import('@features/admin/pages/news-categories/news-categories').then(
          (m) => m.AdminNewsCategories,
        ),
        { adminOnly: true },
      ),

      // Các màn đã khai trong danh sách UI nhưng chưa làm — dùng coming-soon
      // để sidebar không dẫn vào link chết. Bỏ dần khi tới sprint tương ứng.
      // ---- RBAC (chỉ đọc) ----
      {
        path: 'roles',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/roles/roles').then((m) => m.AdminRoles),
        data: { title: 'Vai trò' },
      },
      {
        path: 'permissions',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/permissions/permissions').then((m) => m.AdminPermissions),
        data: { title: 'Quyền' },
      },

      // ---- Người dùng (ADMIN) ----
      ...crudRoutes('users', 'Người dùng', () =>
        import('@features/admin/pages/users/users').then((m) => m.AdminUsers),
        {
          adminOnly: true,
          formLoader: () => import('@features/admin/pages/users/user-form').then((m) => m.UserForm),
        },
      ),

      // ---- Sơ đồ ghế (theo máy bay) ----
      // Không phải màn danh sách: sơ đồ thuộc về MỘT máy bay, nên vào bằng
      // /admin/seat-configurations/:id (từ cột "Cấu hình" ở danh sách máy bay).
      {
        path: 'seat-configurations/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('@features/admin/pages/seat-configurations/seat-configurations').then(
            (m) => m.AdminSeatConfigurations,
          ),
        data: { title: 'Sơ đồ ghế' },
      },
      ...comingSoonAdmin('flights', 'Chuyến bay'),
      ...comingSoonAdmin('bookings', 'Đặt chỗ'),
      ...comingSoonAdmin('profile', 'Hồ sơ cá nhân'),
    ],
  },
  { path: '**', redirectTo: '' },
];

/**
 * Sinh route `coming-soon` cho một màn admin chưa làm.
 *
 * Vì sao gom thành hàm: có 14 màn như vậy, viết tay từng khối lặp lại đúng
 * một khuôn và rất dễ lệch `data.title` với nhãn trên sidebar.
 */
function comingSoonAdmin(path: string, title: string, adminOnly = false): Routes {
  return [
    {
      path,
      ...(adminOnly ? { canActivate: [adminGuard] } : {}),
      loadComponent: () =>
        import('@shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
      data: { title },
    },
  ];
}

/** Cùng khuôn trên cho các mục trong trang tài khoản khách (đã có authGuard ở cha). */
function comingSoonAccount(path: string, title: string): Routes {
  return [
    {
      path,
      loadComponent: () =>
        import('@shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
      data: { title },
    },
  ];
}
