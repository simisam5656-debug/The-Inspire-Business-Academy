import React, { useId } from 'react';
import { Label } from './Label';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      label,
      options,
      helperText,
      error,
      placeholder,
      required,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperId = helperText ? `${selectId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <Label htmlFor={selectId} required={required}>
            {label}
          </Label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperId}
            className={`w-full rounded-lg text-xs sm:text-sm bg-white border py-2.5 px-3.5 pr-10 appearance-none transition-colors duration-150 cursor-pointer ${
              error
                ? 'border-red-500 text-red-900 focus:border-red-600 focus:ring-1 focus:ring-red-600'
                : 'border-slate-300 text-[#0F1F5C] focus:border-[#1F3FBF] focus:ring-2 focus:ring-[#1F3FBF]/20'
            } disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Accessible custom dropdown arrow */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
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

Select.displayName = 'Select';
