import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useSiteContact } from '../../hooks/useSiteContact';
import { CourseService } from '../../services/courseService';
import { StudentLmsService } from '../../services/studentLmsService';
import {
  CourseCMS,
  CourseModule,
  CourseLesson,
  LessonResource,
  StudentEnrollment,
  StudentLessonProgress,
  QuizQuestion,
  QuizAttempt,
} from '../../types';
import { getYouTubeEmbedUrl } from '../../utils/youtube';
import {
  PlayCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  Clock,
  Sparkles,
  Save,
  Shield,
  Layers,
  Award,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { SEO } from '../../components/common/SEO';

export const StudentClassroomPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile, signOut } = useAuth();

  // Security: Immediately terminate and sign out active classroom session if account is deactivated
  useEffect(() => {
    if (profile && profile.isActive === false) {
      signOut();
    }
  }, [profile?.isActive, signOut]);

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseCMS | null>(null);
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const contact = useSiteContact();
  const [question, setQuestion] = useState('');
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, StudentLessonProgress>>({});
  const [savingProgress, setSavingProgress] = useState(false);

  // Tabs below video player
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'notes' | 'quiz'>('overview');

  // Personal notes
  const [personalNote, setPersonalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedMessage, setNoteSavedMessage] = useState(false);

  // Copy prompt feedback
  const [copiedResourceId, setCopiedResourceId] = useState<string | null>(null);

  // Interactive Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<QuizAttempt | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [classroomError, setClassroomError] = useState<string | null>(null);

  // Watermark position state for subtle floating deterrence
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '20%' });

  useEffect(() => {
    // Subtle periodic shift of watermark position to deter crop filters
    const timer = setInterval(() => {
      const topOptions = ['12%', '28%', '45%', '65%', '80%'];
      const leftOptions = ['10%', '25%', '40%', '55%', '70%'];
      const rTop = topOptions[Math.floor(Math.random() * topOptions.length)];
      const rLeft = leftOptions[Math.floor(Math.random() * leftOptions.length)];
      setWatermarkPos({ top: rTop, left: rLeft });
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  // 1. Initial Load of Courses & Active Enrollment
  useEffect(() => {
    async function loadInitial() {
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
        const matchedCourse = enrolledCoursesOnly.find(
          (c: CourseCMS) => c.id === currentEnr?.courseId || c.slug === currentEnr?.courseSlug
        ) || enrolledCoursesOnly[0] || null;

        if (matchedCourse) {
          setSelectedCourse(matchedCourse);
          await loadCourseCurriculum(matchedCourse.id, currentEnr?.lastAccessedLessonId);
        } else {
          setSelectedCourse(null);
          setModules([]);
          setActiveLesson(null);
        }
      } catch (err) {
        console.error('Failed to load classroom courses', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [user?.id]);

  // Load modules and lessons for chosen course
  const loadCourseCurriculum = async (courseId: string, initialLessonId?: string) => {
    try {
      const mods = await CourseService.getCourseModules(courseId);
      setModules(mods);

      // Collect all lessons
      const allLessons: CourseLesson[] = [];
      mods.forEach((m: CourseModule) => {
        if (m.lessons) {
          allLessons.push(...m.lessons);
        }
      });

      // Fetch student progress
      if (user?.id) {
        try {
          const prog = await StudentLmsService.getLessonProgress(user.id, courseId);
          setProgressMap(prog);
        } catch (progErr) {
          console.warn('Lesson progress load failed (lessons still shown):', progErr);
        }
      }

      // Pick active lesson: initial requested or first uncompleted or first lesson
      let targetLesson: CourseLesson | undefined;
      if (initialLessonId) {
        targetLesson = allLessons.find((l) => l.id === initialLessonId);
      }
      if (!targetLesson && allLessons.length > 0) {
        targetLesson = allLessons[0];
      }

      if (targetLesson) {
        await selectLesson(targetLesson);
      }
    } catch (err) {
      console.error('Error loading curriculum', err);
    }
  };

  // Select a specific lesson
  const selectLesson = async (lesson: CourseLesson) => {
    setActiveLesson(lesson);
    // Fetch resources
    try {
      const res = await CourseService.getLessonResources(lesson.id);
      setResources(res);
    } catch (e) {
      setResources([]);
    }

    // Fetch personal note
    if (user?.id) {
      try {
        const note = await StudentLmsService.getLessonNote(user.id, lesson.id);
        setPersonalNote(note);
      } catch (e) {
        setPersonalNote('');
      }

    }
  };

  // Flat list of all lessons in display order
  const flattenedLessons = useMemo(() => {
    const list: CourseLesson[] = [];
    modules.forEach((m) => {
      if (m.lessons) {
        list.push(...m.lessons);
      }
    });
    return list;
  }, [modules]);

  const currentIndex = flattenedLessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flattenedLessons.length - 1 ? flattenedLessons[currentIndex + 1] : null;

  // Toggle Lesson Complete
  const handleToggleComplete = async () => {
    if (!user?.id || !selectedCourse || !activeLesson) return;
    setSavingProgress(true);
    try {
      const currentStatus = !!progressMap[activeLesson.id]?.isCompleted;
      const { isCompleted } = await StudentLmsService.toggleLessonProgress(
        user.id,
        selectedCourse.id,
        activeLesson.id,
        !currentStatus,
        flattenedLessons.length
      );

      setProgressMap((prev) => ({
        ...prev,
        [activeLesson.id]: {
          ...(prev[activeLesson.id] || {
            id: `prog-${activeLesson.id}`,
            userId: user.id,
            courseId: selectedCourse.id,
            lessonId: activeLesson.id,
            lastPlayedSeconds: 0,
            updatedAt: new Date().toISOString(),
          }),
          isCompleted,
        },
      }));
      setClassroomError(null);
    } catch (err: any) {
      console.error('Error toggling lesson progress', err);
      setClassroomError(err?.message || (isRoman ? 'Sabaq mukammal karne mein masla pesh aya.' : 'Failed to update lesson progress.'));
    } finally {
      setSavingProgress(false);
    }
  };

  // Save personal note
  const handleSaveNote = async () => {
    if (!user?.id || !selectedCourse || !activeLesson) return;
    setSavingNote(true);
    setClassroomError(null);
    try {
      await StudentLmsService.saveLessonNote(
        user.id,
        selectedCourse.id,
        activeLesson.id,
        personalNote,
        activeLesson.title
      );
      setNoteSavedMessage(true);
      setTimeout(() => setNoteSavedMessage(false), 3000);
    } catch (err: any) {
      console.error('Error saving note', err);
      setClassroomError(err?.message || (isRoman ? 'Note mehfooz karne mein masla pesh aya.' : 'Failed to save note.'));
    } finally {
      setSavingNote(false);
    }
  };

  // Copy prompt text
  const handleCopyResource = (resource: LessonResource) => {
    const textToCopy = resource.contentText || resource.externalUrl || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedResourceId(resource.id);
      setTimeout(() => setCopiedResourceId(null), 2500);
    }
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    if (!user?.id || !selectedCourse || !activeLesson) return;
    setSubmittingQuiz(true);
    try {
      const result = await StudentLmsService.submitQuizAttempt(
        user.id,
        selectedCourse.id,
        activeLesson.id,
        selectedAnswers
      );
      setQuizResult(result);
      setClassroomError(null);
    } catch (err: any) {
      console.error('Error submitting quiz', err);
      setClassroomError(err?.message || (isRoman ? 'Quiz submit karne mein masla pesh aya.' : 'Failed to submit quiz.'));
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const isCurrentCompleted = activeLesson ? !!progressMap[activeLesson.id]?.isCompleted : false;
  const embedUrl = activeLesson ? getYouTubeEmbedUrl(activeLesson.youtubeVideoId || '') : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SEO
        title={isRoman ? 'Online Classroom - The Inspire Business Academy' : 'Interactive Classroom - The Inspire Academy LMS'}
        description="High-definition interactive video lessons, prompt templates, and knowledge checks."
        canonicalPath="/student/classroom"
      />

      {classroomError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs flex items-center justify-between">
          <span>{classroomError}</span>
          <button
            type="button"
            onClick={() => setClassroomError(null)}
            className="text-red-600 hover:text-red-900 font-bold ml-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Course Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-[11px] font-bold text-[#1F3FBF] uppercase tracking-wider block">
            {isRoman ? 'Darsgah / Interactive Classroom' : 'Student Interactive Classroom'}
          </span>
          <h1 className="text-base sm:text-lg font-bold text-[#0F1F5C]">
            {isRoman
              ? (selectedCourse?.titleRomanUrdu || selectedCourse?.title || 'Course')
              : (selectedCourse?.title || 'Course')}
          </h1>
        </div>

        {courses.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {isRoman ? 'Course Tabdeel Karein:' : 'Switch Course:'}
            </span>
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) {
                  setSelectedCourse(found);
                  loadCourseCurriculum(found.id);
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#1F3FBF]"
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
          <p className="text-xs text-slate-500 mt-3">
            {isRoman ? 'Classroom aur videos load ho rahi hain...' : 'Preparing classroom video experience...'}
          </p>
        </div>
      ) : flattenedLessons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1F3FBF] mx-auto flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#0F1F5C]">
            {isRoman ? 'Asbaaq Jald Shamil Kiye Jayein Ge' : 'Lessons will be added soon'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {isRoman
              ? 'Is course ke video asbaaq aur darsgah materials par kaam jari hai aur jald dastyab hon ge.'
              : 'Course lessons and curriculum resources are currently being published for this enrolled batch.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Lesson Player Area (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Video Player Container */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-800 relative group">
              <div className="relative aspect-video w-full bg-black">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title={activeLesson?.title || 'Lesson Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <PlayCircle className="w-12 h-12 mb-2 text-slate-500" />
                    <p className="text-xs">
                      {isRoman ? 'Is sabaq ki video video player mein dastiyab nahi hai.' : 'No video attached to this lesson.'}
                    </p>
                  </div>
                )}

                {/* Floating Anti-Piracy Watermark Deterrent */}
                <div
                  className="absolute pointer-events-none select-none transition-all duration-1000 text-[10px] sm:text-xs text-white/25 font-mono px-2 py-0.5 rounded backdrop-blur-[0.5px] border border-white/10"
                  style={{ top: watermarkPos.top, left: watermarkPos.left }}
                >
                  {user?.email} &bull; ID: {user?.id.slice(0, 8)}
                </div>
              </div>

              {/* Lesson Controls Toolbar */}
              <div className="bg-slate-950 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!prevLesson}
                    onClick={() => prevLesson && selectLesson(prevLesson)}
                    className="text-white border-slate-700 hover:bg-slate-800 hover:text-white px-2.5 py-1 text-xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    {isRoman ? 'Pichla Sabaq' : 'Previous'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!nextLesson}
                    onClick={() => nextLesson && selectLesson(nextLesson)}
                    className="text-white border-slate-700 hover:bg-slate-800 hover:text-white px-2.5 py-1 text-xs"
                  >
                    {isRoman ? 'Agla Sabaq' : 'Next'}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleComplete}
                    disabled={savingProgress}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isCurrentCompleted
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isCurrentCompleted ? 'text-white' : 'text-slate-400'}`} />
                    <span>
                      {savingProgress
                        ? isRoman ? 'Mehfooz ho raha hai...' : 'Saving...'
                        : isCurrentCompleted
                        ? isRoman ? 'Mukammal Shuda' : 'Completed'
                        : isRoman ? 'Mukammal Nishan Lagayein' : 'Mark as Complete'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lesson Title & Context */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#1F3FBF]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{activeLesson?.durationMinutes || 20} {isRoman ? 'Minutes' : 'mins'}</span>
                    {activeLesson?.isFreePreview && (
                      <Badge variant="success" size="sm">
                        Free Preview
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-[#0F1F5C] mt-1">
                    {isRoman ? (activeLesson?.titleRomanUrdu || activeLesson?.title) : activeLesson?.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    Sabaq {currentIndex + 1} of {flattenedLessons.length}
                  </span>
                </div>
              </div>

              {/* Sub-Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === 'overview'
                      ? 'bg-[#1F3FBF] text-white'
                      : 'text-slate-600 hover:text-[#0F1F5C] hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />
                  {isRoman ? 'Wazahati Bayan / Overview' : 'Overview'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('resources')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === 'resources'
                      ? 'bg-[#1F3FBF] text-white'
                      : 'text-slate-600 hover:text-[#0F1F5C] hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-amber-500" />
                  {isRoman ? `Prompts & Resources (${resources.length})` : `Resources (${resources.length})`}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === 'notes'
                      ? 'bg-[#1F3FBF] text-white'
                      : 'text-slate-600 hover:text-[#0F1F5C] hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 inline mr-1.5" />
                  {isRoman ? 'Zaati Notes' : 'Personal Notes'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('quiz')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    activeTab === 'quiz'
                      ? 'bg-[#1F3FBF] text-white'
                      : 'text-slate-600 hover:text-[#0F1F5C] hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 inline mr-1.5 text-purple-600" />
                  {isRoman ? 'Quick Quiz' : 'Knowledge Check'}
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {activeLesson?.description || (isRoman ? 'Is sabaq mein ahem digital concepts sikhaye gaye hain.' : 'Detailed practical demonstration and workflow.')}
                  </p>

                  <div className="bg-[#F2F5FF] border border-[#1F3FBF]/15 rounded-xl p-4 text-xs space-y-1.5">
                    <span className="font-bold text-[#0F1F5C] block">
                      {isRoman ? 'Ustaad ki Hidayat:' : 'Instructor Guidance:'}
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {isRoman
                        ? 'Har step ko sath sath apne laptop ya mobile par dohrana lazmi hai. Sabaq mukammal karne ke baad Prompts tab se tools aur templates copy karein.'
                        : 'Practice the workflow simultaneously. After watching, copy the prompt templates from the Resources tab and test the knowledge check.'}
                    </p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs space-y-2">
                    <span className="font-bold text-emerald-900 block">
                      {isRoman ? 'Is lecture par sawal hai? Admin se WhatsApp par poochein' : 'Question about this lecture? Ask the admin on WhatsApp'}
                    </span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={isRoman ? 'Apna sawal yahan likhein...' : 'Type your question here...'}
                      className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-slate-800"
                    />
                    <a
                      href={
                        question.trim()
                          ? contact.waLink(
                              `Assalam o Alaikum! Sawal / Question\nStudent: ${profile?.fullName || user?.email || ''}\nCourse: ${selectedCourse?.title || ''}\nLecture: ${activeLesson?.title || ''}\n\n${question.trim()}`
                            )
                          : undefined
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!question.trim()}
                      onClick={(e) => {
                        if (!question.trim()) e.preventDefault();
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-white ${
                        question.trim() ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {isRoman ? 'WhatsApp par Bhejein' : 'Send on WhatsApp'}
                    </a>
                  </div>
                </div>
              )}

              {/* Tab 2: Resources & Prompts */}
              {activeTab === 'resources' && (
                <div className="space-y-4 pt-1">
                  {resources.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      {isRoman ? 'Is sabaq ke sath koi alag prompt ya resource munsalik nahi hai.' : 'No additional downloadable resources for this lesson.'}
                    </div>
                  ) : (
                    resources.map((res) => (
                      <div
                        key={res.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 hover:border-[#1F3FBF]/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-[#1F3FBF]">
                              {res.resourceType}
                            </span>
                            <h4 className="text-xs font-bold text-[#0F1F5C]">{res.title}</h4>
                          </div>

                          {res.contentText && (
                            <button
                              type="button"
                              onClick={() => handleCopyResource(res)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F3FBF] hover:text-[#0F1F5C] bg-white border border-slate-200 px-2 py-1 rounded transition-colors"
                            >
                              {copiedResourceId === res.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">{isRoman ? 'Copied!' : 'Copied!'}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>{isRoman ? 'Copy Karein' : 'Copy'}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {res.description && (
                          <p className="text-xs text-slate-600">{res.description}</p>
                        )}

                        {res.contentText && (
                          <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border border-slate-800">
                            {res.contentText}
                          </div>
                        )}

                        {res.externalUrl && (
                          <div className="pt-1">
                            <a
                              href={res.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F3FBF] hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{isRoman ? 'Tool ya Website Kholein' : 'Open Link / Tool'}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Personal Notes */}
              {activeTab === 'notes' && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      {isRoman ? 'Aapke zaati notes sirf aapko dikhte hain:' : 'Private study notes for this lesson:'}
                    </span>
                    {noteSavedMessage && (
                      <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                        <Check className="w-3 h-3" /> {isRoman ? 'Notes Mehfooz ho gaye!' : 'Note saved successfully!'}
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={6}
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder={
                      isRoman
                        ? 'Yahan is lecture ke ahem nukat aur apni samajh likhein...'
                        : 'Write down key timestamps, takeaways, and workflows from this lecture...'
                    }
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#1F3FBF] font-sans"
                  />

                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={savingNote}
                      className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-xs font-bold"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {savingNote
                        ? isRoman ? 'Mehfooz ho raha hai...' : 'Saving...'
                        : isRoman ? 'Notes Mehfooz Karein' : 'Save Notes'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab 4: Knowledge Quiz (real quizzes are served by the server) */}
              {activeTab === 'quiz' && (
                <div className="space-y-4 pt-1 text-center py-6">
                  <Award className="w-10 h-10 text-purple-600 mx-auto" />
                  <p className="text-sm font-bold text-[#0F1F5C]">
                    {isRoman ? 'Quizzes ke liye Quizzes page kholein' : 'Take your quizzes on the Quizzes page'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isRoman
                      ? 'Admin ke publish kiye hue quizzes wahan nazar aate hain.'
                      : 'Quizzes published by your instructor appear there.'}
                  </p>
                  <Link to="/student/quizzes" className="inline-block text-xs font-bold text-white bg-[#1F3FBF] px-4 py-2 rounded-lg">
                    {isRoman ? 'Quizzes Dekhein' : 'Open Quizzes'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Curriculum Sidebar (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#1F3FBF]" />
                  <h3 className="text-xs font-bold text-[#0F1F5C]">
                    {isRoman ? 'Course Ka Nisab (Curriculum)' : 'Course Curriculum'}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {flattenedLessons.filter((l) => progressMap[l.id]?.isCompleted).length} / {flattenedLessons.length}
                </span>
              </div>

              {/* Module & Lessons List */}
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
                {modules.map((mod, mIdx) => (
                  <div key={mod.id} className="space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-1">
                      {isRoman ? (mod.titleRomanUrdu || mod.title) : mod.title}
                    </div>

                    <div className="space-y-1">
                      {mod.lessons?.map((les) => {
                        const isCurrent = les.id === activeLesson?.id;
                        const isCompleted = !!progressMap[les.id]?.isCompleted;

                        return (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => selectLesson(les)}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
                              isCurrent
                                ? 'bg-gradient-to-r from-blue-50 to-[#F2F5FF] border-[#1F3FBF] text-[#0F1F5C] shadow-2xs font-bold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : isCurrent ? (
                                <PlayCircle className="w-4 h-4 text-[#1F3FBF] shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                              )}
                              <span className="truncate">
                                {isRoman ? (les.titleRomanUrdu || les.title) : les.title}
                              </span>
                            </div>

                            <span className="text-[10px] text-slate-400 shrink-0">
                              {les.durationMinutes}m
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
