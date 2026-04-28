import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { RoleService, type ProfileRole } from '../services/role.service';

export function roleGuard(...allowedRoles: ProfileRole[]): CanActivateFn {
  return () => {
    const roleService = inject(RoleService);
    const router = inject(Router);

    if (roleService.hasAccess(allowedRoles)) {
      return true;
    }
    const r = roleService.role();
    if (!r) {
      return router.parseUrl('/login');
    }
    const fallback = '/dashboard';
    return router.parseUrl(fallback);
  };
}
