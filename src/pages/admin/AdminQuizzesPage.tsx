import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CourseService } from '../../services/courseService';
import { AssessmentService } from '../../services/assessmentService';
import {
  QuizRecord,
  QuestionBankItem,
  CourseCMS,
} from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  BookOpen,
  HelpCircle,
  Clock,
  Award,
  Layers,
  Save,
  X,
  FileQuestion,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const AdminQuizzesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [search, setSearch] = useState('');

  // Selected Quiz for questions management
  const [activeQuiz, setActiveQuiz] = useState<QuizRecord | null>(null);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Modals
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Partial<QuizRecord> | null>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionBankItem> | null>(null);

  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCourseId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allC, allQ] = await Promise.all([
        CourseService.getAllCourses(),
        AssessmentService.getQuizzes(selectedCourseId === 'all' ? undefined : selectedCourseId),
      ]);
      setCourses(allC);
      setQuizzes(allQ);
    } catch (err) {
      console.error('Error loading quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizQuestions = async (quiz: QuizRecord) => {
    setActiveQuiz(quiz);
    setLoadingQuestions(true);
    try {
      const qList = await AssessmentService.getQuestions(quiz.id, quiz.courseId, true);
      setQuestions(qList);
    } catch (err) {
      console.error('Error loading questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleTogglePublish = async (quiz: QuizRecord) => {
    try {
      await AssessmentService.updateQuiz(quiz.id, { isPublished: !quiz.isPublished });
      setActionSuccess(
        isRoman
          ? `Quiz "${quiz.title}" ${!quiz.isPublished ? 'publish' : 'unpublish'} ho gaya.`
          : `Quiz "${quiz.title}" is now ${!quiz.isPublished ? 'published' : 'unpublished'}.`
      );
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Status update karne mein masla aaya.');
    }
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuiz?.title || !editingQuiz?.courseId) {
      setActionError('Title aur Course select karna lazmi hai.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      if (editingQuiz.id) {
        await AssessmentService.updateQuiz(editingQuiz.id, editingQuiz);
        setActionSuccess(isRoman ? 'Quiz update ho gaya!' : 'Quiz updated successfully!');
      } else {
        await AssessmentService.createQuiz(editingQuiz);
        setActionSuccess(isRoman ? 'Naya Quiz ban gaya!' : 'Quiz created successfully!');
      }
      setShowQuizModal(false);
      setEditingQuiz(null);
      loadData();
    } catch (err: any) {
      setActionError(err.message || 'Quiz save karte waqt masla aaya.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.questionTextEn || !editingQuestion?.correctOptionId || !activeQuiz) {
      setActionError('Question text aur correct option chuna lazmi hai.');
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const payload = { ...editingQuestion, quizId: activeQuiz.id, courseId: activeQuiz.courseId };
      if (editingQuestion.id) {
        await AssessmentService.updateQuestion(editingQuestion.id, payload);
        setActionSuccess(isRoman ? 'Sawal update ho gaya!' : 'Question updated successfully!');
      } else {
        await AssessmentService.createQuestion(payload);
        setActionSuccess(isRoman ? 'Sawal save ho gaya!' : 'Question saved successfully!');
      }
      setShowQuestionModal(false);
      setEditingQuestion(null);
      loadQuizQuestions(activeQuiz);
    } catch (err: any) {
      setActionError(err.message || 'Question save karte waqt masla aaya.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm(isRoman ? 'Kya aap waqai yeh sawal delete karna chahte hain?' : 'Are you sure you want to delete this question?')) {
      return;
    }
    try {
      await AssessmentService.deleteQuestion(id);
      if (activeQuiz) loadQuizQuestions(activeQuiz);
    } catch (err: any) {
      setActionError(err.message || 'Delete karte waqt masla aaya.');
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const term = search.toLowerCase();
    return q.title.toLowerCase().includes(term) || (q.titleRomanUrdu && q.titleRomanUrdu.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      <SEO
        title={isRoman ? 'Quiz Manager - Admin Dashboard' : 'Quiz Manager & Question Bank - Admin Dashboard'}
        description="Manage online course quizzes, question bank, and assessment parameters."
        canonicalPath="/admin/quizzes"
      />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm">
              <FileQuestion className="w-3.5 h-3.5 mr-1" />
              <span>Phase 9 Assessment Engine</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F1F5C]">
            {isRoman ? 'Quiz Manager & Question Bank' : 'Course Quiz Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isRoman
              ? 'Courses ke liye quizzes, questions, waqt (timer), aur 70% passing threshold configure karein.'
              : 'Create, edit, and configure lesson quizzes and questions with secure server grading.'}
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setEditingQuiz({
              courseId: courses[0]?.id || '',
              durationMinutes: 15,
              passingScorePercentage: 70,
              maxAttempts: 3,
              isPublished: false,
            });
            setShowQuizModal(true);
          }}
          className="bg-[#1F3FBF] hover:bg-[#0F1F5C]"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {isRoman ? 'Naya Quiz Banayein' : 'Create New Quiz'}
        </Button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-semibold shrink-0">Course Filter:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
          >
            <option value="all">Tamam Courses (All Courses)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder={isRoman ? 'Quiz talash karein...' : 'Search quizzes...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Main Grid: Quizzes on Left, Questions Drawer on Right when active */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quizzes List */}
        <div className={activeQuiz ? 'lg:col-span-6 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {loading ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <Spinner size="lg" className="text-[#1F3FBF] mx-auto" />
              <p className="text-xs text-slate-500 mt-2">Quizzes load ho rahe hain...</p>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Koi Quiz Daryaft Nahi Hua</h3>
              <p className="text-xs text-slate-500 mt-1">Upar diye gaye button se pehla quiz banayein.</p>
            </div>
          ) : (
            filteredQuizzes.map((q) => {
              const isSelected = activeQuiz?.id === q.id;
              return (
                <div
                  key={q.id}
                  className={`p-5 bg-white rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#1F3FBF] ring-2 ring-[#1F3FBF]/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#1F3FBF] bg-[#F2F5FF] px-2 py-0.5 rounded-md">
                          {q.courseTitle || 'General'}
                        </span>
                        {q.isPublished ? (
                          <Badge variant="success" size="sm">Published</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Draft</Badge>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#0F1F5C]">
                        {q.titleRomanUrdu || q.title}
                      </h3>
                      {q.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {q.description}
                        </p>
                      )}

                      {(!q.isPublished || q.questionCount === 0) && (
                        <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                          {!q.isPublished && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {isRoman ? 'Ghair-shaya shuda (Students ko nazar nahi aayega)' : 'Unpublished (Not visible to students)'}
                            </span>
                          )}
                          {q.questionCount === 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              {isRoman ? '0 Sawalat (Sawalat shamil karein)' : '0 Questions (Add questions to activate)'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(q)}
                        title={q.isPublished ? 'Unpublish' : 'Publish'}
                        className="text-xs"
                      >
                        {q.isPublished ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingQuiz(q);
                          setShowQuizModal(true);
                        }}
                        className="text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Criteria badges */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {q.durationMinutes} Min
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <Award className="w-3.5 h-3.5 text-emerald-600" />
                      {q.passingScorePercentage}% Pass Mark
                    </span>
                    <span>Max Attempts: {q.maxAttempts}</span>

                    <button
                      type="button"
                      onClick={() => loadQuizQuestions(q)}
                      className="ml-auto text-xs font-bold text-[#1F3FBF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Questions Open' : 'Manage Questions'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Question Bank Panel (Opens on Right when Quiz is selected) */}
        {activeQuiz && (
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Question Bank
                </span>
                <h3 className="text-base font-bold text-[#0F1F5C]">
                  {activeQuiz.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingQuestion({
                      questionType: 'multiple_choice',
                      options: [
                        { id: 'opt1', textEn: '', textRoman: '' },
                        { id: 'opt2', textEn: '', textRoman: '' },
                        { id: 'opt3', textEn: '', textRoman: '' },
                        { id: 'opt4', textEn: '', textRoman: '' },
                      ],
                      correctOptionId: 'opt1',
                      marks: 1,
                    });
                    setShowQuestionModal(true);
                  }}
                  className="bg-[#1F3FBF] text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Question
                </Button>
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingQuestions ? (
              <div className="py-12 text-center">
                <Spinner size="md" className="mx-auto text-[#1F3FBF]" />
              </div>
            ) : questions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs">Is quiz mein abhi tak koi sawal add nahi hua.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-slate-800">
                        {idx + 1}. {q.questionTextRoman || q.questionTextEn}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          type="button"
                          aria-label="Edit question"
                          onClick={() => {
                            setEditingQuestion({ ...q, options: q.options.map((opt) => ({ ...opt })) });
                            setActionError(null);
                            setShowQuestionModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)
                        className="text-rose-500 hover:text-rose-700 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 pl-3">
                      {q.options.map((opt) => {
                        const isCorrect = opt.id === q.correctOptionId;
                        return (
                          <div
                            key={opt.id}
                            className={`text-[11px] flex items-center gap-2 ${
                              isCorrect ? 'text-emerald-700 font-bold' : 'text-slate-600'
                            }`}
                          >
                            <span>{isCorrect ? '✓' : '•'}</span>
                            <span>{opt.textRoman || opt.textEn}</span>
                            {isCorrect && (
                              <span className="text-[9px] bg-emerald-100 px-1 rounded uppercase">Correct</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUIZ CREATE/EDIT MODAL */}
      {showQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {editingQuiz?.id ? 'Quiz Edit Karein' : 'Naya Quiz Banayein'}
              </h3>
              <button onClick={() => setShowQuizModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Course</label>
                <select
                  value={editingQuiz?.courseId || ''}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, courseId: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quiz Title (English)</label>
                <Input
                  value={editingQuiz?.title || ''}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  placeholder="e.g. YouTube Monetization & Policy Test"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quiz Title (Roman Urdu)</label>
                <Input
                  value={editingQuiz?.titleRomanUrdu || ''}
                  onChange={(e) => setEditingQuiz({ ...editingQuiz, titleRomanUrdu: e.target.value })}
                  placeholder="e.g. YouTube Monetization Imtihan"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration (Min)</label>
                  <Input
                    type="number"
                    value={editingQuiz?.durationMinutes ?? 15}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, durationMinutes: Number(e.target.value) })}
                    min={0}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Pass Mark (%)</label>
                  <Input
                    type="number"
                    value={editingQuiz?.passingScorePercentage ?? 70}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, passingScorePercentage: Number(e.target.value) })}
                    min={40}
                    max={100}
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Max Attempts</label>
                  <Input
                    type="number"
                    value={editingQuiz?.maxAttempts ?? 3}
                    onChange={(e) => setEditingQuiz({ ...editingQuiz, maxAttempts: Number(e.target.value) })}
                    min={1}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowQuizModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving} className="bg-[#1F3FBF]">
                  {saving ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save Quiz
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION CREATE/EDIT MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F1F5C]">{editingQuestion?.id ? (isRoman ? 'Sawal Edit Karein' : 'Edit Question') : (isRoman ? 'Naya Sawal Add Karein' : 'Add Question')}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Question Text (English)</label>
                <Input
                  value={editingQuestion?.questionTextEn || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionTextEn: e.target.value })}
                  placeholder="e.g. Which metric defines RPM?"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Question Text (Roman Urdu)</label>
                <Input
                  value={editingQuestion?.questionTextRoman || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionTextRoman: e.target.value })}
                  placeholder="e.g. RPM ka hisab kis bunyad par hota hai?"
                />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Jawab Ke Options (Select correct option)</label>
                {(editingQuestion?.options || []).map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={editingQuestion?.correctOptionId === opt.id}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionId: opt.id })}
                      className="cursor-pointer"
                    />
                    <Input
                      placeholder={`Option ${i + 1} (English & Urdu)`}
                      value={opt.textRoman || opt.textEn}
                      onChange={(e) => {
                        const newOpts = [...(editingQuestion?.options || [])];
                        newOpts[i] = { id: opt.id, textEn: e.target.value, textRoman: e.target.value };
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      className="text-xs h-8"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowQuestionModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving} className="bg-[#1F3FBF]">
                  {saving ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  {editingQuestion?.id ? 'Update Question' : 'Save Question'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
