import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  CertificateRecord,
  PublicCertificateVerification,
} from '../types';
import { siteConfig } from '../config/site';
import { AssessmentService } from './assessmentService';

export const CertificateService = {
  // ============================================================================
  // CERTIFICATE ADMINISTRATION (ADMIN)
  // ============================================================================
  async getAllCertificates(filters?: {
    status?: string;
    studentType?: string;
    search?: string;
  }): Promise<CertificateRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('certificates')
          .select('*, profiles!certificates_issued_by_fkey(full_name)')
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.studentType && filters.studentType !== 'all') {
          query = query.eq('student_type', filters.studentType);
        }

        const { data, error } = await query;
        if (!error && data) {
          let list = data.map((c: any) => ({
            id: c.id,
            certificateCode: c.certificate_code,
            verificationToken: c.verification_token,
            studentType: c.student_type,
            userId: c.user_id,
            physicalStudentId: c.physical_student_id,
            courseId: c.course_id,
            courseTitle: c.course_title,
            recipientName: c.recipient_name,
            recipientEmail: c.recipient_email,
            scorePercentage: c.score_percentage ? Number(c.score_percentage) : null,
            finalGrade: c.final_grade,
            examAttemptId: c.exam_attempt_id,
            issueDate: c.issue_date,
            status: c.status,
            issuedBy: c.issued_by,
            issuedByName: c.profiles?.full_name || 'Admin',
            revokedAt: c.revoked_at,
            revocationReason: c.revocation_reason,
            revokedBy: c.revoked_by,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));

          if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            list = list.filter(
              (c: CertificateRecord) =>
                c.certificateCode.toLowerCase().includes(q) ||
                c.recipientName.toLowerCase().includes(q) ||
                c.courseTitle.toLowerCase().includes(q)
            );
          }
          return list;
        }
      } catch (err) {
        console.warn('CertificateService.getAllCertificates db error:', err);
      }
    }

    let list = [...fallbackCertificatesStore];
    if (filters?.status && filters.status !== 'all') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.studentType && filters.studentType !== 'all') {
      list = list.filter((c) => c.studentType === filters.studentType);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.certificateCode.toLowerCase().includes(q) ||
          c.recipientName.toLowerCase().includes(q) ||
          c.courseTitle.toLowerCase().includes(q)
      );
    }
    return list;
  },

  async getStudentCertificates(userId: string): Promise<CertificateRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', userId)
          .order('issue_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((c: any) => ({
            id: c.id,
            certificateCode: c.certificate_code,
            verificationToken: c.verification_token,
            studentType: c.student_type,
            userId: c.user_id,
            physicalStudentId: c.physical_student_id,
            courseId: c.course_id,
            courseTitle: c.course_title,
            recipientName: c.recipient_name,
            recipientEmail: c.recipient_email,
            scorePercentage: c.score_percentage ? Number(c.score_percentage) : null,
            finalGrade: c.final_grade,
            examAttemptId: c.exam_attempt_id,
            issueDate: c.issue_date,
            status: c.status,
            issuedBy: c.issued_by,
            revokedAt: c.revoked_at,
            revocationReason: c.revocation_reason,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
        }
      } catch (err) {
        console.warn('CertificateService.getStudentCertificates db error:', err);
      }
    }

    return fallbackCertificatesStore.filter((c) => c.userId === userId);
  },

  /**
   * Authoritative Eligibility Validation:
   * Online students MUST have:
   * 1. Active, non-expired, non-suspended enrollment
   * 2. Completed final exam with score >= configured pass mark (default 70%)
   * 3. No existing active certificate for this course
   */
  async checkOnlineCertificateEligibility(userId: string, courseId: string) {
    let enrollmentValid = false;
    let enrollmentReason = '';
    let passedExamAttempt: any = null;
    let existingCert: CertificateRecord | null = null;
    let courseTitle = 'Certified Program';

    if (isSupabaseConfigured && supabase) {
      // 1. Check existing certificate
      const { data: certs } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'valid');

      if (certs && certs.length > 0) {
        existingCert = {
          id: certs[0].id,
          certificateCode: certs[0].certificate_code,
          verificationToken: certs[0].verification_token,
          studentType: 'online',
          userId: certs[0].user_id,
          courseId: certs[0].course_id,
          courseTitle: certs[0].course_title,
          recipientName: certs[0].recipient_name,
          issueDate: certs[0].issue_date,
          status: certs[0].status,
          createdAt: certs[0].created_at,
          updatedAt: certs[0].updated_at,
        };
      }

      // 2. Check enrollment
      const { data: enr } = await supabase
        .from('student_enrollments')
        .select('*, courses(title)')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!enr) {
        enrollmentReason = 'No active enrollment found for this course.';
      } else if (enr.status === 'suspended') {
        enrollmentReason = 'Course enrollment is currently suspended.';
      } else if (enr.expiry_date && new Date(enr.expiry_date) < new Date()) {
        enrollmentReason = 'Course enrollment has expired. Please renew access.';
      } else {
        enrollmentValid = true;
        if (enr.courses?.title) courseTitle = enr.courses.title;
      }

      // 3. Check final exam attempts
      const { data: attempts } = await supabase
        .from('final_exam_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('passed', true)
        .order('score', { ascending: false });

      if (attempts && attempts.length > 0) {
        passedExamAttempt = attempts[0];
      }
    } else {
      // Fallback check
      existingCert = fallbackCertificatesStore.find((c) => c.userId === userId && c.courseId === courseId && c.status === 'valid') || null;
      enrollmentValid = true;
      const memAttempts = await AssessmentService.getStudentExamAttempts(userId);
      const passed = memAttempts.find((a) => a.courseId === courseId && a.passed);
      if (passed) passedExamAttempt = passed;
    }

    const isEligible = enrollmentValid && Boolean(passedExamAttempt) && !existingCert;

    return {
      isEligible,
      enrollmentValid,
      enrollmentReason,
      passedExamAttempt,
      existingCertificate: existingCert,
      courseTitle,
      passMarkRequired: siteConfig.onlineCourses.finalExamPassMarkPercent, // 70
    };
  },

  /**
   * Issue Online Certificate
   */
  async issueOnlineCertificate(
    userId: string,
    courseId: string,
    actorId: string,
    actorRole: string
  ): Promise<CertificateRecord> {
    const eligibility = await this.checkOnlineCertificateEligibility(userId, courseId);
    if (!eligibility.isEligible) {
      if (eligibility.existingCertificate) {
        throw new Error(`Sanad pehle se jari shuda hai: ${eligibility.existingCertificate.certificateCode}`);
      }
      if (!eligibility.passedExamAttempt) {
        throw new Error(`Final exam kamyabi se pass nahi hua. Kam az kam ${eligibility.passMarkRequired}% score darkar hai.`);
      }
      throw new Error(eligibility.enrollmentReason || 'Aap is sanad ke ahel nahi hain.');
    }

    // Fetch student profile name & email
    let studentName = 'Student';
    let studentEmail = '';
    if (isSupabaseConfigured && supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      if (profile) {
        studentName = profile.full_name;
        studentEmail = profile.email;
      }
    }

    const scorePercentage = eligibility.passedExamAttempt ? Number(eligibility.passedExamAttempt.percentage) : 75.0;
    const finalGrade = calculateGrade(scorePercentage);
    const certificateCode = await generateUniqueCertificateCode();
    const verificationToken = generateVerificationToken();
    const today = new Date().toISOString().split('T')[0];

    const newCert: CertificateRecord = {
      id: `cert-${Date.now()}`,
      certificateCode,
      verificationToken,
      studentType: 'online',
      userId,
      courseId,
      courseTitle: eligibility.courseTitle,
      recipientName: studentName,
      recipientEmail: studentEmail,
      scorePercentage,
      finalGrade,
      examAttemptId: eligibility.passedExamAttempt?.id,
      issueDate: today,
      status: 'valid',
      issuedBy: actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          certificate_code: certificateCode,
          verification_token: verificationToken,
          student_type: 'online',
          user_id: userId,
          course_id: courseId,
          course_title: eligibility.courseTitle,
          recipient_name: studentName,
          recipient_email: studentEmail,
          score_percentage: scorePercentage,
          final_grade: finalGrade,
          exam_attempt_id: eligibility.passedExamAttempt?.id,
          issue_date: today,
          status: 'valid',
          issued_by: actorId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      newCert.id = data.id;

      // Audit Log
      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole,
          action: 'issue_online_certificate',
          entity: 'certificates',
          entity_id: data.id,
          details: {
            certificateCode,
            studentName,
            courseTitle: eligibility.courseTitle,
            scorePercentage,
          },
        });
      } catch (_) {}
    } else {
      fallbackCertificatesStore.push(newCert);
    }

    return newCert;
  },

  /**
   * Issue Physical Certificate
   * Selects an existing physical student from physical_students table
   */
  async issuePhysicalCertificate(
    physicalStudentId: string,
    courseTitle: string,
    actorId: string,
    actorRole: string,
    scorePercentage?: number,
    grade?: string
  ): Promise<CertificateRecord> {
    let studentName = 'Physical Student';
    let studentCode = '';

    if (isSupabaseConfigured && supabase) {
      const { data: ps, error } = await supabase
        .from('physical_students')
        .select('full_name, student_id_code')
        .eq('id', physicalStudentId)
        .single();

      if (error || !ps) throw new Error(error ? `Physical student record nahi mila: ${error.message}` : 'Physical student record nahi mila.');
      studentName = ps.full_name;
      studentCode = ps.student_id_code;
    }

    const certificateCode = await generateUniqueCertificateCode();
    const verificationToken = generateVerificationToken();
    const today = new Date().toISOString().split('T')[0];
    const finalGrade = grade || (scorePercentage ? calculateGrade(scorePercentage) : 'Certified Graduate');

    const newCert: CertificateRecord = {
      id: `cert-p-${Date.now()}`,
      certificateCode,
      verificationToken,
      studentType: 'physical',
      physicalStudentId,
      courseTitle: courseTitle || 'Physical Academy Professional Diploma',
      recipientName: studentName,
      scorePercentage: scorePercentage || null,
      finalGrade,
      issueDate: today,
      status: 'valid',
      issuedBy: actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          certificate_code: certificateCode,
          verification_token: verificationToken,
          student_type: 'physical',
          physical_student_id: physicalStudentId,
          course_title: newCert.courseTitle,
          recipient_name: studentName,
          score_percentage: scorePercentage || null,
          final_grade: finalGrade,
          issue_date: today,
          status: 'valid',
          issued_by: actorId,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      newCert.id = data.id;

      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole,
          action: 'issue_physical_certificate',
          entity: 'certificates',
          entity_id: data.id,
          details: {
            certificateCode,
            studentName,
            studentCode,
            courseTitle: newCert.courseTitle,
          },
        });
      } catch (_) {}
    } else {
      fallbackCertificatesStore.push(newCert);
    }

    return newCert;
  },

  /**
   * Revoke Certificate with mandatory reason
   */
  async revokeCertificate(
    certificateId: string,
    reason: string,
    actorId: string,
    actorRole: string
  ): Promise<void> {
    if (!reason || !reason.trim()) {
      throw new Error('Certificate revoke karne ke liye waja (reason) darj karna lazmi hai.');
    }

    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('certificates')
        .update({
          status: 'revoked',
          revoked_at: now,
          revocation_reason: reason.trim(),
          revoked_by: actorId,
          updated_at: now,
        })
        .eq('id', certificateId);

      if (error) throw new Error(error.message);

      try {
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          actor_role: actorRole,
          action: 'revoke_certificate',
          entity: 'certificates',
          entity_id: certificateId,
          details: { reason: reason.trim(), revokedAt: now },
        });
      } catch (_) {}
      return;
    }

    const idx = fallbackCertificatesStore.findIndex((c) => c.id === certificateId);
    if (idx !== -1) {
      fallbackCertificatesStore[idx] = {
        ...fallbackCertificatesStore[idx],
        status: 'revoked',
        revokedAt: now,
        revocationReason: reason.trim(),
        revokedBy: actorId,
      };
    }
  },

  /**
   * Public Safe Certificate Verification
   * Authoritative: Returns valid ONLY when verified by Supabase DB / server API
   */
  async verifyCertificatePublic(identifier: string): Promise<PublicCertificateVerification> {
    const cleanId = identifier.trim();
    if (!cleanId) return { found: false, error: 'Certificate code or verification token is required.' };

    try {
      // 1. Authoritative: Query server API endpoint
      const res = await fetch(`/api/certificates/verify?code=${encodeURIComponent(cleanId)}`);
      const data = await res.json();

      if (res.ok && data.found && data.certificate) {
        return {
          found: true,
          isValid: Boolean(data.isValid),
          certificateCode: data.certificate.certificateCode,
          recipientName: data.certificate.recipientName,
          courseTitle: data.certificate.courseTitle,
          courseTitles: data.certificate.courseTitles,
          durationText: data.certificate.durationText,
          completionDate: data.certificate.completionDate,
          studentType: data.certificate.studentType,
          issueDate: data.certificate.issueDate,
          scorePercentage: data.certificate.scorePercentage ? Number(data.certificate.scorePercentage) : null,
          finalGrade: data.certificate.finalGrade,
          status: data.certificate.status,
          revokedAt: data.certificate.revokedAt,
          revocationReason: data.certificate.revocationReason,
        };
      }

      if (res.status === 404 || (data && data.found === false && !data.error?.includes('Database'))) {
        return { found: false };
      }

      return {
        found: false,
        error: data.error || 'Certificate verification service error.',
      };
    } catch (apiErr) {
      // Direct Supabase fallback if browser cannot reach server API
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: cert, error: dbErr } = await supabase
            .from('certificates')
            .select('certificate_code, recipient_name, course_title, course_titles, duration_text, completion_date, student_type, issue_date, score_percentage, final_grade, status, revoked_at, revocation_reason')
            .or(`certificate_code.eq.${cleanId},verification_token.eq.${cleanId}`)
            .maybeSingle();

          if (dbErr) {
            return { found: false, error: 'Database query error during verification.' };
          }

          if (cert) {
            const courseTitles = Array.isArray(cert.course_titles) && cert.course_titles.length > 0
              ? cert.course_titles
              : cert.course_title
              ? [cert.course_title]
              : [];

            return {
              found: true,
              isValid: cert.status === 'valid',
              certificateCode: cert.certificate_code,
              recipientName: cert.recipient_name,
              courseTitle: cert.course_title,
              courseTitles,
              durationText: cert.duration_text || null,
              completionDate: cert.completion_date || cert.issue_date,
              studentType: cert.student_type === 'online' ? 'Online Certified Program' : 'Physical Academy Diploma',
              issueDate: cert.issue_date,
              scorePercentage: cert.score_percentage ? Number(cert.score_percentage) : null,
              finalGrade: cert.final_grade,
              status: cert.status,
              revokedAt: cert.revoked_at,
              revocationReason: cert.revocation_reason,
            };
          }

          return { found: false };
        } catch (dbEx) {
          console.error('Direct Supabase verification error:', dbEx);
          return { found: false, error: 'Database verification service unavailable.' };
        }
      }

      return { found: false, error: 'Verification service is currently unavailable.' };
    }
  },

  getVerificationUrl(tokenOrCode: string): string {
    const baseUrl = siteConfig.publicSiteUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://theinspireacademy.pk');
    return `${baseUrl}/verify?token=${encodeURIComponent(tokenOrCode)}`;
  },
};

// ==============================================================================
// HELPERS
// ==============================================================================

function calculateGrade(score: number): string {
  if (score >= 90) return 'Distinction (A+)';
  if (score >= 80) return 'Excellence (A)';
  if (score >= 70) return 'Certified Pass (B)';
  return 'Passing (C)';
}

async function generateUniqueCertificateCode(): Promise<string> {
  const currentYear = new Date().getFullYear();
  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.rpc('generate_next_certificate_code');
      if (data) return data;
    } catch (_) {}
  }
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INSPIRE-CERT-${currentYear}-${randomSuffix}`;
}

function generateVerificationToken(): string {
  // Generate a cryptographically strong 32-char unguessable hex token
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Internal memory store (empty by default; no hardcoded demo certificates)
const fallbackCertificatesStore: CertificateRecord[] = [];
