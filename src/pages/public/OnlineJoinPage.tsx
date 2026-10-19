import React, { useState, useEffect } from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { OFFICIAL_COURSES } from '../../config/courses';
import { usePaymentMethods, ActivePaymentMethod } from '../../hooks/usePaymentMethods';
import { CourseService } from '../../services/courseService';
import { CmsService } from '../../services/cmsService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { CourseCMS } from '../../types';
import { PaymentService } from '../../services/paymentService';
import { compressPaymentProof } from '../../utils/imageCompressor';
import { useAuth } from '../../hooks/useAuth';
import {
  Laptop,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Award,
  Phone,
  CreditCard,
  BookOpen,
  ArrowLeft,
  AlertCircle,
  UserPlus,
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
  Tag,
  Upload,
  Copy,
  Wallet,
  Smartphone,
  Building,
  HelpCircle,
  Send,
  MessageCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const OnlineJoinPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { signUp, user, profile } = useAuth();
  const navigate = useNavigate();

  // Basic Information States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notes, setNotes] = useState('');

  // Payment Methods Hook
  const { methods: paymentMethods, loading: paymentMethodsLoading } = usePaymentMethods();

  // Course / Package Selection (Task 1: show ONLY Supabase courses when configured, no fallback)
  const [onlineCourses, setOnlineCourses] = useState<CourseCMS[]>(
    isSupabaseConfigured
      ? []
      : OFFICIAL_COURSES.map((c) => ({
          ...c,
          isPublished: true,
          availableForOnline: true,
          onlinePrice: c.price,
          onlineDurationMonths: c.durationMonths,
          status: 'published' as const,
          createdAt: '',
          updatedAt: '',
          durationValue: c.durationMonths,
          durationUnit: 'months',
        } as any))
  );
  const [coursesLoading, setCoursesLoading] = useState(isSupabaseConfigured);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourseSlug, setSelectedCourseSlug] = useState<string>(
    isSupabaseConfigured ? '' : (OFFICIAL_COURSES[0]?.slug || '')
  );
  const [whatsappNumber, setWhatsappNumber] = useState<string>(siteConfig.whatsapp);

  // Coupon & Pricing States
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponFeedback, setCouponFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Authoritative Pricing State (Task 2: remove hard-coded 5000 values, start from 0/loading)
  const [pricing, setPricing] = useState<{
    basePrice: number;
    totalDiscount: number;
    finalAmount: number;
    offer: any;
    coupon: any;
  }>({
    basePrice: 0,
    totalDiscount: 0,
    finalAmount: 0,
    offer: null,
    coupon: null,
  });
  const [calculatingPrice, setCalculatingPrice] = useState(true);
  const [priceLoaded, setPriceLoaded] = useState(false);

  // Payment States
  const [selectedMethod, setSelectedMethod] = useState<string>('jazzcash');
  const [transactionId, setTransactionId] = useState('');
  const [accountSenderName, setAccountSenderName] = useState('');
  const [accountSenderNumber, setAccountSenderNumber] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Load WhatsApp settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await CmsService.getSiteSettings();
        if (s?.whatsapp) {
          setWhatsappNumber(s.whatsapp);
        }
      } catch (err) {
        // keep siteConfig.whatsapp
      }
    }
    loadSettings();
  }, []);

  // Load online courses from Supabase
  const loadOnlineCourses = async () => {
    if (!isSupabaseConfigured) {
      const fallback = OFFICIAL_COURSES.map((c) => ({
        ...c,
        isPublished: true,
        availableForOnline: true,
        onlinePrice: c.price,
        onlineDurationMonths: c.durationMonths,
        status: 'published' as const,
        createdAt: '',
        updatedAt: '',
        durationValue: c.durationMonths,
        durationUnit: 'months',
      } as any));
      setOnlineCourses(fallback);
      setSelectedCourseSlug(fallback[0]?.slug || '');
      setCoursesLoading(false);
      setCoursesError(null);
      return;
    }

    try {
      setCoursesLoading(true);
      setCoursesError(null);
      const res = await CourseService.getCourses({
        status: 'published',
        availableForOnline: true,
      });

      if (res.error) {
        setCoursesError(res.error);
        setOnlineCourses([]);
        setSelectedCourseSlug('');
      } else {
        const data = res.data || [];
        const sorted = [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setOnlineCourses(sorted);
        if (sorted.length > 0) {
          setSelectedCourseSlug(sorted[0].slug);
        } else {
          setSelectedCourseSlug('');
        }
      }
    } catch (err: any) {
      setCoursesError(err?.message || 'Failed to load online courses from database');
      setOnlineCourses([]);
      setSelectedCourseSlug('');
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    loadOnlineCourses();
  }, []);

  // Switch to first enabled method if selected becomes disabled
  useEffect(() => {
    if (paymentMethods.length > 0) {
      if (!paymentMethods.some((pm) => pm.id === selectedMethod)) {
        setSelectedMethod(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, selectedMethod]);

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedAdmissionRef, setSubmittedAdmissionRef] = useState<string | null>(null);
  const [submittedPaymentRef, setSubmittedPaymentRef] = useState<string | null>(null);
  const [submittedFinalAmount, setSubmittedFinalAmount] = useState<number>(0);

  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');
  const internationalWhatsapp = cleanWhatsapp.startsWith('92')
    ? cleanWhatsapp
    : cleanWhatsapp.startsWith('0')
    ? `92${cleanWhatsapp.slice(1)}`
    : `92${cleanWhatsapp}`;
  const whatsappUrl = `https://wa.me/${internationalWhatsapp}`;

  const isFormDisabled =
    isSupabaseConfigured &&
    (coursesLoading || Boolean(coursesError) || onlineCourses.length === 0);

  // Initialize fields if logged in
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      if (profile?.fullName) setFullName(profile.fullName);
      if (profile?.phone) setPhone(profile.phone);
    }
  }, [user, profile]);

  // Recalculate price when course or coupon changes
  const updatePrice = async (cSlug: string, cCode?: string) => {
    if (!cSlug) {
      setPricing({
        basePrice: 0,
        totalDiscount: 0,
        finalAmount: 0,
        offer: null,
        coupon: null,
      });
      setPriceLoaded(false);
      setCalculatingPrice(false);
      return;
    }

    try {
      setCalculatingPrice(true);
      const isStudentPackage = cSlug === 'student-discount-package';
      const res = await PaymentService.calculateAuthoritativePrice(
        isStudentPackage ? undefined : cSlug,
        isStudentPackage ? 'student-discount-package' : undefined,
        cCode || couponCode,
        user?.id
      );

      if (res && res.ok) {
        setPricing({
          basePrice: Number(res.basePrice ?? 0),
          totalDiscount: Number(res.totalDiscount ?? 0),
          finalAmount: Number(res.finalAmount ?? 0),
          offer: res.offer,
          coupon: res.coupon,
        });
        setPriceLoaded(true);
      } else {
        const found = onlineCourses.find((c) => c.slug === cSlug);
        const fallbackPrice = cSlug === 'student-discount-package' ? 4000 : ((found as any)?.onlinePrice ?? (found as any)?.online_price ?? found?.price ?? 0);
        setPricing({
          basePrice: fallbackPrice,
          totalDiscount: 0,
          finalAmount: fallbackPrice,
          offer: null,
          coupon: null,
        });
        setPriceLoaded(true);
      }

      if (cCode) {
        if (res && res.coupon) {
          setAppliedCoupon(res.coupon);
          setCouponFeedback({
            text: isRoman ? res.couponMessageRoman || 'Coupon kamiyabi se lag gaya!' : res.couponMessage || 'Coupon applied successfully!',
            isError: false,
          });
        } else {
          setAppliedCoupon(null);
          setCouponFeedback({
            text: isRoman ? res.couponMessageRoman || 'Yeh coupon code ghalat hai ya expire ho chuka hai.' : res.couponMessage || 'Invalid or expired coupon code.',
            isError: true,
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching pricing:', e);
      const found = onlineCourses.find((c) => c.slug === cSlug);
      const fallbackPrice = (found as any)?.onlinePrice ?? (found as any)?.online_price ?? found?.price ?? 0;
      setPricing({
        basePrice: fallbackPrice,
        totalDiscount: 0,
        finalAmount: fallbackPrice,
        offer: null,
        coupon: null,
      });
      setPriceLoaded(true);
    } finally {
      setCalculatingPrice(false);
    }
  };

  useEffect(() => {
    if (selectedCourseSlug) {
      updatePrice(selectedCourseSlug);
    } else {
      setPricing({
        basePrice: 0,
        totalDiscount: 0,
        finalAmount: 0,
        offer: null,
        coupon: null,
      });
      setPriceLoaded(false);
      setCalculatingPrice(false);
    }
  }, [selectedCourseSlug, onlineCourses]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setValidatingCoupon(true);
    setCouponFeedback(null);
    await updatePrice(selectedCourseSlug, couponCode.trim());
    setValidatingCoupon(false);
  };

  const handleRemoveCoupon = async () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponFeedback(null);
    await updatePrice(selectedCourseSlug, '');
  };

  // Screenshot compression handler
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage(
        isRoman
          ? 'Sirf tasveer (JPEG, PNG, WEBP) upload karein.'
          : 'Please upload an image file (JPEG, PNG, WEBP).'
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
          ? `Size: ${originalKb} KB → ${compressedKb} KB (Under 250 KB limit)`
          : `Compressed: ${originalKb} KB → ${compressedKb} KB (Under 250 KB limit)`
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

  const selectedMethodConfig = paymentMethods.find((m) => m.id === selectedMethod) || paymentMethods[0];
  const selectedCourse = onlineCourses.find((c) => c.slug === selectedCourseSlug) || onlineCourses[0];
  const selectedDurationMonths = selectedCourse?.onlineDurationMonths ?? selectedCourse?.durationValue ?? 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isFormDisabled) {
      setErrorMessage(
        isRoman
          ? 'No courses are open for admission right now. Please contact us on WhatsApp.'
          : 'No courses are open for admission right now. Please contact us on WhatsApp.'
      );
      return;
    }

    // Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage(isRoman ? 'Baraye meharbani apna mukammal naam darj karein.' : 'Please enter your full name.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage(isRoman ? 'Durust email address darj karein.' : 'Please enter a valid email address.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 12) {
      setErrorMessage(
        isRoman
          ? 'Durust Pakistani mobile number darj karein (e.g. 0300-1234567).'
          : 'Please enter a valid Pakistani mobile number.'
      );
      return;
    }

    if (paymentMethods.length === 0) {
      setErrorMessage(
        isRoman
          ? 'Payments arzi tor par dastyab nahi hain, baraye meharbani WhatsApp par rabta karein.'
          : 'Payments are temporarily unavailable, please contact us on WhatsApp'
      );
      return;
    }

    if (!transactionId.trim() || transactionId.trim().length < 4) {
      setErrorMessage(
        isRoman
          ? 'Baraye meharbani Transaction ID (TID / TRX ID) darj karein.'
          : 'Please enter the Transaction ID (TID / TRX ID) from your payment receipt.'
      );
      return;
    }

    // If not logged in, validate password for new account creation
    if (!user) {
      if (password.length < 8) {
        setErrorMessage(
          isRoman
            ? 'Password kam az kam 8 characters par mushtamil hona chahiye.'
            : 'Password must be at least 8 characters long.'
        );
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage(
          isRoman
            ? 'Dono passwords aapas mein match nahi kar rahe. Baraye meharbani check karein.'
            : 'Passwords do not match. Please re-enter.'
        );
        return;
      }
    }

    const isStudentPackage = selectedCourseSlug === 'student-discount-package';
    const chosenCourseTitle = isStudentPackage ? 'Student Discount Package' : (selectedCourse?.title || selectedCourseSlug);

    try {
      setIsSubmitting(true);
      let createdUserId: string | null = user?.id || null;

      // Step 1: If not authenticated, create Supabase Auth account
      if (!user) {
        const signupRes = await signUp(
          {
            email: email.trim().toLowerCase(),
            password: password,
            fullName: fullName.trim(),
            phone: phone.trim(),
          },
          isRoman
        );

        if (!signupRes.success) {
          setErrorMessage(signupRes.error || 'Account creation mein masla pesh aya.');
          setIsSubmitting(false);
          return;
        }
      }

      // Step 2: Submit payment and admission via authoritative server API
      const fileToUpload = compressedFile || screenshotFile || undefined;

      const submitRes = await PaymentService.submitOnlinePayment({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim() || 'Online Student',
        courseSlug: isStudentPackage ? undefined : selectedCourseSlug,
        packageSlug: isStudentPackage ? 'student-discount-package' : undefined,
        courseTitle: chosenCourseTitle,
        paymentMethod: selectedMethod,
        transactionId: transactionId.trim().toUpperCase(),
        accountSenderName: accountSenderName.trim() || undefined,
        accountSenderNumber: accountSenderNumber.trim() || undefined,
        screenshotFile: fileToUpload,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        notes: notes.trim() || undefined,
        userId: createdUserId || undefined,
      });

      if (!submitRes.ok) {
        if (submitRes.duplicateTx) {
          setErrorMessage(
            isRoman
              ? 'Ye Transaction ID pehle use ho chuki hai. Please apni payment details verify karein.'
              : 'This Transaction ID has already been recorded. Please check your payment details.'
          );
        } else {
          setErrorMessage(submitRes.error || (isRoman ? 'Payment darj nahi ho saki. Helpline se rabta karein.' : 'Failed to record payment. Please contact helpline.'));
        }
      } else {
        setSubmittedAdmissionRef(submitRes.admissionReference || 'IBA-2026-REG');
        setSubmittedPaymentRef(submitRes.paymentReference || 'IBA-PAY-2026');
        setSubmittedFinalAmount(submitRes.finalAmount || pricing.finalAmount);
      }
    } catch (err: any) {
      setErrorMessage(
        isRoman
          ? 'Network ya server se rabta toot gaya. Connection check karein.'
          : 'Network error. Please verify your connection.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const courseOptions = [
    { value: 'student-discount-package', label: isRoman ? 'NEW OFFER — Student Discount Package (Rs. 4,000; 60% OFF)' : 'NEW OFFER — Student Discount Package (Rs. 4,000; 60% OFF)' },
    ...onlineCourses.map((c) => {
    const pr = (c as any).onlinePrice ?? (c as any).online_price ?? c.price ?? 0;
    const dur = (c as any).onlineDurationMonths ?? (c as any).online_duration_months ?? c.durationValue ?? 6;
    return {
      value: c.slug,
      label: isRoman
        ? `${c.titleRomanUrdu || c.title} (Rs. ${Number(pr ?? 0).toLocaleString()} / ${dur} Mah Access)`
        : `${c.title} (Rs. ${Number(pr ?? 0).toLocaleString()} / ${dur}-Month Access)`,
    };
  })];

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Online Course Dakhla & Fees Payment' : 'Online Course Admission & Fee Payment'}
        description={
          isRoman
            ? 'The Inspire Business Academy online recorded programs mein dakhla, JazzCash, Easypaisa payment aur account activation.'
            : 'Enroll in online recorded programs with The Inspire Business Academy. Pay via JazzCash, Easypaisa, or Bank IBFT.'
        }
        canonicalPath="/join/online"
      />

      {/* Header */}
      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="mb-4 text-left">
            <Link to="/join" className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              {isRoman ? 'Dakhla Intikhab Par Wapis' : 'Back to Pathway Choice'}
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-[#1F3FBF] text-xs font-bold mb-3">
                <Laptop className="w-3.5 h-3.5" />
                <span>{isRoman ? 'Online Recorded LMS Portal' : 'Online Recorded LMS Pathway'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-[#0F1F5C] tracking-tight">
                {isRoman ? 'Online Course Dakhla & Fees Adaigi' : 'Online Admission & Payment'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
                {isRoman
                  ? 'Ghar bethay recorded video lectures, practical files, haftawar quizzes aur certificate. Fee ada karein aur registration mukammal karein.'
                  : 'Enroll in professional self-paced programs. Submit fee proof, receive admin verification, and start learning.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block">{isRoman ? 'Course Muddat' : 'Duration'}</span>
                <span className="text-sm font-bold text-[#0F1F5C]">{selectedDurationMonths} {isRoman ? 'Mah' : 'Months'} Access</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] text-slate-500 block">{isRoman ? 'Final Exam Pass Mark' : 'Exam Pass Rule'}</span>
                <span className="text-sm font-bold text-emerald-700">70% Required</span>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Main Content Form */}
      <Section variant="light" spacing="lg">
        <Container size="md">
          {submittedAdmissionRef ? (
            /* SUCCESS PENDING BANNER */
            <Card elevated bordered className="p-8 text-center max-w-xl mx-auto border-2 border-emerald-500/30">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-bold font-display text-[#0F1F5C]">
                {isRoman ? 'Darkhwast & Payment Receive Ho Gayi!' : 'Admission & Payment Received!'}
              </h2>

              <p className="text-xs text-slate-600 mt-2 mb-6 leading-relaxed">
                {isRoman
                  ? 'Aap ki online registration aur fee payment proof kamiyabi se darj ho chuka hai. Academy administration payment verify karne ke baad aap ka student account activate kar degi.'
                  : 'Your application and fee transaction details have been submitted. Academy staff will verify your payment and activate your 6-month LMS access.'}
              </p>

              {/* Reference Numbers Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6 space-y-2 text-left font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-sans">{isRoman ? 'Admission Ref No:' : 'Admission Ref:'}</span>
                  <span className="font-bold text-[#1F3FBF]">{submittedAdmissionRef}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-sans">{isRoman ? 'Payment Ref No:' : 'Payment Ref:'}</span>
                  <span className="font-bold text-emerald-700">{submittedPaymentRef}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-sans">{isRoman ? 'Ada Shuda Raqam:' : 'Amount Paid:'}</span>
                  <span className="font-bold text-[#0F1F5C]">Rs. {Number(submittedFinalAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Honest Pending Status Note */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed text-left flex items-start gap-2 mb-6">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>{isRoman ? 'Ahem Wazahat (Pending State):' : 'Important Note (Pending Status):'}</strong>{' '}
                  {isRoman
                    ? 'Payment verification ke doran course lectures temporary locked rahenge. Tasdeeq hote hi aap ko portal par mukammal access mil jayega.'
                    : 'Course lectures remain temporarily locked while your payment is verified by academy staff.'}
                </div>
              </div>

              {/* WhatsApp Support Button */}
              <div className="space-y-3">
                <a
                  href={`https://wa.me/${internationalWhatsapp}?text=${encodeURIComponent(
                    `Assalam o Alaikum! Meine Online Course Dakhla submit kiya hai. Mera Admission Ref: ${submittedAdmissionRef} aur Payment Ref: ${submittedPaymentRef} hai. Baraye meharbani payment verify farma dein.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="accent" fullWidth size="md" leftIcon={<Phone className="w-4 h-4" />}>
                    {isRoman ? 'WhatsApp Par Reference Confirm Karein' : 'Confirm on Academy WhatsApp'}
                  </Button>
                </a>

                <Link to="/student" className="block">
                  <Button variant="primary" fullWidth size="md" leftIcon={<GraduationCap className="w-4 h-4" />}>
                    {isRoman ? 'Student Portal Par Jayein' : 'Go to Student Portal'}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* REGISTRATION & PAYMENT FORM */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Section (7 cols) */}
              <div className="lg:col-span-7">
                <Card elevated bordered className="p-6 bg-white border-slate-200">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {coursesLoading && (
                      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 text-xs text-[#1F3FBF]">
                        <Spinner size="sm" />
                        <span>{isRoman ? 'Open courses load ho rahe hain...' : 'Loading open courses...'}</span>
                      </div>
                    )}

                    {coursesError && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-red-700">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{coursesError}</span>
                        </div>
                        <Button size="sm" variant="outline" type="button" onClick={loadOnlineCourses}>
                          {isRoman ? 'Dobara Koshish Karein' : 'Retry'}
                        </Button>
                      </div>
                    )}

                    {!coursesLoading && !coursesError && isSupabaseConfigured && onlineCourses.length === 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1.5">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-950">
                              {isRoman
                                ? 'No courses are open for admission right now. Please contact us on WhatsApp.'
                                : 'No courses are open for admission right now. Please contact us on WhatsApp.'}
                            </p>
                            <p className="mt-1">
                              {isRoman
                                ? 'Filhal online dakhla ke liye koi courses open nahi hain. Helpline se rabta karein:'
                                : 'Please connect with our admissions office on WhatsApp:'}
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-[#1F3FBF] hover:text-[#0F1F5C] underline ml-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp ({whatsappNumber})</span>
                              </a>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {errorMessage && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed font-medium">{errorMessage}</p>
                      </div>
                    )}

                    {/* Step 1: Course Selection */}
                    <div>
                      <h3 className="text-sm font-bold text-[#0F1F5C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1F3FBF] text-white text-[10px] flex items-center justify-center font-bold">
                          1
                        </span>
                        {isRoman ? 'Course Ka Intikhab' : 'Select Online Course'}
                      </h3>
                      <Select
                        label={isRoman ? 'Kis Course Mein Dakhla Lena Hai?' : 'Choose Program'}
                        options={courseOptions}
                        value={selectedCourseSlug}
                        onChange={(e) => setSelectedCourseSlug(e.target.value)}
                        disabled={isFormDisabled || isSubmitting}
                        required
                      />
                    </div>

                    {/* Step 2: Personal Information */}
                    <div>
                      <h3 className="text-sm font-bold text-[#0F1F5C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1F3FBF] text-white text-[10px] flex items-center justify-center font-bold">
                          2
                        </span>
                        {isRoman ? 'Aap Ki Maloomat & Login' : 'Personal Details & Account'}
                      </h3>

                      {user && (
                        <div className="p-3 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-700" />
                            <span>Logged in as <strong>{profile?.fullName || user.email}</strong></span>
                          </div>
                          <Badge variant="secondary" size="sm">Active Account</Badge>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <Input
                          label={isRoman ? 'Mukammal Naam' : 'Full Name'}
                          placeholder="e.g. Muhammad Ali"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                          required
                        />
                        <Input
                          label={isRoman ? 'Mobile Phone' : 'Phone Number'}
                          placeholder="0300-1234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <Input
                          label={isRoman ? 'Email (Login Identity)' : 'Email (Login ID)'}
                          type="email"
                          placeholder="student@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={Boolean(user) || isFormDisabled || isSubmitting}
                        />
                        <Input
                          label={isRoman ? 'Shehar / City' : 'City'}
                          placeholder="e.g. Sadiqabad / Lahore"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                        />
                      </div>

                      {/* Password creation only if not logged in */}
                      {!user && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div className="relative">
                            <Input
                              label={isRoman ? 'Password (Min 8 chars)' : 'Password (Min 8 chars)'}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              disabled={isFormDisabled || isSubmitting}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-8.5 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <Input
                            label={isRoman ? 'Confirm Password' : 'Confirm Password'}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isFormDisabled || isSubmitting}
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Step 3: Payment Details */}
                    <div>
                      <h3 className="text-sm font-bold text-[#0F1F5C] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1F3FBF] text-white text-[10px] flex items-center justify-center font-bold">
                          3
                        </span>
                        {isRoman ? 'Fee Payment Ki Tafseelat' : 'Fee Payment Details'}
                      </h3>

                      {paymentMethodsLoading ? (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center flex items-center justify-center gap-2 text-xs text-slate-500 mb-4">
                          <Spinner size="sm" variant="primary" />
                          <span>{isRoman ? 'Payment methods load ho rahe hain...' : 'Loading verified payment methods...'}</span>
                        </div>
                      ) : paymentMethods.length === 0 ? (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-3 mb-4">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-sm">
                                {isRoman ? 'Payments Arzi Tor Par Dastyab Nahi Hain' : 'Payments Temporarily Unavailable'}
                              </p>
                              <p className="text-xs text-amber-800 mt-1">
                                {isRoman
                                  ? 'Payments are temporarily unavailable, please contact us on WhatsApp'
                                  : 'Payments are temporarily unavailable, please contact us on WhatsApp'}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`https://wa.me/${internationalWhatsapp}?text=${encodeURIComponent(
                              'Assalam o Alaikum, I would like to pay for an online course but online payment methods are temporarily unavailable.'
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                          >
                            <Phone className="w-4 h-4" />
                            {isRoman ? 'WhatsApp Par Rabta Karein' : 'Contact on WhatsApp'}
                          </a>
                        </div>
                      ) : (
                        <>
                          {/* Payment Method Tabs */}
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {isRoman ? 'Payment Method Muntakhib Karein' : 'Select Payment Method'}
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                            {paymentMethods.map((pm) => {
                              const isSelected = selectedMethod === pm.id;
                              return (
                                <button
                                  key={pm.id}
                                  type="button"
                                  onClick={() => setSelectedMethod(pm.id)}
                                  disabled={isFormDisabled || isSubmitting}
                                  className={`p-2.5 rounded-xl border text-center transition-all ${
                                    isFormDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  } ${
                                    isSelected
                                      ? 'border-[#1F3FBF] bg-blue-50/70 text-[#0F1F5C] shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                                  }`}
                                >
                                  <div className="flex justify-center mb-1 text-[#1F3FBF]">
                                    {pm.id === 'jazzcash' && <Smartphone className="w-4 h-4 text-amber-600" />}
                                    {pm.id === 'easypaisa' && <Wallet className="w-4 h-4 text-emerald-600" />}
                                    {pm.id === 'bank_transfer' && <Building className="w-4 h-4 text-blue-600" />}
                                  </div>
                                  <span className="text-xs font-bold block">{pm.name}</span>
                                  <span className="text-[10px] text-slate-400 block">{pm.badge}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Account Instructions Box */}
                          {selectedMethodConfig && (
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-semibold text-slate-700">{selectedMethodConfig.accountTitle}</span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {selectedMethodConfig.bankName || 'Official IBA Account'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 mb-2">
                                <span className="font-mono font-bold text-slate-900 text-sm">
                                  {selectedMethodConfig.accountNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(selectedMethodConfig.accountNumber.replace(/[^0-9]/g, ''))}
                                  disabled={isFormDisabled}
                                  className="inline-flex items-center gap-1 text-[11px] text-[#1F3FBF] hover:underline font-semibold cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                {isRoman ? selectedMethodConfig.instructionsRomanUrdu : selectedMethodConfig.instructions}
                              </p>
                            </div>
                          )}

                          {/* Transaction ID & Sender Name */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <Input
                                label={isRoman ? 'Transaction ID / TID (Zaroori)' : 'Transaction ID / TID (Required)'}
                                placeholder="e.g. 123456789012"
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                disabled={isFormDisabled || isSubmitting}
                                required
                              />
                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                {isRoman ? 'SMS ya app receipt se 12-digit TID note karein.' : '12-digit TID from SMS or App receipt.'}
                              </span>
                            </div>

                            <div>
                              <Input
                                label={isRoman ? 'Sender Ka Naam / Number' : 'Sender Name / Number (Optional)'}
                                placeholder="e.g. Ali Ahmed / 0300-..."
                                value={accountSenderName}
                                onChange={(e) => setAccountSenderName(e.target.value)}
                                disabled={isFormDisabled || isSubmitting}
                              />
                            </div>
                          </div>

                          {/* Payment Proof Upload with Compression */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              {isRoman ? 'Payment Screenshot / Rasid Proof (Ikhtiyari / Recommended)' : 'Payment Receipt Screenshot (Recommended)'}
                            </label>
                            <div className="flex items-center gap-2">
                              <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-[#1F3FBF] bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs text-slate-600 ${
                                isFormDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}>
                                <Upload className="w-4 h-4 text-slate-400" />
                                <span>
                                  {screenshotFile
                                    ? screenshotFile.name
                                    : isRoman
                                    ? 'Screenshot muntakhib karein (JPG / PNG)'
                                    : 'Select Screenshot (JPG / PNG)'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={handleScreenshotChange}
                                  disabled={isFormDisabled || isSubmitting}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            {compressionInfo && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{compressionInfo}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      size="lg"
                      disabled={
                        paymentMethods.length === 0 ||
                        isFormDisabled ||
                        calculatingPrice ||
                        !priceLoaded ||
                        isSubmitting ||
                        isCompressing
                      }
                      isLoading={isSubmitting || isCompressing}
                      leftIcon={<Send className="w-4 h-4" />}
                      className="bg-[#1F3FBF] hover:bg-[#0F1F5C] mt-2"
                    >
                      {calculatingPrice || !priceLoaded
                        ? (isRoman ? 'Fees hisaab ki ja rahi hai...' : 'Calculating Fee...')
                        : (isRoman
                            ? `Rs. ${Number(pricing.finalAmount ?? 0).toLocaleString()} Adaigi & Dakhla Submit Karein`
                            : `Submit Registration & Rs. ${Number(pricing.finalAmount ?? 0).toLocaleString()} Payment`)}
                    </Button>

                    <p className="text-center text-[11px] text-slate-400">
                      {isRoman
                        ? 'Submit karne par aap ka record safe database mein darj hoga aur payment verify ki jayegi.'
                        : 'Your data is securely stored and transaction is validated before course activation.'}
                    </p>
                  </form>
                </Card>
              </div>

              {/* Order Summary & Pricing Breakdown (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Pricing Summary Card */}
                <Card elevated bordered className="p-5 bg-white border-slate-200">
                  <h3 className="text-sm font-bold text-[#0F1F5C] uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>{isRoman ? 'Fees Ka Khulasa' : 'Payment Summary'}</span>
                    <Badge variant="navy" size="sm">{selectedDurationMonths} {isRoman ? 'Mah' : 'Months'}</Badge>
                  </h3>

                  {calculatingPrice || !priceLoaded ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
                      <Spinner size="md" variant="primary" />
                      <span>{isRoman ? 'Fees hisaab ki ja rahi hai...' : 'Calculating authoritative fee...'}</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5 text-xs text-slate-700 pb-3 border-b border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">{isRoman ? 'Course Base Fee:' : 'Base Course Fee:'}</span>
                          <span className="font-semibold text-slate-900 font-mono">
                            Rs. {Number(pricing.basePrice ?? 0).toLocaleString()}
                          </span>
                        </div>

                        {pricing.offer && (
                          <div className="flex justify-between items-center text-emerald-700">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{pricing.offer.title}{Number(pricing.offer.discountPercentage ?? pricing.offer.discount_percentage ?? 0) > 0 ? ` (-${Number(pricing.offer.discountPercentage ?? pricing.offer.discount_percentage)}%)` : ''}</span>
                            </span>
                            <span className="font-semibold font-mono">
                              -Rs. {Number(pricing.offer.discountAmount ?? 0).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {pricing.coupon && (
                          <div className="flex justify-between items-center text-emerald-700">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              <span>Coupon ({pricing.coupon.code})</span>
                            </span>
                            <span className="font-semibold font-mono">
                              -Rs. {Number(pricing.coupon.discountAmount ?? 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Final Total */}
                      <div className="flex justify-between items-center pt-3 text-base font-bold text-[#0F1F5C]">
                        <span>{isRoman ? 'Kul Qabil-e-Ada Raqam:' : 'Net Payable Amount:'}</span>
                        <span className="text-xl text-[#1F3FBF] font-mono">
                          Rs. {Number(pricing.finalAmount ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Coupon Code Input */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isRoman ? 'Discount Coupon Code (Optional)' : 'Have a Promo / Scholarship Coupon?'}
                    </label>

                    {appliedCoupon ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center gap-1.5 font-mono font-bold">
                          <Tag className="w-3.5 h-3.5" />
                          <span>{appliedCoupon.code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs text-rose-600 hover:underline font-semibold"
                        >
                          {isRoman ? 'Hata Dein' : 'Remove'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          placeholder={isRoman ? 'Coupon code darj karein' : 'Enter coupon code'}
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          disabled={isFormDisabled || calculatingPrice || !priceLoaded}
                          className={`flex-1 text-xs px-2.5 py-1.5 uppercase font-mono rounded-lg border border-slate-200 focus:outline-none focus:border-[#1F3FBF] ${
                            isFormDisabled || calculatingPrice || !priceLoaded ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          isLoading={validatingCoupon}
                          disabled={isFormDisabled || calculatingPrice || !priceLoaded || !couponCode.trim()}
                          className="text-xs py-1.5"
                        >
                          {isRoman ? 'Lagayein' : 'Apply'}
                        </Button>
                      </form>
                    )}

                    {couponFeedback && (
                      <p
                        className={`text-[11px] mt-1.5 ${
                          couponFeedback.isError ? 'text-rose-600' : 'text-emerald-700 font-medium'
                        }`}
                      >
                        {couponFeedback.text}
                      </p>
                    )}
                  </div>
                </Card>

                {/* Benefits / FAQ Checklist */}
                <Card elevated bordered className="p-5 bg-white border-slate-200 space-y-3 text-xs text-slate-700">
                  <h4 className="font-bold text-[#0F1F5C] text-xs uppercase tracking-wider mb-2">
                    {isRoman ? 'Dakhlay Ke Baad Kya Hoga?' : 'What Happens Next?'}
                  </h4>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isRoman ? '1. Fauran Verification:' : '1. Fast Verification:'}</strong>{' '}
                      {isRoman
                        ? 'Admin aap ki TID check karke payment verify karega.'
                        : 'Staff checks your TID and approves payment.'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isRoman ? '2. Student Code & Access:' : '2. Student ID Code:'}</strong>{' '}
                      {isRoman
                        ? 'Aap ko official Student ID (IBA-ONL-2026-...) allot hoga aur 6-mah access khul jaye ga.'
                        : 'Unique online code is assigned with 6-month video lecture access.'}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{isRoman ? '3. Certificate & Quizzes:' : '3. Exam & Certificate:'}</strong>{' '}
                      {isRoman
                        ? 'Lectures mukammal hone aur 70% exam pass karne par official verified certificate milega.'
                        : '70% pass mark earns an official verified certificate.'}
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </div>
  );
};
