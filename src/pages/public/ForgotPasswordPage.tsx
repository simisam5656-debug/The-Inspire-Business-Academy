import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { useSiteContact } from '../../hooks/useSiteContact';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { KeyRound, ArrowLeft, Send, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getLocalizedAuthError } from '../../utils/authErrors';
import { SEO } from '../../components/common/SEO';

export const ForgotPasswordPage: React.FC = () => {
  const contact = useSiteContact();
  const { language, t } = useTranslation();
  const isRoman = language === 'roman-urdu';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage(isRoman ? 'Baraye meharbani apna email darj karein.' : 'Please enter your email.');
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setErrorMessage(
        isRoman
          ? 'Supabase backend credentials (.env) abhi configure nahi hain.'
          : 'Supabase credentials are not configured.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const redirectUrl = `${window.location.origin}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(getLocalizedAuthError(error, isRoman));
      } else {
        setSuccessMessage(
          isRoman
            ? `Password recovery link aapke email (${trimmedEmail}) par bhej diya gaya hai. Agar inbox mein na miley toh Spam/Junk folder zaroor check karein.`
            : `A password reset link has been dispatched to ${trimmedEmail}. Please check your inbox and spam folder.`
        );
      }
    } catch (err: any) {
      setErrorMessage(getLocalizedAuthError(err, isRoman));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Section variant="light" spacing="lg">
      <SEO
        title={isRoman ? 'Password Reset - The Inspire Business Academy' : 'Password Recovery - The Inspire Business Academy'}
        description="Reset your Inspire Business Academy online student account password."
        canonicalPath="/forgot-password"
      />
      <Container size="sm">
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {isRoman ? 'Login Safha Par Wapis' : 'Back to Login'}
          </Link>
        </div>

        <Card elevated bordered className="p-2 sm:p-4">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 rounded-xl bg-[#F2F5FF] text-[#1F3FBF] flex items-center justify-center">
                <KeyRound className="w-6 h-6" />
              </div>
              <Badge variant="accent" size="sm">Account Recovery</Badge>
            </div>
            <CardTitle>{isRoman ? 'Password Recovery' : 'Reset Account Password'}</CardTitle>
            <CardDescription>
              {isRoman
                ? 'Apna registered email darj karein taake reset link receive ho sakey.'
                : 'Enter your registered email address to receive password reset instructions.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {successMessage ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed font-medium">{successMessage}</p>
                </div>
                <div className="pt-2">
                  <Link to="/login" className="block">
                    <Button variant="primary" fullWidth size="sm">
                      {isRoman ? 'Login Safha Par Jayein' : 'Return to Login'}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">{errorMessage}</p>
                  </div>
                )}

                <Input
                  label={t.auth.emailLabel}
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="md"
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  {isRoman ? 'Reset Link Bhejein' : 'Send Reset Link'}
                </Button>
              </form>
            )}

            {/* Helpline backup */}
            <div className="pt-4 border-t border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-500">
                {isRoman ? 'Email access nahi mil raha?' : 'Having trouble accessing your email?'}
              </p>
              <a
                href={`https://wa.me/${contact.waDigits}?text=${encodeURIComponent(
                  'Assalam o Alaikum! Mujhe online student account password recovery mein madad chahiye.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{isRoman ? `Academy WhatsApp Helpline (${contact.whatsapp})` : 'Contact Helpline via WhatsApp'}</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </Container>
    </Section>
  );
};
