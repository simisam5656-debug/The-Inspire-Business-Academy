import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n';
import { canAccessModule } from '../../utils/permissions';
import {
  LayoutDashboard,
  Users,
  FileCheck,
  CalendarCheck,
  CreditCard,
  Receipt,
  UserCheck,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Shield,
  ExternalLink,
  GraduationCap,
  BookOpen,
  Award,
  FileQuestion,
  FileCheck2,
  Megaphone,
  HelpCircle,
  MessageSquareQuote,
  BellRing,
  Image as ImageIcon,
  Tag,
  Sparkles,
  BarChart3,
  Bot,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AdminService } from '../../services/adminService';

interface NavItem {
  nameRoman: string;
  nameEn: string;
  path: string;
  icon: React.ElementType;
  permissionKey: any;
  superAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    nameRoman: 'Dashboard',
    nameEn: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
    permissionKey: 'dashboard',
  },
  {
    nameRoman: 'Online Courses',
    nameEn: 'Online Courses',
    path: '/admin/courses',
    icon: BookOpen,
    permissionKey: 'courses',
  },
  {
    nameRoman: 'Short Sessions',
    nameEn: 'Short Sessions',
    path: '/admin/short-sessions',
    icon: Sparkles,
    permissionKey: 'courses',
  },
  {
    nameRoman: 'Quizzes',
    nameEn: 'Quizzes',
    path: '/admin/quizzes',
    icon: FileQuestion,
    permissionKey: 'quizzes',
  },
  {
    nameRoman: 'Final Exams',
    nameEn: 'Final Exams',
    path: '/admin/final-exam',
    icon: GraduationCap,
    permissionKey: 'quizzes',
  },
  {
    nameRoman: 'Certificates',
    nameEn: 'Certificates',
    path: '/admin/certificates',
    icon: Award,
    permissionKey: 'certificates',
  },
  {
    nameRoman: 'Announcements',
    nameEn: 'Announcements',
    path: '/admin/announcements',
    icon: Megaphone,
    permissionKey: 'announcements',
  },
  {
    nameRoman: 'Notice Ticker',
    nameEn: 'Notice Ticker',
    path: '/admin/notices',
    icon: BellRing,
    permissionKey: 'notices',
  },
  {
    nameRoman: 'FAQs',
    nameEn: 'FAQs',
    path: '/admin/faqs',
    icon: HelpCircle,
    permissionKey: 'faqs',
  },
  {
    nameRoman: 'Testimonials',
    nameEn: 'Testimonials',
    path: '/admin/testimonials',
    icon: MessageSquareQuote,
    permissionKey: 'testimonials',
  },
  {
    nameRoman: 'Gallery',
    nameEn: 'Campus Gallery',
    path: '/admin/gallery',
    icon: ImageIcon,
    permissionKey: 'gallery',
  },
  {
    nameRoman: 'Offers & Discounts',
    nameEn: 'Offers & Discounts',
    path: '/admin/offers',
    icon: Tag,
    permissionKey: 'offers',
  },
  {
    nameRoman: 'Reports & Analytics',
    nameEn: 'Reports & Analytics',
    path: '/admin/reports',
    icon: BarChart3,
    permissionKey: 'reports',
  },
  {
    nameRoman: 'AI Services',
    nameEn: 'AI Services',
    path: '/admin/ai-tools',
    icon: Bot,
    permissionKey: 'ai_tools',
  },
  {
    nameRoman: 'Academy Chatbot',
    nameEn: 'Academy Chatbot',
    path: '/admin/chatbot',
    icon: MessageSquare,
    permissionKey: 'chatbot',
  },
  {
    nameRoman: 'Physical Students',
    nameEn: 'Physical Students',
    path: '/admin/students',
    icon: Users,
    permissionKey: 'students',
  },
  {
    nameRoman: 'Registrations',
    nameEn: 'Registrations',
    path: '/admin/registrations',
    icon: FileCheck,
    permissionKey: 'registrations',
  },
  {
    nameRoman: 'Rabta Messages',
    nameEn: 'Contact Messages',
    path: '/admin/messages',
    icon: Mail,
    permissionKey: 'messages',
  },
  {
    nameRoman: 'Online Students',
    nameEn: 'Online Students',
    path: '/admin/online-students',
    icon: GraduationCap,
    permissionKey: 'enrollments',
  },
  {
    nameRoman: 'Online Payments',
    nameEn: 'Online Payments',
    path: '/admin/online-payments',
    icon: CreditCard,
    permissionKey: 'payments',
  },
  {
    nameRoman: 'Online Enrollments',
    nameEn: 'Online Enrollments',
    path: '/admin/enrollments',
    icon: GraduationCap,
    permissionKey: 'enrollments',
  },
  {
    nameRoman: 'Attendance',
    nameEn: 'Attendance',
    path: '/admin/attendance',
    icon: CalendarCheck,
    permissionKey: 'attendance',
  },
  {
    nameRoman: 'Physical Fees',
    nameEn: 'Physical Fees',
    path: '/admin/fees',
    icon: Receipt,
    permissionKey: 'fees',
  },
  {
    nameRoman: 'Expenses',
    nameEn: 'Expenses',
    path: '/admin/expenses',
    icon: Receipt,
    permissionKey: 'expenses',
  },
  {
    nameRoman: 'Managers',
    nameEn: 'Managers',
    path: '/admin/managers',
    icon: UserCheck,
    permissionKey: 'settings',
    superAdminOnly: true,
  },
  {
    nameRoman: 'Audit Log',
    nameEn: 'Audit Log',
    path: '/admin/audit-log',
    icon: History,
    permissionKey: 'audit_log',
    superAdminOnly: true,
  },
  {
    nameRoman: 'Settings',
    nameEn: 'Settings',
    path: '/admin/settings',
    icon: Settings,
    permissionKey: 'settings',
    superAdminOnly: true,
  },
];

