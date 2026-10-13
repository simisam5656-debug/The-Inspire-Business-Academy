import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-[#1F3FBF] text-white hover:bg-[#18339E] focus-visible:ring-[#1F3FBF]',
    secondary: 'bg-[#F2F5FF] text-[#0F1F5C] hover:bg-[#E2E8FF] focus-visible:ring-[#1F3FBF]',
    accent: 'bg-[#FFC20E] text-[#0F1F5C] hover:bg-[#E5AD07] focus-visible:ring-[#0F1F5C]',
    ghost: 'bg-transparent text-[#0F1F5C] hover:bg-[#F2F5FF] hover:text-[#1F3FBF] focus-visible:ring-[#1F3FBF]',
    outline: 'bg-transparent border border-slate-300 text-[#0F1F5C] hover:bg-[#F2F5FF] hover:border-[#1F3FBF] focus-visible:ring-[#1F3FBF]',
  };

  const sizeClasses = {
    sm: 'w-7 h-7 p-1 text-xs',
    md: 'w-9 h-9 p-2 text-sm',
    lg: 'w-11 h-11 p-2.5 text-base',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
