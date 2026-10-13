import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StudentEnrollment } from '../types';

export type StudentAccessState =
  | 'deactivated'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'pending_payment'
  | 'payment_verified_pending_access'
  | 'access_denied'
  | 'payment_rejected'
  | 'no_enrollment';

export interface LatestPaymentInfo {
  id?: string;
  admissionId?: string;
  referenceNumber?: string;
  courseTitle?: string;
  amount?: number;
  finalAmount?: number;
  paymentStatus?: string;
  accessStatus?: string;
  rejectionReason?: string | null;
  createdAt?: string;
  senderName?: string;
  transactionId?: string;
}

export interface StudentAccessResult {
  state: StudentAccessState;
  enrolledCourses: StudentEnrollment[];
  expiryDate: string | null;
  latestPayment: LatestPaymentInfo | null;
  rejectionReason: string | null;
  isDeactivated: boolean;
  statusMessage?: string | null;
}

export interface ResolveAccessInput {
  profile: { is_active?: boolean | null } | null;
  enrollments: any[];
  latestPayment: any | null;
  nowIsoDate?: string; // YYYY-MM-DD
}

/**
 * Pure state resolution logic strictly adhering to business rules:
 * 1. 'deactivated' (profiles.is_active = false)
 * 2. 'active' (at least one student_enrollments row with status active/completed and not expired)
 * 3. 'suspended' (all enrollments suspended or cancelled)
 * 4. 'expired' (enrollments expired)
 * 5. 'pending_payment' (an online_payments row with status pending and no active enrollment)
 * 6. 'payment_rejected' (latest online_payments row rejected, with the rejection reason)
 * 7. 'no_enrollment' (none of the above)
 */
export function resolveStudentAccessState(input: ResolveAccessInput): StudentAccessState {
  const { profile, enrollments, latestPayment, nowIsoDate } = input;
  const todayStr = nowIsoDate || new Date().toISOString().split('T')[0];

  // 1. Deactivated check: profiles.is_active = false
  if (profile && profile.is_active === false) {
    return 'deactivated';
  }

  // Check enrollment states
  if (enrollments && enrollments.length > 0) {
    // Check if any enrollment is active/completed and not expired
    const hasActiveEnrollment = enrollments.some((enr) => {
      const isStatusEligible = enr.status === 'active' || enr.status === 'completed';
      if (!isStatusEligible) return false;
      if (!enr.expiry_date) return true;
      return enr.expiry_date >= todayStr;
    });

    if (hasActiveEnrollment) {
      return 'active';
    }

    // Check if all enrollments are suspended or cancelled
    const allSuspendedOrCancelled = enrollments.every(
      (enr) => enr.status === 'suspended' || enr.status === 'cancelled'
    );
    if (allSuspendedOrCancelled) {
      return 'suspended';
    }

    // Check if any/all expired (i.e. status is expired, or active/completed but past expiry date)
    const hasExpiredEnrollment = enrollments.some((enr) => {
      if (enr.status === 'expired') return true;
      if (enr.expiry_date && enr.expiry_date < todayStr) return true;
      return false;
    });

    if (hasExpiredEnrollment) {
      return 'expired';
    }
  }

  // If no active/suspended/expired enrollments, check online payments
  if (latestPayment) {
    const payStatus = latestPayment.payment_status || latestPayment.paymentStatus;
    const accessStatus = latestPayment.access_status || latestPayment.accessStatus;

    if (payStatus === 'verified') {
      if (accessStatus === 'denied') {
        return 'access_denied';
      }
      return 'payment_verified_pending_access';
    }
    if (payStatus === 'pending') {
      return 'pending_payment';
    }
    if (payStatus === 'rejected') {
      return 'payment_rejected';
    }
  }

  // 7. No enrollment
  return 'no_enrollment';
}

