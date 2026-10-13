import React, { useState, useEffect } from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SiteSettingsPublic } from '../../types';
import { extractGoogleMapsEmbedUrl, formatTime12h } from '../../utils/url';
import {
  Phone,
  MapPin,
  Clock,
  ExternalLink,
  MessageCircle,
  Mail,
  Send,
  Building2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  // Form states for contact_messages insertion
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [courseInterest, setCourseInterest] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // Status & feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const loadData = async () => {
    if (!isSupabaseConfigured) {
      setLoadError(null);
      return;
    }
    try {
      setLoadError(null);
      const s = await CmsService.getSiteSettings();
      setSettings(s);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load campus contact details');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 30s resend cooldown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const campusAddress = settings?.campusAddress || 'Near Shimla Point And NGS School Nehr Kinara, Mehrabad Street #1, Sadiqabad';
  const rawMapsUrl = settings?.googleMapsEmbedUrl;
  const safeMapsEmbedUrl = extractGoogleMapsEmbedUrl(rawMapsUrl);
  const openTime12 = formatTime12h(settings?.openingTime || '09:00', '9:00 AM');
  const closeTime12 = formatTime12h(settings?.closingTime || '19:00', '7:00 PM');
  const workingDays = settings?.workingDaysText || 'Monday - Friday';
  const whatsappNum = settings?.whatsapp || siteConfig.whatsapp;
  const contactPhone = settings?.phone || siteConfig.phone;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Honeypot check (anti-bot)
    if (honeypot.trim()) {
      setSubmitSuccess(true);
      return;
    }

    if (cooldownSeconds > 0) {
      setErrorMessage(
        isRoman
          ? `Barahe karam ${cooldownSeconds} second intezar karein.`
          : `Please wait ${cooldownSeconds} seconds before sending another message.`
      );
      return;
    }

    // Validation
    const cleanName = fullName.trim();
    const cleanMsg = message.trim();
    if (cleanName.length < 2 || cleanName.length > 120) {
      setErrorMessage(
        isRoman
          ? 'Naam 2 se 120 huroof ke darmiyan hona chahiye.'
          : 'Name must be between 2 and 120 characters.'
      );
      return;
    }

    if (cleanMsg.length < 3 || cleanMsg.length > 2000) {
      setErrorMessage(
        isRoman
          ? 'Message 3 se 2000 huroof ke darmiyan hona chahiye.'
          : 'Message must be between 3 and 2000 characters.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await CmsService.submitContactMessage({
        fullName: cleanName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        courseInterest: courseInterest.trim() || undefined,
        message: cleanMsg,
      });

      if (!res.ok) {
        setErrorMessage(res.error || 'Failed to submit contact message.');
      } else {
        setSubmitSuccess(true);
        setCooldownSeconds(30);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppRedirect = () => {
    const text = `Assalam o Alaikum! Mera naam ${fullName || 'Student'} hai. Mujhe The Inspire Business Academy ke ${
      courseInterest ? `course "${courseInterest}"` : 'courses'
    } ke bare mein maloomat chahiye. ${message ? `Message: ${message}` : ''}`;

    const encoded = encodeURIComponent(text);
    const digits = whatsappNum.replace(/[^0-9]/g, '');
    const international = digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
    window.open(`https://wa.me/${international}?text=${encoded}`, '_blank');
  };

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Rabta Karein - Sadiqabad Campus' : 'Contact Us - Sadiqabad Campus'}
        description={
          isRoman
            ? `The Inspire Business Academy campus: ${campusAddress}, WhatsApp ${whatsappNum}.`
            : `Contact The Inspire Business Academy in Sadiqabad, Punjab. Connect on WhatsApp ${whatsappNum} or visit our campus.`
        }
        canonicalPath="/contact"
      />

      {/* Hero Header */}
      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="accent" size="md">
              <Phone className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Rabta o Dakhla Helpline' : 'Contact & Admissions'}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Hum Se Rabta Karein' : 'Get In Touch'}
            </h1>

            <p className="text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Dakhla, course details ya batch timings ke hawale se kisi bhi maloomat ke liye hum se direct rabta karein.'
                : 'For course admissions, fee structures, or campus batch inquiries, connect with our team directly.'}
            </p>
          </div>
        </Container>
      </Section>

      {/* Main Contact Grid */}
      <Section variant="white" spacing="lg">
        <Container size="lg">
          {loadError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center space-y-2 max-w-lg mx-auto mb-8">
              <div className="flex items-center justify-center gap-2 text-red-700 text-xs sm:text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <Button size="sm" variant="outline" type="button" onClick={loadData}>
                {isRoman ? 'Dobara Koshish Karein' : 'Retry'}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Contact Details (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <Card elevated bordered className="border-2 border-[#1F3FBF]/20">
                <CardHeader className="bg-[#0F1F5C] text-white">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#FFC20E]" />
                    <CardTitle className="text-white text-lg">
                      {isRoman ? 'Campus Maloomat' : 'Official Information'}
                    </CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4 text-xs sm:text-sm text-[#0F1F5C]">
                  {/* WhatsApp */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F2F5FF]">
                    <MessageCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F1F5C] block">
                        {isRoman ? 'Rasmi WhatsApp (Official)' : 'Official WhatsApp'}
                      </span>
                      <a
                        href={`https://wa.me/92${whatsappNum.replace(/[^0-9]/g, '').slice(1)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-base text-[#1F3FBF] hover:underline"
                      >
                        {whatsappNum}
                      </a>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isRoman ? 'Direct chat aur dakhla maloomat' : 'Fastest response for admissions'}
                      </p>
                    </div>
                  </div>

                  {/* Campus Address */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F2F5FF]">
                    <MapPin className="w-5 h-5 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F1F5C] block">
                        {isRoman ? 'Campus Pata (Address)' : 'Campus Location'}
                      </span>
                      <p className="text-slate-800 font-semibold leading-relaxed mt-0.5">
                        {campusAddress}
                      </p>
                    </div>
                  </div>

                  {/* Operating Hours */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F2F5FF]">
                    <Clock className="w-5 h-5 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F1F5C] block">
                        {isRoman ? 'Oqaat-e-Kar (Hours)' : 'Operational Hours'}
                      </span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {workingDays}: {openTime12} – {closeTime12}
                      </p>
                      <p className="text-xs text-amber-800 font-medium">
                        {siteConfig.offDays} (Hafta aur Itwar Chutti)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sandboxed Google Maps Embed (Only shown if configured and valid) */}
              {safeMapsEmbedUrl && (
                <Card bordered className="overflow-hidden border border-[#1F3FBF]/20 shadow-sm">
                  <div className="w-full h-[360px] bg-slate-100">
                    <iframe
                      src={safeMapsEmbedUrl}
                      title="The Inspire Business Academy Location Map"
                      loading="lazy"
                      className="w-full h-full border-0 rounded-xl"
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                  </div>
                </Card>
              )}

              {/* Social Channels */}
              <Card bordered className="p-5 bg-[#F2F5FF]">
                <h3 className="font-bold text-sm text-[#0F1F5C] mb-3">
                  {isRoman ? 'Rasmi Social Channels' : 'Official Social Channels'}
                </h3>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={siteConfig.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#1F3FBF] hover:text-white text-[#1F3FBF] text-xs font-bold border border-[#1F3FBF]/20 transition-all shadow-2xs"
                  >
                    <span>Facebook Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <a
                    href={siteConfig.social.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-red-600 hover:text-white text-red-600 text-xs font-bold border border-red-200 transition-all shadow-2xs"
                  >
                    <span>YouTube Channel</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </Card>
            </div>

            {/* Contact Form with DB Insertion, Honeypot & 30s Cooldown (7 cols) */}
            <div className="lg:col-span-7">
              <Card elevated bordered className="p-6 sm:p-8">
                <CardHeader className="p-0 pb-4">
                  <Badge variant="accent" size="sm" className="mb-1">
                    {isRoman ? 'Rabta Form' : 'Official Inquiry Form'}
                  </Badge>
                  <CardTitle className="text-xl">
                    {isRoman ? 'Paigham Bhejein' : 'Send Us a Message'}
                  </CardTitle>
                  <CardDescription>
                    {isRoman
                      ? 'Apni maloomat darj karein; hamari team jald az jald aap se rabta karegi.'
                      : 'Fill in your details below. Our admissions office will get back to you promptly.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 pt-4">
                  {submitSuccess ? (
                    <div className="space-y-4 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-900">
                          {isRoman ? 'Shukriya! Paigham Wasool Ho Gaya' : 'Thank You! Message Received'}
                        </h3>
                        <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                          {isRoman
                            ? 'Aapka paigham kamyabi se record ho chuka hai. Hamari team foran jaiza legi.'
                            : 'Your inquiry has been successfully recorded in our database. Our team will contact you shortly.'}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button
                          variant="accent"
                          size="md"
                          onClick={handleWhatsAppRedirect}
                          leftIcon={<MessageCircle className="w-4 h-4 text-emerald-700" />}
                        >
                          {isRoman ? 'WhatsApp Par Rabta Jari Rakhein' : 'Continue on WhatsApp'}
                        </Button>
                        <Button
                          variant="outline"
                          size="md"
                          onClick={() => {
                            setSubmitSuccess(false);
                            setMessage('');
                          }}
                        >
                          {isRoman ? 'Naya Paigham Bhejein' : 'Send Another Message'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {errorMessage && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      {/* Honeypot field (hidden from real users) */}
                      <div className="hidden" aria-hidden="true">
                        <input
                          type="text"
                          name="hp_field"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />
                      </div>

                      <Input
                        label={isRoman ? 'Aapka Mukammal Naam *' : 'Full Name *'}
                        placeholder={isRoman ? 'e.g. Muhammad Usman' : 'e.g. Muhammad Usman'}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={isSubmitting}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label={isRoman ? 'Phone / WhatsApp Number' : 'Phone / WhatsApp'}
                          placeholder="0300-1234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          disabled={isSubmitting}
                        />

                        <Input
                          label={isRoman ? 'Email Pata (Ikhtiyari)' : 'Email Address (Optional)'}
                          placeholder="student@example.com"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>

                      <Input
                        label={isRoman ? 'Kis Course Mein Dilchaspi Hai?' : 'Interested Course'}
                        placeholder="e.g. AI Web Development, YouTube Monetization..."
                        value={courseInterest}
                        onChange={(e) => setCourseInterest(e.target.value)}
                        disabled={isSubmitting}
                      />

                      <Textarea
                        label={isRoman ? 'Aapka Paigham Ya Sawal *' : 'Your Message / Inquiry *'}
                        placeholder={isRoman ? 'Apna sawal yahan likhein (kam az kam 3 huroof)...' : 'Write your question here...'}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        required
                        disabled={isSubmitting}
                      />

                      <div className="space-y-3 pt-2">
                        <Button
                          variant="primary"
                          type="submit"
                          fullWidth
                          size="lg"
                          disabled={isSubmitting || cooldownSeconds > 0}
                          rightIcon={<Send className="w-4 h-4 ml-1" />}
                        >
                          {isSubmitting
                            ? (isRoman ? 'Bheja ja raha hai...' : 'Sending...')
                            : cooldownSeconds > 0
                            ? (isRoman ? `Intezar karein (${cooldownSeconds}s)` : `Cooldown (${cooldownSeconds}s)`)
                            : (isRoman ? 'Paigham Bhejein' : 'Send Message')}
                        </Button>

                        <div className="text-center">
                          <button
                            type="button"
                            onClick={handleWhatsAppRedirect}
                            className="text-xs text-[#1F3FBF] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isRoman ? 'Ya seedha WhatsApp par message karein' : 'Or message directly on WhatsApp'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
};
