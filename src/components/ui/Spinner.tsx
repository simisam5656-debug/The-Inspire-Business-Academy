import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white' | 'navy';
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  className = '',
}) => {
  const sizeClasses = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };

  const variantClasses = {
    primary: 'text-[#1F3FBF]',
    white: 'text-white',
    navy: 'text-[#0F1F5C]',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <Loader2
        className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};
