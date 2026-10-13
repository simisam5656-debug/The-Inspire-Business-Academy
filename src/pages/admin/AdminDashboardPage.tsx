import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AdminService } from '../../services/adminService';
import { DashboardMetrics, DueFeeStudent } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import {
  Users,
  UserPlus,
  UserMinus,
  Award,
  FileCheck,
  CreditCard,
  DollarSign,
  CalendarCheck,
  Receipt,
  Mail,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Phone,
  CheckCircle2,
  HelpCircle,
  Laptop,
  Globe,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { profile, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await AdminService.getDashboardMetrics();
        if (isMounted) {
          setMetrics(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || (isRoman ? 'Dashboard metrics load nahi ho sakay.' : 'Failed to load metrics.'));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [isRoman]);

  const maxFinancialVal = metrics
    ? Math.max(metrics.monthFeesExpected, metrics.monthFeesCollected, metrics.monthExpensesTotal, 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F3FBF]">
              {isRoman ? 'Academy Control Center' : 'Academy Control Center'}
            </span>
            <Badge variant={isSuperAdmin ? 'accent' : 'secondary'} size="sm">
              {isSuperAdmin ? 'Super Admin Access' : 'Manager Access'}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman
              ? `Khush Amdeed, ${profile?.fullName || 'Admin'}!`
              : `Welcome, ${profile?.fullName || 'Admin'}!`}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Physical Academy Sadiqabad ke dakhlay, attendance, fees aur ikhrajat ka amli jaiza.'
              : 'Real-time operational summary and fee ledger of Physical Academy Sadiqabad.'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/admin/attendance"
            className="inline-flex items-center text-xs font-semibold px-3 py-2 bg-[#FFC20E] text-[#0F1F5C] rounded-lg hover:bg-yellow-400 transition-colors shadow-2xs"
          >
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
            {isRoman ? 'Hazri Lagayein' : 'Mark Attendance'}
          </Link>
          <Link
            to="/admin/fees"
            className="inline-flex items-center text-xs font-semibold px-3 py-2 bg-[#1F3FBF] text-white rounded-lg hover:bg-[#0F1F5C] transition-colors shadow-2xs"
          >
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            {isRoman ? 'Fee Wasooli' : 'Fee Collection'}
          </Link>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Spinner size="lg" variant="primary" className="mx-auto mb-3" />
          <p className="text-xs text-slate-500">
            {isRoman ? 'Database se taza tareen numbers jama kiye ja rahe hain...' : 'Aggregating live operational metrics...'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 10 Required Metric Cards */}
      {metrics && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Physical Current Active Students */}
          <Link
            to="/admin/students"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Physical Active Students' : 'Physical Active Students'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1F3FBF] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#0F1F5C] tracking-tight">
                {metrics.totalPhysicalActiveStudents}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Mojooda active batch talba' : 'Current active roster'}
              </p>
            </div>
          </Link>

          {/* Card 2: New Physical Admissions this month */}
          <Link
            to="/admin/registrations"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Naye Dakhlay (Is Mah)' : 'New Admissions (This Mo)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {metrics.newPhysicalAdmissionsThisMonth}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Is mahine naye physical dakhlay' : 'Admitted this calendar month'}
              </p>
            </div>
          </Link>

          {/* Card 3: Left Students this month */}
          <Link
            to="/admin/students"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Chhor Gaye (Left Students)' : 'Left Students (This Mo)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <UserMinus className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-700 tracking-tight">
                {metrics.leftStudentsThisMonth}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Is mahine academy chhorne walay' : 'Status set to left this month'}
              </p>
            </div>
          </Link>

          {/* Card 4: Total Certified Students (all time) */}
          <Link
            to="/admin/certificates"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Sanad Yafta (Certified)' : 'Certified (All Time)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#0F1F5C] tracking-tight">
                {metrics.totalCertifiedStudents}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Kul jari shuda certificates' : 'Total certificates issued'}
              </p>
            </div>
          </Link>

          {/* Card 5: Pending Online Registrations */}
          <Link
            to="/admin/registrations"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Pending Dakhlay' : 'Pending Registrations'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-700 tracking-tight">
                {metrics.pendingOnlineRegistrations}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Jaiza talab darDarkhwastein' : 'Awaiting review and approval'}
              </p>
            </div>
          </Link>

          {/* Card 6: Total Fee Collection this month */}
          <Link
            to="/admin/fees"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Fee Wasooli (Is Mah)' : 'Fee Collection (This Mo)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                Rs. {metrics.monthFeesCollected.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Physical fee receipts' : 'Actual collected fees'}
              </p>
            </div>
          </Link>

          {/* Card 7: Total Fee Expected this month */}
          <Link
            to="/admin/fees"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Mutawaqqa Fee (Is Mah)' : 'Expected Fee (This Mo)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1F3FBF] flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#0F1F5C] tracking-tight">
                Rs. {metrics.monthFeesExpected.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Active talba × Rs 5,040' : 'Active students × Rs 5,040'}
              </p>
            </div>
          </Link>

          {/* Card 8: Today's Attendance (present of total) */}
          <Link
            to="/admin/attendance"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Aaj Ki Hazri' : "Today's Attendance"}
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-[#0F1F5C] tracking-tight">
                {metrics.todayAttendancePresent}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / {metrics.todayAttendanceTotal || metrics.totalPhysicalActiveStudents}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {metrics.todayAttendanceTotal > 0
                  ? `${Math.round((metrics.todayAttendancePresent / metrics.todayAttendanceTotal) * 100)}% Present`
                  : isRoman
                  ? 'Abhi mark nahi hui'
                  : 'Not marked yet'}
              </p>
            </div>
          </Link>

          {/* Card 9: This Month Expenses */}
          <Link
            to="/admin/expenses"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Is Mah Ke Ikhrajat' : 'Month Expenses'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-rose-700 tracking-tight">
                Rs. {metrics.monthExpensesTotal.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Lab rent, bijli, operational' : 'Campus utilities & operations'}
              </p>
            </div>
          </Link>

          {/* Card 10: Unread Contact Messages */}
          <Link
            to="/admin/messages"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Unread Rabta Paigham' : 'Unread Messages'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-purple-700 tracking-tight">
                {metrics.unreadContactMessages}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Naye website contact form' : 'New website contact form'}
              </p>
            </div>
          </Link>

          {/* Card 11: Online Students (Active Count) */}
          <Link
            to="/admin/online-students"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Online Active Talba' : 'Online Students (Active)'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-sky-700 tracking-tight">
                {metrics.activeOnlineStudents ?? metrics.activeOnlineEnrollments ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Faal online enrollments' : 'Active online enrollments'}
              </p>
            </div>
          </Link>

          {/* Card 12: Pending Online Payments */}
          <Link
            to="/admin/online-payments"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Pending Online Fees' : 'Pending Online Payments'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-amber-700 tracking-tight">
                {metrics.pendingOnlinePayments ?? 0}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman ? 'Tasdeeq talab fees' : 'Awaiting verification'}
              </p>
            </div>
          </Link>

          {/* Card 13: Total Online Payments (This Month & All-Time) */}
          <Link
            to="/admin/online-payments"
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:border-[#1F3FBF]/50 hover:shadow-xs transition-all flex flex-col justify-between sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {isRoman ? 'Total Online Payments' : 'Total Online Payments'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                Rs. {(metrics.totalOnlinePaymentsThisMonth ?? 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isRoman
                  ? `Kul (All-Time): Rs. ${(metrics.totalOnlinePaymentsAllTime ?? metrics.totalOnlineRevenue ?? 0).toLocaleString()}`
                  : `All-Time: Rs. ${(metrics.totalOnlinePaymentsAllTime ?? metrics.totalOnlineRevenue ?? 0).toLocaleString()}`}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Financial Overview (expected vs collected vs expenses with CSS/SVG bars) */}
      {metrics && !loading && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Maliyati Jaiza (Financial Overview)' : 'Financial Overview'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRoman
                  ? 'Is mahine ki mutawaqqa fee, wasool shuda raqam aur ikhrajat ka muwazna'
                  : 'Comparison of monthly expected fee, collections, and operating expenses'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Net Income</span>
              <span
                className={`text-lg font-black ${
                  (metrics.netIncomeThisMonth ?? (metrics.monthFeesCollected - metrics.monthExpensesTotal)) >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                Rs. {(metrics.netIncomeThisMonth ?? (metrics.monthFeesCollected - metrics.monthExpensesTotal)).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {/* Split Section 1: Expected fee - Physical students */}
            <div className="p-4 bg-slate-50/75 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1F3FBF] inline-block"></span>
                  <span>{isRoman ? 'Expected fee - Physical students' : 'Expected fee - Physical students'}</span>
                  <span
                    className="inline-flex items-center text-slate-400 hover:text-slate-600 cursor-help"
                    title={
                      isRoman
                        ? 'Formula: Active physical talba × Rs. 5,040 mahana package fee'
                        : 'Formula: Active physical students × Rs. 5,040 monthly tuition fee'
                    }
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500">{isRoman ? 'Mutawaqqa:' : 'Expected:'} </span>
                  <span className="font-bold text-slate-900 mr-3">
                    Rs. {(metrics.monthFeesExpectedPhysical ?? metrics.monthFeesExpected).toLocaleString()}
                  </span>
                  <span className="text-emerald-700 font-semibold">{isRoman ? 'Wasool:' : 'Collected:'} </span>
                  <span className="font-bold text-emerald-800">
                    Rs. {(metrics.monthFeesCollectedPhysical ?? metrics.monthFeesCollected).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#1F3FBF] h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (metrics.monthFeesExpectedPhysical || metrics.monthFeesExpected) > 0
                        ? ((metrics.monthFeesCollectedPhysical ?? metrics.monthFeesCollected) /
                            (metrics.monthFeesExpectedPhysical || metrics.monthFeesExpected)) *
                            100
                        : 0
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Split Section 2: Expected fee - Online students */}
            <div className="p-4 bg-slate-50/75 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span>
                  <span>{isRoman ? 'Expected fee - Online students' : 'Expected fee - Online students'}</span>
                  <span
                    className="inline-flex items-center text-slate-400 hover:text-slate-600 cursor-help"
                    title={
                      isRoman
                        ? 'Formula: Is mahine ki online payments jo pending ya verified hain; wasool shuda = sirf verified payments'
                        : 'Formula: Online payments submitted this month that are pending or verified; collected = verified'
                    }
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-500">{isRoman ? 'Mutawaqqa:' : 'Expected:'} </span>
                  <span className="font-bold text-slate-900 mr-3">
                    Rs. {(metrics.monthFeesExpectedOnline ?? 0).toLocaleString()}
                  </span>
                  <span className="text-emerald-700 font-semibold">{isRoman ? 'Wasool:' : 'Collected:'} </span>
                  <span className="font-bold text-emerald-800">
                    Rs. {(metrics.monthFeesCollectedOnline ?? metrics.totalOnlinePaymentsThisMonth ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-sky-600 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (metrics.monthFeesExpectedOnline || 0) > 0
                        ? ((metrics.monthFeesCollectedOnline ?? metrics.totalOnlinePaymentsThisMonth ?? 0) /
                            (metrics.monthFeesExpectedOnline || 1)) *
                            100
                        : (metrics.monthFeesCollectedOnline || 0) > 0
                        ? 100
                        : 0
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Collected Fees Bar (Consolidated) */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-800 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 mr-2 inline-block"></span>
                  {isRoman ? 'Kul Wasool Shuda Fee (Physical + Online)' : 'Total Collections (Physical + Online)'}
                </span>
                <span className="text-emerald-900 font-bold">
                  Rs. {metrics.monthFeesCollected.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (metrics.monthFeesCollected / maxFinancialVal) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Expenses Bar */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-800 flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 mr-2 inline-block"></span>
                  {isRoman ? 'Mahana Ikhrajat (Expenses)' : 'Monthly Operating Expenses'}
                </span>
                <span className="text-rose-900 font-bold">
                  Rs. {metrics.monthExpensesTotal.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-rose-500 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (metrics.monthExpensesTotal / maxFinancialVal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last 6 Months (one card per month with ONLY fee collection, expenses, new admissions, left students, net income) */}
      {metrics && metrics.last6Months && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Pichhle 6 Maah Ka Jaiza' : 'Last 6 Months Performance'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRoman
                  ? 'Har mahine ki fee wasooli, ikhrajat, naye dakhlay, chhorne walay aur khalis aamdani'
                  : 'Monthly historical breakdown of collections, expenses, admissions, departures, and net income'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {metrics.last6Months.map((m) => (
              <div
                key={m.month}
                className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
              >
                <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F1F5C]">{m.monthLabel}</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRoman ? 'Wasooli' : 'Fee Collection'}:</span>
                    <span className="font-semibold text-slate-900">Rs. {m.feeCollection.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRoman ? 'Ikhrajat' : 'Expenses'}:</span>
                    <span className="font-semibold text-rose-700">Rs. {m.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRoman ? 'Naye Dakhlay' : 'New Admissions'}:</span>
                    <span className="font-semibold text-emerald-700">{m.newAdmissions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isRoman ? 'Chhor Gaye' : 'Left Students'}:</span>
                    <span className="font-semibold text-slate-700">{m.leftStudents}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">{isRoman ? 'Khalis' : 'Net'}:</span>
                  <span
                    className={`font-black ${
                      m.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    Rs. {m.netIncome.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table of Overdue & Nearest-Due Fee Students */}
      {metrics && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Wajib-ul-Ada Fee & Qareeb Tareen Tareekh' : 'Overdue & Upcoming Due Fees'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRoman
                  ? 'Wajib-ul-ada (overdue) talba pehle, iske baad qareeb tareen due date walay talba'
                  : 'Students with overdue fees listed first, followed by nearest due dates'}
              </p>
            </div>
            <Link
              to="/admin/fees"
              className="text-xs font-semibold text-[#1F3FBF] hover:underline flex items-center"
            >
              {isRoman ? 'Tamam Fee Ledger Dekhein' : 'View Full Fee Ledger'} &rarr;
            </Link>
          </div>

          {!metrics.dueFeeStudents || metrics.dueFeeStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              {isRoman ? 'Tamam active talba ki fee bar-waqt ada hai.' : 'No overdue or due fee records found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">{isRoman ? 'Talib-e-Ilm' : 'Student Name'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Student ID' : 'Student ID'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Course' : 'Course'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Phone' : 'Phone'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Mahana Fee' : 'Monthly Fee'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Tareekh-e-Adaigi' : 'Due Date'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Tafseel (Overdue / Baqi)' : 'Overdue / Days Left'}</th>
                    <th className="py-3 px-4">{isRoman ? 'Status' : 'Status'}</th>
                    <th className="py-3 px-4 text-right">{isRoman ? 'Iqdaam' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {metrics.dueFeeStudents.map((s) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        s.isOverdue ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[#0F1F5C]">{s.fullName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{s.studentIdCode}</td>
                      <td className="py-3 px-4 text-slate-600">{s.courseTitle}</td>
                      <td className="py-3 px-4">
                        {s.phone ? (
                          <a href={`tel:${s.phone}`} className="text-[#1F3FBF] hover:underline flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-slate-400" />
                            {s.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">Rs. {s.monthlyFee.toLocaleString()}</div>
                        {s.remainingBalance !== undefined && s.remainingBalance > 0 && (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            {isRoman ? 'Baqaya' : 'Remaining'}: Rs. {s.remainingBalance.toLocaleString()}
                          </span>
                        )}
                        {s.remainingBalance === 0 && (
                          <span className="block text-[10px] text-emerald-700 font-semibold">
                            {isRoman ? 'Ada Shuda' : 'Fully Paid'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{s.dueDate}</td>
                      <td className="py-3 px-4">
                        {s.isOverdue ? (
                          <span className="inline-flex items-center text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {s.daysDiff} {isRoman ? 'din takheer (Overdue)' : 'days overdue'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            <Clock className="w-3 h-3 mr-1 text-slate-400" />
                            {s.daysDiff} {isRoman ? 'din baqi' : 'days left'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {s.feeStatus === 'partial' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900 border border-amber-300">
                              Partial
                            </span>
                          )}
                          {s.feeStatus === 'paid' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Paid
                            </span>
                          )}
                          {(!s.feeStatus || s.feeStatus === 'due') && s.isOverdue && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-300">
                              Overdue
                            </span>
                          )}
                          {(!s.feeStatus || s.feeStatus === 'due') && !s.isOverdue && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-300">
                              Due
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="primary"
                          className="text-[11px] px-2.5 py-1 h-auto whitespace-nowrap"
                          onClick={() => navigate('/admin/fees')}
                        >
                          {isRoman ? 'Fee Wasool Karein' : 'Record Payment'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
