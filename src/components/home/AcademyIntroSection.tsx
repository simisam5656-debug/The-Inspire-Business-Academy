import React, { useState, useEffect } from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { SiteSettingsPublic } from '../../types';
import { User, Award, ShieldCheck, Target, HeartHandshake, Sparkles } from 'lucide-react';

export const AcademyIntroSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
      } catch (err) {
        console.warn('Failed to load settings in AcademyIntroSection:', err);
      }
    }
    loadData();
  }, []);

  const founderName = settings?.founderName || 'Adeel Bhatti';
  const founderImage = settings?.founderImageUrl;
  const leftImage = settings?.aboutLeftImageUrl;
  const rightImage = settings?.aboutRightImageUrl;

  return (
    <Section variant="white" spacing="lg">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Academy Ka Ta’aruf' : 'About The Academy'}
          title={isRoman ? 'Hunar Aur Mustaqbil Ka Behtareen Sangam' : 'Empowering Skills for a Self-Reliant Pakistan'}
          description={
            isRoman
              ? 'The Inspire Business Academy Sadiqabad mein nojawano ko aisi digital aur practical maharatein sikhata hai jin se woh apna online karobar shuru kar sakein.'
              : 'The Inspire Business Academy provides dedicated commercial training in Sadiqabad, focusing on practical freelancing, e-commerce, media, and digital skills.'
          }
          align="center"
        />

        {/* 3 Blocks Grid: Left = Class Image, Center = Adeel Bhatti, Right = Class Image */}
        {/* On mobile: Stacks with Adeel Bhatti (order-1) first, left image (order-2), right image (order-3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Left Block: Academy Class Image */}
          <div className="order-2 md:order-1 flex flex-col">
            <Card hoverable className="border-t-4 border-t-[#1F3FBF] h-full overflow-hidden flex flex-col justify-between">
              {leftImage ? (
                <div className="w-full h-48 overflow-hidden bg-slate-100">
                  <img
                    src={leftImage}
                    alt="Academy Classroom Session"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) parent.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-base sm:text-lg">
                  {isRoman ? 'Mission: Hunarmand Pakistan' : 'Mission: Hunarmand Pakistan'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed pb-4">
                {isRoman
                  ? 'Har nojawan ko practical hunar faraham karna taake woh berozgari se nikal kar khud-mukhtar ban sake.'
                  : 'Equipping every student with real marketable digital skills that open immediate doors to freelance projects and independent careers.'}
              </CardContent>
            </Card>
          </div>

          {/* Center Block: Adeel Bhatti (Founder) */}
          <div className="order-1 md:order-2 flex flex-col">
            <Card hoverable elevated className="border-t-4 border-t-[#FFC20E] border-2 border-[#FFC20E]/30 h-full overflow-hidden flex flex-col justify-between bg-white shadow-md">
              <div className="pt-6 pb-2 px-6 text-center bg-gradient-to-b from-[#FFC20E]/10 to-transparent">
                {founderImage ? (
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden border-4 border-[#FFC20E] shadow-sm mb-3 bg-slate-100">
                    <img
                      src={founderImage}
                      alt={founderName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) parent.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
                <h3 className="text-lg font-black text-[#0F1F5C] font-display">
                  {founderName}
                </h3>
                <span className="inline-block text-xs font-bold text-[#1F3FBF] uppercase tracking-wider mt-0.5">
                  {isRoman ? 'Founder & Lead Mentor' : 'Founder & Lead Mentor'}
                </span>
              </div>
              <CardContent className="text-xs sm:text-sm text-[#0F1F5C]/85 leading-relaxed text-center px-6 pb-6">
                {isRoman
                  ? 'Academy ke sarbarah Adeel Bhatti ki zaati rahnumai mein practical aur real-world projects par tawajjo di jaati hai taake tulba sirf theory nahi balkay kaam seekhein.'
                  : 'Under the personal mentorship of founder Adeel Bhatti, curriculum delivery emphasizes practical exercises, direct feedback, and client-ready digital portfolios.'}
              </CardContent>
            </Card>
          </div>

          {/* Right Block: Class Image / 70% Quality Standard */}
          <div className="order-3 md:order-3 flex flex-col">
            <Card hoverable className="border-t-4 border-t-[#0F1F5C] h-full overflow-hidden flex flex-col justify-between">
              {rightImage ? (
                <div className="w-full h-48 overflow-hidden bg-slate-100">
                  <img
                    src={rightImage}
                    alt="Campus Computer Lab Training"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) parent.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              <CardHeader className="pt-4 pb-2">
                <CardTitle className="text-base sm:text-lg">
                  {isRoman ? '70% Quality Standard' : '70% Quality Standard'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed pb-4">
                {isRoman
                  ? 'Sanad baghair mehnat ke nahi milti. Har student ko final written aur practical imtehan mein kam az kam 70% marks hasil karna lazmi hota hai.'
                  : 'Credentials are earned through rigorous performance. Every graduate must achieve at least 70% in assessments to qualify for graduation.'}
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  );
};
