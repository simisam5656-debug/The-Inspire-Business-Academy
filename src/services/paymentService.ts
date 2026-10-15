import {
  OnlinePaymentRecord,
  PaymentStatus,
  PackageRecord,
  CouponRecord,
  OfferRecord,
  CouponValidationResult,
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressPaymentProof } from '../utils/imageCompressor';

export interface SubmitPaymentPayload {
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  courseSlug: string;
  courseTitle: string;
  paymentMethod: string;
  transactionId: string;
  accountSenderName?: string;
  accountSenderNumber?: string;
  screenshotFile?: File;
  couponCode?: string;
  promoCode?: string;
  packageSlug?: string;
  requestType?: 'registration' | 'additional_course' | 'package';
  selectedCourseIds?: string[];
  notes?: string;
  userId?: string;
}

export const PaymentService = {
  /**
   * Calculate Authoritative Price via Server API
   */
  async calculateAuthoritativePrice(
    courseSlug?: string,
    packageSlug?: string,
    couponCode?: string,
    userId?: string,
    email?: string,
    phone?: string
  ): Promise<{
    ok: boolean;
    basePrice: number;
    totalDiscount: number;
    finalAmount: number;
    itemTitle: string;
    offer: any;
    coupon: any;
    couponMessage: string | null;
    couponMessageRoman: string | null;
  }> {
    try {
      const res = await fetch('/api/payments/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, packageSlug, couponCode, userId, email, phone }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API calculate price offline, fallback calculation', err);
    }

    // Client fallback
    const basePrice = 5000;
    return {
      ok: true,
      basePrice,
      totalDiscount: 0,
      finalAmount: basePrice,
      itemTitle: 'Online Course',
      offer: null,
      coupon: null,
      couponMessage: null,
      couponMessageRoman: null,
    };
  },

  /**
   * Upload screenshot to private storage 'payment-proofs' via secure pre-signed upload URL
   */
  async uploadPaymentProof(
    file: File
  ): Promise<{ path: string | null; error: string | null }> {
    try {
      let fileToUpload = file;
      // 1. If image, compress client-side to <= 1 MB (1024 * 1024)
      if (file.type.startsWith('image/')) {
        try {
          const comp = await compressPaymentProof(file, 1024 * 1024);
          fileToUpload = comp.file;
        } catch (compErr) {
          console.warn('Client image compression warning, proceeding with original:', compErr);
        }
      }

      if (fileToUpload.size > 5 * 1024 * 1024) {
        return {
          path: null,
          error: 'File size 5 MB se zyada hai. Baraye meharbani chhota file chunein (Maximum 5 MB allowed).',
        };
      }

      // 2. Request signed upload destination from server
      const urlRes = await fetch('/api/payments/proof-upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileToUpload.name,
          contentType: fileToUpload.type,
          fileSize: fileToUpload.size,
        }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.ok || !urlData.path || !urlData.token) {
        return {
          path: null,
          error:
            urlData?.error ||
            'Payment receipt upload destination initialize nahi ho saki. Please check your connection.',
        };
      }

      // 3. Upload to private storage bucket using signed upload url
      if (!supabase) {
        return {
          path: null,
          error: 'Storage client unavailable. Please refresh and try again.',
        };
      }

      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .uploadToSignedUrl(urlData.path, urlData.token, fileToUpload);

      if (error || !data) {
        return {
          path: null,
          error:
            error?.message ||
            'Payment receipt upload failed. Screenshot dobara upload karein (JPEG, PNG, WEBP, PDF).',
        };
      }

      return { path: urlData.path, error: null };
    } catch (err: any) {
      return {
        path: null,
        error: err.message || 'Payment screenshot upload failed due to network error.',
      };
    }
  },

  /**
   * Submit Online Registration + Payment
   */
  async submitOnlinePayment(payload: SubmitPaymentPayload): Promise<{
    ok: boolean;
    admissionReference?: string;
    paymentReference?: string;
    finalAmount?: number;
    error?: string;
    duplicateTx?: boolean;
  }> {
    // 1. Mandatory screenshot proof check
    if (!payload.screenshotFile) {
      return {
        ok: false,
        error: 'Payment receipt / screenshot proof is required. Baraye meharbani payment proof upload karein.',
      };
    }

    const uploadRes = await this.uploadPaymentProof(payload.screenshotFile);
    if (uploadRes.error || !uploadRes.path) {
      return {
        ok: false,
        error:
          uploadRes.error ||
          'Payment receipt upload fail ho gayi. Receipt ke baghair submission mumkin nahi hai.',
      };
    }

    const uploadedScreenshotPath = uploadRes.path;

    // 2. Submit payment and registration via server API
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/payments/submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone,
          city: payload.city,
          courseSlug: payload.courseSlug,
          packageSlug: payload.packageSlug,
          courseTitle: payload.courseTitle,
          paymentMethod: payload.paymentMethod,
          transactionId: payload.transactionId,
          accountSenderName: payload.accountSenderName,
          accountSenderNumber: payload.accountSenderNumber,
          screenshotPath: uploadedScreenshotPath,
          couponCode: payload.couponCode,
          promoCode: payload.promoCode,
          requestType: payload.requestType,
          selectedCourseIds: payload.selectedCourseIds,
          notes: payload.notes,
          userId: token ? (session?.user?.id || payload.userId) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          ok: false,
          error: data.error || 'Payment submit failed',
          duplicateTx: Boolean(data.duplicateTx),
        };
      }

      return {
        ok: true,
        admissionReference: data.admissionReference,
        paymentReference: data.paymentReference,
        finalAmount: data.finalAmount,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Network connection failed during payment submission',
      };
    }
  },

  /**
   * Admin: Get all online payments
   */
  async getOnlinePayments(statusFilter?: PaymentStatus | 'all'): Promise<OnlinePaymentRecord[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('online_payments')
        .select(`
          *,
          admissions (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error querying online payments from Supabase:', error);
        throw new Error(error.message || 'Failed to load online payments');
      }

      if (data) {
        return data.map((d: any) => ({
          id: d.id,
          referenceNumber: d.reference_number,
          admissionId: d.admission_id,
          userId: d.user_id,
          userName: d.admissions?.full_name || d.account_sender_name || 'Student',
          userEmail: d.admissions?.email || '',
          userPhone: d.admissions?.phone || d.account_sender_number || '',
          courseId: d.course_id,
          packageId: d.package_id,
          courseSlug: d.course_slug,
          courseTitle: d.course_title,
          paymentMethod: d.payment_method,
          transactionId: d.transaction_id,
          accountSenderName: d.account_sender_name,
          accountSenderNumber: d.account_sender_number,
          screenshotPath: d.screenshot_path,
          basePrice: Number(d.base_price || 0),
          discountAmount: Number(d.discount_amount || 0),
          couponId: d.coupon_id,
          couponCode: d.coupon_code,
          offerId: d.offer_id,
          offerTitle: d.offer_title,
          finalAmount: Number(d.final_amount || 0),
          paymentStatus: d.payment_status as PaymentStatus,
          rejectionReason: d.rejection_reason,
          verifiedBy: d.verified_by,
          verifiedAt: d.verified_at,
          requestType: d.request_type,
          selectedCourseIds: d.selected_course_ids,
          accessStatus: d.access_status,
          accessReviewedBy: d.access_reviewed_by,
          accessReviewedAt: d.access_reviewed_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }));
      }
    }

    return [];
  },

  /**
   * Get payments for a specific student (Student Portal)
   */
  async getStudentPayments(userId: string): Promise<OnlinePaymentRecord[]> {
    if (!userId) return [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .maybeSingle();

        const userEmail = profile?.email;
        let admIds: string[] = [];

        if (userEmail) {
          const { data: admissionsData } = await supabase
            .from('admissions')
            .select('id')
            .or(`user_id.eq.${userId},email.ilike.${userEmail}`);
          admIds = (admissionsData || []).map((a: any) => a.id);
        }

        let query = supabase
          .from('online_payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (admIds.length > 0) {
          query = query.or(`user_id.eq.${userId},admission_id.in.(${admIds.join(',')})`);
        } else {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            referenceNumber: d.reference_number,
            packageId: d.package_id,
            courseSlug: d.course_slug,
            courseTitle: d.course_title,
            paymentMethod: d.payment_method,
            transactionId: d.transaction_id,
            basePrice: Number(d.base_price || 0),
            discountAmount: Number(d.discount_amount || 0),
            finalAmount: Number(d.final_amount || 0),
            paymentStatus: d.payment_status as PaymentStatus,
            rejectionReason: d.rejection_reason,
            requestType: d.request_type,
            selectedCourseIds: d.selected_course_ids,
            accessStatus: d.access_status,
            verifiedAt: d.verified_at,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Error fetching student payments:', err);
      }
    }
    return [];
  },

  /**
   * Admin: Verify Payment
   */
  async verifyPayment(
    paymentId: string,
    adminNotes?: string,
    accessAction: 'grant_now' | 'verify_only' | 'deny' = 'grant_now'
  ): Promise<{
    ok: boolean;
    enrollment?: { studentCode?: string; expiryDate?: string; id?: string };
    payment?: any;
    accessStatus?: string;
    provisionedCourses?: string[];
    message?: string;
    error?: string;
  }> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId, adminNotes, accessAction }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to verify payment' };
      }
      return {
        ok: true,
        enrollment: data.enrollment,
        payment: data.payment,
        accessStatus: data.accessStatus,
        provisionedCourses: data.provisionedCourses,
        message: data.message,
      };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Admin: Reject Payment
   */
  async rejectPayment(paymentId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const cleanReason = reason ? reason.trim() : '';
      if (!cleanReason) {
        return { ok: false, error: 'A rejection reason is required.' };
      }

      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/reject-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentId, reason: cleanReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to reject payment' };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Admin: Get private signed URL for screenshot proof
   */
  async getPaymentProofSignedUrl(
    storagePath: string,
    paymentId?: string,
    referenceNumber?: string
  ): Promise<string | null> {
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/payment-proof-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ storagePath, paymentId, referenceNumber }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.signedUrl || null;
      }
    } catch (err) {
      console.warn('Error fetching signed URL from API:', err);
    }

    // Direct fallback if supabase client is signed in
    if (supabase) {
      const { data } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(storagePath.replace(/^payment-proofs\//, ''), 300);
      return data?.signedUrl || null;
    }

    return null;
  },

  /**
   * Get Active Offers
   */
  async getActiveOffers(): Promise<OfferRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('is_active', true)
          .lte('start_date', today)
          .gte('end_date', today)
          .order('discount_percentage', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            title: d.title,
            titleRomanUrdu: d.title_roman_urdu,
            description: d.description,
            descriptionRomanUrdu: d.description_roman_urdu,
            discountPercentage: Number(d.discount_percentage),
            startDate: d.start_date,
            endDate: d.end_date,
            isActive: d.is_active,
            bannerMessage: d.banner_message,
            applicableCourseSlugs: d.applicable_course_slugs,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Error fetching offers from Supabase:', err);
      }
    }

    // Default Hunarmand Pakistan Scholarship Offer
    return [
      {
        id: 'offer-hunarmand',
        title: 'Special Hunarmand Pakistan Scholarship Offer',
        titleRomanUrdu: 'Hunarmand Pakistan Khas Discount Offer',
        description: 'Flat 10% discount on all online courses for Pakistani youth and freelancers.',
        descriptionRomanUrdu: 'Pakistani nojawano ke liye tamam online recorded programs par 10% ki khas riayat.',
        discountPercentage: 10,
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        isActive: true,
        bannerMessage: 'Hunarmand Pakistan Special: 10% OFF on all online certified courses!',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];
  },

  /**
   * Get Packages
   */
  async getPackages(): Promise<PackageRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('packages')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            slug: d.slug,
            title: d.title,
            titleRomanUrdu: d.title_roman_urdu,
            description: d.description,
            descriptionRomanUrdu: d.description_roman_urdu,
            price: Number(d.price),
            durationMonths: Number(d.duration_months),
            isActive: d.is_active,
            displayOrder: d.display_order,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Error fetching packages from Supabase:', err);
      }
    }

    return [
      {
        id: 'pkg-digital-biz',
        slug: 'digital-business-bundle',
        title: 'Digital Business Master Bundle (YouTube + Dropshipping + Meta Ads)',
        titleRomanUrdu: 'Digital Karobar Master Bundle (YouTube + Shopify + Meta Ads)',
        description: 'Complete trio of high-income digital business courses: YouTube Monetization, Shopify E-Commerce, and Meta Ads scaling.',
        descriptionRomanUrdu: 'Pakistan ke 3 sab se kamiyab digital business courses aik sath: YouTube Monetization, Shopify Dropshipping aur Meta Advertising.',
        price: 12000,
        durationMonths: 6,
        isActive: true,
        displayOrder: 1,
        courseSlugs: ['youtube-monetization', 'shopify-dropshipping', 'digital-marketing-meta-ads'],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'pkg-creative-suite',
        slug: 'freelancing-creative-suite',
        title: 'Creative Freelancing Suite (Graphic Design + Video Editing + Freelancing)',
        titleRomanUrdu: 'Creative Freelancing Suite (Graphic + Video Editing + Upwork/Fiverr)',
        description: 'From zero design skills to landing international clients on Upwork and Fiverr with professional video and graphic assets.',
        descriptionRomanUrdu: 'Photoshop, Illustrator, Premiere Pro aur CapCut ke zariye international clients se dollar kamane ka mukammal package.',
        price: 11000,
        durationMonths: 6,
        isActive: true,
        displayOrder: 2,
        courseSlugs: ['graphic-designing', 'video-editing-capcut-premiere', 'freelancing-upwork-fiverr'],
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];
  },
};
