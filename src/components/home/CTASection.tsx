import React from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { useSiteContact } from '../../hooks/useSiteContact';
import { Phone, ArrowRight, GraduationCap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CTASection: React.FC = () => {
  const contact = useSiteContact();
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  return (
    <Section variant="light" spacing="lg" className="border-t border-[#1F3FBF]/10">
      <Container size="md">
        <div className="bg-gradient-to-br from-[#0F1F5C] via-[#1F3FBF] to-[#0F1F5C] text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FFC20E]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#FFC20E]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-[#FFC20E]/20 text-[#FFC20E] text-xs font-bold uppercase tracking-wider border border-[#FFC20E]/30">
              {siteConfig.mission}
            </span>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-white tracking-tight leading-tight">
              {isRoman
                ? 'Apna Digital Safar Aaj Shuru Karein'
                : 'Start Your Professional Skills Journey Today'}
            </h2>

            <p className="text-xs sm:text-base text-white/85 leading-relaxed">
              {isRoman
                ? 'The Inspire Business Academy mein physical lab training ya online courses ke zariye apna mustaqbil sanwarein. Hamari team aapki rahnumai ke liye tayyar hai.'
                : 'Whether you prefer hands-on computer lab immersion in Sadiqabad or self-paced online learning, our team is ready to guide your enrollment.'}
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link to="/join">
                <Button variant="accent" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {isRoman ? 'Dakhla Ki Maloomat (Join)' : 'Explore Admissions'}
                </Button>
              </Link>

              <a
                href={`https://wa.me/${contact.waDigits}?text=${encodeURIComponent(
                  'Assalam o Alaikum! Mujhe The Inspire Business Academy mein dakhla ke bare mein rahnumai chahiye.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-[#0F1F5C]"
                  leftIcon={<Phone className="w-4 h-4 text-[#FFC20E]" />}
                >
                  WhatsApp: {contact.whatsapp}
                </Button>
              </a>
            </div>

            <p className="text-[11px] text-white/70 pt-2">
              {isRoman
                ? 'Monday ta Friday office timings mein foran response diya jata hai.'
                : 'Direct support available during campus operating hours (Monday - Friday).'}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
};
