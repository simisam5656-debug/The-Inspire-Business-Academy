import React from 'react';
import { useTranslation } from '../i18n';
import { Container } from '../components/ui/Container';
import { Section } from '../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Shield, ArrowLeft, Users, CreditCard, Award, LogOut, CheckCircle2, FileText, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SEO } from '../components/common/SEO';

export const AdminPortalPlaceholder: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile, role, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Section variant="light" spacing="lg">
      <SEO
        title={isRoman ? 'Admin Control Panel - The Inspire Business Academy' : 'Admin Control Panel - The Inspire Business Academy'}
        description="Administrative management console for academy staff."
        canonicalPath="/admin"
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

        <Card elevated bordered className="text-center p-6 sm:p-10 border-2 border-[#0F1F5C]/25 bg-white shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Shield className="w-8 h-8" />
          </div>

          <Badge variant="navy" size="sm" className="mb-3">
            Staff Authority &bull; {isSuperAdmin ? 'Super Admin' : 'Manager'}
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0F1F5C] tracking-tight">
            {isRoman ? 'Academy Admin Control Panel (/admin)' : 'Academy Admin Control Panel (/admin)'}
          </h1>

          {/* Authenticated Admin Banner */}
          <div className="mt-4 p-4 rounded-xl bg-[#F2F5FF] border border-[#0F1F5C]/15 max-w-md mx-auto text-left text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Administrator Name:</span>
              <span className="font-bold text-[#0F1F5C]">{profile?.fullName || 'Academy Staff'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Admin Email:</span>
              <span className="font-medium text-[#0F1F5C]">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Privilege Level:</span>
              <span className="font-bold text-[#0F1F5C] uppercase tracking-wider">{role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">RLS Enforcement:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Database Security Verified
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs sm:text-sm text-[#0F1F5C]/80 leading-relaxed max-w-lg mx-auto">
            {isRoman
              ? 'Phase 4 Authentication & Administrative Role Protection kamyab hai. Physical student records (B01, G01), fee installment receipts, online admissions approval, aur CMS Phase 5 (Admin Core) mein launch honge.'
              : 'Phase 4 Authentication & Role-based route guard is fully enforced. Complete batch management, fee installment receipts, admission approval, and CMS will be launched in Phase 5.'}
          </p>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10 text-xs">
              <Users className="w-4 h-4 text-[#1F3FBF] mb-1" />
              <p className="font-bold text-[#0F1F5C]">Physical Academy Core</p>
              <p className="text-slate-500 mt-0.5">Roll numbers (B01, G01), batches & attendance (Phase 5)</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10 text-xs">
              <FileText className="w-4 h-4 text-[#1F3FBF] mb-1" />
              <p className="font-bold text-[#0F1F5C]">Admissions Queue</p>
              <p className="text-slate-500 mt-0.5">Review physical & online admission requests (Phase 5)</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#F2F5FF] border border-[#1F3FBF]/10 text-xs">
              <CreditCard className="w-4 h-4 text-[#1F3FBF] mb-1" />
              <p className="font-bold text-[#0F1F5C]">Fee Verification</p>
              <p className="text-slate-500 mt-0.5">Physical installments & online payment approvals (Phase 5)</p>
            </div>
          </div>
        </Card>
      </Container>
    </Section>
  );
};
