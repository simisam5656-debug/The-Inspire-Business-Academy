import React from 'react';
import { useTranslation } from '../../i18n';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message, className = '' }) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="w-10 h-10 border-4 border-[#1F3FBF]/20 border-t-[#1F3FBF] rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-[#0F1F5C]/80">
        {message || t.common.loading}
      </p>
    </div>
  );
};
