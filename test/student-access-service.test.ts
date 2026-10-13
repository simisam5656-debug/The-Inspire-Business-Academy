import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStudentAccessState } from '../src/services/studentAccessService.ts';

describe('studentAccessService - State Resolution (7 States)', () => {
  const todayStr = '2026-10-11';

  // 1. deactivated (profiles.is_active = false)
  test('1. returns deactivated when profiles.is_active is false, regardless of enrollment or payments', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: false },
      enrollments: [
        {
          id: 'enr-1',
          status: 'active',
          start_date: '2026-10-01',
          expiry_date: '2027-04-01',
        },
      ],
      latestPayment: {
        payment_status: 'verified',
      },
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'deactivated');
  });

  // 2. active (at least one student_enrollments row with status active/completed and not expired)
  test('2. returns active when student has an active non-expired enrollment', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [
        {
          id: 'enr-1',
          status: 'active',
          start_date: '2026-10-01',
          expiry_date: '2027-04-01', // Future date
        },
      ],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'active');
  });

  test('2b. returns active when student has a completed enrollment that is not expired', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [
        {
          id: 'enr-2',
          status: 'completed',
          start_date: '2026-05-01',
          expiry_date: '2026-11-01', // Still valid
        },
      ],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'active');
  });

  // 3. suspended (all enrollments suspended or cancelled)
  test('3. returns suspended when all enrollments are suspended or cancelled', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [
        {
          id: 'enr-1',
          status: 'suspended',
          start_date: '2026-01-01',
          expiry_date: '2026-07-01',
        },
        {
          id: 'enr-2',
          status: 'cancelled',
          start_date: '2026-02-01',
          expiry_date: '2026-08-01',
        },
      ],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'suspended');
  });

  // 4. expired (enrollments expired)
  test('4. returns expired when enrollments are past expiry date', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [
        {
          id: 'enr-1',
          status: 'active',
          start_date: '2026-01-01',
          expiry_date: '2026-09-01', // Past date relative to 2026-10-11
        },
      ],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'expired');
  });

  test('4b. returns expired when enrollment status is explicitly expired', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [
        {
          id: 'enr-1',
          status: 'expired',
          start_date: '2026-01-01',
          expiry_date: '2026-07-01',
        },
      ],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'expired');
  });

  // 5. pending_payment (an online_payments row with status pending and no active enrollment)
  test('5. returns pending_payment when online_payments status is pending and no active enrollment exists', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [],
      latestPayment: {
        id: 'pay-1',
        payment_status: 'pending',
        amount: 5000,
      },
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'pending_payment');
  });

  test('5b. returns payment_verified_pending_access when online_payments status is verified and access_status is pending', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [],
      latestPayment: {
        id: 'pay-verified-pending-access',
        payment_status: 'verified',
        access_status: 'pending',
        amount: 5000,
      },
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'payment_verified_pending_access');
  });

  test('5c. returns access_denied when online_payments status is verified and access_status is denied', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [],
      latestPayment: {
        id: 'pay-verified-access-denied',
        payment_status: 'verified',
        access_status: 'denied',
        amount: 5000,
      },
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'access_denied');
  });

  // 6. payment_rejected (latest online_payments row rejected, with the rejection reason)
  test('6. returns payment_rejected when latest payment is rejected', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [],
      latestPayment: {
        id: 'pay-2',
        payment_status: 'rejected',
        rejection_reason: 'Transaction ID not matching bank deposit slip',
      },
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'payment_rejected');
  });

  // 7. no_enrollment (none of the above)
  test('7. returns no_enrollment when no enrollments or pending/rejected payments exist', () => {
    const state = resolveStudentAccessState({
      profile: { is_active: true },
      enrollments: [],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'no_enrollment');
  });

  test('7b. returns no_enrollment when profile is null and no enrollments exist', () => {
    const state = resolveStudentAccessState({
      profile: null,
      enrollments: [],
      latestPayment: null,
      nowIsoDate: todayStr,
    });

    assert.equal(state, 'no_enrollment');
  });
});
