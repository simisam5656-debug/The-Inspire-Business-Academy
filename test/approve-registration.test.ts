import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin/approve-registration.ts';

// Helper to create mock response object
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

// In-memory mock database state
interface MockDbState {
  users: Record<string, { id: string; email: string }>;
  profiles: Record<string, any>;
  managerPermissions: Array<{ profile_id: string; permission_key: string }>;
  admissions: Record<string, any>;
  courses: Record<string, any>;
  onlinePayments: Record<string, any>;
  studentEnrollments: Record<string, any>;
  auditLogs: any[];
  failAuditInsert?: boolean;
  failProfileUpdate?: boolean;
  failEnrollmentLookup?: boolean;
  failEnrollmentMutation?: boolean;
  failAdmissionUpdate?: boolean;
}

function createMockSupabase(initialState?: Partial<MockDbState>) {
  const state: MockDbState = {
    users: {
      'super-admin-user-id': { id: 'super-admin-user-id', email: 'admin@iba.edu.pk' },
      'manager-user-id': { id: 'manager-user-id', email: 'manager@iba.edu.pk' },
      'inactive-staff-id': { id: 'inactive-staff-id', email: 'inactive@iba.edu.pk' },
      'student-user-id': { id: 'student-user-id', email: 'student@example.com' },
      ...(initialState?.users || {}),
    },
    profiles: {
      'super-admin-user-id': {
        id: 'super-admin-user-id',
        email: 'admin@iba.edu.pk',
        full_name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
      },
      'manager-user-id': {
        id: 'manager-user-id',
        email: 'manager@iba.edu.pk',
        full_name: 'Manager Staff',
        role: 'manager',
        is_active: true,
      },
      'inactive-staff-id': {
        id: 'inactive-staff-id',
        email: 'inactive@iba.edu.pk',
        full_name: 'Disabled Staff',
        role: 'manager',
        is_active: false,
      },
      'student-user-id': {
        id: 'student-user-id',
        email: 'student@example.com',
        full_name: 'Ali Raza',
        role: 'online_student',
        student_code: 'IBA-ONL-2026-0042',
        is_active: true,
      },
      ...(initialState?.profiles || {}),
    },
    managerPermissions: initialState?.managerPermissions || [
      { profile_id: 'manager-user-id', permission_key: 'registrations' },
    ],
    admissions: {
      'adm-valid-1': {
        id: 'adm-valid-1',
        reference_number: 'IBA-ADM-2026-001',
        admission_type: 'online',
        full_name: 'Ali Raza',
        email: 'student@example.com',
        phone: '03001234567',
        course_slug: 'amazon-va',
        course_title: 'Amazon Virtual Assistant',
        status: 'pending',
        user_id: 'student-user-id',
        created_at: new Date().toISOString(),
      },
      'adm-no-payment': {
        id: 'adm-no-payment',
        reference_number: 'IBA-ADM-2026-002',
        admission_type: 'online',
        full_name: 'Zahid Khan',
        email: 'zahid@example.com',
        phone: '03007654321',
        course_slug: 'amazon-va',
        course_title: 'Amazon Virtual Assistant',
        status: 'pending',
        user_id: 'student-user-id',
        created_at: new Date().toISOString(),
      },
      'adm-already-approved': {
        id: 'adm-already-approved',
        reference_number: 'IBA-ADM-2026-003',
        admission_type: 'online',
        full_name: 'Fatima Noor',
        email: 'fatima@example.com',
        phone: '03112233445',
        course_slug: 'amazon-va',
        course_title: 'Amazon Virtual Assistant',
        status: 'approved',
        user_id: 'student-user-id',
        reviewed_by: 'super-admin-user-id',
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      'adm-archived-course': {
        id: 'adm-archived-course',
        reference_number: 'IBA-ADM-2026-005',
        admission_type: 'online',
        full_name: 'Tariq Mehmood',
        email: 'tariq@example.com',
        phone: '03221111222',
        course_slug: 'archived-legacy-course',
        course_title: 'Legacy Archived Course',
        status: 'pending',
        user_id: 'student-user-id',
        created_at: new Date().toISOString(),
      },
      ...(initialState?.admissions || {}),
    },
    courses: {
      'amazon-va': {
        id: 'course-amazon-id',
        slug: 'amazon-va',
        title: 'Amazon Virtual Assistant',
        status: 'published',
        duration_value: 6,
        duration_unit: 'months',
      },
      'archived-legacy-course': {
        id: 'course-archived-id',
        slug: 'archived-legacy-course',
        title: 'Legacy Archived Course',
        status: 'archived',
        duration_value: 6,
        duration_unit: 'months',
      },
      ...(initialState?.courses || {}),
    },
    onlinePayments: {
      'pay-verified-1': {
        id: 'pay-verified-1',
        admission_id: 'adm-valid-1',
        reference_number: 'PAY-REF-001',
        transaction_id: 'TXN-VERIFIED-12345',
        final_amount: 5000,
        payment_status: 'verified',
        created_at: new Date().toISOString(),
      },
      'pay-pending-1': {
        id: 'pay-pending-1',
        admission_id: 'adm-pending-pay',
        reference_number: 'PAY-REF-002',
        transaction_id: 'TXN-PENDING-99999',
        final_amount: 5000,
        payment_status: 'pending',
        created_at: new Date().toISOString(),
      },
      'pay-archived-1': {
        id: 'pay-archived-1',
        admission_id: 'adm-archived-course',
        reference_number: 'PAY-REF-003',
        transaction_id: 'TXN-ARCHIVED-111',
        final_amount: 5000,
        payment_status: 'verified',
        created_at: new Date().toISOString(),
      },
      ...(initialState?.onlinePayments || {}),
    },
    studentEnrollments: {
      'enr-already-approved': {
        id: 'enr-already-approved',
        user_id: 'student-user-id',
        course_id: 'course-amazon-id',
        status: 'active',
        student_code: 'IBA-ONL-2026-0042',
        start_date: '2026-10-01',
        expiry_date: '2027-04-01',
        payment_id: 'pay-verified-1',
      },
      ...(initialState?.studentEnrollments || {}),
    },
    auditLogs: [...(initialState?.auditLogs || [])],
    failAuditInsert: initialState?.failAuditInsert,
    failProfileUpdate: initialState?.failProfileUpdate,
    failEnrollmentLookup: initialState?.failEnrollmentLookup,
    failEnrollmentMutation: initialState?.failEnrollmentMutation,
    failAdmissionUpdate: initialState?.failAdmissionUpdate,
  };

  // Add adm-pending-pay admission referencing pay-pending-1
  if (!state.admissions['adm-pending-pay']) {
    state.admissions['adm-pending-pay'] = {
      id: 'adm-pending-pay',
      reference_number: 'IBA-ADM-2026-004',
      admission_type: 'online',
      full_name: 'Usman Ali',
      email: 'usman@example.com',
      phone: '03211234567',
      course_slug: 'amazon-va',
      course_title: 'Amazon Virtual Assistant',
      status: 'pending',
      user_id: 'student-user-id',
      created_at: new Date().toISOString(),
    };
  }

  const mockClient = {
    auth: {
      async getUser(token: string) {
        if (!token || token === 'invalid-token' || token === 'expired-token') {
          return { data: { user: null }, error: new Error('Invalid token') };
        }
        const user = state.users[token];
        if (!user) {
          return { data: { user: null }, error: new Error('User not found') };
        }
        return { data: { user }, error: null };
      },
    },
    from(table: string) {
      let selectedCols = '*';
      let filters: Array<{ col: string; val: any; op?: string }> = [];
      let orderByCol = '';
      let isAscending = true;
      let limitCount: number | null = null;
      let isCountHead = false;

      const queryBuilder: any = {
        select(cols: string = '*', options?: { count?: string; head?: boolean }) {
          selectedCols = cols;
          if (options?.head) {
            isCountHead = true;
          }
          return queryBuilder;
        },
        eq(col: string, val: any) {
          filters.push({ col, val, op: 'eq' });
          return queryBuilder;
        },
        not(col: string, op: string, val: any) {
          filters.push({ col, val, op: 'not' });
          return queryBuilder;
        },
        order(col: string, opts?: { ascending?: boolean }) {
          orderByCol = col;
          isAscending = opts?.ascending ?? true;
          return queryBuilder;
        },
        limit(n: number) {
          limitCount = n;
          return queryBuilder;
        },
        async maybeSingle() {
          if (table === 'student_enrollments' && state.failEnrollmentLookup) {
            return { data: null, error: new Error('Database read failure on enrollment query') };
          }
          const list = await queryBuilder.executeSelect();
          return { data: list.length > 0 ? list[0] : null, error: null };
        },
        async single() {
          const list = await queryBuilder.executeSelect();
          if (list.length === 0) {
            return { data: null, error: new Error('Record not found') };
          }
          return { data: list[0], error: null };
        },
        async executeSelect() {
          let rows: any[] = [];
          if (table === 'profiles') {
            rows = Object.values(state.profiles);
          } else if (table === 'manager_permissions') {
            rows = [...state.managerPermissions];
          } else if (table === 'admissions') {
            rows = Object.values(state.admissions);
          } else if (table === 'courses') {
            rows = Object.values(state.courses);
          } else if (table === 'online_payments') {
            rows = Object.values(state.onlinePayments);
          } else if (table === 'student_enrollments') {
            rows = Object.values(state.studentEnrollments);
          } else if (table === 'audit_logs') {
            rows = [...state.auditLogs];
          }

          // Apply filters
          for (const f of filters) {
            if (f.op === 'eq') {
              rows = rows.filter((r) => r[f.col] === f.val);
            } else if (f.op === 'not' && f.val === null) {
              rows = rows.filter((r) => r[f.col] !== null && r[f.col] !== undefined);
            }
          }

          if (isCountHead) {
            return rows;
          }

          return rows;
        },
        async insert(payload: any) {
          if (table === 'audit_logs' && state.failAuditInsert) {
            return { data: null, error: new Error('Failed to insert audit log: disk error') };
          }

          if (table === 'student_enrollments' && state.failEnrollmentMutation) {
            return {
              select() {
                return { single: async () => ({ data: null, error: new Error('Enrollment insert failed') }) };
              },
              data: null,
              error: new Error('Enrollment insert failed'),
            };
          }

          const item = Array.isArray(payload) ? payload[0] : payload;
          const id = item.id || `gen-id-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const fullItem = { ...item, id };

          if (table === 'student_enrollments') {
            state.studentEnrollments[id] = fullItem;
          } else if (table === 'audit_logs') {
            state.auditLogs.push(fullItem);
          }

          return {
            select() {
              return {
                single: async () => ({ data: fullItem, error: null }),
              };
            },
            data: fullItem,
            error: null,
          };
        },
        update(payload: any) {
          return {
            eq(col: string, val: any) {
              if (table === 'profiles' && state.failProfileUpdate) {
                return {
                  then: async (resolve: any) => resolve({ data: null, error: new Error('Profile update failed') }),
                  error: new Error('Profile update failed'),
                };
              }

              if (table === 'student_enrollments' && state.failEnrollmentMutation) {
                return {
                  select() {
                    return {
                      single: async () => ({ data: null, error: new Error('Enrollment update failed') }),
                    };
                  },
                  then: async (resolve: any) => resolve({ data: null, error: new Error('Enrollment update failed') }),
                  error: new Error('Enrollment update failed'),
                };
              }

              if (table === 'admissions' && state.failAdmissionUpdate) {
                return {
                  select() {
                    return {
                      single: async () => ({ data: null, error: new Error('Admission update failed') }),
                    };
                  },
                  error: new Error('Admission update failed'),
                };
              }

              return {
                select() {
                  return {
                    single: async () => {
                      if (table === 'admissions') {
                        const adm = state.admissions[val];
                        if (adm) {
                          Object.assign(adm, payload);
                          return { data: adm, error: null };
                        }
                      } else if (table === 'online_payments') {
                        const pay = state.onlinePayments[val];
                        if (pay) {
                          Object.assign(pay, payload);
                          return { data: pay, error: null };
                        }
                      } else if (table === 'student_enrollments') {
                        const enr = state.studentEnrollments[val];
                        if (enr) {
                          Object.assign(enr, payload);
                          return { data: enr, error: null };
                        }
                      }
                      return { data: null, error: new Error('Not found for update') };
                    },
                  };
                },
                then: async (resolve: any) => {
                  if (table === 'profiles') {
                    const prof = state.profiles[val];
                    if (prof) Object.assign(prof, payload);
                  } else if (table === 'online_payments') {
                    const pay = state.onlinePayments[val];
                    if (pay) Object.assign(pay, payload);
                  }
                  resolve({ data: null, error: null });
                },
              };
            },
          };
        },
        delete() {
          return {
            eq(col: string, val: any) {
              if (table === 'student_enrollments') {
                delete state.studentEnrollments[val];
              }
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
        then: async (resolve: any) => {
          const list = await queryBuilder.executeSelect();
          if (isCountHead) {
            resolve({ count: list.length, data: null, error: null });
          } else {
            resolve({ data: list, error: null });
          }
        },
      };

      return queryBuilder;
    },
    _state: state,
  };

  return mockClient;
}

describe('Approval Endpoint Security Tests (approve-registration.ts)', () => {
  // 1. Missing Token: rejected with HTTP 401
  test('1. Missing token: rejected with HTTP 401', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: {},
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Bearer authentication token is required/i);
  });

  // 2. Invalid Token: rejected with HTTP 401
  test('2. Invalid token: rejected with HTTP 401', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer invalid-token' },
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Invalid or expired session token/i);
  });

  // 3. Inactive staff account: rejected with HTTP 403
  test('3. Inactive staff account: rejected with HTTP 403', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer inactive-staff-id' },
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /deactivated/i);
  });

  // 4. Manager without necessary permission: rejected with HTTP 403
  test('4. Manager without registrations permission: rejected with HTTP 403', async () => {
    const mockDb = createMockSupabase({
      managerPermissions: [{ profile_id: 'manager-user-id', permission_key: 'attendance' }],
    });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /lacks permission for "registrations"/i);
  });

  // 5. Manager sending bypassPaymentCheck: true: rejected with 403 and NO database mutation occurs
  test('5. Manager sending bypassPaymentCheck: true: rejected with 403 and no mutation occurs', async () => {
    const mockDb = createMockSupabase();
    const initialAdmissionStatus = mockDb._state.admissions['adm-valid-1'].status;
    const initialEnrollmentCount = Object.keys(mockDb._state.studentEnrollments).length;
    const initialAuditCount = mockDb._state.auditLogs.length;

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: {
        admissionId: 'adm-valid-1',
        bypassPaymentCheck: true,
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Managers cannot bypass payment verification/i);

    // Verify NO database mutation occurred
    assert.equal(mockDb._state.admissions['adm-valid-1'].status, initialAdmissionStatus);
    assert.equal(Object.keys(mockDb._state.studentEnrollments).length, initialEnrollmentCount);
    assert.equal(mockDb._state.auditLogs.length, initialAuditCount);
  });

  // 6. Super admin with pending payment and no permitted exception: approval rejected
  test('6. Super admin with pending payment and no permitted exception: approval rejected with HTTP 400', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: {
        admissionId: 'adm-pending-pay',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.equal(res.body.paymentPending, true);
    assert.match(res.body.error, /Pehle student ki payment verify karein/i);

    assert.equal(mockDb._state.admissions['adm-pending-pay'].status, 'pending');
  });

  // 7. Missing or unknown payment record: rejected with 400 and no enrollment created
  test('7. Missing or unknown payment record: rejected and no enrollment created', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: {
        admissionId: 'adm-no-payment',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Authoritative payment record not found/i);

    const enrollments = Object.values(mockDb._state.studentEnrollments);
    const createdEnrollment = enrollments.find((e: any) => e.payment_id === 'pay-no-payment');
    assert.equal(createdEnrollment, undefined);
  });

  // 8. Missing or archived course: prevents approval
  test('8a. Missing course record: rejected with HTTP 404', async () => {
    const mockDb = createMockSupabase({
      admissions: {
        'adm-unknown-course': {
          id: 'adm-unknown-course',
          reference_number: 'IBA-ADM-2026-999',
          admission_type: 'online',
          full_name: 'Imran Khan',
          email: 'imran@example.com',
          phone: '03009999999',
          course_slug: 'course-that-does-not-exist',
          status: 'pending',
          user_id: 'student-user-id',
          created_at: new Date().toISOString(),
        },
      },
      onlinePayments: {
        'pay-unknown-crs': {
          id: 'pay-unknown-crs',
          admission_id: 'adm-unknown-course',
          payment_status: 'verified',
          final_amount: 5000,
        },
      },
    });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: { admissionId: 'adm-unknown-course' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Associated course record not found/i);
  });

  test('8b. Archived course record: rejected with HTTP 400', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: { admissionId: 'adm-archived-course' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Associated course is archived/i);
  });

  // 9. Super admin exception without a reason: rejected with HTTP 400
  test('9. Super admin exception without a reason: rejected with HTTP 400', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: {
        admissionId: 'adm-pending-pay',
        bypassPaymentCheck: true,
        exceptionReason: '   ', // whitespace only
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /non-empty explanation\/reason is required/i);
  });

  // 10. Super-admin exception when audit-log insertion fails: halts and returns HTTP 500
  test('10. Super-admin exception when audit-log insertion fails: halts before mutation with HTTP 500', async () => {
    const mockDb = createMockSupabase({ failAuditInsert: true });
    const initialStatus = mockDb._state.admissions['adm-pending-pay'].status;

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: {
        admissionId: 'adm-pending-pay',
        bypassPaymentCheck: true,
        exceptionReason: 'Approved as special charity candidate',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to record manual payment exception in audit log/i);

    // Verify admission was NOT modified
    assert.equal(mockDb._state.admissions['adm-pending-pay'].status, initialStatus);
  });

  // 11. Profile update failure: halts and returns HTTP 500
  test('11. Profile update failure: returns HTTP 500 and does not report success', async () => {
    const mockDb = createMockSupabase({ failProfileUpdate: true });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to update student profile/i);
  });

  // 12. Existing enrollment lookup failure: returns HTTP 500
  test('12. Existing enrollment read failure: returns HTTP 500', async () => {
    const mockDb = createMockSupabase({ failEnrollmentLookup: true });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to verify existing student enrollment record/i);
  });

  // 13. Enrollment insert/update failure: returns HTTP 500
  test('13. Enrollment insert/update failure: returns HTTP 500', async () => {
    const mockDb = createMockSupabase({ failEnrollmentMutation: true });
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: { admissionId: 'adm-valid-1' },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to (update|create) student enrollment record/i);
  });

  // 14. Valid verified payment and sufficient permission: normal approval succeeds
  test('14. Valid registration with verified payment: normal approval succeeds with HTTP 200', async () => {
    const mockDb = createMockSupabase();
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: {
        admissionId: 'adm-valid-1',
        adminNotes: 'Verified bank slip attached.',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(mockDb._state.admissions['adm-valid-1'].status, 'approved');
    assert.equal(mockDb._state.admissions['adm-valid-1'].reviewed_by, 'manager-user-id');

    // Verify student enrollment was created
    const enrollments = Object.values(mockDb._state.studentEnrollments);
    const newEnr = enrollments.find(
      (e: any) => e.user_id === 'student-user-id' && e.course_id === 'course-amazon-id'
    );
    assert.ok(newEnr);
    assert.equal(newEnr.status, 'active');
    assert.equal(newEnr.payment_id, 'pay-verified-1');

    // Verify audit log exists with manager role
    const approvalAudit = mockDb._state.auditLogs.find(
      (l) => l.action === 'approve_online_registration' && l.actor_id === 'manager-user-id'
    );
    assert.ok(approvalAudit);
    assert.equal(approvalAudit.actor_role, 'manager');
  });

  // 15. Valid authorized exception: succeeds, payment NOT verified, audit logged with real super_admin
  test('15. Valid authorized super-admin exception: succeeds, payment remains pending, audit logged', async () => {
    const mockDb = createMockSupabase();
    const reqWithReason = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: {
        admissionId: 'adm-pending-pay',
        bypassPaymentCheck: true,
        exceptionReason: 'Special scholarship waiver approved by Chairman',
      },
    };
    const resWithReason = createMockRes();
    await handler(reqWithReason, resWithReason, mockDb);

    assert.equal(resWithReason.statusCode, 200);
    assert.equal(resWithReason.body.ok, true);

    // Payment record remains in pending state
    assert.equal(mockDb._state.onlinePayments['pay-pending-1'].payment_status, 'pending');

    // Audit log records super-admin ID and exception reason
    const exceptionAudit = mockDb._state.auditLogs.find(
      (l) => l.action === 'approve_registration_payment_exception' && l.actor_id === 'super-admin-user-id'
    );
    assert.ok(exceptionAudit);
    assert.equal(exceptionAudit.actor_role, 'super_admin');
    assert.equal(exceptionAudit.details.exceptionReason, 'Special scholarship waiver approved by Chairman');
  });

  // 16. Duplicate approval request: returns 200 safely without duplicate enrollments
  test('16. Duplicate approval request: returns 200 safely without duplicate enrollments', async () => {
    const mockDb = createMockSupabase();
    const initialEnrollmentCount = Object.keys(mockDb._state.studentEnrollments).length;

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer super-admin-user-id' },
      body: {
        admissionId: 'adm-already-approved',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.alreadyApproved, true);
    assert.match(res.body.message, /already been approved/i);

    // Verify enrollment count has NOT changed
    assert.equal(Object.keys(mockDb._state.studentEnrollments).length, initialEnrollmentCount);
  });

  // 17. Admission final-status update failure: halts with HTTP 500, never returns ok: true, and rolls back enrollment
  test('17. Admission final-status update failure: returns HTTP 500 and compensates by removing created enrollment', async () => {
    const mockDb = createMockSupabase({ failAdmissionUpdate: true });
    const initialEnrollmentCount = Object.keys(mockDb._state.studentEnrollments).length;

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: {
        admissionId: 'adm-valid-1',
        adminNotes: 'Attempting approval when admission write fails',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Admission update failed|Failed to update admission status/i);

    // Admission status remains pending (not approved)
    assert.equal(mockDb._state.admissions['adm-valid-1'].status, 'pending');

    // Compensating action: newly created enrollment was deleted/rolled back
    assert.equal(Object.keys(mockDb._state.studentEnrollments).length, initialEnrollmentCount);
  });

  // 18. Standard approval audit log write failure: returns HTTP 500 and does not report success
  test('18. Standard approval audit log write failure: returns HTTP 500 and fails safely', async () => {
    const mockDb = createMockSupabase({ failAuditInsert: true });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer manager-user-id' },
      body: {
        admissionId: 'adm-valid-1',
        adminNotes: 'Audit write will fail',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /Failed to record approval in audit log/i);
  });
});
