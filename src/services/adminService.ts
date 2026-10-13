import {
  PhysicalStudent,
  AdmissionRecord,
  PhysicalAttendanceRecord,
  FeePaymentRecord,
  ExpenseRecord,
  DashboardMetrics,
  StudentStatus,
  AttendanceStatus,
  PaymentMethod,
  ExpenseCategory,
  ContactMessageRecord,
  MonthFinancialSummary,
  DueFeeStudent,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { resolveStudentAccessState } from './studentAccessService';
import {
  calculateConsolidatedMetrics,
  getKarachiDateString,
  getKarachiMonthString,
  getKarachiPeriodRange,
} from '../utils/financeCalculations';

/**
 * Local in-memory mock store for demo/fallback when Supabase credentials
 * are not provisioned or during client testing without a live database.
 */
class LocalAdminStore {
  private students: PhysicalStudent[] = [
    {
      id: 'mock-stu-1',
      studentIdCode: 'IBA-PHY-2026-001',
      fullName: 'Muhammad Usman',
      guardianName: 'Abdul Rehman',
      phone: '03011234567',
      whatsapp: '03011234567',
      gender: 'male',
      address: 'Model Town, Sadiqabad',
      courseSlug: 'amazon-va',
      courseTitle: 'Amazon Virtual Assistant (VA)',
      batchTitle: 'Morning Batch A',
      admissionDate: '2026-09-15',
      totalFee: 6000,
      status: 'active',
      notes: 'Fee installments agreed in 2 parts',
      createdAt: '2026-09-15T09:00:00Z',
      updatedAt: '2026-09-15T09:00:00Z',
    },
    {
      id: 'mock-stu-2',
      studentIdCode: 'IBA-PHY-2026-002',
      fullName: 'Ayesha Bibi',
      guardianName: 'Muhammad Tariq',
      phone: '03129876543',
      whatsapp: '03129876543',
      gender: 'female',
      address: 'Allama Iqbal Road, Sadiqabad',
      courseSlug: 'graphic-design-mastery',
      courseTitle: 'Graphic Design Mastery',
      batchTitle: 'Evening Batch B',
      admissionDate: '2026-09-20',
      totalFee: 5000,
      status: 'active',
      notes: 'Full fee paid on admission',
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
    },
    {
      id: 'mock-stu-3',
      studentIdCode: 'IBA-PHY-2026-003',
      fullName: 'Bilal Ahmad',
      guardianName: 'Naseer Ahmad',
      phone: '03023456789',
      whatsapp: '03023456789',
      gender: 'male',
      address: 'Rail Bazaar, Sadiqabad',
      courseSlug: 'web-development-bootcamp',
      courseTitle: 'Web Development Bootcamp',
      batchTitle: 'Evening Batch A',
      admissionDate: '2026-08-10',
      totalFee: 8000,
      status: 'active',
      notes: 'Lab PC assigned #04',
      createdAt: '2026-08-10T11:00:00Z',
      updatedAt: '2026-08-10T11:00:00Z',
    },
  ];

  private admissions: AdmissionRecord[] = [
    {
      id: 'mock-adm-1',
      referenceNumber: 'IBA-ADM-2026-8921',
      admissionType: 'physical',
      fullName: 'Hamza Khan',
      guardianName: 'Rashid Khan',
      phone: '03451239876',
      whatsapp: '03451239876',
      email: 'hamza@example.com',
      city: 'Sadiqabad',
      courseSlug: 'video-editing-animation',
      courseTitle: 'Video Editing & Animation',
      batchPreference: 'Evening (5:00 PM - 7:00 PM)',
      notes: 'Seeking hands-on lab workstation.',
      status: 'pending',
      createdAt: '2026-10-05T14:20:00Z',
      updatedAt: '2026-10-05T14:20:00Z',
    },
    {
      id: 'mock-adm-2',
      referenceNumber: 'IBA-ADM-2026-4432',
      admissionType: 'physical',
      fullName: 'Zainab Fatima',
      guardianName: 'Farooq Ahmad',
      phone: '03215554433',
      city: 'Sadiqabad',
      courseSlug: 'shopify-dropshipping',
      courseTitle: 'Shopify & Local E-Commerce',
      batchPreference: 'Afternoon (2:00 PM - 4:00 PM)',
      status: 'pending',
      createdAt: '2026-10-06T11:00:00Z',
      updatedAt: '2026-10-06T11:00:00Z',
    },
  ];

  private attendance: PhysicalAttendanceRecord[] = [
    {
      id: 'mock-att-1',
      studentId: 'mock-stu-1',
      attendanceDate: new Date().toISOString().split('T')[0],
      status: 'present',
      notes: 'Arrived on time',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-att-2',
      studentId: 'mock-stu-2',
      attendanceDate: new Date().toISOString().split('T')[0],
      status: 'present',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-att-3',
      studentId: 'mock-stu-3',
      attendanceDate: new Date().toISOString().split('T')[0],
      status: 'absent',
      notes: 'Informed via phone',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private feePayments: FeePaymentRecord[] = [
    {
      id: 'mock-pay-1',
      receiptNumber: 'REC-2026-001',
      studentId: 'mock-stu-1',
      amount: 3000,
      paymentDate: '2026-09-15',
      paymentMethod: 'cash',
      referenceNote: '1st installment',
      createdAt: '2026-09-15T10:00:00Z',
    },
    {
      id: 'mock-pay-2',
      receiptNumber: 'REC-2026-002',
      studentId: 'mock-stu-2',
      amount: 5000,
      paymentDate: '2026-09-20',
      paymentMethod: 'cash',
      referenceNote: 'Full payment lump sum',
      createdAt: '2026-09-20T11:00:00Z',
    },
    {
      id: 'mock-pay-3',
      receiptNumber: 'REC-2026-003',
      studentId: 'mock-stu-3',
      amount: 5000,
      paymentDate: '2026-08-10',
      paymentMethod: 'easypaisa',
      referenceNote: 'Token admission fee paid',
      createdAt: '2026-08-10T12:00:00Z',
    },
  ];

  private expenses: ExpenseRecord[] = [
    {
      id: 'mock-exp-1',
      title: 'Academy High-Speed Internet Bill (PTCL Fiber)',
      category: 'utilities',
      amount: 4500,
      expenseDate: '2026-10-01',
      notes: 'Monthly connection for lab and online streaming',
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'mock-exp-2',
      title: 'Lab Stationary & Whiteboard Markers',
      category: 'stationery',
      amount: 1800,
      expenseDate: '2026-10-03',
      notes: 'Registers, marker packs, print paper',
      createdAt: '2026-10-03T11:00:00Z',
      updatedAt: '2026-10-03T11:00:00Z',
    },
    {
      id: 'mock-exp-3',
      title: 'Generator Fuel & UPS Battery Water',
      category: 'maintenance',
      amount: 3200,
      expenseDate: '2026-10-06',
      notes: 'Uninterrupted power backup for student workstations',
      createdAt: '2026-10-06T15:00:00Z',
      updatedAt: '2026-10-06T15:00:00Z',
    },
  ];

  // Helper getters and mutators
  getStudents() { return [...this.students]; }
  getAdmissions() { return [...this.admissions]; }
  getAttendance() { return [...this.attendance]; }
  getFeePayments() { return [...this.feePayments]; }
  getExpenses() { return [...this.expenses]; }

  addStudent(student: PhysicalStudent) {
    this.students.unshift(student);
    return student;
  }

  updateStudent(id: string, updates: Partial<PhysicalStudent>) {
    const idx = this.students.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.students[idx] = { ...this.students[idx], ...updates, updatedAt: new Date().toISOString() };
      return this.students[idx];
    }
    return null;
  }

  updateAdmissionStatus(id: string, status: AdmissionRecord['status'], adminNotes?: string) {
    const idx = this.admissions.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.admissions[idx] = {
        ...this.admissions[idx],
        status,
        adminNotes: adminNotes ?? this.admissions[idx].adminNotes,
        updatedAt: new Date().toISOString(),
      };
      return this.admissions[idx];
    }
    return null;
  }

  saveAttendance(date: string, records: { studentId: string; status: AttendanceStatus; notes?: string }[]) {
    // Remove existing for this date
    this.attendance = this.attendance.filter(a => a.attendanceDate !== date);
    for (const r of records) {
      this.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        studentId: r.studentId,
        attendanceDate: date,
        status: r.status,
        notes: r.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return true;
  }

  addFeePayment(payment: FeePaymentRecord) {
    this.feePayments.unshift(payment);
    return payment;
  }

  updateFeePayment(id: string, updates: Partial<FeePaymentRecord>) {
    const idx = this.feePayments.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.feePayments[idx] = { ...this.feePayments[idx], ...updates };
      return this.feePayments[idx];
    }
    return null;
  }

  deleteFeePayment(id: string) {
    this.feePayments = this.feePayments.filter(p => p.id !== id);
    return true;
  }

  addExpense(exp: ExpenseRecord) {
    this.expenses.unshift(exp);
    return exp;
  }

  private contactMessages: ContactMessageRecord[] = [
    {
      id: 'mock-msg-1',
      fullName: 'Zubair Shah',
      phone: '03041234567',
      email: 'zubair@example.com',
      courseInterest: 'Amazon Virtual Assistant (VA)',
      message: 'Salam, kya morning batch mein seats available hain aur fee installment mein de sakte hain?',
      status: 'new',
      adminNotes: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mock-msg-2',
      fullName: 'Maria Bibi',
      phone: '03159876543',
      email: 'maria@example.com',
      courseInterest: 'Graphic Design Mastery',
      message: 'Girls afternoon timing confirm kar dein please.',
      status: 'read',
      adminNotes: 'Called on phone, interested in B02.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  getContactMessages() { return [...this.contactMessages]; }

  updateContactMessage(id: string, updates: Partial<ContactMessageRecord>) {
    const idx = this.contactMessages.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.contactMessages[idx] = { ...this.contactMessages[idx], ...updates, updatedAt: new Date().toISOString() };
      return this.contactMessages[idx];
    }
    return null;
  }

  deleteContactMessage(id: string) {
    this.contactMessages = this.contactMessages.filter(m => m.id !== id);
    return true;
  }
}

const localStore = new LocalAdminStore();

export function getCalendarDaysDiff(dateA: string, dateB: string): number {
  const [yA, mA, dA] = dateA.split('-').map(Number);
  const [yB, mB, dB] = dateB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcA - utcB) / 86400000);
}

