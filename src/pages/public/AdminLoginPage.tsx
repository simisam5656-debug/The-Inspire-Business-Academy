import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, ArrowLeft, Lock, AlertCircle, Eye, EyeOff, ShieldAlert, CheckCircle2, LogOut, Shield } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SEO } from '../../components/common/SEO';

export const AdminLoginPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { signIn, user, profile, role, isStaff, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fromLocation = (location.state as any)?.from?.pathname || '/admin';

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage(
        isRoman
          ? 'Email aur password dono darj karein.'
          : 'Please enter both administrative email and password.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn(
        {
          email: email.trim().toLowerCase(),
          password,
        },
        isRoman
      );

      if (!res.success) {
        setErrorMessage(res.error || (isRoman ? 'Admin login nahi ho saka.' : 'Authentication failed.'));
        setIsSubmitting(false);
        return;
      }

      // CRITICAL SECURITY ENFORCEMENT:
      // Verify that the authenticated user has super_admin or manager role.
      // If an online student tries to log in through admin portal, reject immediately!
      const userRole = res.role;
      if (userRole !== 'super_admin' && userRole !== 'manager') {
        // Sign out to clear session
        await signOut();
        setErrorMessage(
          isRoman
            ? 'Ijazat Nahi (Access Denied): Yeh portal sirf Academy Administration (Super Admin / Manager) ke liye hai. Online student accounts yahan se access nahi kar sakte.'
            : 'Access Denied: This portal is restricted to authorized Academy Staff (Super Admin / Manager). Student credentials are not permitted here.'
        );
        setIsSubmitting(false);
        return;
      }

      // Authorized staff member: Redirect to admin area
      navigate(fromLocation.startsWith('/admin') ? fromLocation : '/admin', { replace: true });
    } catch (err: any) {
      setErrorMessage(isRoman ? 'Ghair-mutawaqqi khata pesh aayi.' : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Section variant="light" spacing="lg">
      <SEO
        title={isRoman ? 'Admin Control Panel Login' : 'Admin Control Panel Login'}
        description="Administrative portal for The Inspire Business Academy staff."
        canonicalPath="/admin/login"
      />
      <Container size="sm">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {t.common.backToHome}
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-[#1F3FBF]"
          >
            {isRoman ? 'Student Login Par Jayein' : 'Student Login'}
          </Link>
        </div>

        <Card elevated bordered className="p-2 sm:p-4 border-2 border-[#0F1F5C]/25 bg-white shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <Badge variant="navy" size="sm">Staff Authority Only</Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl text-[#0F1F5C]">
              {t.auth.adminLoginTitle}
            </CardTitle>
            <CardDescription>
              {isRoman
                ? 'Super Admin aur Manager access &bull; Role-based permissions enforced by Supabase RLS'
                : 'Super Admin and Manager access &bull; Role-based permissions enforced by Supabase RLS'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* If currently logged in as Staff */}
            {isStaff ? (
              <div className="p-5 rounded-2xl bg-[#F2F5FF] border border-[#0F1F5C]/20 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#0F1F5C] text-[#FFC20E] flex items-center justify-center mx-auto shadow-xs">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F1F5C]">
                    {isRoman ? 'Admin Session Active Hai' : 'Staff Session Active'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {profile?.fullName || user?.email} &bull;{' '}
                    <span className="font-bold uppercase tracking-wider text-[#1F3FBF]">{role}</span>
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <Link to="/admin" className="w-full sm:w-auto">
                    <Button variant="navy" fullWidth size="md" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                      {isRoman ? 'Admin Panel Par Dakhil Hon' : 'Enter Admin Panel'}
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleLogout}
                    className="w-full sm:w-auto text-red-600 hover:text-red-700"
                    leftIcon={<LogOut className="w-4 h-4" />}
                  >
                    {isRoman ? 'Logout' : 'Log Out'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <Input
                    label={isRoman ? 'Admin Email Address' : 'Admin Email Address'}
                    type="email"
                    placeholder="admin@theinspireacademy.pk"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />

                  <div className="relative">
                    <Input
                      label={isRoman ? 'Admin Password' : 'Admin Password'}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="navy"
                    fullWidth
                    size="md"
                    isLoading={isSubmitting}
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    {isRoman ? 'Admin Panel Login' : 'Authenticate to Admin Panel'}
                  </Button>
                </form>

                {/* Clear administrative security notice (No public admin signup) */}
                <div className="pt-4 border-t border-slate-100 text-center space-y-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isRoman
                      ? 'Security Notice: Yahan koi public registration nahi hai. Super Admin aur Manager accounts academy server boundary par provision kiye jate hain.'
                      : 'Security Policy: Public registration is strictly disabled. Administrative accounts are securely provisioned by the Super Admin.'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
};
