import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { Container } from '../ui/Container';
import { Section } from '../ui/Section';
import { Spinner } from '../ui/Spinner';
import { useTranslation } from '../../i18n';

export interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectUnauthenticatedTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectUnauthenticatedTo,
}) => {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';

  // Auth Loading State: Never flicker unauthenticated view while checking session
  if (isLoading) {
    return (
      <Section variant="light" spacing="xl">
        <Container size="sm">
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-[#1F3FBF]/15 shadow-xs">
            <Spinner size="lg" variant="primary" />
            <h3 className="mt-4 text-base font-bold text-[#0F1F5C] font-display">
              {isRoman ? 'Session Ki Tashkhees Ho Rahi Hai...' : 'Checking Secure Session...'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {isRoman
                ? 'Baraye meharbani intizar karein, aapka profile status load ho raha hai.'
                : 'Please wait while your verified profile credentials are being loaded.'}
            </p>
          </div>
        </Container>
      </Section>
    );
  }

  // Not authenticated
  if (!user) {
    const isAttemptingAdmin = location.pathname.startsWith('/admin');
    const fallbackRedirect = isAttemptingAdmin ? '/admin/login' : '/login';
    const target = redirectUnauthenticatedTo || fallbackRedirect;

    return <Navigate to={target} state={{ from: location }} replace />;
  }

  // Check role authorization against verified database role
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = role || 'online_student';
    const isAuthorized = allowedRoles.includes(currentRole);

    if (!isAuthorized) {
      // Authenticated user lacks permission (e.g. online_student accessing /admin)
      return <Navigate to="/403" state={{ deniedPath: location.pathname }} replace />;
    }
  }

  return children ? <>{children}</> : null;
};
