import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { CmsService } from '../../services/cmsService';
import { TestimonialRecord } from '../../types';
import { Section } from '../ui/Section';
import { Container } from '../ui/Container';
import { SectionHeading } from '../ui/SectionHeading';
import { Star, MessageSquareQuote, MapPin, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const TestimonialsSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const approved = await CmsService.getTestimonials(true);
        setTestimonials(approved);
      } catch (err) {
        console.warn('Failed to load testimonials:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!loading && testimonials.length === 0) {
    return null; // As requested: if no approved testimonials exist, cleanly hide section
  }

  return (
    <Section variant="light" spacing="lg" id="testimonials">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Tulba ke Tajurbat' : 'Student Success Stories'}
          title={isRoman ? 'Hamare Tulba Kya Kehte Hain' : 'Verified Reviews from Our Students'}
          description={
            isRoman
              ? 'Sadiqabad campus computer lab aur online recorded courses se seekhne wale nojawano ke khayalaat.'
              : 'Honest reviews and feedback from students trained in our hands-on computer lab batches and recorded courses.'
          }
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          {testimonials.slice(0, 3).map((item) => {
            const text = isRoman && item.testimonialTextRomanUrdu ? item.testimonialTextRomanUrdu : item.testimonialText;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#1F3FBF]/10 p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#0F1F5C]/85 leading-relaxed italic">
                    "{text}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.studentName}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1F3FBF] font-bold text-xs flex items-center justify-center">
                        {item.studentName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-[#0F1F5C]">{item.studentName}</h4>
                      <p className="text-[11px] text-slate-500">{item.studentCity || 'Sadiqabad'}</p>
                    </div>
                  </div>

                  {item.courseTitle && (
                    <Badge variant="primary" size="sm">
                      {item.courseTitle}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </Section>
  );
};
