import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admissions/submit.ts';

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

function createMockAdmissionsDb(courses: Record<string, any> = {}) {
  const admissions: Record<string, any> = {};

  const client = {
    from(table: string) {
      let filters: Array<{ col: string; val: any }> = [];
      let orClause = '';

      const query: any = {
        select(cols: string = '*') {
          return query;
        },
        eq(col: string, val: any) {
          filters.push({ col, val });
          return query;
        },
        or(clause: string) {
          orClause = clause;
          return query;
        },
        async maybeSingle() {
          if (table === 'courses') {
            for (const c of Object.values(courses)) {
              if (orClause) {
                // e.g. slug.eq.web-dev,id.eq.web-dev
                const match = orClause.includes(`slug.eq.${c.slug}`) || orClause.includes(`id.eq.${c.id}`);
                if (match) return { data: c, error: null };
              } else if (filters.every((f) => c[f.col] === f.val)) {
                return { data: c, error: null };
              }
            }
            return { data: null, error: null };
          }
          if (table === 'admissions') {
            for (const a of Object.values(admissions)) {
              if (filters.every((f) => a[f.col] === f.val)) {
                return { data: a, error: null };
              }
            }
            return { data: null, error: null };
          }
          return { data: null, error: null };
        },
        insert(payload: any) {
          const id = `adm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          const inserted = { id, ...payload };
          admissions[id] = inserted;
          return {
            select() {
              return {
                single: async () => ({ data: inserted, error: null }),
              };
            },
          };
        },
      };
      return query;
    },
  };
  return client;
}

describe('Admissions Submit API - Course Flag Validations', () => {
  const defaultCourses = {
    'graphic-design': {
      id: 'c-1',
      slug: 'graphic-design',
      status: 'published',
      available_for_physical: true,
      available_for_online: true,
    },
    'online-only-course': {
      id: 'c-2',
      slug: 'online-only-course',
      status: 'published',
      available_for_physical: false,
      available_for_online: true,
    },
    'physical-only-course': {
      id: 'c-3',
      slug: 'physical-only-course',
      status: 'published',
      available_for_physical: true,
      available_for_online: false,
    },
    'draft-course': {
      id: 'c-4',
      slug: 'draft-course',
      status: 'draft',
      available_for_physical: true,
      available_for_online: true,
    },
  };

  test('1. Physical admission: full package "all-courses-physical" bypasses single course check and succeeds', async () => {
    const mockDb = createMockAdmissionsDb(defaultCourses);
    const req = {
      method: 'POST',
      body: {
        admissionType: 'physical',
        fullName: 'Ali Hassan',
        guardianName: 'Hassan Raza',
        phone: '03001234567',
        courseSlug: 'all-courses-physical',
        courseTitle: 'Full 6-Month Physical Package',
      },
    };
    const res = createMockRes();
    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ok, true);
    assert.ok(res.body.referenceNumber);
  });

  test('2. Physical admission: course with available_for_physical = false is rejected with HTTP 400', async () => {
    const mockDb = createMockAdmissionsDb(defaultCourses);
    const req = {
      method: 'POST',
      body: {
        admissionType: 'physical',
        fullName: 'Zainab Bibi',
        guardianName: 'Muhammad Aslam',
        phone: '03011234567',
        courseSlug: 'online-only-course',
        courseTitle: 'Online Only Course',
      },
    };
    const res = createMockRes();
    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /not currently available for physical admission/i);
  });

  test('3. Physical admission: course with available_for_physical = true succeeds', async () => {
    const mockDb = createMockAdmissionsDb(defaultCourses);
    const req = {
      method: 'POST',
      body: {
        admissionType: 'physical',
        fullName: 'Zainab Bibi',
        guardianName: 'Muhammad Aslam',
        phone: '03011234567',
        courseSlug: 'graphic-design',
        courseTitle: 'Graphic Design',
      },
    };
    const res = createMockRes();
    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ok, true);
  });

  test('4. Online admission: course with available_for_online = false is rejected with HTTP 400', async () => {
    const mockDb = createMockAdmissionsDb(defaultCourses);
    const req = {
      method: 'POST',
      body: {
        admissionType: 'online',
        fullName: 'Usman Tariq',
        email: 'usman@example.com',
        phone: '03021234567',
        courseSlug: 'physical-only-course',
        courseTitle: 'Physical Only Course',
      },
    };
    const res = createMockRes();
    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /not currently available for online admission/i);
  });

  test('5. Online admission: unpublished draft course is rejected with HTTP 400', async () => {
    const mockDb = createMockAdmissionsDb(defaultCourses);
    const req = {
      method: 'POST',
      body: {
        admissionType: 'online',
        fullName: 'Usman Tariq',
        email: 'usman@example.com',
        phone: '03021234567',
        courseSlug: 'draft-course',
        courseTitle: 'Draft Course',
      },
    };
    const res = createMockRes();
    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.ok, false);
    assert.match(res.body.error, /not currently available for online admission/i);
  });

  test('6. Online admission: course with available_for_online = true and published succeeds', async () => {
    const mockDb = createMockAdmissionsDb(defaultCourses);
    const req = {
      method: 'POST',
      body: {
        admissionType: 'online',
        fullName: 'Usman Tariq',
        email: 'usman@example.com',
        phone: '03021234567',
        courseSlug: 'graphic-design',
        courseTitle: 'Graphic Design',
      },
    };
    const res = createMockRes();
    await handler(req, res, mockDb);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.ok, true);
  });
});
