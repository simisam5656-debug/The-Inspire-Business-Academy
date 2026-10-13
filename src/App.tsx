import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { PublicLayout } from './components/layout/PublicLayout';
import { Spinner } from './components/ui/Spinner';

// Core Public Pages (eager for fast initial render)
import { HomePage } from './pages/public/HomePage';
import { CoursesPage } from './pages/public/CoursesPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { LoginPage } from './pages/public/LoginPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

// Lazy-loaded Public Pages
const GalleryPage = lazy(() => import('./pages/public/GalleryPage').then((m) => ({ default: m.GalleryPage })));
const VerifyPage = lazy(() => import('./pages/public/VerifyPage').then((m) => ({ default: m.VerifyPage })));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/public/TermsPage').then((m) => ({ default: m.TermsPage })));
const RefundPage = lazy(() => import('./pages/public/RefundPage').then((m) => ({ default: m.RefundPage })));
const JoinPage = lazy(() => import('./pages/public/JoinPage').then((m) => ({ default: m.JoinPage })));
const PhysicalJoinPage = lazy(() => import('./pages/public/PhysicalJoinPage').then((m) => ({ default: m.PhysicalJoinPage })));
const OnlineJoinPage = lazy(() => import('./pages/public/OnlineJoinPage').then((m) => ({ default: m.OnlineJoinPage })));
const AdminLoginPage = lazy(() => import('./pages/public/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const UnauthorizedPage = lazy(() => import('./pages/public/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })));

// Auth & Protected Route
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Student Portal (Lazy Loaded)
import { StudentLayout } from './components/student/StudentLayout';
import { StudentAccessGuard } from './components/student/StudentAccessGuard';
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage').then((m) => ({ default: m.StudentDashboardPage })));
const StudentCoursesPage = lazy(() => import('./pages/student/StudentCoursesPage').then((m) => ({ default: m.StudentCoursesPage })));
const StudentClassroomPage = lazy(() => import('./pages/student/StudentClassroomPage').then((m) => ({ default: m.StudentClassroomPage })));
const StudentQuizzesPage = lazy(() => import('./pages/student/StudentQuizzesPage').then((m) => ({ default: m.StudentQuizzesPage })));
const StudentFinalExamPage = lazy(() => import('./pages/student/StudentFinalExamPage').then((m) => ({ default: m.StudentFinalExamPage })));
const StudentNotesPage = lazy(() => import('./pages/student/StudentNotesPage').then((m) => ({ default: m.StudentNotesPage })));
const StudentCertificatePage = lazy(() => import('./pages/student/StudentCertificatePage').then((m) => ({ default: m.StudentCertificatePage })));

