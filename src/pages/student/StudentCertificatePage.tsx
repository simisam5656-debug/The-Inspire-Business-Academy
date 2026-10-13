import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CourseService } from '../../services/courseService';
import { StudentLmsService } from '../../services/studentLmsService';
import { CertificateService } from '../../services/certificateService';
import { CertificateView } from '../../components/certificates/CertificateView';
import {
  CourseCMS,
  CertificateRecord,
} from '../../types';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const StudentCertificatePage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseCMS | null>(null);
  const [activeCert, setActiveCert] = useState<CertificateRecord | null>(null);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [issuing, setIssuing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!user?.id) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const [allC, enrollments] = await Promise.all([
          CourseService.getAllCourses(),
          StudentLmsService.getEnrolledCourses(user.id),
        ]);

        const enrolledCourseIds = new Set(
          enrollments.map((e: any) => e.courseId || e.courseSlug)
        );
        const userCourses = allC.filter(
          (c: CourseCMS) => enrolledCourseIds.has(c.id) || enrolledCourseIds.has(c.slug)
        );

        setCourses(userCourses);

        if (userCourses[0]) {
          setSelectedCourse(userCourses[0]);
          await checkCertificateStatus(userCourses[0].id);
        } else {
          setSelectedCourse(null);
          setActiveCert(null);
          setEligibilityData(null);
        }
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [user?.id]);

  const checkCertificateStatus = async (courseId: string) => {
    if (!user?.id) return;
    try {
      const studentCerts = await CertificateService.getStudentCertificates(user.id);
      const existing = studentCerts.find(
        (c) => c.courseId === courseId || c.courseTitle.toLowerCase().includes(selectedCourse?.title.toLowerCase() || '')
      );

      if (existing) {
        setActiveCert(existing);
        setEligibilityData(null);
      } else {
        setActiveCert(null);
        const elig = await CertificateService.checkOnlineCertificateEligibility(user.id, courseId);
        setEligibilityData(elig);
      }
    } catch (err) {
      console.error('Error checking certificate eligibility:', err);
    }
  };

  const handleIssueCertificate = async () => {
    if (!user?.id || !selectedCourse) return;
    setIssuing(true);
    setErrorMsg(null);
    try {
      const cert = await CertificateService.issueOnlineCertificate(
        user.id,
        selectedCourse.id,
        user.id, // Self-claim with backend validation
        'online_student'
      );
      setActiveCert(cert);
      setEligibilityData(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Sanad issue karte waqt masla pesh aaya.');
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={isRoman ? 'Taleemi Sanad (Certificate) - The Inspire Academy LMS' : 'Graduation Certificate - The Inspire Academy LMS'}
        description="Official certificate of competence issued by The Inspire Business Academy."
        canonicalPath="/student/certificate"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm">
              <Award className="w-3.5 h-3.5 mr-1" />
              <span>{isRoman ? 'Taleemi Sanad / Verification' : 'Official Graduation Credential'}</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Taleemi Sanad (Graduation Certificate)' : 'Course Graduation Certificate'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {isRoman
              ? 'Final imtihan mein kam az kam 70% score hasil karne par unique QR verifiable sanad jari ki jati hai.'
              : 'Official certificate granted upon achieving 70%+ on final examination, verifiable by employers via QR code.'}
          </p>
        </div>

        {courses.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Course:</span>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) {
                  setSelectedCourse(found);
                  checkCertificateStatus(found.id);
                  setErrorMsg(null);
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Spinner size="lg" className="text-[#1F3FBF]" />
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {isRoman ? 'Sanad maloomat daryaft ho rahi hain...' : 'Checking credential registry...'}
          </p>
        </div>
      ) : activeCert ? (
        /* OFFICIAL ISSUED CERTIFICATE VIEW WITH QR & PRINT */
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                {isRoman
                  ? `Mubarak ho! Aapki sanad ${activeCert.certificateCode} safalta se jari ho chuki hai.`
                  : `Official certificate ${activeCert.certificateCode} is issued and verifiable.`}
              </span>
            </div>
            <Link to={`/verify?code=${activeCert.certificateCode}`} target="_blank" className="hover:underline flex items-center gap-1 font-semibold text-[#1F3FBF]">
              <span>Public Verify Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <CertificateView certificate={activeCert} showActions={true} />
        </div>
      ) : (
        /* ELIGIBILITY EVALUATION / PROGRESS VIEW */
        <div className="max-w-2xl mx-auto space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F5FF] text-[#1F3FBF] border border-[#1F3FBF]/20 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F1F5C]">
                  {selectedCourse?.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isRoman
                    ? 'Sanad jari karne ke liye darj zail criteria mukammal hona zaroori hai.'
                    : 'Certificate issuance requires fulfillment of all criteria below.'}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {/* Requirement 1: Active Enrollment */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  {eligibilityData?.enrollmentValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {isRoman ? '1. Active Course Enrollment' : '1. Active Enrollment'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {eligibilityData?.enrollmentValid
                        ? isRoman
                          ? 'Enrollment active aur baa-qaida verified hai.'
                          : 'Enrollment is active and in good standing.'
                        : eligibilityData?.enrollmentReason || 'Enrollment check pending.'}
                    </span>
                  </div>
                </div>
                <Badge variant={eligibilityData?.enrollmentValid ? 'success' : 'neutral'} size="sm">
                  {eligibilityData?.enrollmentValid ? 'Complete' : 'Pending'}
                </Badge>
              </div>

              {/* Requirement 2: Final Exam Passed >= 70% */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  {eligibilityData?.passedExamAttempt ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900 block">
                      {isRoman ? '2. Final Exam Pass (70% Required)' : '2. Final Exam (70% Pass Mark)'}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {eligibilityData?.passedExamAttempt
                        ? isRoman
                          ? `Final Exam kamyabi se pass: ${eligibilityData.passedExamAttempt.percentage}% score!`
                          : `Final Exam passed with ${eligibilityData.passedExamAttempt.percentage}% score!`
                        : isRoman
                        ? 'Final exam mein 70% ya is se zyada score darkar hai.'
                        : 'Requires 70% or higher score on course final exam.'}
                    </span>
                  </div>
                </div>
                <Badge variant={eligibilityData?.passedExamAttempt ? 'success' : 'neutral'} size="sm">
                  {eligibilityData?.passedExamAttempt ? 'Passed' : 'Required'}
                </Badge>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              {eligibilityData?.isEligible ? (
                <>
                  <p className="text-xs text-emerald-700 font-semibold">
                    {isRoman ? 'Tamam sharait mukammal hain! Sanad jari karein.' : 'All criteria satisfied! Ready to issue certificate.'}
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleIssueCertificate}
                    disabled={issuing}
                    className="w-full sm:w-auto bg-[#1F3FBF] hover:bg-[#0F1F5C]"
                  >
                    {issuing ? <Spinner size="sm" className="mr-1.5" /> : <Award className="w-4 h-4 mr-1.5" />}
                    {isRoman ? 'Rasmi Sanad Jari Karein' : 'Issue Official Certificate'}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    {isRoman
                      ? 'Sanad hasil karne ke liye pehle Final Exam dein.'
                      : 'Take and pass the final exam to unlock your certificate.'}
                  </p>
                  <Link to="/student/final-exam" className="w-full sm:w-auto">
                    <Button variant="primary" size="md" className="w-full bg-[#1F3FBF] hover:bg-[#0F1F5C]">
                      <GraduationCap className="w-4 h-4 mr-1.5" />
                      {isRoman ? 'Final Exam Dein (70% Pass)' : 'Take Final Exam (70% Pass)'}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
