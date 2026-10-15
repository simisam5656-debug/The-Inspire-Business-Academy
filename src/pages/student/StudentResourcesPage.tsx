import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CourseService } from '../../services/courseService';
import { StudentLmsService, MyResourceItem } from '../../services/studentLmsService';
import { SEO } from '../../components/common/SEO';
import { Spinner } from '../../components/ui/Spinner';
import { FolderOpen, Search, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

const TYPES = ['all', 'prompt', 'tool', 'document', 'link', 'note'] as const;

export const StudentResourcesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user } = useAuth();

  const [items, setItems] = useState<MyResourceItem[]>([]);
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      try {
        const [allCourses, enrollments] = await Promise.all([
          CourseService.getAllCourses(),
          StudentLmsService.getEnrolledCourses(user.id),
        ]);
        const enrolled = new Set(enrollments.map((e: any) => e.courseId || e.courseSlug));
        const mine = allCourses.filter((c: any) => enrolled.has(c.id) || enrolled.has(c.slug));
        const titles: Record<string, string> = {};
        mine.forEach((c: any) => (titles[c.id] = c.title));
        const list = await StudentLmsService.getAllMyResources(mine.map((c: any) => c.id));
        if (!cancelled) {
          setCourseTitles(titles);
          setItems(list);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load resources');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (type !== 'all' && r.resourceType !== type) return false;
      if (courseFilter !== 'all' && r.courseId !== courseFilter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        r.lessonTitle.toLowerCase().includes(q) ||
        (r.contentText || '').toLowerCase().includes(q)
      );
    });
  }, [items, query, type, courseFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, MyResourceItem[]>();
    for (const r of filtered) {
      const key = `${r.courseId}::${r.moduleTitle}`;
      map.set(key, [...(map.get(key) || []), r]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const copy = async (r: MyResourceItem) => {
    const text = r.contentText || r.externalUrl || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SEO title="Resources" description="All course resources in one place" />
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h1 className="text-lg font-bold text-[#0F1F5C] flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-[#1F3FBF]" />
          {isRoman ? 'Resources (Sab Ek Jaga)' : 'Resources Library'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isRoman
            ? 'Lectures mein admin ki taraf se lagaye gaye saare prompts, tools aur links yahan jama hain.'
            : 'Every prompt, tool and link your instructor attached to lectures, collected here.'}
        </p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRoman ? 'Resource ya lecture talash karein...' : 'Search resources or lectures...'}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                type === t ? 'bg-[#1F3FBF] text-white border-[#1F3FBF]' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {t === 'all' ? (isRoman ? 'Sab' : 'All') : t}
            </button>
          ))}
          {Object.keys(courseTitles).length > 1 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="ml-auto text-[11px] border border-slate-200 rounded-lg px-2 py-1"
            >
              <option value="all">{isRoman ? 'Tamam Courses' : 'All courses'}</option>
              {Object.entries(courseTitles).map(([id, t]) => (
                <option key={id} value={id}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Spinner size="md" variant="primary" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-500">
          {items.length === 0
            ? isRoman
              ? 'Abhi aap ke courses mein koi resource shamil nahi hua.'
              : 'No resources have been added to your courses yet.'
            : isRoman
              ? 'Koi resource nahi mila. Filter ya search badal kar dekhein.'
              : 'No matches. Try changing the search or filter.'}
        </div>
      ) : (
        grouped.map(([key, list]) => (
          <section key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                {courseTitles[list[0].courseId] || 'Course'}
              </div>
              <div className="text-sm font-bold text-[#0F1F5C]">{list[0].moduleTitle}</div>
            </div>
            <div className="divide-y divide-slate-100">
              {list.map((r) => (
                <div key={r.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-[#1F3FBF] mr-2">
                        {r.resourceType}
                      </span>
                      <span className="font-bold text-[#0F1F5C]">{r.title}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isRoman ? 'Lecture' : 'Lecture'}: {r.lessonTitle}
                      </div>
                    </div>
                    {(r.contentText || r.externalUrl) && (
                      <button
                        type="button"
                        onClick={() => copy(r)}
                        className="shrink-0 inline-flex items-center gap-1 font-semibold text-[#1F3FBF] bg-white border border-slate-200 px-2 py-1 rounded"
                      >
                        {copiedId === r.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
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
                  {r.description && <p className="text-slate-600">{r.description}</p>}
                  {r.contentText && (
                    <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border border-slate-800">
                      {r.contentText}
                    </div>
                  )}
                  {r.externalUrl && /^https?:\/\//i.test(r.externalUrl) && (
                    <a
                      href={r.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-[#1F3FBF] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {isRoman ? 'Tool ya Website Kholein' : 'Open Link / Tool'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
