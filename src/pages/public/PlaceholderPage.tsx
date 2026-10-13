import React from 'react';
import { useTranslation } from '../../i18n';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Clock, Phone, Sparkles, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  eyebrow?: string;
  targetPhase?: string;
  children?: React.ReactNode;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  eyebrow = 'Public Route Shell',
  targetPhase = 'Phase 3 (Public Website & Content)',
  children,
}) => {
  const { t } = useTranslation();

  return (
    <Section variant="light" spacing="lg">
      <Container size="md">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {t.common.backToHome}
          </Link>
        </div>

        <Card elevated bordered className="text-center p-6 sm:p-10">
          <div className="w-16 h-16 rounded-2xl bg-[#F2F5FF] text-[#1F3FBF] border border-[#1F3FBF]/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>

          <Badge variant="accent" size="sm" className="mb-3">
            {targetPhase}
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F1F5C] tracking-tight">
            {title}
          </h1>

          <p className="mt-3 text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed max-w-xl mx-auto">
            {description}
          </p>

          {children && <div className="mt-6 text-left">{children}</div>}

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
            <Link to="/">
              <Button variant="primary" size="sm" leftIcon={<Home className="w-4 h-4" />}>
                {t.common.backToHome}
              </Button>
            </Link>

            <a
              href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" leftIcon={<Phone className="w-4 h-4 text-emerald-600" />}>
                {t.common.contactWhatsApp}
              </Button>
            </a>
          </div>
        </Card>
      </Container>
    </Section>
  );
};
