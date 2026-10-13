import React from 'react';
import { CourseData } from '../../config/courses';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n';
import { Clock, Laptop, CheckCircle2, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CourseCardProps {
  course: CourseData | any;
  onSelectCourse?: (course: CourseData | any) => void;
  featuredHighlight?: boolean;
  hideDuration?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onSelectCourse,
  featuredHighlight = false,
  hideDuration = false,
}) => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const title = isRoman ? (course.titleRomanUrdu || course.title) : course.title;
  const description = isRoman
    ? (course.shortDescriptionRomanUrdu || course.shortDescription)
    : course.shortDescription;
  const categoryLabel = isRoman
    ? (course.categoryLabelRomanUrdu || course.categoryLabel || course.category)
    : (course.categoryLabel || course.category);
  const outline = isRoman
    ? (course.outlineRomanUrdu || course.outline || [])
    : (course.outline || []);
  const courseImage = course.imageUrl || course.image_url || course.thumbnailUrl;
  const isMostPopular = !!course.isMostPopular;

  return (
    <Card
      hoverable
      bordered
      elevated
      className={`flex flex-col h-full overflow-hidden transition-all duration-200 ${
        featuredHighlight ? 'border-2 border-[#1F3FBF]/30 shadow-md ring-1 ring-[#1F3FBF]/10' : ''
      }`}
    >
      {/* Course Thumbnail Image or Neat Graphic Placeholder */}
      <div className="w-full h-44 bg-gradient-to-br from-[#0F1F5C] to-[#1F3FBF] overflow-hidden relative group shrink-0">
        {courseImage ? (
          <img
            src={courseImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/80 p-4 text-center">
            <Laptop className="w-10 h-10 text-[#FFC20E] mb-2 opacity-80" />
            <span className="text-xs font-bold text-white/90 line-clamp-1">{categoryLabel}</span>
            <span className="text-[10px] text-white/60">The Inspire Business Academy</span>
          </div>
        )}

        {/* Most Popular Badge overlay */}
        {isMostPopular && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="inline-flex items-center gap-1 bg-[#FFC20E] text-[#0F1F5C] text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md border border-yellow-400">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Most Popular
            </span>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Badge variant="secondary" size="sm">
            {categoryLabel}
          </Badge>

          {course.isFeatured && (
            <Badge variant="accent" size="sm">
              <Sparkles className="w-3 h-3 text-[#0F1F5C]" />
              <span>{isRoman ? 'Khas Course' : 'Featured'}</span>
            </Badge>
          )}
        </div>

        <CardTitle className="text-lg sm:text-xl line-clamp-2 min-h-[3rem]">
          {title}
        </CardTitle>

        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pt-1">
        {/* Course Key Specs: hidden if hideDuration is requested (e.g. Featured courses section) */}
        {!hideDuration && (
          <div className="grid grid-cols-2 gap-2 text-xs text-[#0F1F5C]/80 py-2 border-y border-slate-100 bg-[#F2F5FF]/50 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-[#1F3FBF] shrink-0" />
              <span className="font-semibold">{course.durationMonths || course.durationValue || 6} {isRoman ? 'Mah' : 'Months'}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Laptop className="w-3.5 h-3.5 text-[#1F3FBF] shrink-0" />
              <span className="truncate">{isRoman ? 'Lab + Recorded' : 'Lab + Online'}</span>
            </div>
          </div>
        )}

        {/* Outline Highlights */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#0F1F5C]/60 mb-1.5">
            {isRoman ? 'Ahem Mozuaat (Outline):' : 'Key Modules Outline:'}
          </span>
          <ul className="space-y-1.5 text-xs text-[#0F1F5C]/85">
            {outline.slice(0, 3).map((item: string, idx: number) => (
              <li key={idx} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F3FBF] shrink-0 mt-0.5" />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 pt-3">
        <div>
          <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            {isRoman ? 'Course Fee' : 'Course Fee'}
          </span>
          <span className="text-base sm:text-lg font-black text-[#1F3FBF] font-display">
            Rs. {course.price.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onSelectCourse && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectCourse(course)}
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              {isRoman ? 'Tafseelat' : 'Details'}
            </Button>
          )}

          <Link to="/join">
            <Button variant="accent" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {t.nav.join}
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
