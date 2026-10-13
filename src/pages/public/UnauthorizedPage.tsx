import React from 'react';
import { Container } from '../../components/ui/Container';
import { Section } from '../../components/ui/Section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ShieldAlert, ArrowLeft, LogOut, Home, GraduationCap, Shield } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n';
import { SEO } from '../../components/common/SEO';

export const UnauthorizedPage: React.FC = () => {
  const { user, role, signOut, isStaff, isOnlineStudent } = useAuth();
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const location = useLocation();
  const navigate = useNavigate();

  const deniedPath = (location.state as any)?.deniedPath || 'is portal';

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Section variant="light" spacing="lg">
      <SEO
        title={isRoman ? 'Rasai Ki Ijazat Nahi (403)' : 'Access Forbidden (403)'}
        description="Access to this protected academy portal is restricted based on your role."
        canonicalPath="/403"
      />
      <Container size="sm">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-[#1F3FBF] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            {isRoman ? 'Home Par Wapis' : 'Back to Home'}
          </Link>
        </div>

        <Card elevated bordered className="text-center p-6 sm:p-10 border-2 border-red-200">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <Badge variant="accent" size="sm" className="mb-2">
            Error 403 &bull; Forbidden
          </Badge>

          <CardTitle className="text-2xl text-[#0F1F5C]">
            {isRoman ? 'Rasai Ki Ijazat Nahi Hai' : 'Access Restricted'}
          </CardTitle>

          <CardDescription className="max-w-md mx-auto mt-2 text-slate-600 text-sm">
            {isRoman ? (
              <>
                Aapke account (Role:{' '}
                <span className="font-bold text-[#0F1F5C]">{role || 'Online Student'}</span>) ko{' '}
                <span className="font-semibold text-red-600">{deniedPath}</span> tak rasai ki ijazat
                nahi hai.
              </>
            ) : (
              <>
                Your logged-in account (Role:{' '}
                <span className="font-bold text-[#0F1F5C]">{role || 'Online Student'}</span>) does
                not have permission to access <span className="font-semibold text-red-600">{deniedPath}</span>.
              </>
            )}
          </CardDescription>

          <div className="mt-8 space-y-3 max-w-xs mx-auto">
            {isOnlineStudent && (
              <Link to="/student" className="block w-full">
                <Button variant="primary" fullWidth size="md" leftIcon={<GraduationCap className="w-4 h-4" />}>
                  {isRoman ? 'Student Portal Par Jayein' : 'Go to Student Portal'}
                </Button>
              </Link>
            )}

            {isStaff && (
              <Link to="/admin" className="block w-full">
                <Button variant="navy" fullWidth size="md" leftIcon={<Shield className="w-4 h-4" />}>
                  {isRoman ? 'Admin Panel Par Jayein' : 'Go to Admin Panel'}
                </Button>
              </Link>
            )}

            <Link to="/" className="block w-full">
              <Button variant="outline" fullWidth size="md" leftIcon={<Home className="w-4 h-4" />}>
                {isRoman ? 'Home Page' : 'Home Page'}
              </Button>
            </Link>

            {user && (
              <Button
                variant="ghost"
                fullWidth
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                leftIcon={<LogOut className="w-3.5 h-3.5" />}
              >
                {isRoman ? 'Logout Karein' : 'Log Out'}
              </Button>
            )}
          </div>
        </Card>
      </Container>
    </Section>
  );
};
