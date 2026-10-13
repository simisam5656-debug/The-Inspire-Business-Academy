import React from 'react';
import { SEO } from '../../components/common/SEO';
import { HeroSection } from '../../components/home/HeroSection';
import { AcademyIntroSection } from '../../components/home/AcademyIntroSection';
import { IntroVideoSection } from '../../components/home/IntroVideoSection';
import { LearningOptionsSection } from '../../components/home/LearningOptionsSection';
import { FeaturedCoursesSection } from '../../components/home/FeaturedCoursesSection';
import { WhyChooseSection } from '../../components/home/WhyChooseSection';
import { PhysicalAcademySection } from '../../components/home/PhysicalAcademySection';
import { TestimonialsSection } from '../../components/home/TestimonialsSection';
import { CTASection } from '../../components/home/CTASection';
import { ContactPreviewSection } from '../../components/home/ContactPreviewSection';
import { Section } from '../../components/ui/Section';
import { Container } from '../../components/ui/Container';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { FAQAccordion } from '../../components/faq/FAQAccordion';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';

export const HomePage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Home - Physical Academy o Online LMS' : 'Home - Physical Academy & Online LMS'}
        description={
          isRoman
            ? 'The Inspire Business Academy Sadiqabad. Hunarmand Pakistan mission ke tehat physical lab training aur online recorded courses.'
            : 'The Inspire Business Academy in Sadiqabad, Punjab. Hands-on physical computer lab batches and recorded online courses under the Hunarmand Pakistan mission.'
        }
        canonicalPath="/"
      />

      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Academy Introduction */}
      <AcademyIntroSection />

      {/* 2.5 Intro Video Tour (Section 2.4) */}
      <IntroVideoSection />

      {/* 3. Learning Options (Physical vs Online) */}
      <LearningOptionsSection />

      {/* 4. Featured Courses (YouTube Monetization, AI Web Development, Graphic Designing) */}
      <FeaturedCoursesSection />

      {/* 5. Why Choose The Inspire Business Academy */}
      <WhyChooseSection />

      {/* 6. Physical Academy Sadiqabad Campus & Batches */}
      <PhysicalAcademySection />

      {/* 6.5 Verified Student Testimonials (Phase 10 CMS) */}
      <TestimonialsSection />

      {/* 7. Frequently Asked Questions */}
      <Section variant="light" spacing="lg" id="faq">
        <Container size="md">
          <SectionHeading
            eyebrow={isRoman ? 'Aam Sawalat' : 'Frequently Asked Questions'}
            title={isRoman ? 'Aksar Pooche Gaye Sawalat' : 'Answers to Common Questions'}
            description={
              isRoman
                ? 'Dakhla, computer lab, fees aur certificates ke hawale se wazeh maloomat.'
                : 'Verified details regarding our admissions, computer lab facilities, fees, and certified examinations.'
            }
            align="center"
          />

          <FAQAccordion showCategoryFilters limit={6} />
        </Container>
      </Section>

      {/* 8. Call To Action Section */}
      <CTASection />

      {/* 9. Contact Preview */}
      <ContactPreviewSection />
    </div>
  );
};
