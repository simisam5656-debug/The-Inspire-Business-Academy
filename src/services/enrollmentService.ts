import { DetailedEnrollmentRecord, EnrollmentStatusExtended } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const EnrollmentService = {
  /**
   * Admin: Get all student enrollments with details
   */
  async getAllEnrollments(statusFilter?: string): Promise<DetailedEnrollmentRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('student_enrollments')
          .select(`
            *,
            courses (
              slug,
              title
            ),
            profiles:user_id (
              email,
              full_name,
              student_code
            )
          `)
          .order('enrolled_at', { ascending: false });

        if (!error && data) {
          const today = new Date().toISOString().split('T')[0];

          return data
            .map((row: any) => {
              const isPastExpiry = row.expiry_date ? row.expiry_date < today : false;
              let effectiveStatus: EnrollmentStatusExtended = row.status;
              if (row.status === 'active' && isPastExpiry) {
                effectiveStatus = 'expired';
              }

              return {
                id: row.id,
                userId: row.user_id,
                userEmail: row.profiles?.email || '',
                userFullName: row.profiles?.full_name || 'Online Student',
                studentCode: row.student_code || row.profiles?.student_code || 'IBA-STUDENT',
                courseId: row.course_id,
                courseSlug: row.courses?.slug || 'course',
                courseTitle: row.courses?.title || 'Online Course',
                paymentId: row.payment_id,
                status: effectiveStatus,
                startDate: row.start_date || row.enrolled_at?.split('T')[0] || today,
                expiryDate: row.expiry_date || today,
                isExpired: isPastExpiry,
                progressPercentage: Number(row.progress_percentage || 0),
                extendedCount: Number(row.extended_count || 0),
                extensionHistory: Array.isArray(row.extension_history) ? row.extension_history : [],
                enrolledAt: row.enrolled_at,
                completedAt: row.completed_at,
                lastAccessedAt: row.last_accessed_at,
              };
            })
            .filter((item) => {
              if (!statusFilter || statusFilter === 'all') return true;
              return item.status === statusFilter;
            });
        }
      } catch (err) {
        console.warn('Error fetching detailed enrollments:', err);
      }
    }

    return [];
  },

  /**
   * Admin: Approve Online Registration & Activate Student Access
   */
  async approveOnlineRegistration(
    admissionId: string,
    adminNotes?: string,
    bypassPaymentCheck: boolean = false,
    exceptionReason?: string
  ): Promise<{
    ok: boolean;
    studentCode?: string;
    expiryDate?: string;
    error?: string;
    paymentPending?: boolean;
  }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/approve-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          admissionId,
          adminNotes,
          bypassPaymentCheck: Boolean(bypassPaymentCheck),
          exceptionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Approval failed',
          paymentPending: Boolean(data.paymentPending),
        };
      }

      return {
        ok: true,
        studentCode: data.studentCode,
        expiryDate: data.expiryDate,
      };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Admin: Extend Enrollment Expiry Date
   */
  async extendEnrollment(
    enrollmentId: string,
    daysToAdd: number = 30,
    newExpiryDate?: string,
    reason?: string
  ): Promise<{ ok: boolean; message?: string; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'extend',
          enrollmentId,
          daysToAdd,
          newExpiryDate,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to extend enrollment' };
      }

      return { ok: true, message: data.message };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Admin: Suspend Enrollment
   */
  async suspendEnrollment(enrollmentId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'suspend', enrollmentId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to suspend enrollment' };
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Admin: Reactivate Enrollment
   */
  async reactivateEnrollment(enrollmentId: string, reason?: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reactivate', enrollmentId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to reactivate enrollment' };
      }

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Check if a student currently has active non-expired access to a course
   */
  async checkStudentCourseAccess(
    userId: string,
    courseSlug: string
  ): Promise<{
    hasAccess: boolean;
    status: 'active' | 'pending' | 'expired' | 'suspended' | 'not_enrolled';
    expiryDate?: string;
    studentCode?: string;
    message?: string;
    messageRoman?: string;
  }> {
    if (!userId) {
      return {
        hasAccess: false,
        status: 'not_enrolled',
        message: 'Please sign in to access course lectures.',
        messageRoman: 'Class lectures dekhne ke liye pehle login karein.',
      };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Query enrollment
        const { data, error } = await supabase
          .from('student_enrollments')
          .select(`
            id,
            status,
            start_date,
            expiry_date,
            student_code,
            courses!inner (
              slug
            )
          `)
          .eq('user_id', userId)
          .eq('courses.slug', courseSlug)
          .maybeSingle();

        if (!error && data) {
          const today = new Date().toISOString().split('T')[0];
          const isExpired = data.expiry_date && data.expiry_date < today;

          if (data.status === 'suspended') {
            return {
              hasAccess: false,
              status: 'suspended',
              studentCode: data.student_code,
              message: 'Your course access has been suspended by academy administration.',
              messageRoman: 'Aap ka course access administration ki janib se muattal (suspended) hai.',
            };
          }

          if (isExpired) {
            return {
              hasAccess: false,
              status: 'expired',
              expiryDate: data.expiry_date,
              studentCode: data.student_code,
              message: `Your 6-month access expired on ${data.expiry_date}. Please contact administration for renewal.`,
              messageRoman: `Aap ka 6-maah ka course access ${data.expiry_date} ko khatam ho chuka hai. Extension ke liye helpline se rabta karein.`,
            };
          }

          if (data.status === 'active' || data.status === 'completed') {
            return {
              hasAccess: true,
              status: 'active',
              expiryDate: data.expiry_date,
              studentCode: data.student_code,
            };
          }
        }

        // Check if pending registration exists
        const { data: adm } = await supabase
          .from('admissions')
          .select('status, reference_number')
          .eq('user_id', userId)
          .eq('course_slug', courseSlug)
          .maybeSingle();

        if (adm && adm.status === 'pending') {
          return {
            hasAccess: false,
            status: 'pending',
            message: `Your application (${adm.reference_number}) is awaiting payment verification.`,
            messageRoman: `Aap ki registration (${adm.reference_number}) receive ho gayi hai. Payment verification ke baad access diya jayega.`,
          };
        }
      } catch (err) {
        console.warn('Error checking access:', err);
      }
    }

    return {
      hasAccess: false,
      status: 'not_enrolled',
      message: 'You are not enrolled in this course.',
    };
  },

  /**
   * Admin: Manually grant access to a course without payment
   */
  async manualGrantAccess(
    userId: string,
    courseId: string,
    reason?: string
  ): Promise<{ ok: boolean; enrollment?: any; studentCode?: string; expiryDate?: string; error?: string }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'grant', userId, courseId, reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to grant course access' };
      }

      return {
        ok: true,
        enrollment: data.enrollment,
        studentCode: data.studentCode,
        expiryDate: data.expiryDate,
      };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },
};
