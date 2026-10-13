import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin/online-students.ts';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key: string, value: string) {
      res.headers[key] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

interface MockDbState {
  users: Record<string, { id: string; email: string }>;
  profiles: Record<string, any>;
  managerPermissions: Array<{ profile_id: string; permission_key: string }>;
  auditLogs: any[];
}

function createMockSupabase(initialState?: Partial<MockDbState>) {
  const state: MockDbState = {
    users: {
      'admin-id': { id: 'admin-id', email: 'admin@iba.edu.pk' },
      'manager-permitted-id': { id: 'manager-permitted-id', email: 'manager-ok@iba.edu.pk' },
      'manager-denied-id': { id: 'manager-denied-id', email: 'manager-no@iba.edu.pk' },
      'student-id': { id: 'student-id', email: 'student@example.com' },
      'other-admin-id': { id: 'other-admin-id', email: 'admin2@iba.edu.pk' },
      'other-manager-id': { id: 'other-manager-id', email: 'manager2@iba.edu.pk' },
      ...(initialState?.users || {}),
    },
    profiles: {
      'admin-id': {
        id: 'admin-id',
        email: 'admin@iba.edu.pk',
        full_name: 'Main Admin',
        role: 'super_admin',
        is_active: true,
      },
      'manager-permitted-id': {
        id: 'manager-permitted-id',
        email: 'manager-ok@iba.edu.pk',
        full_name: 'Manager OK',
        role: 'manager',
        is_active: true,
      },
      'manager-denied-id': {
        id: 'manager-denied-id',
        email: 'manager-no@iba.edu.pk',
        full_name: 'Manager Denied',
        role: 'manager',
        is_active: true,
      },
      'student-id': {
        id: 'student-id',
        email: 'student@example.com',
        full_name: 'Farhan Ali',
        phone: '03001234567',
        city: 'Sadiqabad',
        role: 'online_student',
        student_code: 'IBA-ONL-2026-0010',
        is_active: true,
      },
      'other-admin-id': {
        id: 'other-admin-id',
        email: 'admin2@iba.edu.pk',
        full_name: 'Other Admin',
        role: 'super_admin',
        is_active: true,
      },
      'other-manager-id': {
        id: 'other-manager-id',
        email: 'manager2@iba.edu.pk',
        full_name: 'Other Manager',
        role: 'manager',
        is_active: true,
      },
      ...(initialState?.profiles || {}),
    },
    managerPermissions: initialState?.managerPermissions || [
      { profile_id: 'manager-permitted-id', permission_key: 'enrollments' },
      { profile_id: 'manager-denied-id', permission_key: 'registrations' },
    ],
    auditLogs: initialState?.auditLogs || [],
  };

  const client: any = {
    _state: state,
    auth: {
      getUser: async (token?: string) => {
        if (!token) return { data: { user: null }, error: new Error('No token') };
        const user = state.users[token];
        return user ? { data: { user }, error: null } : { data: { user: null }, error: new Error('Invalid user') };
      },
      admin: {
        updateUserById: async (uid: string, attrs: any) => {
          if (state.users[uid]) {
            Object.assign(state.users[uid], attrs);
          }
          return { data: { id: uid }, error: null };
        },
      },
      resetPasswordForEmail: async (email: string) => {
        return { data: {}, error: null };
      },
    },
    from: (table: string) => {
      let currentQuery: any = {
        table,
        filters: {},
      };

      const chain: any = {
        select: () => chain,
        eq: (col: string, val: any) => {
          currentQuery.filters[col] = val;
          return chain;
        },
        maybeSingle: async () => executeSingle(),
        single: async () => executeSingle(),
        insert: async (data: any) => {
          if (table === 'audit_logs') {
            const records = Array.isArray(data) ? data : [data];
            state.auditLogs.push(...records);
            return { data: records, error: null };
          }
          return { data: null, error: null };
        },
        update: (updates: any) => {
          return {
            eq: (col: string, val: any) => ({
              select: () => ({
                single: async () => {
                  const target = state.profiles[val];
                  if (target) {
                    Object.assign(target, updates);
                    return { data: target, error: null };
                  }
                  return { data: null, error: new Error('Profile not found') };
                },
              }),
            }),
          };
        },
      };

      function executeSingle() {
        if (table === 'profiles') {
          const id = currentQuery.filters['id'];
          return { data: state.profiles[id] || null, error: null };
        }
        if (table === 'manager_permissions') {
          const profileId = currentQuery.filters['profile_id'];
          const permKey = currentQuery.filters['permission_key'];
          const perm = state.managerPermissions.find(
            (p) => p.profile_id === profileId && p.permission_key === permKey
          );
          return { data: perm || null, error: null };
        }
        return { data: null, error: null };
      }

      return chain;
    },
  };

  return client;
}

