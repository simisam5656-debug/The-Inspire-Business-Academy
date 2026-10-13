import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={`p-6 rounded-xl border border-red-200 bg-red-50/80 text-center max-w-md mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-red-900 mb-1">
        {title || t.common.error}
      </h3>
      <p className="text-sm text-red-700 mb-4 leading-relaxed">
        {message || 'A safe application error occurred. No sensitive details are exposed.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-outline text-xs !py-2 !px-4"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          {t.common.retry}
        </button>
      )}
    </div>
  );
};
