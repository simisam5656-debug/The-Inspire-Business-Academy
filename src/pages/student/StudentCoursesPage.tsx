import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { StudentLmsService } from '../../services/studentLmsService';
import { CourseService } from '../../services/courseService';
import { PaymentService } from '../../services/paymentService';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import { compressPaymentProof } from '../../utils/imageCompressor';
import {
  StudentEnrollment,
  CourseCMS,
  OnlinePaymentRecord,
} from '../../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Upload,
  Send,
  Phone,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Tag,
  ShieldCheck,
  Building,
  Wallet,
  Smartphone,
  X,
  PlusCircle,
  Receipt,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { Input } from '../../components/ui/Input';
import { SEO } from '../../components/common/SEO';
import { siteConfig } from '../../config/site';

export const StudentCoursesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { methods: paymentMethods, loading: paymentMethodsLoading } = usePaymentMethods();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [payments, setPayments] = useState<OnlinePaymentRecord[]>([]);
  const [allOnlineCourses, setAllOnlineCourses] = useState<CourseCMS[]>([]);

  // Request Modal State
  const [modalCourse, setModalCourse] = useState<CourseCMS | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('jazzcash');
  const [transactionId, setTransactionId] = useState('');
  const [accountSenderName, setAccountSenderName] = useState('');
  const [accountSenderNumber, setAccountSenderNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Promo code & Price preview
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [pricing, setPricing] = useState<{
    basePrice: number;
    totalDiscount: number;
    finalAmount: number;
  }>({
    basePrice: 5000,
    totalDiscount: 0,
    finalAmount: 5000,
  });

  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const rawPhone = siteConfig.whatsapp.replace(/[^0-9]/g, '');
  const waNumber = rawPhone.startsWith('0') ? `92${rawPhone.slice(1)}` : rawPhone;

  // Load all data
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [enrList, payList, crsRes] = await Promise.all([
        StudentLmsService.getEnrolledCourses(user.id),
        PaymentService.getStudentPayments(user.id),
        CourseService.getCourses({ status: 'published', availableForOnline: true }),
      ]);

      setEnrollments(enrList);
      setPayments(payList);
      if (crsRes.data) {
        setAllOnlineCourses(crsRes.data);
      }
    } catch (err) {
      console.warn('Error loading student courses page data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep selected payment method valid
  useEffect(() => {
    if (paymentMethods.length > 0) {
      if (!paymentMethods.some((pm) => pm.id === selectedMethod)) {
        setSelectedMethod(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, selectedMethod]);

  // Update live price preview when modal course or promo changes
  const updateModalPrice = async (cSlug: string, code?: string) => {
    try {
      setCalculatingPrice(true);
      const res = await PaymentService.calculateAuthoritativePrice(
        cSlug,
        undefined,
        code !== undefined ? code : promoCode,
        user?.id
      );

      setPricing({
        basePrice: res.basePrice,
        totalDiscount: res.totalDiscount,
        finalAmount: res.finalAmount,
      });

      if (code) {
        if (res.coupon || res.offer) {
          setAppliedPromo(res.coupon || res.offer);
          setPromoFeedback({
            text: isRoman
              ? res.couponMessageRoman || 'Promo code lag gaya!'
              : res.couponMessage || 'Promo discount applied!',
            isError: false,
          });
        } else {
          setAppliedPromo(null);
          setPromoFeedback({
            text: isRoman
              ? res.couponMessageRoman || 'Yeh promo code ghalat hai ya expire ho chuka hai.'
              : res.couponMessage || 'Invalid or expired promo code.',
            isError: true,
          });
        }
      }
    } catch (e) {
      console.warn('Error calculating modal price:', e);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleOpenRequestModal = (course: CourseCMS) => {
    setModalCourse(course);
    const initialPrice = course.onlinePrice ?? course.price ?? 5000;
    setPricing({
      basePrice: initialPrice,
      totalDiscount: 0,
      finalAmount: initialPrice,
    });
    setPromoCode('');
    setAppliedPromo(null);
    setPromoFeedback(null);
    setTransactionId('');
    setAccountSenderName('');
    setAccountSenderNumber('');
    setScreenshotFile(null);
    setCompressedFile(null);
    setCompressionInfo(null);
    setRequestError(null);
    setSubmitSuccess(null);
    updateModalPrice(course.slug, '');
  };

  const handleCloseModal = () => {
    setModalCourse(null);
    setRequestError(null);
    setSubmitSuccess(null);
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || !modalCourse) return;
    await updateModalPrice(modalCourse.slug, promoCode.trim());
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setRequestError(
        isRoman
          ? 'Sirf JPG, PNG ya WebP image upload karein.'
          : 'Only JPG, PNG, or WebP images are supported.'
      );
      return;
    }

    setScreenshotFile(file);
    setIsCompressing(true);
    try {
      const comp = await compressPaymentProof(file, 250 * 1024);
      setCompressedFile(comp.file);
      const originalKb = Math.round(comp.originalSizeBytes / 1024);
      const compressedKb = Math.round(comp.compressedSizeBytes / 1024);
      setCompressionInfo(
        isRoman
          ? `Size: ${originalKb} KB → ${compressedKb} KB`
          : `Compressed: ${originalKb} KB → ${compressedKb} KB`
      );
    } catch (err) {
      setCompressedFile(file);
      setCompressionInfo(`${Math.round(file.size / 1024)} KB`);
    } finally {
      setIsCompressing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCourse || !user) return;
    setRequestError(null);

    if (paymentMethods.length === 0) {
      setRequestError(
        isRoman
          ? 'Payments are temporarily unavailable, please contact us on WhatsApp'
          : 'Payments are temporarily unavailable, please contact us on WhatsApp'
      );
      return;
    }

    if (!transactionId.trim() || transactionId.trim().length < 4) {
      setRequestError(
        isRoman
          ? 'Baraye meharbani Transaction ID (TID / TRX ID) darj karein.'
          : 'Please enter the Transaction ID (TID / TRX ID).'
      );
      return;
    }

    if (!compressedFile && !screenshotFile) {
      setRequestError(
        isRoman
          ? 'Payment ka screenshot upload karna zaroori hai. Pehle screenshot muntakhib karein.'
          : 'A payment screenshot is required. Please choose your receipt screenshot first.'
      );
      return;
    }

    try {
      setSubmittingRequest(true);
      const fileToUpload = compressedFile || screenshotFile || undefined;

      const submitRes = await PaymentService.submitOnlinePayment({
        fullName: profile?.fullName || user.email || 'Online Student',
        email: user.email || '',
        phone: profile?.phone || '03001234567',
        city: 'Online Student',
        courseSlug: modalCourse.slug,
        courseTitle: modalCourse.title,
        paymentMethod: selectedMethod,
        transactionId: transactionId.trim().toUpperCase(),
        accountSenderName: accountSenderName.trim() || undefined,
        accountSenderNumber: accountSenderNumber.trim() || undefined,
        screenshotFile: fileToUpload,
        couponCode: appliedPromo?.code || (promoCode.trim() || undefined),
        requestType: 'additional_course',
        userId: user.id,
      });

      if (!submitRes.ok) {
        if (submitRes.duplicateTx) {
          setRequestError(
            isRoman
              ? 'Ye Transaction ID pehle use ho chuki hai. Please apni payment details verify karein.'
              : 'This Transaction ID has already been recorded. Please check your payment details.'
          );
        } else {
          setRequestError(
            submitRes.error ||
              (isRoman ? 'Darkhwast darj nahi ho saki.' : 'Failed to submit course request.')
          );
        }
      } else {
        setSubmitSuccess(submitRes.paymentReference || 'IBA-PAY-REQUEST');
        // Refresh page data
        loadData();
      }
    } catch (err: any) {
      setRequestError(
        err?.message ||
          (isRoman ? 'Network ya server masla pesh aya.' : 'Network error during request submission.')
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  const selectedMethodConfig =
    paymentMethods.find((m) => m.id === selectedMethod) || paymentMethods[0];

  // Active / Granted course IDs and Slugs
  const activeCourseIds = new Set(
    enrollments
      .filter((e) => (e.status === 'active' || e.status === 'completed') && !e.isExpired)
      .map((e) => e.courseId)
  );
  const activeCourseSlugs = new Set(
    enrollments
      .filter((e) => (e.status === 'active' || e.status === 'completed') && !e.isExpired)
      .map((e) => e.courseSlug)
  );

  // Available courses: published online courses that the student does NOT own
  const availableCourses = allOnlineCourses.filter(
    (c) => !activeCourseIds.has(c.id) && !activeCourseSlugs.has(c.slug)
  );

  return (
    <div className="space-y-8 pb-12">
      <SEO
        title={isRoman ? 'Mere Courses & Course Darkhwast' : 'My Courses & Request a Course'}
        description="The Inspire Business Academy student course portal - View enrolled programs and request new online courses."
      />

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-blue-50 text-[#1F3FBF]">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black font-display text-[#0F1F5C]">
              {isRoman ? 'Mere Courses & Naya Course Request' : 'My Courses & Request a Course'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {isRoman
              ? 'Apne dakhil shuda courses ka status dekhein, darsgah kholain, ya naya course dakhla request submit karein.'
              : 'Review your enrolled courses, check access verification statuses, and request additional online programs.'}
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1F3FBF] hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{isRoman ? 'Refresh Karein' : 'Refresh'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs text-slate-500 mt-3 font-medium">
            {isRoman ? 'Courses load ho rahe hain...' : 'Loading course records...'}
          </p>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* SECTION 1: MY COURSES */}
          {/* ============================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F1F5C] flex items-center gap-2">
                  <span>{isRoman ? '1. Mere Courses (Enrolled Programs)' : '1. My Enrolled Courses'}</span>
                  <Badge variant="secondary" size="sm">
                    {enrollments.length}
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRoman
                    ? 'Aapke active, mukammal aur dakhlay ke marhale mein mojood courses.'
                    : 'Programs you are enrolled in with real-time access and expiry statuses.'}
                </p>
              </div>
            </div>

            {enrollments.length === 0 && payments.filter((p) => p.paymentStatus !== 'rejected').length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1F3FBF] flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#0F1F5C]">
                  {isRoman ? 'Abhi Tak Koi Course Enrolled Nahi Hai' : 'No Enrolled Courses Yet'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {isRoman
                    ? 'Neeche mojood dastyab courses mein se apna pasandeeda program muntakhib karein aur darkhwast bhejein.'
                    : 'Explore the available academy courses below and request enrollment to start learning.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Granted / Active Enrollments */}
                {enrollments.map((enr) => {
                  const isActive = (enr.status === 'active' || enr.status === 'completed') && !enr.isExpired;
                  const isSuspended = enr.status === 'suspended';
                  const isExpired = enr.isExpired || (enr.status as string) === 'expired';

                  return (
                    <Card
                      key={enr.id}
                      elevated
                      bordered
                      className="p-5 bg-white border-slate-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {enr.studentCode || enr.courseSlug}
                          </span>

                          <Badge
                            variant={isActive ? 'success' : isSuspended ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {isActive
                              ? isRoman ? 'Dastaras Faal (Active)' : 'Access Granted'
                              : isSuspended
                              ? isRoman ? 'Moattal (Suspended)' : 'Suspended'
                              : isRoman ? 'Khatam (Expired)' : 'Expired'}
                          </Badge>
                        </div>

                        <h3 className="text-base font-bold text-[#0F1F5C] line-clamp-1 mb-1">
                          {enr.courseTitle}
                        </h3>

                        <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                          {enr.expiryDate && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {isRoman ? 'Muddat / Expiry:' : 'Expiry Date:'}
                              </span>
                              <span className="font-semibold font-mono text-slate-800">
                                {enr.expiryDate}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {isRoman ? 'Tarakki (Progress):' : 'Course Progress:'}
                            </span>
                            <span className="font-bold text-[#1F3FBF]">
                              {enr.progressPercentage}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#1F3FBF] h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, enr.progressPercentage)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100">
                        {isActive ? (
                          <Link to="/student/classroom" className="block">
                            <Button
                              variant="primary"
                              fullWidth
                              size="sm"
                              className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white font-bold"
                            >
                              <BookOpen className="w-3.5 h-3.5 mr-1" />
                              {isRoman ? 'Darsgah Kholain (Open)' : 'Open Classroom'}
                            </Button>
                          </Link>
                        ) : (
                          <a
                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                              `Assalam-o-Alaikum, I need help regarding my enrollment for ${enr.courseTitle} (${enr.studentCode || ''}).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <Button variant="outline" fullWidth size="sm">
                              <Phone className="w-3.5 h-3.5 mr-1" />
                              {isRoman ? 'Madad / Renew Karein' : 'Contact Support'}
                            </Button>
                          </a>
                        )}
                      </div>
                    </Card>
                  );
                })}

                {/* 2. Pending or Ungranted Payment Records */}
                {payments
                  .filter((p) => {
                    // Show payments that aren't already represented as an active enrollment
                    return (
                      p.paymentStatus === 'pending' ||
                      (p.paymentStatus === 'verified' && p.accessStatus === 'pending') ||
                      p.paymentStatus === 'rejected' ||
                      p.accessStatus === 'denied'
                    );
                  })
                  .map((p) => {
                    const isPending = p.paymentStatus === 'pending';
                    const isWaitingAccess = p.paymentStatus === 'verified' && p.accessStatus === 'pending';
                    const isRejected = p.paymentStatus === 'rejected' || p.accessStatus === 'denied';

                    return (
                      <Card
                        key={p.id}
                        elevated
                        bordered
                        className={`p-5 bg-white flex flex-col justify-between ${
                          isRejected ? 'border-red-200' : 'border-amber-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {p.referenceNumber}
                            </span>

                            <Badge
                              variant={isRejected ? 'danger' : 'warning'}
                              size="sm"
                            >
                              {isPending
                                ? isRoman ? 'Tasdeeq Baki (Pending)' : 'Payment Pending'
                                : isWaitingAccess
                                ? isRoman ? 'Tasdeeq Shuda (Access Pending)' : 'Verified - Waiting Access'
                                : isRoman ? 'Mustarad (Denied)' : 'Rejected'}
                            </Badge>
                          </div>

                          <h3 className="text-base font-bold text-[#0F1F5C] line-clamp-1 mb-1">
                            {p.courseTitle}
                          </h3>

                          <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                {isRoman ? 'Ada Shuda Raqam:' : 'Amount Paid:'}
                              </span>
                              <span className="font-semibold font-mono text-slate-900">
                                Rs. {p.finalAmount.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                {isRoman ? 'Tareekh (Date):' : 'Date Submitted:'}
                              </span>
                              <span className="text-slate-600 font-mono">
                                {p.createdAt?.split('T')[0]}
                              </span>
                            </div>

                            {p.rejectionReason && (
                              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs mt-2">
                                <strong>{isRoman ? 'Wajah:' : 'Reason:'}</strong> {p.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100">
                          <a
                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                              `Assalam-o-Alaikum, I want to follow up regarding my payment ${p.referenceNumber} for ${p.courseTitle}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <Button
                              variant="outline"
                              fullWidth
                              size="sm"
                              className="text-xs"
                            >
                              <Phone className="w-3.5 h-3.5 mr-1" />
                              {isRoman ? 'Helpline Par Rabta Karein' : 'Follow up on WhatsApp'}
                            </Button>
                          </a>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: AVAILABLE COURSES */}
          {/* ============================================================== */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F1F5C] flex items-center gap-2">
                <span>{isRoman ? '2. Dastyab Online Courses (Request a Course)' : '2. Available Courses (Request Enrollment)'}</span>
                <Badge variant="accent" size="sm">
                  {availableCourses.length}
                </Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRoman
                  ? 'Aap in courses mein naye dakhlay ki darkhwast bhej sakte hain. Fee jama karwayein aur TID enter karein.'
                  : 'Courses you do not yet own. Select a course to submit fee payment and request admission.'}
              </p>
            </div>

            {availableCourses.length === 0 ? (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-[#0F1F5C]">
                  {isRoman ? 'Aap Tamam Dastyab Courses Mein Dakhil Hain' : 'You are enrolled in all available courses'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isRoman
                    ? 'Naye courses shamil hone par yahan numayan honge.'
                    : 'New courses added to the curriculum will appear here.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableCourses.map((crs) => {
                  const courseFee = crs.onlinePrice ?? crs.price ?? 5000;
                  const durationMonths = crs.onlineDurationMonths ?? crs.durationValue ?? 6;

                  return (
                    <Card
                      key={crs.id}
                      elevated
                      bordered
                      className="bg-white border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      {crs.thumbnailUrl && (
                        <div className="w-full h-36 bg-slate-100 overflow-hidden border-b border-slate-100">
                          <img
                            src={crs.thumbnailUrl}
                            alt={crs.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              /{crs.slug}
                            </span>
                            <Badge variant="navy" size="sm">
                              {durationMonths} {isRoman ? 'Mah' : 'Months'}
                            </Badge>
                          </div>

                          <h3 className="text-base font-bold text-[#0F1F5C] line-clamp-1">
                            {crs.title}
                          </h3>
                          {crs.titleRomanUrdu && (
                            <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                              {crs.titleRomanUrdu}
                            </p>
                          )}

                          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                            {isRoman && crs.shortDescriptionRomanUrdu
                              ? crs.shortDescriptionRomanUrdu
                              : crs.shortDescription}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-400 block">
                              {isRoman ? 'Fee (Adaigi)' : 'Course Fee'}
                            </span>
                            <span className="text-base font-extrabold text-[#0F1F5C] font-mono">
                              Rs. {courseFee.toLocaleString()}
                            </span>
                          </div>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenRequestModal(crs)}
                            className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white font-bold"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" />
                            {isRoman ? 'Request Karein' : 'Request Course'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: ONLINE PAYMENTS HISTORY */}
          {/* ============================================================== */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F1F5C] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#1F3FBF]" />
                  <span>{isRoman ? '3. Payments Record & Tareekh' : '3. Online Payments History'}</span>
                  <Badge variant="secondary" size="sm">
                    {payments.length}
                  </Badge>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRoman
                    ? 'Aapki jama karwai gayi fees transactions aur inki tasdeeq ka mukammal record.'
                    : 'Complete audit log of fees submitted with current verification and access statuses.'}
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                {isRoman
                  ? 'Abhi tak koi payment record mojood nahi hai.'
                  : 'No payment transaction history on record.'}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Ref Number</th>
                        <th className="py-3 px-4">Course / Program</th>
                        <th className="py-3 px-4">Method & TID</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Access Status</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-[#1F3FBF]">
                            {p.referenceNumber}
                          </td>
                          <td className="py-3 px-4 font-medium text-[#0F1F5C]">
                            {p.courseTitle}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold block capitalize">{p.paymentMethod}</span>
                            <span className="text-[11px] font-mono text-slate-400 block">{p.transactionId}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            Rs. {p.finalAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                p.paymentStatus === 'verified'
                                  ? 'success'
                                  : p.paymentStatus === 'rejected'
                                  ? 'danger'
                                  : 'warning'
                              }
                              size="sm"
                              className="capitalize"
                            >
                              {p.paymentStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize text-slate-600 font-medium">
                              {p.accessStatus || 'pending'}
                            </span>
                            {p.rejectionReason && (
                              <span className="text-[10px] text-red-600 block italic">
                                {p.rejectionReason}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono">
                            {p.createdAt?.split('T')[0]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* REQUEST COURSE MODAL */}
      {/* ============================================================== */}
      {modalCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8 relative">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
              <span className="p-2 rounded-xl bg-blue-50 text-[#1F3FBF]">
                <PlusCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0F1F5C]">
                  {isRoman ? 'Naya Course Dakhla Request' : 'Request Additional Course'}
                </h3>
                <p className="text-xs text-slate-500">
                  {modalCourse.title} (
                  {modalCourse.onlineDurationMonths ?? modalCourse.durationValue ?? 6}{' '}
                  {isRoman ? 'Mah' : 'Months'} Access)
                </p>
              </div>
            </div>

            {submitSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-[#0F1F5C]">
                  {isRoman ? 'Darkhwast Kamyabi Se Bhej Di Gayi!' : 'Course Request Submitted!'}
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  {isRoman
                    ? `Payment Ref: ${submitSuccess}. Academy intizamia payment verify kar ke aap ka dakhla activate karegi.`
                    : `Your payment reference is ${submitSuccess}. Academy staff will verify the transaction and provision access.`}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button variant="primary" onClick={handleCloseModal} size="sm">
                    {isRoman ? 'Theek Hai' : 'Done'}
                  </Button>
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                      `Assalam-o-Alaikum, I requested additional course ${modalCourse.title}. Ref: ${submitSuccess}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" leftIcon={<Phone className="w-4 h-4" />}>
                      WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
                {requestError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{requestError}</span>
                  </div>
                )}

                {/* Price & Promo Code Preview */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between text-slate-700">
                    <span>{isRoman ? 'Course Fee:' : 'Standard Fee:'}</span>
                    <span className="font-semibold font-mono text-slate-900">
                      Rs. {pricing.basePrice.toLocaleString()}
                    </span>
                  </div>

                  {pricing.totalDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>{isRoman ? 'Riayat (Discount):' : 'Promo Discount:'}</span>
                      <span className="font-semibold font-mono">
                        -Rs. {pricing.totalDiscount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between font-bold text-sm text-[#0F1F5C] pt-2 border-t border-blue-200/60">
                    <span>{isRoman ? 'Kul Wajib-ul-Ada Raqam:' : 'Total Payable Amount:'}</span>
                    <span className="text-[#1F3FBF] font-mono">
                      Rs. {pricing.finalAmount.toLocaleString()}
                    </span>
                  </div>

                  {/* Promo Code Input */}
                  <div className="pt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={isRoman ? 'Promo Code (Agar koi ho)' : 'Promo Code (Optional)'}
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-[#1F3FBF]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={calculatingPrice || !promoCode.trim()}
                        className="px-3 py-1.5 bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white rounded-lg font-semibold text-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {calculatingPrice ? <Spinner size="xs" variant="white" /> : isRoman ? 'Lagayein' : 'Apply'}
                      </button>
                    </div>

                    {promoFeedback && (
                      <span
                        className={`text-[11px] mt-1 block font-medium ${
                          promoFeedback.isError ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {promoFeedback.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Payment Methods */}
                {paymentMethodsLoading ? (
                  <div className="p-4 text-center text-slate-500">
                    <Spinner size="sm" variant="primary" />
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
                    <p className="font-bold">
                      {isRoman
                        ? 'Payments are temporarily unavailable, please contact us on WhatsApp'
                        : 'Payments are temporarily unavailable, please contact us on WhatsApp'}
                    </p>
                    <a
                      href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                        `Assalam-o-Alaikum, I want to request course ${modalCourse.title} but online payments are unavailable.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{isRoman ? 'WhatsApp Par Rabta Karein' : 'Contact on WhatsApp'}</span>
                    </a>
                  </div>
                ) : (
                  <>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {isRoman ? 'Payment Method Muntakhib Karein' : 'Select Payment Method'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {paymentMethods.map((pm) => {
                        const isSelected = selectedMethod === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setSelectedMethod(pm.id)}
                            className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                              isSelected
                                ? 'border-[#1F3FBF] bg-blue-50/70 text-[#0F1F5C] font-bold'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                            }`}
                          >
                            <span className="block">{pm.name}</span>
                            <span className="text-[10px] text-slate-400 block font-normal">{pm.badge}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedMethodConfig && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">{selectedMethodConfig.accountTitle}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {selectedMethodConfig.bankName || 'Official IBA Account'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {selectedMethodConfig.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethodConfig.accountNumber.replace(/[^0-9]/g, ''))}
                            className="inline-flex items-center gap-1 text-[11px] text-[#1F3FBF] hover:underline font-semibold cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {isRoman
                            ? selectedMethodConfig.instructionsRomanUrdu
                            : selectedMethodConfig.instructions}
                        </p>
                      </div>
                    )}

                    {/* Transaction Details */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRoman ? 'Transaction ID / TID (Zaroori) *' : 'Transaction ID / TID (Required) *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 123456789012"
                        className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-mono uppercase focus:ring-2 focus:ring-[#1F3FBF]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {isRoman ? 'Sender Name (Ikhtiyari)' : 'Sender Account Name (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={accountSenderName}
                          onChange={(e) => setAccountSenderName(e.target.value)}
                          placeholder="e.g. Ali Ahmed"
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          {isRoman ? 'Sender Number (Ikhtiyari)' : 'Sender Mobile / Account (Optional)'}
                        </label>
                        <input
                          type="text"
                          value={accountSenderNumber}
                          onChange={(e) => setAccountSenderNumber(e.target.value)}
                          placeholder="0300-1234567"
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Screenshot Upload */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        {isRoman
                          ? 'Payment Screenshot Proof (Zaroori) *'
                          : 'Payment Proof Screenshot (Required) *'}
                      </label>
                      <label className="cursor-pointer flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-[#1F3FBF] bg-slate-50/50 hover:bg-slate-50 transition text-xs text-slate-600">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span>
                          {screenshotFile
                            ? screenshotFile.name
                            : isRoman
                            ? 'Screenshot muntakhib karein (JPG / PNG)'
                            : 'Choose payment receipt screenshot'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                      </label>
                      {compressionInfo && (
                        <span className="text-[10px] text-emerald-700 mt-1 block">
                          ✓ {compressionInfo}
                        </span>
                      )}
                    </div>

                    {requestError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{requestError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCloseModal}
                        disabled={submittingRequest}
                      >
                        {isRoman ? 'Mansookh (Cancel)' : 'Cancel'}
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={submittingRequest || isCompressing || paymentMethods.length === 0}
                        className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white font-bold"
                      >
                        {submittingRequest ? (
                          <Spinner size="xs" variant="white" />
                        ) : (
                          <Send className="w-3.5 h-3.5 mr-1" />
                        )}
                        {isRoman
                          ? `Rs. ${pricing.finalAmount.toLocaleString()} Darkhwast Submit Karein`
                          : `Submit Request (Rs. ${pricing.finalAmount.toLocaleString()})`}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
