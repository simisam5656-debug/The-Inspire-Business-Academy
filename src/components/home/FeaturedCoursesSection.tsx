import React, { useState, useEffect } from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { CourseCard } from '../courses/CourseCard';
import { CourseModal } from '../courses/CourseModal';
import { OFFICIAL_COURSES } from '../../config/courses';
import { CourseService } from '../../services/courseService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useTranslation } from '../../i18n';
import { ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FeaturedCoursesSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [courses, setCourses] = useState<any[]>(
    isSupabaseConfigured ? [] : OFFICIAL_COURSES.filter((c) => c.isFeatured)
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const loadPublished = async () => {
    if (!isSupabaseConfigured) {
      setCourses(OFFICIAL_COURSES.filter((c) => c.isFeatured));
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchErr } = await CourseService.getCourses({ status: 'published', featured: true });
      if (fetchErr) {
        setError(fetchErr);
        setCourses([]);
      } else {
        const list = data || [];
        const prioritySlugs = ['ai-earnings-course', 'ai-web-development'];
        const sorted = [...list].sort((a, b) => {
          const aPriority = prioritySlugs.indexOf(a.slug);
          const bPriority = prioritySlugs.indexOf(b.slug);
          if (aPriority !== -1 || bPriority !== -1) {
            if (aPriority === -1) return 1;
            if (bPriority === -1) return -1;
            return aPriority - bPriority;
          }
          if (a.isMostPopular && !b.isMostPopular) return -1;
          if (!a.isMostPopular && b.isMostPopular) return 1;
          return a.displayOrder - b.displayOrder;
        });
        setCourses(sorted.slice(0, 3));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load featured courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublished();
  }, []);

  return (
    <Section variant="white" spacing="lg" id="featured-courses">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Khas Courses' : 'Featured Programs'}
          title={isRoman ? 'Numaya Practical Skills' : 'Top In-Demand Career Programs'}
          description={
            isRoman
              ? 'Market ki zaroorat ke mutabiq tayyar kiye gaye ahem courses jin se tulba kam waqt mein practical maharat hasil kar sakte hain.'
              : 'Our flagship commercial training courses engineered to prepare students for rapid career advancement and remote client earnings.'
          }
          align="center"
        />

        {loading && (
          <div className="py-12 flex justify-center items-center gap-2 text-slate-500 text-sm">
            <Spinner size="md" variant="primary" />
            <span>{isRoman ? 'Featured courses load ho rahe hain...' : 'Loading featured programs...'}</span>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 max-w-md mx-auto my-6">
            <div className="flex items-center justify-center gap-2 text-red-700 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="outline" type="button" onClick={loadPublished}>
              {isRoman ? 'Dobara Koshish Karein' : 'Retry'}
            </Button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center max-w-md mx-auto my-6 text-slate-600 text-xs sm:text-sm">
            <p className="font-semibold">
              {isRoman ? 'Filhal koi featured courses dastiyab nahi hain.' : 'No featured courses are available right now.'}
            </p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onSelectCourse={(c) => setSelectedCourse(c)}
                featuredHighlight
                hideDuration
              />
            ))}
          </div>
        )}

        {/* Action: Baqi Courses Dekhein / See Remaining Courses */}
        <div className="mt-12 text-center pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs sm:text-sm text-[#0F1F5C]/80 font-medium">
            {isRoman
              ? 'Hamare pas mukammal technical aur business courses dastiyab hain.'
              : 'Explore our full catalogue of commercial and technical programs.'}
          </p>

          <Link to="/courses">
            <Button
              variant="primary"
              size="md"
              leftIcon={<BookOpen className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isRoman ? 'Tamam Courses Dekhein' : 'View All Courses'}
            </Button>
          </Link>
        </div>

        {/* Course Details Modal */}
        <CourseModal
          course={selectedCourse}
          isOpen={Boolean(selectedCourse)}
          onClose={() => setSelectedCourse(null)}
        />
      </Container>
    </Section>
  );
};
