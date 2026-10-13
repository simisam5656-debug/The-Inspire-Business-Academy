export interface ProvisionEnrollmentParams {
  supabase: any;
  userId: string;
  courseId: string;
  paymentId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  mode?: 'initial' | 'recheck';
}

export interface ProvisionEnrollmentResult {
  ok: boolean;
  enrollment?: any;
  studentCode?: string;
  expiryDate?: string;
  startDate?: string;
  durationMonths?: number;
  isExisting?: boolean;
  status?: string;
  note?: string;
  error?: string;
}

function generateStudentCode(counter: number = 1): string {
  const year = new Date().getFullYear();
  const pad = String(counter).padStart(4, '0');
  return `IBA-ONL-${year}-${pad}`;
}

/**
 * Shared helper to provision or reactivate online student enrollments.
 * - Ensures user profile has role 'online_student' and a unique student_code
 * - Computes start_date and expiry_date based on course duration
 * - Idempotently creates or updates the single student_enrollments record
 *   (enforcing UNIQUE(user_id, course_id))
 * - Links payment_id
 */
export async function provisionEnrollment(
  params: ProvisionEnrollmentParams
): Promise<ProvisionEnrollmentResult> {
  const { supabase, userId, courseId, paymentId } = params;

  if (!userId || typeof userId !== 'string') {
    return { ok: false, error: 'User ID is required for enrollment provisioning.' };
  }

  if (!courseId || typeof courseId !== 'string') {
    return { ok: false, error: 'Course ID is required for enrollment provisioning.' };
  }

  // 1. Fetch user profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('id, student_code, role, email')
    .eq('id', userId)
    .maybeSingle();

  if (profErr) {
    return { ok: false, error: `Failed to query profile: ${profErr.message}` };
  }

  if (!profile) {
    return {
      ok: false,
      error: `Student user account not found for ID ${userId}. Student must have a profile before enrollment.`,
    };
  }

  // 2. Determine or generate unique student code
  let studentCode = profile.student_code;

  if (!studentCode) {
    const { count: studentCount, error: countErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('student_code', 'is', null);

    if (countErr) {
      return { ok: false, error: `Failed to count student codes: ${countErr.message}` };
    }

    const nextNumber = (studentCount || 0) + 1;
    studentCode = generateStudentCode(nextNumber);
  }

  // 3. Update profile role to online_student and assign student_code
  const { error: profUpErr } = await supabase
    .from('profiles')
    .update({
      role: 'online_student',
      student_code: studentCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (profUpErr) {
    return { ok: false, error: `Failed to update student profile: ${profUpErr.message}` };
  }

  // 4. Fetch course record to calculate duration
  const { data: course, error: cErr } = await supabase
    .from('courses')
    .select('id, title, status, duration_value, duration_unit, online_duration_months')
    .eq('id', courseId)
    .maybeSingle();

  if (cErr) {
    return { ok: false, error: `Failed to query course: ${cErr.message}` };
  }

  if (!course) {
    return { ok: false, error: 'Associated course record not found.' };
  }

  const durationMonths = Number(
    (course as any).online_duration_months ||
      (course.duration_unit === 'months' ? course.duration_value : 6) ||
      6
  );

  // 5. Calculate start and expiry dates
  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + durationMonths);

  const startDateStr = startDate.toISOString().split('T')[0];
  const expiryDateStr = expiryDate.toISOString().split('T')[0];

  // 6. Idempotently create or update student_enrollments record
  const { data: existingEnrollment, error: enrLookupErr } = await supabase
    .from('student_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (enrLookupErr) {
    return { ok: false, error: `Failed to verify existing student enrollment record: ${enrLookupErr.message}` };
  }

  const mode = params.mode || 'initial';

  let enrollmentRecord: any = null;

  if (existingEnrollment) {
    if (mode === 'recheck') {
      // In 'recheck' mode with an existing enrollment:
      // 1. if it is 'suspended' or 'cancelled', do NOT reactivate it and return its current status with a note
      if (existingEnrollment.status === 'suspended' || existingEnrollment.status === 'cancelled') {
        return {
          ok: true,
          enrollment: existingEnrollment,
          studentCode: existingEnrollment.student_code || studentCode,
          expiryDate: existingEnrollment.expiry_date,
          startDate: existingEnrollment.start_date,
          durationMonths,
          isExisting: true,
          status: existingEnrollment.status,
          note: `Enrollment is currently ${existingEnrollment.status}. Not reactivated during recheck.`,
        };
      }

      // 2. if it is 'active' and not expired, change NOTHING (keep start_date and expiry_date)
      const isExpired =
        existingEnrollment.status === 'expired' ||
        (existingEnrollment.expiry_date && new Date(existingEnrollment.expiry_date).getTime() < Date.now());

      if (existingEnrollment.status === 'active' && !isExpired) {
        return {
          ok: true,
          enrollment: existingEnrollment,
          studentCode: existingEnrollment.student_code || studentCode,
          expiryDate: existingEnrollment.expiry_date,
          startDate: existingEnrollment.start_date,
          durationMonths,
          isExisting: true,
          status: 'active',
          note: 'Enrollment is active; preserved during recheck.',
        };
      }

      // 3. if it is 'expired', renew it normally (proceeds to update block below)
    }

    // In 'initial' mode or when 'expired' in recheck mode: activate or renew
    const { data: updatedEnr, error: upEnrErr } = await supabase
      .from('student_enrollments')
      .update({
        status: 'active',
        start_date: startDateStr,
        expiry_date: expiryDateStr,
        student_code: studentCode,
        payment_id: paymentId || existingEnrollment.payment_id,
      })
      .eq('id', existingEnrollment.id)
      .select()
      .single();

    if (upEnrErr || !updatedEnr) {
      return {
        ok: false,
        error: `Failed to update student enrollment record: ${upEnrErr?.message || 'Database error'}`,
      };
    }
    enrollmentRecord = updatedEnr;
  } else {
    // Missing enrollment: create normally
    const { data: newEnr, error: enrErr } = await supabase
      .from('student_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        status: 'active',
        start_date: startDateStr,
        expiry_date: expiryDateStr,
        student_code: studentCode,
        payment_id: paymentId || null,
        progress_percentage: 0,
      })
      .select()
      .single();

    if (enrErr || !newEnr) {
      return {
        ok: false,
        error: `Failed to create student enrollment record: ${enrErr?.message || 'Database error'}`,
      };
    }
    enrollmentRecord = newEnr;
  }

  return {
    ok: true,
    enrollment: enrollmentRecord,
    studentCode,
    expiryDate: enrollmentRecord.expiry_date || expiryDateStr,
    startDate: enrollmentRecord.start_date || startDateStr,
    durationMonths,
    isExisting: Boolean(existingEnrollment),
    status: enrollmentRecord.status || 'active',
  };
}
