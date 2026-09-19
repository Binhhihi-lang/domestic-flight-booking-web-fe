import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Chặn GUEST khỏi khu vực cần đăng nhập (mục 1.5). */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirect: state.url },
  });
};

/** Chặn CUSTOMER khỏi khu vực vận hành (STAFF/ADMIN). */
export const staffGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isStaff()) {
    return true;
  }

  return router.createUrlTree(['/']);
};

/** Chặn cả STAFF — chỉ ADMIN (mục 2.3, 2.4). */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  return router.createUrlTree(['/']);
};
