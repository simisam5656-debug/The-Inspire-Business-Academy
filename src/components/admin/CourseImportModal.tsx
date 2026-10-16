/**
 * CourseImportModal — JSON file upload → AI parse+enhance → admin approve → save.
 *
 * Flow:
 *  1. Admin uploads a JSON file (any shape) or pastes JSON text
 *  2. AI normalizes & enhances → returns structured preview
 *  3. Admin reviews, edits if needed, then approves
 *  4. On approve: create course → create modules → create lessons (sequential)
 */
import React, { useState, useRef } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CourseService } from '../../services/courseService';
import { supabase } from '../../lib/supabase';
import {
  X,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileJson,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Badge } from '../ui/Badge';

interface AiCourseLesson {
  title: string;
  titleRomanUrdu?: string;
  description?: string;
  youtubeUrl?: string;
  durationMinutes?: number;
  isFreePreview?: boolean;
  order?: number;
}

interface AiCourseModule {
  title: string;
  titleRomanUrdu?: string;
  description?: string;
  order?: number;
  lessons?: AiCourseLesson[];
}

interface AiCoursePreview {
  title: string;
  titleRomanUrdu?: string;
  slug?: string;
  shortDescription?: string;
  fullDescription?: string;
  category?: string;
  status?: string;
  modules?: AiCourseModule[];
}

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export const CourseImportModal: React.FC<Props> = ({ onClose, onImported }) => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);

  const [step, setStep] = useState<'input' | 'processing' | 'preview' | 'saving' | 'done'>('input');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AiCoursePreview | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
  const [saveProgress, setSaveProgress] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText((ev.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleProcess = async () => {
    if (!jsonText.trim()) {
      setError(isRoman ? 'JSON text ya file zaroori hai.' : 'JSON text or file is required.');
      return;
    }
    setError(null);
    setStep('processing');

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/ai/import-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jsonText }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'AI processing failed.');
        setStep('input');
        return;
      }

      setPreview(data.course);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Network error.');
      setStep('input');
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setStep('saving');
    setError(null);

    try {
      // 1. Create Course
      setSaveProgress(isRoman ? 'Course bana raha hun...' : 'Creating course...');
      const courseRes = await CourseService.createCourse({
        title: preview.title || 'Imported Course',
        titleRomanUrdu: preview.titleRomanUrdu,
        slug: preview.slug || preview.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'imported-course',
        shortDescription: preview.shortDescription || '[Add short description]',
        fullDescription: preview.fullDescription,
        category: (preview.category as any) || 'business',
        status: 'draft',
        price: 0,
        onlinePrice: 0,
        durationValue: 1,
        durationUnit: 'months',
        onlineDurationMonths: 1,
        availableForOnline: true,
        availableForPhysical: false,
        isFeatured: false,
        isMostPopular: false,
        displayOrder: 99,
      });

      if (!courseRes.data?.id) {
        throw new Error(courseRes.error || 'Course create nahi hua.');
      }

      const courseId = courseRes.data.id;

      // 2. Create Modules + Lessons
      const modules = preview.modules || [];
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];
        setSaveProgress(
          isRoman
            ? `Module ${mi + 1}/${modules.length} bana raha hun...`
            : `Creating module ${mi + 1}/${modules.length}...`
        );

        const modRes = await CourseService.createModule({
          courseId,
          title: mod.title || `Module ${mi + 1}`,
          titleRomanUrdu: mod.titleRomanUrdu,
          description: mod.description,
          order: mod.order ?? mi + 1,
        });

        if (!modRes.data?.id) continue;
        const moduleId = modRes.data.id;

        const lessons = mod.lessons || [];
        for (let li = 0; li < lessons.length; li++) {
          const les = lessons[li];
          await CourseService.createLesson({
            moduleId,
            title: les.title || `Lesson ${li + 1}`,
            titleRomanUrdu: les.titleRomanUrdu,
            description: les.description,
            youtubeUrlOrId: les.youtubeUrl || undefined,
            durationMinutes: les.durationMinutes ?? 10,
            isFreePreview: les.isFreePreview ?? false,
            displayOrder: les.order ?? li + 1,
          });
        }
      }

      setSaveProgress(isRoman ? 'Mukammal!' : 'Done!');
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Save karte waqt error aya.');
      setStep('preview');
    }
  };

  const toggleModule = (i: number) => {
    setExpandedModules((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-[#1F3FBF]" />
            <h2 className="text-base font-bold text-[#0F1F5C]">
              {isRoman ? 'AI se Course Import Karein' : 'Import Course via AI'}
            </h2>
            <Badge variant="primary" size="sm" className="bg-[#1F3FBF] text-white">Workers AI</Badge>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info banner */}
          {step === 'input' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-900">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1F3FBF]" />
              <div>
                <strong>Kaise use karein:</strong> Apni course JSON file upload karein ya JSON paste karein.
                Chahe format bilkul perfect na ho — AI khud samjhega, fields fill karega, aur descriptions improve karega.
                Phir aap preview dekhein aur approve karein.
              </div>
            </div>
          )}

          {/* Step: Input */}
          {(step === 'input' || step === 'processing') && (
            <div className="space-y-4">
              {/* File Upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#1F3FBF] rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">
                  {fileName || (isRoman ? 'JSON file yahan drop karein ya click karein' : 'Drop JSON file here or click to browse')}
                </p>
                <p className="text-xs text-slate-400 mt-1">.json files only • max 20 KB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="text-center text-xs text-slate-400">— ya JSON paste karein —</div>

              <textarea
                rows={8}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`{\n  "title": "Amazon VA Masterclass",\n  "modules": [\n    {\n      "title": "Introduction",\n      "lessons": [{"title": "Welcome", "youtube": "abc123"}]\n    }\n  ]\n}`}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={handleProcess}
                disabled={step === 'processing' || !jsonText.trim()}
                className="w-full justify-center bg-[#1F3FBF] text-white font-bold py-2.5"
              >
                {step === 'processing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> AI Process kar raha hai...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> AI se Analyze & Enhance Karein</>
                )}
              </Button>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                AI ne course enhance kar diya. Review karein aur approve karein.
              </div>

              {/* Course Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-sm text-[#0F1F5C]">{preview.title}</h3>
                {preview.titleRomanUrdu && <p className="text-xs text-slate-500">{preview.titleRomanUrdu}</p>}
                <p className="text-xs text-slate-600">{preview.shortDescription}</p>
                {preview.fullDescription && <p className="text-xs text-slate-500">{preview.fullDescription}</p>}
                <div className="flex gap-2 flex-wrap pt-1">
                  <Badge variant="outline" size="sm">Category: {preview.category || 'business'}</Badge>
                  <Badge variant="outline" size="sm">Status: Draft</Badge>
                  <Badge variant="outline" size="sm">{(preview.modules || []).length} Modules</Badge>
                  <Badge variant="outline" size="sm">
                    {(preview.modules || []).reduce((t, m) => t + (m.lessons?.length || 0), 0)} Lessons
                  </Badge>
                </div>
              </div>

              {/* Modules Preview */}
              {(preview.modules || []).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Modules & Lessons</h4>
                  {(preview.modules || []).map((mod, mi) => (
                    <div key={mi} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleModule(mi)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                      >
                        <span className="text-xs font-semibold text-slate-800">{mod.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{mod.lessons?.length || 0} lessons</span>
                          {expandedModules[mi] ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                      </button>
                      {expandedModules[mi] && (
                        <div className="divide-y divide-slate-100">
                          {(mod.lessons || []).map((les, li) => (
                            <div key={li} className="px-4 py-2 flex items-center justify-between">
                              <span className="text-xs text-slate-700">{les.title}</span>
                              <span className="text-[10px] text-slate-400">{les.durationMinutes || 10} min</span>
                            </div>
                          ))}
                          {(!mod.lessons || mod.lessons.length === 0) && (
                            <p className="px-4 py-2 text-[11px] text-slate-400">No lessons</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep('input')} className="flex-1">
                  {isRoman ? 'Wapas' : 'Back'}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSave}
                  className="flex-1 bg-[#1F3FBF] text-white font-bold justify-center"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isRoman ? 'Approve & Save Karein' : 'Approve & Save'}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Saving */}
          {step === 'saving' && (
            <div className="py-12 flex flex-col items-center gap-4">
              <Spinner size="lg" variant="primary" />
              <p className="text-sm font-semibold text-slate-700">{saveProgress}</p>
              <p className="text-xs text-slate-400">{isRoman ? 'Kripya intezar karein...' : 'Please wait...'}</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Course Successfully Import Ho Gaya!' : 'Course Imported Successfully!'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRoman
                  ? 'Course draft mode mein save ho gaya. Ab aap courses list mein dekh saktay hain.'
                  : 'Course saved as draft. You can now view it in the courses list.'}
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => { onImported(); onClose(); }}
                className="bg-[#1F3FBF] text-white font-bold"
              >
                {isRoman ? 'Courses Dekhein' : 'View Courses'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
