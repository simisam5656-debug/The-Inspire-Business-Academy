import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { StudentAccessService, StudentAccessState } from '../../services/studentAccessService';
import { Spinner } from '../ui/Spinner';

interface StudentAccessGuardProps {
  children: React.ReactNode;
}

export const StudentAccessGuard: React.FC<StudentAccessGuardProps> = ({ children }) => {
  const { user, profile } = useAuth();
  const location = useLocation();

  // Staff exemption: super_admin and manager can freely preview student pages
  const isStaff = profile?.role === 'super_admin' || profile?.role === 'manager';

  const [accessState, setAccessState] = useState<StudentAccessState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If staff, no need to check or lock
    if (isStaff) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function checkAccess() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fast check: if profile is explicitly deactivated
      if (profile && profile.isActive === false) {
        if (isMounted) {
          setAccessState('deactivated');
          setLoading(false);
        }
        return;
      }

      try {
        const result = await StudentAccessService.getStudentAccess(user.id);
        if (isMounted) {
          setAccessState(result.state);
        }
      } catch (e) {
        if (isMounted) {
          setAccessState('no_enrollment');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAccess();
    return () => {
      isMounted = false;
    };
  }, [user?.id, profile?.isActive, location.pathname]);

  if (isStaff) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
        <Spinner size="lg" variant="primary" />
        <span className="text-xs text-slate-500 font-medium tracking-wide">
          Verifying course access permissions...
        </span>
      </div>
    );
  }

  // Access is allowed ONLY when state === 'active'
  if (accessState !== 'active') {
    // Redirect to /student dashboard with notice state
    return (
      <Navigate
        to="/student"
        replace
        state={{
          lockedAttempt: true,
          from: location.pathname,
          accessState,
        }}
      />
    );
  }

  return <>{children}</>;
};
