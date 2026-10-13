import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`block text-xs font-bold text-[#0F1F5C] mb-1.5 select-none ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
    </label>
  );
};