// Admin Layout & Pages (Lazy Loaded)
import { AdminLayout } from './components/admin/AdminLayout';
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminStudentsPage = lazy(() => import('./pages/admin/AdminStudentsPage').then((m) => ({ default: m.AdminStudentsPage })));
const AdminRegistrationsPage = lazy(() => import('./pages/admin/AdminRegistrationsPage').then((m) => ({ default: m.AdminRegistrationsPage })));
const AdminAttendancePage = lazy(() => import('./pages/admin/AdminAttendancePage').then((m) => ({ default: m.AdminAttendancePage })));
const AdminFeesPage = lazy(() => import('./pages/admin/AdminFeesPage').then((m) => ({ default: m.AdminFeesPage })));
const AdminExpensesPage = lazy(() => import('./pages/admin/AdminExpensesPage').then((m) => ({ default: m.AdminExpensesPage })));
const AdminManagersPage = lazy(() => import('./pages/admin/AdminManagersPage').then((m) => ({ default: m.AdminManagersPage })));
const AdminAuditLogPage = lazy(() => import('./pages/admin/AdminAuditLogPage').then((m) => ({ default: m.AdminAuditLogPage })));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));
const AdminCoursesPage = lazy(() => import('./pages/admin/AdminCoursesPage').then((m) => ({ default: m.AdminCoursesPage })));
const AdminOnlinePaymentsPage = lazy(() => import('./pages/admin/AdminOnlinePaymentsPage').then((m) => ({ default: m.AdminOnlinePaymentsPage })));
const AdminEnrollmentsPage = lazy(() => import('./pages/admin/AdminEnrollmentsPage').then((m) => ({ default: m.AdminEnrollmentsPage })));
const AdminQuizzesPage = lazy(() => import('./pages/admin/AdminQuizzesPage').then((m) => ({ default: m.AdminQuizzesPage })));
const AdminFinalExamPage = lazy(() => import('./pages/admin/AdminFinalExamPage').then((m) => ({ default: m.AdminFinalExamPage })));
const AdminCertificatesPage = lazy(() => import('./pages/admin/AdminCertificatesPage').then((m) => ({ default: m.AdminCertificatesPage })));
const AdminAnnouncementsPage = lazy(() => import('./pages/admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })));
const AdminFAQsPage = lazy(() => import('./pages/admin/AdminFAQsPage').then((m) => ({ default: m.AdminFAQsPage })));
const AdminTestimonialsPage = lazy(() => import('./pages/admin/AdminTestimonialsPage').then((m) => ({ default: m.AdminTestimonialsPage })));
const AdminNoticesPage = lazy(() => import('./pages/admin/AdminNoticesPage').then((m) => ({ default: m.AdminNoticesPage })));
const AdminGalleryPage = lazy(() => import('./pages/admin/AdminGalleryPage').then((m) => ({ default: m.AdminGalleryPage })));
const AdminOffersPage = lazy(() => import('./pages/admin/AdminOffersPage').then((m) => ({ default: m.AdminOffersPage })));
const AdminShortSessionsPage = lazy(() => import('./pages/admin/AdminShortSessionsPage').then((m) => ({ default: m.AdminShortSessionsPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminAIAssistantPage = lazy(() => import('./pages/admin/AdminAIAssistantPage').then((m) => ({ default: m.AdminAIAssistantPage })));
const AdminMessagesPage = lazy(() => import('./pages/admin/AdminMessagesPage').then((m) => ({ default: m.AdminMessagesPage })));
const AdminOnlineStudentsPage = lazy(() => import('./pages/admin/AdminOnlineStudentsPage').then((m) => ({ default: m.AdminOnlineStudentsPage })));
const AdminChatbotPage = lazy(() => import('./pages/admin/AdminChatbotPage').then((m) => ({ default: m.AdminChatbotPage })));

const SuspenseLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-3">
    <Spinner size="lg" variant="primary" />
    <span className="text-xs text-slate-500 font-medium tracking-wide">The Inspire Business Academy...</span>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<SuspenseLoader />}>
              <Routes>
                {/* Public Routes with PublicLayout */}
                <Route element={<PublicLayout />}>
                  <Route index element={<HomePage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="gallery" element={<GalleryPage />} />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="verify" element={<VerifyPage />} />
                  <Route path="privacy" element={<PrivacyPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route path="refund" element={<RefundPage />} />
                  <Route path="join" element={<JoinPage />} />
                  <Route path="join/physical" element={<PhysicalJoinPage />} />
                  <Route path="join/online" element={<OnlineJoinPage />} />
                  <Route path="login" element={<LoginPage />} />
                  <Route path="admin/login" element={<AdminLoginPage />} />
                  <Route path="forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="unauthorized" element={<UnauthorizedPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Protected Student LMS Routes with Dedicated StudentLayout (Phase 7) */}
                <Route
                  path="student"
                  element={
                    <ProtectedRoute allowedRoles={['online_student', 'super_admin', 'manager']}>
                      <StudentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<StudentDashboardPage />} />
                  <Route path="courses" element={<StudentCoursesPage />} />
                  <Route
                    path="classroom"
                    element={
                      <StudentAccessGuard>
                        <StudentClassroomPage />
                      </StudentAccessGuard>
                    }
                  />
                  <Route
                    path="quizzes"
                    element={
                      <StudentAccessGuard>
                        <StudentQuizzesPage />
                      </StudentAccessGuard>
                    }
                  />
                  <Route
                    path="final-exam"
                    element={
                      <StudentAccessGuard>
                        <StudentFinalExamPage />
                      </StudentAccessGuard>
                    }
                  />
                  <Route
                    path="notes"
                    element={
                      <StudentAccessGuard>
                        <StudentNotesPage />
                      </StudentAccessGuard>
                    }
                  />
                  <Route
                    path="certificate"
                    element={
                      <StudentAccessGuard>
                        <StudentCertificatePage />
                      </StudentAccessGuard>
                    }
                  />
                </Route>

                {/* Protected Admin Routes with Dedicated AdminLayout */}
                <Route
                  path="admin"
                  element={
                    <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="courses" element={<AdminCoursesPage />} />
                  <Route path="short-sessions" element={<AdminShortSessionsPage />} />
                  <Route path="quizzes" element={<AdminQuizzesPage />} />
                  <Route path="final-exam" element={<AdminFinalExamPage />} />
                  <Route path="certificates" element={<AdminCertificatesPage />} />
                  <Route path="announcements" element={<AdminAnnouncementsPage />} />
                  <Route path="faqs" element={<AdminFAQsPage />} />
                  <Route path="testimonials" element={<AdminTestimonialsPage />} />
                  <Route path="notices" element={<AdminNoticesPage />} />
                  <Route path="gallery" element={<AdminGalleryPage />} />
                  <Route path="offers" element={<AdminOffersPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="ai-tools" element={<AdminAIAssistantPage />} />
                  <Route path="chatbot" element={<AdminChatbotPage />} />
                  <Route path="students" element={<AdminStudentsPage />} />
                  <Route path="online-students" element={<AdminOnlineStudentsPage />} />
                  <Route path="registrations" element={<AdminRegistrationsPage />} />
                  <Route path="messages" element={<AdminMessagesPage />} />
                  <Route path="online-payments" element={<AdminOnlinePaymentsPage />} />
                  <Route path="enrollments" element={<AdminEnrollmentsPage />} />
                  <Route path="attendance" element={<AdminAttendancePage />} />
                  <Route path="fees" element={<AdminFeesPage />} />
                  <Route path="expenses" element={<AdminExpensesPage />} />
                  <Route path="managers" element={<AdminManagersPage />} />
                  <Route path="audit-log" element={<AdminAuditLogPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
