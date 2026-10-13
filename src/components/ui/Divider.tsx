import React from 'react';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className = '',
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`inline-block w-px self-stretch bg-[#1F3FBF]/15 ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={`relative flex items-center w-full my-4 ${className}`}
      >
        <div className="grow border-t border-[#1F3FBF]/15" />
        <span className="shrink-0 px-3 text-xs font-semibold text-[#0F1F5C]/60 uppercase tracking-wider">
          {label}
        </span>
        <div className="grow border-t border-[#1F3FBF]/15" />
      </div>
    );
  }

  return (
    <hr
      className={`border-0 border-t border-[#1F3FBF]/15 my-4 w-full ${className}`}
      aria-hidden="true"
    />
  );
};
