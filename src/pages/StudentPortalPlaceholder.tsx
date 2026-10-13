import React from 'react';
import { useTranslation } from '../i18n';
import { Container } from '../components/ui/Container';
import { Section } from '../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { GraduationCap, ArrowLeft, BookOpen, Clock, Calendar, LogOut, CheckCircle2, User, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SEO } from '../components/common/SEO';

export const StudentPortalPlaceholder: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Section variant="light" spacing="lg">
      <SEO
        title={isRoman ? 'Online Student Portal - The Inspire Business Academy' : 'Student Portal - The Inspire Business Academy'}
        description="Online Student LMS Portal foundation for enrolled students."
        canonicalPath="/student"
      />
      <Container size="md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {t.common.backToHome}
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            {isRoman ? 'Logout' : 'Log Out'}
          </Button>
        </div>

        <Card elevated bordered className="text-center p-6 sm:p-10 border border-[#1F3FBF]/20 bg-white">
          <div className="w-16 h-16 rounded-2xl bg-[#F2F5FF] text-[#1F3FBF] border border-[#1F3FBF]/20 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <GraduationCap className="w-8 h-8" />
          </div>

          <Badge variant="primary" size="sm" className="mb-3">
            Authenticated Online Student &bull; Phase 4 Verified
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Khush Aamdeed, Online Student Portal' : 'Welcome to the Student LMS Portal'}
          </h1>

          {/* Authenticated user profile banner */}
          <div className="mt-4 p-4 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/15 max-w-md mx-auto text-left text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Logged in Name:</span>
              <span className="font-bold text-[#0F1F5C]">{profile?.fullName || 'Online Learner'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Email:</span>
              <span className="font-medium text-[#0F1F5C]">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Verified Role:</span>
              <span className="font-bold text-[#1F3FBF] uppercase tracking-wider">{role || 'online_student'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Auth State:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Session Active
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed max-w-lg mx-auto">
            {isRoman
              ? 'Phase 4 Authentication & Protection mukammal hai. Mukammal video player, recorded lessons, assignments aur quizzes Phase 7 (Student LMS Portal) mein shamil kiye jayenge.'
              : 'Phase 4 Authentication & Role-based route guard is active. The full video player, watermarked lessons, quizzes, and certificates will be deployed in Phase 7.'}
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10 text-xs">
              <BookOpen className="w-4 h-4 text-[#1F3FBF] mb-1" />
              <p className="font-bold text-[#0F1F5C]">My Courses</p>
              <p className="text-slate-500 mt-0.5">Recorded lessons with watermarked deterrence (Phase 7)</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10 text-xs">
              <Clock className="w-4 h-4 text-[#1F3FBF] mb-1" />
              <p className="font-bold text-[#0F1F5C]">Progress & Quizzes</p>
              <p className="text-slate-500 mt-0.5">Automated attempt history & 70% exam pass tracking</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10 text-xs">
              <Calendar className="w-4 h-4 text-[#1F3FBF] mb-1" />
              <p className="font-bold text-[#0F1F5C]">Verified Sanad</p>
              <p className="text-slate-500 mt-0.5">Publicly verifiable QR credentials upon graduation</p>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
};
