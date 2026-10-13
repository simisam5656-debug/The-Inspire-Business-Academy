import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { siteConfig } from '../../config/site';
import { useTranslation } from '../../i18n';
import { CmsService } from '../../services/cmsService';

export const WhatsAppFloat: React.FC = () => {
  const { t } = useTranslation();
  const [whatsappNumber, setWhatsappNumber] = useState<string>(siteConfig.whatsapp);

  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await CmsService.getSiteSettings();
        if (s?.whatsapp) {
          setWhatsappNumber(s.whatsapp);
        }
      } catch (err) {
        console.warn('Failed to load whatsapp number in WhatsAppFloat:', err);
      }
    }
    loadSettings();
  }, []);

  const whatsappDigits = whatsappNumber.replace(/[^0-9]/g, '');
  const internationalNumber = whatsappDigits.startsWith('0')
    ? `92${whatsappDigits.slice(1)}`
    : whatsappDigits;

  const defaultMessage = encodeURIComponent(
    'Assalam o Alaikum! Mujhe The Inspire Business Academy ke bare mein maloomat chahiye.'
  );

  return (
    <aside aria-label="WhatsApp Support Link">
      <a
        href={`https://wa.me/${internationalNumber}?text=${defaultMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact The Inspire Business Academy on WhatsApp (0309-3534289)"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white p-3 sm:px-4 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
      >
        <MessageCircle className="w-6 h-6 fill-current shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline font-bold text-xs sm:text-sm tracking-wide">
          {t.common.whatsapp}
        </span>
        <span className="sr-only">0309-3534289</span>
      </a>
    </aside>
  );
};
