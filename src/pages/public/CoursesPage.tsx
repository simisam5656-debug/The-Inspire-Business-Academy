import React, { useState, useMemo, useEffect } from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { CourseCard } from '../../components/courses/CourseCard';
import { CourseModal } from '../../components/courses/CourseModal';
import { OFFICIAL_COURSES, CourseData } from '../../config/courses';
import { CourseService } from '../../services/courseService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { useTranslation } from '../../i18n';
import { Search, BookOpen, Filter, ArrowRight, Laptop, Building2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { ShortSessionRecord, SiteSettingsPublic } from '../../types';
import { Sparkles, Clock, Calendar, CheckCircle } from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [shortSessions, setShortSessions] = useState<ShortSessionRecord[]>([]);
  const [courseList, setCourseList] = useState<any[]>(
    isSupabaseConfigured ? [] : OFFICIAL_COURSES
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);

  const loadData = async () => {
    if (!isSupabaseConfigured) {
      setCourseList(OFFICIAL_COURSES);
      setLoading(false);
      setError(null);
      try {
        const ss = await CmsService.getShortSessions(true);
        setShortSessions(ss);
      } catch (err) {
        // ignore
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [ss, sRes, cRes] = await Promise.all([
        CmsService.getShortSessions(true),
        CmsService.getSiteSettings(),
        CourseService.getCourses({ status: 'published' }),
      ]);
      setShortSessions(ss);

      if (sRes?.coursesHeroImages && Array.isArray(sRes.coursesHeroImages) && sRes.coursesHeroImages.length > 0) {
        setHeroImages(sRes.coursesHeroImages.filter((img) => Boolean(img?.trim())));
      }

      if (cRes.error) {
        setError(cRes.error);
        setCourseList([]);
      } else {
        const list = cRes.data || [];
        const sorted = [...list].sort((a, b) => {
          if (a.isMostPopular && !b.isMostPopular) return -1;
          if (!a.isMostPopular && b.isMostPopular) return 1;
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        });
        setCourseList(sorted);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load courses from database');
      setCourseList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Slideshow auto-advance every 5 seconds (respects prefers-reduced-motion)
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages]);

  const categories = [
    { id: 'all', label: isRoman ? `Tamam Courses (${courseList.length})` : `All Programs (${courseList.length})` },
    { id: 'business', label: isRoman ? 'Digital Business' : 'Digital Business' },
    { id: 'design', label: isRoman ? 'Creative Media & Design' : 'Creative Media & Design' },
    { id: 'development', label: isRoman ? 'Web & Tech' : 'Web & Tech' },
    { id: 'office', label: isRoman ? 'Office Skills' : 'Office Skills' },
  ];

  const filteredCourses = useMemo(() => {
    return courseList.filter((course) => {
      const title = isRoman ? (course.titleRomanUrdu || course.title) : course.title;
      const desc = isRoman ? (course.shortDescriptionRomanUrdu || course.shortDescription) : course.shortDescription;

      const matchesSearch =
        !searchQuery.trim() ||
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || course.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, isRoman, courseList]);

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Courses - Tamam 10 Programs' : 'Courses - All 10 Career Programs'}
        description={
          isRoman
            ? 'The Inspire Business Academy ke 10 technical aur digital courses. YouTube, Web Development, Graphic Design, Video Editing, Office Management.'
            : 'Explore all 10 specialized digital and business training courses offered by The Inspire Business Academy in Sadiqabad.'
        }
        canonicalPath="/courses"
      />

      {/* Hero Header with optional 3-image looping slideshow */}
      <section className="relative overflow-hidden border-b border-[#1F3FBF]/20 bg-[#0F1F5C] text-white py-16 sm:py-20">
        {/* Background Slideshow (when images exist) */}
        {heroImages.length > 0 && (
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {heroImages.map((imgUrl, index) => (
              <div
                key={index}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                  index === activeSlide ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundImage: `url(${imgUrl})` }}
              />
            ))}
            {/* 60% Navy Overlay to keep text perfectly legible */}
            <div className="absolute inset-0 bg-[#0F1F5C]/85 backdrop-blur-[1px]" />
          </div>
        )}

        <Container size="lg" className="relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <Badge variant="accent" size="md">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Rasmi Nisab (10 Courses)' : 'Official Curriculum (10 Programs)'}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight">
              {isRoman ? 'Academy Courses Fehrist' : 'Academy Course Catalog'}
            </h1>

            <p className="text-sm sm:text-base text-white/90 leading-relaxed">
              {isRoman
                ? 'Market mein aala maang wale hunar jo aapko freelancing, local rozgar aur online kamai ke qabil banate hain.'
                : 'High-demand career skills designed to take you from beginner fundamentals to practical, client-ready competence.'}
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="mt-8 max-w-4xl mx-auto bg-white p-4 rounded-2xl border border-white/20 shadow-xl space-y-4 text-slate-800">
            <div className="relative">
              <Input
                placeholder={isRoman ? 'Course talash karein (maslan: Graphic Design, Web, YouTube)...' : 'Search courses by title or keyword...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                className="bg-[#F2F5FF]/50"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-slate-100">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#1F3FBF] text-white shadow-xs'
                      : 'bg-[#F2F5FF] text-[#0F1F5C]/80 hover:bg-[#E2E8FF] hover:text-[#1F3FBF]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Courses Grid */}
      <Section variant="white" spacing="lg">
        <Container size="lg">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
              <Spinner size="md" variant="primary" />
              <span>{isRoman ? 'Courses catalogue load ho raha hai...' : 'Loading courses catalogue...'}</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 max-w-md mx-auto my-6">
              <div className="flex items-center justify-center gap-2 text-red-700 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <Button size="sm" variant="outline" type="button" onClick={loadData}>
                {isRoman ? 'Dobara Koshish Karein' : 'Retry'}
              </Button>
            </div>
          ) : courseList.length === 0 ? (
            <EmptyState
              title={isRoman ? 'Dakhla Ke Liye Koi Course Dastiyab Nahi' : 'No Courses Open for Admission'}
              description={
                isRoman
                  ? 'Filhal dakhla ke liye koi course open nahi hai. Baraye meharbani WhatsApp par rabta karein.'
                  : 'No courses are open for admission right now. Please contact us on WhatsApp.'
              }
            />
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              title={isRoman ? 'Koi Course Nahi Mila' : 'No Courses Found'}
              description={
                isRoman
                  ? 'Aapki talash ke mutabiq koi course dastiyab nahi. Filter tabdeel karein ya tamam courses dekhein.'
                  : 'No programs match your current search query. Try clearing the filter or search term.'
              }
              action={{
                label: isRoman ? 'Tamam Courses Dekhein' : 'Show All Courses',
                onClick: () => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                },
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onSelectCourse={(c) => setSelectedCourse(c)}
                  featuredHighlight={course.isFeatured}
                />
              ))}
            </div>
          )}

          {/* Short Skill Sessions & Bootcamps (Phase 10 CMS) */}
          {shortSessions.length > 0 && (
            <div className="mt-14 space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <Badge variant="accent" size="sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRoman ? 'Tez Tareen Skill Sprints' : 'Skill Bootcamps'}</span>
                </Badge>
                <h3 className="text-xl font-bold text-[#0F1F5C] font-display">
                  {isRoman ? 'Short Sessions & Bootcamps' : 'Short Practical Bootcamps'}
                </h3>
                <p className="text-xs text-slate-600">
                  {isRoman
                    ? '7-roza aur 20-roza hands-on workshops (Enrolled tulba ke liye muft).'
                    : 'Intensive 7-day and 20-day practical skill bootcamps (Free for enrolled students).'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {shortSessions.map((ss) => (
                  <div
                    key={ss.id}
                    className="p-5 rounded-2xl bg-white border border-[#1F3FBF]/20 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#1F3FBF] font-bold text-xs inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ss.durationDays} Days Sprint
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {ss.fee === 0 ? 'FREE' : `Rs. ${ss.fee}`}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[#0F1F5C]">
                        {isRoman && ss.titleRomanUrdu ? ss.titleRomanUrdu : ss.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Topic: {ss.skillTopic}</p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {isRoman && ss.descriptionRomanUrdu ? ss.descriptionRomanUrdu : ss.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                        {ss.freeForEnrolledStudents ? 'Free for current students' : 'Open seat'}
                      </span>
                      <Link to="/contact" className="text-[#1F3FBF] font-bold hover:underline">
                        {isRoman ? 'Rabta Karein' : 'Join Workshop'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparative Package Summary Card */}
          <div className="mt-14 p-6 sm:p-8 rounded-3xl bg-[#F2F5FF] border border-[#1F3FBF]/20 max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="font-bold text-[#0F1F5C] text-lg font-display">
                {isRoman ? 'Tamam 10 Courses Ek Sath Seekhna Chahte Hain?' : 'Want to Learn All 10 Courses Together?'}
              </h3>
              <p className="text-xs sm:text-sm text-[#0F1F5C]/80">
                {isRoman
                  ? `Sadiqabad campus par 6-Mah Physical Package mein tamam ${siteConfig.physicalPackage.courseCount} courses shamil hain (Sirf Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()}/month, kul Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}).`
                  : `Our 6-Month Physical Campus package in Sadiqabad covers all ${siteConfig.physicalPackage.courseCount} courses for Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()}/month (Total Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}).`}
              </p>
            </div>

            <Link to="/join/physical" className="shrink-0 w-full md:w-auto">
              <Button variant="accent" size="md" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                {isRoman ? 'Physical Package Maloomat' : 'Physical Package Info'}
              </Button>
            </Link>
          </div>
        </Container>
      </Section>

      {/* Course Detail Modal */}
      <CourseModal
        course={selectedCourse}
        isOpen={Boolean(selectedCourse)}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
};
