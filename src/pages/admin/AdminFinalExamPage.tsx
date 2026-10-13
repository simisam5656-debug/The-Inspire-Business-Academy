import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { AssessmentService } from '../../services/assessmentService';
import { CourseService } from '../../services/courseService';
import {
  FinalExamRecord,
  QuestionBankItem,
  CourseCMS,
} from '../../types';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Clock,
  Layers,
  Settings,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const AdminFinalExamPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<FinalExamRecord[]>([]);
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [activeExam, setActiveExam] = useState<FinalExamRecord | null>(null);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Partial<FinalExamRecord> | null>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionBankItem> | null>(null);

  const [saving, setSaving] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState<string | null>(null);
  const [msgError, setMsgError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allE, allC] = await Promise.all([
        AssessmentService.getFinalExams(),
        CourseService.getAllCourses(),
      ]);
      setExams(allE);
      setCourses(allC);

      if (allE.length > 0) {
        loadExamQuestions(allE[0]);
      }
    } catch (err) {
      console.error('Error loading final exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExamQuestions = async (exam: FinalExamRecord) => {
    setActiveExam(exam);
    setLoadingQuestions(true);
    try {
      const qList = await AssessmentService.getFinalExamQuestions(exam.id, true);
      setQuestions(qList);
    } catch (err) {
      console.error('Error loading exam questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSaveExamConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig?.id) return;
    setSaving(true);
    setMsgError(null);
    try {
      await AssessmentService.updateFinalExam(
        editingConfig.id,
        editingConfig,
        user?.id,
        role || 'super_admin'
      );
      setMsgSuccess(
        isRoman
          ? `Final Exam configuration update ho gayi! Pass mark: ${editingConfig.passingPercentage}%`
          : `Final Exam updated! Pass mark: ${editingConfig.passingPercentage}%`
      );
      setShowConfigModal(false);
      setEditingConfig(null);
      await loadData();
    } catch (err: any) {
      setMsgError(err.message || 'Config save karte waqt masla aaya.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion?.questionTextEn || !editingQuestion?.correctOptionId || !activeExam) {
      setMsgError('Sawal aur sahi option darj karna lazmi hai.');
      return;
    }
    setSaving(true);
    setMsgError(null);
    try {
      await AssessmentService.saveFinalExamQuestion({
        ...editingQuestion,
        examId: activeExam.id,
      });
      setMsgSuccess(isRoman ? 'Exam sawal save ho gaya!' : 'Exam question saved!');
      setShowQuestionModal(false);
      setEditingQuestion(null);
      await loadExamQuestions(activeExam);
    } catch (err: any) {
      setMsgError(err.message || 'Question save karte waqt masla aaya.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm(isRoman ? 'Kya aap yeh sawal delete karna chahte hain?' : 'Delete this exam question?')) return;
    try {
      await AssessmentService.deleteFinalExamQuestion(id);
      if (activeExam) await loadExamQuestions(activeExam);
    } catch (err: any) {
      setMsgError(err.message || 'Delete error');
    }
  };

  return (
    <div className="space-y-6">
      <SEO
        title={isRoman ? 'Final Exam Manager - Admin Dashboard' : 'Final Exam Management - Admin Dashboard'}
        description="Configure course final exams, 70% passing threshold, and question banks."
        canonicalPath="/admin/final-exam"
      />

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="accent" size="sm">
              <GraduationCap className="w-3.5 h-3.5 mr-1" />
              <span>Phase 9 Final Assessment</span>
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F1F5C]">
            {isRoman ? 'Final Exam & Sanad Criteria Management' : 'Final Examination Administration'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isRoman
              ? 'Courses ke official certification exams, questions, aur 70% passing mark configure karein.'
              : 'Administer final course examinations, pass threshold (default 70%), and question pools.'}
          </p>
        </div>
      </div>

      {msgSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{msgSuccess}</span>
          </div>
          <button onClick={() => setMsgSuccess(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {msgError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{msgError}</span>
          </div>
          <button onClick={() => setMsgError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exams List */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            {isRoman ? 'Courses Ke Final Exams' : 'Course Final Examinations'}
          </h2>

          {loading ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
              <Spinner size="lg" className="text-[#1F3FBF] mx-auto" />
            </div>
          ) : exams.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
              Koi Final Exam record nahi mila.
            </div>
          ) : (
            exams.map((fe) => {
              const isSelected = activeExam?.id === fe.id;
              return (
                <div
                  key={fe.id}
                  className={`p-5 bg-white rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#1F3FBF] ring-2 ring-[#1F3FBF]/20 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#1F3FBF] bg-[#F2F5FF] px-2 py-0.5 rounded-md">
                        {fe.courseTitle}
                      </span>
                      <h3 className="text-sm font-bold text-[#0F1F5C]">
                        {fe.titleRomanUrdu || fe.title}
                      </h3>
                      {(!fe.isPublished || fe.questionCount === 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {!fe.isPublished && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {isRoman ? 'Ghair-shaya shuda (Students ko nazar nahi aayega)' : 'Unpublished (Not visible to students)'}
                            </span>
                          )}
                          {fe.questionCount === 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              {isRoman ? '0 Sawalat (Sawalat shamil karein)' : '0 Questions (Add questions to activate)'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingConfig(fe);
                        setShowConfigModal(true);
                      }}
                      className="text-xs"
                      title="Edit Settings"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                  </div>

                  {/* Rules & Badges */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                    <div className="p-2 bg-slate-50 rounded-lg text-center">
                      <span className="text-slate-400 block text-[9px] uppercase">Pass Mark</span>
                      <span className="font-bold text-emerald-700">{fe.passingPercentage}%</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg text-center">
                      <span className="text-slate-400 block text-[9px] uppercase">Time</span>
                      <span className="font-bold text-slate-800">{fe.durationMinutes}m</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg text-center">
                      <span className="text-slate-400 block text-[9px] uppercase">Attempts</span>
                      <span className="font-bold text-slate-800">{fe.attemptLimit} Max</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant={fe.isPublished ? 'success' : 'neutral'} size="sm">
                      {fe.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => loadExamQuestions(fe)}
                      className="text-xs font-bold text-[#1F3FBF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Questions Active' : 'View Questions'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Questions Manager on Right */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          {activeExam ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Official Exam Question Pool
                  </span>
                  <h3 className="text-base font-bold text-[#0F1F5C]">
                    {activeExam.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pass Mark: <strong className="text-emerald-700">{activeExam.passingPercentage}%</strong> | Duration: {activeExam.durationMinutes} min
                  </p>
                </div>

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
                  className="bg-[#1F3FBF] text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Exam Question
                </Button>
              </div>

              {loadingQuestions ? (
                <div className="py-16 text-center">
                  <Spinner size="md" className="mx-auto text-[#1F3FBF]" />
                </div>
              ) : questions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Is final exam mein koi sawal add nahi hua.
                </div>
              ) : (
                <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-slate-800">
                          {idx + 1}. {q.questionTextRoman || q.questionTextEn}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="text-rose-500 hover:text-rose-700 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1 pl-2">
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
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Sawal dekhne ke liye kisi exam par click karein.
            </div>
          )}
        </div>
      </div>

      {/* EDIT EXAM CONFIG MODAL (PASS MARK CONFIGURATOR) */}
      {showConfigModal && editingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F1F5C]">
                Final Exam Settings
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExamConfig} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Passing Percentage (%) — Default 70%
                </label>
                <Input
                  type="number"
                  value={editingConfig.passingPercentage ?? 70}
                  onChange={(e) => setEditingConfig({ ...editingConfig, passingPercentage: Number(e.target.value) })}
                  min={30}
                  max={100}
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Sanad hasil karne ke liye student ko yeh percentage hasil karna lazmi hogi.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Duration (Minutes)
                </label>
                <Input
                  type="number"
                  value={editingConfig.durationMinutes ?? 45}
                  onChange={(e) => setEditingConfig({ ...editingConfig, durationMinutes: Number(e.target.value) })}
                  min={10}
                  max={180}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Attempt Limit (Max Attempts)
                </label>
                <Input
                  type="number"
                  value={editingConfig.attemptLimit ?? 2}
                  onChange={(e) => setEditingConfig({ ...editingConfig, attemptLimit: Number(e.target.value) })}
                  min={1}
                  max={10}
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={saving} className="bg-[#1F3FBF]">
                  {saving ? <Spinner size="sm" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F1F5C]">Add Final Exam Question</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Question (English)</label>
                <Input
                  value={editingQuestion?.questionTextEn || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionTextEn: e.target.value })}
                  placeholder="e.g. Which tool offers optimal ROAS scaling?"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Question (Roman Urdu)</label>
                <Input
                  value={editingQuestion?.questionTextRoman || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, questionTextRoman: e.target.value })}
                  placeholder="e.g. ROAS scale karne ke liye behtareen tareeqa kya hai?"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-700 block">Answer Options & Correct Key</label>
                {(editingQuestion?.options || []).map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctExamOption"
                      checked={editingQuestion?.correctOptionId === opt.id}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctOptionId: opt.id })}
                      className="cursor-pointer"
                    />
                    <Input
                      placeholder={`Option ${i + 1}`}
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
                  Save Question
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
