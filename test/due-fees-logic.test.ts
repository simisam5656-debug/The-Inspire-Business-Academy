import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDueFeeStatus, getCalendarDaysDiff } from '../src/services/adminService.ts';

describe('Task 3: Physical Academy Overdue & Nearest-Due Fee Logic', () => {
  const baseStudent = {
    id: 'stu-101',
    student_id_code: 'IBA-PHY-2026-101',
    full_name: 'Muhammad Haris',
    course_title: 'Full Stack Web Development',
    phone: '03001234567',
    total_fee: 30240, // monthlyFee = 30240 / 6 = 5040
    admission_date: '2026-08-05', // due day = 5th
    status: 'active' as const,
  };

  test('1. Unpaid past due student: isOverdue=true, feeStatus="due", remainingBalance=monthlyFee, daysDiff=calendar days', () => {
    const referenceDate = '2026-10-11'; // 6 days past the 5th
    const payments: Array<{ student_id: string; amount: number; payment_date: string }> = [
      // No payments made in 2026-10
      { student_id: 'stu-101', amount: 5040, payment_date: '2026-09-05' },
    ];

    const result = calculateDueFeeStatus(baseStudent, payments, referenceDate);

    assert.equal(result.monthlyFee, 5040, 'Monthly fee should be total_fee / 6 (30240 / 6 = 5040)');
    assert.equal(result.paidThisCycle, 0, 'Paid this cycle should be 0');
    assert.equal(result.feeStatus, 'due', 'Fee status should be "due"');
    assert.equal(result.remainingBalance, 5040, 'Remaining balance should equal full monthly fee');
    assert.equal(result.dueDate, '2026-10-05', 'Due date should be the 5th of current month');
    assert.equal(result.isOverdue, true, 'Student should be flagged as overdue');
    assert.equal(result.daysDiff, 6, 'Days overdue should be exactly 6 calendar days');
  });

  test('2. Partial past due student: isOverdue=true, feeStatus="partial", remainingBalance=monthlyFee - paidThisCycle', () => {
    const referenceDate = '2026-10-11';
    const payments = [
      { student_id: 'stu-101', amount: 2000, payment_date: '2026-10-02' },
    ];

    const result = calculateDueFeeStatus(baseStudent, payments, referenceDate);

    assert.equal(result.monthlyFee, 5040);
    assert.equal(result.paidThisCycle, 2000, 'Paid this cycle should sum current month payments');
    assert.equal(result.feeStatus, 'partial', 'Fee status should be "partial"');
    assert.equal(result.remainingBalance, 3040, 'Remaining balance should be 5040 - 2000 = 3040');
    assert.equal(result.dueDate, '2026-10-05');
    assert.equal(result.isOverdue, true, 'Partial payment past due date is still overdue for remaining amount');
    assert.equal(result.daysDiff, 6, 'Days overdue should be 6 calendar days');
  });

  test('3. Fully paid student: isOverdue=false, feeStatus="paid", remainingBalance=0, next due same day next month', () => {
    const referenceDate = '2026-10-11';
    const payments = [
      { student_id: 'stu-101', amount: 5040, payment_date: '2026-10-04' },
    ];

    const result = calculateDueFeeStatus(baseStudent, payments, referenceDate);

    assert.equal(result.monthlyFee, 5040);
    assert.equal(result.paidThisCycle, 5040);
    assert.equal(result.feeStatus, 'paid', 'Fee status should be "paid"');
    assert.equal(result.remainingBalance, 0, 'Remaining balance should be 0');
    assert.equal(result.dueDate, '2026-11-05', 'Next due date should advance to the same day next month');
    assert.equal(result.isOverdue, false, 'Fully paid student is not overdue');
    assert.equal(result.daysDiff, 25, 'Days diff should be days left until next month due date (2026-11-05 - 2026-10-11 = 25)');
  });

  test('4. Not yet due student: isOverdue=false, dueDate later this month, daysDiff=days left', () => {
    const studentLaterDue = {
      ...baseStudent,
      id: 'stu-102',
      admission_date: '2026-08-20', // due day = 20th
    };
    const referenceDate = '2026-10-11';
    const payments: Array<{ student_id: string; amount: number; payment_date: string }> = [];

    const result = calculateDueFeeStatus(studentLaterDue, payments, referenceDate);

    assert.equal(result.monthlyFee, 5040);
    assert.equal(result.paidThisCycle, 0);
    assert.equal(result.feeStatus, 'due');
    assert.equal(result.remainingBalance, 5040);
    assert.equal(result.dueDate, '2026-10-20', 'Due date should be 2026-10-20');
    assert.equal(result.isOverdue, false, 'Not yet overdue because today (11th) is before 20th');
    assert.equal(result.daysDiff, 9, 'Days left should be 9 calendar days until due date');
  });

  test('5. Sorting: overdue first (most days overdue first), then nearest due (least days left first)', () => {
    const referenceDate = '2026-10-11';

    const s1 = { ...baseStudent, id: 's1', admission_date: '2026-08-01' }; // due Oct 1 -> 10 days overdue
    const s2 = { ...baseStudent, id: 's2', admission_date: '2026-08-08' }; // due Oct 8 -> 3 days overdue
    const s3 = { ...baseStudent, id: 's3', admission_date: '2026-08-15' }; // due Oct 15 -> 4 days left
    const s4 = { ...baseStudent, id: 's4', admission_date: '2026-08-25' }; // due Oct 25 -> 14 days left

    const list = [
      calculateDueFeeStatus(s3, [], referenceDate),
      calculateDueFeeStatus(s1, [], referenceDate),
      calculateDueFeeStatus(s4, [], referenceDate),
      calculateDueFeeStatus(s2, [], referenceDate),
    ];

    list.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) return b.daysDiff - a.daysDiff;
      return a.daysDiff - b.daysDiff;
    });

    assert.equal(list[0].id, 's1', 'Most overdue (10 days) should be first');
    assert.equal(list[1].id, 's2', 'Second most overdue (3 days) should be second');
    assert.equal(list[2].id, 's3', 'Nearest upcoming due (4 days left) should be third');
    assert.equal(list[3].id, 's4', 'Furthest upcoming due (14 days left) should be fourth');
  });

  test('6. Calendar days diff calculation helper accuracy', () => {
    assert.equal(getCalendarDaysDiff('2026-10-11', '2026-10-05'), 6);
    assert.equal(getCalendarDaysDiff('2026-10-05', '2026-10-11'), -6);
    assert.equal(getCalendarDaysDiff('2026-10-11', '2026-10-11'), 0);
    assert.equal(getCalendarDaysDiff('2026-11-05', '2026-10-11'), 25);
  });
});
