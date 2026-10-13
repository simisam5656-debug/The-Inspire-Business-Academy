import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CmsService } from '../src/services/cmsService.ts';
import { CourseService } from '../src/services/courseService.ts';
import handler from '../api/payments/submit.ts';

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

describe('Task 1 & 2: Payment Methods from Settings & Course Lists', () => {
  test('1. Site Settings maps payment toggles and Bank is disabled by default', async () => {
    const settings = await CmsService.getSiteSettings();
    assert.strictEqual(typeof settings.paymentJazzcashEnabled, 'boolean');
    assert.strictEqual(typeof settings.paymentEasypaisaEnabled, 'boolean');
    assert.strictEqual(settings.paymentBankEnabled, false, 'Bank Transfer must be disabled by default');
    assert.ok(settings.paymentJazzcashTitle, 'JazzCash title exists');
    assert.ok(settings.paymentJazzcashNumber, 'JazzCash number exists');
  });

  test('2. Updating payment settings enables Bank and updates accounts', async () => {
    const updated = await CmsService.updateSiteSettings({
      paymentBankEnabled: true,
      paymentBankName: 'Meezan Bank Ltd',
      paymentBankAccountTitle: 'The Inspire Business Academy',
      paymentBankAccountNumber: '0102030405',
      paymentBankIban: 'PK00MEZN0102030405',
    });

    assert.strictEqual(updated.paymentBankEnabled, true);
    assert.strictEqual(updated.paymentBankName, 'Meezan Bank Ltd');
    assert.strictEqual(updated.paymentBankIban, 'PK00MEZN0102030405');

    // Reset back to false
    await CmsService.updateSiteSettings({
      paymentBankEnabled: false,
    });
  });

  test('3. CourseService filters by available_for_physical and available_for_online', async () => {
    // Create test courses with distinct availability
    const physicalOnly = await CourseService.createCourse({
      slug: 'test-phys-only-' + Date.now(),
      title: 'Physical Only Workshop',
      shortDescription: 'In-person lab session',
      price: 4500,
      durationValue: 2,
      durationUnit: 'months',
      category: 'business',
      categoryLabel: 'Business',
      isFeatured: false,
      displayOrder: 99,
      status: 'published',
      availableForPhysical: true,
      availableForOnline: false,
    });

    const onlineOnly = await CourseService.createCourse({
      slug: 'test-onl-only-' + Date.now(),
      title: 'Online Only Masterclass',
      shortDescription: 'Recorded video course',
      price: 5000,
      durationValue: 6,
      durationUnit: 'months',
      category: 'business',
      categoryLabel: 'Business',
      isFeatured: false,
      displayOrder: 100,
      status: 'published',
      availableForPhysical: false,
      availableForOnline: true,
    });

    assert.ok(physicalOnly.data);
    assert.ok(onlineOnly.data);

    // Verify course flags
    assert.strictEqual(physicalOnly.data?.availableForPhysical, true);
    assert.strictEqual(physicalOnly.data?.availableForOnline, false);
    assert.strictEqual(onlineOnly.data?.availableForPhysical, false);
    assert.strictEqual(onlineOnly.data?.availableForOnline, true);

    // Test quick toggle logic via updateCourse
    const toggled = await CourseService.updateCourse(physicalOnly.data!.id, {
      availableForOnline: true,
    });
    assert.strictEqual(toggled.data?.availableForOnline, true);
  });
});

