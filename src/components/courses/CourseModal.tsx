import React from 'react';
import { CourseData } from '../../config/courses';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n';
import { Clock, Laptop, CheckCircle2, Award, ArrowRight, ShieldCheck, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export interface CourseModalProps {
  course: CourseData | any | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  course,
  isOpen,
  onClose,
}) => {
  const { language, t } = useTranslation();
  if (!course) return null;

  const isRoman = language === 'roman-urdu';
  const title = isRoman ? course.titleRomanUrdu : course.title;
  const description = isRoman ? course.fullDescriptionRomanUrdu : course.fullDescription;
  const categoryLabel = isRoman ? course.categoryLabelRomanUrdu : course.categoryLabel;
  const outline = isRoman ? course.outlineRomanUrdu : course.outline;
  const delivery = isRoman ? course.deliveryRomanUrdu : course.delivery;

  const displayPrice = (course as any).onlinePrice !== undefined ? (course as any).onlinePrice : (course.price || 5000);
  const displayDuration = (course as any).onlineDurationMonths !== undefined ? (course as any).onlineDurationMonths : (course.durationMonths || (course as any).durationValue || 6);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`${categoryLabel} • ${displayDuration} ${isRoman ? 'Mah' : 'Months'}`}
      size="lg"
    >
      <div className="space-y-6 text-[#0F1F5C]">
        {/* Course Thumbnail Image if present */}
        {course.thumbnailUrl && (
          <div className="w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-xs">
            <img
              src={course.thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Course Description */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F3FBF] mb-1.5">
            {isRoman ? 'Course Ka Jaiza (Overview):' : 'Course Overview:'}
          </h4>
          <p className="text-xs sm:text-sm text-[#0F1F5C]/85 leading-relaxed bg-[#F2F5FF] p-4 rounded-xl border border-[#1F3FBF]/10">
            {description}
          </p>
        </div>

        {/* Key Parameters Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Online Fee:</span>
            <span className="text-sm font-extrabold text-[#1F3FBF]">Rs. {displayPrice.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Access:</span>
            <span className="text-sm font-bold text-[#0F1F5C]">{displayDuration} {isRoman ? 'Mah' : 'Months'}</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Delivery:</span>
            <span className="text-xs font-bold text-[#0F1F5C] truncate block">{delivery}</span>
          </div>

          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Exam Pass:</span>
            <span className="text-sm font-bold text-emerald-700">70% Required</span>
          </div>
        </div>

        {/* Detailed Module Outline */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#1F3FBF] mb-2.5">
            {isRoman ? 'Mukammal Nisab o Mozuaat (Syllabus):' : 'Complete Curriculum Modules:'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(outline || []).map((item: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200 text-xs"
              >
                <div className="w-5 h-5 rounded-full bg-[#1F3FBF]/10 text-[#1F3FBF] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <span className="text-[#0F1F5C]/90 font-medium leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verification & Credential Notice */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
          <Award className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isRoman
              ? 'Course mukammal karne aur 70% passing threshold hasil karne par The Inspire Business Academy ki janib se QR-verified sanad (certificate) jari ki jaati hai.'
              : 'Upon course completion and passing the 70% threshold exam, a publicly verifiable QR-coded completion credential is issued by The Inspire Business Academy.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}?text=${encodeURIComponent(
              `Assalam o Alaikum! Mujhe The Inspire Business Academy ke course "${title}" ke bare mein maloomat chahiye.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button variant="outline" size="sm" fullWidth leftIcon={<Phone className="w-4 h-4 text-emerald-600" />}>
              WhatsApp par Rabta Karein
            </Button>
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t.common.close}
            </Button>
            <Link to="/join" onClick={onClose} className="w-full sm:w-auto">
              <Button variant="accent" size="sm" fullWidth rightIcon={<ArrowRight className="w-4 h-4" />}>
                {t.nav.join}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
};