describe('online-students API Handler', () => {
  test('1. Permission denied for managers without enrollments permission', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-denied-id' },
      body: { action: 'activate', studentId: 'student-id' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
  });

  test('2. Cannot touch admin or staff accounts (role is super_admin or manager)', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { action: 'deactivate', studentId: 'other-admin-id' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Only online_student profiles/);
  });

  test('2b. Cannot touch manager accounts', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { action: 'update', studentId: 'other-manager-id', fullName: 'Hacked' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
  });

  test('3. Deactivates online student and records audit log with reason', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: {
        action: 'deactivate',
        studentId: 'student-id',
        reason: 'Payment fraud verification failed',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(mockDb._state.profiles['student-id'].is_active, false);

    // Audit log check
    const audit = mockDb._state.auditLogs.find(
      (a: any) => a.action === 'deactivate_online_student' && a.entity_id === 'student-id'
    );
    assert.ok(audit, 'Audit log row must be recorded');
    assert.equal(audit.details.reason, 'Payment fraud verification failed');
  });

  test('4. Activates online student and records audit log', async () => {
    const mockDb = createMockSupabase();
    mockDb._state.profiles['student-id'].is_active = false;

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-permitted-id' },
      body: { action: 'activate', studentId: 'student-id' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(mockDb._state.profiles['student-id'].is_active, true);

    const audit = mockDb._state.auditLogs.find(
      (a: any) => a.action === 'activate_online_student' && a.entity_id === 'student-id'
    );
    assert.ok(audit, 'Audit log row must be recorded');
  });

  test('5. Updates student profile (name, phone, city, email) and records audit log', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: {
        action: 'update',
        studentId: 'student-id',
        fullName: 'Farhan Ali Updated',
        phone: '03009999999',
        city: 'Rahim Yar Khan',
        email: 'farhan.updated@example.com',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);

    const updatedProf = mockDb._state.profiles['student-id'];
    assert.equal(updatedProf.full_name, 'Farhan Ali Updated');
    assert.equal(updatedProf.phone, '03009999999');
    assert.equal(updatedProf.city, 'Rahim Yar Khan');
    assert.equal(updatedProf.email, 'farhan.updated@example.com');

    const audit = mockDb._state.auditLogs.find(
      (a: any) => a.action === 'update_online_student' && a.entity_id === 'student-id'
    );
    assert.ok(audit, 'Audit log row must be recorded');
  });

  test('6. Sends password reset and records audit log', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: {
        action: 'reset_password',
        studentId: 'student-id',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.match(res.body.message, /Password reset email sent/);

    const audit = mockDb._state.auditLogs.find(
      (a: any) => a.action === 'reset_password_online_student' && a.entity_id === 'student-id'
    );
    assert.ok(audit, 'Audit log row must be recorded');
  });

  test('7. Missing SUPABASE_SERVICE_ROLE_KEY returns "Server is not configured: add SUPABASE_SERVICE_ROLE_KEY"', async () => {
    // When dbClient is omitted and env var is missing
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const req = {
        method: 'POST',
        headers: { authorization: 'Bearer admin-id' },
        body: { action: 'activate', studentId: 'student-id' },
      };
      const res = createMockRes();

      await handler(req, res);

      assert.equal(res.statusCode, 500);
      assert.equal(res.body.error, 'Server is not configured: add SUPABASE_SERVICE_ROLE_KEY');
    } finally {
      if (origKey !== undefined) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
      }
    }
  });
});
