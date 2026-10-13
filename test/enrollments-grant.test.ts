import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin/enrollments.ts';

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

function createMockSupabase(initialState?: any) {
  const state: any = {
    users: {
      'admin-id': { id: 'admin-id', email: 'admin@iba.edu.pk' },
      'student-id': { id: 'student-id', email: 'student@example.com' },
    },
    profiles: {
      'admin-id': { id: 'admin-id', email: 'admin@iba.edu.pk', role: 'super_admin', is_active: true },
      'student-id': { id: 'student-id', email: 'student@example.com', role: 'online_student', is_active: true },
    },
    courses: {
      'crs-1': { id: 'crs-1', slug: 'amazon-va', title: 'Amazon VA', status: 'published', online_duration_months: 6 },
    },
    studentEnrollments: initialState?.studentEnrollments || {},
    auditLogs: [],
  };

  const client: any = {
    _state: state,
    auth: {
      getUser: async (token?: string) => {
        const u = token ? state.users[token] : null;
        return u ? { data: { user: u }, error: null } : { data: { user: null }, error: new Error('Invalid') };
      },
    },
    from: (table: string) => {
      let currentQuery: any = { table, filters: {} };
      const chain: any = {
        select: (fields: string = '*', options?: any) => {
          currentQuery.countOptions = options;
          return chain;
        },
        eq: (col: string, val: any) => {
          currentQuery.filters[col] = val;
          return chain;
        },
        not: () => chain,
        order: () => chain,
        limit: () => chain,
        then: (resolve: any) => {
          if (currentQuery.countOptions?.head) {
            resolve({ count: Object.keys(state.profiles).length, data: null, error: null });
          } else {
            resolve({ data: Object.values(state[table] || {}), error: null });
          }
        },
        maybeSingle: async () => executeSingle(),
        single: async () => executeSingle(),
        insert: (data: any) => {
          const record = Array.isArray(data) ? data[0] : data;
          const id = record.id || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const created = { id, ...record };
          if (table === 'student_enrollments') state.studentEnrollments[id] = created;
          if (table === 'audit_logs') state.auditLogs.push(created);
          return {
            select: () => ({ single: async () => ({ data: created, error: null }) }),
            then: (resolve: any) => resolve({ data: created, error: null }),
            data: created,
            error: null,
          };
        },
        update: (updates: any) => ({
          eq: (col: string, val: any) => {
            const item = state[table]?.[val] || Object.values(state[table] || {}).find((i: any) => i[col] === val);
            if (item) Object.assign(item, updates);
            return {
              select: () => ({ single: async () => ({ data: item, error: null }) }),
              then: (resolve: any) => resolve({ data: item, error: null }),
            };
          },
        }),
      };

      function executeSingle() {
        if (table === 'profiles') {
          const id = currentQuery.filters['id'];
          return { data: state.profiles[id] || null, error: null };
        }
        if (table === 'courses') {
          const id = currentQuery.filters['id'];
          return { data: state.courses[id] || null, error: null };
        }
        if (table === 'student_enrollments') {
          const id = currentQuery.filters['id'];
          const uid = currentQuery.filters['user_id'];
          const cid = currentQuery.filters['course_id'];
          const enr = Object.values(state.studentEnrollments).find((e: any) =>
            (id && e.id === id) || (uid && e.user_id === uid && (!cid || e.course_id === cid))
          );
          return { data: enr || null, error: null };
        }
        return { data: null, error: null };
      }

      return chain;
    },
  };
  return client;
}

describe('admin enrollments API Handler - Manual Grant Action', () => {
  test('Manual grant provisions course enrollment without payment and logs audit', async () => {
    const mockDb = createMockSupabase();

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: {
        action: 'grant',
        userId: 'student-id',
        courseId: 'crs-1',
        reason: 'Staff scholarship grant',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.message, 'Course access successfully granted.');
    assert.ok(res.body.studentCode);
    assert.ok(res.body.expiryDate);

    // Verify enrollment in DB
    const enrollments = Object.values(mockDb._state.studentEnrollments) as any[];
    assert.equal(enrollments.length, 1);
    assert.equal(enrollments[0].user_id, 'student-id');
    assert.equal(enrollments[0].course_id, 'crs-1');
    assert.equal(enrollments[0].status, 'active');

    // Verify audit log
    const auditLogs = mockDb._state.auditLogs;
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].action, 'manual_grant_enrollment');
  });

  test('Requires userId and courseId for manual grant', async () => {
    const mockDb = createMockSupabase();

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { action: 'grant' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /User ID and Course ID are required/i);
  });
});
