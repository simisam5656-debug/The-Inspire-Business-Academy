import React from 'react';
import { SEO } from '../../components/common/SEO';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { Building2, Laptop, ArrowRight, CheckCircle2, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const JoinPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  return (
    <div className="w-full">
      <SEO
        title={isRoman ? 'Dakhla Chunein - Physical vs Online' : 'Choose Your Admission - Physical vs Online'}
        description={
          isRoman
            ? 'The Inspire Business Academy mein dakhlay ka intikhab karein. Sadiqabad campus par 6-Mah Physical Package ya self-paced Online Courses.'
            : 'Choose between the 6-month Physical Academy package in Sadiqabad or self-paced Online Learning with The Inspire Business Academy.'
        }
        canonicalPath="/join"
      />

      {/* Hero Header */}
      <Section variant="light" spacing="md" className="border-b border-[#1F3FBF]/10">
        <Container size="md">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="accent" size="md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRoman ? 'Dakhla Ka Intikhab' : 'Admission Pathway'}</span>
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-[#0F1F5C] tracking-tight">
              {isRoman ? 'Academy Mein Dakhla Lein' : 'Join The Academy'}
            </h1>

            <p className="text-sm sm:text-base text-[#0F1F5C]/80 leading-relaxed">
              {isRoman
                ? 'Apni zaroorat aur saholat ke mutabiq Physical Campus ya Online Learning mein se intikhab karein.'
                : 'Select the learning model that best fits your schedule, location, and career ambitions.'}
            </p>
          </div>
        </Container>
      </Section>

      {/* Comparative Pathway Cards */}
      <Section variant="white" spacing="lg">
        <Container size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Pathway 1: Physical Academy */}
            <Card hoverable bordered className="border-2 border-[#1F3FBF]/30 flex flex-col justify-between">
              <div>
                <CardHeader className="bg-[#1F3FBF] text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFC20E] font-bold">
                      Option 1
                    </span>
                    <Badge variant="accent" size="sm">
                      Sadiqabad Campus
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
                        {isRoman ? '6-Mah Mukammal Lab Package' : 'Complete 6-Month Lab Immersion'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-6 text-xs sm:text-sm text-[#0F1F5C]">
                  <div className="p-4 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/15">
                    <span className="text-xs text-slate-500 font-semibold block uppercase">
                      {isRoman ? 'Package Fee' : 'Package Fee'}
                    </span>
                    <span className="text-2xl font-black text-[#1F3FBF] font-display">
                      Rs. {siteConfig.physicalPackage.monthlyFee.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-600">
                        / month (Total: Rs. {siteConfig.physicalPackage.totalPackage.toLocaleString()})
                      </span>
                    </span>
                    <span className="block text-[11px] text-emerald-700 font-bold mt-0.5">
                      Admission Fee: Rs. {siteConfig.physicalPackage.admissionFee} (No Admission Fee) &bull; No Hidden Charges &bull; {siteConfig.physicalPackage.schedule}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#0F1F5C]/85">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>All {siteConfig.physicalPackage.courseCount} Courses:</strong> {isRoman ? `Tamam ${siteConfig.physicalPackage.courseCount} courses aik package mein shamil hain` : `All ${siteConfig.physicalPackage.courseCount} courses included in one package`}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>Computer Lab Workstations:</strong> {isRoman ? 'Agar personal laptop na ho toh academy computer lab workstations par practice dastiyab hai' : 'Dedicated computer lab workstations available during batch hours for students without personal laptops'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>Separate Batches:</strong> {isRoman ? 'Girls aur boys ke liye alag alag makhsoos timings' : 'Dedicated separate timings for girls and boys'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>Weekly Practical Tests:</strong> {isRoman ? 'Haftawar practical aur written testing' : 'Weekly practical and written assessments'}</span>
                    </li>
                  </ul>
                </CardContent>
              </div>

              <CardFooter className="pt-4">
                <Link to="/join/physical" className="w-full">
                  <Button variant="primary" fullWidth size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {isRoman ? 'Physical Dakhla Ki Tafseelat' : 'Physical Admission Details'}
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Pathway 2: Online LMS */}
            <Card hoverable bordered className="border-2 border-[#FFC20E]/50 flex flex-col justify-between">
              <div>
                <CardHeader className="bg-[#0F1F5C] text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#FFC20E] font-bold">
                      Option 2
                    </span>
                    <Badge variant="accent" size="sm">
                      Online LMS
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
                        {isRoman ? 'Recorded Courses • 6 Mah Access' : 'Recorded Courses • 6 Months Access'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-6 text-xs sm:text-sm text-[#0F1F5C]">
                  <div className="p-4 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/15">
                    <span className="text-xs text-slate-500 font-semibold block uppercase">
                      {isRoman ? 'Course Fee' : 'Course Fee'}
                    </span>
                    <span className="text-2xl font-black text-[#0F1F5C] font-display">
                      Rs. 5,000 <span className="text-xs font-normal text-slate-600">/ {isRoman ? 'course (6 mah rasai)' : 'course (6 months)'}</span>
                    </span>
                    <span className="block text-[11px] text-[#1F3FBF] font-semibold mt-0.5">
                      JazzCash &bull; Easypaisa &bull; Bank Transfer
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#0F1F5C]/85">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>High-Quality Recorded Videos:</strong> {isRoman ? 'Apne waqt par kabhi bhi lectures dekhein' : 'Stream high-definition lectures anytime from home'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>Secure Lesson Player:</strong> {isRoman ? 'Watermark deterrence aur lesson progress' : 'Protected lesson player with personal watermark'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>70% Final Exam:</strong> {isRoman ? '70% marks hasil karne par sanad milti hai' : '70% score required for graduation qualification'}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#1F3FBF] shrink-0 mt-0.5" />
                      <span><strong>Verified QR Certificate:</strong> {isRoman ? 'Online tasdeeq shuda digital credential' : 'Publicly verifiable digital completion certificate'}</span>
                    </li>
                  </ul>
                </CardContent>
              </div>

              <CardFooter className="pt-4">
                <Link to="/join/online" className="w-full">
                  <Button variant="accent" fullWidth size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {isRoman ? 'Online Dakhla Ki Tafseelat' : 'Online Registration Details'}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </Container>
      </Section>
    </div>
  );
};
