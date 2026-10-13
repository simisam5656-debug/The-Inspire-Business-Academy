import React, { useId } from 'react';
import { Label } from './Label';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      required,
      disabled,
      className = '',
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperId = helperText ? `${textareaId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={textareaId} required={required}>
            {label}
          </Label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperId}
          className={`w-full rounded-lg text-xs sm:text-sm bg-white border p-3 transition-colors duration-150 ${
            error
              ? 'border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600'
              : 'border-slate-300 text-[#0F1F5C] focus:border-[#1F3FBF] focus:ring-2 focus:ring-[#1F3FBF]/20'
          } disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder:text-slate-400 ${className}`}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
