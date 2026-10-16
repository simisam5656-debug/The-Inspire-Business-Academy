import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { CourseService } from '../../services/courseService';
import {
  CourseCMS,
  CourseModule,
  CourseLesson,
  LessonResource,
  LessonResourceType,
} from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { AiEnhanceButton } from '../ui/AiEnhanceButton';
import { useAiEnhance } from '../../hooks/useAiEnhance';
import {
  X,
  Plus,
  Trash2,
  Edit,
  Video,
  FileText,
  Sparkles,
  Wrench,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Eye,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  extractYouTubeVideoId,
  isValidYouTubeInput,
  getYouTubeEmbedUrl,
} from '../../utils/youtube';

interface Props {
  course: CourseCMS;
  onClose: () => void;
}

export const CourseCurriculumDrawer: React.FC<Props> = ({ course, onClose }) => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Enhance hooks — one per form context
  const moduleAi = useAiEnhance();
  const lessonAi = useAiEnhance();

  // Module creation modal
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleTitleRoman, setModuleTitleRoman] = useState('');
  const [moduleDesc, setModuleDesc] = useState('');

  // Curriculum editing state
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTitleRoman, setEditTitleRoman] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editYoutube, setEditYoutube] = useState('');
  const [editDuration, setEditDuration] = useState(15);
  const [editFreePreview, setEditFreePreview] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Lesson creation modal
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonTitleRoman, setLessonTitleRoman] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonYoutube, setLessonYoutube] = useState('');
  const [lessonDuration, setLessonDuration] = useState(15);
  const [lessonIsFreePreview, setLessonIsFreePreview] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  // Resource creation modal
  const [activeLessonForResource, setActiveLessonForResource] = useState<string | null>(null);
  const [resTitle, setResTitle] = useState('');
  const [resType, setResType] = useState<LessonResourceType>('note');
  const [resDescription, setResDescription] = useState('');
  const [resContentText, setResContentText] = useState('');
  const [resExternalUrl, setResExternalUrl] = useState('');

  // Video preview player in modal
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  const loadCurriculum = async () => {
    setLoading(true);
    const res = await CourseService.getModulesWithCurriculum(course.id);
    if (res.data) {
      setModules(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCurriculum();
  }, [course.id]);

  // Handle Module Create
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) return;

    await CourseService.createModule({
      courseId: course.id,
      title: moduleTitle,
      titleRomanUrdu: moduleTitleRoman || undefined,
      description: moduleDesc || undefined,
      displayOrder: modules.length + 1,
    });

    setModuleTitle('');
    setModuleTitleRoman('');
    setModuleDesc('');
    setIsModuleModalOpen(false);
    loadCurriculum();
  };

  // Open/save curriculum edit forms
  const startEditModule = (mod: CourseModule) => {
    setEditingModule(mod); setEditingLesson(null);
    setEditTitle(mod.title); setEditTitleRoman(mod.titleRomanUrdu || '');
    setEditDescription(mod.description || ''); setEditError(null);
  };

  const startEditLesson = (lesson: CourseLesson) => {
    setEditingLesson(lesson); setEditingModule(null);
    setEditTitle(lesson.title); setEditTitleRoman(lesson.titleRomanUrdu || '');
    setEditDescription(lesson.description || ''); setEditYoutube(lesson.youtubeVideoId || '');
    setEditDuration(lesson.durationMinutes || 15); setEditFreePreview(!!lesson.isFreePreview);
    setEditError(null);
  };

  const handleSaveCurriculumEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) { setEditError(isRoman ? 'Title zaroori hai.' : 'Title is required.'); return; }
    if (editingLesson && editYoutube.trim() && !isValidYouTubeInput(editYoutube)) {
      setEditError(isRoman ? 'YouTube link ya video ID durust nahi.' : 'Please enter a valid YouTube URL or video ID.'); return;
    }
    setEditSaving(true); setEditError(null);
    const result = editingModule
      ? await CourseService.updateModule(editingModule.id, { title: editTitle.trim(), titleRomanUrdu: editTitleRoman.trim(), description: editDescription.trim() })
      : editingLesson
        ? await CourseService.updateLesson(editingLesson.id, { title: editTitle.trim(), titleRomanUrdu: editTitleRoman.trim(), description: editDescription.trim(), youtubeUrlOrId: editYoutube.trim(), durationMinutes: Math.max(1, Number(editDuration) || 1), isFreePreview: editFreePreview })
        : null;
    setEditSaving(false);
    if (!result || result.error) { setEditError(result?.error || (isRoman ? 'Save nahi ho saka.' : 'Unable to save changes.')); return; }
    setEditingModule(null); setEditingLesson(null);
    await loadCurriculum();
  };

  // Handle Module Delete
  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (window.confirm(isRoman ? `Module "${title}" ko delete karna chahte hain?` : `Delete module "${title}"?`)) {
      await CourseService.deleteModule(moduleId);
      loadCurriculum();
    }
  };

  // Handle Lesson Create
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForLesson || !lessonTitle.trim()) return;

    if (lessonYoutube && !isValidYouTubeInput(lessonYoutube)) {
      setLessonError(
        isRoman
          ? 'Ghalat YouTube link ya ID hai. Barahe karam 11-harfi ID ya mukammal URL darj karein.'
          : 'Invalid YouTube link or ID. Please provide an 11-character video ID or valid URL.'
      );
      return;
    }

    const currentModule = modules.find((m) => m.id === activeModuleForLesson);
    const order = (currentModule?.lessons?.length || 0) + 1;

    await CourseService.createLesson({
      moduleId: activeModuleForLesson,
      title: lessonTitle,
      titleRomanUrdu: lessonTitleRoman || undefined,
      description: lessonDesc || undefined,
      youtubeUrlOrId: lessonYoutube || undefined,
      durationMinutes: lessonDuration,
      isFreePreview: lessonIsFreePreview,
      displayOrder: order,
    });

    setActiveModuleForLesson(null);
    setLessonTitle('');
    setLessonTitleRoman('');
    setLessonDesc('');
    setLessonYoutube('');
    setLessonDuration(15);
    setLessonIsFreePreview(false);
    setLessonError(null);
    loadCurriculum();
  };

  // Handle Lesson Delete
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (window.confirm(isRoman ? `Sabaq "${title}" ko delete karna chahte hain?` : `Delete lesson "${title}"?`)) {
      await CourseService.deleteLesson(lessonId);
      loadCurriculum();
    }
  };

  // Handle Resource Create
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLessonForResource || !resTitle.trim()) return;

    await CourseService.createResource({
      lessonId: activeLessonForResource,
      title: resTitle,
      resourceType: resType,
      description: resDescription || undefined,
      contentText: resContentText || undefined,
      externalUrl: resExternalUrl || undefined,
    });

    setActiveLessonForResource(null);
    setResTitle('');
    setResType('note');
    setResDescription('');
    setResContentText('');
    setResExternalUrl('');
    loadCurriculum();
  };

  // Handle Resource Delete
  const handleDeleteResource = async (resourceId: string) => {
    await CourseService.deleteResource(resourceId);
    loadCurriculum();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-[#0F1F5C] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-yellow-400">
                {isRoman ? 'Curriculum & Resources CMS' : 'Curriculum & Resources CMS'}
              </span>
              <Badge variant="neutral" className="text-[10px] bg-white/20 text-white">
                /{course.slug}
              </Badge>
            </div>
            <h2 className="text-lg font-bold mt-1 text-white">{course.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            {isRoman
              ? 'Modules, recorded YouTube Unlisted lectures, prompts aur tools yahan organize karein.'
              : 'Structure modules, lessons with unlisted video embeds, prompt files and tool links.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModuleModalOpen(true)}
            className="bg-[#1F3FBF] text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {isRoman ? 'Naya Module Shamil Karein' : 'Add New Module'}
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Spinner size="lg" variant="primary" />
              <p className="text-xs text-gray-500 mt-2">{isRoman ? 'Curriculum load ho raha hai...' : 'Loading curriculum...'}</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
              <div className="w-12 h-12 bg-blue-50 text-[#1F3FBF] rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Is course ka koi module nahi hai' : 'No modules created yet'}
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {isRoman
                  ? 'Pehla module banayein taake iske andar lectures aur resources add kiye ja sakein.'
                  : 'Add your first module to begin structuring recorded lectures and student resources.'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsModuleModalOpen(true)}
                className="mt-4 bg-[#1F3FBF] text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {isRoman ? 'Module Banayein' : 'Create Module'}
              </Button>
            </div>
          ) : (
            modules.map((mod, modIdx) => (
              <div
                key={mod.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Module Header */}
                <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1F3FBF] text-white text-xs font-bold flex items-center justify-center">
                      {modIdx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F1F5C]">{mod.title}</h4>
                      {mod.titleRomanUrdu && (
                        <p className="text-xs text-gray-500 italic">{mod.titleRomanUrdu}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditModule(mod)}
                      className="text-xs py-1 px-2.5 text-gray-600 hover:bg-gray-100"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      {isRoman ? 'Module Edit Karein' : 'Edit Module'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveModuleForLesson(mod.id)}
                      className="text-xs py-1 px-2.5 text-[#1F3FBF] hover:bg-blue-50 border-blue-200"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {isRoman ? 'Sabaq Add Karein' : 'Add Lesson'}
                    </Button>
                    <button
                      onClick={() => handleDeleteModule(mod.id, mod.title)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                      title={isRoman ? 'Module Delete Karein' : 'Delete Module'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Module Lessons */}
                <div className="p-4 space-y-3">
                  {(!mod.lessons || mod.lessons.length === 0) ? (
                    <p className="text-xs text-gray-400 italic text-center py-3">
                      {isRoman ? 'Is module mein abhi koi sabaq nahi hai.' : 'No lessons added to this module yet.'}
                    </p>
                  ) : (
                    mod.lessons.map((lesson, lesIdx) => (
                      <div
                        key={lesson.id}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200/80 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-gray-400 mt-0.5">
                              {modIdx + 1}.{lesIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-[#0F1F5C]">
                                  {lesson.title}
                                </h5>
                                {lesson.isFreePreview && (
                                  <Badge variant="success" className="text-[9px] px-1.5 py-0">
                                    Free Preview
                                  </Badge>
                                )}
                              </div>
                              {lesson.titleRomanUrdu && (
                                <p className="text-[11px] text-gray-500 italic">
                                  {lesson.titleRomanUrdu}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                                {lesson.durationMinutes > 0 && (
                                  <span>{lesson.durationMinutes} mins</span>
                                )}
                                {lesson.youtubeVideoId ? (
                                  <button
                                    onClick={() => setPreviewVideoId(lesson.youtubeVideoId!)}
                                    className="text-[#1F3FBF] hover:underline flex items-center gap-1 font-medium"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5 text-red-600" />
                                    YouTube Embed (ID: {lesson.youtubeVideoId})
                                  </button>
                                ) : (
                                  <span className="text-amber-600">
                                    {isRoman ? 'Video link missing' : 'No video assigned'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditLesson(lesson)}
                              className="text-[10px] py-0.5 px-2 text-gray-600 hover:text-[#1F3FBF] h-7"
                            >
                              <Edit className="w-3 h-3 mr-0.5" />
                              {isRoman ? 'Edit' : 'Edit'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveLessonForResource(lesson.id)}
                              className="text-[10px] py-0.5 px-2 text-gray-600 hover:text-[#1F3FBF] h-7"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              {isRoman ? 'Resource' : 'Resource'}
                            </Button>
                            <button
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Lesson Attached Resources */}
                        {lesson.resources && lesson.resources.length > 0 && (
                          <div className="mt-2 pl-6 pt-2 border-t border-gray-200/60 space-y-1.5">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                              {isRoman ? 'Dastiyab Resources:' : 'Attached Resources:'}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {lesson.resources.map((res) => (
                                <div
                                  key={res.id}
                                  className="bg-white p-2 rounded border border-gray-200 text-xs flex items-start justify-between gap-2"
                                >
                                  <div className="flex items-start gap-1.5 overflow-hidden">
                                    {res.resourceType === 'prompt' ? (
                                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                                    ) : res.resourceType === 'tool' ? (
                                      <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                    ) : res.resourceType === 'link' ? (
                                      <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    )}
                                    <div className="overflow-hidden">
                                      <p className="font-semibold text-gray-800 truncate text-[11px]">
                                        {res.title}
                                      </p>
                                      {res.externalUrl && (
                                        <a
                                          href={res.externalUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 truncate"
                                        >
                                          {res.externalUrl}
                                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                        </a>
                                      )}
                                      {res.contentText && (
                                        <p className="text-[10px] text-gray-500 line-clamp-1 italic">
                                          {res.contentText}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteResource(res.id)}
                                    className="text-gray-300 hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Module Create Modal */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[#0F1F5C] mb-4">
              {isRoman ? 'Naya Curriculum Module' : 'New Curriculum Module'}
            </h3>
            <form onSubmit={handleCreateModule} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Module Title (English) *
                  </label>
                  <AiEnhanceButton
                    value={moduleTitle}
                    loading={moduleAi.loading}
                    suggestion={moduleAi.suggestion}
                    error={moduleAi.error}
                    onEnhance={() => moduleAi.enhance('Module Title', moduleTitle, `Course: ${course.title}`)}
                    onAccept={(v) => { setModuleTitle(v); moduleAi.dismiss(); }}
                    onDismiss={moduleAi.dismiss}
                  />
                </div>
                <input
                  type="text"
                  required
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  placeholder="e.g. Module 1: Foundational Workflow"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Module Title (Roman Urdu)
                </label>
                <input
                  type="text"
                  value={moduleTitleRoman}
                  onChange={(e) => setModuleTitleRoman(e.target.value)}
                  placeholder="e.g. Module 1: Bunyadi Tareeqa-kar"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Description</label>
                  <AiEnhanceButton
                    value={moduleDesc}
                    loading={moduleAi.loading}
                    suggestion={moduleAi.suggestion}
                    error={moduleAi.error}
                    onEnhance={() => moduleAi.enhance('Module Description', moduleDesc, `Course: ${course.title}, Module: ${moduleTitle}`)}
                    onAccept={(v) => { setModuleDesc(v); moduleAi.dismiss(); }}
                    onDismiss={moduleAi.dismiss}
                  />
                </div>
                <textarea
                  rows={2}
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModuleModalOpen(false)}
                >
                  {isRoman ? 'Cancel' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#1F3FBF]">
                  {isRoman ? 'Module Mehfooz Karein' : 'Save Module'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Create Modal */}
      {activeModuleForLesson && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[#0F1F5C] mb-2">
              {isRoman ? 'Naya Sabaq / Lecture Shamil Karein' : 'Add New Lesson / Lecture'}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {isRoman
                ? 'YouTube unlisted lecture link ya video ID darj karein.'
                : 'Enter YouTube unlisted video URL or 11-character video ID.'}
            </p>

            {lessonError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded mb-3">
                {lessonError}
              </div>
            )}

            <form onSubmit={handleCreateLesson} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Lesson Title (English) *
                  </label>
                  <AiEnhanceButton
                    value={lessonTitle}
                    loading={lessonAi.loading}
                    suggestion={lessonAi.suggestion}
                    error={lessonAi.error}
                    onEnhance={() => lessonAi.enhance('Lesson Title', lessonTitle, `Course: ${course.title}`)}
                    onAccept={(v) => { setLessonTitle(v); lessonAi.dismiss(); }}
                    onDismiss={lessonAi.dismiss}
                  />
                </div>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Lesson 1: Niche Research Techniques"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lesson Title (Roman Urdu)
                </label>
                <input
                  type="text"
                  value={lessonTitleRoman}
                  onChange={(e) => setLessonTitleRoman(e.target.value)}
                  placeholder="e.g. Sabaq 1: Niche Research ke Tareeqe"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  YouTube Video Link / ID (Unlisted)
                </label>
                <input
                  type="text"
                  value={lessonYoutube}
                  onChange={(e) => setLessonYoutube(e.target.value)}
                  placeholder="https://youtu.be/dQw4w9WgXcQ or dQw4w9WgXcQ"
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  * PRD Standard: Unlisted YouTube videos provide safe embeds, not full DRM.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-xs"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={lessonIsFreePreview}
                      onChange={(e) => setLessonIsFreePreview(e.target.checked)}
                      className="w-4 h-4 text-[#1F3FBF] rounded"
                    />
                    Free Preview (Trial)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveModuleForLesson(null);
                    setLessonError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#1F3FBF]">
                  {isRoman ? 'Sabaq Shamil Karein' : 'Save Lesson'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Modal */}
      {activeLessonForResource && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[#0F1F5C] mb-3">
              {isRoman ? 'Resource / Tool / Prompt Shamil Karein' : 'Attach Lesson Resource'}
            </h3>
            <form onSubmit={handleCreateResource} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g. Master Prompt Template / Recommended Tool"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Resource Type *
                </label>
                <select
                  value={resType}
                  onChange={(e) => setResType(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                >
                  <option value="note">Lesson Note / Checklist</option>
                  <option value="prompt">AI Prompt Example</option>
                  <option value="tool">Useful Tool / Software</option>
                  <option value="link">External Resource Link</option>
                  <option value="document">Practice Document Reference</option>
                </select>
              </div>

              {(resType === 'tool' || resType === 'link' || resType === 'document') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    URL Link
                  </label>
                  <input
                    type="url"
                    value={resExternalUrl}
                    onChange={(e) => setResExternalUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              {(resType === 'note' || resType === 'prompt') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {resType === 'prompt' ? 'Prompt Text / Instructions' : 'Notes / Content Text'}
                  </label>
                  <textarea
                    rows={4}
                    value={resContentText}
                    onChange={(e) => setResContentText(e.target.value)}
                    placeholder={
                      resType === 'prompt'
                        ? 'Act as a professional YouTube strategist...'
                        : 'Write lesson notes or bullet points...'
                    }
                    className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveLessonForResource(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-[#1F3FBF]">
                  {isRoman ? 'Resource Shamil Karein' : 'Attach Resource'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Module / Lesson Modal */}
      {(editingModule || editingLesson) && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl my-8">
            <h3 className="text-base font-bold text-[#0F1F5C] mb-4">{editingModule ? (isRoman ? 'Module Edit Karein' : 'Edit Module') : (isRoman ? 'Lecture Edit Karein' : 'Edit Lesson / Lecture')}</h3>
            {editError && <div role="alert" className="p-2.5 bg-red-50 text-red-700 text-xs rounded mb-3">{editError}</div>}
            <form onSubmit={handleSaveCurriculumEdit} className="space-y-3">
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">{editingModule ? 'Module Title (English) *' : 'Lesson Title (English) *'}</label><input autoFocus required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Title (Roman Urdu)</label><input value={editTitleRoman} onChange={(e) => setEditTitleRoman(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              <div><label className="block text-xs font-semibold text-gray-700 mb-1">Description</label><textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs" /></div>
              {editingLesson && <>
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">YouTube Video Link / ID</label><input value={editYoutube} onChange={(e) => setEditYoutube(e.target.value)} placeholder="https://youtu.be/VIDEO_ID" className="w-full px-3 py-2 border rounded-lg text-xs font-mono" /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="block text-xs font-semibold text-gray-700 mb-1">Duration (Minutes)</label><input type="number" min="1" value={editDuration} onChange={(e) => setEditDuration(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg text-xs" /></div><label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 pt-5"><input type="checkbox" checked={editFreePreview} onChange={(e) => setEditFreePreview(e.target.checked)} className="w-4 h-4 text-[#1F3FBF] rounded" />Free Preview</label></div>
              </>}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100"><Button type="button" variant="outline" size="sm" onClick={() => { setEditingModule(null); setEditingLesson(null); setEditError(null); }}>Cancel</Button><Button type="submit" variant="primary" size="sm" disabled={editSaving} className="bg-[#1F3FBF]">{editSaving ? (isRoman ? 'Save ho raha hai...' : 'Saving...') : (isRoman ? 'Changes Save Karein' : 'Save Changes')}</Button></div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoId && (
        <div className="fixed inset-0 z-70 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-black rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gray-800">
            <div className="p-3 bg-gray-900 text-white flex items-center justify-between">
              <span className="text-xs font-mono text-gray-400">
                Unlisted Preview • ID: {previewVideoId}
              </span>
              <button
                onClick={() => setPreviewVideoId(null)}
                className="text-white hover:text-gray-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={getYouTubeEmbedUrl(previewVideoId)}
                title="Lesson Preview"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