export const StudentAccessService = {
  /**
   * Fetches real Supabase data and computes access status for a student.
   * No catalog fallbacks or fake demo data.
   */
  async getStudentAccess(userId: string): Promise<StudentAccessResult> {
    if (!userId) {
      return {
        state: 'no_enrollment',
        enrolledCourses: [],
        expiryDate: null,
        latestPayment: null,
        rejectionReason: null,
        isDeactivated: false,
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      // In unconfigured environment without Supabase credentials
      return {
        state: 'no_enrollment',
        enrolledCourses: [],
        expiryDate: null,
        latestPayment: null,
        rejectionReason: null,
        isDeactivated: false,
      };
    }

    try {
      // 1. Fetch Profile (is_active)
      const { data: profileData, error: profErr } = await supabase
        .from('profiles')
        .select('id, is_active, role')
        .eq('id', userId)
        .maybeSingle();

      if (profErr) {
        console.warn('[StudentAccessService] Error querying profile:', profErr.message);
      }

      // 2. Fetch Enrollments
      const { data: enrollmentsData, error: enrErr } = await supabase
        .from('student_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          status,
          progress_percentage,
          last_accessed_lesson_id,
          last_accessed_at,
          enrolled_at,
          completed_at,
          start_date,
          expiry_date,
          student_code,
          courses:course_id (
            id,
            slug,
            title,
            title_roman_urdu,
            short_description,
            short_description_roman_urdu,
            category,
            category_label,
            duration_value,
            duration_unit
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (enrErr) {
        console.warn('[StudentAccessService] Error querying enrollments:', enrErr.message);
      }

      // 3. Fetch latest online payment (either by user_id directly or via admission)
      // Check admissions first to link payment if needed
      const { data: admissionsData } = await supabase
        .from('admissions')
        .select('id')
        .eq('user_id', userId);

      const admissionIds = (admissionsData || []).map((a) => a.id);

      let paymentsQuery = supabase
        .from('online_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (admissionIds.length > 0) {
        paymentsQuery = paymentsQuery.or(`user_id.eq.${userId},admission_id.in.(${admissionIds.join(',')})`);
      } else {
        paymentsQuery = paymentsQuery.eq('user_id', userId);
      }

      const { data: paymentsData, error: payErr } = await paymentsQuery;

      if (payErr) {
        console.warn('[StudentAccessService] Error querying payments:', payErr.message);
      }

      const rawEnrollments = enrollmentsData || [];
      const latestPayRecord = paymentsData && paymentsData.length > 0 ? paymentsData[0] : null;

      // Map enrollments to StudentEnrollment type
      const mappedEnrollments: StudentEnrollment[] = rawEnrollments.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        courseId: item.course_id,
        status: item.status,
        progressPercentage: Number(item.progress_percentage || 0),
        lastAccessedLessonId: item.last_accessed_lesson_id || undefined,
        lastAccessedAt: item.last_accessed_at || undefined,
        enrolledAt: item.enrolled_at || item.created_at || '',
        completedAt: item.completed_at || undefined,
        startDate: item.start_date || undefined,
        expiryDate: item.expiry_date || undefined,
        studentCode: item.student_code || undefined,
        courseTitle: item.courses?.title,
        courseSlug: item.courses?.slug,
      }));

      const todayStr = new Date().toISOString().split('T')[0];
      const state = resolveStudentAccessState({
        profile: profileData,
        enrollments: rawEnrollments,
        latestPayment: latestPayRecord,
        nowIsoDate: todayStr,
      });

      // Find nearest or active expiryDate
      let expiryDate: string | null = null;
      const activeEnr = rawEnrollments.find(
        (e: any) => (e.status === 'active' || e.status === 'completed') && (!e.expiry_date || e.expiry_date >= todayStr)
      );
      if (activeEnr?.expiry_date) {
        expiryDate = activeEnr.expiry_date;
      } else if (rawEnrollments[0]?.expiry_date) {
        expiryDate = rawEnrollments[0].expiry_date;
      }

      const latestPayment: LatestPaymentInfo | null = latestPayRecord
        ? {
            id: latestPayRecord.id,
            admissionId: latestPayRecord.admission_id,
            referenceNumber: latestPayRecord.reference_number,
            courseTitle: latestPayRecord.course_title || latestPayRecord.course_slug,
            amount: Number(latestPayRecord.amount || 0),
            finalAmount: Number(latestPayRecord.final_amount || latestPayRecord.amount || 0),
            paymentStatus: latestPayRecord.payment_status,
            accessStatus: latestPayRecord.access_status,
            rejectionReason: latestPayRecord.rejection_reason || null,
            createdAt: latestPayRecord.created_at,
            senderName: latestPayRecord.sender_name,
            transactionId: latestPayRecord.transaction_id,
          }
        : null;

      let statusMessage: string | null = null;
      if (state === 'payment_verified_pending_access') {
        statusMessage = 'Your payment is verified. The academy will open your course shortly.';
      } else if (state === 'access_denied') {
        statusMessage = 'Access was not granted. Please contact the academy.';
      } else if (state === 'pending_payment' && latestPayRecord) {
        statusMessage = 'Waiting for admin payment verification';
      }

      return {
        state,
        enrolledCourses: mappedEnrollments,
        expiryDate,
        latestPayment,
        rejectionReason: latestPayRecord?.rejection_reason || null,
        isDeactivated: profileData?.is_active === false,
        statusMessage,
      };
    } catch (err: any) {
      console.error('[StudentAccessService] Unexpected exception:', err?.message || err);
      return {
        state: 'no_enrollment',
        enrolledCourses: [],
        expiryDate: null,
        latestPayment: null,
        rejectionReason: null,
        isDeactivated: false,
      };
    }
  },
};
