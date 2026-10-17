import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AssessmentService } from '../../services/assessmentService';
import { CheckCircle2, AlertCircle, RotateCcw, Clock, GraduationCap, HelpCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const StudentQuizzesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [active, setActive] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await AssessmentService.listStudentAssessments();
      setQuizzes(data.quizzes);
    } catch (err: any) {
      setErrorMsg(err.message || 'Quizzes load nahi ho sake.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const startQuiz = async (quiz: any) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const started = await AssessmentService.startStudentAssessment('quiz', quiz.id);
      setQuestions(started.questions);
      setAnswers({});
      setResult(null);
      setActive(quiz);
    } catch (err: any) {
      setErrorMsg(err.message || 'Quiz shuru nahi ho saka.');
    } finally {
      setBusy(false);
    }
  };

  const submitQuiz = async () => {
    if (!active) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const r = await AssessmentService.submitStudentAssessment('quiz', active.id, answers);
      setResult(r);
      await load();
    } catch (err: any) {
      setErrorMsg(err.message || 'Quiz submit nahi ho saka.');
    } finally {
      setBusy(false);
    }
  };

  const closeRunner = () => {
    setActive(null);
    setQuestions([]);
    setResult(null);
  };

  const title = (q: any) => (isRoman ? q.titleRomanUrdu || q.title : q.title);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title={isRoman ? 'Quizzes - The Inspire Academy LMS' : 'Quizzes - The Inspire Academy LMS'}
        description="Course quizzes"
        canonicalPath="/student/quizzes"
      />

      <div>
        <Badge variant="accent" size="sm">
          <GraduationCap className="w-3.5 h-3.5 mr-1" />
          <span>{isRoman ? 'Quizzes' : 'Quizzes'}</span>
        </Badge>
        <h1 className="text-xl sm:text-2xl font-black text-[#0F1F5C] mt-1">
          {isRoman ? 'Mere Course Ke Quizzes' : 'My Course Quizzes'}
        </h1>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" className="text-[#1F3FBF]" />
        </div>
      ) : active ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F1F5C]">{title(active)}</h2>
            <Button variant="outline" size="sm" onClick={closeRunner}>
              {isRoman ? 'Wapas' : 'Back'}
            </Button>
          </div>

          {result ? (
            <div className="space-y-4">
              <div
                className={`p-5 rounded-2xl border text-center ${
                  result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="text-2xl font-black">
                  {result.percentage}% ({result.score}/{result.maxScore})
                </div>
                <p className="text-xs mt-1">
                  {result.passed
                    ? isRoman ? 'Mubarak ho! Aap pass ho gaye.' : 'Congratulations! You passed.'
                    : isRoman
                    ? `Pass mark ${result.passingPercentage}% hai. Dobara koshish karein.`
                    : `Pass mark is ${result.passingPercentage}%. Please try again.`}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isRoman ? 'Baqi attempts' : 'Attempts left'}: {result.attemptsLeft}
                </p>
              </div>
              {result.review.map((r: any, i: number) => (
                <div key={r.questionId} className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-start gap-2">
                    {r.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{i + 1}. {r.textRoman || r.textEn}</span>
                  </div>
                  <div className="space-y-1">
                    {r.options.map((o: any) => (
                      <div
                        key={o.id}
                        className={`px-3 py-1.5 rounded-lg border ${
                          o.id === r.correctOptionId
                            ? 'border-emerald-300 bg-emerald-50'
                            : o.id === r.chosen
                            ? 'border-rose-300 bg-rose-50'
                            : 'border-slate-100'
                        }`}
                      >
                        {isRoman ? o.textRoman || o.textEn : o.textEn || o.textRoman}
                      </div>
                    ))}
                  </div>
                  {(r.explanationRoman || r.explanationEn) && (
                    <p className="text-slate-500">{isRoman ? r.explanationRoman || r.explanationEn : r.explanationEn || r.explanationRoman}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {questions.map((q, i) => (
                <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                  <p className="text-sm font-bold text-slate-800">
                    {i + 1}. {isRoman ? q.textRoman || q.textEn : q.textEn || q.textRoman}
                  </p>
                  
                  <div className="space-y-1.5">
                    {q.options.map((o: any) => (
                      <button
                        type="button"
                        key={o.id}
                        onClick={() => setAnswers((p) => ({ ...p, [q.id]: o.id }))}
                        className={`w-full text-left text-xs px-3 py-2 rounded-lg border cursor-pointer ${
                          answers[q.id] === o.id
                            ? 'border-[#1F3FBF] bg-[#F2F5FF] font-bold'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isRoman ? o.textRoman || o.textEn : o.textEn || o.textRoman}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {Object.keys(answers).length} / {questions.length} {isRoman ? 'jawab diye' : 'answered'}
                </span>
                <Button variant="primary" size="sm" disabled={busy} onClick={submitQuiz} className="bg-[#1F3FBF]">
                  {busy ? <Spinner size="sm" /> : isRoman ? 'Quiz Submit Karein' : 'Submit Quiz'}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">
            {isRoman ? 'Abhi koi quiz dastyab nahi' : 'No quizzes available yet'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isRoman
              ? 'Jab admin aapke course ka quiz publish karega to yahan nazar aayega.'
              : 'Quizzes appear here once your instructor publishes them for your course.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => {
            const used = q.attempts.length;
            const best = q.attempts.reduce((m: number, a: any) => Math.max(m, Number(a.percentage) || 0), 0);
            const passed = q.attempts.some((a: any) => a.passed);
            const left = Math.max(0, q.maxAttempts - used);
            return (
              <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#1F3FBF] bg-[#F2F5FF] px-2 py-0.5 rounded-md">{q.courseTitle}</span>
                  <h3 className="text-sm font-bold text-[#0F1F5C]">{title(q)}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{q.durationMinutes}m</span>
                    <span>{q.questionCount} {isRoman ? 'sawal' : 'questions'}</span>
                    <span>{isRoman ? 'Pass' : 'Pass'}: {q.passingPercentage}%</span>
                    <span>{isRoman ? 'Attempts' : 'Attempts'}: {used}/{q.maxAttempts}</span>
                    {used > 0 && <span>{isRoman ? 'Best' : 'Best'}: {best}%</span>}
                  </div>
                  {passed && <Badge variant="success" size="sm">{isRoman ? 'Pass' : 'Passed'}</Badge>}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#1F3FBF]"
                  disabled={busy || left === 0 || q.questionCount === 0}
                  onClick={() => startQuiz(q)}
                >
                  {used > 0 && <RotateCcw className="w-3.5 h-3.5 mr-1" />}
                  {q.questionCount === 0
                    ? isRoman ? 'Sawalat nahi' : 'No questions'
                    : left === 0
                    ? isRoman ? 'Attempts khatam' : 'No attempts left'
                    : used > 0
                    ? isRoman ? 'Dobara Koshish' : 'Retake'
                    : isRoman ? 'Shuru Karein' : 'Start Quiz'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentQuizzesPage;
