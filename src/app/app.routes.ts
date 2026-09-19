import { Routes } from '@angular/router';
import { adminGuard, authGuard, staffGuard } from './core/guards/auth.guard';

/**
 * Định tuyến gốc — lazy load theo khu vực.
 *
 * Cấu trúc route bám API Design v0.1: khu vực khách hàng (client) và khu vực
 * vận hành (admin) tách layout, mỗi khu vực có guard riêng theo role.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/client/layout/client-layout').then((m) => m.ClientLayout),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/client/pages/home/home').then((m) => m.Home),
      },
      {
        path: 'login',
        loadComponent: () => import('./features/client/pages/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/client/pages/register/register').then((m) => m.Register),
      },
      {
        path: 'news',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Tin tức' },
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Hồ sơ của tôi' },
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [staffGuard],
    loadComponent: () => import('./features/admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'flights',
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Quản lý chuyến bay' },
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Quản lý booking' },
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Quản lý người dùng' },
      },
      {
        path: 'master-data',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./shared/components/coming-soon/coming-soon').then((m) => m.ComingSoon),
        data: { title: 'Dữ liệu nền' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
