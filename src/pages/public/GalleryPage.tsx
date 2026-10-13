import React from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Badge } from '../../components/ui/Badge';
import { GalleryGrid } from '../../components/gallery/GalleryGrid';
import { useTranslation } from '../../i18n';
import { Camera } from 'lucide-react';

export const GalleryPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Gallery - Sadiqabad Campus Media' : 'Gallery - Sadiqabad Campus Media'}
        description={
          isRoman
            ? 'The Inspire Business Academy Sadiqabad campus, computer lab aur student workshops ki tasweer aur media archive.'
            : 'Explore photos and facilities of The Inspire Business Academy campus, computer labs, and student testing workshops in Sadiqabad.'
        }
        canonicalPath="/gallery"
      />

      {/* Hero Header */}
      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="accent" size="md">
              <Camera className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Campus Media Archive' : 'Campus Media Archive'}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Academy Gallery' : 'Campus Gallery'}
            </h1>

            <p className="text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Sadiqabad campus computer lab, multimedia classrooms aur practical sessions ke azaim.'
                : 'A visual showcase of our Sadiqabad learning environment, computer lab stations, and student practical testing sessions.'}
            </p>
          </div>
        </Container>
      </Section>

      {/* Gallery Section */}
      <Section variant="white" spacing="lg">
        <Container size="lg">
          <GalleryGrid />
        </Container>
      </Section>
    </div>
  );
};
