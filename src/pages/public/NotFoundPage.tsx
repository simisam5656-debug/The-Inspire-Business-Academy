import React from 'react';
import { useTranslation } from '../../i18n';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Button } from '../../components/ui/Button';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Section variant="light" spacing="xl">
      <Container size="sm" className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-10 h-10" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-[#0F1F5C] tracking-tight">
          {t.placeholders.notFoundTitle}
        </h1>

        <p className="mt-3 text-sm sm:text-base text-[#0F1F5C]/75 leading-relaxed max-w-md mx-auto">
          {t.placeholders.notFoundDesc}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
              {t.common.backToHome}
            </Button>
          </Link>
          <Link to="/courses">
            <Button variant="outline" size="md">
              {t.nav.courses}
            </Button>
          </Link>
        </div>
      </Container>
    </Section>
  );
};
