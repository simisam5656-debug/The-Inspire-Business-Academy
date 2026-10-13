import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, UserRole, ManagerPermissionKey } from '../types';
import { getLocalizedAuthError } from '../utils/authErrors';
import { canAccessModule } from '../utils/permissions';
import { Mail, X } from 'lucide-react';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isConfigured: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  isOnlineStudent: boolean;
  managerPermissions: ManagerPermissionKey[];
  hasPermission: (key: ManagerPermissionKey) => boolean;
  signIn: (creds: SignInCredentials, isRomanUrdu?: boolean) => Promise<{ success: boolean; error?: string; role?: UserRole; isEmailNotConfirmed?: boolean }>;
  signUp: (creds: SignUpCredentials, isRomanUrdu?: boolean) => Promise<{ success: boolean; error?: string; requireVerification?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [managerPermissions, setManagerPermissions] = useState<ManagerPermissionKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authNotice, setAuthNotice] = useState<{
    type: 'info' | 'error' | 'success';
    message: string;
    email?: string;
    showResend?: boolean;
  } | null>(null);
  const [resendingEmail, setResendingEmail] = useState<boolean>(false);

  // Fetch verified profile from public.profiles table in Supabase PostgreSQL
  const fetchProfile = useCallback(async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    if (!supabase || !isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from database:', error.message);
        return null;
      }

      if (data) {
        const userProfile: UserProfile = {
          id: data.id,
          email: data.email,
          fullName: data.full_name || '',
          phone: data.phone || undefined,
          role: data.role as UserRole,
          isActive: data.is_active ?? true,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        setProfile(userProfile);

        if (data.role === 'manager') {
          const { data: perms } = await supabase
            .from('manager_permissions')
            .select('permission_key')
            .eq('profile_id', userId);
          if (perms) {
            setManagerPermissions(perms.map((p: any) => p.permission_key as ManagerPermissionKey));
          } else {
            setManagerPermissions([]);
          }
        } else {
          setManagerPermissions([]);
        }

        return userProfile;
      }

      // If profile record not found yet (e.g. trigger lag), create fallback profile object
      const fallback: UserProfile = {
        id: userId,
        email: userEmail || '',
        fullName: splitEmail(userEmail),
        role: 'online_student',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(fallback);
      return fallback;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  }, []);

  function splitEmail(email?: string): string {
    if (!email) return 'Student';
    return email.split('@')[0];
  }

  // Refresh profile on demand
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) {
      setProfile(null);
      return null;
    }
    return fetchProfile(user.id, user.email);
  }, [user, fetchProfile]);

  // Initial session hydration and listener setup
  useEffect(() => {
    let isMounted = true;

    if (!supabase || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    async function initializeAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase!.auth.getSession();
        if (error) {
          console.warn('Failed to retrieve initial session:', error.message);
        }

        if (isMounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            await fetchProfile(initialSession.user.id, initialSession.user.email);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, updatedSession: Session | null) => {
        if (!isMounted) return;

        setSession(updatedSession);
        setUser(updatedSession?.user ?? null);

        if (updatedSession?.user) {
          await fetchProfile(updatedSession.user.id, updatedSession.user.email);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Real Supabase sign in
  const signIn = useCallback(
    async (creds: SignInCredentials, isRomanUrdu: boolean = true) => {
      if (!supabase || !isSupabaseConfigured) {
        return {
          success: false,
          error: isRomanUrdu
            ? 'Supabase backend credentials (.env) abhi configure nahi hain.'
            : 'Supabase backend credentials are not configured yet.',
        };
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: creds.email.trim(),
          password: creds.password,
        });

        if (error) {
          setIsLoading(false);
          const rawMsg = (error.message || '').toLowerCase();
          const isEmailNotConfirmed = rawMsg.includes('email not confirmed') || rawMsg.includes('unconfirmed');
          if (isEmailNotConfirmed) {
            setAuthNotice({
              type: 'error',
              message: isRomanUrdu
                ? 'Email tasdeeq nahi hua. Baraye meharbani apna email inbox check karein ya naya verification link mangwayein.'
                : 'Email not confirmed. Please check your email to confirm, or resend confirmation email.',
              email: creds.email.trim(),
              showResend: true,
            });
          }
          return {
            success: false,
            error: getLocalizedAuthError(error, isRomanUrdu),
            isEmailNotConfirmed,
          };
        }

        if (!data.user) {
          setIsLoading(false);
          return {
            success: false,
            error: isRomanUrdu ? 'Login tasdeeq nahi ho saki.' : 'Sign in failed.',
          };
        }

        setUser(data.user);
        setSession(data.session);

        // Fetch verified profile
        const fetchedProfile = await fetchProfile(data.user.id, data.user.email);
        setIsLoading(false);

        return {
          success: true,
          role: fetchedProfile?.role || 'online_student',
        };
      } catch (err: any) {
        setIsLoading(false);
        return {
          success: false,
          error: getLocalizedAuthError(err, isRomanUrdu),
        };
      }
    },
    [fetchProfile]
  );

  // Real Supabase sign up for online students
  const signUp = useCallback(
    async (creds: SignUpCredentials, isRomanUrdu: boolean = true) => {
      if (!supabase || !isSupabaseConfigured) {
        return {
          success: false,
          error: isRomanUrdu
            ? 'Supabase backend credentials (.env) abhi configure nahi hain.'
            : 'Supabase backend credentials are not configured yet.',
        };
      }

      try {
        setIsLoading(true);

        const { data, error } = await supabase.auth.signUp({
          email: creds.email.trim(),
          password: creds.password,
          options: {
            data: {
              full_name: creds.fullName.trim(),
              phone: creds.phone?.trim() || '',
              // Explicitly note: trigger forces role = 'online_student' on DB boundary
            },
          },
        });

        if (error) {
          setIsLoading(false);
          return {
            success: false,
            error: getLocalizedAuthError(error, isRomanUrdu),
          };
        }

        // Check if email confirmation is required by Supabase (sign-up succeeds but session is null)
        const requireVerification = Boolean(data.user && !data.session);

        if (requireVerification) {
          const verificationMessage = 'Account created. Please check your email to confirm, then log in.';
          setAuthNotice({
            type: 'info',
            message: verificationMessage,
            email: creds.email.trim(),
            showResend: false,
          });
          setIsLoading(false);
          return {
            success: true,
            requireVerification: true,
            message: verificationMessage,
          };
        }

        if (data.session && data.user) {
          setUser(data.user);
          setSession(data.session);
          await fetchProfile(data.user.id, data.user.email);
        }

        setIsLoading(false);
        return {
          success: true,
          requireVerification: false,
        };
      } catch (err: any) {
        setIsLoading(false);
        return {
          success: false,
          error: getLocalizedAuthError(err, isRomanUrdu),
        };
      }
    },
    [fetchProfile]
  );

  // Resend confirmation email via Supabase Auth
  const resendConfirmationEmail = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      if (!supabase || !isSupabaseConfigured) {
        return { success: false, error: 'Supabase is not configured' };
      }
      if (!email || !email.trim()) {
        return { success: false, error: 'Email address is required' };
      }

      try {
        setResendingEmail(true);
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
        });

        if (error) {
          setAuthNotice({
            type: 'error',
            message: error.message,
            email: email.trim(),
            showResend: true,
          });
          return { success: false, error: error.message };
        }

        const msg = 'Confirmation email resent. Please check your inbox.';
        setAuthNotice({
          type: 'info',
          message: msg,
          email: email.trim(),
          showResend: false,
        });
        return { success: true, message: msg };
      } catch (err: any) {
        const msg = err?.message || 'Failed to resend confirmation email';
        return { success: false, error: msg };
      } finally {
        setResendingEmail(false);
      }
    },
    []
  );

  // Sign out
  const signOut = useCallback(async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error signing out:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setManagerPermissions([]);
    setAuthNotice(null);
  }, []);

  const role = profile?.role ?? null;
  const isSuperAdmin = role === 'super_admin';
  const isManager = role === 'manager';
  const isStaff = isSuperAdmin || isManager;
  const isOnlineStudent = role === 'online_student';

  const hasPermission = useCallback(
    (key: ManagerPermissionKey) => canAccessModule(role, key, managerPermissions),
    [role, managerPermissions]
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      role,
      isLoading,
      isConfigured: isSupabaseConfigured,
      isStaff,
      isSuperAdmin,
      isManager,
      isOnlineStudent,
      managerPermissions,
      hasPermission,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      resendConfirmationEmail,
    }),
    [
      user,
      session,
      profile,
      role,
      isLoading,
      isStaff,
      isSuperAdmin,
      isManager,
      isOnlineStudent,
      managerPermissions,
      hasPermission,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      resendConfirmationEmail,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {authNotice && (
        <div
          role="alert"
          className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100%-2.5rem)] bg-white rounded-xl shadow-2xl border border-slate-300 p-4 animate-in fade-in slide-in-from-bottom-2"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-[#1F3FBF] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-slate-900 leading-snug">{authNotice.message}</p>
              {authNotice.showResend && authNotice.email && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => resendConfirmationEmail(authNotice.email!)}
                    disabled={resendingEmail}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1F3FBF] text-white hover:bg-[#0F1F5C] transition-colors disabled:opacity-50"
                  >
                    {resendingEmail ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setAuthNotice(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
