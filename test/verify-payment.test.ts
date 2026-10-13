import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin/verify-payment.ts';
import { provisionEnrollment } from '../api/_lib/enrollmentProvisioning.ts';

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
  admissions: Record<string, any>;
  courses: Record<string, any>;
  onlinePayments: Record<string, any>;
  studentEnrollments: Record<string, any>;
  packages?: Record<string, any>;
  auditLogs: any[];
  failEnrollmentInsert?: boolean;
}

function createMockSupabase(initialState?: Partial<MockDbState>) {
  const state: MockDbState = {
    users: {
      'admin-id': { id: 'admin-id', email: 'admin@iba.edu.pk' },
      'manager-id': { id: 'manager-id', email: 'manager@iba.edu.pk' },
      'student-id': { id: 'student-id', email: 'student@example.com' },
      ...(initialState?.users || {}),
    },
    profiles: {
      'admin-id': {
        id: 'admin-id',
        email: 'admin@iba.edu.pk',
        role: 'super_admin',
        is_active: true,
      },
      'manager-id': {
        id: 'manager-id',
        email: 'manager@iba.edu.pk',
        role: 'manager',
        is_active: true,
      },
      'student-id': {
        id: 'student-id',
        email: 'student@example.com',
        full_name: 'Bilal Ahmed',
        role: 'online_student',
        student_code: null,
        is_active: true,
      },
      ...(initialState?.profiles || {}),
    },
    managerPermissions: initialState?.managerPermissions || [
      { profile_id: 'manager-id', permission_key: 'payments' },
    ],
    admissions: {
      'adm-1': {
        id: 'adm-1',
        user_id: 'student-id',
        course_slug: 'amazon-va',
        email: 'student@example.com',
        status: 'pending',
      },
      ...(initialState?.admissions || {}),
    },
    courses: {
      'crs-1': {
        id: 'crs-1',
        slug: 'amazon-va',
        title: 'Amazon VA',
        status: 'published',
        online_duration_months: 6,
      },
      ...(initialState?.courses || {}),
    },
    onlinePayments: {
      'pay-1': {
        id: 'pay-1',
        reference_number: 'IBA-PAY-2026-001',
        transaction_id: 'TRX-12345',
        user_id: 'student-id',
        course_id: 'crs-1',
        admission_id: 'adm-1',
        course_slug: 'amazon-va',
        course_title: 'Amazon VA',
        final_amount: 5000,
        payment_status: 'pending',
      },
      ...(initialState?.onlinePayments || {}),
    },
    studentEnrollments: {
      ...(initialState?.studentEnrollments || {}),
    },
    packages: (initialState as any)?.packages || {},
    auditLogs: initialState?.auditLogs || [],
    failEnrollmentInsert: initialState?.failEnrollmentInsert || false,
  };

  const client: any = {
    _state: state,
    auth: {
      getUser: async (token?: string) => {
        if (!token) return { data: { user: null }, error: new Error('No token') };
        const user = state.users[token];
        return user ? { data: { user }, error: null } : { data: { user: null }, error: new Error('Invalid user') };
      },
    },
    from: (table: string) => {
      let currentQuery: any = {
        table,
        filters: {},
        selectedFields: '*',
      };

      const chain: any = {
        select: (fields: string = '*', options?: any) => {
          currentQuery.selectedFields = fields;
          currentQuery.countOptions = options;
          return chain;
        },
        eq: (col: string, val: any) => {
          currentQuery.filters[col] = val;
          return chain;
        },
        not: (col: string, op: string, val: any) => {
          currentQuery.notFilter = { col, op, val };
          return chain;
        },
        order: () => chain,
        limit: () => chain,
        then: (resolve: any) => {
          if (currentQuery.countOptions?.head) {
            let list: any[] = [];
            if (table === 'profiles') list = Object.values(state.profiles);
            if (currentQuery.notFilter && currentQuery.notFilter.op === 'is' && currentQuery.notFilter.val === null) {
              list = list.filter((r) => r[currentQuery.notFilter.col] !== null && r[currentQuery.notFilter.col] !== undefined);
            }
            resolve({ count: list.length, data: null, error: null });
          } else {
            if (table === 'courses') {
              let list = Object.values(state.courses);
              if (currentQuery.filters['status']) {
                list = list.filter((c: any) => c.status === currentQuery.filters['status']);
              }
              resolve({ data: list, error: null });
            } else if (table === 'packages') {
              resolve({ data: Object.values((state as any).packages || {}), error: null });
            } else {
              resolve({ data: [], error: null });
            }
          }
        },
        maybeSingle: async () => {
          return executeSingle();
        },
        single: async () => {
          return executeSingle();
        },
        insert: (data: any) => {
          if (table === 'student_enrollments') {
            if (state.failEnrollmentInsert) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: new Error('Failed to insert enrollment') }),
                }),
                then: (resolve: any) => resolve({ data: null, error: new Error('Failed to insert enrollment') }),
                data: null,
                error: new Error('Failed to insert enrollment'),
              };
            }
            const record = Array.isArray(data) ? data[0] : data;
            const id = record.id || `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const created = { id, ...record };
            state.studentEnrollments[id] = created;
            return {
              select: () => ({
                single: async () => ({ data: created, error: null }),
              }),
              then: (resolve: any) => resolve({ data: created, error: null }),
              data: created,
              error: null,
            };
          }
          if (table === 'audit_logs') {
            const records = Array.isArray(data) ? data : [data];
            state.auditLogs.push(...records);
            return {
              then: (resolve: any) => resolve({ data: records, error: null }),
              data: records,
              error: null,
            };
          }
          return {
            then: (resolve: any) => resolve({ data: null, error: null }),
            data: null,
            error: null,
          };
        },
        update: (updates: any) => {
          return {
            eq: (col: string, val: any) => {
              return {
                select: () => ({
                  single: async () => {
                    return applyUpdate(col, val, updates);
                  },
                }),
                then: (resolve: any) => {
                  const res = applyUpdate(col, val, updates);
                  resolve(res);
                },
              };
            },
          };
        },
      };

      function applyUpdate(col: string, val: any, updates: any) {
        if (table === 'online_payments') {
          const item = state.onlinePayments[val];
          if (item) {
            Object.assign(item, updates);
            return { data: item, error: null };
          }
        }
        if (table === 'profiles') {
          const item = state.profiles[val];
          if (item) {
            Object.assign(item, updates);
            return { data: item, error: null };
          }
        }
        if (table === 'student_enrollments') {
          const item = state.studentEnrollments[val] || Object.values(state.studentEnrollments).find((e: any) => e.id === val || (col && e[col] === val));
          if (item) {
            Object.assign(item, updates);
            return { data: item, error: null };
          }
        }
        if (table === 'admissions') {
          const item = state.admissions[val];
          if (item) {
            Object.assign(item, updates);
            return { data: item, error: null };
          }
        }
        return { data: null, error: new Error('Not found for update') };
      }

      function executeSingle() {
        if (table === 'profiles') {
          const id = currentQuery.filters['id'];
          const email = currentQuery.filters['email'];
          const prof = Object.values(state.profiles).find(
            (p) => (id && p.id === id) || (email && p.email?.toLowerCase() === email.toLowerCase())
          );
          return { data: prof || null, error: null };
        }
        if (table === 'courses') {
          const id = currentQuery.filters['id'];
          const slug = currentQuery.filters['slug'];
          const c = Object.values(state.courses).find(
            (cr) => (id && cr.id === id) || (slug && cr.slug === slug)
          );
          return { data: c || null, error: null };
        }
        if (table === 'packages') {
          const id = currentQuery.filters['id'];
          const slug = currentQuery.filters['slug'];
          const pkg = Object.values((state as any).packages || {}).find(
            (p: any) => (id && p.id === id) || (slug && p.slug === slug)
          );
          return { data: pkg || null, error: null };
        }
        if (table === 'online_payments') {
          const id = currentQuery.filters['id'];
          const p = state.onlinePayments[id];
          return { data: p || null, error: null };
        }
        if (table === 'admissions') {
          const id = currentQuery.filters['id'];
          const adm = state.admissions[id];
          return { data: adm || null, error: null };
        }
        if (table === 'student_enrollments') {
          const userId = currentQuery.filters['user_id'];
          const courseId = currentQuery.filters['course_id'];
          const enr = Object.values(state.studentEnrollments).find(
            (e) => e.user_id === userId && (!courseId || e.course_id === courseId)
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

describe('verify-payment API Handler', () => {
  test('1. Verifies payment only: marks verified and leaves access_status pending without enrollments', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-1', action: 'verify_only' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.payment.payment_status, 'verified');
    assert.equal(res.body.accessStatus, 'pending');

    // No enrollments created yet
    const enrollments = Object.values(mockDb._state.studentEnrollments);
    assert.equal(enrollments.length, 0, 'No enrollments should be created on verify_only');

    // Audit log written
    const audit = mockDb._state.auditLogs.find(
      (a: any) => a.action === 'verify_online_payment' && a.entity_id === 'pay-1'
    );
    assert.ok(audit, 'Audit log row must be recorded');
  });

  test('1b. Grants access: marks access_status granted and provisions student enrollment', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-1', grantAccess: true },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.payment.payment_status, 'verified');
    assert.equal(res.body.accessStatus, 'granted');
    assert.ok(res.body.enrollment);
    assert.ok(res.body.enrollment.studentCode);
    assert.ok(res.body.enrollment.expiryDate);

    // Profile updated with student code and role
    const studentProfile = mockDb._state.profiles['student-id'];
    assert.equal(studentProfile.role, 'online_student');
    assert.ok(studentProfile.student_code.startsWith('IBA-ONL-'));

    // Enrollment created
    const enrollments = Object.values(mockDb._state.studentEnrollments);
    assert.equal(enrollments.length, 1);
    const createdEnrollment = enrollments[0] as any;
    assert.equal(createdEnrollment.status, 'active');
    assert.equal(createdEnrollment.payment_id, 'pay-1');
  });

  test('2. Idempotent: granting twice does not create duplicate enrollments', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-1', grantAccess: true },
    };

    // First call
    const res1 = createMockRes();
    await handler(req, res1, mockDb);
    assert.equal(res1.statusCode, 200);
    assert.equal(res1.body.ok, true);

    const initialEnrollmentsCount = Object.values(mockDb._state.studentEnrollments).length;
    assert.equal(initialEnrollmentsCount, 1);

    // Second call
    const res2 = createMockRes();
    await handler(req, res2, mockDb);
    assert.equal(res2.statusCode, 200);
    assert.equal(res2.body.ok, true);

    // No duplicate enrollment created
    const finalEnrollmentsCount = Object.values(mockDb._state.studentEnrollments).length;
    assert.equal(finalEnrollmentsCount, 1, 'Duplicate enrollment must NOT be created');
  });

  test('3. Returns clear error and keeps payment verified if enrollment provisioning fails on grant', async () => {
    const mockDb = createMockSupabase({ failEnrollmentInsert: true });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-1', grantAccess: true },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.provisioningFailed, true);
    // Payment remains verified so admin can retry
    assert.equal(mockDb._state.onlinePayments['pay-1'].payment_status, 'verified');
  });

  test('4. Permission check: manager without payments permission is denied', async () => {
    const mockDb = createMockSupabase({
      managerPermissions: [{ profile_id: 'manager-id', permission_key: 'registrations' }],
    });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-id' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
  });

  test('5. Initial creates once: creates enrollment and sets dates based on course', async () => {
    const mockDb = createMockSupabase();
    const result = await provisionEnrollment({
      supabase: mockDb,
      userId: 'student-id',
      courseId: 'crs-1',
      paymentId: 'pay-1',
      mode: 'initial',
    });

    assert.equal(result.ok, true);
    assert.equal(result.isExisting, false);
    assert.equal(result.status, 'active');
    assert.ok(result.startDate);
    assert.ok(result.expiryDate);

    // Verify enrollment count in DB
    const enrollments = Object.values(mockDb._state.studentEnrollments);
    assert.equal(enrollments.length, 1);
    const firstEnr = enrollments[0] as any;
    assert.equal(firstEnr.status, 'active');
    assert.equal(firstEnr.payment_id, 'pay-1');
  });

  test('6. Recheck keeps dates: does not overwrite existing active enrollment dates', async () => {
    const originalStartDate = '2025-01-10';
    const originalExpiryDate = '2027-01-10'; // future date (not expired)

    const mockDb = createMockSupabase({
      onlinePayments: {
        'pay-1': {
          id: 'pay-1',
          reference_number: 'IBA-PAY-2026-001',
          transaction_id: 'TRX-12345',
          user_id: 'student-id',
          course_id: 'crs-1',
          admission_id: 'adm-1',
          course_slug: 'amazon-va',
          course_title: 'Amazon VA',
          final_amount: 5000,
          payment_status: 'verified', // already verified payment
          access_status: 'granted',
        },
      },
      studentEnrollments: {
        'enr-existing': {
          id: 'enr-existing',
          user_id: 'student-id',
          course_id: 'crs-1',
          status: 'active',
          start_date: originalStartDate,
          expiry_date: originalExpiryDate,
          student_code: 'IBA-ONL-2025-0042',
          payment_id: 'pay-1',
        },
      },
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.message, 'Payment was already verified.');
    assert.equal(res.body.enrollment.expiryDate, originalExpiryDate);

    // DB state must be completely unchanged
    const enr = mockDb._state.studentEnrollments['enr-existing'];
    assert.equal(enr.start_date, originalStartDate, 'start_date must NOT be changed');
    assert.equal(enr.expiry_date, originalExpiryDate, 'expiry_date must NOT be changed');
    assert.equal(enr.status, 'active');
  });

  test('7. Recheck does not reactivate a suspended enrollment', async () => {
    const originalStartDate = '2025-01-10';
    const originalExpiryDate = '2027-01-10';

    const mockDb = createMockSupabase({
      onlinePayments: {
        'pay-1': {
          id: 'pay-1',
          reference_number: 'IBA-PAY-2026-001',
          transaction_id: 'TRX-12345',
          user_id: 'student-id',
          course_id: 'crs-1',
          admission_id: 'adm-1',
          course_slug: 'amazon-va',
          course_title: 'Amazon VA',
          final_amount: 5000,
          payment_status: 'verified',
          access_status: 'granted',
        },
      },
      studentEnrollments: {
        'enr-suspended': {
          id: 'enr-suspended',
          user_id: 'student-id',
          course_id: 'crs-1',
          status: 'suspended',
          start_date: originalStartDate,
          expiry_date: originalExpiryDate,
          student_code: 'IBA-ONL-2025-0042',
          payment_id: 'pay-1',
        },
      },
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.enrollment.status, 'suspended', 'Must remain suspended');
    assert.ok(res.body.enrollment.note, 'Must include a note indicating not reactivated');
    assert.match(res.body.enrollment.note, /suspended/i);

    // Verify DB record status was NOT changed to active
    const enr = mockDb._state.studentEnrollments['enr-suspended'];
    assert.equal(enr.status, 'suspended', 'Database status must remain suspended');
    assert.equal(enr.start_date, originalStartDate);
    assert.equal(enr.expiry_date, originalExpiryDate);
  });

  // Task 0 Fix: When payment is verified with access pending, re-clicking verify without grant does NOT create an enrollment
  test('8. Re-clicking verify on a verified-pending-access payment does NOT create an enrollment', async () => {
    const mockDb = createMockSupabase({
      onlinePayments: {
        'pay-pending-access': {
          id: 'pay-pending-access',
          reference_number: 'IBA-PAY-2026-008',
          transaction_id: 'TRX-PENDING-ACC',
          user_id: 'student-id',
          course_id: 'crs-1',
          admission_id: 'adm-1',
          course_slug: 'amazon-va',
          course_title: 'Amazon VA',
          final_amount: 5000,
          payment_status: 'verified',
          access_status: 'pending',
        },
      },
      studentEnrollments: {},
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: { paymentId: 'pay-pending-access' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.accessStatus, 'pending');
    assert.equal(res.body.enrollment.studentCode, null);
    assert.equal(res.body.enrollment.expiryDate, null);

    // DB state must have ZERO enrollments created
    const enrollmentsCount = Object.keys(mockDb._state.studentEnrollments).length;
    assert.equal(enrollmentsCount, 0, 'No enrollments should be created when access is pending');
  });

  // Task 0 / Task 1: Granting a payment already verified-with-access-pending provisions ALL courses in selected_course_ids
  test('9. Granting access on a verified-with-access-pending payment provisions all courses in selected_course_ids', async () => {
    const mockDb = createMockSupabase({
      courses: {
        'crs-1': {
          id: 'crs-1',
          slug: 'amazon-va',
          title: 'Amazon VA',
          status: 'published',
          online_duration_months: 6,
        },
        'crs-2': {
          id: 'crs-2',
          slug: 'digital-marketing',
          title: 'Digital Marketing',
          status: 'published',
          online_duration_months: 6,
        },
      },
      onlinePayments: {
        'pay-bundle': {
          id: 'pay-bundle',
          reference_number: 'IBA-PAY-2026-BUNDLE',
          transaction_id: 'TRX-BUNDLE-1',
          user_id: 'student-id',
          request_type: 'package',
          selected_course_ids: ['crs-1', 'crs-2'],
          final_amount: 9000,
          payment_status: 'verified',
          access_status: 'pending',
        },
      },
      studentEnrollments: {},
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: {
        paymentId: 'pay-bundle',
        accessAction: 'grant_now',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.accessStatus, 'granted');
    assert.deepEqual(res.body.provisionedCourses, ['crs-1', 'crs-2']);

    // Check that BOTH courses are enrolled in DB
    const enrollments = Object.values(mockDb._state.studentEnrollments) as any[];
    assert.equal(enrollments.length, 2, 'Must have enrolled into both courses');
    const courseIds = enrollments.map((e) => e.course_id);
    assert.ok(courseIds.includes('crs-1'));
    assert.ok(courseIds.includes('crs-2'));
  });

  // Task 0: all_courses package granting provisions every published online course
  test('10. Granting an all_courses package provisions all published online courses', async () => {
    const mockDb = createMockSupabase({
      courses: {
        'crs-1': {
          id: 'crs-1',
          slug: 'amazon-va',
          title: 'Amazon VA',
          status: 'published',
          online_duration_months: 6,
        },
        'crs-2': {
          id: 'crs-2',
          slug: 'web-dev',
          title: 'Web Development',
          status: 'published',
          online_duration_months: 6,
        },
      },
      packages: {
        'pkg-all': {
          id: 'pkg-all',
          slug: 'all-courses',
          title: 'All Courses Pack',
          package_type: 'all_courses',
          is_active: true,
          price: 15000,
        },
      },
      onlinePayments: {
        'pay-all-courses': {
          id: 'pay-all-courses',
          reference_number: 'IBA-PAY-ALL',
          transaction_id: 'TRX-ALL-1',
          user_id: 'student-id',
          package_id: 'pkg-all',
          request_type: 'package',
          final_amount: 15000,
          payment_status: 'pending',
          access_status: 'pending',
        },
      },
      studentEnrollments: {},
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-id' },
      body: {
        paymentId: 'pay-all-courses',
        accessAction: 'grant_now',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.accessStatus, 'granted');
    assert.deepEqual(res.body.provisionedCourses, ['crs-1', 'crs-2']);

    const enrollments = Object.values(mockDb._state.studentEnrollments) as any[];
    assert.equal(enrollments.length, 2);
  });
});
