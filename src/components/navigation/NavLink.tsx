import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isMobile?: boolean;
}

export const NavLink: React.FC<NavLinkProps> = ({
  to,
  children,
  className = '',
  onClick,
  isMobile = false,
}) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  if (isMobile) {
    return (
      <Link
        to={to}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl transition-colors duration-150 ${
          isActive
            ? 'bg-[#1F3FBF] text-white shadow-xs font-bold'
            : 'text-[#0F1F5C] hover:bg-[#F2F5FF] hover:text-[#1F3FBF]'
        } ${className}`}
      >
        <span>{children}</span>
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-[#FFC20E]" aria-hidden="true" />
        )}
      </Link>
    );
  }

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`relative px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3FBF] ${
        isActive
          ? 'text-[#1F3FBF] bg-[#F2F5FF] font-bold'
          : 'text-[#0F1F5C]/80 hover:text-[#1F3FBF] hover:bg-[#F2F5FF]/60'
      } ${className}`}
    >
      <span>{children}</span>
      {isActive && (
        <span
          className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#1F3FBF] rounded-full"
          aria-hidden="true"
        />
      )}
    </Link>
  );
};
