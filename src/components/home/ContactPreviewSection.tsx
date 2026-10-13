import React, { useState, useEffect } from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { SiteSettingsPublic } from '../../types';
import { formatTime12h } from '../../utils/url';
import { Phone, MapPin, Clock, ExternalLink, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ContactPreviewSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
      } catch (err) {
        console.warn('Failed to load settings in ContactPreviewSection:', err);
      }
    }
    loadSettings();
  }, []);

  const phone = settings?.phone || siteConfig.phone;
  const whatsapp = settings?.whatsapp || siteConfig.whatsapp;
  const location = settings?.campusAddress || siteConfig.location;
  const openTime12 = formatTime12h(settings?.operatingHoursOpen || settings?.openingTime || '09:00', '9:00 AM');
  const closeTime12 = formatTime12h(settings?.operatingHoursClose || settings?.closingTime || '19:00', '7:00 PM');
  const workingDays = settings?.workingDaysText || 'Monday – Friday';
  const facebookUrl = settings?.socialFacebook || siteConfig.social.facebook;
  const youtubeUrl = settings?.socialYoutube || siteConfig.social.youtube;
  const instagramUrl = settings?.socialInstagram;

  return (
    <Section variant="white" spacing="lg" id="contact-preview">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Rabta Karein' : 'Get In Touch'}
          title={isRoman ? 'Hum Se Rabta Kaise Karein?' : 'Visit or Connect with Our Team'}
          description={
            isRoman
              ? 'Sadiqabad campus par tashreef layein ya WhatsApp par direct message karein.'
              : 'Direct verified contact channels for course admissions and campus inquiries.'
          }
          align="center"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Phone / WhatsApp Card */}
          <Card hoverable className="text-center p-6 border border-[#1F3FBF]/15">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#0F1F5C] font-display">
              WhatsApp Helpline
            </h3>
            <p className="text-xs text-[#0F1F5C]/75 mt-1">
              {isRoman ? 'Admissions aur sawalat ke liye' : 'Admissions & quick inquiries'}
            </p>
            <p className="text-base font-black text-[#1F3FBF] font-display mt-3">
              {whatsapp}
            </p>
            <div className="mt-4">
              <a
                href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '').startsWith('0') ? '92' + whatsapp.replace(/[^0-9]/g, '').slice(1) : whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full block"
              >
                <Button variant="accent" fullWidth size="sm">
                  {isRoman ? 'WhatsApp Message Bhejein' : 'Send WhatsApp Message'}
                </Button>
              </a>
            </div>
          </Card>

          {/* Location Card */}
          <Card hoverable className="text-center p-6 border border-[#1F3FBF]/15">
            <div className="w-12 h-12 rounded-2xl bg-[#F2F5FF] text-[#1F3FBF] flex items-center justify-center mx-auto mb-4 border border-[#1F3FBF]/20">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#0F1F5C] font-display">
              Sadiqabad Campus
            </h3>
            <p className="text-xs text-[#0F1F5C]/75 mt-1">
              {isRoman ? 'Physical lab aur classes' : 'Physical lab and classes'}
            </p>
            <p className="text-sm font-semibold text-[#0F1F5C] mt-3">
              {location}
            </p>
            <div className="mt-4">
              <Link to="/contact" className="w-full block">
                <Button variant="outline" fullWidth size="sm">
                  {isRoman ? 'Campus Tafseelat' : 'View Campus Details'}
                </Button>
              </Link>
            </div>
          </Card>

          {/* Working Hours & Social Card */}
          <Card hoverable className="text-center p-6 border border-[#1F3FBF]/15">
            <div className="w-12 h-12 rounded-2xl bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#0F1F5C] font-display">
              {isRoman ? 'Auqat e Kaar' : 'Operating Hours'}
            </h3>
            <p className="text-xs text-[#0F1F5C]/75 mt-1">
              {workingDays}: {openTime12} – {closeTime12}
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#F2F5FF] hover:bg-[#1F3FBF] hover:text-white text-[#1F3FBF] text-xs font-semibold transition-colors inline-flex items-center gap-1 border border-[#1F3FBF]/20"
              >
                <span>Facebook</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#F2F5FF] hover:bg-red-600 hover:text-white text-red-600 text-xs font-semibold transition-colors inline-flex items-center gap-1 border border-red-200"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
};
