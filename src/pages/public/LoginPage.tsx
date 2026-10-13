import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { siteConfig } from '../../config/site';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Lock, Info, ArrowLeft, Phone, User, AlertCircle, Eye, EyeOff, CheckCircle2, Shield, GraduationCap, LogOut } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SEO } from '../../components/common/SEO';

export const LoginPage: React.FC = () => {
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { signIn, user, profile, role, isStaff, isOnlineStudent, signOut, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const fromLocation = (location.state as any)?.from?.pathname || '/student';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setShowResend(false);
    setResendStatus(null);

    if (!email.trim()) {
      setErrorMessage(isRoman ? 'Baraye meharbani apna email darj karein.' : 'Please enter your email.');
      return;
    }

    if (!password) {
      setErrorMessage(isRoman ? 'Baraye meharbani apna password darj karein.' : 'Please enter your password.');
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
        setErrorMessage(res.error || (isRoman ? 'Login nahi ho saka.' : 'Sign in failed.'));
        if (res.isEmailNotConfirmed || (res.error && (res.error.toLowerCase().includes('email not confirmed') || res.error.toLowerCase().includes('unconfirmed')))) {
          setShowResend(true);
        }
      } else {
        // Successful login
        // Check if admin user accidentally logged in on student page
        if (res.role === 'super_admin' || res.role === 'manager') {
          navigate('/admin', { replace: true });
        } else {
          navigate(fromLocation.startsWith('/admin') ? '/student' : fromLocation, { replace: true });
        }
      }
    } catch (err: any) {
      setErrorMessage(isRoman ? 'Ghair-mutawaqqi khata pesh aayi.' : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    try {
      setResending(true);
      const res = await resendConfirmationEmail(email.trim().toLowerCase());
      if (res.success) {
        setResendStatus(
          isRoman
            ? 'Tasdeeqi email dobara bhej diya gaya hai. Apna inbox check karein.'
            : 'Confirmation email resent. Please check your inbox.'
        );
      } else {
        setResendStatus(res.error || 'Failed to resend confirmation email.');
      }
    } catch (err: any) {
      setResendStatus(err?.message || 'Error resending confirmation.');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Section variant="light" spacing="lg">
      <SEO
        title={isRoman ? 'Student Login - The Inspire Business Academy' : 'Student Login - The Inspire Business Academy'}
        description="Login to access your Inspire Business Academy online student LMS portal."
        canonicalPath="/login"
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
            to="/admin/login"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-[#0F1F5C] gap-1"
          >
            <Shield className="w-3 h-3 text-[#FFC20E]" />
            <span>{isRoman ? 'Admin Login' : 'Admin Portal'}</span>
          </Link>
        </div>

        <Card elevated bordered className="p-2 sm:p-4">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-[#F2F5FF] text-[#1F3FBF] flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <Badge variant="accent" size="sm">Online Students</Badge>
            </div>
            <CardTitle>{t.auth.loginTitle}</CardTitle>
            <CardDescription>
              {isRoman
                ? 'Apne online courses aur student portal tak rasai ke liye login karein.'
                : 'Sign in to access your registered courses and student portal.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* If user is already authenticated */}
            {user ? (
              <div className="p-5 rounded-2xl bg-[#F2F5FF] border border-[#1F3FBF]/20 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0F1F5C]">
                    {isRoman ? 'Aap Pehle Se Login Hain' : 'You are Already Logged In'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {profile?.fullName ? <strong>{profile.fullName}</strong> : user.email} &bull;{' '}
                    <span className="capitalize font-semibold text-[#1F3FBF]">{role || 'Online Student'}</span>
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  {isStaff ? (
                    <Link to="/admin" className="w-full sm:w-auto">
                      <Button variant="navy" fullWidth size="md" leftIcon={<Shield className="w-4 h-4" />}>
                        {isRoman ? 'Admin Panel Par Jayein' : 'Go to Admin Panel'}
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/student" className="w-full sm:w-auto">
                      <Button variant="primary" fullWidth size="md" leftIcon={<GraduationCap className="w-4 h-4" />}>
                        {isRoman ? 'Student Portal Par Jayein' : 'Go to Student Portal'}
                      </Button>
                    </Link>
                  )}

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
                {/* Physical Student Isolation Notice */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>{isRoman ? 'Physical Students Wazahat:' : 'Physical Students Notice:'}</strong>{' '}
                    {t.auth.physicalStudentNotice}
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex flex-col gap-2 text-xs text-red-700">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed font-medium">{errorMessage}</p>
                    </div>
                    {showResend && (
                      <div className="pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleResendConfirmation}
                          disabled={resending}
                          className="text-xs font-bold border-red-300 text-red-800 hover:bg-red-100"
                        >
                          {resending ? 'Sending...' : 'Resend confirmation email'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {resendStatus && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                    <p className="font-medium">{resendStatus}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label={t.auth.emailLabel}
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />

                  <div className="relative">
                    <Input
                      label={t.auth.passwordLabel}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
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

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Link
                      to="/forgot-password"
                      className="text-[#1F3FBF] hover:underline font-semibold"
                    >
                      {isRoman ? 'Password bhool gaye?' : 'Forgot password?'}
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    size="md"
                    isLoading={isSubmitting}
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    {t.auth.loginButton}
                  </Button>
                </form>

                <div className="pt-4 border-t border-slate-100 text-center space-y-3">
                  <p className="text-xs text-slate-600">
                    {isRoman ? 'Naye student hain aur account nahi hai?' : "Don't have an online account?"}{' '}
                    <Link to="/join/online" className="text-[#1F3FBF] font-bold hover:underline">
                      {isRoman ? 'Yahan Dakhla Lein & Account Banayein' : 'Apply Online & Register'}
                    </Link>
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
