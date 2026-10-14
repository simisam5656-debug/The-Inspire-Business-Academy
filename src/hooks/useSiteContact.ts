import { useEffect, useState } from 'react';
import { CmsService } from '../services/cmsService';
import { siteConfig } from '../config/site';

export interface SiteContact {
  phone: string;
  whatsapp: string;
  /** International digits for wa.me, e.g. 923093534289 */
  waDigits: string;
  /** Build a wa.me link with an optional pre-filled message. */
  waLink: (text?: string) => string;
}

function toInternational(raw: string): string {
  const digits = (raw || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  return `92${digits}`;
}

function build(phone: string, whatsapp: string): SiteContact {
  const waDigits = toInternational(whatsapp);
  return {
    phone,
    whatsapp,
    waDigits,
    waLink: (text?: string) =>
      `https://wa.me/${waDigits}${text ? `?text=${encodeURIComponent(text)}` : ''}`,
  };
}

let cached: { phone: string; whatsapp: string } | null = null;

/**
 * Contact numbers come from admin Settings (site_settings_public).
 * siteConfig is only the last-resort fallback while loading or if settings fail.
 */
export function useSiteContact(): SiteContact {
  const [values, setValues] = useState(
    cached || { phone: siteConfig.phone, whatsapp: siteConfig.whatsapp }
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await CmsService.getSiteSettings();
        const next = {
          phone: s?.phone || siteConfig.phone,
          whatsapp: s?.whatsapp || siteConfig.whatsapp,
        };
        cached = next;
        if (alive) setValues(next);
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return build(values.phone, values.whatsapp);
}
