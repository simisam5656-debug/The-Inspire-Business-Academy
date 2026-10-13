import React, { useEffect, useRef } from 'react';
import { X, Phone, ArrowRight, User, ShieldCheck } from 'lucide-react';
import { NavLink } from './NavLink';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { Brand } from '../branding/Brand';
import { Button } from '../ui/Button';
import { LanguageSelector } from '../ui/LanguageSelector';
import { IconButton } from '../ui/IconButton';
import { Link } from 'react-router-dom';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key and prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      className="fixed inset-0 z-50 lg:hidden flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F1F5C]/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-[#F2F5FF]">
          <Brand size="sm" withLink={false} />
          <IconButton
            aria-label={t.nav.closeMenu}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 hover:text-[#0F1F5C]"
          >
            <X className="w-5 h-5" />
          </IconButton>
        </div>

        {/* Language & Contact Row */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[#0F1F5C]/70 font-medium">{t.common.language}:</span>
          <LanguageSelector />
        </div>

        {/* Main Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5" aria-label="Mobile Navigation Menu">
          {siteConfig.mainNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              isMobile
              onClick={onClose}
            >
              {t.nav[item.labelKey]}
            </NavLink>
          ))}

          <div className="pt-3 border-t border-slate-100 my-2">
            <span className="block px-3 pb-2 text-[10px] font-bold text-[#0F1F5C]/60 uppercase tracking-wider">
              {t.nav.join}
            </span>
            <NavLink to="/join/physical" isMobile onClick={onClose}>
              {t.nav.joinPhysical}
            </NavLink>
            <NavLink to="/join/online" isMobile onClick={onClose}>
              {t.nav.joinOnline}
            </NavLink>
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100 bg-[#F2F5FF]/70 space-y-2.5">
          <Link to="/join" onClick={onClose} className="block w-full">
            <Button variant="accent" fullWidth size="md">
              <span>{t.nav.join}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/login" onClick={onClose}>
              <Button variant="secondary" fullWidth size="sm" leftIcon={<User className="w-3.5 h-3.5" />}>
                {t.nav.login}
              </Button>
            </Link>
            <Link to="/admin/login" onClick={onClose}>
              <Button variant="outline" fullWidth size="sm" leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}>
                {t.nav.adminLogin}
              </Button>
            </Link>
          </div>

          <a
            href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 pt-2 text-xs font-semibold text-[#1F3FBF] hover:underline"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp: {siteConfig.whatsapp}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
