import React from 'react';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'light' | 'white' | 'navy' | 'transparent';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  id?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  variant = 'light',
  spacing = 'lg',
  className = '',
  ...props
}) => {
  const variantClasses = {
    light: 'bg-[#F2F5FF] text-[#0F1F5C]',
    white: 'bg-white text-[#0F1F5C] border-y border-[#1F3FBF]/10',
    navy: 'bg-[#0F1F5C] text-white',
    transparent: 'bg-transparent text-[#0F1F5C]',
  };

  const spacingClasses = {
    none: 'py-0',
    sm: 'py-6 sm:py-8',
    md: 'py-10 sm:py-14',
    lg: 'py-14 sm:py-20',
    xl: 'py-20 sm:py-28',
  };

  return (
    <section
      className={`relative w-full ${variantClasses[variant]} ${spacingClasses[spacing]} ${className}`}
      {...props}
    >
      {children}
    </section>
  );
};
