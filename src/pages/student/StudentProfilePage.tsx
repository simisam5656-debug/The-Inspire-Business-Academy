import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { SEO } from '../../components/common/SEO';
import { UserCircle2, CheckCircle2, AlertCircle, Globe } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    setFullName(profile?.fullName || '');
    setPhone(profile?.phone || '');
    setCity(profile?.city || '');
    setBio(profile?.bio || '');
    setAvatarUrl(profile?.avatarUrl || '');
  }, [profile?.id, profile?.fullName, profile?.phone, profile?.city, profile?.bio, profile?.avatarUrl]);

  useEffect(() => {
    // Portfolio URL is set by admin only; students just see it (read-only).
    if (!user?.id || !isSupabaseConfigured || !supabase) return;
    supabase
      .from('profiles')
      .select('portfolio_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }: any) => setPortfolioUrl(data?.portfolio_url || ''));
  }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const cleanAvatar = avatarUrl.trim();
    if (cleanAvatar && !/^https:\/\/\S+$/i.test(cleanAvatar)) {
      setMsg({
        type: 'error',
        text: isRoman ? 'Profile picture ka link https:// se shuru hona chahiye.' : 'Profile picture link must start with https://',
      });
      return;
    }
    if (fullName.trim().length < 2) {
      setMsg({ type: 'error', text: isRoman ? 'Naam kam az kam 2 harf ka ho.' : 'Name must be at least 2 characters.' });
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMsg({ type: 'error', text: 'Database not configured.' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('update_my_profile', {
        p_full_name: fullName.trim(),
        p_phone: phone.trim(),
        p_city: city.trim(),
        p_bio: bio.trim(),
        p_avatar_url: cleanAvatar,
      });
      if (error) throw new Error(error.message);
      await refreshProfile();
      setImgBroken(false);
      setMsg({ type: 'success', text: isRoman ? 'Profile mehfooz ho gayi.' : 'Profile saved.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || (isRoman ? 'Profile save nahi hui.' : 'Failed to save profile.') });
    } finally {
      setSaving(false);
    }
  };

  const showImg = !!avatarUrl.trim() && /^https:\/\//i.test(avatarUrl.trim()) && !imgBroken;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <SEO title="My Profile" description="Student profile settings" />
      <div className="bg-white p-5 rounded-2xl border border-slate-200">
        <h1 className="text-lg font-bold text-[#0F1F5C] flex items-center gap-2">
          <UserCircle2 className="w-5 h-5 text-[#1F3FBF]" />
          {isRoman ? 'Meri Profile' : 'My Profile'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isRoman ? 'Apni zaati maloomat yahan update karein.' : 'Keep your personal details up to date.'}
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
        <div className="flex items-center gap-4">
          {showImg ? (
            <img
              src={avatarUrl.trim()}
              alt="Profile"
              referrerPolicy="no-referrer"
              onError={() => setImgBroken(true)}
              className="w-16 h-16 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#1F3FBF] text-white flex items-center justify-center text-2xl font-bold">
              {(fullName || user?.email || 'S')[0].toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <label className="block font-semibold text-slate-700 mb-1">
              {isRoman ? 'Profile Picture ka Link (URL)' : 'Profile Picture URL'}
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setImgBroken(false);
              }}
              placeholder="https://..."
              className="w-full p-2.5 border border-slate-200 rounded-lg"
            />
            {imgBroken && (
              <p className="text-[11px] text-red-600 mt-1">
                {isRoman ? 'Is link se tasveer load nahi hui.' : 'This link did not load an image.'}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{isRoman ? 'Poora Naam' : 'Full Name'}</label>
            <input
              type="text"
              required
              maxLength={80}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="text"
              disabled
              value={profile?.email || user?.email || ''}
              className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{isRoman ? 'Phone / WhatsApp' : 'Phone / WhatsApp'}</label>
            <input
              type="text"
              maxLength={25}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{isRoman ? 'Shehar' : 'City'}</label>
            <input
              type="text"
              maxLength={60}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            {isRoman ? 'Apne Bare Mein (max 300 harf)' : 'About me (max 300 characters)'}
          </label>
          <textarea
            rows={3}
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg"
          />
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#1F3FBF]" />
            {isRoman ? 'Mera Portfolio Website' : 'My Portfolio Website'}
          </div>
          {portfolioUrl ? (
            <a href={portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-[#1F3FBF] font-semibold break-all hover:underline">
              {portfolioUrl}
            </a>
          ) : (
            <p className="text-slate-500 mt-0.5">
              {isRoman
                ? 'Jab aap apna portfolio bana lein, apne instructor/admin ko link bhej dein. Wo yahan add kar denge.'
                : 'Once your portfolio is ready, send the link to your admin and they will add it here.'}
            </p>
          )}
        </div>

        {msg && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 border ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" disabled={saving} className="bg-[#1F3FBF] text-white font-bold">
            {saving ? (isRoman ? 'Save ho raha hai...' : 'Saving...') : isRoman ? 'Mehfooz Karein' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </div>
  );
};
