import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  // Base classes with accessible focus ring and smooth transition
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none active:scale-[0.99]';

  // Variant classes adhering strictly to official academy tokens
  const variantClasses = {
    // Primary: Royal Blue background, white text
    primary:
      'bg-[#1F3FBF] text-white hover:bg-[#18339E] focus-visible:ring-[#1F3FBF] border border-transparent shadow-xs',
    // Secondary: Light blue background, Deep Navy text
    secondary:
      'bg-[#F2F5FF] text-[#0F1F5C] hover:bg-[#E2E8FF] focus-visible:ring-[#1F3FBF] border border-[#1F3FBF]/20',
    // Accent: Yellow background, Deep Navy text (Primary conversion CTA)
    accent:
      'bg-[#FFC20E] text-[#0F1F5C] font-bold hover:bg-[#E5AD07] focus-visible:ring-[#0F1F5C] border border-black/10 shadow-xs',
    // Outline: Transparent background, Royal Blue border
    outline:
      'bg-transparent text-[#1F3FBF] border-1.5 border-[#1F3FBF] hover:bg-[#1F3FBF] hover:text-white focus-visible:ring-[#1F3FBF]',
    // Ghost: Transparent background, subtle hover
    ghost:
      'bg-transparent text-[#0F1F5C] hover:bg-[#F2F5FF] hover:text-[#1F3FBF] focus-visible:ring-[#1F3FBF]',
    // Danger: Red for destructive actions
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 border border-transparent shadow-xs',
    // Navy: Deep Navy background, white text
    navy:
      'bg-[#0F1F5C] text-white hover:bg-[#18339E] focus-visible:ring-[#0F1F5C] border border-transparent shadow-xs',
  };

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
