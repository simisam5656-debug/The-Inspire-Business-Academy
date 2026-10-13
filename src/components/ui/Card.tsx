import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  bordered?: boolean;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  bordered = true,
  elevated = true,
  className = '',
  ...props
}) => {
  const baseClasses = 'bg-white rounded-xl overflow-hidden';
  const borderClass = bordered ? 'border border-[#1F3FBF]/15' : '';
  const shadowClass = elevated ? 'shadow-xs' : '';
  const hoverClass = hoverable
    ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-[#1F3FBF]/30'
    : '';

  return (
    <div
      className={`${baseClasses} ${borderClass} ${shadowClass} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 sm:p-6 pb-3 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3
    className={`text-lg sm:text-xl font-bold font-display text-[#0F1F5C] tracking-tight leading-snug ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-[#0F1F5C]/75 mt-1.5 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 sm:p-6 pt-2 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`p-5 sm:p-6 pt-3 border-t border-[#1F3FBF]/10 bg-[#F2F5FF]/50 flex items-center justify-between gap-3 text-xs ${className}`}
    {...props}
  >
    {children}
  </div>
);
