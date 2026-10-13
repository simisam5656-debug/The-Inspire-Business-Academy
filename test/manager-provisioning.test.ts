import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import managersHandler, { MAX_MANAGERS_LIMIT, ALLOWED_MANAGER_PERMISSIONS, FORBIDDEN_MANAGER_PERMISSIONS } from '../api/admin/managers';
import { onRequest as managersFunctionHandler } from '../functions/api/admin/managers';
import { createNodeResponseMock } from '../functions/_adapter';
import { canAccessModule, canPerformSuperAdminAction } from '../src/utils/permissions';
import { ManagerPermissionKey } from '../src/types';

describe('Task D — Manager Maximum to Four and Secure Provisioning Tests', () => {

  // Mock Database Client Factory with simulated in-memory storage and atomic operations
  const createMockDb = (opts: {
    callerRole?: 'super_admin' | 'manager' | 'online_student';
    initialManagersCount?: number;
    failOnProfileUpdate?: boolean;
    failOnPermissionInsert?: boolean;
    simulateRaceCondition?: boolean;
    missingInitialProfile?: boolean;
    zeroRowProfileUpdate?: boolean;
    unexpectedProfileRole?: string;
    unexpectedProfileActive?: boolean;
    failOnCleanup?: boolean;
    failOnPermissionDeleteError?: boolean;
    throwOnPermissionDelete?: boolean;
    failOnProfileDeleteError?: boolean;
    throwOnProfileDelete?: boolean;
    failOnAuthDeleteError?: boolean;
    throwOnAuthDelete?: boolean;
    failOnCreateUserError?: boolean;
    createUserErrorMessage?: string;
    throwOnCreateUser?: boolean;
    failOnAuditLogInsert?: boolean;
    throwOnAuditLogInsert?: boolean;
    getUserByIdUnverifiable?: boolean;
    getUserByIdStillPresent?: boolean;
    simulateCascadeOnAuthDelete?: boolean;
  } = {}) => {
    const callerRole = opts.callerRole || 'super_admin';
    const callerId = 'caller-uuid-superadmin-01';

    // Seeded profiles
    const profiles: Array<{ id: string; email: string; full_name: string; phone?: string; role: string; is_active: boolean }> = [
      { id: callerId, email: 'superadmin@theinspireacademy.com', full_name: 'Super Admin', role: callerRole, is_active: true },
    ];

    const initialCount = opts.initialManagersCount ?? 2;
    for (let i = 1; i <= initialCount; i++) {
      profiles.push({
        id: `mgr-uuid-00${i}`,
        email: `manager0${i}@theinspireacademy.com`,
        full_name: `Manager 0${i}`,
        phone: `0300123456${i}`,
        role: 'manager',
        is_active: true,
      });
    }

    const managerPermissions: Array<{ profile_id: string; permission_key: string; granted_by?: string }> = [
      { profile_id: 'mgr-uuid-001', permission_key: 'dashboard' },
      { profile_id: 'mgr-uuid-001', permission_key: 'students' },
      { profile_id: 'mgr-uuid-001', permission_key: 'ai_tools' },
    ];

    const auditLogs: Array<any> = [];
    const authUsers: Map<string, { id: string; email: string; user_metadata?: any }> = new Map();
    let deletedAuthUsers: string[] = [];
    let countCalls = 0;

    const db = {
      _profiles: profiles,
      _permissions: managerPermissions,
      _auditLogs: auditLogs,
      _authUsers: authUsers,
      _deletedAuthUsers: deletedAuthUsers,

      auth: {
        getUser: async (token: string) => {
          if (token === 'valid-superadmin-token') {
            return { data: { user: { id: callerId, email: 'superadmin@theinspireacademy.com' } }, error: null };
          }
          if (token === 'valid-manager-token') {
            return { data: { user: { id: 'mgr-uuid-001', email: 'manager01@theinspireacademy.com' } }, error: null };
          }
          if (token === 'valid-student-token') {
            return { data: { user: { id: 'student-uuid-999', email: 'student@gmail.com' } }, error: null };
          }
          return { data: { user: null }, error: new Error('Invalid or expired token') };
        },

        admin: {
          createUser: async (payload: { email: string; password?: string; user_metadata?: any }) => {
            if (opts.throwOnCreateUser) {
              throw new Error('Simulated network failure communicating with identity provider');
            }
            if (opts.failOnCreateUserError) {
              return { data: null, error: new Error(opts.createUserErrorMessage || 'Simulated createUser internal failure') };
            }
            // Never allow duplicate email
            const exists = Array.from(authUsers.values()).some((u) => u.email === payload.email);
            if (exists) {
              return { data: null, error: new Error('User already registered') };
            }
            const newId = 'new-user-uuid-' + Math.random().toString(36).substring(2, 9);
            const userObj = { id: newId, email: payload.email, user_metadata: payload.user_metadata };
            authUsers.set(newId, userObj);

            // If missingInitialProfile is simulated, do NOT add to profiles table (trigger failure)
            if (!opts.missingInitialProfile) {
              profiles.push({
                id: newId,
                email: payload.email,
                full_name: payload.user_metadata?.full_name || '',
                phone: payload.user_metadata?.phone,
                role: 'online_student',
                is_active: true,
              });
            }

            return { data: { user: userObj }, error: null };
          },

          deleteUser: async (userId: string) => {
            if (opts.throwOnAuthDelete) {
              throw new Error('Simulated throw during Auth user deletion');
            }
            if (opts.failOnCleanup || opts.failOnAuthDeleteError) {
              return { data: null, error: new Error('Simulated network failure during Auth user deletion') };
            }
            authUsers.delete(userId);
            deletedAuthUsers.push(userId);
            if (opts.simulateCascadeOnAuthDelete) {
              const pIdx = profiles.findIndex((p: any) => p.id === userId);
              if (pIdx !== -1) profiles.splice(pIdx, 1);
            }
            return { data: {}, error: null };
          },

          getUserById: async (userId: string) => {
            if (opts.getUserByIdUnverifiable) {
              throw new Error('Simulated network timeout verifying Auth user state');
            }
            if (opts.getUserByIdStillPresent) {
              return { data: { user: { id: userId, email: 'persisting@theinspireacademy.com' } }, error: null };
            }
            if (authUsers.has(userId)) {
              return { data: { user: authUsers.get(userId) }, error: null };
            }
            return { data: { user: null }, error: { message: 'User not found', status: 404 } };
          },
        },
      },

      from: (table: string) => {
        if (table === 'profiles') {
          return {
            select: (_cols?: string, config?: { count?: string; head?: boolean }) => {
              let filtered = [...profiles];
              if (config?.count === 'exact') {
                return {
                  eq: async (col: string, val: any) => {
                    countCalls++;
                    if (opts.simulateRaceCondition && countCalls >= 2) {
                      return { count: 5, error: null };
                    }
                    const count = profiles.filter((p: any) => p[col] === val).length;
                    return { count, error: null };
                  },
                };
              }

              const queryObj: any = {
                eq: (col: string, val: any) => {
                  filtered = filtered.filter((p: any) => p[col] === val);
                  return queryObj;
                },
                in: (col: string, vals: any[]) => {
                  filtered = filtered.filter((p: any) => vals.includes(p[col]));
                  return queryObj;
                },
                order: () => queryObj,
                maybeSingle: async () => {
                  return { data: filtered[0] || null, error: null };
                },
                single: async () => {
                  if (filtered.length === 0) return { data: null, error: new Error('Row not found') };
                  return { data: filtered[0], error: null };
                },
                then: (resolve: any) => resolve({ data: filtered, error: null }),
              };
              return queryObj;
            },

            update: (updates: any) => ({
              eq: (col: string, val: any) => {
                let targets = profiles.filter((p: any) => p[col] === val);

                if (opts.failOnProfileUpdate) {
                  const errRes = { data: null, error: new Error('Simulated database deadlock during profile update') };
                  return {
                    select: async () => errRes,
                    then: (resolve: any) => resolve(errRes),
                  };
                }

                if (opts.zeroRowProfileUpdate) {
                  targets = [];
                }

                targets.forEach((target) => {
                  Object.assign(target, updates);
                  if (opts.unexpectedProfileRole) {
                    target.role = opts.unexpectedProfileRole;
                  }
                  if (opts.unexpectedProfileActive !== undefined) {
                    target.is_active = opts.unexpectedProfileActive;
                  }
                });

                const withSelectRes = {
                  data: targets.map((t) => ({ ...t })),
                  error: null,
                };
                const withoutSelectRes = {
                  data: null,
                  error: null,
                };

                return {
                  select: async () => withSelectRes,
                  then: (resolve: any) => resolve(withoutSelectRes),
                };
              },
            }),

            delete: () => ({
              eq: async (col: string, val: any) => {
                if (opts.throwOnProfileDelete) {
                  throw new Error('Simulated throw during profile deletion');
                }
                if (opts.failOnProfileDeleteError) {
                  return { data: null, error: new Error('Simulated PostgREST error during profile deletion') };
                }
                const idx = profiles.findIndex((p: any) => p[col] === val);
                if (idx !== -1) profiles.splice(idx, 1);
                return { data: {}, error: null };
              },
            }),
          };
        }

        if (table === 'manager_permissions') {
          return {
            select: () => {
              return {
                eq: (col: string, val: any) => ({
                  eq: (_col2: string, _val2: any) => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                  then: (resolve: any) => {
                    const filtered = managerPermissions.filter((p: any) => p[col] === val);
                    return resolve({ data: filtered, error: null });
                  },
                }),
                then: (resolve: any) => resolve({ data: managerPermissions, error: null }),
              };
            },
            insert: async (rows: any[]) => {
              if (opts.failOnPermissionInsert) {
                return { data: null, error: new Error('Simulated database error during permissions insert') };
              }
              managerPermissions.push(...rows);
              return { data: rows, error: null };
            },
            delete: () => ({
              eq: async (col: string, val: any) => {
                if (opts.throwOnPermissionDelete) {
                  throw new Error('Simulated throw during permission deletion');
                }
                if (opts.failOnPermissionDeleteError) {
                  return { data: null, error: new Error('Simulated PostgREST error during permission deletion') };
                }
                for (let i = managerPermissions.length - 1; i >= 0; i--) {
                  if ((managerPermissions[i] as any)[col] === val) {
                    managerPermissions.splice(i, 1);
                  }
                }
                return { data: {}, error: null };
              },
            }),
          };
        }

        if (table === 'audit_logs') {
          return {
            insert: async (entry: any) => {
              if (opts.throwOnAuditLogInsert) {
                throw new Error('Simulated database exception during audit log insertion');
              }
              if (opts.failOnAuditLogInsert) {
                return { data: null, error: new Error('Simulated audit log constraint failure') };
              }
              auditLogs.push(entry);
              return { data: entry, error: null };
            },
          };
        }

        return {
          select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        };
      },
    };

    return db;
  };

  // =========================================================================
  // 1. Authorization & Role Verification
  // =========================================================================
  describe('1. Authentication and Staff Authorization', () => {
    test('1.1. Unauthenticated request without Bearer token is rejected with HTTP 401', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb();
      await managersHandler({ method: 'POST', body: {}, headers: {} }, res, db);
      assert.equal(res._getStatusCode(), 401);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Bearer authentication token is required/i);
    });

    test('1.2. Manager account attempting to create a manager is rejected with HTTP 403 Forbidden', async () => {
      const res = createNodeResponseMock();
      // Caller has 'manager' role
      const db = createMockDb({ callerRole: 'manager' });
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-manager-token' },
        body: {
          email: 'newmanager@theinspireacademy.com',
          fullName: 'New Candidate',
          password: 'Password123!',
          permissions: ['dashboard'],
        },
      };
      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 403);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Only Super Administrators/i);
    });

    test('1.3. Online student account is rejected with HTTP 403 Forbidden', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ callerRole: 'online_student' });
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-student-token' },
        body: {
          email: 'hacker@theinspireacademy.com',
          fullName: 'Unauthorized Actor',
          password: 'Password123!',
          permissions: ['dashboard'],
        },
      };
      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 403);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
    });
  });

  // =========================================================================
  // 2. Maximum Four Managers Limit Enforcement
  // =========================================================================
  describe('2. Four-Manager Limit Enforcement', () => {
    test('2.1. Super Admin can successfully create 3rd and 4th manager accounts', async () => {
      const res = createNodeResponseMock();
      // Start with 2 managers
      const db = createMockDb({ initialManagersCount: 2 });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'manager03@theinspireacademy.com',
          fullName: 'Operations Manager 03',
          phone: '03091112233',
          password: 'SecurePassword123!',
          permissions: ['dashboard', 'students', 'attendance', 'fees'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 201);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.equal(json.manager.role, 'manager');
      assert.equal(json.manager.email, 'manager03@theinspireacademy.com');
      assert.deepEqual(json.manager.permissions, ['dashboard', 'students', 'attendance', 'fees']);

      // Response MUST NOT contain the password!
      assert.equal(json.manager.password, undefined);
      assert.equal(JSON.stringify(json).includes('SecurePassword123!'), false);
    });

    test('2.2. Attempting to create a 5th manager when 4 already exist is rejected with HTTP 400', async () => {
      const res = createNodeResponseMock();
      // Start with exactly 4 managers
      const db = createMockDb({ initialManagersCount: 4 });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'manager05@theinspireacademy.com',
          fullName: 'Fifth Manager',
          phone: '03099998877',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Maximum 4 Operations Managers allowed/i);
    });

    test('2.3. Inactive manager profiles still count toward the 4-manager limit under Academy policy', async () => {
      const res = createNodeResponseMock();
      // Start with 4 managers, 1 of which is deactivated (is_active = false)
      const db = createMockDb({ initialManagersCount: 4 });
      // Deactivate one manager
      db._profiles[1].is_active = false;

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'manager05@theinspireacademy.com',
          fullName: 'Fifth Manager',
          phone: '03099998877',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Maximum 4 Operations Managers allowed/i);
    });

    test('2.4. Updating an existing manager (PATCH) succeeds even when 4 managers already exist', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 4 });

      // Update permissions on existing manager mgr-uuid-001
      const req = {
        method: 'PATCH',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          action: 'update_permissions',
          managerId: 'mgr-uuid-001',
          permissions: ['dashboard', 'quizzes', 'courses'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 200);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.deepEqual(json.permissions, ['dashboard', 'quizzes', 'courses']);
    });

    test('2.5. Migration 20261010000000_enforce_max_four_managers.sql integrity and security review', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261010000000_enforce_max_four_managers.sql');

      assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      // 1. Transaction-scoped advisory lock for concurrency
      assert.ok(sql.includes('pg_advisory_xact_lock'), 'Must use pg_advisory_xact_lock for transaction-scoped serialization');

      // 2. Hard limit constant = 4
      assert.ok(sql.includes('max_allowed constant integer := 4'), 'Must enforce hard limit of 4');

      // 3. Counting logic excludes self on existing manager update
      assert.ok(sql.includes('id != OLD.id'), 'Must exclude current row when updating an existing manager');

      // 4. Counts ALL manager accounts (both active and inactive)
      assert.ok(sql.includes("WHERE role = 'manager'"), 'Must count all records with role manager');

      // 5. Trigger fires on insert or update of role column
      assert.ok(sql.includes('BEFORE INSERT OR UPDATE OF role ON public.profiles'), 'Must bind to role column updates');

      // 6. Security definer with search_path hardening
      assert.ok(sql.includes('SECURITY DEFINER SET search_path = public'), 'Must harden search path against injection');
    });
  });

  // =========================================================================
  // 3. Permission Validation and Explicit Permission Model
  // =========================================================================
  describe('3. Permission Validation and Explicit Model', () => {
    test('3.1. Rejects request attempting to assign super_admin reserved permissions (settings, audit_log)', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1 });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'rogue@theinspireacademy.com',
          fullName: 'Privileged Manager',
          password: 'SecurePassword123!',
          permissions: ['dashboard', 'settings'], // 'settings' is reserved for super_admin!
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /strictly reserved for Super Administrators/i);
    });

    test('3.2. Rejects request with unknown permission keys', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1 });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'invalid@theinspireacademy.com',
          fullName: 'Bad Perms Manager',
          password: 'SecurePassword123!',
          permissions: ['dashboard', 'root_shell_access'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Unrecognized manager permission/i);
    });

    test('3.3. Correctly allows ai_tools permission for manager', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1 });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'aimanager@theinspireacademy.com',
          fullName: 'AI Content Manager',
          password: 'SecurePassword123!',
          permissions: ['dashboard', 'ai_tools'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 201);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, true);
      assert.ok(json.manager.permissions.includes('ai_tools'));
    });

    test('3.4. canAccessModule helper verifies explicit manager-permission model without leaking unspecified modules', () => {
      // Super admin can access everything
      assert.equal(canAccessModule('super_admin', 'settings'), true);
      assert.equal(canAccessModule('super_admin', 'audit_log'), true);
      assert.equal(canAccessModule('super_admin', 'ai_tools'), true);

      // Manager can NEVER access super_admin only modules
      assert.equal(canAccessModule('manager', 'settings', ['settings']), false);
      assert.equal(canAccessModule('manager', 'audit_log', ['audit_log']), false);

      // Manager with explicit permission accesses granted module
      assert.equal(canAccessModule('manager', 'ai_tools', ['dashboard', 'ai_tools']), true);

      // Manager WITHOUT explicit permission is denied
      assert.equal(canAccessModule('manager', 'ai_tools', ['dashboard', 'students']), false);
      assert.equal(canAccessModule('manager', 'fees', ['dashboard', 'students']), false);

      // Manager with empty permissions array has NO unspecified access
      assert.equal(canAccessModule('manager', 'ai_tools', []), false);

      // Online student has NO administrative access
      assert.equal(canAccessModule('online_student', 'dashboard'), false);
      assert.equal(canAccessModule('online_student', 'ai_tools'), false);
    });
  });

  // =========================================================================
  // 4. Concurrency Guard & Compensating Cleanup on Failures
  // =========================================================================
  describe('4. Concurrency and Failure Rollback Compensation', () => {
    test('4.1. Concurrency race detection triggers rollback and HTTP 409 Conflict', async () => {
      const res = createNodeResponseMock();
      // Simulate race condition where post-insert verification sees count > 4
      const db = createMockDb({ initialManagersCount: 3, simulateRaceCondition: true });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'concurrent@theinspireacademy.com',
          fullName: 'Concurrent Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 409);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /Concurrent creation limit exceeded/i);

      // Must have performed compensating cleanup by deleting the created Auth user
      assert.ok(db._deletedAuthUsers.length > 0, 'Must clean up newly created Auth user on concurrency violation');
    });

    test('4.2. Failure during profile update rolls back Auth user creation', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1, failOnProfileUpdate: true });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'rollback1@theinspireacademy.com',
          fullName: 'Rollback Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /rolled back/i);

      // Auth user must have been deleted in compensating cleanup
      assert.ok(db._deletedAuthUsers.length > 0);
    });

    test('4.3. Failure during permissions insert rolls back profile and Auth user', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1, failOnPermissionInsert: true });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'rollback2@theinspireacademy.com',
          fullName: 'Rollback Candidate 2',
          password: 'SecurePassword123!',
          permissions: ['dashboard', 'students'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /rolled back/i);

      assert.ok(db._deletedAuthUsers.length > 0);
    });

    test('4.4. Missing initial profile (trigger failed or omitted) triggers safe rollback and HTTP 500', async () => {
      const res = createNodeResponseMock();
      // Simulate missing profile: Auth user created but trigger did not create public.profiles record
      const db = createMockDb({ initialManagersCount: 1, missingInitialProfile: true });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'notrigger@theinspireacademy.com',
          fullName: 'No Trigger Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /profile was not automatically created|safely rolled back/i);

      // Auth user must have been rolled back
      assert.ok(db._deletedAuthUsers.length > 0, 'Auth user must be cleaned up when profile is missing');
    });

    test('4.5. Zero-row PostgREST profile update is detected as failure and rolled back', async () => {
      const res = createNodeResponseMock();
      // Simulate zero-row update where PostgREST returned 0 rows updated
      const db = createMockDb({ initialManagersCount: 1, zeroRowProfileUpdate: true });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'zerorows@theinspireacademy.com',
          fullName: 'Zero Rows Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /0 rows affected|rolled back/i);

      // Auth user must have been cleaned up
      assert.ok(db._deletedAuthUsers.length > 0);
    });

    test('4.6. Unexpected role or account state returned after update triggers rollback', async () => {
      const res = createNodeResponseMock();
      // Simulate unexpected role returned from update (e.g. remains online_student)
      const db = createMockDb({ initialManagersCount: 1, unexpectedProfileRole: 'online_student' });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'wrongrole@theinspireacademy.com',
          fullName: 'Wrong Role Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.match(json.error, /verification failed|unexpected role/i);

      // Auth user must have been cleaned up
      assert.ok(db._deletedAuthUsers.length > 0);
    });

    test('4.7. Cleanup failure produces a documented recoverable workflow with user ID and no crash', async () => {
      const res = createNodeResponseMock();
      // Simulate failure during update AND failure during deleteUser cleanup
      const db = createMockDb({ initialManagersCount: 1, failOnProfileUpdate: true, failOnCleanup: true });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'cleanupfail@theinspireacademy.com',
          fullName: 'Cleanup Fail Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      // Response includes clear administrative instructions and user identifier for manual reconciliation
      assert.match(json.error, /cleanup encountered an issue|new-user-uuid/i);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      // Must NOT leak database secrets or internal exception traces
      assert.equal(json.error.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
    });

    test('4.8. Permission deletion returning { error } without throwing triggers manual review state', async () => {
      const res = createNodeResponseMock();
      // Fail during concurrency count check (step 7) so permissions exist, and permission delete returns error
      const db = createMockDb({
        initialManagersCount: 1,
        simulateRaceCondition: true,
        failOnPermissionDeleteError: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'permdeleteerr@theinspireacademy.com',
          fullName: 'Perm Delete Error Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 409);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      assert.match(json.error, /cleanup encountered an issue|new-user-uuid/i);
      assert.ok(json.referenceId, 'Response should provide referenceId for manual review');
    });

    test('4.9. Profile deletion returning { error } without throwing triggers manual review state', async () => {
      const res = createNodeResponseMock();
      // Profile update fails, and profile delete returns PostgREST { error }
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        failOnProfileDeleteError: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'profdelerr@theinspireacademy.com',
          fullName: 'Prof Delete Error Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      assert.match(json.error, /cleanup encountered an issue/i);
      assert.ok(json.referenceId);
    });

    test('4.10. Auth user deletion returning { error } triggers manual review state', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        failOnAuthDeleteError: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'authdelerr@theinspireacademy.com',
          fullName: 'Auth Delete Error Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      assert.match(json.error, /cleanup encountered an issue/i);
    });

    test('4.11. Thrown exceptions during cleanup steps are safely caught and report recoverable failure', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        throwOnProfileDelete: true,
        throwOnAuthDelete: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'throwcleanup@theinspireacademy.com',
          fullName: 'Throw Cleanup Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      // No raw unhandled crash or secret leakage
      assert.equal(json.error.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
    });

    test('4.12. When profile was never created, absence check completes cleanly without false error', async () => {
      const res = createNodeResponseMock();
      // missingInitialProfile means profile was never inserted
      const db = createMockDb({
        initialManagersCount: 1,
        missingInitialProfile: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'absentprofile@theinspireacademy.com',
          fullName: 'Absent Profile Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'complete');
      assert.match(json.error, /safely rolled back/i);
    });

    test('4.13. Auth user creation failure with duplicate email returns HTTP 409 and sanitized message', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1 });
      // Pre-seed an auth user
      db._authUsers.set('existing-user-uuid', { id: 'existing-user-uuid', email: 'duplicate@theinspireacademy.com' });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'duplicate@theinspireacademy.com',
          fullName: 'Duplicate Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 409);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.error, 'An account with this email address already exists.');
    });

    test('4.14. Auth user creation failure with non-conflict error returns HTTP 400 and sanitized message', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnCreateUserError: true,
        createUserErrorMessage: 'Password violates provider complexity constraints',
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'invalidpass@theinspireacademy.com',
          fullName: 'Invalid Pass Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 400);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.error, 'Failed to create administrative user account. Please check the provided details.');
    });

    test('4.15. Auth user creation throwing an exception returns HTTP 500 without leaking exception trace', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        throwOnCreateUser: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'throwauth@theinspireacademy.com',
          fullName: 'Throw Auth Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.error, 'Internal authentication service error during account creation.');
      assert.equal(json.error.includes('Simulated network failure'), false);
    });

    test('4.16. Audit log insertion returning PostgREST error triggers compensating cleanup and HTTP 500', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnAuditLogInsert: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'auditfail@theinspireacademy.com',
          fullName: 'Audit Fail Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard', 'students'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'complete');
      assert.match(json.error, /Failed to record audit log.*Account safely rolled back/i);
      // Created user must have been deleted in compensating cleanup
      assert.ok(db._deletedAuthUsers.length > 0);
    });

    test('4.17. Audit log insertion throwing an exception triggers compensating cleanup and HTTP 500', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        throwOnAuditLogInsert: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'auditthrow@theinspireacademy.com',
          fullName: 'Audit Throw Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'complete');
      assert.match(json.error, /Internal failure.*Account rolled back/i);
      assert.ok(db._deletedAuthUsers.length > 0);
    });

    test('4.18. Auth user deletion verification: when getUserById finds user still present, marks cleanup as manual_review_required', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        getUserByIdStillPresent: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'persistuser@theinspireacademy.com',
          fullName: 'Persisting User Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      assert.ok(json.referenceId);
      assert.match(json.error, /cleanup encountered an issue/i);
    });

    test('4.19. Auth user deletion verification: when getUserById throws network error, marks cleanup as manual_review_required', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        getUserByIdUnverifiable: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'unverifiable@theinspireacademy.com',
          fullName: 'Unverifiable Auth Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'manual_review_required');
      assert.ok(json.referenceId);
    });

    test('4.20. Verified cascade cleanup: profile delete fails, but auth delete triggers cascade and verifies profile absent, marking cleanup complete', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        failOnProfileDeleteError: true,
        simulateCascadeOnAuthDelete: true,
      });

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'cascadeuser@theinspireacademy.com',
          fullName: 'Cascade Candidate',
          password: 'SecurePassword123!',
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const json = JSON.parse(res._getBody());
      assert.equal(json.ok, false);
      assert.equal(json.cleanupStatus, 'complete');
      assert.match(json.error, /rolled back/i);
    });
  });

  // =========================================================================
  // 5. Credential Security & Audit Logging
  // =========================================================================
  describe('5. Credential Security & Audit Trail', () => {
    test('5.1. Password is NEVER stored in audit logs or returned in responses', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({ initialManagersCount: 1 });
      const testPassword = 'SecretManagerPass2026!';

      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer valid-superadmin-token' },
        body: {
          email: 'audittest@theinspireacademy.com',
          fullName: 'Audit Test Manager',
          password: testPassword,
          permissions: ['dashboard', 'attendance'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 201);

      // Check audit log
      assert.equal(db._auditLogs.length, 1);
      const audit = db._auditLogs[0];
      assert.equal(audit.action, 'CREATE_MANAGER_ACCOUNT');
      assert.equal(audit.actor_role, 'super_admin');

      const auditStr = JSON.stringify(audit);
      assert.equal(auditStr.includes(testPassword), false, 'Audit log MUST NOT contain the password!');

      const resStr = res._getBody();
      assert.equal(resStr.includes(testPassword), false, 'Response payload MUST NOT contain the password!');
    });

    test('5.2. Internal database secrets and raw exception traces are NEVER returned in error responses', async () => {
      const res = createNodeResponseMock();
      const db = createMockDb({
        initialManagersCount: 1,
        failOnProfileUpdate: true,
        failOnCleanup: true,
      });

      const fakeSecret = 'sb_secret_key_1234567890abcdef';
      const fakePassword = 'SuperSecretRawPassword999!';

      const req = {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-superadmin-token',
          'x-test-secret': fakeSecret,
        },
        body: {
          email: 'leakcheck@theinspireacademy.com',
          fullName: 'Leak Check',
          password: fakePassword,
          permissions: ['dashboard'],
        },
      };

      await managersHandler(req, res, db);
      assert.equal(res._getStatusCode(), 500);
      const bodyStr = res._getBody();
      assert.equal(bodyStr.includes(fakeSecret), false, 'Response body must not leak headers or secrets');
      assert.equal(bodyStr.includes(fakePassword), false, 'Response body must not leak submitted password');
      assert.equal(bodyStr.includes('SUPABASE_SERVICE_ROLE_KEY'), false);
      assert.equal(bodyStr.includes('Simulated database deadlock'), false, 'Response body must not leak internal SQL error messages');
    });
  });

  // =========================================================================
  // 6. Cloudflare Pages Functions Wrapper Integration
  // =========================================================================
  describe('6. Cloudflare Pages Functions Adapter Integration', () => {
    test('6.1. functions/api/admin/managers.ts routes GET requests and returns manager list', async () => {
      const db = createMockDb({ initialManagersCount: 2 });
      const webReq = new Request('https://theinspirebusinessacademy.pages.dev/api/admin/managers', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-superadmin-token',
        },
      });

      const response = await managersFunctionHandler({
        request: webReq,
        dbClient: db,
      });

      assert.equal(response.status, 200);
      const json = await response.json();
      assert.equal(json.ok, true);
      assert.ok(Array.isArray(json.managers));
      assert.equal(json.managers.length >= 2, true);
    });
  });
});
