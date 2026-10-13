import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'navy'
    | 'neutral'
    | 'success'
    | 'warning'
    | 'danger';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const variantClasses = {
    // Primary: Royal Blue
    primary: 'bg-[#1F3FBF]/10 text-[#1F3FBF] border-[#1F3FBF]/25',
    // Secondary: Light Blue
    secondary: 'bg-[#F2F5FF] text-[#0F1F5C] border-[#1F3FBF]/20',
    // Accent: Yellow (Highlight)
    accent: 'bg-[#FFC20E]/20 text-[#8C6B00] border-[#FFC20E]/40 font-bold',
    // Navy: Deep Navy
    navy: 'bg-[#0F1F5C] text-white border-transparent font-medium',
    // Neutral: Slate
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    // Success: Verified/Approved
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    // Warning: Pending/Review
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    // Danger: Rejected/Revoked
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
