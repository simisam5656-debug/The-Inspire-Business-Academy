import React, { useState, useEffect } from 'react';
import { Menu, Phone, User, ArrowRight, Shield, GraduationCap, LogOut, BellRing } from 'lucide-react';
import { Brand } from '../branding/Brand';
import { NavLink } from '../navigation/NavLink';
import { MobileNav } from '../navigation/MobileNav';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { LanguageSelector } from '../ui/LanguageSelector';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { NoticeRecord } from '../../types';

export const Header: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { user, profile, isStaff, isOnlineStudent, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeNotice, setActiveNotice] = useState<NoticeRecord | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function loadData() {
      try {
        const [notices, settings] = await Promise.all([
          CmsService.getNotices(true),
          CmsService.getSiteSettings(),
        ]);
        if (notices.length > 0) {
          // Sort by priority or displayOrder
          setActiveNotice(notices[0]);
        }
        if (settings?.logoUrl) {
          setLogoUrl(settings.logoUrl);
        }
      } catch (err) {
        console.warn('Failed to load published notice or settings:', err);
      }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.fullName
    ? profile.fullName.split(' ')[0]
    : user?.email?.split('@')[0] || 'Account';

  const noticeText = activeNotice
    ? isRoman && activeNotice.messageRomanUrdu
      ? activeNotice.messageRomanUrdu
      : activeNotice.message
    : t.shell.topNotice;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-xs border-b border-[#1F3FBF]/10">
        {/* Top Info Bar (Desktop & Tablet) */}
        <div className="bg-[#0F1F5C] text-white text-xs py-1.5 px-4 hidden sm:block border-b border-white/10">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 truncate text-white/85">
              <span className="font-semibold text-[#FFC20E] uppercase text-[10px] tracking-wider bg-white/10 px-2 py-0.5 rounded">
                Sadiqabad
              </span>
              {activeNotice?.linkUrl ? (
                <Link to={activeNotice.linkUrl} className="truncate hover:text-[#FFC20E] transition-colors flex items-center gap-1.5">
                  <span className="truncate">{noticeText}</span>
                  <ArrowRight className="w-3 h-3 text-[#FFC20E] shrink-0" />
                </Link>
              ) : (
                <span className="truncate">{noticeText}</span>
              )}
            </div>

            <div className="flex items-center gap-4 shrink-0 text-white/90">
              <a
                href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-[#FFC20E] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#FFC20E]" />
                <span className="font-semibold">WhatsApp: {siteConfig.whatsapp}</span>
              </a>
              <span className="text-white/30" aria-hidden="true">|</span>
              <LanguageSelector />
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-4">
          {/* Academy Brand Identity */}
          <Brand size="md" logoUrl={logoUrl} />

          {/* Desktop Navigation Links */}
          <nav
            aria-label="Desktop Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-2"
          >
            {siteConfig.mainNav.map((item) => (
              <NavLink key={item.path} to={item.path}>
                {t.nav[item.labelKey]}
              </NavLink>
            ))}
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden lg:flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2">
                {isStaff ? (
                  <Link to="/admin">
                    <Button
                      variant="navy"
                      size="sm"
                      leftIcon={<Shield className="w-3.5 h-3.5 text-[#FFC20E]" />}
                    >
                      Admin: {displayName}
                    </Button>
                  </Link>
                ) : (
                  <Link to="/student">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<GraduationCap className="w-3.5 h-3.5" />}
                    >
                      Portal: {displayName}
                    </Button>
                  </Link>
                )}

                <IconButton
                  aria-label="Logout"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  title="Logout"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                </IconButton>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<User className="w-3.5 h-3.5 text-[#1F3FBF]" />}
                  >
                    {t.nav.login}
                  </Button>
                </Link>

                <Link to="/join">
                  <Button
                    variant="accent"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {t.nav.join}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger & Quick WhatsApp */}
          <div className="flex items-center gap-2 lg:hidden">
            {user ? (
              <Link to={isStaff ? '/admin' : '/student'}>
                <IconButton aria-label="Portal" variant="outline" size="sm">
                  {isStaff ? (
                    <Shield className="w-4 h-4 text-[#0F1F5C]" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-[#1F3FBF]" />
                  )}
                </IconButton>
              </Link>
            ) : (
              <Link to="/login" className="sm:hidden">
                <IconButton aria-label={t.nav.login} variant="ghost" size="sm">
                  <User className="w-4 h-4 text-[#1F3FBF]" />
                </IconButton>
              </Link>
            )}

            <IconButton
              aria-label={t.nav.menu}
              variant="outline"
              size="md"
              onClick={() => setIsMobileNavOpen(true)}
              className="text-[#0F1F5C] hover:bg-[#F2F5FF]"
            >
              <Menu className="w-5 h-5" />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Responsive Mobile Drawer */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />
    </>
  );
};
