import React, { useState, useEffect } from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { SiteSettingsPublic } from '../../types';
import {
  Laptop,
  Coins,
  Award,
  Users2,
  FileCheck2,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';

export const WhyChooseSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
      } catch (err) {
        console.warn('Could not load site settings for WhyChooseSection:', err);
      }
    }
    loadSettings();
  }, []);

  const pillars = [
    {
      icon: Laptop,
      title: isRoman ? 'Computer Lab Workstations' : 'Computer Lab Workstations',
      description: isRoman
        ? 'Agar aapke paas apna computer ya laptop nahi hai, toh academy lab mein machines dastiyab hain taake aapki practice na ruke.'
        : 'Dedicated computer lab machines available during batch hours for students without personal laptops.',
    },
    {
      icon: Coins,
      title: isRoman ? 'Rs. 0 Dakhla Fees (Zero Admission Fee)' : 'Zero Admission Fee',
      description: isRoman
        ? `Physical package mein dakhla bilkul muft hai. Sirf mahana Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} lab charges ada karein aur tamam ${siteConfig.physicalPackage.courseCount} courses seekhein (kul chhe mah ka package Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}).`
        : `No hidden charges or admission fees. Straightforward Rs. ${siteConfig.physicalPackage.monthlyFee.toLocaleString()} monthly lab charges for the entire 6-month package covering all ${siteConfig.physicalPackage.courseCount} courses (total Rs. ${siteConfig.physicalPackage.totalPackage.toLocaleString()}). Classes run ${siteConfig.physicalPackage.schedule}.`,
    },
    {
      icon: Award,
      title: isRoman ? '70% Quality Pass Threshold' : '70% Rigorous Quality Bar',
      description: isRoman
        ? 'Hamari sanad (certificate) ki qadar hai kyunki har student ka weekly aur final test 70% passing standard par hota hai.'
        : 'Our credentials maintain credibility because every candidate must achieve at least 70% in assessments to qualify.',
    },
    {
      icon: Users2,
      title: isRoman ? 'Alag Alag Makhsoos Batches' : 'Separate Dedicated Batches',
      description: isRoman
        ? 'Khawateen aur nojawano ke liye purnoor aur pur-aman mahol mein alag alag regular batch timings.'
        : 'Organized and respectful batch scheduling with 2 separate time slots for female students and 2 for male students.',
    },
    {
      icon: FileCheck2,
      title: isRoman ? 'Weekly Written o Practical Tests' : 'Weekly Practical Testing',
      description: isRoman
        ? 'Har hafte theory aur practical testing hoti hai taake talib e ilm apni kamzoriyon ko door karke behtar ban sake.'
        : 'Continuous weekly evaluations and supervised practical tests to ensure genuine hands-on retention.',
    },
    {
      icon: ShieldCheck,
      title: isRoman ? 'QR-Verified Certificate' : 'Publicly Verifiable Credentials',
      description: isRoman
        ? 'Takmeel par unique verification code aur token wali sanad jo kisi bhi waqt online verify ki ja sakti hai.'
        : 'Graduates receive verifiable digital and print certificates carrying unique QR security tokens for employer verification.',
    },
  ];

  return (
    <Section variant="light" spacing="lg">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Hamari Khususiyat' : 'Why Choose Us'}
          title={isRoman ? 'The Inspire Business Academy Kiun Chunein?' : 'Why Train with The Inspire Business Academy'}
          description={
            isRoman
              ? 'Sanad ke sath sath asali hunar seekhein jo market mein qabil-e-amal aur munafabakhsh ho.'
              : 'Our verified operational commitments ensuring practical learning, accessible facilities, and high standards.'
          }
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((item, idx) => {
            const IconComponent = item.icon;
            const gradients = [
              'from-[#1F3FBF]/20 via-[#1F3FBF]/10 to-transparent text-[#1F3FBF]',
              'from-[#FFC20E]/30 via-[#FFC20E]/15 to-transparent text-[#0F1F5C]',
              'from-[#0F1F5C]/20 via-[#0F1F5C]/10 to-transparent text-[#0F1F5C]',
              'from-emerald-500/20 via-emerald-500/10 to-transparent text-emerald-700',
              'from-indigo-500/20 via-indigo-500/10 to-transparent text-indigo-700',
              'from-amber-500/20 via-amber-500/10 to-transparent text-amber-700',
            ];
            const gradientStyle = gradients[idx % gradients.length];

            const rawImg = Array.isArray(settings?.whyChooseImages) ? settings.whyChooseImages[idx] : undefined;
            const cardImage = typeof rawImg === 'string' && rawImg.trim().length > 0 ? rawImg.trim() : null;

            return (
              <Card key={idx} hoverable className="bg-white border border-[#1F3FBF]/15 overflow-hidden flex flex-col justify-between">
                <div>
                  {cardImage ? (
                    <div className="w-full h-36 bg-slate-100 overflow-hidden border-b border-slate-100">
                      <img
                        src={cardImage}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) parent.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}

                  <CardHeader className="pt-5 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#F2F5FF] text-[#1F3FBF] flex items-center justify-center shrink-0 border border-[#1F3FBF]/15">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-base sm:text-lg">
                        {item.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed pt-0 pb-5">
                    {item.description}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </Section>
  );
};
