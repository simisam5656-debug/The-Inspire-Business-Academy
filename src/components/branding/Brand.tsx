import React from 'react';
import { Link } from 'react-router-dom';
import { siteConfig } from '../../config/site';

export interface BrandProps {
  size?: 'sm' | 'md' | 'lg';
  inverted?: boolean; // For dark backgrounds
  withLink?: boolean;
  className?: string;
  logoUrl?: string;
  name?: string;
}

export const Brand: React.FC<BrandProps> = ({
  size = 'md',
  inverted = false,
  withLink = true,
  className = '',
  logoUrl,
  name = siteConfig.name,
}) => {
  const badgeSizes = {
    sm: 'w-8 h-8 text-sm rounded-lg',
    md: 'w-10 h-10 text-base rounded-xl',
    lg: 'w-12 h-12 text-lg rounded-2xl',
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base font-extrabold',
    lg: 'text-xl font-black',
  };

  const tagSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-xs',
  };

  const titleColor = inverted ? 'text-white' : 'text-[#0F1F5C]';
  const tagColor = inverted ? 'text-[#FFC20E]' : 'text-[#1F3FBF]';
  const badgeBg = inverted
    ? 'bg-[#FFC20E] text-[#0F1F5C]'
    : 'bg-[#1F3FBF] text-[#FFC20E]';

  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Academy Logo image or Visual Monogram Badge */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={`${badgeSizes[size]} object-contain rounded-lg shrink-0 shadow-xs border border-slate-200/50 bg-white`}
          onError={(e) => {
            // If logo fails loading, hide and fallback gracefully
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${badgeSizes[size]} ${badgeBg} font-black font-display flex items-center justify-center shrink-0 shadow-xs tracking-tighter`}
          aria-hidden="true"
        >
          {siteConfig.shortName}
        </div>
      )}

      {/* Brand Name & Mission */}
      <div className="flex flex-col">
        <span
          className={`font-display tracking-tight leading-tight ${titleSizes[size]} ${titleColor}`}
        >
          {name}
        </span>
        <span className={`font-semibold tracking-wide ${tagSizes[size]} ${tagColor}`}>
          {siteConfig.mission} &bull; Sadiqabad
        </span>
      </div>
    </div>
  );

  if (withLink) {
    return (
      <Link to="/" className="inline-flex transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3FBF] rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
};
