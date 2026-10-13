import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getKarachiDateString,
  getKarachiMonthString,
  getKarachiPeriodRange,
  calculateConsolidatedMetrics,
} from '../src/utils/financeCalculations';

describe('Shared Financial Calculations Tests', () => {
  test('1. Karachi timezone date and month strings match YYYY-MM-DD pattern', () => {
    const dateStr = getKarachiDateString();
    assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
    const monthStr = getKarachiMonthString();
    assert.match(monthStr, /^\d{4}-\d{2}$/);
  });

  test('2. Period range calculation handles months accurately', () => {
    const febRange = getKarachiPeriodRange('month', '2026-02');
    assert.equal(febRange.startDate, '2026-02-01');
    assert.equal(febRange.endDate, '2026-02-28');

    const octRange = getKarachiPeriodRange('month', '2026-10');
    assert.equal(octRange.startDate, '2026-10-01');
    assert.equal(octRange.endDate, '2026-10-31');
  });

  test('3. Consolidated metrics accurately splits physical vs online fees and calculates net income', () => {
    const sampleStudents = [
      { id: 's1', status: 'active', total_fee: 30000 },
      { id: 's2', status: 'active', total_fee: 30000 },
      { id: 's3', status: 'left', total_fee: 30000 },
    ];

    const samplePhysicalPayments = [
      { id: 'p1', student_id: 's1', amount: 5000, payment_date: '2026-10-02' },
      { id: 'p2', student_id: 's2', amount: 5000, payment_date: '2026-10-05' },
      { id: 'p3', student_id: 's1', amount: 5000, payment_date: '2026-09-10' }, // last month
    ];

    const sampleOnlinePayments = [
      { id: 'op1', final_amount: 5000, payment_status: 'verified', created_at: '2026-10-03T10:00:00Z' },
      { id: 'op2', final_amount: 5000, payment_status: 'pending', created_at: '2026-10-04T12:00:00Z' },
      { id: 'op3', final_amount: 5000, payment_status: 'rejected', created_at: '2026-10-01T08:00:00Z' },
      { id: 'op4', final_amount: 5000, payment_status: 'verified', created_at: '2026-09-20T14:00:00Z' },
    ];

    const sampleExpenses = [
      { id: 'e1', amount: 3000, expense_date: '2026-10-06' },
      { id: 'e2', amount: 2000, expense_date: '2026-09-15' },
    ];

    const sampleEnrollments = [
      { id: 'enr1', status: 'active', expiry_date: '2026-12-31' },
      { id: 'enr2', status: 'expired', expiry_date: '2026-08-01' },
    ];

    const metrics = calculateConsolidatedMetrics({
      students: sampleStudents,
      physicalPayments: samplePhysicalPayments,
      expenses: sampleExpenses,
      onlinePayments: sampleOnlinePayments,
      enrollments: sampleEnrollments,
      targetMonth: '2026-10',
    });

    assert.equal(metrics.activePhysicalCount, 2);
    assert.equal(metrics.activeOnlineCount, 1);
    assert.equal(metrics.pendingOnlinePaymentsCount, 1);

    // Physical
    assert.equal(metrics.physicalCollectedThisMonth, 10000);
    assert.equal(metrics.physicalCollectedAllTime, 15000);
    assert.equal(metrics.physicalExpectedThisMonth, 2 * 5040); // 10080

    // Online
    assert.equal(metrics.onlineCollectedThisMonth, 5000);
    assert.equal(metrics.onlineVerifiedAllTime, 10000);
    assert.equal(metrics.onlineExpectedThisMonth, 10000); // 5000 verified + 5000 pending

    // Total collections this month = 10000 physical + 5000 online = 15000
    assert.equal(metrics.totalCollectedThisMonth, 15000);
    // Total expenses this month = 3000
    assert.equal(metrics.expensesThisMonth, 3000);
    // Net Income this month = 15000 - 3000 = 12000
    assert.equal(metrics.netIncomeThisMonth, 12000);

    // All time
    assert.equal(metrics.totalCollectedAllTime, 25000);
    assert.equal(metrics.expensesAllTime, 5000);
    assert.equal(metrics.netIncomeAllTime, 20000);
  });
});
