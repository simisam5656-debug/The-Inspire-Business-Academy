/**
 * The Inspire Business Academy - Central Site Configuration
 * Only confirmed academy facts and business rules are declared here.
 * Never invent emails, bank accounts, or unconfirmed domains.
 */

export interface AcademyBatch {
  id: string;
  name: string;
  gender: 'girls' | 'boys';
  timing: string;
}

export interface NavLinkItem {
  path: string;
  labelKey: keyof typeof import('../i18n/translations/romanUrdu').romanUrdu['nav'];
  isPrimary?: boolean;
}

export interface SiteConfig {
  name: string;
  shortName: string;
  mission: string;
  location: string;
  phone: string;
  whatsapp: string;
  social: {
    facebook: string;
    youtube: string;
  };
  workingDays: string;
  offDays: string;
  batches: AcademyBatch[];
  mainNav: NavLinkItem[];
  footerQuickLinks: NavLinkItem[];
  footerLegalLinks: NavLinkItem[];
  physicalPackage: {
    durationMonths: number;
    courseCount: number;
    monthlyFee: number;
    totalPackage: number;
    admissionFee: number;
    laptopProvided: boolean;
    schedule: string;
    noHiddenCharges: boolean;
  };
  onlineCourses: {
    defaultPrice: number;
    defaultAccessDurationMonths: number;
    delivery: string;
    finalExamPassMarkPercent: number;
  };
  demoMode: boolean;
  publicSiteUrl: string;
  colors: {
    royalBlue: string;
    deepNavy: string;
    yellow: string;
    white: string;
    lightBg: string;
  };
}

export const siteConfig: SiteConfig = {
  name: 'The Inspire Business Academy',
  shortName: 'IBA',
  mission: 'Hunarmand Pakistan',
  location: 'Sadiqabad, Punjab, Pakistan',
  phone: '0309-3534289',
  whatsapp: '0309-3534289',
  social: {
    facebook: 'https://www.facebook.com/share/1BhrJNWHmF/',
    youtube: 'https://youtube.com/@theinspirebusinessacademy',
  },
  workingDays: 'Monday - Friday',
  offDays: 'Saturday - Sunday',
  batches: [
    { id: 'gb1', name: 'Girls Batch 1', gender: 'girls', timing: '9:00 AM - 11:30 AM' },
    { id: 'bb1', name: 'Boys Batch 1', gender: 'boys', timing: '12:00 PM - 2:00 PM' },
    { id: 'gb2', name: 'Girls Batch 2', gender: 'girls', timing: '2:00 PM - 4:00 PM' },
    { id: 'bb2', name: 'Boys Batch 2', gender: 'boys', timing: '4:30 PM - 7:00 PM' },
  ],
  mainNav: [
    { path: '/', labelKey: 'home' },
    { path: '/courses', labelKey: 'courses' },
    { path: '/about', labelKey: 'about' },
    { path: '/gallery', labelKey: 'gallery' },
    { path: '/contact', labelKey: 'contact' },
    { path: '/verify', labelKey: 'verify' },
  ],
  footerQuickLinks: [
    { path: '/courses', labelKey: 'courses' },
    { path: '/about', labelKey: 'about' },
    { path: '/gallery', labelKey: 'gallery' },
    { path: '/contact', labelKey: 'contact' },
    { path: '/verify', labelKey: 'verify' },
    { path: '/join', labelKey: 'join' },
  ],
  footerLegalLinks: [
    { path: '/privacy', labelKey: 'privacy' },
    { path: '/terms', labelKey: 'terms' },
    { path: '/refund', labelKey: 'refund' },
  ],
  physicalPackage: {
    durationMonths: 6,
    courseCount: 10,
    monthlyFee: 5040,
    totalPackage: 30240,
    admissionFee: 0,
    laptopProvided: false,
    schedule: 'Monday - Friday',
    noHiddenCharges: true,
  },
  onlineCourses: {
    defaultPrice: 5000,
    defaultAccessDurationMonths: 6,
    delivery: 'Recorded lectures only',
    finalExamPassMarkPercent: 70,
  },
  demoMode: (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_DEMO_MODE === 'true') || (typeof process !== 'undefined' && process.env?.VITE_DEMO_MODE === 'true'),
  publicSiteUrl: (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL) || (typeof process !== 'undefined' && process.env?.VITE_PUBLIC_SITE_URL) || '',
  colors: {
    royalBlue: '#1F3FBF',
    deepNavy: '#0F1F5C',
    yellow: '#FFC20E',
    white: '#FFFFFF',
    lightBg: '#F2F5FF',
  },
};

export const PHYSICAL_PACKAGE_CONFIG = siteConfig.physicalPackage;
