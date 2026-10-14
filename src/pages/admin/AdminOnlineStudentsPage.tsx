import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { AdminService } from '../../services/adminService';
import { EnrollmentService } from '../../services/enrollmentService';
import { CourseService } from '../../services/courseService';
import {
  GraduationCap,
  Search,
  Filter,
  User,
  Mail,
  Phone,
  BookOpen,
  Award,
  CreditCard,
  FileCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Play,
  Pause,
  X,
  FileText,
  KeyRound,
  ExternalLink,
  Edit,
  Save,
  ShieldAlert,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { StudentAccessState } from '../../services/studentAccessService';

export const AdminOnlineStudentsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const navigate = useNavigate();

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Detail drawer states
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [extendDaysModal, setExtendDaysModal] = useState<{ enrollmentId: string } | null>(null);
  const [customDays, setCustomDays] = useState(30);

  // Deactivate modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');

  // Edit profile form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Manual enroll (admin grants a course without payment, e.g. cash payment)
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollCourses, setEnrollCourses] = useState<any[]>([]);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollReason, setEnrollReason] = useState('');

  const openEnrollModal = async () => {
    setEnrollReason('');
    setEnrollModalOpen(true);
    try {
      const list = await CourseService.getAllCourses();
      setEnrollCourses(list);
      setEnrollCourseId(list[0]?.id || '');
    } catch {
      setEnrollCourses([]);
    }
  };

  const handleConfirmEnroll = async () => {
    if (!studentDetail?.profile?.id || !enrollCourseId) return;
    try {
      setActionLoading(true);
      const res = await EnrollmentService.manualGrantAccess(
        studentDetail.profile.id,
        enrollCourseId,
        enrollReason.trim() || 'Manual enrollment by admin'
      );
      if (!res.ok) {
        setFeedbackToast({ type: 'error', message: res.error || 'Enroll nahi ho saka.' });
        return;
      }
      setFeedbackToast({ type: 'success', message: isRoman ? 'Student course mein enroll ho gaya.' : 'Student enrolled in course.' });
      setEnrollModalOpen(false);
      await handleOpenDetail(studentDetail.profile.id);
      await loadOnlineStudents();
    } catch (err: any) {
      setFeedbackToast({ type: 'error', message: err?.message || 'Enroll nahi ho saka.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action toast / feedback banner
  const [feedbackToast, setFeedbackToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadOnlineStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminService.getOnlineStudents();
      setStudents(data);
    } catch (err: any) {
      setError(err?.message || (isRoman ? 'Online students load nahi ho sakay.' : 'Failed to load online students.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOnlineStudents();
  }, []);

  const handleOpenDetail = async (id: string) => {
    setSelectedStudentId(id);
    setDetailLoading(true);
    setIsEditingProfile(false);
    try {
      const detail = await AdminService.getOnlineStudentDetail(id);
      setStudentDetail(detail);
      setEditFullName(detail.profile?.full_name || '');
      setEditPhone(detail.profile?.phone || '');
      setEditCity(detail.profile?.city || '');
      setEditEmail(detail.profile?.email || '');
    } catch (err: any) {
      alert(err?.message || 'Failed to load student details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Account Activation
  const handleActivateStudent = async () => {
    if (!studentDetail?.profile?.id) return;
    try {
      setActionLoading(true);
      const res = await AdminService.activateOnlineStudent(studentDetail.profile.id);
      if (!res.ok) {
        setFeedbackToast({ type: 'error', message: res.error || 'Failed to activate student account' });
        return;
      }
      setFeedbackToast({
        type: 'success',
        message: isRoman ? 'Student account kamiyabi se faal ho gaya.' : 'Student account activated successfully.',
      });
      await loadOnlineStudents();
      await handleOpenDetail(studentDetail.profile.id);
    } catch (err: any) {
      setFeedbackToast({ type: 'error', message: err.message || 'Error activating account' });
    } finally {
      setActionLoading(false);
    }
  };

  // Account Deactivation
  const handleConfirmDeactivate = async () => {
    if (!studentDetail?.profile?.id) return;
    try {
      setActionLoading(true);
      const res = await AdminService.deactivateOnlineStudent(studentDetail.profile.id, deactivateReason.trim());
      if (!res.ok) {
        setFeedbackToast({ type: 'error', message: res.error || 'Failed to deactivate student account' });
        return;
      }
      setDeactivateModalOpen(false);
      setDeactivateReason('');
      setFeedbackToast({
        type: 'success',
        message: isRoman ? 'Student account band (deactivate) kar diya gaya.' : 'Student account deactivated successfully.',
      });
      await loadOnlineStudents();
      await handleOpenDetail(studentDetail.profile.id);
    } catch (err: any) {
      setFeedbackToast({ type: 'error', message: err.message || 'Error deactivating account' });
    } finally {
      setActionLoading(false);
    }
  };

  // Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentDetail?.profile?.id) return;
    try {
      setProfileSaving(true);
      const res = await AdminService.updateOnlineStudent(studentDetail.profile.id, {
        fullName: editFullName,
        phone: editPhone,
        city: editCity,
        email: editEmail,
      });
      if (!res.ok) {
        setFeedbackToast({ type: 'error', message: res.error || 'Failed to update student profile' });
        return;
      }
      setIsEditingProfile(false);
      setFeedbackToast({
        type: 'success',
        message: isRoman ? 'Student profile kamiyabi se update ho gayi.' : 'Student profile updated successfully.',
      });
      await loadOnlineStudents();
      await handleOpenDetail(studentDetail.profile.id);
    } catch (err: any) {
      setFeedbackToast({ type: 'error', message: err.message || 'Error updating profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Send Password Reset
  const handleSendPasswordReset = async () => {
    if (!studentDetail?.profile?.id) return;
    try {
      setActionLoading(true);
      const res = await AdminService.resetOnlineStudentPassword(studentDetail.profile.id);
      if (!res.ok) {
        setFeedbackToast({ type: 'error', message: res.error || 'Failed to send password reset' });
        return;
      }
      setFeedbackToast({
        type: 'success',
        message: isRoman
          ? `Password reset link ${studentDetail.profile.email} par bhaij diya gaya hai.`
          : `Password reset email sent to ${studentDetail.profile.email}.`,
      });
    } catch (err: any) {
      setFeedbackToast({ type: 'error', message: err.message || 'Error sending password reset' });
    } finally {
      setActionLoading(false);
    }
  };

  // Navigate to Online Payments
  const handleGoToPayments = () => {
    const query = studentDetail?.profile?.email || studentDetail?.profile?.student_code || '';
    navigate(`/admin/online-payments?search=${encodeURIComponent(query)}`);
  };

  // Enrollment actions
  const handleExtendEnrollment = async (enrollmentId: string, days: number) => {
    try {
      setActionLoading(true);
      const res = await EnrollmentService.extendEnrollment(enrollmentId, days, undefined, 'Admin staff extension');
      if (!res.ok) {
        alert(res.error || 'Extension failed');
        return;
      }
      if (selectedStudentId) {
        const detail = await AdminService.getOnlineStudentDetail(selectedStudentId);
        setStudentDetail(detail);
      }
      setExtendDaysModal(null);
      await loadOnlineStudents();
    } catch (err: any) {
      alert(err?.message || 'Extension failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspendEnrollment = async (enrollmentId: string) => {
    if (
      !confirm(
        isRoman
          ? 'Kiya aap waqai is student ka course access muattal (suspend) karna chahte hain?'
          : 'Are you sure you want to suspend this course enrollment?'
      )
    )
      return;
    try {
      setActionLoading(true);
      const res = await EnrollmentService.suspendEnrollment(enrollmentId, 'Suspended by admin');
      if (!res.ok) {
        alert(res.error || 'Suspend failed');
        return;
      }
      if (selectedStudentId) {
        const detail = await AdminService.getOnlineStudentDetail(selectedStudentId);
        setStudentDetail(detail);
      }
      await loadOnlineStudents();
    } catch (err: any) {
      alert(err?.message || 'Suspend failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateEnrollment = async (enrollmentId: string) => {
    try {
      setActionLoading(true);
      const res = await EnrollmentService.reactivateEnrollment(enrollmentId, 'Reactivated by admin');
      if (!res.ok) {
        alert(res.error || 'Reactivate failed');
        return;
      }
      if (selectedStudentId) {
        const detail = await AdminService.getOnlineStudentDetail(selectedStudentId);
        setStudentDetail(detail);
      }
      await loadOnlineStudents();
    } catch (err: any) {
      alert(err?.message || 'Reactivation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const renderAccessStateBadge = (state: StudentAccessState | string) => {
    switch (state) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending payment
          </span>
        );
      case 'payment_rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Rejected
          </span>
        );
      case 'deactivated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <ShieldAlert className="w-3 h-3 text-slate-600" />
            Deactivated
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <Pause className="w-3 h-3 text-orange-600" />
            Suspended
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <Calendar className="w-3 h-3 text-gray-500" />
            Expired
          </span>
        );
      case 'no_enrollment':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3 text-blue-500" />
            No enrollment
          </span>
        );
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      s.fullName?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(q));

    const matchesState = stateFilter === 'all' || s.accessState === stateFilter;
    return matchesSearch && matchesState;
  });

  const filterCounts = {
    all: students.length,
    active: students.filter((s) => s.accessState === 'active').length,
    pending_payment: students.filter((s) => s.accessState === 'pending_payment').length,
    payment_rejected: students.filter((s) => s.accessState === 'payment_rejected').length,
    deactivated: students.filter((s) => s.accessState === 'deactivated').length,
    suspended: students.filter((s) => s.accessState === 'suspended').length,
    expired: students.filter((s) => s.accessState === 'expired').length,
    no_enrollment: students.filter((s) => s.accessState === 'no_enrollment').length,
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div
          className={`p-4 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-slate-600 hover:text-slate-900 font-bold ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1F3FBF]">
              {isRoman ? 'Online LMS Portal' : 'Online LMS Portal'}
            </span>
            <Badge variant="navy" size="sm">
              {students.length} {isRoman ? 'Online Talba' : 'Online Students'}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Online Students Intizam' : 'Online Learners Management'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Recorded video courses ke talba, LMS access muddat, quizzes, exams aur certificates.'
              : 'Registered online students with course progress, quiz & exam transcripts, and access control.'}
          </p>
        </div>

        <Button onClick={loadOnlineStudents} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {isRoman ? 'Taza Karein' : 'Refresh'}
        </Button>
      </div>

      {/* Access-State Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" />
          {isRoman ? 'Filter:' : 'Filter:'}
        </span>
        {[
          { key: 'all', label: 'All', count: filterCounts.all },
          { key: 'active', label: 'Active', count: filterCounts.active },
          { key: 'pending_payment', label: 'Pending payment', count: filterCounts.pending_payment },
          { key: 'payment_rejected', label: 'Rejected', count: filterCounts.payment_rejected },
          { key: 'deactivated', label: 'Deactivated', count: filterCounts.deactivated },
          { key: 'suspended', label: 'Suspended', count: filterCounts.suspended },
          { key: 'expired', label: 'Expired', count: filterCounts.expired },
          { key: 'no_enrollment', label: 'No enrollment', count: filterCounts.no_enrollment },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStateFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              stateFilter === f.key
                ? 'bg-[#0F1F5C] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                stateFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isRoman
                ? 'Student ka naam, email, phone ya Student ID talaash karein...'
                : 'Search by learner name, email, phone or student code...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]/20 focus:border-[#1F3FBF]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" variant="primary" className="mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              {isRoman ? 'Online students load ho rahe hain...' : 'Loading online students...'}
            </p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-xs">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-500" />
            {error}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              {isRoman ? 'Koi online student record nahi mila' : 'No online students found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">{isRoman ? 'Talib-e-Ilm' : 'Student'}</th>
                  <th className="px-4 py-3">{isRoman ? 'Access Status' : 'Access Status'}</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 text-center">{isRoman ? 'Courses' : 'Enrolled Courses'}</th>
                  <th className="px-4 py-3 text-center">{isRoman ? 'Sanad' : 'Certificates'}</th>
                  <th className="px-4 py-3">{isRoman ? 'Tareekh-e-Dakhla' : 'Joined'}</th>
                  <th className="px-4 py-3 text-right">{isRoman ? 'Tafseelat' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => handleOpenDetail(s.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-[#1F3FBF]/10 text-[#1F3FBF] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {s.fullName?.[0] || 'U'}
                        </div>
                        <div>
                          <span className="block leading-tight">{s.fullName}</span>
                          {s.studentCode && s.studentCode !== 'N/A' && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {s.studentCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{renderAccessStateBadge(s.accessState)}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.email}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.phone}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#1F3FBF] font-bold">
                        {s.enrollmentsCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold">
                        {s.certificatesCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] px-2.5 py-1 h-auto"
                        onClick={() => handleOpenDetail(s.id)}
                      >
                        {isRoman ? 'Jaiza Lain' : 'View Detail'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            {detailLoading || !studentDetail ? (
              <div className="p-12 text-center m-auto">
                <Spinner size="lg" variant="primary" className="mx-auto mb-3" />
                <p className="text-xs text-slate-500">
                  {isRoman ? 'Online student ka record load ho raha hai...' : 'Loading comprehensive learner profile...'}
                </p>
              </div>
            ) : (
              <div>
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center font-bold text-lg uppercase shrink-0">
                      {studentDetail.profile?.full_name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-[#0F1F5C]">
                          {studentDetail.profile?.full_name || 'Online Learner'}
                        </h2>
                        {renderAccessStateBadge(studentDetail.accessState)}
                        {studentDetail.profile?.student_code && (
                          <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                            {studentDetail.profile.student_code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {studentDetail.profile?.email} | {studentDetail.profile?.phone || 'No phone'}
                        {studentDetail.profile?.city ? ` | ${studentDetail.profile.city}` : ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStudentId(null);
                      setStudentDetail(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Account Action Bar */}
                <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                  {/* Activate / Deactivate Button */}
                  {studentDetail.profile?.is_active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => {
                        setDeactivateReason('');
                        setDeactivateModalOpen(true);
                      }}
                      className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold"
                      leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                    >
                      {isRoman ? 'Deactivate Account' : 'Deactivate Account'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={actionLoading}
                      onClick={handleActivateStudent}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                    >
                      {isRoman ? 'Activate Account' : 'Activate Account'}
                    </Button>
                  )}

                  {/* Send Password Reset Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={handleSendPasswordReset}
                    className="border-blue-300 text-[#1F3FBF] hover:bg-blue-50 font-bold"
                    leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                  >
                    {isRoman ? 'Password Reset Bhaijein' : 'Send Password Reset'}
                  </Button>

                  {/* Edit Profile Toggle Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-200"
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                  >
                    {isEditingProfile ? (isRoman ? 'Cancel Edit' : 'Cancel Edit') : (isRoman ? 'Profile Edit Karein' : 'Edit Profile')}
                  </Button>

                  {/* Go to Payment Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGoToPayments}
                    className="border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold"
                    leftIcon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />}
                  >
                    {isRoman ? 'Payment Record Par Jayein' : 'Go to Payment'}
                  </Button>

                  {/* Manual enroll */}
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={openEnrollModal}
                    className="bg-[#1F3FBF] hover:bg-[#0F1F5C] font-semibold"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {isRoman ? 'Course Enroll Karein' : 'Enroll in Course'}
                  </Button>
                </div>

                {enrollModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-base font-bold text-[#0F1F5C]">
                          {isRoman ? 'Student Ko Course Dein' : 'Enroll Student in Course'}
                        </h3>
                        <button onClick={() => setEnrollModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Course</label>
                          <select
                            value={enrollCourseId}
                            onChange={(e) => setEnrollCourseId(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                          >
                            {enrollCourses.map((c) => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">
                            {isRoman ? 'Wajah (jaise cash payment)' : 'Reason (e.g. cash payment)'}
                          </label>
                          <input
                            value={enrollReason}
                            onChange={(e) => setEnrollReason(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2"
                            placeholder="Cash payment received"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isRoman
                            ? 'Access ki muddat course ke default ke mutabiq lagegi aur audit log mein record hoga.'
                            : 'Access uses the default duration and is recorded in the audit log.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEnrollModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="bg-[#1F3FBF]"
                          disabled={actionLoading || !enrollCourseId}
                          onClick={handleConfirmEnroll}
                        >
                          {isRoman ? 'Enroll Karein' : 'Enroll'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Profile Form Drawer Section */}
                {isEditingProfile && (
                  <form onSubmit={handleSaveProfile} className="p-5 bg-blue-50/50 border-b border-blue-200 space-y-3">
                    <h3 className="font-bold text-xs text-[#0F1F5C] uppercase tracking-wider flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5 text-[#1F3FBF]" />
                      {isRoman ? 'Student Profile Edit Karein' : 'Edit Student Profile'}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Email Address</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">City</label>
                        <input
                          type="text"
                          value={editCity}
                          onChange={(e) => setEditCity(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        disabled={profileSaving}
                        className="bg-[#1F3FBF] text-white"
                        leftIcon={<Save className="w-3.5 h-3.5" />}
                      >
                        {profileSaving ? 'Saving...' : 'Save Profile'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Drawer Content */}
                <div className="p-6 space-y-6 text-xs">
                  {/* 1. Enrolled Courses & Access Management */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-[#0F1F5C] uppercase tracking-wider text-[11px] flex items-center">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5 text-[#1F3FBF]" />
                        {isRoman ? 'Muntakhab Online Courses' : 'Enrolled Courses & LMS Access'}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {studentDetail.enrollments?.length || 0} Enrolled
                      </span>
                    </div>

                    {!studentDetail.enrollments || studentDetail.enrollments.length === 0 ? (
                      <p className="p-4 bg-slate-50 rounded-xl text-slate-400 text-center">
                        {isRoman ? 'Filhaal koi active online course enroll nahi hai.' : 'No active online enrollments.'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {studentDetail.enrollments.map((enr: any) => (
                          <div
                            key={enr.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-sm text-[#0F1F5C] block">
                                  {enr.courses?.title || 'Online Course'}
                                </span>
                                <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1 font-mono">
                                  <span>Start: {enr.start_date || 'N/A'}</span>
                                  <span>Expires: {enr.expiry_date || 'N/A'}</span>
                                </div>
                              </div>
                              <Badge
                                size="sm"
                                variant={
                                  enr.status === 'active'
                                    ? 'accent'
                                    : enr.status === 'suspended'
                                    ? 'danger'
                                    : 'secondary'
                                }
                                className="capitalize"
                              >
                                {enr.status}
                              </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div>
                              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                                <span>{isRoman ? 'Sabaq Ki Progress' : 'Course Progress'}</span>
                                <span className="font-bold">{enr.progress_percent || enr.progress_percentage || 0}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                  className="bg-[#1F3FBF] h-2 rounded-full transition-all"
                                  style={{ width: `${enr.progress_percent || enr.progress_percentage || 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Action Buttons: Extend, Suspend, Reactivate */}
                            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] px-2 py-1 h-auto"
                                disabled={actionLoading}
                                onClick={() => setExtendDaysModal({ enrollmentId: enr.id })}
                              >
                                <Clock className="w-3 h-3 mr-1 text-[#1F3FBF]" />
                                {isRoman ? 'Muddat Barhayein (Extend)' : 'Extend Expiry'}
                              </Button>

                              {enr.status === 'active' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[11px] px-2 py-1 h-auto text-rose-700 border-rose-200 hover:bg-rose-50"
                                  disabled={actionLoading}
                                  onClick={() => handleSuspendEnrollment(enr.id)}
                                >
                                  <Pause className="w-3 h-3 mr-1" />
                                  {isRoman ? 'Muattal Karein' : 'Suspend'}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="text-[11px] px-2 py-1 h-auto"
                                  disabled={actionLoading}
                                  onClick={() => handleReactivateEnrollment(enr.id)}
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  {isRoman ? 'Bahal Karein' : 'Reactivate'}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Quizzes & Exam Results */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <h3 className="font-bold text-[#0F1F5C] uppercase tracking-wider text-[11px] flex items-center">
                      <FileCheck className="w-3.5 h-3.5 mr-1.5 text-[#1F3FBF]" />
                      {isRoman ? 'Quizzes Aur Final Exams Nataij' : 'Quiz & Final Exam Results'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Quizzes */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-700 block text-[11px]">
                          Quizzes ({studentDetail.quizzes?.length || 0})
                        </span>
                        {!studentDetail.quizzes || studentDetail.quizzes.length === 0 ? (
                          <p className="text-slate-400 text-[11px]">No quiz attempts yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {studentDetail.quizzes.map((q: any) => (
                              <div
                                key={q.id}
                                className="p-2 bg-white rounded border border-slate-200 flex justify-between items-center text-[11px]"
                              >
                                <span className="font-medium text-slate-800 truncate max-w-[140px]">
                                  {q.title || 'Lesson Quiz'}
                                </span>
                                <span
                                  className={`font-bold font-mono ${
                                    q.is_passed ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {q.score}/{q.total_marks || 100}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Final Exams */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-bold text-slate-700 block text-[11px]">
                          Final Exams ({studentDetail.finalExams?.length || 0})
                        </span>
                        {!studentDetail.finalExams || studentDetail.finalExams.length === 0 ? (
                          <p className="text-slate-400 text-[11px]">No exam attempts yet</p>
                        ) : (
                          <div className="space-y-1.5">
                            {studentDetail.finalExams.map((fe: any) => (
                              <div
                                key={fe.id}
                                className="p-2 bg-white rounded border border-slate-200 flex justify-between items-center text-[11px]"
                              >
                                <span className="font-medium text-slate-800 truncate max-w-[140px]">
                                  {fe.final_exams?.title || 'Final Certification Exam'}
                                </span>
                                <span
                                  className={`font-bold font-mono ${
                                    fe.is_passed ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {fe.score}/{fe.total_marks || 100} ({fe.is_passed ? 'Passed' : 'Failed'})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Certificates & Online Payments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                    {/* Certificates */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 block text-[11px] flex items-center">
                        <Award className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Certificates ({studentDetail.certificates?.length || 0})
                      </span>
                      {!studentDetail.certificates || studentDetail.certificates.length === 0 ? (
                        <p className="text-slate-400 text-[11px]">No certificates issued</p>
                      ) : (
                        <div className="space-y-1.5">
                          {studentDetail.certificates.map((c: any) => (
                            <div key={c.id} className="p-2 bg-white rounded border border-slate-200 text-[11px]">
                              <span className="font-bold text-[#0F1F5C] block">{c.course_title}</span>
                              <span className="font-mono text-slate-500 text-[10px]">
                                {c.certificate_code} | {c.issue_date || 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Online Payments Ledger */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 block text-[11px] flex items-center">
                          <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Online Payments ({studentDetail.payments?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={handleGoToPayments}
                          className="text-[10px] text-[#1F3FBF] hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      {!studentDetail.payments || studentDetail.payments.length === 0 ? (
                        <p className="text-slate-400 text-[11px]">No payment records found</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {studentDetail.payments.map((p: any) => (
                            <div
                              key={p.id}
                              className="p-2 bg-white rounded border border-slate-200 flex justify-between items-center text-[11px]"
                            >
                              <div>
                                <span className="font-mono font-bold text-slate-800 block">
                                  {p.reference_number || `TID: ${p.transaction_id || 'N/A'}`}
                                </span>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-0.5">
                                  <span className="capitalize">{p.payment_method}</span>
                                  <span>&bull;</span>
                                  <span
                                    className={`font-semibold capitalize px-1.5 py-0.2 rounded text-[9px] ${
                                      p.payment_status === 'verified'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : p.payment_status === 'rejected'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {p.payment_status}
                                  </span>
                                </div>
                              </div>
                              <span className="font-bold text-emerald-800 font-mono">
                                Rs. {Number(p.final_amount || p.amount || 0).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4. Student Notes */}
                  {studentDetail.notes && studentDetail.notes.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <span className="font-bold text-slate-700 block text-[11px] flex items-center">
                        <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Student LMS Notes ({studentDetail.notes.length})
                      </span>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {studentDetail.notes.map((n: any) => (
                          <div key={n.id} className="p-2.5 bg-amber-50/50 rounded border border-amber-200/80 text-[11px]">
                            <span className="font-bold text-amber-900 block">{n.course_lessons?.title || 'Lesson'}</span>
                            <p className="text-slate-700 mt-0.5">{n.note_text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedStudentId(null);
                  setStudentDetail(null);
                }}
              >
                {isRoman ? 'Band Karein' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {deactivateModalOpen && studentDetail?.profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isRoman ? 'Account Deactivate Karein' : 'Deactivate Student Account'}
                </h3>
                <p className="text-slate-500 text-[11px]">
                  {studentDetail.profile.full_name} ({studentDetail.profile.email})
                </p>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed">
              {isRoman
                ? 'Kiya aap waqai is online student ka account ghair faal (deactivate) karna chahte hain? Is se student ka classroom access foran band ho jaye ga.'
                : 'Are you sure you want to deactivate this online student? This will immediately terminate any active classroom session and lock their portal access.'}
            </p>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {isRoman ? 'Deactivate Karne Ki Wajah (Optional):' : 'Reason for deactivation (Optional):'}
              </label>
              <textarea
                rows={2}
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder={isRoman ? 'Maslan: Policy violation, fees dispute waghera' : 'e.g. Terms violation, requested hold, etc.'}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeactivateModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={handleConfirmDeactivate}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {actionLoading ? 'Deactivating...' : 'Confirm Deactivation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND DAYS MODAL */}
      {extendDaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200 text-xs">
            <h3 className="text-sm font-bold text-[#0F1F5C] mb-2">
              {isRoman ? 'Course Muddat Barhayein' : 'Extend Enrollment Duration'}
            </h3>
            <p className="text-slate-500 mb-4">
              {isRoman
                ? 'Student ke access mein izafi din shamil karein (default 30 din):'
                : 'Add additional days of LMS access for this student:'}
            </p>

            <div className="flex space-x-2 mb-4">
              {[15, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setCustomDays(d)}
                  className={`flex-1 py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                    customDays === d
                      ? 'bg-[#1F3FBF] text-white border-[#1F3FBF]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  +{d} {isRoman ? 'Din' : 'Days'}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-slate-600 font-semibold mb-1">
                {isRoman ? 'Izafi Din' : 'Custom Days'}
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExtendDaysModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={() => handleExtendEnrollment(extendDaysModal.enrollmentId, customDays)}
              >
                {actionLoading ? 'Extending...' : 'Confirm Extension'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
