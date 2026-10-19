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
import { Link } from 'react-router-dom';

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

      {/* Student offer poster: featured without changing the full course catalogue. */}
      <Section variant="light" spacing="lg" id="student-discount-package">
        <Container size="lg">
          <Link to="/join/online" aria-label="Enroll in the Student Discount Package">
            <img
              src="/images/student-discount-package.svg"
              alt="NEW OFFER: Student Discount Package. AI Earnings Course and AI Web & Android App Development, original Rs. 10,000, 60% off, now Rs. 4,000. Save Rs. 6,000."
              className="w-full h-auto rounded-2xl shadow-xl border border-[#F4B41A]/30"
              loading="lazy"
              width="1200"
              height="650"
            />
          </Link>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1F3FBF]/15 bg-white p-4">
              <h3 className="font-bold text-[#0F1F5C]">AI Earnings Course</h3>
              <p className="mt-1 text-sm text-slate-600">Individual fee: Rs. 5,000</p>
            </div>
            <div className="rounded-xl border border-[#1F3FBF]/15 bg-white p-4">
              <h3 className="font-bold text-[#0F1F5C]">AI Web &amp; Android App Development</h3>
              <p className="mt-1 text-sm text-slate-600">Individual fee: Rs. 5,000</p>
            </div>
          </div>
        </Container>
      </Section>

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
