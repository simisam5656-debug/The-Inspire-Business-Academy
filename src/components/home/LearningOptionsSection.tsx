import React, { useState, useEffect } from 'react';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { CmsService } from '../../services/cmsService';
import { SiteSettingsPublic } from '../../types';
import { Building2, Laptop, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LearningOptionsSection: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [settings, setSettings] = useState<SiteSettingsPublic | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await CmsService.getSiteSettings();
        setSettings(s);
      } catch (err) {
        console.warn('Failed to load settings in LearningOptionsSection:', err);
      }
    }
    loadData();
  }, []);

  const onlinePrice = settings?.onlineCoursePrice ?? 5000;
  const onlineMonths = settings?.onlineCourseDurationMonths ?? 6;
  const physicalMonthly = settings?.physicalMonthlyFee ?? siteConfig.physicalPackage.monthlyFee;
  const physicalTotal = settings?.physicalTotalFee ?? siteConfig.physicalPackage.totalPackage;
  const physicalCourseCount = settings?.physicalCourseCount ?? siteConfig.physicalPackage.courseCount;
  const scheduleText = settings?.workingDaysText || siteConfig.physicalPackage.schedule;

  return (
    <Section variant="light" spacing="lg" id="learning-options">
      <Container size="lg">
        <SectionHeading
          eyebrow={isRoman ? 'Taleemi Tareeqay' : 'Learning Modes'}
          title={isRoman ? 'Do Munfarid Seekhne Ke Tareeqay' : 'Choose Your Preferred Learning Pathway'}
          description={
            isRoman
              ? 'Apni saholat ke mutabiq Sadiqabad campus par physical lab training lein ya ghar baithe online recorded courses se faida uthayein.'
              : 'Choose between in-person computer lab immersion at our Sadiqabad campus or flexible self-paced recorded online courses.'
          }
          align="center"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Physical Academy Option */}
          <Card hoverable bordered className="border-2 border-[#1F3FBF]/25 bg-white flex flex-col justify-between">
            <div>
              <CardHeader className="bg-[#1F3FBF] text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFC20E] font-bold">
                    In-Person Learning
                  </span>
                  <Badge variant="accent" size="sm">
                    {isRoman ? 'Sadiqabad Campus' : 'Sadiqabad Campus'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-xl">
                      {isRoman ? 'Physical Academy (Campus)' : 'Physical Academy (Campus)'}
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      {isRoman ? 'Mukammal 6-Mah Practical Package' : 'Complete 6-Month Hands-On Package'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">
                <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                    {isRoman ? 'Monthly Lab Charges' : 'Monthly Lab Charges'}
                  </span>
                  <span className="text-2xl font-black text-[#1F3FBF] font-display">
                    Rs. {physicalMonthly.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-[#0F1F5C]">
                      / month (Total: Rs. {physicalTotal.toLocaleString()})
                    </span>
                  </span>
                  <span className="block text-[11px] text-emerald-700 font-bold mt-0.5">
                    Admission Fee: Rs. 0 &bull; No Hidden Charges
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs sm:text-sm text-[#0F1F5C]/85">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>All {physicalCourseCount} Courses Included:</strong> {isRoman ? `Tamam ${physicalCourseCount} courses is package ka hissa hain` : `All ${physicalCourseCount} curriculum courses are covered`}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>Computer Lab Workstations:</strong> {isRoman ? 'Academy lab mein workstations dastiyab hain' : 'Dedicated computer lab machines available during batch hours'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>Classes Schedule:</strong> {scheduleText}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>Separate Batches:</strong> {isRoman ? 'Khawateen aur nojawano ke liye alag alag makhsoos timings' : 'Dedicated separate timings for girls and boys batches'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>Weekly Testing:</strong> {isRoman ? 'Haftawar written aur practical assessments' : 'Weekly written and practical assessments'}</span>
                  </li>
                </ul>
              </CardContent>
            </div>

            <CardFooter className="pt-4">
              <Link to="/join/physical" className="w-full">
                <Button variant="primary" fullWidth size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {isRoman ? 'Physical Academy Join Karein' : 'Join Physical Academy'}
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Online LMS Option */}
          <Card hoverable bordered className="border-2 border-[#FFC20E]/40 bg-white flex flex-col justify-between">
            <div>
              <CardHeader className="bg-[#0F1F5C] text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFC20E] font-bold">
                    Self-Paced Learning
                  </span>
                  <Badge variant="accent" size="sm">
                    {isRoman ? 'Recorded LMS' : 'Recorded LMS'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#FFC20E]">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-xl">
                      {isRoman ? 'Online Learning (Self-Paced)' : 'Online Learning (Self-Paced)'}
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      {isRoman ? `Recorded Lectures • ${onlineMonths} Months Access` : `Recorded Lectures • ${onlineMonths} Months Access`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-6">
                <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10">
                  <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                    {isRoman ? 'Per Course Price' : 'Price Per Course'}
                  </span>
                  <span className="text-2xl font-black text-[#0F1F5C] font-display">
                    Rs. {onlinePrice.toLocaleString()} per course
                  </span>
                  <span className="block text-xs font-semibold text-[#1F3FBF] mt-1">
                    {onlineMonths} months access &bull; JazzCash &bull; Easypaisa &bull; Bank Transfer
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs sm:text-sm text-[#0F1F5C]/85">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>High-Quality Recorded Lessons:</strong> {isRoman ? 'Apni marzi ke waqt par high-definition lectures dekhein' : 'Study at your own schedule with high-definition video lessons'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>Security & Watermark Protection:</strong> {isRoman ? 'Protected lesson player aur step-by-step progress' : 'Protected streaming player with personal watermark deterrence'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>70% Final Exam Threshold:</strong> {isRoman ? 'Quality exam pass karke sanad hasil karein' : 'Qualify for certificate by passing the 70% threshold exam'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                    <span><strong>Verified QR Certificate:</strong> {isRoman ? 'Online tasdeeq shuda digital certificate' : 'Publicly verifiable digital completion credential'}</span>
                  </li>
                </ul>
              </CardContent>
            </div>

            <CardFooter className="pt-4">
              <Link to="/join/online" className="w-full">
                <Button variant="accent" fullWidth size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  {isRoman ? 'Online Course Chunein' : 'Choose Online Course'}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </Container>
    </Section>
  );
};
