import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { AdminService } from '../../services/adminService';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Users,
  CreditCard,
  Receipt,
  FileCheck,
  Award,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  CheckCircle2,
  XCircle,
  BookOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

interface MonthTab {
  key: string; // '2026-10'
  label: string; // 'Oct 2026'
}

export const AdminReportsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  // Compute last 6 months
  const last6MonthsList: MonthTab[] = React.useMemo(() => {
    const list: MonthTab[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().substring(0, 7);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      list.push({ key, label });
    }
    return list;
  }, []);

  const [activeTab, setActiveTab] = useState<string>('this_month');
  const [targetMonth, setTargetMonth] = useState<string | undefined>(undefined);
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async (tab: string, month?: string) => {
    setLoading(true);
    setError(null);
    try {
      let period = tab;
      let m = month;
      if (tab.startsWith('month-')) {
        period = 'month';
        m = tab.replace('month-', '');
      }
      const data = await AdminService.getAnalyticsReport(period, m);
      setReport(data);
    } catch (err: any) {
      setError(err?.message || (isRoman ? 'Report tayyar nahi ho saki' : 'Failed to generate report'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab, targetMonth);
  }, [activeTab, targetMonth]);

  const handleTabClick = (tabKey: string, monthVal?: string) => {
    setActiveTab(tabKey);
    setTargetMonth(monthVal);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!report) return;

    const escapeCsv = (str: any) => `"${String(str ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['The Inspire Business Academy - Executive Analytics & Performance Report'],
      ['Period', report.period, 'Start Date', report.startDate, 'End Date', report.endDate],
      [],
      ['Metric', 'Amount / Value'],
      ['Total Fee Collection (Physical + Online)', `Rs. ${report.feeCollection}`],
      ['Physical Fee Collection', `Rs. ${report.physicalFeeCollection ?? report.feeCollection}`],
      ['Online Verified Revenue', `Rs. ${report.verifiedOnlineAmount ?? 0}`],
      ['Expected Fee (Total)', `Rs. ${report.expectedFee}`],
      ['Operational Expenses', `Rs. ${report.expenses}`],
      ['Net Income', `Rs. ${report.netIncome}`],
      ['New Admissions', report.newAdmissions],
      ['Left Students', report.leftStudents],
      ['Attendance Rate', `${report.attendanceRate}%`],
      ['Verified Online Payments', report.verifiedOnlinePayments],
      ['Rejected Online Payments', report.rejectedOnlinePayments],
      ['Certificates Issued', report.certificatesIssued],
      [],
      ['Course Title', 'Physical Students', 'Fees Collected (Rs)', 'Certificates Issued'],
    ];

    if (report.courseBreakdown && Array.isArray(report.courseBreakdown)) {
      for (const c of report.courseBreakdown) {
        rows.push([
          c.courseTitle,
          c.physicalStudents,
          c.feesCollected,
          c.certificatesIssued,
        ]);
      }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(escapeCsv).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IBA-Report-${report.period}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F3FBF]">
              {isRoman ? 'Intizami Reports' : 'Executive Analytics'}
            </span>
            <Badge variant="navy" size="sm">
              Live Ledger Analytics
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Reports & Maliyati Jaiza' : 'Reports & Academy Analytics'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Fee wasooli, ikhrajat, naye dakhlay, attendance aur courses ka mukammal jaiza.'
              : 'Complete operational overview across fees, expenses, admissions, attendance, and course cohorts.'}
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Button
            onClick={() => fetchReport(activeTab, targetMonth)}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            {isRoman ? 'Taza Karein' : 'Refresh'}
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm" disabled={!report}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            {isRoman ? 'Print Karein' : 'Print View'}
          </Button>
          <Button onClick={handleExportCSV} variant="primary" size="sm" disabled={!report}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isRoman ? 'CSV Export' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Quick Tabs: Today, Last 7 Days, This Month, Last 6 Months, All Time */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs overflow-x-auto print:hidden">
        <div className="flex items-center space-x-2 min-w-max">
          <button
            onClick={() => handleTabClick('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'today'
                ? 'bg-[#1F3FBF] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isRoman ? 'Aaj (Today)' : 'Today'}
          </button>
          <button
            onClick={() => handleTabClick('last_7_days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'last_7_days'
                ? 'bg-[#1F3FBF] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isRoman ? 'Guzishta 7 Din' : 'Last 7 Days'}
          </button>
          <button
            onClick={() => handleTabClick('this_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'this_month'
                ? 'bg-[#1F3FBF] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isRoman ? 'Rawaan Mah (This Month)' : 'This Month'}
          </button>

          <span className="h-4 w-px bg-slate-200 mx-1" />

          {/* Each of the Last 6 Months */}
          {last6MonthsList.map((m) => {
            const tabKey = `month-${m.key}`;
            const active = activeTab === tabKey;
            return (
              <button
                key={m.key}
                onClick={() => handleTabClick(tabKey, m.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#0F1F5C] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m.label}
              </button>
            );
          })}

          <span className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => handleTabClick('all_time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'all_time'
                ? 'bg-[#1F3FBF] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isRoman ? 'Kul Muddat (All Time)' : 'All Time'}
          </button>
        </div>
      </div>

      {/* Loading & Error */}
      {loading && (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Spinner size="lg" variant="primary" className="mx-auto mb-3" />
          <p className="text-xs text-slate-500">
            {isRoman ? 'Analytics report tayyar ki ja rahi hai...' : 'Aggregating financial and student analytics...'}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Report Content Container (Printable Area) */}
      {report && !loading && (
        <div className="space-y-6 print:space-y-4">
          {/* Print Header only visible when printing */}
          <div className="hidden print:block border-b pb-4 mb-4">
            <h1 className="text-xl font-black text-[#0F1F5C]">THE INSPIRE BUSINESS ACADEMY</h1>
            <p className="text-xs text-slate-600">Model Town, Sadiqabad | Official Financial & Academic Report</p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Period: {report.period} ({report.startDate} to {report.endDate}) | Generated:{' '}
              {new Date().toLocaleString()}
            </p>
          </div>

          {/* Metric Cards Row 1: Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isRoman ? 'Fee Wasooli' : 'Fee Collection'}
              </span>
              <div className="text-2xl font-black text-emerald-700">
                Rs. {report.feeCollection.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isRoman ? 'Physical Wasooli + Online Tasdeeq Shuda' : 'Physical collections + Online verified revenue'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isRoman ? 'Mutawaqqa Fee' : 'Expected Fee'}
              </span>
              <div className="text-2xl font-black text-[#0F1F5C]">
                Rs. {report.expectedFee.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isRoman ? 'Active batch benchmark (Rs 5,040)' : 'Active roster monthly benchmark'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isRoman ? 'Kul Ikhrajat' : 'Operating Expenses'}
              </span>
              <div className="text-2xl font-black text-rose-700">
                Rs. {report.expenses.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isRoman ? 'Lab rent, utilities, supplies' : 'Recorded academy expenses'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isRoman ? 'Khalis Aamdani (Net Income)' : 'Net Income'}
              </span>
              <div
                className={`text-2xl font-black ${
                  report.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                Rs. {report.netIncome.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {isRoman ? 'Wasooli manfi ikhrajat' : 'Collection minus expenses'}
              </p>
            </div>
          </div>

          {/* Metric Cards Row 2: Operational & Academic Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isRoman ? 'Naye Dakhlay' : 'New Admissions'}
              </span>
              <div className="text-xl font-black text-emerald-700">{report.newAdmissions}</div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isRoman ? 'Chhor Gaye' : 'Left Students'}
              </span>
              <div className="text-xl font-black text-rose-700">{report.leftStudents}</div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isRoman ? 'Hazri Shara' : 'Attendance Rate'}
              </span>
              <div className="text-xl font-black text-[#0F1F5C]">{report.attendanceRate}%</div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isRoman ? 'Online Verified' : 'Online Verified'}
              </span>
              <div className="text-xl font-black text-emerald-700">
                {report.verifiedOnlinePayments}
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isRoman ? 'Online Rejected' : 'Online Rejected'}
              </span>
              <div className="text-xl font-black text-rose-700">
                {report.rejectedOnlinePayments}
              </div>
            </div>

            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                {isRoman ? 'Sanad (Certs)' : 'Certificates'}
              </span>
              <div className="text-xl font-black text-amber-700">{report.certificatesIssued}</div>
            </div>
          </div>

          {/* Breakdown by Course Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F1F5C]">
                  {isRoman ? 'Courses Ke Mutabiq Tafseel' : 'Course-wise Academic & Fee Breakdown'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isRoman
                    ? 'Har course mein talba ki taadad, wasool shuda fee aur jari shuda certificates'
                    : 'Enrollment strength, total collected fee, and credentials awarded per vocational course'}
                </p>
              </div>
              <Badge variant="secondary" size="sm">
                {report.courseBreakdown?.length || 0} Courses
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">{isRoman ? 'Course Ka Naam' : 'Course Title'}</th>
                    <th className="py-3 px-4 text-center">{isRoman ? 'Physical Talba' : 'Physical Students'}</th>
                    <th className="py-3 px-4 text-right">{isRoman ? 'Wasool Shuda Fee' : 'Fee Collected'}</th>
                    <th className="py-3 px-4 text-center">{isRoman ? 'Jari Shuda Sanad' : 'Certificates Issued'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {report.courseBreakdown && report.courseBreakdown.length > 0 ? (
                    report.courseBreakdown.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-[#0F1F5C] flex items-center">
                          <BookOpen className="w-3.5 h-3.5 mr-2 text-[#1F3FBF]" />
                          {c.courseTitle}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">
                          {c.physicalStudents}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                          Rs. {Number(c.feesCollected).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                            <Award className="w-3 h-3 mr-1" />
                            {c.certificatesIssued}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        {isRoman ? 'Koi course data dastiyab nahi' : 'No course breakdown available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