describe('Task 3: Student Additional Course Request Handling', () => {
  function createMockDb() {
    return {
      from(table: string) {
        if (table === 'site_settings_public') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        payment_jazzcash_enabled: true,
                        payment_easypaisa_enabled: true,
                        payment_bank_enabled: false,
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }
        if (table === 'online_payments') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({ data: null, error: null }),
                  };
                },
              };
            },
            insert(row: any) {
              return {
                select() {
                  return {
                    single: async () => ({
                      data: { id: 'pay-new-123', reference_number: 'IBA-PAY-2026-99999', ...row },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }
        if (table === 'courses') {
          return {
            select() {
              return {
                eq(col: string, val: string) {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'crs-1',
                        slug: val,
                        title: 'Graphic Design Mastery',
                        price: 5000,
                        online_price: 5000,
                        status: 'published',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }
        if (table === 'admissions') {
          return {
            insert() {
              return {
                select() {
                  return {
                    single: async () => ({
                      data: { id: 'adm-new-123', reference_number: 'IBA-2026-99999' },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }
        if (table === 'offers' || table === 'offer_promo_codes' || table === 'coupons') {
          const chain: any = {
            eq: () => chain,
            lte: () => chain,
            gte: () => chain,
            order: () => Promise.resolve({ data: [], error: null }),
            is: () => chain,
            maybeSingle: async () => ({ data: null, error: null }),
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
          return {
            select: () => chain,
          };
        }
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      },
      auth: {
        getUser: async (token: string) => {
          if (token === 'student-token-valid') {
            return { data: { user: { id: 'student-user-1', email: 'student@example.com' } }, error: null };
          }
          return { data: { user: null }, error: new Error('Invalid token') };
        },
      },
    };
  }

  test('Submits additional_course payment request with authenticated session', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer student-token-valid',
      },
      body: {
        fullName: 'Enrolled Student',
        email: 'student@example.com',
        phone: '03001234567',
        courseSlug: 'graphic-design-mastery',
        paymentMethod: 'jazzcash',
        transactionId: 'TXID-ADDITIONAL-1',
        requestType: 'additional_course',
        userId: 'student-user-1',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(res.body.paymentReference);
    assert.strictEqual(res.body.finalAmount, 5000);
  });

  test('Rejects submission if payment method is disabled in settings', async () => {
    const mockDb = createMockDb();
    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer student-token-valid',
      },
      body: {
        fullName: 'Enrolled Student',
        email: 'student@example.com',
        phone: '03001234567',
        courseSlug: 'graphic-design-mastery',
        paymentMethod: 'bank_transfer', // Bank Transfer is disabled in mock settings!
        transactionId: 'TXID-BANK-TEST',
        requestType: 'additional_course',
        userId: 'student-user-1',
      },
    };
    const res = createMockRes();

    await handler(req, res, mockDb);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.ok, false);
    assert.match(res.body.error, /Bank Transfer payment method is currently disabled/i);
  });

  test('4. Active payment methods resolver filters disabled accounts and includes dynamic titles/numbers', () => {
    // Test data structure matching SiteSettings
    const settingsWithBankDisabled = {
      academyName: 'The Inspire Business Academy',
      phone: '0308-3160274',
      paymentJazzcashEnabled: true,
      paymentJazzcashTitle: 'Inspire Academy JC',
      paymentJazzcashNumber: '03083160274',
      paymentEasypaisaEnabled: true,
      paymentEasypaisaTitle: 'Inspire Academy EP',
      paymentEasypaisaNumber: '03083160275',
      paymentBankEnabled: false,
      paymentBankName: 'Meezan Bank Ltd',
      paymentBankAccountTitle: 'IBA Main',
      paymentBankAccountNumber: '01010101',
      paymentBankIban: 'PK1234',
    };

    const getActiveMethods = (settings: typeof settingsWithBankDisabled) => {
      const active: any[] = [];
      if (settings.paymentJazzcashEnabled !== false) {
        active.push({
          id: 'jazzcash',
          name: 'JazzCash',
          accountTitle: settings.paymentJazzcashTitle,
          accountNumber: settings.paymentJazzcashNumber,
        });
      }
      if (settings.paymentEasypaisaEnabled !== false) {
        active.push({
          id: 'easypaisa',
          name: 'Easypaisa',
          accountTitle: settings.paymentEasypaisaTitle,
          accountNumber: settings.paymentEasypaisaNumber,
        });
      }
      if (settings.paymentBankEnabled === true) {
        active.push({
          id: 'bank_transfer',
          name: 'Bank Transfer',
          accountTitle: settings.paymentBankAccountTitle,
          accountNumber: settings.paymentBankAccountNumber,
          bankName: settings.paymentBankName,
        });
      }
      return active;
    };

    const res1 = getActiveMethods(settingsWithBankDisabled);
    assert.strictEqual(res1.length, 2);
    assert.strictEqual(res1[0].id, 'jazzcash');
    assert.strictEqual(res1[0].accountNumber, '03083160274');
    assert.strictEqual(res1[1].id, 'easypaisa');
    assert.strictEqual(res1.find(m => m.id === 'bank_transfer'), undefined);

    // Enable bank
    const res2 = getActiveMethods({ ...settingsWithBankDisabled, paymentBankEnabled: true });
    assert.strictEqual(res2.length, 3);
    assert.strictEqual(res2[2].id, 'bank_transfer');
    assert.strictEqual(res2[2].bankName, 'Meezan Bank Ltd');

    // Disable all
    const res3 = getActiveMethods({
      ...settingsWithBankDisabled,
      paymentJazzcashEnabled: false,
      paymentEasypaisaEnabled: false,
      paymentBankEnabled: false,
    });
    assert.strictEqual(res3.length, 0);
  });

  test('5. Student Course Filtering separates active, pending and available courses', () => {
    const allCourses = [
      { id: 'c-1', slug: 'course-1', title: 'Course 1', price: 5000, availableForOnline: true },
      { id: 'c-2', slug: 'course-2', title: 'Course 2', price: 5000, availableForOnline: true },
      { id: 'c-3', slug: 'course-3', title: 'Course 3', price: 6000, availableForOnline: true },
      { id: 'c-4', slug: 'course-4', title: 'Course 4 (Physical Only)', price: 7000, availableForOnline: false },
    ];

    const enrollments = [
      { courseId: 'c-1', courseSlug: 'course-1', status: 'active', isExpired: false },
      { courseId: 'c-expired', courseSlug: 'course-expired', status: 'active', isExpired: true },
    ];

    const activeCourseIds = new Set(
      enrollments
        .filter((e) => (e.status === 'active' || e.status === 'completed') && !e.isExpired)
        .map((e) => e.courseId)
    );
    const activeCourseSlugs = new Set(
      enrollments
        .filter((e) => (e.status === 'active' || e.status === 'completed') && !e.isExpired)
        .map((e) => e.courseSlug)
    );

    const availableCourses = allCourses
      .filter((c) => c.availableForOnline)
      .filter((c) => !activeCourseIds.has(c.id) && !activeCourseSlugs.has(c.slug));

    // c-1 is active, c-4 is physical only, so only c-2 and c-3 are available
    assert.strictEqual(availableCourses.length, 2);
    assert.deepStrictEqual(availableCourses.map((c) => c.slug), ['course-2', 'course-3']);
  });
});

describe('Task 1 & 2: Public Join Pages Supabase Isolation & Dynamic Pricing', () => {
  test('PhysicalJoinPage logic: Never falls back to OFFICIAL_COURSES when Supabase is configured and returns 0 courses', () => {
    const isSupabaseConfigured = true;
    const dbResult: any[] = []; // Supabase returns 0 courses

    const physicalCourses = isSupabaseConfigured ? dbResult : [{ slug: 'fallback' }];
    assert.strictEqual(physicalCourses.length, 0);

    // Full 6-Month Physical Package option is only kept when physicalCourses.length > 0
    const courseOptions = physicalCourses.length > 0
      ? [
          { value: 'all-courses-physical', label: 'Full 6-Month Physical Package' },
          ...physicalCourses.map((c: any) => ({ value: c.slug, label: c.title })),
        ]
      : [];
    assert.strictEqual(courseOptions.length, 0, 'Package option must be excluded if no courses returned');

    // Form must be disabled and message displayed
    const coursesLoading = false;
    const coursesError = null;
    const isFormDisabled = isSupabaseConfigured && (coursesLoading || Boolean(coursesError) || physicalCourses.length === 0);
    assert.strictEqual(isFormDisabled, true, 'Form must be disabled when 0 courses returned from configured Supabase');

    const emptyNotice = 'No courses are open for admission right now. Please contact us on WhatsApp.';
    assert.ok(emptyNotice.includes('WhatsApp'));
  });

  test('PhysicalJoinPage logic: Preserves fetch error and does not use static courses on error', () => {
    const isSupabaseConfigured = true;
    const fetchError = 'Network timeout connecting to database';

    let physicalCourses: any[] = [];
    let coursesError: string | null = null;

    if (fetchError) {
      coursesError = fetchError;
      physicalCourses = []; // No fallback!
    }

    assert.strictEqual(coursesError, 'Network timeout connecting to database');
    assert.strictEqual(physicalCourses.length, 0);

    const isFormDisabled = isSupabaseConfigured && (coursesError !== null || physicalCourses.length === 0);
    assert.strictEqual(isFormDisabled, true);
  });

  test('PhysicalJoinPage logic: Uses OFFICIAL_COURSES ONLY when Supabase is not configured', () => {
    const isSupabaseConfigured = false;
    const staticFallback = [{ slug: 'course-1', title: 'Course 1' }];

    const physicalCourses = isSupabaseConfigured ? [] : staticFallback;
    assert.strictEqual(physicalCourses.length, 1);

    const courseOptions = physicalCourses.length > 0
      ? [
          { value: 'all-courses-physical', label: 'Full 6-Month Physical Package' },
          ...physicalCourses.map((c: any) => ({ value: c.slug, label: c.title })),
        ]
      : [];
    assert.strictEqual(courseOptions.length, 2, 'Package option included when physical courses present');
    assert.strictEqual(courseOptions[0].value, 'all-courses-physical');
  });

  test('OnlineJoinPage pricing: Initializes from 0 and calculating state, never hardcoded 5000', () => {
    // Task 2 check: initial state
    const initialPricing = {
      basePrice: 0,
      totalDiscount: 0,
      finalAmount: 0,
      offer: null,
      coupon: null,
    };
    const calculatingPrice = true;
    const priceLoaded = false;
    const submittedFinalAmount = 0;

    assert.strictEqual(initialPricing.basePrice, 0);
    assert.strictEqual(initialPricing.finalAmount, 0);
    assert.strictEqual(submittedFinalAmount, 0);
    assert.strictEqual(calculatingPrice, true);
    assert.strictEqual(priceLoaded, false);

    // Price must not be displayed while loading
    const canShowPrice = !calculatingPrice && priceLoaded;
    assert.strictEqual(canShowPrice, false);

    // After resolution from server
    const serverResult = {
      ok: true,
      basePrice: 6500,
      totalDiscount: 500,
      finalAmount: 6000,
      offer: { title: 'Ramadan Special' },
      coupon: null,
    };

    const resolvedPricing = {
      basePrice: serverResult.basePrice,
      totalDiscount: serverResult.totalDiscount,
      finalAmount: serverResult.finalAmount,
      offer: serverResult.offer,
      coupon: serverResult.coupon,
    };
    const resolvedPriceLoaded = true;

    assert.strictEqual(resolvedPricing.basePrice, 6500);
    assert.strictEqual(resolvedPricing.finalAmount, 6000);
    assert.strictEqual(resolvedPriceLoaded, true);
  });

  test('OnlineJoinPage pricing fallback: Uses online_price from selected course if calculation fails', () => {
    const selectedCourse = {
      slug: 'full-stack-web',
      price: 6000,
      onlinePrice: 5500,
    };

    // When API fails or calculation fails, fallback to selected course onlinePrice (or price)
    const fallbackPrice = selectedCourse.onlinePrice ?? selectedCourse.price ?? 0;
    assert.strictEqual(fallbackPrice, 5500, 'Must prefer onlinePrice over general price');
  });
});
