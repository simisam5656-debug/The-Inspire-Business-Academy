/**
 * The Inspire Business Academy - Core Type Definitions
 * Foundation for User Roles, Profiles, Permissions, and Data Models
 */

export type UserRole = 'super_admin' | 'manager' | 'online_student';

export type ManagerPermissionKey =
  | 'dashboard'
  | 'students'
  | 'registrations'
  | 'attendance'
  | 'fees'
  | 'tests'
  | 'portfolio'
  | 'courses'
  | 'payments'
  | 'enrollments'
  | 'assignments'
  | 'quizzes'
  | 'online_attendance'
  | 'certificates'
  | 'announcements'
  | 'faqs'
  | 'testimonials'
  | 'notices'
  | 'gallery'
  | 'offers'
  | 'expenses'
  | 'reports'
  | 'settings'
  | 'audit_log'
  | 'ai_tools'
  | 'messages'
  | 'chatbot';

export interface UserProfile {
  id: string; // references auth.users(id)
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerPermission {
  id: string;
  profileId: string;
  permissionKey: ManagerPermissionKey;
  grantedBy: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName?: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// Physical Academy (Admin managed only - no website login)
export interface PhysicalStudentSummary {
  id: string;
  rollNumber: string; // B01, B02 or G01, G02
  fullName: string;
  guardianName: string;
  phone: string;
  batchId: string;
  gender: 'boys' | 'girls';
  status: 'active' | 'completed' | 'withdrawn';
  createdAt: string;
}

// Online Student
export interface OnlineStudentSummary {
  id: string;
  studentCode: string; // INSPIRE-YYYY-XXXX
  profileId: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
}

// Course Summary
export interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  price: number;
  durationMonths: number;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

// Admission Types (Phase 4 Foundation)
export type AdmissionType = 'physical' | 'online';
export type AdmissionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AdmissionRecord {
  id: string;
  referenceNumber: string;
  admissionType: AdmissionType;
  fullName: string;
  guardianName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city: string;
  courseSlug: string;
  courseTitle: string;
  batchPreference?: string;
  notes?: string;
  status: AdmissionStatus;
  userId?: string | null;
  adminNotes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitAdmissionPayload {
  admissionType: AdmissionType;
  fullName: string;
  guardianName?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  city: string;
  courseSlug: string;
  courseTitle: string;
  batchPreference?: string;
  notes?: string;
  userId?: string | null;
}

// Physical Student Operational Types (Phase 5)
export type StudentStatus = 'active' | 'inactive' | 'completed' | 'left';

export interface PhysicalStudent {
  id: string;
  studentIdCode: string; // IBA-PHY-2026-001
  fullName: string;
  guardianName: string;
  phone: string;
  whatsapp?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  courseSlug: string;
  courseTitle: string;
  batchTitle?: string;
  admissionDate: string;
  totalFee: number;
  status: StudentStatus;
  admissionId?: string | null;
  notes?: string;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface PhysicalAttendanceRecord {
  id: string;
  studentId: string;
  attendanceDate: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  markedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated relation
  student?: PhysicalStudent;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'easypaisa' | 'jazzcash' | 'other';

export interface FeePaymentRecord {
  id: string;
  receiptNumber: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  receivedBy?: string | null;
  createdAt: string;
  // Populated relation
  student?: PhysicalStudent;
}

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'lab_equipment'
  | 'stationery'
  | 'refreshment'
  | 'marketing'
  | 'salary'
  | 'maintenance'
  | 'other';

export interface ExpenseRecord {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  notes?: string;
  receiptReference?: string;
  recordedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonthFinancialSummary {
  month: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "October 2026"
  feeCollection: number;
  expenses: number;
  newAdmissions: number;
  leftStudents: number;
  netIncome: number;
}

export interface DueFeeStudent {
  id: string;
  studentIdCode: string;
  fullName: string;
  courseTitle: string;
  phone: string;
  monthlyFee: number;
  paidThisCycle?: number;
  remainingBalance?: number;
  feeStatus?: 'paid' | 'partial' | 'due';
  dueDate: string;
  daysDiff: number; // positive = days overdue, negative = days left
  isOverdue: boolean;
  status: StudentStatus;
}

export interface DashboardMetrics {
  totalPhysicalStudents: number;
  activeStudents: number;
  pendingRegistrations: number;
  todayAttendanceMarked: number;
  todayPresentCount: number;
  totalFeesExpected: number;
  totalFeesCollected: number;
  outstandingFees: number;
  monthFeesCollected: number;
  monthExpensesTotal: number;
  pendingOnlinePayments?: number;
  activeOnlineEnrollments?: number;
  totalOnlineRevenue?: number;
  // Specific required Task 2 & Task 3 fields
  totalPhysicalActiveStudents: number;
  activeOnlineStudents?: number;
  totalOnlinePaymentsThisMonth?: number;
  totalOnlinePaymentsAllTime?: number;
  monthFeesExpectedPhysical?: number;
  monthFeesCollectedPhysical?: number;
  monthFeesExpectedOnline?: number;
  monthFeesCollectedOnline?: number;
  netIncomeThisMonth?: number;
  netIncomeAllTime?: number;
  newPhysicalAdmissionsThisMonth: number;
  leftStudentsThisMonth: number;
  totalCertifiedStudents: number;
  pendingOnlineRegistrations: number;
  monthFeesExpected: number;
  todayAttendanceTotal: number;
  todayAttendancePresent: number;
  unreadContactMessages: number;
  last6Months: MonthFinancialSummary[];
  dueFeeStudents: DueFeeStudent[];
}

// ==============================================================================
// Phase 6: Online Course CMS + LMS Content Types
// ==============================================================================

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface CourseCMS {
  id: string;
  slug: string;
  title: string;
  titleRomanUrdu?: string;
  shortDescription: string;
  shortDescriptionRomanUrdu?: string;
  fullDescription?: string;
  fullDescriptionRomanUrdu?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  isMostPopular?: boolean;
  availableForPhysical?: boolean;
  availableForOnline?: boolean;
  onlinePrice?: number;
  onlineDurationMonths?: number;
  price: number;
  durationValue: number;
  durationUnit: 'weeks' | 'months' | 'hours';
  category: string;
  categoryLabel?: string;
  isFeatured: boolean;
  displayOrder: number;
  status: CourseStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Computed / aggregated
  moduleCount?: number;
  lessonCount?: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  titleRomanUrdu?: string;
  description?: string;
  descriptionRomanUrdu?: string;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  moduleId: string;
  title: string;
  titleRomanUrdu?: string;
  description?: string;
  youtubeVideoId?: string; // Canonical 11-char ID
  durationMinutes: number;
  displayOrder: number;
  isFreePreview: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  resources?: LessonResource[];
}

export type LessonResourceType = 'note' | 'prompt' | 'tool' | 'document' | 'link';

export interface LessonResource {
  id: string;
  lessonId: string;
  title: string;
  resourceType: LessonResourceType;
  description?: string;
  contentText?: string;
  externalUrl?: string;
  storagePath?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// Phase 7: Student LMS Portal + Learning Experience Types
// ==============================================================================

export type EnrollmentStatus = 'active' | 'completed' | 'suspended';

export interface StudentEnrollment {
  id: string;
  userId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  status: EnrollmentStatus;
  startDate?: string;
  expiryDate?: string;
  isExpired?: boolean;
  studentCode?: string;
  enrolledAt: string;
  completedAt?: string | null;
  progressPercentage: number;
  lastAccessedLessonId?: string;
  lastAccessedAt?: string;
}

export interface StudentLessonProgress {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  isCompleted: boolean;
  completedAt?: string | null;
  lastPlayedSeconds: number;
  updatedAt: string;
}

export interface StudentNote {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  lessonTitle?: string;
  noteText: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  questionEn: string;
  questionRoman: string;
  options: {
    id: string;
    textEn: string;
    textRoman: string;
  }[];
  correctOptionId: string;
  explanationEn: string;
  explanationRoman: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  score: number;
  maxScore: number;
  passed: boolean;
  userAnswers: Record<string, string>;
  completedAt: string;
}

export interface CertificateEligibility {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  completedLessons: number;
  lessonsCompleted: boolean;
  quizzesTaken: number;
  quizAverageScore: number;
  quizzesPassed: boolean;
  isEligible: boolean;
  certificateCode?: string;
  issueDate?: string;
}

// ==============================================================================
// Phase 8: Online Payments, Enrollments, Packages, Coupons & Offers Types
// ==============================================================================

export type OnlinePaymentMethod = 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'other';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type EnrollmentStatusExtended = 'active' | 'completed' | 'suspended' | 'expired';

export interface OnlinePaymentRecord {
  id: string;
  referenceNumber: string;
  admissionId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  courseId?: string;
  packageId?: string;
  courseSlug: string;
  courseTitle: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  accountSenderName?: string;
  accountSenderNumber?: string;
  screenshotPath?: string;
  basePrice: number;
  discountAmount: number;
  couponId?: string;
  couponCode?: string;
  offerId?: string;
  offerTitle?: string;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  requestType?: 'registration' | 'additional_course' | 'package';
  selectedCourseIds?: string[];
  accessStatus?: 'pending' | 'granted' | 'denied';
  accessReviewedBy?: string;
  accessReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackageRecord {
  id: string;
  slug: string;
  title: string;
  titleRomanUrdu?: string;
  description: string;
  descriptionRomanUrdu?: string;
  price: number;
  durationMonths: number;
  isActive: boolean;
  displayOrder: number;
  courseSlugs?: string[];
  packageType?: 'all_courses' | 'bundle';
  coursesCount?: number;
  validFrom?: string;
  validUntil?: string;
  isPublic?: boolean;
  eligibleCourseIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  timesUsed: number;
  perUserLimit: number;
  minAmount: number;
  isActive: boolean;
  applicableCourseSlugs?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: CouponRecord;
  discountAmount: number;
  finalPayable: number;
  message: string;
  messageRoman: string;
}

export interface OfferPromoCodeRecord {
  id: string;
  offerId: string;
  code: string;
  usageLimit: number;
  timesUsed: number;
  perUserLimit: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfferRecord {
  id: string;
  title: string;
  titleRomanUrdu: string;
  description: string;
  descriptionRomanUrdu: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  bannerMessage?: string;
  applicableCourseSlugs?: string[] | null;
  requiresPromoCode?: boolean;
  promoCodes?: OfferPromoCodeRecord[];
  createdAt: string;
  updatedAt: string;
}

export type StudentResourceType = 'prompt' | 'pdf' | 'software' | 'video' | 'image' | 'link' | 'template';

export interface StudentResourceRecord {
  id: string;
  title: string;
  description?: string;
  type: StudentResourceType;
  url?: string;
  promptText?: string;
  thumbnailUrl?: string;
  category?: string;
  courseId?: string | null;
  courseTitle?: string;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentHistoryItem {
  action: 'enrolled' | 'extended' | 'suspended' | 'reactivated' | 'expired';
  actorId?: string;
  actorRole?: string;
  timestamp: string;
  previousExpiryDate?: string;
  newExpiryDate?: string;
  reason?: string;
}

export interface DetailedEnrollmentRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userFullName?: string;
  studentCode?: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  paymentId?: string;
  status: EnrollmentStatusExtended;
  startDate: string;
  expiryDate: string;
  isExpired: boolean;
  progressPercentage: number;
  extendedCount: number;
  extensionHistory: EnrollmentHistoryItem[];
  enrolledAt: string;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
}

// ==============================================================================
// Phase 9: Quizzes, Question Bank, Final Exams & Certificates Types
// ==============================================================================

export interface QuizRecord {
  id: string;
  courseId: string;
  courseTitle?: string;
  moduleId?: string;
  lessonId?: string;
  title: string;
  titleRomanUrdu?: string;
  description?: string;
  descriptionRomanUrdu?: string;
  instructions?: string;
  instructionsRomanUrdu?: string;
  durationMinutes: number; // 0 = untimed
  passingScorePercentage: number; // default 70%
  maxAttempts: number;
  isPublished: boolean;
  isArchived: boolean;
  displayOrder: number;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  textEn: string;
  textRoman: string;
}

export interface QuestionBankItem {
  id: string;
  quizId?: string;
  courseId: string;
  questionTextEn: string;
  questionTextRoman: string;
  questionType: 'multiple_choice' | 'true_false';
  options: QuestionOption[];
  correctOptionId: string; // Excluded in student-facing payloads
  explanationEn?: string;
  explanationRoman?: string;
  marks: number;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinalExamRecord {
  id: string;
  courseId: string;
  courseTitle?: string;
  courseSlug?: string;
  title: string;
  titleRomanUrdu?: string;
  description?: string;
  descriptionRomanUrdu?: string;
  instructions?: string;
  instructionsRomanUrdu?: string;
  durationMinutes: number; // default 45 min
  passingPercentage: number; // configurable, default 70.00%
  attemptLimit: number; // default 2
  isPublished: boolean;
  questionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinalExamAttemptRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  examId: string;
  courseId: string;
  courseTitle?: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  passingThreshold: number; // recorded threshold at attempt time (e.g. 70%)
  userAnswers: Record<string, string>;
  status: 'in_progress' | 'completed' | 'expired';
  startedAt: string;
  completedAt: string;
}

export type CertificateStatus = 'valid' | 'revoked';
export type StudentType = 'online' | 'physical';

export interface CertificateRecord {
  id: string;
  certificateCode: string; // e.g. INSPIRE-CERT-2026-0001
  verificationToken: string; // Secure 32-char unguessable token
  studentType: StudentType;
  userId?: string | null;
  physicalStudentId?: string | null;
  courseId?: string | null;
  courseTitle: string;
  courseTitles?: string[];
  durationText?: string | null;
  completionDate?: string | null;
  recipientName: string;
  recipientEmail?: string | null;
  scorePercentage?: number | null;
  finalGrade?: string | null;
  examAttemptId?: string | null;
  issueDate: string;
  status: CertificateStatus;
  issuedBy?: string | null;
  issuedByName?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  revokedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicCertificateVerification {
  found: boolean;
  isValid?: boolean;
  certificateCode?: string;
  recipientName?: string;
  courseTitle?: string;
  courseTitles?: string[];
  durationText?: string | null;
  completionDate?: string | null;
  studentType?: string;
  issueDate?: string;
  scorePercentage?: number | null;
  finalGrade?: string | null;
  status?: 'valid' | 'revoked';
  revokedAt?: string | null;
  revocationReason?: string | null;
  error?: string;
}

// ==============================================================================
// Phase 10: CMS, Reports, Public Settings & Manager Governance Types
// ==============================================================================

export interface SiteSettingsPublic {
  id: string;
  academyName: string;
  tagline: string;
  campusAddress: string;
  phone: string;
  whatsapp: string;
  contactEmail: string;
  defaultLanguage: 'roman-urdu' | 'english';
  noticeTickerEnabled: boolean;
  publicSiteUrl: string;
  socialYoutube?: string;
  socialFacebook?: string;
  socialInstagram?: string;
  paymentJazzcashEnabled?: boolean;
  paymentJazzcashTitle?: string;
  paymentJazzcashNumber?: string;
  paymentEasypaisaEnabled?: boolean;
  paymentEasypaisaTitle?: string;
  paymentEasypaisaNumber?: string;
  paymentBankEnabled?: boolean;
  paymentBankName?: string;
  paymentBankAccountTitle?: string;
  paymentBankAccountNumber?: string;
  paymentBankIban?: string;
  logoUrl?: string;
  openingTime?: string; // 'HH:MM' 24h format, default 09:00
  closingTime?: string; // 'HH:MM' 24h format, default 19:00
  operatingHoursOpen?: string; // 'HH:MM' 24h format, default 09:00
  operatingHoursClose?: string; // 'HH:MM' 24h format, default 19:00
  workingDaysText?: string;
  googleMapsEmbedUrl?: string;
  mapsEmbedUrl?: string;
  introVideoUrl?: string;
  heroPackageImageUrl?: string;
  heroImage1?: string;
  heroImage2?: string;
  heroImage3?: string;
  homeClassImageUrl?: string;
  homeTeacherImageUrl?: string;
  founderPhotoUrl?: string;
  founderName?: string;
  founderImageUrl?: string;
  aboutLeftImageUrl?: string;
  aboutRightImageUrl?: string;
  coursesHeroImages?: string[]; // jsonb array of up to 3 URLs
  whyChooseImages?: string[]; // jsonb array of up to 6 HTTPS image URLs, one per "Why Choose Us" card, in card order
  physicalMonthlyFee?: number; // 5040
  physicalPackageMonths?: number; // 6
  physicalPackageTotal?: number; // 30240
  physicalTotalFee?: number; // 30240
  physicalAdmissionFee?: number; // 0
  physicalCourseCount?: number; // 10
  onlineCoursePrice?: number; // 5000
  onlineCourseDurationMonths?: number; // 6
  certificatePassPercentage?: number; // 70
  updatedBy?: string;
  updatedAt?: string;
}

export type AnnouncementCategory = 'general' | 'admission' | 'exam' | 'holiday' | 'workshop' | 'urgent';
export type AnnouncementAudience = 'all' | 'students' | 'physical_only' | 'online_only';

export interface AnnouncementRecord {
  id: string;
  title: string;
  titleRomanUrdu?: string;
  content: string;
  contentRomanUrdu?: string;
  category: AnnouncementCategory;
  isPublished: boolean;
  isPinned: boolean;
  targetAudience: AnnouncementAudience;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type FAQCategory = 'general' | 'physical' | 'online' | 'admissions' | 'fees' | 'certificates';

export interface FAQRecord {
  id: string;
  question: string;
  questionRomanUrdu: string;
  answer: string;
  answerRomanUrdu: string;
  category: FAQCategory;
  isPublished: boolean;
  displayOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestimonialRecord {
  id: string;
  studentName: string;
  studentCity?: string;
  courseTitle?: string;
  testimonialText: string;
  testimonialTextRomanUrdu?: string;
  rating: number; // 1-5
  avatarUrl?: string;
  status?: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type NoticePriority = 'normal' | 'high' | 'urgent';

export interface NoticeRecord {
  id: string;
  message: string;
  messageRomanUrdu?: string;
  linkUrl?: string;
  isPublished: boolean;
  priority: NoticePriority;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type GalleryCategory = 'campus' | 'lab' | 'workshops' | 'testing' | 'events' | 'students' | 'videos';

export interface GalleryItemRecord {
  id: string;
  title: string;
  titleRomanUrdu?: string;
  category: GalleryCategory;
  description?: string;
  descriptionRomanUrdu?: string;
  location?: string;
  imageUrl?: string;
  mediaType?: 'image' | 'video';
  videoUrl?: string;
  altText?: string;
  displayOrder: number;
  isPublished: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContactMessageStatus = 'new' | 'read' | 'replied' | 'archived';

export interface ContactMessageRecord {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  courseInterest?: string;
  message: string;
  status: ContactMessageStatus;
  adminNotes?: string;
  handledBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ShortSessionRecord {
  id: string;
  title: string;
  titleRomanUrdu?: string;
  skillTopic: string;
  description: string;
  descriptionRomanUrdu?: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  fee: number;
  freeForEnrolledStudents: boolean;
  includesCertificate: boolean; // default false
  eligibilityNotes?: string;
  isPublished: boolean;
  displayOrder: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerUserRecord {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'super_admin' | 'manager';
  isActive: boolean;
  permissions: ManagerPermissionKey[];
  createdAt: string;
}

export interface ComprehensiveReportData {
  generatedAt: string;
  dateRange: { start: string; end: string; preset: string };
  metrics: {
    totalPhysicalStudents: number;
    activePhysicalStudents: number;
    totalOnlineStudents: number;
    totalAdmissions: number;
    approvedAdmissions: number;
    pendingAdmissions: number;
    rejectedAdmissions: number;
    // Revenue metrics (Strict rule: only verified payments counted!)
    verifiedOnlineRevenue: number;
    verifiedPhysicalFees: number;
    totalVerifiedRevenue: number;
    pendingPaymentsAmount: number;
    totalExpenses: number;
    netOperatingBalance: number;
    // Attendance
    totalAttendanceDays: number;
    presentCount: number;
    absentCount: number;
    attendanceRatePercentage: number;
    // Academic & LMS
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    averageCourseProgress: number;
    totalCertificatesIssued: number;
    validCertificates: number;
    revokedCertificates: number;
  };
  breakdowns: {
    revenueByMethod: Record<string, number>;
    expensesByCategory: Record<string, number>;
    studentsByCourse: Record<string, number>;
    admissionsByStatus: Record<string, number>;
    certificatesByGrade: Record<string, number>;
  };
}

export interface ChatbotSettings {
  id: string;
  isEnabled: boolean;
  greetingEn?: string;
  greetingRomanUrdu?: string;
  extraInstructions?: string;
  fallbackMessage?: string;
  updatedAt?: string;
}

export interface ChatbotKnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords?: string | string[];
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}