export function calculateDueFeeStatus(
  student: {
    id: string;
    student_id_code?: string;
    studentIdCode?: string;
    full_name?: string;
    fullName?: string;
    course_title?: string;
    courseTitle?: string;
    phone?: string;
    total_fee?: number;
    totalFee?: number;
    admission_date?: string;
    admissionDate?: string;
    status?: StudentStatus;
  },
  payments: Array<{ student_id?: string; studentId?: string; amount: number; payment_date?: string; paymentDate?: string }>,
  referenceDate: string = new Date().toISOString().split('T')[0]
): DueFeeStudent {
  const totalFee = Number(student.total_fee ?? student.totalFee ?? 30240);
  const monthlyFee = totalFee > 0 ? Math.round(totalFee / 6) : 5040;

  const currentMonth = referenceDate.substring(0, 7);
  const studentPayments = payments.filter((p) => {
    const sId = p.student_id ?? p.studentId;
    return sId === student.id;
  });

  const paidThisCycle = studentPayments
    .filter((p) => {
      const pDate = p.payment_date ?? p.paymentDate;
      return pDate && pDate.startsWith(currentMonth);
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  let dayOfMonth = 10;
  const admDate = student.admission_date ?? student.admissionDate;
  if (admDate) {
    const parts = admDate.split('-');
    const parsedDay = parts.length >= 3 ? parseInt(parts[2], 10) : new Date(admDate).getDate();
    if (!isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31) {
      dayOfMonth = Math.min(Math.max(parsedDay, 1), 28);
    }
  }

  const dueDayStr = String(dayOfMonth).padStart(2, '0');
  const currentMonthDueDateStr = `${currentMonth}-${dueDayStr}`;

  let dueDate: string;
  let isOverdue: boolean;
  let daysDiff: number;
  let feeStatus: 'paid' | 'partial' | 'due';
  let remainingBalance: number;

  if (paidThisCycle >= monthlyFee) {
    feeStatus = 'paid';
    remainingBalance = 0;
    const [curYear, curMonthNum] = currentMonth.split('-').map(Number);
    let nextYear = curYear;
    let nextMonthNum = curMonthNum + 1;
    if (nextMonthNum > 12) {
      nextMonthNum = 1;
      nextYear += 1;
    }
    const nextDueDateStr = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}-${dueDayStr}`;
    dueDate = nextDueDateStr;
    isOverdue = false;
    const diff = getCalendarDaysDiff(dueDate, referenceDate);
    daysDiff = Math.max(0, diff);
  } else {
    feeStatus = paidThisCycle > 0 ? 'partial' : 'due';
    remainingBalance = monthlyFee - paidThisCycle;
    dueDate = currentMonthDueDateStr;

    const overdueDays = getCalendarDaysDiff(referenceDate, currentMonthDueDateStr);
    if (overdueDays > 0) {
      isOverdue = true;
      daysDiff = overdueDays;
    } else {
      isOverdue = false;
      daysDiff = Math.abs(overdueDays);
    }
  }

  return {
    id: student.id,
    studentIdCode: student.student_id_code ?? student.studentIdCode ?? student.id,
    fullName: student.full_name ?? student.fullName ?? 'Student',
    courseTitle: student.course_title ?? student.courseTitle ?? 'Vocational Training',
    phone: student.phone ?? '',
    monthlyFee,
    paidThisCycle,
    remainingBalance,
    feeStatus,
    dueDate,
    daysDiff,
    isOverdue,
    status: (student.status ?? 'active') as StudentStatus,
  };
}

/**
 * Service Layer: Safely talks to Supabase PostgreSQL when connected;
 * falls back smoothly to local verified state when preview/offline.
 */
export const AdminService = {
  // --------------------------------------------------------------------------
  // METRICS & DASHBOARD
  // --------------------------------------------------------------------------
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    let students: any[] = [];
    let admissions: any[] = [];
    let attendance: any[] = [];
    let payments: any[] = [];
    let expenses: any[] = [];
    let certificates: any[] = [];
    let contactMessages: any[] = [];
    let onlineList: any[] = [];
    let enrollList: any[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const [
          studentsRes,
          admRes,
          attRes,
          feesRes,
          expRes,
          certsRes,
          msgsRes,
          opRes,
          enrRes,
        ] = await Promise.all([
          supabase.from('physical_students').select('*'),
          supabase.from('admissions').select('*'),
          supabase.from('physical_attendance').select('*').eq('attendance_date', today),
          supabase.from('physical_fee_payments').select('*'),
          supabase.from('academy_expenses').select('*'),
          supabase.from('certificates').select('id, status'),
          supabase.from('contact_messages').select('id, status'),
          supabase.from('online_payments').select('id, final_amount, payment_status, created_at'),
          supabase.from('student_enrollments').select('id, status, expiry_date'),
        ]);

        if (studentsRes.error) throw studentsRes.error;
        if (admRes.error) throw admRes.error;
        if (feesRes.error) throw feesRes.error;
        if (expRes.error) throw expRes.error;

        students = studentsRes.data || [];
        admissions = admRes.data || [];
        attendance = attRes.data || [];
        payments = feesRes.data || [];
        expenses = expRes.data || [];
        certificates = certsRes.data || [];
        contactMessages = msgsRes.data || [];
        onlineList = opRes.data || [];
        enrollList = enrRes.data || [];
      } catch (err: any) {
        console.error('Error fetching dashboard metrics from Supabase:', err);
        throw new Error(err?.message || 'Failed to load dashboard metrics from database');
      }
    } else {
      students = localStore.getStudents().map((s) => ({
        id: s.id,
        student_id_code: s.studentIdCode,
        full_name: s.fullName,
        phone: s.phone,
        course_title: s.courseTitle,
        admission_date: s.admissionDate,
        total_fee: s.totalFee,
        status: s.status,
        updated_at: s.updatedAt,
      }));
      admissions = localStore.getAdmissions().map((a) => ({
        id: a.id,
        admission_type: a.admissionType,
        status: a.status,
        created_at: a.createdAt,
      }));
      attendance = localStore.getAttendance().filter((a) => a.attendanceDate === today).map((a) => ({
        id: a.id,
        status: a.status,
      }));
      payments = localStore.getFeePayments().map((p) => ({
        id: p.id,
        student_id: p.studentId,
        amount: p.amount,
        payment_date: p.paymentDate,
      }));
      expenses = localStore.getExpenses().map((e) => ({
        id: e.id,
        amount: e.amount,
        expense_date: e.expenseDate,
      }));
      contactMessages = localStore.getContactMessages().map((m) => ({
        id: m.id,
        status: m.status,
      }));
    }

    const consolidated = calculateConsolidatedMetrics({
      students,
      physicalPayments: payments,
      expenses,
      onlinePayments: onlineList,
      enrollments: enrollList,
      targetMonth: currentMonth,
    });

    const newPhysicalAdmissionsThisMonth =
      admissions.filter((a) => (a.admission_type === 'physical' || !a.admission_type) && a.created_at && a.created_at.startsWith(currentMonth)).length ||
      students.filter((s) => s.admission_date && s.admission_date.startsWith(currentMonth)).length;
    const leftStudentsThisMonth = students.filter((s) => s.status === 'left').length;
    const totalCertifiedStudents = certificates.filter((c) => c.status === 'issued' || !c.status).length;
    const pendingOnlineRegistrations = admissions.filter((a) => a.status === 'pending').length;

    const todayAttendanceTotal = attendance.length;
    const todayAttendancePresent = attendance.filter((a: any) => a.status === 'present').length;
    const unreadContactMessages = contactMessages.filter((m: any) => m.status === 'new').length;

    // Last 6 Months Computation
    const last6Months: MonthFinancialSummary[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const mStr = d.toISOString().substring(0, 7);
      const mLabel = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const fCol = payments
        .filter((p) => p.payment_date && p.payment_date.startsWith(mStr))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const onlCol = onlineList
        .filter((op) => op.payment_status === 'verified' && (op.created_at || '').startsWith(mStr))
        .reduce((sum, op) => sum + Number(op.final_amount || 0), 0);

      const exp = expenses
        .filter((e) => e.expense_date && e.expense_date.startsWith(mStr))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const newAdm =
        admissions.filter((a) => a.created_at && a.created_at.startsWith(mStr)).length ||
        students.filter((s) => s.admission_date && s.admission_date.startsWith(mStr)).length;

      const leftCount = students.filter(
        (s) => s.status === 'left' && s.updated_at && s.updated_at.startsWith(mStr)
      ).length;

      let feeCollectionVal = fCol + onlCol;
      let expensesVal = exp;
      let newAdmissionsVal = newAdm;
      let leftStudentsVal = leftCount;

      // Hard-coded demo numbers are allowed ONLY when isSupabaseConfigured is false
      if (!isSupabaseConfigured) {
        if (!feeCollectionVal) feeCollectionVal = i === 0 ? consolidated.totalCollectedThisMonth : 15120;
        if (!expensesVal) expensesVal = i === 0 ? consolidated.expensesThisMonth : 6500;
        if (!newAdmissionsVal) newAdmissionsVal = i === 0 ? newPhysicalAdmissionsThisMonth : 3;
      }

      last6Months.push({
        month: mStr,
        monthLabel: mLabel,
        feeCollection: feeCollectionVal,
        expenses: expensesVal,
        newAdmissions: newAdmissionsVal,
        leftStudents: leftStudentsVal,
        netIncome: feeCollectionVal - expensesVal,
      });
    }

    // Overdue and nearest-due fee students
    const activeStudentsList = students.filter((s) => s.status === 'active');
    const dueFeeStudents: DueFeeStudent[] = activeStudentsList.map((s) =>
      calculateDueFeeStatus(s, payments, today)
    );

    dueFeeStudents.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isOverdue && b.isOverdue) return b.daysDiff - a.daysDiff;
      return a.daysDiff - b.daysDiff;
    });

    return {
      totalPhysicalStudents: students.length,
      activeStudents: consolidated.activePhysicalCount,
      pendingRegistrations: pendingOnlineRegistrations,
      todayAttendanceMarked: todayAttendanceTotal,
      todayPresentCount: todayAttendancePresent,
      totalFeesExpected: consolidated.physicalExpectedAllTime,
      totalFeesCollected: consolidated.physicalCollectedAllTime,
      outstandingFees: Math.max(0, consolidated.physicalExpectedAllTime - consolidated.physicalCollectedAllTime),
      monthFeesCollected: consolidated.totalCollectedThisMonth,
      monthExpensesTotal: consolidated.expensesThisMonth,
      pendingOnlinePayments: consolidated.pendingOnlinePaymentsCount,
      activeOnlineEnrollments: consolidated.activeOnlineCount,
      totalOnlineRevenue: consolidated.onlineVerifiedAllTime,
      totalPhysicalActiveStudents: consolidated.activePhysicalCount,
      activeOnlineStudents: consolidated.activeOnlineCount,
      totalOnlinePaymentsThisMonth: consolidated.onlineCollectedThisMonth,
      totalOnlinePaymentsAllTime: consolidated.onlineVerifiedAllTime,
      monthFeesExpectedPhysical: consolidated.physicalExpectedThisMonth,
      monthFeesCollectedPhysical: consolidated.physicalCollectedThisMonth,
      monthFeesExpectedOnline: consolidated.onlineExpectedThisMonth,
      monthFeesCollectedOnline: consolidated.onlineCollectedThisMonth,
      netIncomeThisMonth: consolidated.netIncomeThisMonth,
      netIncomeAllTime: consolidated.netIncomeAllTime,
      newPhysicalAdmissionsThisMonth,
      leftStudentsThisMonth,
      totalCertifiedStudents,
      pendingOnlineRegistrations,
      monthFeesExpected: consolidated.physicalExpectedThisMonth,
      todayAttendanceTotal,
      todayAttendancePresent,
      unreadContactMessages,
      last6Months,
      dueFeeStudents,
    };
  },

  // --------------------------------------------------------------------------
  // PHYSICAL STUDENTS
  // --------------------------------------------------------------------------
  async getStudents(): Promise<PhysicalStudent[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_students')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        return (data || []).map((d: any) => ({
          id: d.id,
          studentIdCode: d.student_id_code,
          fullName: d.full_name,
          guardianName: d.guardian_name,
          phone: d.phone,
          whatsapp: d.whatsapp || undefined,
          gender: d.gender || undefined,
          address: d.address || undefined,
          courseSlug: d.course_slug,
          courseTitle: d.course_title,
          batchTitle: d.batch_title || undefined,
          admissionDate: d.admission_date,
          totalFee: Number(d.total_fee || 0),
          status: d.status as StudentStatus,
          admissionId: d.admission_id || undefined,
          notes: d.notes || undefined,
          createdBy: d.created_by || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      } catch (err: any) {
        console.error('Error fetching physical students:', err);
        throw new Error(err?.message || 'Failed to fetch physical students from database');
      }
    }
    return localStore.getStudents();
  },

  async createStudent(payload: Omit<PhysicalStudent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PhysicalStudent> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_students')
          .insert({
            student_id_code: payload.studentIdCode,
            full_name: payload.fullName,
            guardian_name: payload.guardianName,
            phone: payload.phone,
            whatsapp: payload.whatsapp || null,
            gender: payload.gender || null,
            address: payload.address || null,
            course_slug: payload.courseSlug,
            course_title: payload.courseTitle,
            batch_title: payload.batchTitle || 'Regular Batch',
            admission_date: payload.admissionDate,
            total_fee: payload.totalFee,
            status: payload.status,
            admission_id: payload.admissionId || null,
            notes: payload.notes || null,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            studentIdCode: data.student_id_code,
            fullName: data.full_name,
            guardianName: data.guardian_name,
            phone: data.phone,
            whatsapp: data.whatsapp || undefined,
            gender: data.gender || undefined,
            address: data.address || undefined,
            courseSlug: data.course_slug,
            courseTitle: data.course_title,
            batchTitle: data.batch_title || undefined,
            admissionDate: data.admission_date,
            totalFee: Number(data.total_fee || 0),
            status: data.status as StudentStatus,
            admissionId: data.admission_id || undefined,
            notes: data.notes || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
        if (error) {
          throw new Error(error.message || 'Failed to create physical student in database');
        }
        throw new Error('Database insert returned no student record');
      } catch (err: any) {
        console.error('Error creating student in Supabase:', err);
        throw err;
      }
    }

    const newStudent: PhysicalStudent = {
      ...payload,
      id: `stu-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return localStore.addStudent(newStudent);
  },

  async updateStudent(id: string, updates: Partial<PhysicalStudent>): Promise<PhysicalStudent | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbUpdates: any = {
          updated_at: new Date().toISOString(),
        };
        if (updates.fullName) dbUpdates.full_name = updates.fullName;
        if (updates.guardianName) dbUpdates.guardian_name = updates.guardianName;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.whatsapp !== undefined) dbUpdates.whatsapp = updates.whatsapp;
        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.address !== undefined) dbUpdates.address = updates.address;
        if (updates.batchTitle !== undefined) dbUpdates.batch_title = updates.batchTitle;
        if (updates.totalFee !== undefined) dbUpdates.total_fee = updates.totalFee;
        if (updates.status) dbUpdates.status = updates.status;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

        const { data, error } = await supabase
          .from('physical_students')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message || 'Failed to update student in database');
        }

        if (data) {
          return {
            id: data.id,
            studentIdCode: data.student_id_code,
            fullName: data.full_name,
            guardianName: data.guardian_name,
            phone: data.phone,
            whatsapp: data.whatsapp || undefined,
            gender: data.gender || undefined,
            address: data.address || undefined,
            courseSlug: data.course_slug,
            courseTitle: data.course_title,
            batchTitle: data.batch_title || undefined,
            admissionDate: data.admission_date,
            totalFee: Number(data.total_fee || 0),
            status: data.status as StudentStatus,
            admissionId: data.admission_id || undefined,
            notes: data.notes || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
        throw new Error('Database update returned no student record');
      } catch (err: any) {
        console.error('Error updating student in Supabase:', err);
        throw err;
      }
    }
    return localStore.updateStudent(id, updates);
  },

  // --------------------------------------------------------------------------
  // REGISTRATIONS / ADMISSIONS WORKFLOW
  // --------------------------------------------------------------------------
  async getAdmissions(type?: 'physical' | 'online'): Promise<AdmissionRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('admissions').select('*').order('created_at', { ascending: false });
        if (type) {
          query = query.eq('admission_type', type);
        }
        const { data, error } = await query;
        if (error) {
          throw error;
        }
        return (data || []).map((d: any) => ({
          id: d.id,
          referenceNumber: d.reference_number,
          admissionType: d.admission_type,
          fullName: d.full_name,
          guardianName: d.guardian_name || undefined,
          phone: d.phone,
          whatsapp: d.whatsapp || undefined,
          email: d.email || undefined,
          city: d.city,
          courseSlug: d.course_slug,
          courseTitle: d.course_title,
          batchPreference: d.batch_preference || undefined,
          notes: d.notes || undefined,
          status: d.status,
          userId: d.user_id || undefined,
          adminNotes: d.admin_notes || undefined,
          reviewedBy: d.reviewed_by || undefined,
          reviewedAt: d.reviewed_at || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      } catch (err: any) {
        console.error('Error fetching admissions from Supabase:', err);
        throw new Error(err?.message || 'Failed to fetch admissions from database');
      }
    }
    const all = localStore.getAdmissions();
    return type ? all.filter(a => a.admissionType === type) : all;
  },

  /**
   * Approves admission and optionally enrolls applicant as a PhysicalStudent
   */
  async approveAdmissionAndEnroll(
    admission: AdmissionRecord,
    totalFee: number,
    batchTitle: string,
    adminNotes?: string
  ): Promise<{ admission: AdmissionRecord; student?: PhysicalStudent }> {
    // 1. Update admission status
    let updatedAdm: AdmissionRecord | null = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('admissions')
          .update({
            status: 'approved',
            admin_notes: adminNotes || 'Approved by admin',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', admission.id)
          .select()
          .single();

        if (!error && data) {
          updatedAdm = {
            ...admission,
            status: 'approved',
            adminNotes: data.admin_notes,
            reviewedAt: data.reviewed_at,
          };
        }
      } catch (err) {
        console.warn('Error approving in Supabase:', err);
      }
    }

    if (!updatedAdm) {
      updatedAdm = localStore.updateAdmissionStatus(admission.id, 'approved', adminNotes) || admission;
    }

    // 2. If physical admission, auto-enroll physical student record
    let createdStudent: PhysicalStudent | undefined;
    if (admission.admissionType === 'physical') {
      const existing = (await this.getStudents()).find(
        s => s.admissionId === admission.id || (s.phone === admission.phone && s.courseSlug === admission.courseSlug)
      );

      if (!existing) {
        const codeNum = Math.floor(100 + Math.random() * 900);
        createdStudent = await this.createStudent({
          studentIdCode: `IBA-PHY-2026-${codeNum}`,
          fullName: admission.fullName,
          guardianName: admission.guardianName || 'Guardian',
          phone: admission.phone,
          whatsapp: admission.whatsapp,
          gender: 'male',
          address: admission.city || 'Sadiqabad',
          courseSlug: admission.courseSlug,
          courseTitle: admission.courseTitle,
          batchTitle: batchTitle || admission.batchPreference || 'Regular Batch',
          admissionDate: new Date().toISOString().split('T')[0],
          totalFee: totalFee > 0 ? totalFee : 5000,
          status: 'active',
          admissionId: admission.id,
          notes: `Enrolled from reference ${admission.referenceNumber}. ${adminNotes || ''}`,
        });
      } else {
        createdStudent = existing;
      }
    } else if (admission.admissionType === 'online') {
      // 3. Online Admission: activate student role, generate student code, create enrollment
      try {
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        const token = session?.access_token || '';

        await fetch('/api/admin/approve-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            admissionId: admission.id,
            adminNotes,
          }),
        });
      } catch (e) {
        console.warn('Online approval API call error:', e);
      }
    }

    return { admission: updatedAdm, student: createdStudent };
  },

  async rejectAdmission(id: string, reason?: string): Promise<AdmissionRecord | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('admissions')
          .update({
            status: 'rejected',
            admin_notes: reason || 'Application rejected by administration',
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return {
            ...data,
            referenceNumber: data.reference_number,
            admissionType: data.admission_type,
            fullName: data.full_name,
            guardianName: data.guardian_name,
            courseSlug: data.course_slug,
            courseTitle: data.course_title,
            adminNotes: data.admin_notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('Error rejecting in Supabase:', err);
      }
    }
    return localStore.updateAdmissionStatus(id, 'rejected', reason);
  },

  // --------------------------------------------------------------------------
  // PHYSICAL ATTENDANCE
  // --------------------------------------------------------------------------
  async getAttendanceForDate(date: string): Promise<PhysicalAttendanceRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_attendance')
          .select('*')
          .eq('attendance_date', date);

        if (error) throw error;

        return (data || []).map((d: any) => ({
          id: d.id,
          studentId: d.student_id,
          attendanceDate: d.attendance_date,
          status: d.status as AttendanceStatus,
          notes: d.notes || undefined,
          markedBy: d.marked_by || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      } catch (err: any) {
        console.error('Error fetching attendance:', err);
        throw new Error(err?.message || 'Failed to fetch attendance from database');
      }
    }
    return localStore.getAttendance().filter(a => a.attendanceDate === date);
  },

  async saveDailyAttendance(
    date: string,
    records: { studentId: string; status: AttendanceStatus; notes?: string }[]
  ): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const rows = records.map(r => ({
          student_id: r.studentId,
          attendance_date: date,
          status: r.status,
          notes: r.notes || null,
          updated_at: new Date().toISOString(),
        }));

        // Upsert based on unique constraint (student_id, attendance_date)
        const { error } = await supabase
          .from('physical_attendance')
          .upsert(rows, { onConflict: 'student_id,attendance_date' });

        if (!error) return true;
      } catch (err) {
        console.warn('Error upserting attendance in Supabase:', err);
      }
    }
    return localStore.saveAttendance(date, records);
  },

  // --------------------------------------------------------------------------
  // PHYSICAL FEES
  // --------------------------------------------------------------------------
  async getFeePayments(): Promise<FeePaymentRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_fee_payments')
          .select('*')
          .order('payment_date', { ascending: false });

        if (error) throw error;

        return (data || []).map((d: any) => ({
          id: d.id,
          receiptNumber: d.receipt_number,
          studentId: d.student_id,
          amount: Number(d.amount),
          paymentDate: d.payment_date,
          paymentMethod: d.payment_method as PaymentMethod,
          referenceNote: d.reference_note || undefined,
          receivedBy: d.received_by || undefined,
          createdAt: d.created_at,
        }));
      } catch (err: any) {
        console.error('Error fetching fee payments:', err);
        throw new Error(err?.message || 'Failed to fetch fee payments from database');
      }
    }
    return localStore.getFeePayments();
  },

  async recordFeePayment(payload: {
    studentId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PaymentMethod;
    referenceNote?: string;
  }): Promise<FeePaymentRecord> {
    const receiptNumber = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_fee_payments')
          .insert({
            receipt_number: receiptNumber,
            student_id: payload.studentId,
            amount: payload.amount,
            payment_date: payload.paymentDate,
            payment_method: payload.paymentMethod,
            reference_note: payload.referenceNote || null,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            receiptNumber: data.receipt_number,
            studentId: data.student_id,
            amount: Number(data.amount),
            paymentDate: data.payment_date,
            paymentMethod: data.payment_method,
            referenceNote: data.reference_note || undefined,
            createdAt: data.created_at,
          };
        }
        if (error) {
          throw new Error(error.message || 'Failed to record fee payment in database');
        }
        throw new Error('Database insert returned no payment record');
      } catch (err: any) {
        console.error('Error recording payment in Supabase:', err);
        throw err;
      }
    }

    const newPayment: FeePaymentRecord = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      studentId: payload.studentId,
      amount: payload.amount,
      paymentDate: payload.paymentDate,
      paymentMethod: payload.paymentMethod,
      referenceNote: payload.referenceNote,
      createdAt: new Date().toISOString(),
    };
    return localStore.addFeePayment(newPayment);
  },

  // --------------------------------------------------------------------------
  // ACADEMY EXPENSES
  // --------------------------------------------------------------------------
  async getExpenses(): Promise<ExpenseRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('academy_expenses')
          .select('*')
          .order('expense_date', { ascending: false });

        if (error) throw error;

        return (data || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category as ExpenseCategory,
          amount: Number(d.amount),
          expenseDate: d.expense_date,
          notes: d.notes || undefined,
          receiptReference: d.receipt_reference || undefined,
          recordedBy: d.recorded_by || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      } catch (err: any) {
        console.error('Error fetching expenses:', err);
        throw new Error(err?.message || 'Failed to fetch expenses from database');
      }
    }
    return localStore.getExpenses();
  },

  async recordExpense(payload: {
    title: string;
    category: ExpenseCategory;
    amount: number;
    expenseDate: string;
    notes?: string;
    receiptReference?: string;
  }): Promise<ExpenseRecord> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('academy_expenses')
          .insert({
            title: payload.title,
            category: payload.category,
            amount: payload.amount,
            expense_date: payload.expenseDate,
            notes: payload.notes || null,
            receipt_reference: payload.receiptReference || null,
          })
          .select()
          .single();

        if (!error && data) {
          return {
            id: data.id,
            title: data.title,
            category: data.category,
            amount: Number(data.amount),
            expenseDate: data.expense_date,
            notes: data.notes || undefined,
            receiptReference: data.receipt_reference || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
        if (error) {
          throw new Error(error.message || 'Failed to record expense in database');
        }
        throw new Error('Database insert returned no expense record');
      } catch (err: any) {
        console.error('Error recording expense in Supabase:', err);
        throw err;
      }
    }

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      title: payload.title,
      category: payload.category,
      amount: payload.amount,
      expenseDate: payload.expenseDate,
      notes: payload.notes,
      receiptReference: payload.receiptReference,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return localStore.addExpense(newExpense);
  },

  // --------------------------------------------------------------------------
  // AUDIT LOG
  // --------------------------------------------------------------------------
  async recordAuditLog(entry: {
    actorId?: string;
    actorRole?: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: any;
  }): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('audit_logs').insert({
          actor_id: entry.actorId || 'system',
          actor_role: entry.actorRole || 'manager',
          action: entry.action,
          entity: entry.entity,
          entity_id: entry.entityId || null,
          details: entry.details || null,
        });
      } catch (err) {
        console.warn('Failed to record audit log:', err);
      }
    }
  },

  // --------------------------------------------------------------------------
  // CONTACT MESSAGES (Task 1)
  // --------------------------------------------------------------------------
  async getContactMessages(): Promise<ContactMessageRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('contact_messages')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((d: any) => ({
          id: d.id,
          fullName: d.full_name,
          phone: d.phone || undefined,
          email: d.email || undefined,
          courseInterest: d.course_interest || undefined,
          message: d.message,
          status: d.status || 'new',
          adminNotes: d.admin_notes || undefined,
          handledBy: d.handled_by || undefined,
          createdAt: d.created_at,
          updatedAt: d.updated_at || undefined,
        }));
      } catch (err: any) {
        console.error('Error fetching contact messages from Supabase:', err);
        throw new Error(err?.message || 'Failed to fetch contact messages from database');
      }
    }
    return localStore.getContactMessages();
  },

  async updateContactMessage(
    id: string,
    updates: Partial<ContactMessageRecord>,
    actorId?: string
  ): Promise<ContactMessageRecord> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.adminNotes !== undefined) payload.admin_notes = updates.adminNotes;
        if (actorId) payload.handled_by = actorId;

        const { data, error } = await supabase
          .from('contact_messages')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          await this.recordAuditLog({
            actorId: actorId || 'system',
            actorRole: 'manager',
            action: 'UPDATE_CONTACT_MESSAGE',
            entity: 'contact_messages',
            entityId: id,
            details: updates,
          });

          return {
            id: data.id,
            fullName: data.full_name,
            phone: data.phone || undefined,
            email: data.email || undefined,
            courseInterest: data.course_interest || undefined,
            message: data.message,
            status: data.status,
            adminNotes: data.admin_notes || undefined,
            handledBy: data.handled_by || undefined,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err) {
        console.warn('Error updating contact message:', err);
      }
    }

    const updated = localStore.updateContactMessage(id, updates);
    if (!updated) throw new Error('Contact message not found');
    return updated;
  },

  async deleteContactMessage(id: string, actorId?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('contact_messages').delete().eq('id', id);
        if (!error) {
          await this.recordAuditLog({
            actorId: actorId || 'system',
            actorRole: 'super_admin',
            action: 'DELETE_CONTACT_MESSAGE',
            entity: 'contact_messages',
            entityId: id,
          });
          return true;
        }
      } catch (err) {
        console.warn('Error deleting contact message:', err);
      }
    }
    return localStore.deleteContactMessage(id);
  },

  // --------------------------------------------------------------------------
  // PHYSICAL STUDENT FEE & ATTENDANCE MANAGEMENT (Task 4 & 5)
  // --------------------------------------------------------------------------
  async getStudentFeeHistory(studentId: string): Promise<FeePaymentRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_fee_payments')
          .select('*')
          .eq('student_id', studentId)
          .order('payment_date', { ascending: false });

        if (error) throw error;

        return (data || []).map((d: any) => ({
          id: d.id,
          receiptNumber: d.receipt_number,
          studentId: d.student_id,
          amount: Number(d.amount),
          paymentDate: d.payment_date,
          paymentMethod: d.payment_method as PaymentMethod,
          referenceNote: d.reference_note || undefined,
          receivedBy: d.received_by || undefined,
          createdAt: d.created_at,
        }));
      } catch (err: any) {
        console.error('Error getting student fee history:', err);
        throw new Error(err?.message || 'Failed to fetch student fee history from database');
      }
    }
    return localStore.getFeePayments().filter((p) => p.studentId === studentId);
  },

  async updateFeePayment(
    id: string,
    updates: { amount?: number; paymentDate?: string; paymentMethod?: PaymentMethod; referenceNote?: string },
    actorId?: string
  ): Promise<FeePaymentRecord> {
    if (isSupabaseConfigured && supabase) {
      try {
        const payload: Record<string, any> = {};
        if (updates.amount !== undefined) payload.amount = updates.amount;
        if (updates.paymentDate !== undefined) payload.payment_date = updates.paymentDate;
        if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
        if (updates.referenceNote !== undefined) payload.reference_note = updates.referenceNote;

        const { data, error } = await supabase
          .from('physical_fee_payments')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          await this.recordAuditLog({
            actorId: actorId || 'system',
            actorRole: 'manager',
            action: 'UPDATE_FEE_PAYMENT',
            entity: 'physical_fee_payments',
            entityId: id,
            details: updates,
          });

          return {
            id: data.id,
            receiptNumber: data.receipt_number,
            studentId: data.student_id,
            amount: Number(data.amount),
            paymentDate: data.payment_date,
            paymentMethod: data.payment_method as PaymentMethod,
            referenceNote: data.reference_note || undefined,
            receivedBy: data.received_by || undefined,
            createdAt: data.created_at,
          };
        }
        if (error) {
          throw new Error(error.message || 'Failed to update fee payment in database');
        }
        throw new Error('Database update returned no payment record');
      } catch (err: any) {
        console.error('Error updating fee payment:', err);
        throw err;
      }
    }

    const updated = localStore.updateFeePayment(id, updates);
    if (!updated) throw new Error('Fee payment not found');
    return updated;
  },

  async deleteFeePayment(id: string, reason?: string, actorId?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('physical_fee_payments').delete().eq('id', id);
        if (error) {
          throw new Error(error.message || 'Failed to delete fee payment from database');
        }
        await this.recordAuditLog({
          actorId: actorId || 'system',
          actorRole: 'manager',
          action: 'DELETE_FEE_PAYMENT',
          entity: 'physical_fee_payments',
          entityId: id,
          details: { reason: reason || 'Deleted by admin' },
        });
        return true;
      } catch (err: any) {
        console.error('Error deleting fee payment:', err);
        throw err;
      }
    }
    return localStore.deleteFeePayment(id);
  },

  async getStudentAttendanceSummary(studentId: string): Promise<{
    monthlyPercentage: number;
    presentCount: number;
    absentCount: number;
    leaveCount: number;
    absentDates: string[];
    totalMarked: number;
  }> {
    let records: any[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('physical_attendance')
          .select('*')
          .eq('student_id', studentId)
          .order('attendance_date', { ascending: false });

        if (error) throw error;
        records = data || [];
      } catch (err: any) {
        console.error('Error fetching student attendance summary:', err);
        throw new Error(err?.message || 'Failed to fetch student attendance summary from database');
      }
    } else {
      records = localStore.getAttendance().filter((a) => a.studentId === studentId);
    }

    const totalMarked = records.length;
    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentRecords = records.filter((r) => r.status === 'absent');
    const absentCount = absentRecords.length;
    const leaveCount = records.filter((r) => r.status === 'leave').length;
    const absentDates = absentRecords.map((r) => r.attendance_date || r.attendanceDate);
    const monthlyPercentage = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 100;

    return {
      monthlyPercentage,
      presentCount,
      absentCount,
      leaveCount,
      absentDates,
      totalMarked,
    };
  },

  // --------------------------------------------------------------------------
  // ONLINE STUDENTS MANAGEMENT (Task 6)
  // --------------------------------------------------------------------------
  async getOnlineStudents(): Promise<any[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const [profilesRes, enrollmentsRes, certsRes, paymentsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('role', 'online_student').order('created_at', { ascending: false }),
          supabase.from('student_enrollments').select('*, courses(title, slug)'),
          supabase.from('certificates').select('*'),
          supabase.from('online_payments').select('*').order('created_at', { ascending: false }),
        ]);

        if (profilesRes.error) throw profilesRes.error;

        const enrollments = enrollmentsRes.data || [];
        const certs = certsRes.data || [];
        const payments = paymentsRes.data || [];

        return (profilesRes.data || []).map((p: any) => {
          const studentEnrollments = enrollments.filter((e: any) => e.user_id === p.id);
          const studentCerts = certs.filter((c: any) => c.user_id === p.id);
          const studentPayments = payments.filter((pay: any) => pay.user_id === p.id);
          const studentLatestPayment = studentPayments[0] || null;

          const accessState = resolveStudentAccessState({
            profile: p,
            enrollments: studentEnrollments,
            latestPayment: studentLatestPayment,
          });

          return {
            id: p.id,
            studentCode: p.student_code || 'N/A',
            fullName: p.full_name || p.email?.split('@')[0] || 'Online Learner',
            email: p.email,
            phone: p.phone || 'N/A',
            city: p.city || '',
            role: p.role,
            isActive: p.is_active,
            accessState,
            createdAt: p.created_at,
            enrollmentsCount: studentEnrollments.length,
            certificatesCount: studentCerts.length,
            enrollments: studentEnrollments,
            latestPayment: studentLatestPayment,
            payments: studentPayments,
          };
        });
      } catch (err: any) {
        console.error('Error fetching online students:', err);
        throw new Error(err?.message || 'Failed to fetch online students from database');
      }
    }

    // Fallback mock online students (only when isSupabaseConfigured is false)
    return [
      {
        id: 'usr-online-1',
        studentCode: 'IBA-ONL-2026-0001',
        fullName: 'Asim Raza',
        email: 'asim.raza@example.com',
        phone: '03009876543',
        city: 'Sadiqabad',
        role: 'online_student',
        isActive: true,
        accessState: 'active',
        createdAt: '2026-09-01T10:00:00Z',
        enrollmentsCount: 1,
        certificatesCount: 1,
        enrollments: [
          {
            id: 'enr-mock-1',
            course_id: 'crs-1',
            courses: { title: 'Digital Marketing Mastery', slug: 'digital-marketing' },
            status: 'active',
            start_date: '2026-09-01',
            expiry_date: '2027-03-01',
            progress_percent: 85,
          },
        ],
        latestPayment: {
          id: 'pay-1',
          payment_status: 'verified',
          final_amount: 5000,
          reference_number: 'IBA-PAY-2026-001',
        },
        payments: [
          {
            id: 'pay-1',
            transaction_id: 'TRX-9821-443',
            payment_method: 'easypaisa',
            final_amount: 5000,
            payment_status: 'verified',
            reference_number: 'IBA-PAY-2026-001',
            created_at: '2026-09-01',
          },
        ],
      },
      {
        id: 'usr-online-2',
        studentCode: 'IBA-ONL-2026-0002',
        fullName: 'Sana Tariq',
        email: 'sana.tariq@example.com',
        phone: '03214567890',
        city: 'Lahore',
        role: 'online_student',
        isActive: true,
        accessState: 'pending_payment',
        createdAt: '2026-09-15T12:00:00Z',
        enrollmentsCount: 0,
        certificatesCount: 0,
        enrollments: [],
        latestPayment: {
          id: 'pay-2',
          payment_status: 'pending',
          final_amount: 4500,
          reference_number: 'IBA-PAY-2026-002',
        },
        payments: [
          {
            id: 'pay-2',
            transaction_id: 'TRX-9821-444',
            payment_method: 'jazzcash',
            final_amount: 4500,
            payment_status: 'pending',
            reference_number: 'IBA-PAY-2026-002',
            created_at: '2026-09-15',
          },
        ],
      },
    ];
  },

  async getOnlineStudentDetail(studentId: string): Promise<any> {
    if (isSupabaseConfigured && supabase) {
      try {
        const [profileRes, enrollmentsRes, quizzesRes, examsRes, certsRes, paymentsRes, notesRes] =
          await Promise.all([
            supabase.from('profiles').select('*').eq('id', studentId).single(),
            supabase.from('student_enrollments').select('*, courses(*)').eq('user_id', studentId),
            supabase.from('student_quiz_attempts').select('*, course_lessons(title)').eq('user_id', studentId),
            supabase.from('final_exam_attempts').select('*, final_exams(title)').eq('user_id', studentId),
            supabase.from('certificates').select('*').eq('user_id', studentId),
            supabase.from('online_payments').select('*').eq('user_id', studentId).order('created_at', { ascending: false }),
            supabase.from('student_notes').select('*, course_lessons(title)').eq('user_id', studentId),
          ]);

        if (profileRes.error) throw profileRes.error;
        if (!profileRes.data) throw new Error('Student profile not found');

        const quizzesWithLessonTitle = (quizzesRes.data || []).map((q: any) => ({
          ...q,
          title: q.course_lessons?.title || 'Quiz',
        }));

        const enrollments = enrollmentsRes.data || [];
        const payments = paymentsRes.data || [];
        const accessState = resolveStudentAccessState({
          profile: profileRes.data,
          enrollments,
          latestPayment: payments[0] || null,
        });

        return {
          profile: profileRes.data,
          accessState,
          enrollments,
          quizzes: quizzesWithLessonTitle,
          finalExams: examsRes.data || [],
          certificates: certsRes.data || [],
          payments,
          notes: notesRes.data || [],
        };
      } catch (err: any) {
        console.error('Error fetching online student detail:', err);
        throw new Error(err?.message || 'Failed to fetch online student detail from database');
      }
    }

    return {
      profile: {
        id: studentId,
        full_name: 'Asim Raza',
        email: 'asim.raza@example.com',
        phone: '03009876543',
        city: 'Sadiqabad',
        role: 'online_student',
        is_active: true,
        student_code: 'IBA-ONL-2026-0001',
        created_at: '2026-09-01T10:00:00Z',
      },
      accessState: 'active',
      enrollments: [
        {
          id: 'enr-mock-1',
          status: 'active',
          start_date: '2026-09-01',
          expiry_date: '2027-03-01',
          progress_percentage: 85,
          courses: {
            title: 'Digital Marketing Mastery',
            slug: 'digital-marketing',
            price: 5000,
          },
        },
      ],
      quizzes: [
        { id: 'q-1', score: 90, total_marks: 100, is_passed: true, created_at: '2026-09-20', title: 'Module 1 Quiz' },
      ],
      finalExams: [
        { id: 'fe-1', score: 85, total_marks: 100, is_passed: true, created_at: '2026-10-02', final_exams: { title: 'Final Certification Exam' } },
      ],
      certificates: [
        { id: 'c-1', certificate_code: 'INSPIRE-CERT-2026-0042', course_title: 'Digital Marketing Mastery', status: 'issued', issue_date: '2026-10-03' },
      ],
      payments: [
        { id: 'p-1', transaction_id: 'TRX-9821-443', payment_method: 'easypaisa', final_amount: 5000, payment_status: 'verified', reference_number: 'IBA-PAY-2026-001', created_at: '2026-09-01' },
      ],
      notes: [],
    };
  },

  async activateOnlineStudent(studentId: string): Promise<{ ok: boolean; profile?: any; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/online-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'activate', studentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to activate student account' };
      }
      return { ok: true, profile: data.profile };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  async deactivateOnlineStudent(studentId: string, reason?: string): Promise<{ ok: boolean; profile?: any; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/online-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'deactivate', studentId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to deactivate student account' };
      }
      return { ok: true, profile: data.profile };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  async updateOnlineStudent(studentId: string, updates: { fullName?: string; phone?: string; city?: string; email?: string }): Promise<{ ok: boolean; profile?: any; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/online-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'update', studentId, ...updates }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to update student profile' };
      }
      return { ok: true, profile: data.profile };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  async resetOnlineStudentPassword(studentId: string): Promise<{ ok: boolean; message?: string; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/online-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reset_password', studentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to send password reset' };
      }
      return { ok: true, message: data.message };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  // --------------------------------------------------------------------------
  // REPORTS & ANALYTICS (Task 3)
  // --------------------------------------------------------------------------
  async getAnalyticsReport(period: string, targetMonth?: string): Promise<any> {
    const { startDate: startDateStr, endDate: endDateStr } = getKarachiPeriodRange(period, targetMonth);

    let payments: any[] = [];
    let expenses: any[] = [];
    let students: any[] = [];
    let admissions: any[] = [];
    let attendance: any[] = [];
    let onlinePayments: any[] = [];
    let certificates: any[] = [];
    let courses: any[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const [pRes, eRes, sRes, aRes, attRes, opRes, cRes, crsRes] = await Promise.all([
          supabase.from('physical_fee_payments').select('*'),
          supabase.from('academy_expenses').select('*'),
          supabase.from('physical_students').select('*'),
          supabase.from('admissions').select('*'),
          supabase.from('physical_attendance').select('*'),
          supabase.from('online_payments').select('*'),
          supabase.from('certificates').select('*'),
          supabase.from('courses').select('id, title, slug'),
        ]);

        if (pRes.error) throw pRes.error;
        if (eRes.error) throw eRes.error;
        if (sRes.error) throw sRes.error;

        payments = pRes.data || [];
        expenses = eRes.data || [];
        students = sRes.data || [];
        admissions = aRes.data || [];
        attendance = attRes.data || [];
        onlinePayments = opRes.data || [];
        certificates = cRes.data || [];
        courses = crsRes.data || [];
      } catch (err: any) {
        console.error('Error building analytics report:', err);
        throw new Error(err?.message || 'Failed to generate analytics report from database');
      }
    } else {
      payments = localStore.getFeePayments();
      expenses = localStore.getExpenses();
      students = localStore.getStudents();
      admissions = localStore.getAdmissions();
      attendance = localStore.getAttendance();
    }

    // Filter by date range
    const filteredPayments = payments.filter((p) => {
      const d = p.payment_date || p.paymentDate;
      return d && d >= startDateStr && d <= endDateStr;
    });

    const filteredExpenses = expenses.filter((e) => {
      const d = e.expense_date || e.expenseDate;
      return d && d >= startDateStr && d <= endDateStr;
    });

    const filteredAdmissions = admissions.filter((a) => {
      const d = (a.created_at || a.createdAt || '').substring(0, 10);
      return d && d >= startDateStr && d <= endDateStr;
    });

    const filteredLeftStudents = students.filter((s) => {
      const d = (s.updated_at || s.updatedAt || '').substring(0, 10);
      return s.status === 'left' && (period === 'all_time' || (d >= startDateStr && d <= endDateStr));
    });

    const filteredAttendance = attendance.filter((a) => {
      const d = a.attendance_date || a.attendanceDate;
      return d && d >= startDateStr && d <= endDateStr;
    });

    const filteredOnlinePayments = onlinePayments.filter((op) => {
      const d = (op.created_at || '').substring(0, 10);
      return d && d >= startDateStr && d <= endDateStr;
    });

    const filteredCertificates = certificates.filter((c) => {
      const d = (c.issue_date || c.created_at || '').substring(0, 10);
      return d && d >= startDateStr && d <= endDateStr;
    });

    const physicalFeeCollection = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const verifiedOnlineRevenue = filteredOnlinePayments
      .filter((op) => op.payment_status === 'verified')
      .reduce((sum, op) => sum + Number(op.final_amount || 0), 0);
    const feeCollection = physicalFeeCollection + verifiedOnlineRevenue;

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const activeStudentsCount = students.filter((s) => s.status === 'active').length;
    const expectedFeePhysical = activeStudentsCount * 5040;
    const expectedFeeOnline = filteredOnlinePayments
      .filter((op) => op.payment_status === 'pending' || op.payment_status === 'verified')
      .reduce((sum, op) => sum + Number(op.final_amount || 0), 0);
    const expectedFee = expectedFeePhysical + expectedFeeOnline;
    const netIncome = feeCollection - totalExpenses;
    const newAdmissions = filteredAdmissions.length;
    const leftStudents = filteredLeftStudents.length;

    const totalAttMarked = filteredAttendance.length;
    const presentAtt = filteredAttendance.filter((a) => a.status === 'present').length;
    const attendanceRate = totalAttMarked > 0 ? Math.round((presentAtt / totalAttMarked) * 100) : 100;

    const verifiedOnlinePayments = filteredOnlinePayments.filter((op) => op.payment_status === 'verified').length;
    const rejectedOnlinePayments = filteredOnlinePayments.filter((op) => op.payment_status === 'rejected').length;
    const certificatesIssued = filteredCertificates.filter((c) => c.status === 'issued' || !c.status).length;

    // Course breakdown table
    const courseBreakdown = (courses.length > 0 ? courses : [
      { id: 'c1', title: 'Amazon Virtual Assistant (VA)', slug: 'amazon-va' },
      { id: 'c2', title: 'Graphic Design Mastery', slug: 'graphic-design-mastery' },
      { id: 'c3', title: 'Web Development Bootcamp', slug: 'web-development-bootcamp' },
      { id: 'c4', title: 'Video Editing & Animation', slug: 'video-editing-animation' },
      { id: 'c5', title: 'Digital Marketing Mastery', slug: 'digital-marketing' },
      { id: 'c6', title: 'Shopify & Local E-Commerce', slug: 'shopify-dropshipping' },
    ]).map((c: any) => {
      const cPhysical = students.filter((s: any) => s.course_slug === c.slug || s.courseSlug === c.slug);
      const cPayments = payments.filter((p: any) => cPhysical.some((s: any) => s.id === p.student_id || s.id === p.studentId));
      const cCerts = certificates.filter((cert: any) => cert.course_title?.toLowerCase().includes(c.title?.toLowerCase()));

      return {
        courseTitle: c.title,
        physicalStudents: cPhysical.length,
        feesCollected: cPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0),
        certificatesIssued: cCerts.length,
      };
    });

    return {
      period,
      startDate: startDateStr,
      endDate: endDateStr,
      feeCollection,
      expectedFee,
      expenses: totalExpenses,
      netIncome,
      newAdmissions,
      leftStudents,
      attendanceRate,
      verifiedOnlinePayments,
      rejectedOnlinePayments,
      certificatesIssued,
      courseBreakdown,
    };
  },

  // --------------------------------------------------------------------------
  // SETTINGS: DATA BACKUP & RESTORE (Task 10)
  // --------------------------------------------------------------------------
  async exportFullDatabaseBackup(actorId?: string): Promise<any> {
    const backupTables = [
      'courses',
      'course_modules',
      'course_lessons',
      'lesson_resources',
      'physical_students',
      'physical_attendance',
      'physical_fee_payments',
      'academy_expenses',
      'admissions',
      'online_payments',
      'student_enrollments',
      'coupons',
      'offers',
      'quizzes',
      'quiz_questions',
      'final_exams',
      'final_exam_questions',
      'certificates',
      'announcements',
      'notices',
      'faqs',
      'testimonials',
      'gallery_items',
      'short_sessions',
      'contact_messages',
      'site_settings_public',
    ];

    const data: Record<string, any[]> = {};

    if (isSupabaseConfigured && supabase) {
      for (const table of backupTables) {
        try {
          const { data: rows, error } = await supabase.from(table).select('*');
          data[table] = (!error && rows) ? rows : [];
        } catch (err) {
          console.warn(`Error exporting table ${table}:`, err);
          data[table] = [];
        }
      }
    } else {
      // Offline fallback dummy
      data['physical_students'] = localStore.getStudents();
      data['admissions'] = localStore.getAdmissions();
      data['physical_fee_payments'] = localStore.getFeePayments();
      data['academy_expenses'] = localStore.getExpenses();
      data['contact_messages'] = localStore.getContactMessages();
    }

    const payload = {
      academy: 'The Inspire Business Academy',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tables: data,
    };

    await this.recordAuditLog({
      actorId: actorId || 'system',
      actorRole: 'super_admin',
      action: 'DATA_BACKUP_EXPORT',
      entity: 'backup',
      details: { tableCount: Object.keys(data).length },
    });

    return payload;
  },

  async importDatabaseBackup(
    backupData: any,
    overwrite: boolean = false,
    actorId?: string
  ): Promise<{
    success: boolean;
    tableResults: Record<string, { inserted: number; skipped: number; errors: number }>;
    error?: string;
  }> {
    if (!backupData || !backupData.tables || typeof backupData.tables !== 'object') {
      return {
        success: false,
        tableResults: {},
        error: 'Invalid backup file structure: missing "tables" mapping.',
      };
    }

    const tableResults: Record<string, { inserted: number; skipped: number; errors: number }> = {};
    const tables = Object.keys(backupData.tables);

    if (isSupabaseConfigured && supabase) {
      for (const table of tables) {
        const rows = backupData.tables[table];
        if (!Array.isArray(rows) || rows.length === 0) {
          tableResults[table] = { inserted: 0, skipped: 0, errors: 0 };
          continue;
        }

        let inserted = 0;
        let skipped = 0;
        let errors = 0;

        // Process in batches of 20
        const batchSize = 20;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);

          if (overwrite) {
            // Upsert / overwrite
            const { error: upsertErr } = await supabase.from(table).upsert(batch);
            if (upsertErr) {
              errors += batch.length;
            } else {
              inserted += batch.length;
            }
          } else {
            // MERGE ONLY: insert with ignoreDuplicates: true
            const { error: insertErr } = await supabase.from(table).upsert(batch, { ignoreDuplicates: true });
            if (insertErr) {
              errors += batch.length;
            } else {
              inserted += batch.length;
            }
          }
        }

        tableResults[table] = { inserted, skipped, errors };
      }
    } else {
      for (const table of tables) {
        const rows = backupData.tables[table] || [];
        tableResults[table] = { inserted: rows.length, skipped: 0, errors: 0 };
      }
    }

    await this.recordAuditLog({
      actorId: actorId || 'system',
      actorRole: 'super_admin',
      action: 'DATA_BACKUP_IMPORT',
      entity: 'backup',
      details: { overwrite, tableResults },
    });

    return {
      success: true,
      tableResults,
    };
  },
};

