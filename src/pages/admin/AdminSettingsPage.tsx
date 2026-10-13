import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { CmsService } from '../../services/cmsService';
import { AdminService } from '../../services/adminService';
import { SiteSettingsPublic } from '../../types';
import {
  isSafeHttpsUrl,
  extractGoogleMapsEmbedUrl,
  getSafeYouTubeEmbedUrl,
  formatTime12h,
} from '../../utils/url';
import {
  Settings,
  ShieldAlert,
  CheckCircle2,
  Save,
  Lock,
  CreditCard,
  Building,
  Phone,
  Mail,
  Share2,
  AlertCircle,
  X,
  Image as ImageIcon,
  Video,
  MapPin,
  Clock,
  User,
  GraduationCap,
  ExternalLink,
  DollarSign,
  Database,
  Download,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ImagePreviewField } from '../../components/ui/ImagePreviewField';

export const AdminSettingsPage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { isSuperAdmin, user } = useAuth();

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Raw input holder for Maps input to allow pasting iframe code
  const [rawMapsInput, setRawMapsInput] = useState('');

  // Data Backup & Disaster Recovery State (Super Admin Only)
  const [exportingBackup, setExportingBackup] = useState(false);
  const [backupPayload, setBackupPayload] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [importingBackup, setImportingBackup] = useState(false);
  const [importResults, setImportResults] = useState<Record<string, { inserted: number; skipped: number; errors: number }> | null>(null);

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      const data = await AdminService.exportFullDatabaseBackup(user?.id);
      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonStr);
      downloadAnchor.setAttribute('download', `IBA-Backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(err?.message || 'Failed to export backup');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleBackupFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImportResults(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.version) {
          setParseError(isRoman ? 'Backup file mein version missing hai.' : 'Backup file version is missing.');
          setBackupPayload(null);
          return;
        }
        if (!parsed.tables || typeof parsed.tables !== 'object') {
          setParseError(isRoman ? 'Backup file mein tables mapping nahi mili.' : 'Invalid backup: missing tables mapping.');
          setBackupPayload(null);
          return;
        }
        setBackupPayload(parsed);
      } catch (err) {
        setParseError(isRoman ? 'JSON file parhne mein kharabi.' : 'Invalid JSON file.');
        setBackupPayload(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRunImport = async () => {
    if (!backupPayload) return;
    if (allowOverwrite && confirmText.trim() !== 'CONFIRM') {
      alert(isRoman ? 'Baraye meharbani CONFIRM type karein.' : 'Please type CONFIRM to overwrite existing records.');
      return;
    }
    try {
      setImportingBackup(true);
      const res = await AdminService.importDatabaseBackup(backupPayload, allowOverwrite, user?.id);
      if (res.success) {
        setImportResults(res.tableResults);
        alert(isRoman ? 'Backup kamyabi se import ho chuka hai!' : 'Backup imported successfully!');
      } else {
        alert(res.error || 'Import failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Import failed');
    } finally {
      setImportingBackup(false);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
        setRawMapsInput(s.googleMapsEmbedUrl || '');
      } catch (err: any) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-red-200 text-center max-w-lg mx-auto mt-8">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {isRoman ? 'Ghair Majaz Dastrasi' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-slate-500">
          {isRoman
            ? 'Academy settings sirf Super Admin ke liye makhsoos hain.'
            : 'Academy system settings are restricted to Super Administrators.'}
        </p>
      </div>
    );
  }

  const handleMapsInputChange = (val: string) => {
    setRawMapsInput(val);
    const cleaned = extractGoogleMapsEmbedUrl(val);
    if (cleaned && settings) {
      setSettings({ ...settings, googleMapsEmbedUrl: cleaned });
    } else if (!val.trim() && settings) {
      setSettings({ ...settings, googleMapsEmbedUrl: undefined });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Validate URLs if present - require HTTPS
    if (settings.logoUrl && !isSafeHttpsUrl(settings.logoUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Logo URL sirf safe HTTPS link hona chahiye.' : 'Logo URL must be a valid secure HTTPS URL.',
      });
      return;
    }

    if (settings.heroPackageImageUrl && !isSafeHttpsUrl(settings.heroPackageImageUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Hero image URL sirf HTTPS hona chahiye.' : 'Hero package image URL must be a valid HTTPS URL.',
      });
      return;
    }

    if (settings.founderImageUrl && !isSafeHttpsUrl(settings.founderImageUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Founder photo URL sirf HTTPS hona chahiye.' : 'Founder photo URL must be a valid HTTPS URL.',
      });
      return;
    }

    if (settings.aboutLeftImageUrl && !isSafeHttpsUrl(settings.aboutLeftImageUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'About left image URL sirf HTTPS hona chahiye.' : 'About left image URL must be a valid HTTPS URL.',
      });
      return;
    }

    if (settings.aboutRightImageUrl && !isSafeHttpsUrl(settings.aboutRightImageUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'About right image URL sirf HTTPS hona chahiye.' : 'About right image URL must be a valid HTTPS URL.',
      });
      return;
    }

    if (settings.coursesHeroImages && settings.coursesHeroImages.length > 0) {
      for (const imgUrl of settings.coursesHeroImages) {
        if (imgUrl && !isSafeHttpsUrl(imgUrl)) {
          setStatusMsg({
            type: 'error',
            text: isRoman ? 'Courses hero image URL sirf HTTPS hona chahiye.' : 'All courses hero image URLs must be valid HTTPS URLs.',
          });
          return;
        }
      }
    }

    if (settings.whyChooseImages && settings.whyChooseImages.length > 0) {
      for (const imgUrl of settings.whyChooseImages) {
        if (imgUrl && !isSafeHttpsUrl(imgUrl)) {
          setStatusMsg({
            type: 'error',
            text: isRoman ? 'Why Choose Us image URL sirf HTTPS hona chahiye.' : 'All Why Choose Us card image URLs must be valid HTTPS URLs.',
          });
          return;
        }
      }
    }

    if (settings.introVideoUrl && !getSafeYouTubeEmbedUrl(settings.introVideoUrl)) {
      setStatusMsg({
        type: 'error',
        text: isRoman ? 'Intro video URL sirf mutamad YouTube link hona chahiye.' : 'Intro video URL must be a valid YouTube link (watch, youtu.be, shorts, or embed).',
      });
      return;
    }

    if (rawMapsInput.trim()) {
      const cleaned = extractGoogleMapsEmbedUrl(rawMapsInput);
      if (!cleaned) {
        setStatusMsg({
          type: 'error',
          text: isRoman
            ? 'Google Maps URL ya iframe sirf https://www.google.com/maps/embed se shuru hona chahiye.'
            : 'Google Maps embed link must be a valid https://www.google.com/maps/embed URL or iframe snippet.',
        });
        return;
      }
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const payload: Partial<SiteSettingsPublic> = {
        ...settings,
        googleMapsEmbedUrl: extractGoogleMapsEmbedUrl(rawMapsInput) || settings.googleMapsEmbedUrl,
      };

      await CmsService.updateSiteSettings(payload, user?.id);

      // Re-read from Supabase to confirm saved values
      const confirmed = await CmsService.getSiteSettings();
      setSettings(confirmed);
      setRawMapsInput(confirmed.googleMapsEmbedUrl || '');
      setStatusMsg({
        type: 'success',
        text: isRoman
          ? 'Database mein kamyabi se mehfooz ho gaya! (Saved to database)'
          : 'Saved to database successfully.',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || (isRoman ? 'Settings update karne mein kharabi.' : 'Failed to save settings.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const safeMapUrl = extractGoogleMapsEmbedUrl(rawMapsInput || settings?.googleMapsEmbedUrl);
  const safeIntroEmbed = getSafeYouTubeEmbedUrl(settings?.introVideoUrl);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F1F5C] flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#1F3FBF]" />
            {isRoman ? 'Academy System Settings' : 'Academy System Configuration & Settings'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isRoman
              ? 'The Inspire Business Academy ki public maloomat, auqat, branding, pricing aur payment accounts.'
              : 'Configure public institution details, operating hours, media URLs, course pricing, and payment instructions.'}
          </p>
        </div>

        <Badge variant="accent">Super Admin Exclusive</Badge>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Security Isolation Notice */}
      <div className="bg-[#0F1F5C] text-white p-5 rounded-2xl shadow-sm flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#FFC20E] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-[#FFC20E]">
            {isRoman ? 'Security Boundary: Sirf Public Maloomat' : 'Security Boundary: Non-Secret Configuration Only'}
          </h3>
          <p className="text-slate-300 leading-relaxed">
            {isRoman
              ? 'Hifazati qanoon: Service Role Keys, Supabase Passwords, API Secrets aur Database connection strings ko settings UI mein hargiz store nahi kiya jata. Har image aik HTTPS URL aur har video aik YouTube URL hai.'
              : 'Under strict zero-trust standards, secrets like Service Role Keys and database passwords never reside in client-accessible tables. Media assets are stored as HTTPS URLs, and YouTube videos are converted to safe embeds.'}
          </p>
        </div>
      </div>

      {loading || !settings ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs text-slate-500 mt-2">
            {isRoman ? 'Settings load ho rahi hain...' : 'Loading settings...'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Academy Public Profile & Address */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Building className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Academy Naam o Location' : 'Academy Identity & Campus Location'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Academy Display Name</label>
                <input
                  type="text"
                  required
                  value={settings.academyName}
                  onChange={(e) => setSettings({ ...settings, academyName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Physical Address</label>
                <input
                  type="text"
                  required
                  value={settings.campusAddress}
                  onChange={(e) => setSettings({ ...settings, campusAddress: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mission / Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default UI Language</label>
                <select
                  value={settings.defaultLanguage}
                  onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value as any })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="roman-urdu">Roman Urdu (Default)</option>
                  <option value="english">English</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Public Site URL</label>
                <input
                  type="text"
                  value={settings.publicSiteUrl}
                  onChange={(e) => setSettings({ ...settings, publicSiteUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Visual Branding & Media URLs */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <ImageIcon className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Visual Branding aur Media URLs' : 'Visual Branding & Media Assets (HTTPS URLs Only)'}
              </h2>
            </div>

            <p className="text-[11px] text-slate-500">
              {isRoman
                ? 'Tamam images keliye barah-e-rast safe HTTPS image URL darj karein. Video keliye YouTube link darj karein.'
                : 'Enter direct HTTPS image URLs. Videos must be YouTube links (auto-converted to safe embeds).'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <ImagePreviewField
                label={isRoman ? 'Academy Logo URL (HTTPS)' : 'Academy Logo URL (HTTPS)'}
                value={settings.logoUrl || ''}
                onChange={(val) => setSettings({ ...settings, logoUrl: val || undefined })}
                placeholder="https://example.com/logo.png"
                isRoman={isRoman}
                aspect="square"
                helpText="Direct HTTPS image link"
              />

              <ImagePreviewField
                label={isRoman ? 'Hero Package Image URL (HTTPS)' : 'Hero Package Image URL (HTTPS)'}
                value={settings.heroPackageImageUrl || ''}
                onChange={(val) => setSettings({ ...settings, heroPackageImageUrl: val || undefined })}
                placeholder="https://example.com/class-session.jpg"
                isRoman={isRoman}
                aspect="video"
                helpText="Direct HTTPS image link"
              />

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Intro Video URL (YouTube Watch / Share / Embed Link)
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={settings.introVideoUrl || ''}
                  onChange={(e) => setSettings({ ...settings, introVideoUrl: e.target.value || undefined })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
                {safeIntroEmbed && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid YouTube embed detected
                    </span>
                    <div className="aspect-video max-w-sm rounded-lg overflow-hidden border border-slate-200 bg-black">
                      <iframe
                        src={safeIntroEmbed}
                        title="Intro Video Preview"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Courses Hero Slideshow Images */}
              <div className="md:col-span-2 space-y-2">
                <label className="block font-semibold text-slate-700">
                  {isRoman ? 'Courses Page Hero Slideshow Images (Up to 3 HTTPS URLs)' : 'Courses Page Hero Slideshow Images (Up to 3 HTTPS URLs)'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => {
                    const currentArr = settings.coursesHeroImages || [];
                    const val = currentArr[idx] || '';
                    return (
                      <ImagePreviewField
                        key={idx}
                        label={`Slide #${idx + 1}`}
                        value={val}
                        onChange={(newVal) => {
                          const updated = [...currentArr];
                          updated[idx] = newVal;
                          setSettings({
                            ...settings,
                            coursesHeroImages: updated.filter(Boolean),
                          });
                        }}
                        placeholder="https://.../slide.jpg"
                        isRoman={isRoman}
                        aspect="video"
                      />
                    );
                  })}
                </div>
              </div>

              {/* Why Choose Us Card Images (Up to 6) */}
              <div className="md:col-span-2 space-y-2">
                <label className="block font-semibold text-slate-700">
                  {isRoman ? 'Why Choose Us Card Images (6 HTTPS URLs tak)' : 'Why Choose Us Card Images (Up to 6 HTTPS URLs)'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2, 3, 4, 5].map((idx) => {
                    const currentArr = settings.whyChooseImages || [];
                    const val = currentArr[idx] || '';
                    return (
                      <ImagePreviewField
                        key={idx}
                        label={`Card #${idx + 1}`}
                        value={val}
                        onChange={(newVal) => {
                          const updated = [...currentArr];
                          updated[idx] = newVal;
                          setSettings({
                            ...settings,
                            whyChooseImages: updated.filter(Boolean),
                          });
                        }}
                        placeholder="https://.../card.jpg"
                        isRoman={isRoman}
                        aspect="video"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Operating Schedule & Google Maps Location */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Auqat-e-Kaar aur Google Map' : 'Operating Hours & Verified Google Maps Location'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Opening Time (24h 'HH:MM')
                </label>
                <input
                  type="text"
                  placeholder="09:00"
                  value={settings.openingTime || '09:00'}
                  onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Preview: {formatTime12h(settings.openingTime || '09:00', '9:00 AM')}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Closing Time (24h 'HH:MM')
                </label>
                <input
                  type="text"
                  placeholder="19:00"
                  value={settings.closingTime || '19:00'}
                  onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Preview: {formatTime12h(settings.closingTime || '19:00', '7:00 PM')}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Working Days</label>
                <input
                  type="text"
                  placeholder="Monday - Friday"
                  value={settings.workingDaysText || 'Monday - Friday'}
                  onChange={(e) => setSettings({ ...settings, workingDaysText: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div className="sm:col-span-3 space-y-2">
                <label className="block font-semibold text-slate-700">
                  Google Maps Embed URL or &lt;iframe&gt; Code
                </label>
                <textarea
                  rows={2}
                  placeholder='Paste either direct URL (https://www.google.com/maps/embed?...) or full <iframe src="..." ...> snippet'
                  value={rawMapsInput}
                  onChange={(e) => handleMapsInputChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-[11px] focus:ring-2 focus:ring-[#1F3FBF]"
                />
                <p className="text-[10px] text-slate-500">
                  Auto-sanitizer will extract only the verified `src` parameter starting with `https://www.google.com/maps/embed`.
                </p>

                {safeMapUrl ? (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Map iframe URL extracted
                    </span>
                    <div className="w-full h-44 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                      <iframe
                        src={safeMapUrl}
                        title="Google Maps Campus Location"
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : rawMapsInput.trim() ? (
                  <p className="text-[11px] text-red-600 font-medium">
                    Invalid embed code: Must start with `https://www.google.com/maps/embed`.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Section 4: Founder & About Page Images */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Founder aur About Page ki Maloomat' : 'Founder Profile & About Page Images'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Founder Full Name</label>
                <input
                  type="text"
                  value={settings.founderName || 'Adeel Bhatti'}
                  onChange={(e) => setSettings({ ...settings, founderName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <ImagePreviewField
                label={isRoman ? 'Founder Photo URL (HTTPS)' : 'Founder Photo URL (HTTPS)'}
                value={settings.founderImageUrl || ''}
                onChange={(val) => setSettings({ ...settings, founderImageUrl: val || undefined })}
                placeholder="https://.../adeel-bhatti.jpg"
                isRoman={isRoman}
                aspect="avatar"
                helpText="Direct HTTPS photo link"
              />

              <ImagePreviewField
                label={isRoman ? 'About Page Left Image URL (HTTPS)' : 'About Page Left Image URL (HTTPS)'}
                value={settings.aboutLeftImageUrl || ''}
                onChange={(val) => setSettings({ ...settings, aboutLeftImageUrl: val || undefined })}
                placeholder="https://.../classroom-left.jpg"
                isRoman={isRoman}
                aspect="video"
                helpText="Direct HTTPS image link"
              />

              <ImagePreviewField
                label={isRoman ? 'About Page Right Image URL (HTTPS)' : 'About Page Right Image URL (HTTPS)'}
                value={settings.aboutRightImageUrl || ''}
                onChange={(val) => setSettings({ ...settings, aboutRightImageUrl: val || undefined })}
                placeholder="https://.../classroom-right.jpg"
                isRoman={isRoman}
                aspect="video"
                helpText="Direct HTTPS image link"
              />
            </div>
          </div>

          {/* Section 5: Academic Pricing & Fee Structure */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <DollarSign className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Taleemi Fees aur Packages ki Raqoom' : 'Academic Pricing Structure & Fees (PKR)'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical Monthly Fee (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.physicalMonthlyFee ?? 5040}
                  onChange={(e) => setSettings({ ...settings, physicalMonthlyFee: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical Total Fee (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.physicalTotalFee ?? 30240}
                  onChange={(e) => setSettings({ ...settings, physicalTotalFee: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Admission Fee (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.physicalAdmissionFee ?? 0}
                  onChange={(e) => setSettings({ ...settings, physicalAdmissionFee: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Physical Total Courses Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.physicalCourseCount ?? 10}
                  onChange={(e) => setSettings({ ...settings, physicalCourseCount: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Online Course Price (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={settings.onlineCoursePrice ?? 5000}
                  onChange={(e) => setSettings({ ...settings, onlineCoursePrice: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Online Course Duration (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.onlineCourseDurationMonths ?? 6}
                  onChange={(e) => setSettings({ ...settings, onlineCourseDurationMonths: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Official Contact Helplines & Social */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Phone className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Rabta o Helpline (Contact & Social)' : 'Official Contact & Verified Social Links'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">WhatsApp Helpline</label>
                <input
                  type="text"
                  required
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Public Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">YouTube Channel URL</label>
                <input
                  type="text"
                  value={settings.socialYoutube || ''}
                  onChange={(e) => setSettings({ ...settings, socialYoutube: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Facebook Page URL</label>
                <input
                  type="text"
                  value={settings.socialFacebook || ''}
                  onChange={(e) => setSettings({ ...settings, socialFacebook: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Instagram URL</label>
                <input
                  type="text"
                  value={settings.socialInstagram || ''}
                  onChange={(e) => setSettings({ ...settings, socialInstagram: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#1F3FBF]"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Public Fee Payment Accounts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-[#1F3FBF]" />
              <h2 className="text-sm font-bold text-[#0F1F5C]">
                {isRoman ? 'Public Payment Accounts (JazzCash / EasyPaisa / Bank)' : 'Public Fee Payment Accounts'}
              </h2>
            </div>

            <p className="text-[11px] text-slate-500">
              {isRoman
                ? 'Tulba ko dakhla form aur checkout page par dikhaye jane wale verified payment accounts.'
                : 'Account details displayed to students on admission and payment checkout screens.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">JazzCash Account</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentJazzcashEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, paymentJazzcashEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#1F3FBF] rounded border-slate-300 focus:ring-[#1F3FBF]"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {settings.paymentJazzcashEnabled !== false
                        ? isRoman ? 'Faal (Enabled)' : 'Enabled'
                        : isRoman ? 'Band (Disabled)' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Account Title</label>
                  <input
                    type="text"
                    value={settings.paymentJazzcashTitle || ''}
                    onChange={(e) => setSettings({ ...settings, paymentJazzcashTitle: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={settings.paymentJazzcashNumber || ''}
                    onChange={(e) => setSettings({ ...settings, paymentJazzcashNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">EasyPaisa Account</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentEasypaisaEnabled !== false}
                      onChange={(e) => setSettings({ ...settings, paymentEasypaisaEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#1F3FBF] rounded border-slate-300 focus:ring-[#1F3FBF]"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {settings.paymentEasypaisaEnabled !== false
                        ? isRoman ? 'Faal (Enabled)' : 'Enabled'
                        : isRoman ? 'Band (Disabled)' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Account Title</label>
                  <input
                    type="text"
                    value={settings.paymentEasypaisaTitle || ''}
                    onChange={(e) => setSettings({ ...settings, paymentEasypaisaTitle: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={settings.paymentEasypaisaNumber || ''}
                    onChange={(e) => setSettings({ ...settings, paymentEasypaisaNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">Bank Transfer Details</span>
                    <span className="text-[11px] text-slate-500">
                      {isRoman
                        ? 'Default band hai; admin faal kar sakta hai.'
                        : 'Disabled by default; admin can enable IBFT payments anytime.'}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!settings.paymentBankEnabled}
                      onChange={(e) => setSettings({ ...settings, paymentBankEnabled: e.target.checked })}
                      className="w-4 h-4 text-[#1F3FBF] rounded border-slate-300 focus:ring-[#1F3FBF]"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      {settings.paymentBankEnabled
                        ? isRoman ? 'Faal (Enabled)' : 'Enabled'
                        : isRoman ? 'Band (Disabled)' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={settings.paymentBankName || ''}
                      onChange={(e) => setSettings({ ...settings, paymentBankName: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Account Title</label>
                    <input
                      type="text"
                      value={settings.paymentBankAccountTitle || ''}
                      onChange={(e) => setSettings({ ...settings, paymentBankAccountTitle: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={settings.paymentBankAccountNumber || ''}
                      onChange={(e) => setSettings({ ...settings, paymentBankAccountNumber: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">IBAN</label>
                    <input
                      type="text"
                      value={settings.paymentBankIban || ''}
                      onChange={(e) => setSettings({ ...settings, paymentBankIban: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              className="bg-[#1F3FBF] hover:bg-[#0F1F5C] text-white font-bold px-6 shadow-sm inline-flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Spinner size="xs" variant="white" />
                  <span>{isRoman ? 'Mehfooz ho raha hai...' : 'Saving Changes...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isRoman ? 'Tanzimat Mehfooz Karein' : 'Save Academy Settings'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* SUPER ADMIN DATA BACKUP & RESTORE SECTION (Task 7) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F1F5C]">
                {isRoman ? 'Database Backup & Restore' : 'Database Backup & Disaster Recovery'}
              </h2>
              <p className="text-xs text-slate-500">
                {isRoman
                  ? 'Mukammal academy data ka JSON export aur safe backup restore (Super Admin only).'
                  : 'Full academy database snapshot export and verified JSON import with merge/overwrite controls.'}
              </p>
            </div>
          </div>
          <Badge variant="accent">Super Admin Only</Badge>
        </div>

        <div className="p-6 space-y-6 text-xs">
          {/* Export Section */}
          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mb-1">
                <Download className="w-4 h-4 text-[#1F3FBF]" />
                {isRoman ? 'Full Database Export (JSON)' : 'Export Full Academy Snapshot'}
              </h3>
              <p className="text-slate-500 max-w-xl">
                {isRoman
                  ? 'Courses, dakhlay, physical students, fees, attendance, ikhrajat aur settings ka mukammal snapshot aik JSON file mein download karein. Is mein passwords ya secrets shamil nahi hotay.'
                  : 'Download complete snapshot of courses, admissions, students, fees, attendance, and academy settings in a single JSON backup file. Excludes user credentials and passwords.'}
              </p>
            </div>

            <Button
              onClick={handleExportBackup}
              variant="primary"
              size="sm"
              disabled={exportingBackup}
              className="shrink-0"
            >
              {exportingBackup ? (
                <>
                  <Spinner size="xs" variant="white" className="mr-1.5" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>{isRoman ? 'Tamam Data Export Karein' : 'Export All Data'}</span>
                </>
              )}
            </Button>
          </div>

          {/* Import Section */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mb-1">
                <Upload className="w-4 h-4 text-[#1F3FBF]" />
                {isRoman ? 'Backup Restore & Import' : 'Import & Restore Database Backup'}
              </h3>
              <p className="text-slate-500">
                {isRoman
                  ? 'Pehle se export shuda JSON backup file muntakhab karein. Pehle preview check karein.'
                  : 'Upload an existing IBA JSON backup file. Inspect table preview before applying merge or overwrite.'}
              </p>
            </div>

            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleBackupFileSelected}
                className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#1F3FBF] file:text-white hover:file:bg-[#0F1F5C] file:cursor-pointer"
              />
            </div>

            {parseError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Preview if parsed successfully */}
            {backupPayload && (
              <div className="space-y-4 pt-3 border-t border-slate-200 animate-in fade-in">
                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div>
                    <span className="font-bold text-[#0F1F5C] block">
                      {backupPayload.academy || 'The Inspire Business Academy'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Version: {backupPayload.version} | Exported:{' '}
                      {new Date(backupPayload.exportedAt).toLocaleString()}
                    </span>
                  </div>
                  <Badge variant="navy">Validated</Badge>
                </div>

                {/* Table Preview Grid */}
                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-2">
                    {isRoman ? 'Tables & Records Preview' : 'Tables Included in Backup:'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-lg bg-slate-50">
                    {Object.keys(backupPayload.tables || {}).map((table) => {
                      const count = Array.isArray(backupPayload.tables[table])
                        ? backupPayload.tables[table].length
                        : 0;
                      return (
                        <div key={table} className="p-2 bg-white rounded border border-slate-200 text-[11px]">
                          <span className="font-medium text-slate-800 truncate block font-mono text-[10px]">
                            {table}
                          </span>
                          <span className="font-bold text-[#1F3FBF]">{count} rows</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Merge vs Overwrite Selection */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="overwrite-check"
                      checked={allowOverwrite}
                      onChange={(e) => setAllowOverwrite(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <label htmlFor="overwrite-check" className="text-slate-800">
                      <span className="font-bold block">
                        {isRoman ? 'Overwrite existing records (Khatarnaak)' : 'Overwrite existing records (Destructive)'}
                      </span>
                      <span className="text-slate-600 text-[11px]">
                        {isRoman
                          ? 'Default: MERGE ONLY (Existing IDs skip honge). Agar aap mojooda records ko naye data se badalna chahte hain to isay tick karein.'
                          : 'Default mode is MERGE ONLY (existing records are skipped and untouched). Check this only if you explicitly want to overwrite matching IDs.'}
                      </span>
                    </label>
                  </div>

                  {allowOverwrite && (
                    <div className="space-y-1.5 pt-2 border-t border-amber-200">
                      <label className="block text-[11px] font-bold text-rose-800">
                        {isRoman
                          ? 'Tasdeeq ke liye CONFIRM type karein:'
                          : 'Type CONFIRM to authorize overwriting existing records:'}
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="CONFIRM"
                        className="p-2 border border-rose-300 rounded-lg font-mono font-bold w-48 uppercase bg-white focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                  )}
                </div>

                {/* Submit Import Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleRunImport}
                    variant="primary"
                    disabled={importingBackup || (allowOverwrite && confirmText.trim() !== 'CONFIRM')}
                    className="bg-[#0F1F5C] hover:bg-[#1F3FBF]"
                  >
                    {importingBackup ? (
                      <>
                        <Spinner size="xs" variant="white" className="mr-1.5" />
                        <span>Restoring Backup...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        <span>
                          {allowOverwrite ? 'Restore Backup (OVERWRITE)' : 'Restore Backup (MERGE ONLY)'}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Results Report per Table */}
            {importResults && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-900 text-sm">
                    {isRoman ? 'Import Nateeja (Results per Table):' : 'Import Results per Table:'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {Object.keys(importResults).map((table) => {
                    const r = importResults[table];
                    return (
                      <div key={table} className="p-2 bg-white rounded border border-emerald-100 text-[11px]">
                        <span className="font-mono text-[10px] font-semibold text-slate-700 block truncate">
                          {table}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px]">
                          <span className="text-emerald-700 font-bold">+{r.inserted}</span>
                          <span className="text-slate-400">| skip {r.skipped}</span>
                          {r.errors > 0 && <span className="text-rose-600 font-bold">| err {r.errors}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
