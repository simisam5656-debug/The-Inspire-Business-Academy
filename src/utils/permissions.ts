import { UserRole, ManagerPermissionKey } from '../types';

/**
 * Centralized Permission Layer for Academy Administration
 * Enforces strict distinction between Super Admin and Manager
 */

export const SUPER_ADMIN_ONLY_PERMISSIONS: ManagerPermissionKey[] = [
  'settings',
  'audit_log',
];

export const MANAGER_ALLOWED_PERMISSIONS: ManagerPermissionKey[] = [
  'dashboard',
  'students',
  'registrations',
  'attendance',
  'fees',
  'expenses',
  'courses',
  'payments',
  'enrollments',
  'quizzes',
  'certificates',
  'announcements',
  'faqs',
  'testimonials',
  'notices',
  'gallery',
  'offers',
  'reports',
  'ai_tools',
  'messages',
  'chatbot',
];

/**
 * Checks whether a user with given role can access a module
 */
export function canAccessModule(
  role: UserRole | null | undefined,
  moduleKey: ManagerPermissionKey,
  managerPermissions?: ManagerPermissionKey[]
): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true; // Super admin has unconditional access to all modules

  if (role === 'manager') {
    // Super-admin only modules are strictly forbidden to managers
    if (SUPER_ADMIN_ONLY_PERMISSIONS.includes(moduleKey)) {
      return false;
    }
    // Must be in allowed manager modules list
    if (!MANAGER_ALLOWED_PERMISSIONS.includes(moduleKey)) {
      return false;
    }
    // Explicit permission model: if permissions array is supplied, verify membership
    if (Array.isArray(managerPermissions)) {
      return managerPermissions.includes(moduleKey);
    }
    // Default allowed operational modules when array not provided
    return true;
  }

  // online_student has NO administrative access
  return false;
}

/**
 * Checks if user is authorized for destructive/sensitive operations
 * e.g., Deleting records, creating/updating managers, modifying ledger
 */
export function canPerformSuperAdminAction(role: UserRole | null | undefined): boolean {
  return role === 'super_admin';
}
