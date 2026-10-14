import React, { useState, useEffect } from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { OFFICIAL_COURSES } from '../../config/courses';
import { CourseService } from '../../services/courseService';
import { CmsService } from '../../services/cmsService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Building2,
  CheckCircle2,
  Clock,
  Laptop,
  Coins,
  MapPin,
  Phone,
  ShieldCheck,
  Award,
  Users2,
  ArrowLeft,
  AlertCircle,
  Send,
  Sparkles,
  Info,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const PhysicalJoinPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  // Form states
  const [fullName, setFullName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Sadiqabad');
  const [selectedCourseSlug, setSelectedCourseSlug] = useState('all-courses-physical');
  const [batchPreference, setBatchPreference] = useState(siteConfig.batches[0]?.id || 'gb1');
  const [notes, setNotes] = useState('');

  const [physicalCourses, setPhysicalCourses] = useState<Array<{ slug: string; title: string; titleRomanUrdu?: string; displayOrder?: number }>>(
    isSupabaseConfigured ? [] : OFFICIAL_COURSES
  );
  const [coursesLoading, setCoursesLoading] = useState(isSupabaseConfigured);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState<string>(siteConfig.whatsapp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Load WhatsApp contact from site settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await CmsService.getSiteSettings();
        if (s?.whatsapp) {
          setWhatsappNumber(s.whatsapp);
        }
      } catch (err) {
        // Fall back to siteConfig.whatsapp
      }
    }
    loadSettings();
  }, []);

  const loadCourses = async () => {
    if (!isSupabaseConfigured) {
      setPhysicalCourses(OFFICIAL_COURSES);
      setSelectedCourseSlug('all-courses-physical');
      setCoursesLoading(false);
      setCoursesError(null);
      return;
    }

    try {
      setCoursesLoading(true);
      setCoursesError(null);
      const res = await CourseService.getCourses({
        status: 'published',
        availableForPhysical: true,
      });

      if (res.error) {
        setCoursesError(res.error);
        setPhysicalCourses([]);
        setSelectedCourseSlug('');
      } else {
        const data = res.data || [];
        const sorted = [...data].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        setPhysicalCourses(sorted);
        if (sorted.length > 0) {
          setSelectedCourseSlug('all-courses-physical');
        } else {
          setSelectedCourseSlug('');
        }
      }
    } catch (err: any) {
      setCoursesError(err?.message || 'Failed to load physical courses from database');
      setPhysicalCourses([]);
      setSelectedCourseSlug('');
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // "Full 6-Month Physical Package" is kept only when at least one physical course was returned
  const courseOptions = physicalCourses.length > 0
    ? [
        {
          value: 'all-courses-physical',
          label: isRoman
            ? `Mukammal 6-Mah Physical Package (Tamam ${physicalCourses.length} Courses)`
            : `Full 6-Month Physical Package (All ${physicalCourses.length} Courses Included)`,
        },
        ...physicalCourses.map((c) => ({
          value: c.slug,
          label: isRoman ? `${c.titleRomanUrdu || c.title} (Specialization)` : `${c.title} (Specialization)`,
        })),
      ]
    : [];

  const batchOptions = siteConfig.batches.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.gender === 'girls' ? 'Girls Only' : 'Boys Only'} - ${b.timing})`,
  }));

  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');
  const internationalWhatsapp = cleanWhatsapp.startsWith('92')
    ? cleanWhatsapp
    : cleanWhatsapp.startsWith('0')
    ? `92${cleanWhatsapp.slice(1)}`
    : `92${cleanWhatsapp}`;
  const whatsappUrl = `https://wa.me/${internationalWhatsapp}`;

  const isFormDisabled =
    isSupabaseConfigured &&
    (coursesLoading || Boolean(coursesError) || physicalCourses.length === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (honeypot) return; // bot

    if (isFormDisabled) {
      setErrorMessage(
        isRoman
          ? 'No courses are open for admission right now. Please contact us on WhatsApp.'
          : 'No courses are open for admission right now. Please contact us on WhatsApp.'
      );
      return;
    }

    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMessage(isRoman ? 'Baraye meharbani apna mukammal naam darj karein.' : 'Please enter your full name.');
      return;
    }

    if (!guardianName.trim() || guardianName.trim().length < 2) {
      setErrorMessage(
        isRoman
          ? 'Physical admission ke liye walid ya sarparast ka naam zaroori hai.'
          : 'Father or guardian name is required for physical admission.'
      );
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 12) {
      setErrorMessage(
        isRoman
          ? 'Durust Pakistani mobile number darj karein (e.g. 0300-1234567).'
          : 'Please enter a valid Pakistani mobile number (e.g. 0300-1234567).'
      );
      return;
    }

    const effectiveWhatsapp = sameAsPhone ? phone : (whatsapp.trim() || phone);
    const chosenCourseTitle =
      selectedCourseSlug === 'all-courses-physical'
        ? 'Full 6-Month Physical Package (10 Courses)'
        : physicalCourses.find((c) => c.slug === selectedCourseSlug)?.title || selectedCourseSlug;

    try {
      setIsSubmitting(true);

      const payload = {
        admissionType: 'physical',
        fullName: fullName.trim(),
        guardianName: guardianName.trim(),
        phone: phone.trim(),
        whatsapp: effectiveWhatsapp.trim(),
        email: email.trim() || undefined,
        city: city.trim() || 'Sadiqabad',
        courseSlug: selectedCourseSlug,
        courseTitle: chosenCourseTitle,
        batchPreference: batchPreference,
        notes: notes.trim() || undefined,
        website: honeypot,
      };

      // 1) Preferred path: server API (validation + duplicate check).
      let apiData: any = null;
      let apiStatus = 0;
      try {
        const response = await fetch('/api/admissions/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        apiStatus = response.status;
        apiData = await response.json();
      } catch {
        apiData = null; // network error or non-JSON reply (API not reachable)
      }

      if (apiData?.ok) {
        setSubmittedRef(apiData.referenceNumber);
        return;
      }

      // Real validation/duplicate answer from the server -> show it as is.
      if (apiData && apiStatus >= 400 && apiStatus < 500) {
        setErrorMessage(apiData.error || 'Failed to submit admission. Please review your details.');
        return;
      }

      // 2) Fallback: API unavailable/misconfigured (5xx, no JSON). RLS allows a public
      //    "pending" admission insert, so the request is still saved for the admin.
      const normalizedPhone = (() => {
        const d = phone.replace(/[^0-9]/g, '');
        return d.startsWith('92') && d.length === 12 ? '0' + d.slice(2) : d;
      })();
      if (!/^03[0-9]{9}$/.test(normalizedPhone)) {
        setErrorMessage(
          isRoman
            ? 'Durust Pakistani mobile number darj karein (e.g. 0300-1234567).'
            : 'Please enter a valid Pakistani mobile number (e.g. 0300-1234567).'
        );
        return;
      }
      if (!supabase) {
        setErrorMessage(
          apiData?.error ||
            (isRoman ? 'Dakhla submit nahi ho saka. WhatsApp par rabta karein.' : 'Failed to submit admission. Please contact us on WhatsApp.')
        );
        return;
      }
      const referenceNumber = `IBA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const { error: insErr } = await supabase.from('admissions').insert({
        reference_number: referenceNumber,
        admission_type: 'physical',
        full_name: payload.fullName,
        guardian_name: payload.guardianName,
        phone: normalizedPhone,
        whatsapp: payload.whatsapp ? payload.whatsapp.replace(/[^0-9]/g, '') : normalizedPhone,
        email: payload.email ? payload.email.toLowerCase() : null,
        city: payload.city,
        course_slug: payload.courseSlug,
        course_title: payload.courseTitle,
        batch_preference: payload.batchPreference || null,
        notes: payload.notes || null,
        status: 'pending',
      });
      if (insErr) {
        console.error('Admission fallback insert failed:', insErr.message);
        setErrorMessage(
          (isRoman
            ? 'Dakhla submit nahi ho saka. Baraye meharbani WhatsApp par rabta karein. '
            : 'Failed to submit admission. Please contact us on WhatsApp. ') + `(${insErr.message})`
        );
        return;
      }
      setSubmittedRef(referenceNumber);
    } catch (err: any) {
      setErrorMessage(
        isRoman
          ? 'Server se rabta nahi ho saka. Connection check karein ya direct WhatsApp par rabta karein.'
          : 'Connection error. Please check your network or contact WhatsApp helpline directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Physical Academy Dakhla - Sadiqabad Campus' : 'Physical Academy Admission - Sadiqabad Campus'}
        description={
          isRoman
            ? `The Inspire Business Academy Sadiqabad campus par 6-Mah Physical Package. Tamam ${siteConfig.physicalPackage.courseCount} courses, Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} mahana lab charges (kul package Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}), computer lab aur weekly tests.`
            : `Enroll in the 6-month Physical Academy package at our Sadiqabad campus. All ${siteConfig.physicalPackage.courseCount} courses included, Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} monthly lab charges (total Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}), zero admission fee, and Monday-Friday schedule.`
        }
        canonicalPath="/join/physical"
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

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="accent" size="md">
              <Building2 className="w-3.5 h-3.5" />
              <span>Sadiqabad Campus Package</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Physical Academy Dakhla' : 'Physical Campus Admission'}
            </h1>

            <p className="text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Sadiqabad campus par 6-mah ki mukammal practical training. Rozana computer workstation lab, makhsoos boys & girls batches, aur weekly evaluation.'
                : '6-month comprehensive hands-on digital skills package at our Sadiqabad campus with dedicated computer workstation lab and separated batches.'}
            </p>
          </div>
        </Container>
      </Section>

      {/* Main Grid: Form + Package Specs */}
      <Section variant="white" spacing="lg">
        <Container size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Section (7 cols) */}
            <div className="lg:col-span-7">
              <Card elevated bordered className="p-6 sm:p-8">
                <CardHeader className="p-0 pb-6 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <Badge variant="primary" size="sm">
                      {isRoman ? 'Official Admission Form' : 'Campus Admission Form'}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-medium">Session 2026</span>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl mt-2 text-[#0F1F5C]">
                    {isRoman ? 'Physical Academy Dakhla Form' : 'Apply for Physical Campus Admission'}
                  </CardTitle>
                  <CardDescription>
                    {isRoman
                      ? 'Tamam zaroori maloomat darj karein. Form submit hone par aapko reference code mil jayega.'
                      : 'Please complete the application form below. Upon submission, an official reference code will be generated.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 pt-6">
                  {submittedRef ? (
                    /* Success State */
                    <div className="text-center py-6 space-y-6">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-300">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>

                      <div className="space-y-2">
                        <Badge variant="accent" size="md">
                          Application Received &bull; Pending Verification
                        </Badge>
                        <h2 className="text-2xl font-bold font-display text-[#0F1F5C]">
                          {isRoman ? 'Dakhla Request Receive Ho Gayi Hai!' : 'Application Submitted Successfully!'}
                        </h2>
                        <div className="inline-block p-3 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/20 my-2">
                          <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
                            Reference Number
                          </span>
                          <span className="text-2xl font-black font-mono text-[#1F3FBF] tracking-wide">
                            {submittedRef}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                          {isRoman
                            ? 'Shukriya! Academy administration aapke phone number par 24 ghante ke andar rabta karke interview aur batch seat confirm karegi.'
                            : 'Thank you! The academy administration will reach out on your mobile number within 24 hours to confirm your interview and workstation seat.'}
                        </p>
                      </div>

                      {/* WhatsApp Instant Booking CTA */}
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left space-y-3">
                        <div className="flex items-start gap-2.5">
                          <Phone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-900 leading-relaxed">
                            <strong className="block text-amber-950 font-bold mb-0.5">
                              {isRoman ? 'Fori Tasdeeq Ke Liye:' : 'For Immediate Seat Reservation:'}
                            </strong>
                            {isRoman
                              ? `Agar aap fori seat confirm karwana chahte hain toh apna reference number hamare official WhatsApp ${whatsappNumber} par forward karein.`
                              : 'To expedite your batch seat reservation, forward your reference code to our official WhatsApp helpline.'}
                          </div>
                        </div>

                        <a
                          href={`https://wa.me/${internationalWhatsapp}?text=${encodeURIComponent(
                            `Assalam o Alaikum! Meine Sadiqabad campus ke liye physical admission form submit kiya hai. Mera Reference Number hai: ${submittedRef}. Baraye meharbani seat confirm farma dein.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button variant="accent" fullWidth size="md" leftIcon={<Phone className="w-4 h-4" />}>
                            {isRoman ? 'WhatsApp Par Reference Number Bhejein' : 'Send Reference Code on WhatsApp'}
                          </Button>
                        </a>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSubmittedRef(null);
                            setFullName('');
                            setGuardianName('');
                            setPhone('');
                            setNotes('');
                          }}
                        >
                          {isRoman ? 'Naya Dakhla Form Bharein' : 'Submit Another Application'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Submission Form */
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <input
                        type="text"
                        name="website"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="absolute left-[-9999px] h-0 w-0 opacity-0"
                      />
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
                          <Button size="sm" variant="outline" type="button" onClick={loadCourses}>
                            {isRoman ? 'Dobara Koshish Karein' : 'Retry'}
                          </Button>
                        </div>
                      )}

                      {!coursesLoading && !coursesError && isSupabaseConfigured && physicalCourses.length === 0 && (
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
                                  ? 'Filhal physical dakhla ke liye koi courses open nahi hain. Helpline se rabta karein:'
                                  : 'Please reach out to our campus office via official WhatsApp:'}
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={isRoman ? 'Talib-e-Ilm Ka Mukammal Naam' : 'Student Full Name'}
                          placeholder={isRoman ? 'e.g. Muhammad Ali' : 'e.g. John Doe'}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                          required
                        />

                        <Input
                          label={isRoman ? 'Walid / Sarparast Ka Naam' : 'Father / Guardian Name'}
                          placeholder={isRoman ? 'e.g. Tariq Mehmood' : 'e.g. Guardian Name'}
                          value={guardianName}
                          onChange={(e) => setGuardianName(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={isRoman ? 'Mobile Phone Number' : 'Mobile Phone Number'}
                          placeholder="0300-1234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                          required
                        />

                        <Input
                          label={isRoman ? 'Shehar / Location' : 'City / Location'}
                          placeholder="Sadiqabad"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={isFormDisabled || isSubmitting}
                          required
                        />
                      </div>

                      {/* WhatsApp Checkbox */}
                      <div className="space-y-2">
                        <label className={`flex items-center gap-2 text-xs text-slate-700 select-none ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={sameAsPhone}
                            onChange={(e) => setSameAsPhone(e.target.checked)}
                            disabled={isFormDisabled || isSubmitting}
                            className="rounded border-slate-300 text-[#1F3FBF] focus:ring-[#1F3FBF] w-4 h-4"
                          />
                          <span>{isRoman ? 'WhatsApp number mobile number hi hai' : 'WhatsApp is the same as Mobile Phone'}</span>
                        </label>

                        {!sameAsPhone && (
                          <Input
                            label={isRoman ? 'Alag WhatsApp Number' : 'Alternate WhatsApp Number'}
                            placeholder="03XX-XXXXXXX"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            disabled={isFormDisabled || isSubmitting}
                          />
                        )}
                      </div>

                      <Input
                        label={isRoman ? 'Email Address (Ikhtiyari / Optional)' : 'Email Address (Optional)'}
                        type="email"
                        placeholder="student@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isFormDisabled || isSubmitting}
                      />

                      <Select
                        label={isRoman ? 'Intikhab Shuda Package / Course' : 'Selected Program / Course'}
                        options={courseOptions}
                        value={selectedCourseSlug}
                        onChange={(e) => setSelectedCourseSlug(e.target.value)}
                        disabled={isFormDisabled || isSubmitting}
                      />

                      <Select
                        label={isRoman ? 'Pasandeeda Batch Ka Waqt' : 'Preferred Batch Schedule'}
                        options={batchOptions}
                        value={batchPreference}
                        onChange={(e) => setBatchPreference(e.target.value)}
                        disabled={isFormDisabled || isSubmitting}
                      />

                      <Textarea
                        label={isRoman ? 'Taleemi Qabiliyat ya Ezafi Maloomat (Optional)' : 'Education / Prior Background Notes'}
                        placeholder={
                          isRoman
                            ? 'e.g. Matric / FSc, Computer ka thora tajarba hai...'
                            : 'e.g. Matric / Intermediate, basic computer knowledge...'
                        }
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isFormDisabled || isSubmitting}
                        rows={3}
                      />

                      {/* Physical Student Login Isolation Disclaimer */}
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950 font-bold mb-0.5">
                            {isRoman ? 'Zaroori Wazahat (No Website Login):' : 'Administrative Policy (No Website Login):'}
                          </strong>
                          {isRoman
                            ? 'Physical academy tulba ka website par login account nahi hota. Unka roll number (Boys: B01, B02 / Girls: G01, G02), monthly fee aur attendance ka record academy administration khud control panel mein darj karti hai.'
                            : 'Physical students do not have website accounts; roll numbers (B01, G01), fees, and attendance are staff-managed in the admin control panel.'}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="accent"
                        fullWidth
                        size="lg"
                        disabled={isFormDisabled || isSubmitting}
                        isLoading={isSubmitting}
                        leftIcon={<Send className="w-4 h-4" />}
                      >
                        {isRoman ? 'Dakhla Request Bhejein' : 'Submit Admission Application'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Package Details & Campus Schedules (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Package Specs Card */}
              <Card elevated bordered className="p-6 bg-white border-2 border-[#1F3FBF]/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F2F5FF] text-[#1F3FBF] flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <Badge variant="navy" size="sm">Rs. {siteConfig.physicalPackage.monthlyFee.toLocaleString()} / Month</Badge>
                    <span className="block text-[10px] text-slate-500 font-bold mt-0.5">
                      Total: Rs. {siteConfig.physicalPackage.totalPackage.toLocaleString()}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold font-display text-[#0F1F5C]">
                  {isRoman ? '6-Mah Package Khususiyat' : '6-Month Package Specs'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
                  {isRoman
                    ? `Aik hi monthly fee (Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()}) mein tamam ${siteConfig.physicalPackage.courseCount} courses ki amli training aur computer lab sahulat.`
                    : `All ${siteConfig.physicalPackage.courseCount} professional programs covered under Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} monthly lab charges (Total Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()} for 6 months).`}
                </p>

                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Tamam {siteConfig.physicalPackage.courseCount} courses</strong> shamil hain (YouTube, Graphic, Web, Video, Office)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>No Admission Fee &amp; No Hidden Charges:</strong> Dakhla bilkul muft hai, sirf monthly lab charges hain</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Schedule:</strong> Classes run {siteConfig.physicalPackage.schedule} (Saturday &amp; Sunday Off)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Computer Workstation Lab</strong> har student ko class ke dauran practice ke liye faraham ki jati hai</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Haftawar amli tests</strong> aur individual portfolio checking</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Alag Girls &amp; Boys batches</strong> pur-waqar aur mehfooz mahol ke sath</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>Verified QR Sanad</strong> course mukammal hone aur 70% test pass karne par</span>
                  </li>
                </ul>
              </Card>

              {/* Batches Timing Card */}
              <Card elevated bordered className="p-6 bg-[#F2F5FF]">
                <h3 className="font-bold text-base text-[#0F1F5C] font-display mb-1">
                  {isRoman ? 'Makhsoos Batches Aur Auqat' : 'Daily Batch Timings'}
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Monday &ndash; Friday (Saturday & Sunday Off)
                </p>

                <div className="space-y-3">
                  {siteConfig.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#0F1F5C] block">{batch.name}</span>
                        <span className="text-slate-500 font-medium">
                          {batch.gender === 'girls' ? 'Girls Only' : 'Boys Only'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#1F3FBF] block">{batch.timing}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Direct Campus Helpline */}
              <Card elevated bordered className="p-5 bg-white border border-slate-200 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0F1F5C]">
                  <MapPin className="w-4 h-4 text-[#1F3FBF]" />
                  <span>{siteConfig.location}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Campus Visit Auqat: Somwar ta Juma (Monday - Friday) subah 9 baje se sham 7 baje tak
                </p>
                <a
                  href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-bold text-[#1F3FBF] hover:underline gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp Helpline: {siteConfig.whatsapp}</span>
                </a>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};
