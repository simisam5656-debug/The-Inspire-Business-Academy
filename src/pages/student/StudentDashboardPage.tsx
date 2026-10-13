import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { StudentLmsService } from '../../services/studentLmsService';
import { CourseService } from '../../services/courseService';
import { CmsService } from '../../services/cmsService';
import {
  StudentAccessService,
  StudentAccessResult,
  StudentAccessState,
} from '../../services/studentAccessService';
import { StudentEnrollment, CourseCMS, AnnouncementRecord } from '../../types';
import {
  GraduationCap,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Megaphone,
  Star,
  Lock,
  MessageCircle,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';
import { siteConfig } from '../../config/site';

export const StudentDashboardPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [accessInfo, setAccessInfo] = useState<StudentAccessResult>({
    state: 'no_enrollment',
    enrolledCourses: [],
    expiryDate: null,
    latestPayment: null,
    rejectionReason: null,
    isDeactivated: false,
  });
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [allNotesCount, setAllNotesCount] = useState(0);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);

  // Feedback Toast for blocked navigation attempts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Student Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const rawPhone = siteConfig.whatsapp.replace(/[^0-9]/g, '');
  const waNumber = rawPhone.startsWith('0') ? `92${rawPhone.slice(1)}` : rawPhone;
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    'Assalam-o-Alaikum, I need assistance with my student account at The Inspire Business Academy.'
  )}`;

  // Toast handler for navigation redirects
  useEffect(() => {
    if (location.state?.lockedAttempt) {
      setToastMessage(
        isRoman
          ? 'Yeh section aapke account ke liye abhi locked hai. Pehle dakhla / payment ki tasdeeq zaroori hai.'
          : 'This section is currently locked for your account. Active enrollment is required.'
      );
      // Clear history state to avoid showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isRoman]);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [accessRes, allC, notes, anns] = await Promise.all([
          StudentAccessService.getStudentAccess(user.id),
          CourseService.getAllCourses(),
          StudentLmsService.getAllStudentNotes(user.id),
          CmsService.getAnnouncements(true),
        ]);
        setAccessInfo(accessRes);
        setCourses(allC);
        setAllNotesCount(notes.length);
        setAnnouncements(anns.filter((a) => a.targetAudience !== 'physical_only'));
      } catch (err) {
        console.error('Failed to load student dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !reviewText.trim()) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: insErr } = await supabase.from('testimonials').insert({
          student_name: profile?.fullName || user.email?.split('@')[0] || 'Online Student',
          student_city: 'Pakistan',
          course_title: activeCourse?.title || 'Online Course',
          testimonial_text: reviewText.trim(),
          rating: reviewRating,
          is_approved: false,
          submitted_by: user.id,
        });
        if (insErr) {
          const { error: fallbackErr } = await supabase.from('testimonials').insert({
            student_name: profile?.fullName || user.email?.split('@')[0] || 'Online Student',
            student_city: 'Pakistan',
            course_title: activeCourse?.title || 'Online Course',
            testimonial_text: reviewText.trim(),
            rating: reviewRating,
            is_approved: false,
          });
          if (fallbackErr) throw fallbackErr;
        }
      }
      setReviewSubmitted(true);
      setReviewText('');
    } catch (err: any) {
      setReviewError(
        err?.message || (isRoman ? 'Raye submit karne mein kharabi.' : 'Failed to submit review.')
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const enrollments = accessInfo.enrolledCourses;
  const activeEnrollment = enrollments[0];
  // Strictly find from real enrolled course; NO fallback to catalog courses[0]!
  const activeCourse = activeEnrollment
    ? courses.find((c) => c.id === activeEnrollment.courseId || c.slug === activeEnrollment.courseSlug) || null
    : null;

  const accessState = accessInfo.state;
  const isAccountDeactivated = accessState === 'deactivated' || profile?.isActive === false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title={
          isRoman
            ? 'Student Dashboard - The Inspire Business Academy'
            : 'Student Dashboard - The Inspire Academy LMS'
        }
        description="Online Student Dashboard for tracking enrolled course lessons, quizzes, and certificates."
        canonicalPath="/student"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0F1F5C] via-[#1F3FBF] to-[#254bdb] text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-blue-100">
              <GraduationCap className="w-4 h-4 text-[#F5B400]" />
              <span>{isRoman ? 'Taleemi Session 2026' : 'Academic Session 2026'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isRoman
                ? `Khush Aamdeed, ${profile?.fullName || 'Talib-e-Ilm'}!`
                : `Welcome back, ${profile?.fullName || 'Student'}!`}
            </h1>
            <p className="text-sm text-blue-100/90 leading-relaxed">
              {isRoman
                ? 'The Inspire Business Academy ke online portal mein aapka khush amdeed.'
                : 'Empowering you with verified high-income digital skills at The Inspire Business Academy.'}
            </p>
          </div>

          {accessState === 'active' && (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/student/classroom')}
                className="bg-[#F5B400] text-[#0F1F5C] hover:bg-[#E0A400] font-bold shadow-md inline-flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                <span>{isRoman ? 'Sabaq Jari Rakhein' : 'Resume Lesson'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Ambient decorative elements */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute right-32 -top-10 w-32 h-32 bg-[#F5B400]/10 rounded-full pointer-events-none" />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs text-slate-500 mt-3">
            {isRoman ? 'Dashboard data load ho raha hai...' : 'Loading student portal...'}
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* ACCESS STATE BANNER NOTICES */}
          {/* ========================================================================= */}

          {/* 1. DEACTIVATED BANNER (Highest priority, shown whenever profile is inactive) */}
          {isAccountDeactivated && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-900 shadow-xs space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-red-900">
                    {isRoman ? 'Account Ghair Faal Hai (Deactivated)' : 'Account Deactivated'}
                  </h2>
                  <p className="text-xs sm:text-sm text-red-700 leading-relaxed">
                    {isRoman
                      ? 'Your account has been deactivated by the academy. Please contact us. Aapka account academy ki taraf se band kar diya gaya hai. Mazeed maloomat ke liye rabta karein.'
                      : 'Your account has been deactivated by the academy. Please contact us to resolve your account status.'}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isRoman ? 'WhatsApp Par Rabta Karein' : 'Contact Us on WhatsApp'}</span>
                </a>
              </div>
            </div>
          )}

          {/* 2. PENDING PAYMENT BANNER */}
          {!isAccountDeactivated && accessState === 'pending_payment' && (() => {
            const isVerifiedActivating =
              accessInfo.latestPayment?.paymentStatus === 'verified' ||
              accessInfo.statusMessage === 'Payment verified, activating your access';

            return (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-900 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-amber-900">
                        {isVerifiedActivating
                          ? isRoman
                            ? 'Payment ki tasdeeq ho chuki hai, rasai faal ho rahi hai'
                            : 'Payment verified, activating your access'
                          : isRoman
                          ? 'Aapki payment admin tasdeeq ki muntazir hai'
                          : 'Your payment is waiting for admin verification'}
                      </h2>
                      <p className="text-xs sm:text-sm text-amber-800 mt-1">
                        {isVerifiedActivating
                          ? isRoman
                            ? 'Aapki fees tasdeeq ho chuki hai aur system aapka LMS dakhla faal kar raha hai. Agar thori der mein na khulay to neeche "Re-check Access" ka button dabayein.'
                            : 'Your fee payment is verified! The system is activating your LMS enrollment. Click Re-check Access to update.'
                          : isRoman
                          ? 'Payment ki tasdeeq ke baad aapka LMS classroom mukammal taur par unlock ho jaye ga.'
                          : 'Once our admin verifies your transaction receipt, your full classroom, quizzes, and certificates will be unlocked.'}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (user?.id) {
                        StudentAccessService.getStudentAccess(user.id).then((res) => setAccessInfo(res));
                      }
                    }}
                    className="shrink-0 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    {isRoman ? 'Dobara Check Karein' : 'Re-check Access'}
                  </Button>
                </div>

                {/* 3-Step Tracker */}
                <div className="bg-white rounded-xl p-4 border border-amber-100">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                    {isRoman ? 'Tasdeeq Ka Marhala' : 'Verification Progress'}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Step 1: Submitted */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-emerald-800">1. Submitted</span>
                      <span className="text-[10px] text-slate-400">Jamashuda</span>
                    </div>
                    {/* Step 2: Under verification / Verified */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 font-bold ${
                          isVerifiedActivating
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white animate-pulse'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-emerald-800">
                        {isVerifiedActivating ? '2. Verified' : '2. Under Verification'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {isVerifiedActivating ? 'Tasdeeq Shuda' : 'Zeer-e-Ghor'}
                      </span>
                    </div>
                    {/* Step 3: Approved / Activating */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 font-bold ${
                          isVerifiedActivating
                            ? 'bg-amber-500 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <span
                        className={`font-medium ${
                          isVerifiedActivating ? 'text-amber-800 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {isVerifiedActivating ? '3. Activating...' : '3. Approved'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isVerifiedActivating ? 'Faal Ho Raha Hai' : 'Manzoor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Details Meta */}
                {accessInfo.latestPayment && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-amber-100/60 p-3.5 rounded-xl border border-amber-200/60">
                    <div>
                      <span className="text-amber-700 block text-[10px] uppercase font-semibold">Reference</span>
                      <span className="font-mono font-bold text-amber-950">
                        {accessInfo.latestPayment.referenceNumber || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700 block text-[10px] uppercase font-semibold">Course</span>
                      <span className="font-bold text-amber-950 truncate block">
                        {accessInfo.latestPayment.courseTitle || 'Online Course'}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700 block text-[10px] uppercase font-semibold">Amount</span>
                      <span className="font-bold text-amber-950 font-mono">
                        Rs. {accessInfo.latestPayment.finalAmount || accessInfo.latestPayment.amount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-amber-700 block text-[10px] uppercase font-semibold">Date</span>
                      <span className="text-amber-950 font-mono">
                        {accessInfo.latestPayment.createdAt
                          ? new Date(accessInfo.latestPayment.createdAt).toLocaleDateString()
                          : 'Today'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 3. PAYMENT REJECTED BANNER */}
          {!isAccountDeactivated && accessState === 'payment_rejected' && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-red-900 shadow-xs space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-red-900">
                    {isRoman ? 'Payment Tasdeeq Mustarad Ho Gayi' : 'Payment Verification Rejected'}
                  </h2>
                  <p className="text-xs sm:text-sm text-red-700">
                    {accessInfo.rejectionReason ? (
                      <span className="font-semibold block">Reason: {accessInfo.rejectionReason}</span>
                    ) : (
                      'Payment transaction verification could not be validated.'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/join/online')}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isRoman ? 'Dobara Payment Jama Karein' : 'Submit Payment Again'}</span>
                </Button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-red-200 text-red-800 hover:bg-red-50 font-semibold text-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isRoman ? 'Support Se Rabta' : 'Contact Support'}</span>
                </a>
              </div>
            </div>
          )}

          {/* 4. SUSPENDED / EXPIRED BANNER */}
          {!isAccountDeactivated && (accessState === 'suspended' || accessState === 'expired') && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-amber-900 shadow-xs space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-amber-900">
                    {accessState === 'suspended'
                      ? isRoman
                        ? 'Dakhla Moattal Hai (Suspended)'
                        : 'Enrollment Suspended'
                      : isRoman
                      ? 'Course Muddat Khatam Ho Chuki Hai (Expired)'
                      : 'Course Enrollment Expired'}
                  </h2>
                  <p className="text-xs sm:text-sm text-amber-800">
                    {accessState === 'suspended'
                      ? isRoman
                        ? 'Aapka course intizamia ki janib se moattal kar diya gaya hai. Dobara bahali ke liye rabta karein.'
                        : 'Your course enrollment has been temporarily suspended by academy administrators.'
                      : isRoman
                      ? `Course ki muddat (${accessInfo.expiryDate || 'N/A'}) khatam ho chuki hai. Dastaras barhane ke liye renew karein.`
                      : `Your course access duration expired on ${accessInfo.expiryDate || 'N/A'}. Please renew your access.`}
                  </p>
                </div>
              </div>
              <div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{isRoman ? 'Renew / Contact Academy' : 'Renew / Contact Academy'}</span>
                </a>
              </div>
            </div>
          )}

          {/* 5. NO ENROLLMENT BANNER */}
          {!isAccountDeactivated && accessState === 'no_enrollment' && (
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6 text-blue-950 shadow-xs space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#1F3FBF] flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h2 className="text-base sm:text-lg font-bold text-[#0F1F5C]">
                    {isRoman ? 'Aap Kisi Course Mein Dakhil Nahi Hain' : 'You are not enrolled in any course yet'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    {isRoman
                      ? 'Digital skills seekhne ke liye academy ke online courses mulahiza karein aur foran dakhla lein.'
                      : 'Explore high-demand online courses and complete your admission to unlock the full LMS platform.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/courses')}
                  className="text-xs font-bold border-blue-300 text-[#1F3FBF] bg-white hover:bg-blue-50"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isRoman ? 'Courses Mulahiza Karein' : 'Browse Courses'}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/join/online')}
                  className="text-xs font-bold bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isRoman ? 'Foran Dakhla Lein' : 'Enroll Now'}</span>
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* KEY METRIC CARDS (REAL DATA ONLY, ZERO FALLBACK) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card bordered className="p-4 bg-white hover:border-[#1F3FBF]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1F3FBF] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#0F1F5C]">{enrollments.length}</div>
                  <div className="text-xs text-slate-500 font-medium">
                    {isRoman ? 'Enrolled Courses' : 'Enrolled Courses'}
                  </div>
                </div>
              </div>
            </Card>

            <Card bordered className="p-4 bg-white hover:border-[#1F3FBF]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#0F1F5C]">
                    {activeEnrollment ? `${activeEnrollment.progressPercentage}%` : '0%'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {isRoman ? 'Overall Progress' : 'Current Progress'}
                  </div>
                </div>
              </div>
            </Card>

            <Card bordered className="p-4 bg-white hover:border-[#1F3FBF]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#0F1F5C]">
                    {accessState === 'active' ? allNotesCount : 0}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {isRoman ? 'Zaati Study Notes' : 'Personal Notes'}
                  </div>
                </div>
              </div>
            </Card>

            <Card bordered className="p-4 bg-white hover:border-[#1F3FBF]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#0F1F5C]">
                    {activeEnrollment?.progressPercentage === 100 ? 'Ready' : 'Pending'}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {isRoman ? 'Sanad / Certificate' : 'Sanad Status'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* MAIN CONTENT AREA */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Enrolled Course Card */}
              {activeCourse ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F3FBF] bg-blue-50 px-2.5 py-0.5 rounded-full">
                        {isRoman ? 'Jari Course' : 'Currently Enrolled Course'}
                      </span>
                      <h2 className="text-lg font-bold text-[#0F1F5C] mt-1.5">
                        {isRoman
                          ? activeCourse.titleRomanUrdu || activeCourse.title
                          : activeCourse.title}
                      </h2>
                    </div>
                    <Badge variant="primary" size="sm">
                      {activeCourse.categoryLabel || 'Online LMS'}
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {isRoman
                      ? activeCourse.shortDescriptionRomanUrdu || activeCourse.shortDescription
                      : activeCourse.shortDescription}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600">
                        {isRoman ? 'Mukammal Shuda Raftaar' : 'Course Completion'}
                      </span>
                      <span className="text-[#1F3FBF] font-bold">
                        {activeEnrollment?.progressPercentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#1F3FBF] to-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${activeEnrollment?.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {activeCourse.onlineDurationMonths || activeCourse.durationValue || 6}{' '}
                        {activeCourse.durationUnit || 'months'}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        {activeCourse.lessonCount || 0} Lessons
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {accessState === 'active' ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/student/classroom')}
                          className="w-full sm:w-auto bg-[#1F3FBF] hover:bg-[#0F1F5C] text-xs font-bold"
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" />
                          {isRoman ? 'Classroom Kholein' : 'Open Classroom'}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full sm:w-auto text-xs font-bold text-slate-400 border-slate-200"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                          {isRoman ? 'Locked' : 'Locked'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isRoman ? 'Koi Faal Course Dastyab Nahi' : 'No Active Course Available'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {isRoman
                      ? 'Dakhla lene ke baad aapke asbaaq aur progress yahan numayan honge.'
                      : 'Once you enroll in a course, your lessons, curriculum, and progress will appear here.'}
                  </p>
                </div>
              )}

              {/* Learning Pathways / Quick Access Cards (GREYED & LOCKED IF NOT ACTIVE) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Classroom Tile */}
                {accessState === 'active' ? (
                  <Link
                    to="/student/classroom"
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1F3FBF] hover:shadow-xs transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1F3FBF] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <PlayCircle className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0F1F5C]">
                      {isRoman ? 'Video Sabaq' : 'Video Lectures'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isRoman ? 'YouTube unlisted darsgah aur prompts' : 'Unlisted HD videos & AI prompts'}
                    </p>
                  </Link>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-400 opacity-75 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center">
                        <PlayCircle className="w-4 h-4" />
                      </div>
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-600">
                      {isRoman ? 'Video Sabaq (Locked)' : 'Video Lectures (Locked)'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isRoman ? 'Dakhle ki tasdeeq darkar hai' : 'Verification required'}
                    </p>
                  </div>
                )}

                {/* Quizzes Tile */}
                {accessState === 'active' ? (
                  <Link
                    to="/student/quizzes"
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1F3FBF] hover:shadow-xs transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0F1F5C]">
                      {isRoman ? 'Quizzes & Imtihan' : 'Practice Quizzes'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isRoman ? '70% pass requirement ke sath checks' : 'Self-tests with 70% pass goal'}
                    </p>
                  </Link>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-400 opacity-75 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-600">
                      {isRoman ? 'Quizzes (Locked)' : 'Practice Quizzes (Locked)'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isRoman ? 'Dakhle ki tasdeeq darkar hai' : 'Verification required'}
                    </p>
                  </div>
                )}

                {/* Certificate Tile */}
                {accessState === 'active' ? (
                  <Link
                    to="/student/certificate"
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1F3FBF] hover:shadow-xs transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Award className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0F1F5C]">
                      {isRoman ? 'Sanad / Certificate' : 'Sanad Status'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isRoman ? 'Graduation par QR sanad verification' : 'QR-verifiable digital credential'}
                    </p>
                  </Link>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-slate-400 opacity-75 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-600">
                      {isRoman ? 'Sanad (Locked)' : 'Sanad Status (Locked)'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isRoman ? 'Dakhle ki tasdeeq darkar hai' : 'Verification required'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Notice & Student Guidelines */}
            <div className="space-y-6">
              {/* Academy Announcements */}
              {announcements.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold text-[#0F1F5C] flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-[#1F3FBF]" />
                      <span>{isRoman ? 'Academy Ailanat' : 'Official Announcements'}</span>
                    </h3>
                    <Badge variant="accent" size="sm">
                      {announcements.length}
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    {announcements.slice(0, 3).map((item) => {
                      const title = isRoman && item.titleRomanUrdu ? item.titleRomanUrdu : item.title;
                      const content =
                        isRoman && item.contentRomanUrdu ? item.contentRomanUrdu : item.content;
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(item.createdAt || item.startDate || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">{content}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Student Review Card (Unlocked only for active students) */}
              {accessState === 'active' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-2xs">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold text-[#0F1F5C] flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>{isRoman ? 'Aapki Qeemti Raye / Feedback' : 'Student Review & Feedback'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isRoman
                        ? 'Apne seekhne ke tajurbe par academy ko rating aur raye dein.'
                        : 'Share your feedback to help us enhance course delivery.'}
                    </p>
                  </div>

                  {reviewSubmitted ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-emerald-800">
                        {isRoman ? 'Shukriya! Aapki raye darj ho chuki hai.' : 'Thank you! Your feedback has been received.'}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-slate-500 mb-1">
                          {isRoman ? 'Rating Muntakhab Karein:' : 'Rating:'}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= reviewRating
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-[11px] font-bold text-slate-700 ml-2 font-mono">
                            {reviewRating}/5 Stars
                          </span>
                        </div>
                      </div>

                      <div>
                        <textarea
                          required
                          rows={3}
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder={
                            isRoman
                              ? 'Academy ki online videos, asbaaq aur guidance ke bare mein apni raye likhein...'
                              : 'Write your honest feedback regarding lectures, trainer support and course practicals...'
                          }
                          className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#1F3FBF]/20 focus:border-[#1F3FBF]"
                        />
                      </div>

                      {reviewError && (
                        <p className="text-[11px] text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{reviewError}</span>
                        </p>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={submittingReview || !reviewText.trim()}
                        className="w-full text-xs font-bold"
                      >
                        {submittingReview
                          ? isRoman
                            ? 'Bheja ja raha hai...'
                            : 'Submitting...'
                          : isRoman
                          ? 'Raye Submit Karein'
                          : 'Submit Review'}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
