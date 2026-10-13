import React, { useId } from 'react';
import { Label } from './Label';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      required,
      disabled,
      className = '',
      type = 'text',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}

        <div className="relative rounded-lg shadow-2xs">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1F3FBF]/60">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperId}
            className={`w-full rounded-lg text-xs sm:text-sm bg-white border transition-colors duration-150 py-2.5 ${
              leftIcon ? 'pl-9' : 'pl-3.5'
            } ${rightIcon ? 'pr-9' : 'pr-3.5'} ${
              error
                ? 'border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                : 'border-slate-300 text-[#0F1F5C] focus:border-[#1F3FBF] focus:ring-2 focus:ring-[#1F3FBF]/20'
            } disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder:text-slate-400 ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-600 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-xs text-slate-500 leading-normal">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
