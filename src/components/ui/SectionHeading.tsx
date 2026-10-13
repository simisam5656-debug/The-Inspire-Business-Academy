import React from 'react';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center' | 'right';
  action?: React.ReactNode;
  inverted?: boolean; // For dark/navy sections
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  description,
  align = 'center',
  action,
  inverted = false,
  className = '',
}) => {
  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center mx-auto',
    right: 'text-right items-end ml-auto',
  };

  const eyebrowColor = inverted
    ? 'bg-[#FFC20E]/20 text-[#FFC20E] border-[#FFC20E]/40'
    : 'bg-[#1F3FBF]/10 text-[#1F3FBF] border-[#1F3FBF]/20';

  const titleColor = inverted ? 'text-white' : 'text-[#0F1F5C]';
  const descColor = inverted ? 'text-white/80' : 'text-[#0F1F5C]/75';

  return (
    <div className={`flex flex-col max-w-3xl mb-8 sm:mb-12 ${alignClasses[align]} ${className}`}>
      {eyebrow && (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border mb-3 ${eyebrowColor}`}
        >
          {eyebrow}
        </span>
      )}

      <h2
        className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display tracking-tight leading-tight ${titleColor}`}
      >
        {title}
      </h2>

      {description && (
        <p className={`mt-3 text-sm sm:text-base leading-relaxed ${descColor}`}>
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
