import React from 'react';
import { useTranslation } from '../../i18n';
import { PlaceholderPage } from './PlaceholderPage';

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderPage
      title={t.placeholders.termsTitle}
      description={t.placeholders.termsDesc}
      eyebrow="Policy"
      targetPhase="Phase 3 (Legal Pages)"
    />
  );
};