export const AdminLayout: React.FC = () => {
  const { language } = useTranslation();
  const isRoman = language === 'roman-urdu';
  const { user, profile, role, isSuperAdmin, signOut, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  useEffect(() => {
    let active = true;
    async function loadUnreadCount() {
      try {
        const msgs = await AdminService.getContactMessages();
        const count = msgs.filter((m) => m.status === 'new').length;
        if (active) setUnreadMessages(count);
      } catch (_) {}
    }
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const allowedNavItems = NAV_ITEMS.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    return hasPermission(item.permissionKey);
  });

  return (
    <div className="min-h-screen bg-[#F2F5FF] text-slate-900 flex flex-col antialiased">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#0F1F5C] text-white px-4 py-3 flex items-center justify-between border-b border-[#1F3FBF]/40 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-white/10 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFC20E] text-[#0F1F5C] flex items-center justify-center font-black text-sm">
              IBA
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">Admin Console</span>
              <span className="text-[10px] text-slate-300 block">The Inspire Business Academy</span>
            </div>
          </div>
        </div>

        <Badge variant={isSuperAdmin ? 'accent' : 'secondary'} size="sm">
          {isSuperAdmin ? 'Super Admin' : 'Manager'}
        </Badge>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col bg-[#0F1F5C] text-white border-r border-[#1F3FBF]/30 transition-all duration-300 select-none ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Academy Brand */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <Link to="/admin" className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-[#FFC20E] text-[#0F1F5C] flex-shrink-0 flex items-center justify-center font-black text-base shadow-sm">
                IBA
              </div>
              {!sidebarCollapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-sm tracking-tight leading-snug">The Inspire</h1>
                  <p className="text-[11px] text-[#FFC20E] font-medium tracking-wide uppercase">Business Academy</p>
                </div>
              )}
            </Link>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Current Staff Persona */}
          {!sidebarCollapsed && (
            <div className="p-3 mx-3 my-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1F3FBF] text-white flex items-center justify-center font-semibold text-xs uppercase">
                  {(profile?.fullName || user?.email || 'A')[0]}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold truncate text-white">
                    {profile?.fullName || 'Staff User'}
                  </p>
                  <p className="text-[10px] text-slate-300 truncate">
                    {isSuperAdmin ? 'Super Administrator' : 'Operations Manager'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isMessages = item.path === '/admin/messages';
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1F3FBF] text-white shadow-sm font-semibold'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white'
                    } ${sidebarCollapsed ? 'justify-center px-2 relative' : ''}`
                  }
                  title={sidebarCollapsed ? (isRoman ? item.nameRoman : item.nameEn) : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="flex-1 truncate">{isRoman ? item.nameRoman : item.nameEn}</span>}
                  {isMessages && unreadMessages > 0 && (
                    sidebarCollapsed ? (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FFC20E]" />
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FFC20E] text-[#0F1F5C] rounded-full shrink-0">
                        {unreadMessages}
                      </span>
                    )
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-3 border-t border-white/10 space-y-1">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors ${
                sidebarCollapsed ? 'justify-center px-2' : ''
              }`}
              title={isRoman ? 'Public Website' : 'Public Website'}
            >
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{isRoman ? 'Website Dekhein' : 'View Website'}</span>}
            </Link>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors ${
                sidebarCollapsed ? 'justify-center px-2' : ''
              }`}
              title={isRoman ? 'Logout' : 'Log Out'}
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>{isRoman ? 'Logout' : 'Sign Out'}</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-[85%] bg-[#0F1F5C] text-white flex flex-col shadow-2xl z-10">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFC20E] text-[#0F1F5C] flex items-center justify-center font-black text-sm">
                    IBA
                  </div>
                  <div>
                    <h2 className="font-bold text-sm">The Inspire</h2>
                    <p className="text-[10px] text-[#FFC20E]">Business Academy</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Staff badge */}
              <div className="p-3 mx-3 my-2 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs font-semibold text-white truncate">{profile?.fullName || user?.email}</p>
                <p className="text-[11px] text-slate-300">{isSuperAdmin ? 'Super Admin' : 'Manager'}</p>
              </div>

              <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                {allowedNavItems.map((item) => {
                  const Icon = item.icon;
                  const isMessages = item.path === '/admin/messages';
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/admin'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                          isActive
                            ? 'bg-[#1F3FBF] text-white font-semibold'
                            : 'text-slate-200 hover:bg-white/10 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{isRoman ? item.nameRoman : item.nameEn}</span>
                      {isMessages && unreadMessages > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#FFC20E] text-[#0F1F5C] rounded-full shrink-0">
                          {unreadMessages}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>

              <div className="p-3 border-t border-white/10 space-y-1">
                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 px-3 py-2 text-xs text-slate-300 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isRoman ? 'Website Dekhein' : 'View Public Site'}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs text-red-300 hover:bg-red-500/20"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isRoman ? 'Logout' : 'Sign Out'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
