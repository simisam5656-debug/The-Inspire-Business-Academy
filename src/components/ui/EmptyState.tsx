import React from 'react';
import { Inbox } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`p-8 rounded-xl border border-dashed border-[#1F3FBF]/20 bg-white/60 text-center max-w-md mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#F2F5FF] text-[#1F3FBF] flex items-center justify-center mx-auto mb-3">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-[#0F1F5C] mb-1">
        {title || t.common.empty}
      </h3>
      {description && (
        <p className="text-sm text-[#0F1F5C]/70 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-primary text-xs !py-2 !px-4"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
