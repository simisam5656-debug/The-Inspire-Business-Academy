import React from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { useSiteContact } from '../../hooks/useSiteContact';
import { Clock, MapPin, Phone, Building2, Calendar, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PhysicalAcademySection: React.FC = () => {
  const contact = useSiteContact();
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  return (
    <Section variant="navy" spacing="lg" id="physical-academy">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Sadiqabad Campus' : 'Sadiqabad Campus'}
          title={isRoman ? 'Physical Academy Batches Aur Auqat' : 'Physical Academy Batches & Daily Schedule'}
          description={
            isRoman
              ? 'Sadiqabad campus par Monday ta Friday regular lab classes hoti hain. Girls aur boys ke liye makhsoos alag alag timings hain.'
              : 'Our physical campus in Sadiqabad operates Monday through Friday with separate, dedicated time slots for female and male batches.'
          }
          align="center"
          inverted
        />

        {/* Batches Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {siteConfig.batches.map((batch) => (
            <div
              key={batch.id}
              className="p-5 rounded-2xl bg-white/10 border border-white/15 text-white flex flex-col justify-between space-y-4 hover:border-[#FFC20E]/50 transition-colors"
            >
              <div>
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    batch.gender === 'girls'
                      ? 'bg-[#FFC20E] text-[#0F1F5C]'
                      : 'bg-[#1F3FBF] text-white border border-white/20'
                  }`}
                >
                  {batch.gender === 'girls'
                    ? isRoman
                      ? 'Khawateen Batch'
                      : 'Female Students'
                    : isRoman
                    ? 'Nojawan Batch'
                    : 'Male Students'}
                </span>

                <h3 className="text-lg font-bold font-display mt-2">{batch.name}</h3>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <Clock className="w-4 h-4 text-[#FFC20E] shrink-0" />
                  <span className="font-semibold">{batch.timing}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-white/70">
                  <Calendar className="w-3.5 h-3.5 text-white/50 shrink-0" />
                  <span>Monday &ndash; Friday</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Operational Highlights Card */}
        <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 text-white max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs sm:text-sm">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold text-white text-base flex items-center justify-center sm:justify-start gap-2">
              <MapPin className="w-4 h-4 text-[#FFC20E]" />
              <span>Location: {siteConfig.location}</span>
            </p>
            <p className="text-white/70">
              {isRoman
                ? 'Hafta aur Itwar chutti hai. Batches mein mehdood nishistain hain.'
                : 'Saturday & Sunday are off days. Batches maintain controlled seat capacity for individual attention.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/join/physical">
              <Button variant="accent" size="sm">
                {isRoman ? 'Dakhla Ki Maloomat' : 'Admission Details'}
              </Button>
            </Link>
            <a
              href={`https://wa.me/${contact.waDigits}?text=${encodeURIComponent(
                'Assalam o Alaikum! Mujhe physical academy batch timing aur dakhla ke bare mein maloomat chahiye.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="border-white text-white hover:bg-white hover:text-[#0F1F5C]">
                WhatsApp: {contact.whatsapp}
              </Button>
            </a>
          </div>
        </div>
      </Container>
    </Section>
  );
};
