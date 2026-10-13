import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CourseService } from '../../services/courseService';
import { CourseCMS, CourseStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Archive,
  CheckCircle,
  XCircle,
  Layers,
  Video,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Building,
  Laptop,
} from 'lucide-react';
import { CourseCurriculumDrawer } from '../../components/admin/CourseCurriculumDrawer';
import { ImagePreviewField } from '../../components/ui/ImagePreviewField';
import { isSafeHttpsUrl } from '../../utils/url';

export const AdminCoursesPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, isSuperAdmin, isManager } = useAuth();

  const [courses, setCourses] = useState<CourseCMS[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured'>('all');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseCMS | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    titleRomanUrdu: '',
    slug: '',
    shortDescription: '',
    shortDescriptionRomanUrdu: '',
    fullDescription: '',
    fullDescriptionRomanUrdu: '',
    thumbnailUrl: '',
    isMostPopular: false,
    onlinePrice: 5000,
    onlineDurationMonths: 6,
    price: 5000,
    durationValue: 6,
    durationUnit: 'months' as 'weeks' | 'months' | 'hours',
    category: 'business',
    categoryLabel: 'Digital Business',
    isFeatured: false,
    availableForPhysical: true,
    availableForOnline: true,
    displayOrder: 1,
    status: 'draft' as CourseStatus,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Curriculum Drawer state
  const [selectedCourseForCurriculum, setSelectedCourseForCurriculum] = useState<CourseCMS | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    const res = await CourseService.getCourses({
      search,
      status: statusFilter,
      featured: featuredFilter === 'featured' ? true : undefined,
    });
    if (res.data) {
      setCourses(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, [search, statusFilter, featuredFilter]);

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      titleRomanUrdu: '',
      slug: '',
      shortDescription: '',
      shortDescriptionRomanUrdu: '',
      fullDescription: '',
      fullDescriptionRomanUrdu: '',
      thumbnailUrl: '',
      isMostPopular: false,
      onlinePrice: 5000,
      onlineDurationMonths: 6,
      price: 5000,
      durationValue: 6,
      durationUnit: 'months',
      category: 'business',
      categoryLabel: 'Digital Business',
      isFeatured: false,
      availableForPhysical: true,
      availableForOnline: true,
      displayOrder: courses.length + 1,
      status: 'draft',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: CourseCMS) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      titleRomanUrdu: course.titleRomanUrdu || '',
      slug: course.slug,
      shortDescription: course.shortDescription,
      shortDescriptionRomanUrdu: course.shortDescriptionRomanUrdu || '',
      fullDescription: course.fullDescription || '',
      fullDescriptionRomanUrdu: course.fullDescriptionRomanUrdu || '',
      thumbnailUrl: course.thumbnailUrl || '',
      isMostPopular: !!course.isMostPopular,
      onlinePrice: course.onlinePrice ?? 5000,
      onlineDurationMonths: course.onlineDurationMonths ?? 6,
      price: course.price,
      durationValue: course.durationValue,
      durationUnit: course.durationUnit,
      category: course.category,
      categoryLabel: course.categoryLabel || 'Business',
      isFeatured: course.isFeatured,
      availableForPhysical: course.availableForPhysical !== false,
      availableForOnline: course.availableForOnline !== false,
      displayOrder: course.displayOrder,
      status: course.status,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSlugAutofill = (title: string) => {
    if (!editingCourse) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData((prev) => ({ ...prev, slug: generated }));
    }
  };

  const handleSubmitCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError(isRoman ? 'Course ka unwan (title) zaroori hai.' : 'Course title is required.');
      setSaving(false);
      return;
    }
    if (!formData.slug.trim()) {
      setFormError(isRoman ? 'Course ka slug zaroori hai.' : 'Course slug is required.');
      setSaving(false);
      return;
    }
    if (!formData.shortDescription.trim()) {
      setFormError(isRoman ? 'Mukhtasar wazahat (short description) zaroori hai.' : 'Short description is required.');
      setSaving(false);
      return;
    }

    if (formData.thumbnailUrl.trim() && !isSafeHttpsUrl(formData.thumbnailUrl.trim())) {
      setFormError(isRoman ? 'Thumbnail URL sirf HTTPS link hona chahiye.' : 'Thumbnail URL must be a valid secure HTTPS URL.');
      setSaving(false);
      return;
    }

    if (editingCourse) {
      const res = await CourseService.updateCourse(editingCourse.id, {
        title: formData.title,
        titleRomanUrdu: formData.titleRomanUrdu,
        slug: formData.slug,
        shortDescription: formData.shortDescription,
        shortDescriptionRomanUrdu: formData.shortDescriptionRomanUrdu,
        fullDescription: formData.fullDescription,
        fullDescriptionRomanUrdu: formData.fullDescriptionRomanUrdu,
        thumbnailUrl: formData.thumbnailUrl.trim() || undefined,
        isMostPopular: formData.isMostPopular,
        onlinePrice: Number(formData.onlinePrice),
        onlineDurationMonths: Number(formData.onlineDurationMonths),
        price: Number(formData.price),
        durationValue: Number(formData.durationValue),
        durationUnit: formData.durationUnit,
        category: formData.category,
        categoryLabel: formData.categoryLabel,
        isFeatured: formData.isFeatured,
        availableForPhysical: formData.availableForPhysical,
        availableForOnline: formData.availableForOnline,
        displayOrder: Number(formData.displayOrder),
        status: formData.status,
      });

      if (res.error) {
        setFormError(res.error);
        setSaving(false);
        return;
      }
    } else {
      const res = await CourseService.createCourse({
        title: formData.title,
        titleRomanUrdu: formData.titleRomanUrdu,
        slug: formData.slug,
        shortDescription: formData.shortDescription,
        shortDescriptionRomanUrdu: formData.shortDescriptionRomanUrdu,
        fullDescription: formData.fullDescription,
        fullDescriptionRomanUrdu: formData.fullDescriptionRomanUrdu,
        price: Number(formData.price),
        durationValue: Number(formData.durationValue),
        durationUnit: formData.durationUnit,
        category: formData.category,
        categoryLabel: formData.categoryLabel,
        isFeatured: formData.isFeatured,
        availableForPhysical: formData.availableForPhysical,
        availableForOnline: formData.availableForOnline,
        displayOrder: Number(formData.displayOrder),
        status: formData.status,
        actorId: user?.id,
        ...({
          thumbnailUrl: formData.thumbnailUrl.trim() || undefined,
          isMostPopular: formData.isMostPopular,
          onlinePrice: Number(formData.onlinePrice),
          onlineDurationMonths: Number(formData.onlineDurationMonths),
        } as any),
      });

      if (res.error) {
        setFormError(res.error);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setIsModalOpen(false);
    loadCourses();
  };

  const handleTogglePhysical = async (course: CourseCMS) => {
    const nextVal = course.availableForPhysical === false ? true : false;
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, availableForPhysical: nextVal } : c))
    );
    await CourseService.updateCourse(course.id, { availableForPhysical: nextVal });
  };

  const handleToggleOnline = async (course: CourseCMS) => {
    const nextVal = course.availableForOnline === false ? true : false;
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, availableForOnline: nextVal } : c))
    );
    await CourseService.updateCourse(course.id, { availableForOnline: nextVal });
  };

  const handleTogglePublish = async (course: CourseCMS) => {
    const nextStatus: CourseStatus = course.status === 'published' ? 'draft' : 'published';
    await CourseService.setCourseStatus(course.id, nextStatus);
    loadCourses();
  };

  const handleArchiveCourse = async (course: CourseCMS) => {
    const confirmMsg = isRoman
      ? `Kya aap waqai "${course.title}" ko archive karna chahte hain? Yeh public listings se chupa diya jayega.`
      : `Are you sure you want to archive "${course.title}"? It will be hidden from public listings.`;
    if (window.confirm(confirmMsg)) {
      await CourseService.setCourseStatus(course.id, 'archived');
      loadCourses();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#1F3FBF]" />
            {isRoman ? 'Online Course Manager' : 'Online Course Manager'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isRoman
              ? 'LMS courses, modules, YouTube Unlisted videos, prompts aur tools ka intizam karein.'
              : 'Create and organize courses, modules, YouTube unlisted lessons, prompts and resources.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCourses}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isRoman ? 'Refresh' : 'Refresh'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 bg-[#1F3FBF] hover:bg-[#0F1F5C]"
          >
            <Plus className="w-4 h-4" />
            {isRoman ? 'Naya Course Banayein' : 'Create Course'}
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={isRoman ? 'Course unwan ya slug se talash karein...' : 'Search by title or slug...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            {isRoman ? 'Status:' : 'Status:'}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          >
            <option value="all">{isRoman ? 'Tamam Status' : 'All Status'}</option>
            <option value="published">{isRoman ? 'Published (Shaya Shuda)' : 'Published'}</option>
            <option value="draft">{isRoman ? 'Draft (Musawwada)' : 'Draft'}</option>
            <option value="archived">{isRoman ? 'Archived (Mehfooz)' : 'Archived'}</option>
          </select>

          <select
            value={featuredFilter}
            onChange={(e) => setFeaturedFilter(e.target.value as any)}
            className="border border-gray-300 rounded-lg text-xs py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#1F3FBF]"
          >
            <option value="all">{isRoman ? 'Tamam Courses' : 'All Courses'}</option>
            <option value="featured">{isRoman ? 'Sirf Featured' : 'Featured Only'}</option>
          </select>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-gray-200">
          <Spinner size="lg" variant="primary" />
          <p className="text-sm text-gray-500 mt-3">{isRoman ? 'Courses load ho rahe hain...' : 'Loading courses...'}</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 bg-blue-50 text-[#1F3FBF] rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#0F1F5C]">
            {isRoman ? 'Abhi koi course dastiyab nahi hai' : 'No courses found'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {isRoman
              ? 'Naya online course create karein ya filter tabdeel karein.'
              : 'Create a new course to populate the academy LMS curriculum.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="mt-4 bg-[#1F3FBF]"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isRoman ? 'Naya Course Banayein' : 'Create Course'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const isPub = course.status === 'published';
            const isArch = course.status === 'archived';

            return (
              <div
                key={course.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                {/* Course Thumbnail Image or Header Banner */}
                {course.thumbnailUrl ? (
                  <div className="w-full h-36 bg-slate-100 overflow-hidden relative border-b border-gray-100">
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {course.isMostPopular && (
                      <span className="absolute top-2 left-2 bg-[#FFC20E] text-[#0F1F5C] text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm">
                        Most Popular
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      /{course.slug}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {course.isMostPopular && !course.thumbnailUrl && (
                        <Badge variant="accent" className="text-[10px] py-0.5 px-1.5 font-bold">
                          Popular
                        </Badge>
                      )}
                      {course.isFeatured && (
                        <Badge variant="warning" className="text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Featured
                        </Badge>
                      )}
                      <Badge
                        variant={isPub ? 'success' : isArch ? 'neutral' : 'warning'}
                        className="text-[10px] capitalize py-0.5 px-2"
                      >
                        {course.status}
                      </Badge>
                      {(() => {
                        const isPhys = course.availableForPhysical !== false;
                        const isOnl = course.availableForOnline !== false;
                        if (isPhys && isOnl) {
                          return (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Both
                            </span>
                          );
                        } else if (isPhys) {
                          return (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Physical
                            </span>
                          );
                        } else if (isOnl) {
                          return (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Online
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                            Neither
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-[#0F1F5C] line-clamp-1">
                    {course.title}
                  </h3>
                  {course.titleRomanUrdu && (
                    <p className="text-xs text-gray-500 italic mt-0.5 line-clamp-1">
                      {course.titleRomanUrdu}
                    </p>
                  )}

                  <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                    {isRoman && course.shortDescriptionRomanUrdu
                      ? course.shortDescriptionRomanUrdu
                      : course.shortDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {course.durationValue} {course.durationUnit}
                      </span>
                    </div>
                    <div className="flex items-center justify-end font-semibold text-[#0F1F5C]">
                      Rs. {course.price.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Layers className="w-3.5 h-3.5 text-gray-400" />
                      <span>{course.moduleCount ?? 0} {isRoman ? 'Modules' : 'Modules'}</span>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-gray-500">
                      <Video className="w-3.5 h-3.5 text-gray-400" />
                      <span>{course.lessonCount ?? 0} {isRoman ? 'Sabaq' : 'Lessons'}</span>
                    </div>
                  </div>
                </div>

                {/* Admission Visibility Quick Toggles */}
                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleTogglePhysical(course)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                      course.availableForPhysical !== false
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={isRoman ? 'Physical admission form mein dikhayein' : 'Show in Physical admission form'}
                  >
                    <Building className="w-3 h-3" />
                    <span>Physical: {course.availableForPhysical !== false ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleOnline(course)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                      course.availableForOnline !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={isRoman ? 'Online admission form mein dikhayein' : 'Show in Online admission'}
                  >
                    <Laptop className="w-3 h-3" />
                    <span>Online: {course.availableForOnline !== false ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCourseForCurriculum(course)}
                    className="text-xs font-semibold text-[#1F3FBF] hover:bg-blue-50 flex items-center gap-1 py-1.5 px-2.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    {isRoman ? 'Curriculum CMS' : 'Curriculum CMS'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(course)}
                      title={isRoman ? 'Edit Course Info' : 'Edit Course Info'}
                      className="p-1.5 text-gray-600 hover:text-[#1F3FBF] hover:bg-white rounded transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleTogglePublish(course)}
                      title={isPub ? 'Unpublish' : 'Publish'}
                      className={`p-1.5 rounded transition ${
                        isPub
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      {isPub ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    {!isArch && (
                      <button
                        onClick={() => handleArchiveCourse(course)}
                        title={isRoman ? 'Archive Course' : 'Archive Course'}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-white rounded transition"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <h2 className="text-lg font-bold text-[#0F1F5C] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#1F3FBF]" />
                {editingCourse
                  ? isRoman
                    ? 'Course Ki Maloomat Edit Karein'
                    : 'Edit Course Details'
                  : isRoman
                  ? 'Naya Course Shamil Karein'
                  : 'Create New Course'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitCourse} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Course Title (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      handleSlugAutofill(e.target.value);
                    }}
                    placeholder="e.g. AI Web Development"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Course Title (Roman Urdu)
                  </label>
                  <input
                    type="text"
                    value={formData.titleRomanUrdu}
                    onChange={(e) => setFormData({ ...formData, titleRomanUrdu: e.target.value })}
                    placeholder="e.g. AI Web Development Masterclass"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Canonical URL Slug * (e.g. /courses/ai-web-development)
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ai-web-development"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Short Description (English) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    placeholder="Brief 1-2 sentence overview for cards"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Short Description (Roman Urdu)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.shortDescriptionRomanUrdu}
                    onChange={(e) =>
                      setFormData({ ...formData, shortDescriptionRomanUrdu: e.target.value })
                    }
                    placeholder="Mukhtasar khulasa Roman Urdu mein"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
              </div>

              {/* Thumbnail URL */}
              <ImagePreviewField
                label={isRoman ? 'Course Thumbnail URL (HTTPS)' : 'Course Thumbnail Image URL (HTTPS)'}
                value={formData.thumbnailUrl}
                onChange={(val) => setFormData({ ...formData, thumbnailUrl: val })}
                placeholder="https://example.com/course-thumbnail.jpg"
                isRoman={isRoman}
                aspect="video"
                helpText="Direct HTTPS image link"
              />

              {/* Online LMS Specific Pricing & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold text-[#0F1F5C] mb-1">
                    Online Course Fee (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.onlinePrice}
                    onChange={(e) => setFormData({ ...formData, onlinePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Standard online fee: Rs. 5,000</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F1F5C] mb-1">
                    Online Access Duration (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.onlineDurationMonths}
                    onChange={(e) => setFormData({ ...formData, onlineDurationMonths: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Default access duration: 6 months</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Base / Physical Price (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration Value
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.durationValue}
                    onChange={(e) =>
                      setFormData({ ...formData, durationValue: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Duration Unit
                  </label>
                  <select
                    value={formData.durationUnit}
                    onChange={(e) =>
                      setFormData({ ...formData, durationUnit: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  >
                    <option value="months">Months (Mahine)</option>
                    <option value="weeks">Weeks (Hafte)</option>
                    <option value="hours">Hours (Ghante)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Public)</option>
                    <option value="archived">Archived (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1F3FBF] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 text-[#1F3FBF] rounded border-gray-300 focus:ring-[#1F3FBF]"
                    />
                    Featured on Homepage
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-700">
                    <input
                      type="checkbox"
                      checked={formData.isMostPopular}
                      onChange={(e) => setFormData({ ...formData, isMostPopular: e.target.checked })}
                      className="w-4 h-4 text-[#FFC20E] rounded border-gray-300 focus:ring-[#FFC20E]"
                    />
                    ⭐ Most Popular Badge
                  </label>
                </div>
              </div>

              {/* Admission Forms Visibility Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.availableForPhysical !== false}
                    onChange={(e) => setFormData({ ...formData, availableForPhysical: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded border-gray-300 focus:ring-[#1F3FBF]"
                  />
                  <span>
                    {isRoman ? 'Physical admission form mein dikhayein' : 'Show in Physical admission form'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formData.availableForOnline !== false}
                    onChange={(e) => setFormData({ ...formData, availableForOnline: e.target.checked })}
                    className="w-4 h-4 text-[#1F3FBF] rounded border-gray-300 focus:ring-[#1F3FBF]"
                  />
                  <span>
                    {isRoman ? 'Online admission form mein dikhayein' : 'Show in Online admission'}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  {isRoman ? 'Mansookh (Cancel)' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  className="bg-[#1F3FBF] hover:bg-[#0F1F5C] min-w-[100px]"
                >
                  {saving ? (
                    <Spinner size="sm" variant="white" />
                  ) : editingCourse ? (
                    isRoman ? 'Update Karein' : 'Save Changes'
                  ) : (
                    isRoman ? 'Course Banayein' : 'Create Course'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Curriculum CMS Drawer */}
      {selectedCourseForCurriculum && (
        <CourseCurriculumDrawer
          course={selectedCourseForCurriculum}
          onClose={() => {
            setSelectedCourseForCurriculum(null);
            loadCourses();
          }}
        />
      )}
    </div>
  );
};
