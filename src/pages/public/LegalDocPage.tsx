import React from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { ShieldCheck } from 'lucide-react';

export interface LegalSection {
  titleEn: string;
  titleRoman: string;
  paragraphsEn?: string[];
  paragraphsRoman?: string[];
  bulletsEn?: string[];
  bulletsRoman?: string[];
}

interface LegalDocPageProps {
  titleEn: string;
  titleRoman: string;
  descriptionEn: string;
  descriptionRoman: string;
  canonicalPath: string;
  sections: LegalSection[];
}

export const LegalDocPage: React.FC<LegalDocPageProps> = ({
  titleEn,
  titleRoman,
  descriptionEn,
  descriptionRoman,
  canonicalPath,
  sections,
}) => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const waDigits = siteConfig.whatsapp.replace(/[^0-9]/g, '');
  const waIntl = waDigits.startsWith('0') ? `92${waDigits.slice(1)}` : waDigits;

  return (
    <div className="w-full">
      <SEO
        title={`${isRoman ? titleRoman : titleEn} - ${siteConfig.name}`}
        description={isRoman ? descriptionRoman : descriptionEn}
        canonicalPath={canonicalPath}
      />

      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="secondary" size="md">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1F3FBF]" />
              <span>{isRoman ? 'Qanooni o Policy Dastavez' : 'Official Policy Document'}</span>
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? titleRoman : titleEn}
            </h1>
            <p className="text-xs sm:text-sm text-[#0F1F5C]/75">
              {isRoman ? 'Aakhri Tarmeem: October 2026' : 'Last Updated: October 2026'} &bull; {siteConfig.name}
            </p>
          </div>
        </Container>
      </Section>

      <Section variant="white" spacing="lg">
        <Container size="md">
          <Card elevated bordered className="p-6 sm:p-10 space-y-8 text-xs sm:text-sm text-[#0F1F5C]/85 leading-relaxed">
            {sections.map((sec, i) => {
              const paragraphs = isRoman ? sec.paragraphsRoman : sec.paragraphsEn;
              const bullets = isRoman ? sec.bulletsRoman : sec.bulletsEn;
              return (
                <div key={i} className="space-y-2">
                  <h2 className="text-base sm:text-lg font-bold font-display text-[#0F1F5C]">
                    {i + 1}. {isRoman ? sec.titleRoman : sec.titleEn}
                  </h2>
                  {paragraphs?.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                  {bullets && bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
                      {bullets.map((b, j) => (
                        <li key={j}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-slate-500 font-semibold">
                Sadiqabad Campus &bull; Phone: {siteConfig.phone}
              </span>
              <a
                href={`https://wa.me/${waIntl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#1F3FBF] hover:underline"
              >
                {isRoman ? 'WhatsApp par rabta karein' : 'Contact us on WhatsApp'} &rarr;
              </a>
            </div>
          </Card>
        </Container>
      </Section>
    </div>
  );
};
