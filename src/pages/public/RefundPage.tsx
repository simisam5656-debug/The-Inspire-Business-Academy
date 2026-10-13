import React from 'react';
import { useTranslation } from '../../i18n';
import { PlaceholderPage } from './PlaceholderPage';

export const RefundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PlaceholderPage
      title={t.placeholders.refundTitle}
      description={t.placeholders.refundDesc}
      eyebrow="Policy"
      targetPhase="Phase 3 (Legal Pages)"
    />
  );
};
