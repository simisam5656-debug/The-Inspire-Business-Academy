import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { EnrollmentService } from '../../services/enrollmentService';
import { DetailedEnrollmentRecord } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  GraduationCap,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  History,
  User,
  BookOpen,
  RefreshCw,
  PlusCircle,
  ShieldAlert,
} from 'lucide-react';

export const AdminEnrollmentsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin } = useAuth();

  const [enrollments, setEnrollments] = useState<DetailedEnrollmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [selectedEnrollment, setSelectedEnrollment] = useState<DetailedEnrollmentRecord | null>(null);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [daysToAdd, setDaysToAdd] = useState(30);
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [extendReason, setExtendReason] = useState('Student requested extra time to complete practical portfolio.');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await EnrollmentService.getAllEnrollments(statusFilter);
      setEnrollments(data);
    } catch (err: any) {
      setError(err?.message || 'Enrollments load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, [statusFilter]);

  const filteredEnrollments = enrollments.filter((e) => {
    const query = searchQuery.toLowerCase();
    return (
      e.studentCode?.toLowerCase().includes(query) ||
      (e.userFullName && e.userFullName.toLowerCase().includes(query)) ||
      (e.userEmail && e.userEmail.toLowerCase().includes(query)) ||
      e.courseTitle.toLowerCase().includes(query)
    );
  });

  // Metrics
  const activeCount = enrollments.filter((e) => e.status === 'active' && !e.isExpired).length;
  const expiredCount = enrollments.filter((e) => e.isExpired || e.status === 'expired').length;
  const suspendedCount = enrollments.filter((e) => e.status === 'suspended').length;

  const handleOpenExtend = (enr: DetailedEnrollmentRecord) => {
    setSelectedEnrollment(enr);
    setDaysToAdd(30);
    setCustomExpiryDate('');
    setExtendReason('Student requested extra time to complete practical portfolio.');
    setExtendModalOpen(true);
  };

  const handleConfirmExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollment) return;

    try {
      setSubmittingAction(true);
      const res = await EnrollmentService.extendEnrollment(
        selectedEnrollment.id,
        daysToAdd,
        customExpiryDate || undefined,
        extendReason
      );

      if (res.ok) {
        setExtendModalOpen(false);
        setSelectedEnrollment(null);
        await loadEnrollments();
      } else {
        alert(res.error || 'Failed to extend enrollment');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSuspend = async (enrollmentId: string) => {
    if (!confirm(isRoman ? 'Kya aap is student ka course access muattal (suspend) karna chahte hain?' : 'Are you sure you want to suspend this enrollment?')) {
      return;
    }

    try {
      setSubmittingAction(true);
      const res = await EnrollmentService.suspendEnrollment(enrollmentId, 'Administrative suspension');
      if (res.ok) {
        await loadEnrollments();
      } else {
        alert(res.error || 'Failed to suspend');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReactivate = async (enrollmentId: string) => {
    try {
      setSubmittingAction(true);
      const res = await EnrollmentService.reactivateEnrollment(enrollmentId, 'Reactivated by staff');
      if (res.ok) {
        await loadEnrollments();
      } else {
        alert(res.error || 'Failed to reactivate');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleOpenHistory = (enr: DetailedEnrollmentRecord) => {
    setSelectedEnrollment(enr);
    setHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Online Course Enrollments' : 'Online Course Enrollments'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'Tasdeeq shuda tulba ke 6-maah ke course access, expiry dates aur extensions ka control.'
              : 'Manage student course access, 6-month validity windows, extensions, and suspensions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadEnrollments}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            {isRoman ? 'Refresh Karein' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isRoman ? 'Active Access' : 'Active Students'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{activeCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRoman ? 'Course videos dekh sakte hain' : 'Can watch lectures & take quizzes'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isRoman ? 'Expired Access' : 'Expired Enrollments'}
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{expiredCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRoman ? '6-maah muddat khatam' : '6-month period completed'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              {isRoman ? 'Suspended' : 'Suspended Enrollments'}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">{suspendedCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isRoman ? 'Muattal shuda accounts' : 'Temporarily blocked'}
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              isRoman
                ? 'Search by Student Code, Name, Email, Course...'
                : 'Search by Student Code, Name, Email, Course...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F3FBF]"
          />
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-white text-[#0F1F5C] shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isRoman ? 'Tamam' : 'All'}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'active' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isRoman ? 'Active' : 'Active'}
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'expired' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isRoman ? 'Expired' : 'Expired'}
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'suspended' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isRoman ? 'Suspended' : 'Suspended'}
          </button>
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="md" className="mx-auto mb-2 text-[#1F3FBF]" />
            <p className="text-xs text-slate-500">{isRoman ? 'Enrollments load ho rahe hain...' : 'Loading enrollments...'}</p>
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi active enrollment record nahi mila' : 'No enrollment records found'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isRoman
                ? 'Online admission approve hone ke baad yahan student enrollment khud-bakhud shamil ho jati hai.'
                : 'Approved online admissions automatically generate course enrollments here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Student ID / Code</th>
                  <th className="py-3 px-4">Student Name & Email</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Validity (Start → Expiry)</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((enr) => {
                  const isActive = enr.status === 'active' && !enr.isExpired;
                  const isExpired = enr.isExpired || enr.status === 'expired';
                  const isSuspended = enr.status === 'suspended';

                  return (
                    <tr key={enr.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Student Code */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <span className="font-mono font-bold text-[#1F3FBF] bg-blue-50 px-2 py-0.5 rounded block w-fit">
                          {enr.studentCode}
                        </span>
                        {enr.extendedCount > 0 && (
                          <span className="text-[10px] text-amber-700 font-medium block mt-1">
                            +{enr.extendedCount} Extensions
                          </span>
                        )}
                      </td>

                      {/* Student Name & Email */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-800">{enr.userFullName || 'Student'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{enr.userEmail || '—'}</div>
                      </td>

                      {/* Course */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-800">{enr.courseTitle}</div>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="text-slate-700 font-mono text-[11px]">
                          {enr.startDate} <span className="text-slate-400">→</span> <strong>{enr.expiryDate}</strong>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                            Access Expired
                          </span>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-4 align-top">
                        <div className="w-24 bg-slate-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-[#1F3FBF] h-2 rounded-full"
                            style={{ width: `${Math.min(100, enr.progressPercentage)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                          {enr.progressPercentage}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {isActive && (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="accent" size="sm">
                            <Clock className="w-3 h-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {isSuspended && (
                          <Badge variant="danger" size="sm">
                            <PauseCircle className="w-3 h-3 mr-1" />
                            Suspended
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenExtend(enr)}
                            leftIcon={<PlusCircle className="w-3 h-3" />}
                            className="text-xs py-1 px-2"
                          >
                            {isRoman ? 'Extend' : 'Extend'}
                          </Button>

                          {isSuspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(enr.id)}
                              leftIcon={<PlayCircle className="w-3 h-3 text-emerald-600" />}
                              className="text-xs py-1 px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              {isRoman ? 'Reactivate' : 'Reactivate'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuspend(enr.id)}
                              leftIcon={<PauseCircle className="w-3 h-3 text-rose-600" />}
                              className="text-xs py-1 px-2 border-rose-200 text-rose-700 hover:bg-rose-50"
                            >
                              {isRoman ? 'Suspend' : 'Suspend'}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(enr)}
                            title="View History"
                            className="text-xs p-1 text-slate-400 hover:text-slate-700"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Extend Enrollment Expiry */}
      {extendModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-5">
            <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1F3FBF]" />
              {isRoman ? 'Course Access Barhayein (Extend)' : 'Extend Course Access'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Student ID: {selectedEnrollment.studentCode} · Current Expiry: {selectedEnrollment.expiryDate}
            </p>

            <form onSubmit={handleConfirmExtend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRoman ? 'Extension Ki Muddat (Days)' : 'Add Days to Current Expiry'}
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDaysToAdd(d);
                        setCustomExpiryDate('');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                        daysToAdd === d && !customExpiryDate
                          ? 'border-[#1F3FBF] bg-blue-50 text-[#1F3FBF]'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRoman ? 'Ya Khas Expiry Date Muntakhib Karein' : 'Or Pick Specific Expiry Date'}
                </label>
                <input
                  type="date"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRoman ? 'Extension Ki Waja / Admin Notes' : 'Reason / Note'}
                </label>
                <textarea
                  rows={2}
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F3FBF]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setExtendModalOpen(false)}>
                  {isRoman ? 'Cancel' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submittingAction}
                  className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
                >
                  {isRoman ? 'Extension Confirm Karein' : 'Grant Extension'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Enrollment History */}
      {historyModalOpen && selectedEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-5">
            <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
              <History className="w-4 h-4 text-[#1F3FBF]" />
              {isRoman ? 'Enrollment Activity Timeline' : 'Enrollment Activity Timeline'}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Student ID: {selectedEnrollment.studentCode} · {selectedEnrollment.courseTitle}
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800 block">Initial Enrollment</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Enrolled: {selectedEnrollment.enrolledAt.split('T')[0]} · Start: {selectedEnrollment.startDate}
                </span>
              </div>

              {selectedEnrollment.extensionHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  {isRoman ? 'Koi ezafi extension ya change record nahi hai.' : 'No extension or change history yet.'}
                </p>
              ) : (
                selectedEnrollment.extensionHistory.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[#0F1F5C]">
                      <span className="capitalize">{item.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB') : ''}
                      </span>
                    </div>
                    {item.newExpiryDate && (
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        New Expiry: <strong>{item.newExpiryDate}</strong> (Previous: {item.previousExpiryDate})
                      </span>
                    )}
                    {item.reason && (
                      <span className="text-[11px] text-slate-500 italic block mt-0.5">
                        Reason: {item.reason}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-4 mt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setHistoryModalOpen(false)}>
                {isRoman ? 'Band Karein' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
