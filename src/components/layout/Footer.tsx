import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { Brand } from '../branding/Brand';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { SiteSettingsPublic } from '../../types';
import { formatTime12h } from '../../utils/url';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
      } catch (err) {
        console.warn('Failed to load settings in Footer:', err);
      }
    }
    loadSettings();
  }, []);

  const openTime12 = formatTime12h(settings?.operatingHoursOpen || settings?.openingTime || '09:00', '9:00 AM');
  const closeTime12 = formatTime12h(settings?.operatingHoursClose || settings?.closingTime || '19:00', '7:00 PM');
  const workingDays = settings?.workingDaysText || 'Monday - Friday';
  const operatingHoursText = `${workingDays}: ${openTime12} – ${closeTime12}`;
  const campusAddress = settings?.campusAddress || siteConfig.location;
  const phone = settings?.phone || siteConfig.phone;
  const whatsapp = settings?.whatsapp || siteConfig.whatsapp;
  const logoUrl = settings?.logoUrl;
  const facebookUrl = settings?.socialFacebook || siteConfig.social.facebook;
  const youtubeUrl = settings?.socialYoutube || siteConfig.social.youtube;
  const instagramUrl = settings?.socialInstagram;

  return (
    <footer className="bg-[#0F1F5C] text-white border-t-4 border-[#FFC20E] pt-12 sm:pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-12 border-b border-white/15">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <Brand size="md" inverted logoUrl={logoUrl} />
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              {t.footer.aboutAcademyDesc}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#FFC20E] font-semibold bg-white/5 p-2.5 rounded-lg border border-white/10">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#FFC20E]" />
              <span>{siteConfig.mission} &bull; Sadiqabad, Punjab</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-4 border-l-2 border-[#FFC20E] pl-2.5">
              {t.footer.quickLinksTitle}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {siteConfig.footerQuickLinks.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-white/80 hover:text-[#FFC20E] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="text-[#FFC20E] text-xs">&rsaquo;</span>
                    {t.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Legal & Student Information */}
          <div>
            <h4 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-4 border-l-2 border-[#FFC20E] pl-2.5">
              {t.footer.legalLinksTitle}
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              {siteConfig.footerLegalLinks.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-white/80 hover:text-[#FFC20E] transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="text-[#FFC20E] text-xs">&rsaquo;</span>
                    {t.nav[item.labelKey]}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/admin/login"
                  className="text-white/60 hover:text-white transition-colors inline-flex items-center gap-1.5 pt-1"
                >
                  <span className="text-[#FFC20E] text-xs">&rsaquo;</span>
                  {t.nav.adminLogin}
                </Link>
              </li>
            </ul>

            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70 leading-relaxed">
              <span className="text-[#FFC20E] font-bold block mb-0.5">Wazahat:</span>
              Physical students ka web login nahi hota; records administration manage karti hai.
            </div>
          </div>

          {/* Col 4: Verified Contact & Schedule */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-4 border-l-2 border-[#FFC20E] pl-2.5">
              {t.footer.contactTitle}
            </h4>

            <div className="space-y-3 text-xs sm:text-sm text-white/80">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#FFC20E] shrink-0 mt-0.5" />
                <span className="leading-snug">{campusAddress}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#FFC20E] shrink-0" />
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '').startsWith('0') ? '92' + whatsapp.replace(/[^0-9]/g, '').slice(1) : whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-white hover:text-[#FFC20E] transition-colors"
                >
                  {whatsapp} (WhatsApp){phone && phone !== whatsapp ? ` / ${phone}` : ''}
                </a>
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <Clock className="w-4 h-4 text-[#FFC20E] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-semibold text-white">{operatingHoursText}</p>
                </div>
              </div>
            </div>

            {/* Official Social Links */}
            <div className="pt-2">
              <span className="block text-xs font-semibold text-white/70 mb-2">
                Official Channels:
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#1F3FBF] text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border border-white/15"
                  >
                    <span>Facebook</span>
                    <ExternalLink className="w-3 h-3 text-white/70" />
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-red-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border border-white/15"
                  >
                    <span>YouTube</span>
                    <ExternalLink className="w-3 h-3 text-white/70" />
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-pink-700 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border border-white/15"
                  >
                    <span>Instagram</span>
                    <ExternalLink className="w-3 h-3 text-white/70" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            &copy; {currentYear} {siteConfig.name}. {t.footer.copyright}
          </p>
          <p className="text-center sm:text-right text-[#FFC20E]/90 font-medium">
            {t.footer.designedFor}
          </p>
        </div>
      </div>
    </footer>
  );
};
