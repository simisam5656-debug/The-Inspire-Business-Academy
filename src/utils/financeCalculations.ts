/**
 * Authoritative financial & analytics calculation engine for The Inspire Business Academy.
 * Shared across Dashboard, Reports, Expenses, and Fee calculations.
 * Timezone: Asia/Karachi (UTC+5).
 */

export interface RawPhysicalStudent {
  id: string;
  total_fee?: number | string | null;
  status: string;
  admission_date?: string | null;
  updated_at?: string | null;
  course_title?: string | null;
  course_slug?: string | null;
}

export interface RawFeePayment {
  id: string;
  student_id: string;
  amount: number | string;
  payment_date: string;
}

export interface RawExpense {
  id: string;
  amount: number | string;
  expense_date: string;
}

export interface RawOnlinePayment {
  id: string;
  final_amount?: number | string | null;
  payment_status: 'pending' | 'verified' | 'rejected' | string;
  created_at: string;
  course_id?: string | null;
  package_id?: string | null;
}

export interface RawEnrollment {
  id: string;
  status: string;
  expiry_date?: string | null;
  course_id?: string | null;
}

/**
 * Returns current date/time string formatted in Asia/Karachi timezone
 */
export function getKarachiDateString(date = new Date()): string {
  // Format to YYYY-MM-DD in Asia/Karachi
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current year-month YYYY-MM in Asia/Karachi timezone
 */
export function getKarachiMonthString(date = new Date()): string {
  return getKarachiDateString(date).substring(0, 7);
}

/**
 * Returns start and end date strings for a given period in Asia/Karachi
 */
export function getKarachiPeriodRange(
  period: 'today' | 'last_7_days' | 'this_month' | 'month' | 'all_time' | string,
  targetMonth?: string
): { startDate: string; endDate: string } {
  const todayStr = getKarachiDateString();

  if (period === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (period === 'last_7_days') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { startDate: getKarachiDateString(d), endDate: todayStr };
  }

  if (period === 'this_month') {
    const currentMonth = todayStr.substring(0, 7);
    return { startDate: `${currentMonth}-01`, endDate: todayStr };
  }

  if (period === 'month' && targetMonth) {
    const m = targetMonth.substring(0, 7);
    const [year, month] = m.split('-').map(Number);
    // Find last day of target month
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    return { startDate: `${m}-01`, endDate: `${m}-${lastDayStr}` };
  }

  // default / all_time
  return { startDate: '2020-01-01', endDate: todayStr };
}

/**
 * Computes consolidated financial and enrollment metrics
 */
export function calculateConsolidatedMetrics({
  students,
  physicalPayments,
  expenses,
  onlinePayments,
  enrollments = [],
  targetMonth,
}: {
  students: RawPhysicalStudent[];
  physicalPayments: RawFeePayment[];
  expenses: RawExpense[];
  onlinePayments: RawOnlinePayment[];
  enrollments?: RawEnrollment[];
  targetMonth?: string;
}) {
  const currentMonth = targetMonth || getKarachiMonthString();
  const todayStr = getKarachiDateString();

  // Active physical students
  const activePhysicalStudents = students.filter((s) => s.status === 'active');
  const activePhysicalCount = activePhysicalStudents.length;

  // Active online students (distinct enrolled active records not expired)
  const activeOnlineCount = enrollments.filter(
    (e) => e.status === 'active' && (!e.expiry_date || e.expiry_date >= todayStr)
  ).length;

  // Pending online payments count
  const pendingOnlinePaymentsCount = onlinePayments.filter(
    (p) => p.payment_status === 'pending'
  ).length;

  // Physical payments this month and all time
  const physicalCollectedAllTime = physicalPayments.reduce(
    (sum, p) => sum + Math.round(Number(p.amount || 0)),
    0
  );
  const physicalCollectedThisMonth = physicalPayments
    .filter((p) => p.payment_date && p.payment_date.startsWith(currentMonth))
    .reduce((sum, p) => sum + Math.round(Number(p.amount || 0)), 0);

  // Online payments (verified only counts as collected revenue)
  const onlineVerifiedAllTime = onlinePayments
    .filter((p) => p.payment_status === 'verified')
    .reduce((sum, p) => sum + Math.round(Number(p.final_amount || 0)), 0);

  const onlinePaymentsThisMonth = onlinePayments.filter((p) => {
    const d = (p.created_at || '').substring(0, 10);
    return d.startsWith(currentMonth);
  });

  const onlineCollectedThisMonth = onlinePaymentsThisMonth
    .filter((p) => p.payment_status === 'verified')
    .reduce((sum, p) => sum + Math.round(Number(p.final_amount || 0)), 0);

  // Online expected fee this month: payments submitted this month that are pending or verified
  const onlineExpectedThisMonth = onlinePaymentsThisMonth
    .filter((p) => p.payment_status === 'pending' || p.payment_status === 'verified')
    .reduce((sum, p) => sum + Math.round(Number(p.final_amount || 0)), 0);

  // Physical expected fee:
  // For this month: active physical students * 5,040 (standard monthly tuition baseline)
  // Total expected all-time: sum of total_fee on student records
  const physicalExpectedThisMonth = Math.round(activePhysicalCount * 5040);
  const physicalExpectedAllTime = students.reduce(
    (sum, s) => sum + Math.round(Number(s.total_fee || 0)),
    0
  );

  // Total collected this month (Physical + Online)
  const totalCollectedThisMonth = physicalCollectedThisMonth + onlineCollectedThisMonth;
  const totalCollectedAllTime = physicalCollectedAllTime + onlineVerifiedAllTime;

  // Expenses this month and all time
  const expensesAllTime = expenses.reduce(
    (sum, e) => sum + Math.round(Number(e.amount || 0)),
    0
  );
  const expensesThisMonth = expenses
    .filter((e) => e.expense_date && e.expense_date.startsWith(currentMonth))
    .reduce((sum, e) => sum + Math.round(Number(e.amount || 0)), 0);

  // Net Income = Collections (Physical + Online) - Expenses
  const netIncomeThisMonth = totalCollectedThisMonth - expensesThisMonth;
  const netIncomeAllTime = totalCollectedAllTime - expensesAllTime;

  return {
    currentMonth,
    activePhysicalCount,
    activeOnlineCount,
    pendingOnlinePaymentsCount,
    // Physical fees
    physicalCollectedThisMonth,
    physicalCollectedAllTime,
    physicalExpectedThisMonth,
    physicalExpectedAllTime,
    // Online fees
    onlineCollectedThisMonth,
    onlineVerifiedAllTime,
    onlineExpectedThisMonth,
    // Consolidated
    totalCollectedThisMonth,
    totalCollectedAllTime,
    expensesThisMonth,
    expensesAllTime,
    netIncomeThisMonth,
    netIncomeAllTime,
  };
}
