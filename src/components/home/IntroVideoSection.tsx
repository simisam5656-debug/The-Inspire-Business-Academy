import React, { useState, useEffect } from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../i18n';
import { CmsService } from '../../services/cmsService';
import { getSafeYouTubeEmbedUrl } from '../../utils/url';
import { Youtube, Sparkles, MonitorPlay } from 'lucide-react';

export const IntroVideoSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadVideo() {
      try {
        const s = await CmsService.getSiteSettings();
        if (s?.introVideoUrl) {
          const safeEmbed = getSafeYouTubeEmbedUrl(s.introVideoUrl);
          setVideoUrl(safeEmbed);
        }
      } catch (err) {
        console.warn('Failed to load intro video in IntroVideoSection:', err);
      }
    }
    loadVideo();
  }, []);

  // Section 2.4: Cleanly hide the entire section if no valid URL is set
  if (!videoUrl) {
    return null;
  }

  return (
    <Section variant="light" spacing="lg" className="border-b border-[#1F3FBF]/10">
      <Container size="lg">
        {/* Desktop Layout: Video center with short text on left and right */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-center">
          {/* Left Text Column */}
          <div className="col-span-3 space-y-4 text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1F3FBF]/10 text-[#1F3FBF] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Campus Ta’aruf' : 'Campus Tour'}</span>
            </div>
            <h3 className="text-xl font-black text-[#0F1F5C] font-display">
              {isRoman ? 'Academy Ka Amli Jaiza' : 'Experience Our Campus'}
            </h3>
            <p className="text-xs text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Dekhein kis tarah Sadiqabad campus par tulba rozana computer lab mein digital skills ki practical practice karte hain.'
                : 'Watch how our students master digital skills daily with dedicated workstations and mentor guidance.'}
            </p>
          </div>

          {/* Center Video Player (6 cols) */}
          <div className="col-span-6">
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-slate-900">
              <iframe
                src={videoUrl}
                title="The Inspire Business Academy Overview"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>
          </div>

          {/* Right Text Column */}
          <div className="col-span-3 space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFC20E]/20 text-[#0F1F5C] text-xs font-bold">
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Aala Quality' : 'High Quality'}</span>
            </div>
            <h3 className="text-xl font-black text-[#0F1F5C] font-display">
              {isRoman ? 'Hunar Se Mustaqbil' : 'Skills for Tomorrow'}
            </h3>
            <p className="text-xs text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Adeel Bhatti aur team ki sarbarahi mein real-world projects aur client deliverables par kaam karein.'
                : 'Develop real portfolios and client-ready competency under the guidance of our experienced instructors.'}
            </p>
          </div>
        </div>

        {/* Mobile & Tablet Layout: Short heading above, video in center, short line below */}
        <div className="block lg:hidden space-y-4 max-w-xl mx-auto text-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F3FBF] block mb-1">
              {isRoman ? 'Video Ta’aruf' : 'Video Overview'}
            </span>
            <h3 className="text-xl font-black text-[#0F1F5C] font-display">
              {isRoman ? 'The Inspire Business Academy Video Tour' : 'The Inspire Business Academy Video Tour'}
            </h3>
          </div>

          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 bg-slate-900">
            <iframe
              src={videoUrl}
              title="The Inspire Business Academy Overview"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          <p className="text-xs text-[#0F1F5C]/80 leading-relaxed px-2">
            {isRoman
              ? 'Sadiqabad campus computer lab aur physical classroom ki ek jhalak.'
              : 'A quick tour of our computer lab workstations and physical classrooms in Sadiqabad.'}
          </p>
        </div>
      </Container>
    </Section>
  );
};
