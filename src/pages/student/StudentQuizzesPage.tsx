import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { StudentLmsService } from '../../services/studentLmsService';
import { CourseService } from '../../services/courseService';
import { CourseCMS, CourseModule, CourseLesson, QuizAttempt, QuizQuestion } from '../../types';
import { CheckCircle2, Award, AlertCircle, RotateCcw, Check, Clock, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const StudentQuizzesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseCMS | null>(null);
  const [allLessons, setAllLessons] = useState<CourseLesson[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  // Active quiz runner modal/card state
  const [activeQuizLesson, setActiveQuizLesson] = useState<CourseLesson | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCourseQuizzes = async (courseId: string) => {
    if (!user?.id) return;
    try {
      const mods = await CourseService.getCourseModules(courseId);
      const lessons: CourseLesson[] = [];
      mods.forEach((m: CourseModule) => {
        if (m.lessons) lessons.push(...m.lessons);
      });
      setAllLessons(lessons);

      const atts = await StudentLmsService.getAllStudentQuizAttempts(user.id, courseId);
      setAttempts(atts);
    } catch (err) {
      console.error('Error loading course quizzes', err);
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [allC, enrollments] = await Promise.all([
          CourseService.getAllCourses(),
          StudentLmsService.getEnrolledCourses(user.id),
        ]);

        const enrolledIds = new Set(
          enrollments.map((e: any) => e.courseId || e.courseSlug)
        );
        const enrolledCoursesOnly = allC.filter(
          (c: CourseCMS) => enrolledIds.has(c.id) || enrolledIds.has(c.slug)
        );

        setCourses(enrolledCoursesOnly);

        const currentEnr = enrollments[0];
        const initialCourse = enrolledCoursesOnly.find(
          (c: CourseCMS) => c.id === currentEnr?.courseId || c.slug === currentEnr?.courseSlug
        ) || enrolledCoursesOnly[0] || null;

        if (initialCourse) {
          setSelectedCourse(initialCourse);
          await loadCourseQuizzes(initialCourse.id);
        } else {
          setSelectedCourse(null);
          setAllLessons([]);
        }
      } catch (err) {
        console.error('Failed to load quizzes page data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.id]);

  const startQuiz = (lesson: CourseLesson) => {
    setActiveQuizLesson(lesson);
    const questions = StudentLmsService.getLessonQuiz(lesson.id);
    setActiveQuestions(questions);
    const existingAttempt = attempts.find((a) => a.lessonId === lesson.id);
    if (existingAttempt) {
      setQuizResult(existingAttempt);
      setUserAnswers(existingAttempt.userAnswers || {});
    } else {
      setQuizResult(null);
      setUserAnswers({});
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !selectedCourse || !activeQuizLesson) return;
    setSubmitting(true);
    try {
      const res = await StudentLmsService.submitQuizAttempt(
        user.id,
        selectedCourse.id,
        activeQuizLesson.id,
        userAnswers
      );
      setQuizResult(res);
      // update attempts list
      setAttempts((prev) => {
        const filtered = prev.filter((a) => a.lessonId !== activeQuizLesson.id);
        return [...filtered, res];
      });
    } catch (err) {
      console.error('Error submitting quiz', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <SEO
        title={isRoman ? 'Quizzes & Imtihan - The Inspire Business Academy' : 'Quizzes & Knowledge Checks - The Inspire Academy LMS'}
        description="Module knowledge tests and assessment grading with 70% passing threshold."
        canonicalPath="/student/quizzes"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Quizzes aur Fehmiati Imtihan' : 'Quizzes & Knowledge Checks'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {isRoman
              ? 'Sanad (Certificate) ke liye har module quiz mein kam az kam 70% number hasil karna lazmi hai.'
              : 'Demonstrate comprehension with 70% passing threshold across all course assessments to qualify for graduation.'}
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
                  loadCourseQuizzes(found.id);
                  setActiveQuizLesson(null);
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
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
          <Spinner size="lg" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">
            {isRoman ? 'Quizzes load ho rahe hain...' : 'Loading assessments...'}
          </p>
        </div>
      ) : activeQuizLesson ? (
        /* Interactive Quiz Runner View */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-bold text-[#1F3FBF] uppercase tracking-wider block">
                {isRoman ? 'Imtihani Sabaq' : 'Assessment'}
              </span>
              <h2 className="text-lg font-bold text-[#0F1F5C] mt-0.5">
                {isRoman ? (activeQuizLesson.titleRomanUrdu || activeQuizLesson.title) : activeQuizLesson.title}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveQuizLesson(null)}
              className="text-xs"
            >
              {isRoman ? 'Wapis List par' : 'Back to All Quizzes'}
            </Button>
          </div>

          {quizResult && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                quizResult.passed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Award className={`w-6 h-6 ${quizResult.passed ? 'text-emerald-600' : 'text-amber-600'}`} />
                <div>
                  <h4 className="font-bold text-sm">
                    {quizResult.passed
                      ? isRoman ? 'Mubarak! Aap Kamyab Rahe!' : 'Congratulations! Passed!'
                      : isRoman ? 'Dobara Koshish Karein' : 'Needs Review'}
                  </h4>
                  <p className="text-xs opacity-90">
                    {isRoman ? 'Hasil kardah number: ' : 'Score: '}
                    {quizResult.score} / {quizResult.maxScore} (
                    {Math.round((quizResult.score / quizResult.maxScore) * 100)}%) &bull; Minimum 70% required
                  </p>
                </div>
              </div>
              <Badge variant={quizResult.passed ? 'success' : 'warning'} size="sm">
                {quizResult.passed ? 'PASSED' : 'RETAKE'}
              </Badge>
            </div>
          )}

          {/* Question List */}
          <div className="space-y-6">
            {activeQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-[#0F1F5C]">
                  {idx + 1}. {isRoman ? q.questionRoman : q.questionEn}
                </div>

                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isSelected = userAnswers[q.id] === opt.id;
                    const isCorrect = q.correctOptionId === opt.id;
                    const showResult = !!quizResult;

                    let btnClasses = 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
                    if (isSelected) {
                      btnClasses = 'border-[#1F3FBF] bg-blue-50 text-[#0F1F5C] font-semibold';
                    }
                    if (showResult) {
                      if (isCorrect) {
                        btnClasses = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                      } else if (isSelected && !isCorrect) {
                        btnClasses = 'border-red-500 bg-red-50 text-red-900 font-medium';
                      }
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (!quizResult) {
                            setUserAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${btnClasses}`}
                      >
                        <span>{isRoman ? opt.textRoman : opt.textEn}</span>
                        {showResult && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {quizResult && (
                  <div className="text-[11px] p-2.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-100">
                    <span className="font-bold">{isRoman ? 'Tafseel: ' : 'Explanation: '}</span>
                    {isRoman ? q.explanationRoman : q.explanationEn}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {quizResult ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuizResult(null);
                  setUserAnswers({});
                }}
                className="text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                {isRoman ? 'Dobara Hal Karein' : 'Retake Assessment'}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || Object.keys(userAnswers).length === 0}
                className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-xs font-bold"
              >
                {submitting
                  ? isRoman ? 'Check ho raha hai...' : 'Evaluating...'
                  : isRoman ? 'Jawabaat Submit Karein' : 'Submit Answers'}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* FINAL EXAM BANNER (70% PASS MARK REQUIREMENT) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0F1F5C] to-[#1F3FBF] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 text-[#FFC20E]">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFC20E] bg-white/10 px-2 py-0.5 rounded">
                    Certification Milestone
                  </span>
                  <span className="text-xs text-white/80">70% Pass Threshold</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold">
                  {isRoman ? 'Official Certification Final Exam' : 'Official Certification Final Exam'}
                </h3>
                <p className="text-xs text-white/85 max-w-xl">
                  {isRoman
                    ? 'Course ki taleemi sanad (certificate) hasil karne ke liye Final Exam mein kam az kam 70% score darkar hai.'
                    : 'Achieve a minimum 70% score on the comprehensive final exam to earn your verified graduation certificate.'}
                </p>
              </div>
            </div>

            <Link to="/student/final-exam" className="shrink-0 w-full sm:w-auto">
              <Button variant="accent" size="md" className="w-full text-xs font-bold text-[#0F1F5C] bg-[#FFC20E] hover:bg-amber-300">
                <span>{isRoman ? 'Final Exam Dein' : 'Take Final Exam'}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Quizzes Overview Cards */}
          {allLessons.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1F3FBF] mx-auto flex items-center justify-center">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Asbaaq Jald Shamil Kiye Jayein Ge' : 'Lessons will be added soon'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isRoman
                  ? 'Is course ke module quizzes aur tests jald dastyab hon ge.'
                  : 'Practice quizzes for this enrolled course curriculum will be published soon.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allLessons.map((les, idx) => {
                const attempt = attempts.find((a) => a.lessonId === les.id);
                const isPassed = attempt?.passed;

                return (
                  <div
                    key={les.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-[#1F3FBF]/40 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Lesson {idx + 1}
                        </span>
                        {attempt ? (
                          <Badge variant={isPassed ? 'success' : 'warning'} size="sm">
                            {isPassed ? 'Passed' : 'Needs Review'} ({attempt.score}/{attempt.maxScore})
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Not Taken
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#0F1F5C] leading-snug">
                        {isRoman ? (les.titleRomanUrdu || les.title) : les.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {les.description || (isRoman ? 'Sabaq ke ahem concepts ka jaiza' : 'Key concepts evaluation')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        3 Questions
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startQuiz(les)}
                        className="text-xs text-[#1F3FBF] hover:bg-blue-50 border-blue-200 font-bold"
                      >
                        {attempt ? (isRoman ? 'Dobara Hal Karein' : 'Review / Retake') : isRoman ? 'Shuru Karein' : 'Take Quiz'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
