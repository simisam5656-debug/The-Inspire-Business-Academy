import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import {
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  CheckCircle2,
  FileText,
  Award,
  LogOut,
  Globe,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  Lock,
  MessageCircle,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { siteConfig } from '../../config/site';
import { useSiteContact } from '../../hooks/useSiteContact';
import { StudentAccessService, StudentAccessState } from '../../services/studentAccessService';

export const StudentLayout: React.FC = () => {
  const contact = useSiteContact();
  const { language, setLanguage } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Student Access State for locking navigation: starts as 'loading' (never 'active')
  const [accessState, setAccessState] = useState<StudentAccessState | 'loading'>('loading');
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [lockedModalReason, setLockedModalReason] = useState<{ title: string; message: string }>({
    title: '',
    message: '',
  });

  const waNumber = contact.waDigits;
  const whatsappUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    'Assalam-o-Alaikum, I need assistance regarding my online course access on The Inspire Business Academy portal.'
  )}`;

  // Staff exemption: super_admin or manager can preview student pages without locks
  const isStaff = profile?.role === 'super_admin' || profile?.role === 'manager';

  useEffect(() => {
    let isMounted = true;
    async function fetchAccess() {
      if (!user?.id) return;
      if (profile && profile.isActive === false) {
        if (isMounted) setAccessState('deactivated');
        return;
      }
      try {
        const res = await StudentAccessService.getStudentAccess(user.id);
        if (isMounted) {
          setAccessState(res.state);
        }
      } catch (e) {
        console.warn('Error fetching student access state:', e);
        if (isMounted) {
          // Fail CLOSED (locked), never open
          setAccessState('no_enrollment');
        }
      }
    }
    fetchAccess();
    return () => {
      isMounted = false;
    };
  }, [user?.id, profile?.isActive]);

  const isUnlocked = isStaff || accessState === 'active';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const openLockModal = (itemName: string) => {
    let title = isRoman ? 'Dastaras Mehdood Hai (Locked)' : 'Access Locked';
    let message = '';

    switch (accessState) {
      case 'loading':
        title = isRoman ? 'Tasdeeq Jari Hai...' : 'Checking Access...';
        message = isRoman
          ? `Aapke course access ki tasdeeq ki ja rahi hai. Barah-e-karam thora intezar karein.`
          : `We are verifying your course enrollment access. Please wait a moment.`;
        break;
      case 'deactivated':
        title = isRoman ? 'Account Ghair Faal Hai' : 'Account Deactivated';
        message = isRoman
          ? `Aapka account academy ki taraf se ghair faal (deactivated) kar diya gaya hai. ${itemName} tak rasai ke liye academy intizamia se rabta karein.`
          : `Your account has been deactivated by the academy administration. You cannot access ${itemName}. Please contact support.`;
        break;
      case 'pending_payment':
        title = isRoman ? 'Payment Ki Tasdeeq Baki Hai' : 'Payment Verification Pending';
        message = isRoman
          ? `Aapki fees ki payment admin tasdeeq ke marhale mein hai. Tasdeeq mukammal hone ke baad ${itemName} khol diya jaye ga.`
          : `Your course fee payment is awaiting admin verification. ${itemName} will be unlocked as soon as payment is verified.`;
        break;
      case 'payment_rejected':
        title = isRoman ? 'Payment Mustarad Ho Gayi' : 'Payment Rejected';
        message = isRoman
          ? `Aapki pichli payment tasdeeq nahi ho saki. Barah-e-karam dobara payment jama karwayein ya academy se rabta karein.`
          : `Your payment was not approved. Please submit payment again to unlock ${itemName}.`;
        break;
      case 'suspended':
        title = isRoman ? 'Dakhla Moattal Hai' : 'Enrollment Suspended';
        message = isRoman
          ? `Aapka dakhla moattal (suspended) hai. Bahali ke liye academy se rabta karein.`
          : `Your course enrollment is currently suspended. Please contact the academy for assistance.`;
        break;
      case 'expired':
        title = isRoman ? 'Dakhla Khatam Ho Gaya' : 'Enrollment Expired';
        message = isRoman
          ? `Aapke course ki muddat khatam ho chuki hai. Course ki renewal ya mazeed rehnumai ke liye rabta karein.`
          : `Your course enrollment period has expired. Please contact the academy to renew access.`;
        break;
      case 'no_enrollment':
      default:
        title = isRoman ? 'Koi Active Course Nahi' : 'No Active Course Enrollment';
        message = isRoman
          ? `Aap kisi bhi course mein dakhil nahi hain. Pehle course mein dakhla lein taake ${itemName} khul sake.`
          : `You are not currently enrolled in any course. Please enroll in a course to access ${itemName}.`;
        break;
    }

    setLockedModalReason({ title, message });
    setLockedModalOpen(true);
  };

  const navItems = [
    {
      to: '/student',
      end: true,
      labelEn: 'Dashboard',
      labelRoman: 'Dashboard',
      icon: LayoutDashboard,
      requiresUnlock: false,
    },
    {
      to: '/student/courses',
      end: false,
      labelEn: 'My Courses & Request',
      labelRoman: 'Mere Courses & Darkhwast',
      icon: BookOpen,
      requiresUnlock: false,
    },
    {
      to: '/student/classroom',
      end: false,
      labelEn: 'Classroom & Lessons',
      labelRoman: 'Darsgah & Sabaq',
      icon: BookOpen,
      requiresUnlock: true,
    },
    {
      to: '/student/quizzes',
      end: false,
      labelEn: 'Quizzes & Tests',
      labelRoman: 'Quizzes & Imtihan',
      icon: CheckCircle2,
      requiresUnlock: true,
    },
    {
      to: '/student/final-exam',
      end: false,
      labelEn: 'Final Exam (70% Pass)',
      labelRoman: 'Final Imtihan (70%)',
      icon: GraduationCap,
      requiresUnlock: true,
    },
    {
      to: '/student/resources',
      end: false,
      labelEn: 'Resources',
      labelRoman: 'Resources',
      icon: FolderOpen,
      requiresUnlock: true,
    },
    {
      to: '/student/notes',
      end: false,
      labelEn: 'Personal Notes',
      labelRoman: 'Zaati Notes',
      icon: FileText,
      requiresUnlock: true,
    },
    {
      to: '/student/certificate',
      end: false,
      labelEn: 'Sanad / Certificate',
      labelRoman: 'Sanad / Verification',
      icon: Award,
      requiresUnlock: true,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Portal Name */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1F3FBF] to-[#0F1F5C] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-[#0F1F5C] tracking-tight block">
                    The Inspire Academy
                  </span>
                  <span className="text-[10px] font-semibold text-[#1F3FBF] uppercase tracking-wider block">
                    {isRoman ? 'Online Student LMS' : 'Student LMS Portal'}
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isItemLocked = item.requiresUnlock && !isUnlocked;
                const itemLabel = isRoman ? item.labelRoman : item.labelEn;

                if (accessState === 'loading' && !isStaff && item.requiresUnlock) {
                  return (
                    <div
                      key={item.to}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-100/60 animate-pulse select-none"
                    >
                      <Icon className="w-4 h-4 text-slate-300" />
                      <span className="w-16 h-3 rounded bg-slate-200 inline-block" />
                      <Lock className="w-3 h-3 text-slate-300 ml-0.5" />
                    </div>
                  );
                }

                if (isItemLocked) {
                  return (
                    <button
                      key={item.to}
                      type="button"
                      onClick={() => openLockModal(itemLabel)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title={isRoman ? `${itemLabel} (Locked)` : `${itemLabel} (Locked)`}
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{itemLabel}</span>
                      <Lock className="w-3 h-3 text-amber-500 ml-0.5" />
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-[#1F3FBF] text-white shadow-xs'
                          : 'text-slate-600 hover:text-[#0F1F5C] hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{itemLabel}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Right: Language, Profile & Logout */}
            <div className="hidden md:flex items-center gap-3">
              {/* Language Switcher */}
              <button
                type="button"
                onClick={() => setLanguage(isRoman ? 'english' : 'roman-urdu')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-[#1F3FBF] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                title="Switch Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isRoman ? 'English' : 'Roman Urdu'}</span>
              </button>

              {/* User Profile Pill */}
              <Link
                to="/student/profile"
                title={isRoman ? 'Meri Profile' : 'My Profile'}
                className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80"
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#1F3FBF]/10 text-[#1F3FBF] flex items-center justify-center font-bold text-xs">
                    {(profile?.fullName || user?.email || 'S')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                    {profile?.fullName || 'Online Learner'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    {user?.email}
                  </div>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title={isRoman ? 'Kharji / Logout' : 'Log Out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Hamburger Toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button
                type="button"
                onClick={() => setLanguage(isRoman ? 'english' : 'roman-urdu')}
                className="px-2 py-1 text-xs font-medium bg-slate-100 rounded text-slate-700"
              >
                {isRoman ? 'EN' : 'UR'}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2">
            <Link
              to="/student/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center text-xs font-bold text-[#1F3FBF] bg-[#F2F5FF] rounded-lg py-2 mb-2"
            >
              {isRoman ? 'Meri Profile / Settings' : 'My Profile / Settings'}
            </Link>
            <div className="p-3 bg-slate-50 rounded-xl mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#0F1F5C]">{profile?.fullName || 'Online Learner'}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>
              <Badge variant={isStaff ? 'primary' : isUnlocked ? 'primary' : 'warning'} size="sm">
                {isStaff ? 'Staff Preview' : isUnlocked ? 'Active Student' : accessState === 'loading' ? 'Verifying...' : 'Access Restricted'}
              </Badge>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isItemLocked = item.requiresUnlock && !isUnlocked;
              const itemLabel = isRoman ? item.labelRoman : item.labelEn;

              if (accessState === 'loading' && !isStaff && item.requiresUnlock) {
                return (
                  <div
                    key={item.to}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-slate-300 bg-slate-50 animate-pulse"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-300" />
                      <span className="w-24 h-3 rounded bg-slate-200 inline-block" />
                    </div>
                    <Lock className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                );
              }

              if (isItemLocked) {
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openLockModal(itemLabel);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{itemLabel}</span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-[#1F3FBF] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{itemLabel}</span>
                </NavLink>
              );
            })}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-medium text-[#1F3FBF] inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {isRoman ? 'Public Website par jayein' : 'Public Website'}
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-700 border-red-200"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Portal Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#1F3FBF]" />
            <span>
              {isRoman
                ? 'The Inspire Business Academy LMS — Mehfooz Taleemi Portal'
                : 'The Inspire Business Academy LMS — Secure Student Learning Environment'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Registered Campus: Sadiqabad, Punjab &bull; Phase 7 Active
          </div>
        </div>
      </footer>

      {/* Locked Feature Modal */}
      {lockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => setLockedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">{lockedModalReason.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {lockedModalReason.message}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isRoman ? 'Academy WhatsApp Par Rabta' : 'Contact on WhatsApp'}</span>
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLockedModalOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                {isRoman ? 'Band Karein' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
