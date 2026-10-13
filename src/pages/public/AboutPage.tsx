import React, { useState, useEffect } from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { SectionHeading } from '../../components/ui/SectionHeading';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { SiteSettingsPublic } from '../../types';
import { User, Target, ShieldCheck, MapPin, Building2, Laptop, ArrowRight, Phone, Award, Users, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
      } catch (err) {
        console.warn('Failed to load settings in AboutPage:', err);
      }
    }
    loadData();
  }, []);

  const founderName = settings?.founderName || 'Adeel Bhatti';
  const founderImage = settings?.founderImageUrl;
  const leftImage = settings?.aboutLeftImageUrl;
  const rightImage = settings?.aboutRightImageUrl;

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Hamare Bare Mein - The Inspire Business Academy' : 'About Us - The Inspire Business Academy'}
        description={
          isRoman
            ? 'The Inspire Business Academy aur iske founder Adeel Bhatti ka safar aur mission Hunarmand Pakistan. Sadiqabad campus.'
            : 'Learn about The Inspire Business Academy, our founder Adeel Bhatti, and our commitment to practical digital education under the Hunarmand Pakistan mission.'
        }
        canonicalPath="/about"
      />

      {/* Page Hero */}
      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="accent" size="md">
              <span>{siteConfig.mission}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Hamare Bare Mein' : 'About The Academy'}
            </h1>

            <p className="text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Sadiqabad mein digital hunar aur karobari taleem ka idara jahan har talib e ilm ko practical maharat sikhana pehli tarjeeh hai.'
                : 'A dedicated center for practical commercial and digital technology education based in Sadiqabad, Punjab, Pakistan.'}
            </p>
          </div>
        </Container>
      </Section>

      {/* Stats Strip */}
      <section className="bg-[#0F1F5C] text-white py-8 border-y border-[#FFC20E]/30">
        <Container size="lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black font-display text-[#FFC20E]">10+</span>
              <p className="text-xs text-white/80 font-medium">{isRoman ? 'Rasmi Courses' : 'Official Programs'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black font-display text-[#FFC20E]">70%</span>
              <p className="text-xs text-white/80 font-medium">{isRoman ? 'Pass Standard' : 'Passing Threshold'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black font-display text-[#FFC20E]">04</span>
              <p className="text-xs text-white/80 font-medium">{isRoman ? 'Campus Batches' : 'Daily Lab Batches'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-3xl sm:text-4xl font-black font-display text-[#FFC20E]">Rs. 0</span>
              <p className="text-xs text-white/80 font-medium">{isRoman ? 'Dakhla Fee' : 'Admission Fee'}</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Core Mission & Founder Section */}
      <Section variant="white" spacing="lg">
        <Container size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Leadership Profile (5 cols) */}
            <div className="lg:col-span-5">
              <Card elevated bordered className="border-2 border-[#1F3FBF]/20 overflow-hidden shadow-lg">
                <div className="bg-gradient-to-br from-[#0F1F5C] to-[#1F3FBF] p-8 text-center text-white">
                  {founderImage ? (
                    <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-4 border-[#FFC20E] shadow-md bg-slate-100">
                      <img
                        src={founderImage}
                        alt={founderName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-4 border-2 border-[#FFC20E] shadow-md">
                      <User className="w-12 h-12 text-[#FFC20E]" />
                    </div>
                  )}
                  <h2 className="text-xl font-bold font-display text-white">
                    {founderName}
                  </h2>
                  <p className="text-xs text-[#FFC20E] font-semibold mt-0.5">
                    Founder & Lead Mentor
                  </p>
                  <p className="text-[11px] text-white/70 mt-2">
                    The Inspire Business Academy &bull; Sadiqabad
                  </p>
                </div>

                <div className="p-6 space-y-3 text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed">
                  <p>
                    {isRoman
                      ? 'Adeel Bhatti ki nigrani mein The Inspire Business Academy practical taleem par zor deti hai. Tulba ko real projects par kaam karwa kar unka confidence barhaya jata hai.'
                      : 'Under the direct mentorship of Adeel Bhatti, the academy emphasizes hands-on software mastery, active portfolio creation, and practical client readiness.'}
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-[#1F3FBF] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Dedicated to Hunarmand Pakistan</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Narrative / Mission (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1F3FBF] block mb-1">
                  {isRoman ? 'Idaray Ka Maqsad' : 'Our Academy Mission'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold font-display text-[#0F1F5C]">
                  {isRoman ? 'Nazar-o-Fikr: Hunarmand Pakistan' : 'The Vision of a Skilled Pakistan'}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-[#0F1F5C]/85 leading-relaxed">
                {isRoman
                  ? 'The Inspire Business Academy ka qayam is maqsad ke tehat hua ke Sadiqabad aur ird-gird ke nojawano ko aisi digital aur practical maharatein sikhayi jayein jin se woh online freelancing, digital marketing aur e-commerce ke zariye rozi kama sakein.'
                  : 'The Inspire Business Academy was founded to bridge the gap between traditional theoretical education and practical commercial skills. Our programs are designed to empower students with immediate, actionable capabilities in web technology, graphic design, video production, e-commerce, and office administration.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/15 space-y-1">
                  <Building2 className="w-5 h-5 text-[#1F3FBF] mb-1" />
                  <h4 className="font-bold text-sm text-[#0F1F5C]">Physical Campus</h4>
                  <p className="text-xs text-[#0F1F5C]/75">
                    {isRoman ? 'Sadiqabad campus par computer lab aur alag alag batches' : 'Fully equipped campus lab in Sadiqabad with separate batches'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/15 space-y-1">
                  <Laptop className="w-5 h-5 text-[#1F3FBF] mb-1" />
                  <h4 className="font-bold text-sm text-[#0F1F5C]">Online Learning</h4>
                  <p className="text-xs text-[#0F1F5C]/75">
                    {isRoman ? 'Ghar baithe recorded courses aur 70% exam passing standard' : 'Self-paced recorded lessons backed by verified certification'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link to="/courses">
                  <Button variant="primary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {t.nav.courses}
                  </Button>
                </Link>

                <a
                  href={`https://wa.me/92${siteConfig.whatsapp.replace(/[^0-9]/g, '').slice(1)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="md" leftIcon={<Phone className="w-4 h-4 text-emerald-600" />}>
                    WhatsApp: {siteConfig.whatsapp}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Campus Learning Environment & Facilities (renders Supabase images) */}
      {(leftImage || rightImage) && (
        <Section variant="light" spacing="lg" className="border-t border-[#1F3FBF]/10">
          <Container size="lg">
            <SectionHeading
              eyebrow={isRoman ? 'Academy Ka Mahaul' : 'Learning Environment'}
              title={isRoman ? 'Sadiqabad Campus Sahooliyat' : 'Sadiqabad Campus & Training Facilities'}
              description={
                isRoman
                  ? 'Tulba keliye air-conditioned computer workstations, tez tareen internet aur pur-sukoon mahol.'
                  : 'Modern computer lab workstations with high-speed connectivity and hands-on mentored workspace.'
              }
              align="center"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {leftImage && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md">
                  <div className="h-64 overflow-hidden bg-slate-100">
                    <img
                      src={leftImage}
                      alt="Academy Campus Facility 1"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="p-4 bg-white">
                    <h4 className="font-bold text-sm text-[#0F1F5C]">
                      {isRoman ? 'Dedicated Computer Lab' : 'Dedicated Computer Lab'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {isRoman ? 'Haftawar practical tests aur software training' : 'Workstations for hands-on software training'}
                    </p>
                  </div>
                </div>
              )}

              {rightImage && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md">
                  <div className="h-64 overflow-hidden bg-slate-100">
                    <img
                      src={rightImage}
                      alt="Academy Campus Facility 2"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="p-4 bg-white">
                    <h4 className="font-bold text-sm text-[#0F1F5C]">
                      {isRoman ? 'Collaborative Learning Space' : 'Collaborative Learning Space'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {isRoman ? 'Live batch lectures aur mentoring sessions' : 'Interactive lectures and personal project guidance'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Container>
        </Section>
      )}
    </div>
  );
};
