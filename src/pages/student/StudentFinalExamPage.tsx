import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CourseService } from '../../services/courseService';
import { StudentLmsService } from '../../services/studentLmsService';
import { AssessmentService } from '../../services/assessmentService';
import {
  CourseCMS,
  FinalExamRecord,
  FinalExamAttemptRecord,
  QuestionBankItem,
} from '../../types';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const StudentFinalExamPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseCMS | null>(null);
  const [exam, setExam] = useState<FinalExamRecord | null>(null);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [attempts, setAttempts] = useState<FinalExamAttemptRecord[]>([]);
  const [questionCount, setQuestionCount] = useState(0);

  // Exam taking state
  const [isTakingExam, setIsTakingExam] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [latestResult, setLatestResult] = useState<FinalExamAttemptRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
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
          await loadCourseExam(userCourses[0].id);
        } else {
          setSelectedCourse(null);
          setExam(null);
          setQuestions([]);
        }
      } catch (err) {
        console.error('Error loading final exams:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  const mapAttempt = (a: any, courseId: string, threshold: number): FinalExamAttemptRecord => ({
    id: a.id || `att-${Date.now()}`,
    userId: user?.id || '',
    examId: a.exam_id || a.examId || '',
    courseId,
    attemptNumber: a.attempt_number ?? a.attemptNumber ?? 1,
    score: a.score,
    maxScore: a.max_score ?? a.maxScore,
    percentage: Number(a.percentage),
    passed: Boolean(a.passed),
    passingThreshold: threshold,
    userAnswers: {},
    status: 'completed',
    startedAt: a.completed_at || new Date().toISOString(),
    completedAt: a.completed_at || new Date().toISOString(),
  });

  const loadCourseExam = async (courseId: string) => {
    if (!user?.id) return;
    try {
      const { exams } = await AssessmentService.listStudentAssessments();
      const fe = exams.find((x: any) => x.courseId === courseId);
      if (!fe) {
        setExam(null);
        setAttempts([]);
        setQuestionCount(0);
        return;
      }
      setExam({
        id: fe.id,
        courseId: fe.courseId,
        courseTitle: fe.courseTitle,
        title: fe.title,
        titleRomanUrdu: fe.titleRomanUrdu,
        description: fe.description,
        descriptionRomanUrdu: fe.descriptionRomanUrdu,
        instructions: fe.instructions,
        instructionsRomanUrdu: fe.instructionsRomanUrdu,
        durationMinutes: fe.durationMinutes,
        passingPercentage: fe.passingPercentage,
        attemptLimit: fe.attemptLimit,
        isPublished: true,
        questionCount: fe.questionCount,
        createdAt: '',
        updatedAt: '',
      });
      setQuestionCount(fe.questionCount || 0);
      setAttempts(fe.attempts.map((a: any) => mapAttempt(a, courseId, fe.passingPercentage)));
    } catch (err: any) {
      console.error('Error loading course exam:', err);
      setExam(null);
      setErrorMsg(err?.message || 'Exam load nahi ho saka.');
    }
  };

  // Timer countdown while taking exam
  useEffect(() => {
    if (!isTakingExam || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam(); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTakingExam, secondsRemaining]);

  const handleStartExam = async () => {
    if (!exam || questionCount === 0) return;
    setErrorMsg(null);
    try {
      const started = await AssessmentService.startStudentAssessment('exam', exam.id);
      setQuestions(
        started.questions.map((q: any, i: number) => ({
          id: q.id,
          courseId: exam.courseId,
          questionTextEn: q.textEn,
          questionTextRoman: q.textRoman,
          questionType: q.type,
          options: q.options,
          correctOptionId: '',
          marks: q.marks,
          displayOrder: i,
          isActive: true,
          createdAt: '',
          updatedAt: '',
        }))
      );
      setUserAnswers({});
      setLatestResult(null);
      setSecondsRemaining((started.durationMinutes || exam.durationMinutes || 45) * 60);
      setIsTakingExam(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Exam shuru nahi ho saka.');
    }
  };

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmitExam = async () => {
    if (!user?.id || !exam || !selectedCourse) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const r = await AssessmentService.submitStudentAssessment('exam', exam.id, userAnswers);
      const res = mapAttempt(
        { score: r.score, max_score: r.maxScore, percentage: r.percentage, passed: r.passed, attempt_number: r.attemptNumber },
        selectedCourse.id,
        r.passingPercentage
      );
      setLatestResult(res);
      setIsTakingExam(false);
      // Reload attempts
      await loadCourseExam(selectedCourse.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Exam submit karte waqt masla pesh aaya.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const bestAttempt = attempts.reduce<FinalExamAttemptRecord | null>((best, curr) => {
    if (!best || curr.percentage > best.percentage) return curr;
    return best;
  }, null);

  const hasPassed = attempts.some((a) => a.passed);
  const remainingAttempts = exam ? Math.max(0, (exam.attemptLimit || 2) - attempts.length) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={isRoman ? 'Final Imtihan (Final Exam) - The Inspire Academy LMS' : 'Final Exam & Certification - The Inspire Academy LMS'}
        description="Official course certification final exam with 70% passing requirement."
        canonicalPath="/student/final-exam"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm">
              <GraduationCap className="w-3.5 h-3.5 mr-1" />
              <span>{isRoman ? 'Sanad Ka Final Imtihan' : 'Certification Final Exam'}</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Course Ka Akhri Imtihan (Final Exam)' : 'Official Final Examination'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {isRoman
              ? `Taleemi sanad hasil karne ke liye final exam mein kam az kam ${exam?.passingPercentage || 70}% marks hasil karna lazmi hain.`
              : `Official graduation certificate requires achieving at least ${exam?.passingPercentage || 70}% on this final assessment.`}
          </p>
        </div>

        {courses.length > 1 && !isTakingExam && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Course:</span>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) {
                  setSelectedCourse(found);
                  loadCourseExam(found.id);
                  setLatestResult(null);
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
            {isRoman ? 'Imtihan maloomat load ho rahi hain...' : 'Loading exam specifications...'}
          </p>
        </div>
      ) : !exam ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {isRoman ? 'Is Course Ka Final Exam Filhal Dastyab Nahi' : 'Final Exam Not Available'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isRoman
              ? 'Administration jald is course ka final exam publish karegi.'
              : 'The course instructors are preparing the final examination question bank.'}
          </p>
        </div>
      ) : isTakingExam ? (
        /* ACTIVE EXAM RUNNER */
        <div className="space-y-6">
          {/* Top Sticky Timer Bar */}
          <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-500 block">
                {selectedCourse?.title}
              </span>
              <h3 className="text-sm font-bold text-[#0F1F5C]">
                {exam.titleRomanUrdu || exam.title}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
                  secondsRemaining < 300
                    ? 'bg-rose-100 text-rose-700 animate-pulse'
                    : 'bg-[#F2F5FF] text-[#1F3FBF]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitExam}
                disabled={submitting}
                className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-xs"
              >
                {submitting ? <Spinner size="sm" className="mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                {isRoman ? 'Exam Submit Karein' : 'Submit Exam'}
              </Button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {questions.map((q, idx) => {
              const currentAns = userAnswers[q.id];
              return (
                <div
                  key={q.id}
                  className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#F2F5FF] text-[#1F3FBF] font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {isRoman ? q.questionTextRoman || q.questionTextEn : q.questionTextEn || q.questionTextRoman}
                      </p>
                      {q.questionTextEn && q.questionTextRoman && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          {isRoman ? q.questionTextRoman || q.questionTextEn : q.questionTextEn || q.questionTextRoman}
                        </p>
                      )}
                    </div>
                    <Badge variant="neutral" size="sm">
                      {q.marks || 1} {isRoman ? 'Number' : 'Mark'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {q.options.map((opt) => {
                      const isSelected = currentAns === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectAnswer(q.id, opt.id)}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-start gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'border-[#1F3FBF] bg-[#F2F5FF] text-[#0F1F5C] font-semibold ring-2 ring-[#1F3FBF]/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[10px] ${
                              isSelected
                                ? 'border-[#1F3FBF] bg-[#1F3FBF] text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </span>
                          <span>{isRoman ? opt.textRoman || opt.textEn : opt.textEn || opt.textRoman}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isRoman
                ? `Kul Sawalat: ${questions.length} | Hal Shuda: ${Object.keys(userAnswers).length}`
                : `Total Questions: ${questions.length} | Answered: ${Object.keys(userAnswers).length}`}
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmitExam}
              disabled={submitting}
              className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
            >
              {submitting ? <Spinner size="sm" className="mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {isRoman ? 'Imtihan Mukammal & Submit Karein' : 'Complete & Submit Examination'}
            </Button>
          </div>
        </div>
      ) : (
        /* EXAM DASHBOARD / OVERVIEW / RESULTS */
        <div className="space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LATEST RESULT CARD IF JUST SUBMITTED */}
          {latestResult && (
            <div
              className={`p-6 sm:p-8 rounded-2xl border-2 text-center space-y-4 animate-in fade-in-50 duration-200 ${
                latestResult.passed
                  ? 'bg-emerald-50 border-emerald-500/50'
                  : 'bg-rose-50 border-rose-400'
              }`}
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  latestResult.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}
              >
                {latestResult.passed ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {isRoman ? 'Imtihan Ka Nateeja (Result)' : 'Authoritative Examination Result'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F1F5C] mt-1">
                  {latestResult.percentage}% Score ({latestResult.score} / {latestResult.maxScore})
                </h2>
                <p className="text-sm font-semibold mt-1">
                  {latestResult.passed ? (
                    <span className="text-emerald-700">
                      {isRoman
                        ? `Mubarak ho! Aapne ${latestResult.passingThreshold}% pass threshold paar kar li hai!`
                        : `Congratulations! You passed the official ${latestResult.passingThreshold}% passing mark!`}
                    </span>
                  ) : (
                    <span className="text-rose-700">
                      {isRoman
                        ? `Aap ${latestResult.passingThreshold}% pass mark hasil nahi kar sake.`
                        : `You did not satisfy the minimum ${latestResult.passingThreshold}% pass threshold.`}
                    </span>
                  )}
                </p>
              </div>

              {latestResult.passed && (
                <div className="pt-2">
                  <Link to="/student/certificate">
                    <Button variant="primary" size="md" className="bg-[#1F3FBF] hover:bg-[#0F1F5C]">
                      <Award className="w-4 h-4 mr-2" />
                      {isRoman ? 'Apni Taleemi Sanad Dekhein' : 'View & Download Certificate'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* EXAM STATUS & LAUNCH CARD */}
          <div className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-[#0F1F5C]">
                  {exam.titleRomanUrdu || exam.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
                  {exam.descriptionRomanUrdu || exam.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasPassed ? (
                  <Badge variant="success" size="md">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {isRoman ? 'Pass Shuda' : 'Passed & Certified'}
                  </Badge>
                ) : remainingAttempts > 0 ? (
                  <Badge variant="accent" size="md">
                    {remainingAttempts} {isRoman ? 'Attempts Baqi' : 'Attempts Left'}
                  </Badge>
                ) : (
                  <Badge variant="danger" size="md">
                    {isRoman ? 'Attempts Khatam' : 'Limit Reached'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Exam Criteria Rules */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-medium uppercase text-[10px]">
                  {isRoman ? 'Pass Mark' : 'Pass Threshold'}
                </span>
                <span className="text-base font-bold text-emerald-700">
                  {exam.passingPercentage}% Required
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-medium uppercase text-[10px]">
                  {isRoman ? 'Waqt / Duration' : 'Time Limit'}
                </span>
                <span className="text-base font-bold text-slate-800">
                  {exam.durationMinutes} Minutes
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-medium uppercase text-[10px]">
                  {isRoman ? 'Kul Sawalat' : 'Questions'}
                </span>
                <span className="text-base font-bold text-slate-800">
                  {questionCount} Items
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-medium uppercase text-[10px]">
                  {isRoman ? 'Attempts Limit' : 'Allowed Attempts'}
                </span>
                <span className="text-base font-bold text-slate-800">
                  {exam.attemptLimit} Max
                </span>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-[#F2F5FF] border border-[#1F3FBF]/20 rounded-xl text-xs space-y-1.5 text-[#0F1F5C]/85">
              <div className="font-bold text-[#1F3FBF] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>{isRoman ? 'Hidayat (Official Instructions):' : 'Assessment Regulations:'}</span>
              </div>
              <p>
                {exam.instructionsRomanUrdu || exam.instructions || 'Har sawal ko ghaur se parhein aur sahi jawab chunein.'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isRoman
                  ? 'Server par waqt ka hisab chal raha hai. Internet disconnect hone par dobara resume karein.'
                  : 'The countdown is managed authoritatively. Exam auto-submits when time expires.'}
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div>
                {hasPassed ? (
                  <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {isRoman
                        ? 'Aap is imtihan ko kamyabi se pass kar chuke hain!'
                        : 'You have officially passed this examination.'}
                    </span>
                  </p>
                ) : remainingAttempts === 0 ? (
                  <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>
                      {isRoman
                        ? 'Aapke attempts mukammal ho chuke hain. Mazeed rahnumai ke liye rabta karein.'
                        : 'All available examination attempts have been used.'}
                    </span>
                  </p>
                ) : questionCount === 0 ? (
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      {isRoman
                        ? 'Is imtihan ke sawalat filhal tayar ho rahe hain. Jald dastyab honge.'
                        : 'Questions for this exam are currently being prepared. Please check back soon.'}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">
                    {isRoman
                      ? 'Taiyari mukammal hai? Imtihan shuru karne ke liye button dabayein.'
                      : 'Ready to begin? Launch the assessment when you are focused.'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasPassed ? (
                  <Link to="/student/certificate">
                    <Button variant="primary" size="md" className="bg-[#1F3FBF] hover:bg-[#0F1F5C]">
                      <Award className="w-4 h-4 mr-1.5" />
                      {isRoman ? 'Taleemi Sanad (Certificate)' : 'View Certificate'}
                    </Button>
                  </Link>
                ) : remainingAttempts > 0 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleStartExam}
                    disabled={questionCount === 0}
                    className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
                  >
                    <GraduationCap className="w-4 h-4 mr-1.5" />
                    {attempts.length === 0
                      ? isRoman
                        ? 'Imtihan Shuru Karein (Attempt 1)'
                        : 'Start Final Exam'
                      : isRoman
                      ? `Dobara Koshish (Attempt ${attempts.length + 1})`
                      : `Retake Exam (Attempt ${attempts.length + 1})`}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* PAST ATTEMPTS HISTORY TABLE */}
          {attempts.length > 0 && (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#0F1F5C] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1F3FBF]" />
                <span>{isRoman ? 'Pichli Attempts Ka Record' : 'Past Attempts Record'}</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-y border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Attempt</th>
                      <th className="py-2.5 px-3">Tareekh (Date)</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Percentage</th>
                      <th className="py-2.5 px-3">Pass Threshold</th>
                      <th className="py-2.5 px-3">Nateeja (Outcome)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map((att) => (
                      <tr key={att.id}>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          #{att.attemptNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(att.completedAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {att.score} / {att.maxScore}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-sm">
                          {att.percentage}%
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {att.passingThreshold}%
                        </td>
                        <td className="py-3 px-3">
                          {att.passed ? (
                            <Badge variant="success" size="sm">
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              Failed
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
