import React from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { ShieldCheck, Lock, Eye, Server, Phone } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Privacy Policy - The Inspire Business Academy' : 'Privacy Policy - The Inspire Business Academy'}
        description={
          isRoman
            ? 'The Inspire Business Academy ki privacy policy. Tulba ke zaati data aur payment records ki hifazat ke usool.'
            : 'Official Privacy Policy of The Inspire Business Academy regarding student information, payment proofs, and data security.'
        }
        canonicalPath="/privacy"
      />

      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="secondary" size="md">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1F3FBF]" />
              <span>{isRoman ? 'Qanooni o Policy Dastavez' : 'Official Policy Document'}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Privacy Policy (Zaati Data Ki Hifazat)' : 'Privacy Policy'}
            </h1>

            <p className="text-xs sm:text-sm text-[#0F1F5C]/75">
              {isRoman ? 'Aakhri Tarmeem: October 2026' : 'Last Updated: October 2026'} &bull; {siteConfig.name}
            </p>
          </div>
        </Container>
      </Section>

      <Section variant="white" spacing="lg">
        <Container size="md">
          <Card elevated bordered className="p-6 sm:p-10 space-y-8 text-xs sm:text-sm text-[#0F1F5C]/85 leading-relaxed">
            {/* 1. Introduction */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-[#0F1F5C]">
                1. {isRoman ? 'Bunyadi Usool (Introduction)' : 'Introduction & Scope'}
              </h2>
              <p>
                {isRoman
                  ? 'The Inspire Business Academy tulba aur dakhla lene walay afrad ke zaati data ki hifazat ko intehayi ahem samajhti hai. Yeh policy wazahat karti hai ke dakhla, verification aur portal ke dauran aapka data kis tarah mehfooz rakha jata hai.'
                  : 'The Inspire Business Academy values your trust and is committed to protecting your personal information. This Privacy Policy outlines our practices regarding data collection, storage, and privacy safeguards across our physical and online platforms.'}
              </p>
            </div>

            {/* 2. Data We Collect */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-[#0F1F5C]">
                2. {isRoman ? 'Jo Maloomat Hum Jama Karte Hain' : 'Information We Collect'}
              </h2>
              <p>
                {isRoman ? 'Dakhla aur account activation ke liye darj zail maloomat li jaati hain:' : 'We collect only essential data required for academic administration:'}
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-slate-700">
                <li><strong>{isRoman ? 'Zaati Maloomat:' : 'Personal Details:'}</strong> {isRoman ? 'Mukammal naam, rabta number (WhatsApp), aur email address.' : 'Full name, WhatsApp contact number, and email address.'}</li>
                <li><strong>{isRoman ? 'Adaigi Ke Saboot:' : 'Payment Verification Proofs:'}</strong> {isRoman ? 'Bank, JazzCash ya Easypaisa ki transaction ID aur payment screenshot jo strictly private storage mein mehfooz kiye jaate hain.' : 'Transaction ID and payment proof screenshots stored in secure private storage.'}</li>
                <li><strong>{isRoman ? 'Taleemi Records:' : 'Academic Performance Records:'}</strong> {isRoman ? 'Hazri (attendance), test scores, aur final exam passing marks.' : 'Attendance records, weekly test results, and final exam grades.'}</li>
              </ul>
            </div>

            {/* 3. Storage & Security */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-[#0F1F5C]">
                3. {isRoman ? 'Data Ki Hifazat Aur Storage' : 'Data Storage & Security Controls'}
              </h2>
              <p>
                {isRoman
                  ? 'Tamam online accounts Supabase Authentication aur Row Level Security (RLS) ke zariye mehfooz hain. Kisi bhi student ka payment screenshot ya assignment file public internet par dastiyab nahi hoti.'
                  : 'All user data is protected by industry-standard encryption, Supabase Authentication, and strict database Row Level Security (RLS) policies. Private student files and payment proofs are never accessible via public URLs.'}
              </p>
            </div>

            {/* 4. No Third-Party Sharing */}
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-bold font-display text-[#0F1F5C]">
                4. {isRoman ? 'Teesray Fareeq Se Share Na Karna' : 'No Third-Party Sharing or Selling'}
              </h2>
              <p>
                {isRoman
                  ? 'Hum kisi bhi soorat mein tulba ke mobile numbers ya zaati data ko kisi marketing company ya teesray fareeq ko farokht ya share nahi karte. Rabta sirf academy related maloomat ke liye hota hai.'
                  : 'We strictly do not sell, rent, or trade student phone numbers, email addresses, or personal records to external marketing entities. Your details are used exclusively for academy educational communications.'}
              </p>
            </div>

            {/* 5. Contact Regarding Privacy */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-slate-500 font-semibold">
                Sadiqabad Campus &bull; Phone: {siteConfig.phone}
              </span>
              <a
                href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#1F3FBF] hover:underline"
              >
                Privacy Inquiries on WhatsApp &rarr;
              </a>
            </div>
          </Card>
        </Container>
      </Section>
    </div>
  );
};
