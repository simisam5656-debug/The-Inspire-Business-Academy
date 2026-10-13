# The Inspire Business Academy

> **Production Release — Phase 12 (Final)**  
> Hybrid Physical Academy & Online Learning Management System (LMS)  
> Location: Sadiqabad, Punjab, Pakistan  
> Mission: *Hunarmand Pakistan*  
> Leadership: Adeel Bhatti  
> Contact / WhatsApp: 0309-3534289  
> Official YouTube: [theinspirebusinessacademy](https://youtube.com/@theinspirebusinessacademy)  
> Official Facebook: [theinspirebusinessacademy](https://www.facebook.com/share/1BhrJNWHmF/)

---

## 1. Executive Summary

**The Inspire Business Academy** is an enterprise-grade hybrid educational and management platform purpose-built for vocational training and business empowerment in Pakistan. The platform seamlessly bridges two distinct operational modes:

1. **Physical Campus Operations (Sadiqabad):**
   - In-person student roster management with gender-segregated batch codes (`B01`, `G01`).
   - Attendance tracking (Present, Absent, Late, Excused) with date filtering.
   - Installment-based fee schedules, receipts, and revenue monitoring.
   - Campus operational expenditure tracking (rent, utilities, lab maintenance, marketing).
   - *Physical students do not require website accounts; all records are maintained securely by academy staff.*

2. **Online Learning Management System (LMS):**
   - Interactive course catalog with curriculum previews and syllabus outlines.
   - Comprehensive video lesson player with dynamic user-email watermarks to deter piracy.
   - Self-paced modular learning with progress tracking and lesson completion markers.
   - Chapter-level practice quizzes and strict 70% passing threshold final examinations.
   - Automated verified certificate generation with unique verification hashes and QR codes.
   - Instant public verification portal (`/verify`) returning verified credentials without exposing personal data.

---

## 2. Technology Architecture

$$\text{React 19 + TypeScript + Vite} \longrightarrow \text{GitHub} \longrightarrow \text{Cloudflare Pages} \longleftrightarrow \text{Supabase (PostgreSQL, Auth, Storage)}$$

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router v7, Lucide Icons, Motion.
- **Design Tokens:**
  - Royal Blue: `#1F3FBF` (Primary brand action)
  - Deep Navy: `#0F1F5C` (Headers, layout foundations, dark contrast)
  - Yellow: `#FFC20E` (Accents, highlights, callouts)
  - Light Background: `#F2F5FF` (Clean application canvas)
  - White: `#FFFFFF`
- **Authentication & Authorization:** Supabase Auth (RBAC: `super_admin`, `manager`, `online_student`) with fine-grained manager permissions (`manager_permissions`) and immutable audit logs (`audit_logs`).
- **Database & Storage:** Supabase PostgreSQL with strict Row Level Security (RLS) on all tables; private storage buckets (`payment-proofs`, `assignment-submissions`, `certificate-files`) with short-lived signed URLs.
- **Serverless API:** Cloudflare Pages Functions (`functions/api/*` wrapping `/api/*`) with strict server-side token validation and least-privilege service-role key isolation.

---

## 3. Production Deployment Guide

### Deployment Platform:
1. **Cloudflare Pages with Pages Functions**

### Environment Variables Matrix

| Variable Name | Environment | Purpose | Security Level |
| :--- | :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Client (Vite) | Supabase project endpoint | Browser-safe |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (Vite) | Supabase Anon/Publishable API Key | Browser-safe |
| `VITE_PUBLIC_SITE_URL` | Client (Vite) | Production domain (e.g., `https://theinspirebusinessacademy.com`) | Browser-safe |
| `VITE_DEMO_MODE` | Client (Vite) | Set to `false` in production | Browser-safe |
| `SUPABASE_URL` | Server (Cloudflare Pages) | Supabase project endpoint for serverless functions | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server (Cloudflare Pages) | Privileged admin key for server operations | **Strict Secret (Never expose to browser!)** |
| `BOOTSTRAP_SECRET` | Server (Cloudflare Pages) | Secret token for administrative provisioning | **Strict Secret** |

---

## 4. Database Setup

All database migrations have been consolidated and sequenced in `/supabase`:
- `supabase/complete_database_setup.sql`: Complete all-in-one setup script for initial deployment.
- `supabase/migrations/`: Granular chronological migration files (000000 through 000009).

To apply the database schema:
1. Open the Supabase Project Dashboard &rarr; **SQL Editor**.
2. Paste the contents of `supabase/complete_database_setup.sql` and run.
3. Verify that all 17 tables, 3 storage buckets, and RLS policies are activated.

---

## 5. Build & Verification Commands

```bash
# 1. Install dependencies
npm install

# 2. Type-check codebase (zero errors)
npm run lint

# 3. Build optimized production bundle
npm run build

# 4. Preview production build locally
npm run preview
```

---

## 6. Security Architecture

1. **Authentication:** Pure Supabase Auth; passwords never touch application tables.
2. **Authorization:** Row Level Security (RLS) enabled on all exposed tables. Database helper functions (`is_super_admin()`, `is_staff()`) prevent client-side spoofing.
3. **Storage Security:** All sensitive buckets (`payment-proofs`, `assignment-submissions`) are private (`public = false`). Admins generate short-lived signed URLs via authenticated endpoints (`/api/admin/payment-proof-url`).
4. **Content Security:** SPA routing is automatic on Cloudflare Pages because the project has no top-level 404.html; do not add a _redirects catch-all rule.
5. **Security Headers:** Strict headers configured in `public/_headers` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).

---

## 7. Academy Contact & Verification

- **Founder & Director:** Adeel Bhatti
- **Headquarters:** Sadiqabad, Punjab, Pakistan
- **Helpline / WhatsApp:** `0309-3534289`
- **Certificate Verification:** Accessible 24/7 at `/verify`

## 8. Phases Roadmap & Completion Status

- [x] **Phase 1:** Core Architecture & Technical Foundations (Vite, React 19, Supabase, Cloudflare Pages)
- [x] **Phase 2:** Visual Identity, UI System & English / Roman Urdu Localization
- [x] **Phase 3:** Public Website, Academy Showcases & Responsive Layouts
- [x] **Phase 4:** Admissions Engine & Supabase Authentication Workflows
- [x] **Phase 5:** Admin Core & Physical Academy Operations (Batches, Attendance, Fees, Expenses, RBAC)
- [x] **Phase 6:** Online Course CMS & Curriculum Builder (Lessons, Quizzes, Resources)
- [x] **Phase 7:** Student LMS Learning Portal & Watermarked Video Classroom
- [x] **Phase 8:** Financial Systems, Payment Verifications & Bank Details
- [x] **Phase 9:** Quizzes, 70% Final Exams & Automated Certificate Generation
- [x] **Phase 10:** CMS Modules, Operational Reports, Manager Permissions & Audit Logging
- [x] **Phase 11:** Security Hardening, Performance Optimization & Code Auditing
- [x] **Phase 12:** Production Deployment, Platform Readiness (Cloudflare Pages), Runbooks & Handover

