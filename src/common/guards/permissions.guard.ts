import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

// Task #4 & #9: Employee permission restrictions
// Employees cannot access: total sales, print/download, analytics, revenue totals
export const PERMISSION_KEY = 'permission';
export type Permission =
  | 'view_analytics'
  | 'view_total_sales'
  | 'view_revenue'
  | 'print_reports'
  | 'download_reports'
  | 'manage_refunds'
  | 'manage_team'
  | 'manage_settings';

export const RequirePermission = (...permissions: Permission[]) =>
  Reflect.metadata(PERMISSION_KEY, permissions);

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'view_analytics',
    'view_total_sales',
    'view_revenue',
    'print_reports',
    'download_reports',
    'manage_refunds',
    'manage_team',
    'manage_settings',
  ],
  BUSINESS_OWNER: [
    'view_analytics',
    'view_total_sales',
    'view_revenue',
    'print_reports',
    'download_reports',
    'manage_refunds',
    'manage_team',
    'manage_settings',
  ],
  MANAGER: [
    'view_analytics',
    'view_total_sales',
    'print_reports',
    'download_reports',
    'manage_refunds',
  ],
  EMPLOYEE: [],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    const userPermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];

    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
