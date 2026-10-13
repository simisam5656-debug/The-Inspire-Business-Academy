# Production Operational Runbook

> **The Inspire Business Academy**  
> *Hunarmand Pakistan* | Sadiqabad, Punjab, Pakistan  
> Technical Lead: Adeel Bhatti | Operational Emergency Line: 0309-3534289

---

## 1. Day-1 Launch Sequence & Pre-Flight Checklist

Before flipping the production domain DNS to point to the live server:

### A. Environment Configuration
- [ ] Confirm all Cloudflare Pages environment variables and secrets are set:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_PUBLIC_SITE_URL` (set to production domain)
  - `VITE_DEMO_MODE=false`
  - `SUPABASE_URL` (Server secret)
  - `SUPABASE_SERVICE_ROLE_KEY` (Server secret)
  - `BOOTSTRAP_SECRET` (Server secret)
- [ ] Verify that no `SUPABASE_SERVICE_ROLE_KEY` exists with a `VITE_` prefix.

### B. Supabase Database & Security Verification
- [ ] Execute `supabase/complete_database_setup.sql` in Supabase SQL editor.
- [ ] Verify Row Level Security (RLS) is active on all 17 public tables.
- [ ] Verify storage buckets `payment-proofs`, `assignment-submissions`, and `certificate-files` have `public = false`.
- [ ] In Supabase Auth &rarr; URL Configuration: Add production domain and redirect paths.
- [ ] In Supabase Auth &rarr; Email Templates: Customize confirmation and password reset emails with academy branding.

### C. First Super Admin Account Provisioning
1. Sign up the primary administrator account in Supabase Auth or through the registration UI.
2. In Supabase SQL Editor, verify or promote the account to `super_admin`:
   ```sql
   UPDATE public.profiles
   SET role = 'super_admin', is_active = true
   WHERE email = 'adeelbhatti@theinspirebusinessacademy.com';
   ```
3. Test login at `/admin/login` using the Super Admin credentials.
4. Verify full access to dashboard, students, registrations, payments, certificates, and audit logs.

---

## 2. Routine Operational Procedures

### A. Physical Student Onboarding
1. Navigate to `/admin/registrations` or `/admin/students`.
2. Click **Add Student** / **Approve Registration**.
3. Select campus batch (`B01` for Boys Morning, `G01` for Girls Afternoon, etc.).
4. The system automatically assigns sequential student codes (e.g., `B01-001`, `G01-001`).
5. Record fee installment agreement and issue physical slip.

### B. Online Student Admission & Payment Verification
1. Student registers online at `/join/online` or submits payment proof at checkout.
2. Admission record appears under `/admin/registrations`.
3. Payment screenshot and transaction ID appear under `/admin/online-payments`.
4. Admin reviews payment proof via secure signed URL (5-minute expiration).
5. Admin clicks **Verify Payment**:
   - Status updates to `verified`.
   - Student enrollment record is created/extended automatically in `student_enrollments`.
   - Access to courses and classroom opens immediately in the Student LMS.

### C. Issuing and Revoking Certificates
1. **Issuing Certificate:**
   - Online students: automatically eligible once course lessons are marked complete and 70% threshold is reached on the final exam.
   - Physical students: Admin issues certificate from `/admin/certificates` with student code and final score.
   - System generates unique `certificate_code` (`INSPIRE-CERT-YYYY-XXXX`) and 32-character hexadecimal `verification_token`.
2. **Revoking Certificate:**
   - If an issue or fraud is detected, Super Admin navigates to `/admin/certificates` &rarr; click **Revoke**.
   - Enter mandatory justification reason.
   - Action is written to `audit_logs` with actor ID and timestamp.
   - Public verification at `/verify` will immediately reflect status `revoked` with date.

---

## 3. Incident Response & Troubleshooting

### Scenario 1: Direct Page Refresh Returns 404
- **Root Cause:** Client-side routing rewrites not applied by the host.
- **Resolution:**
  - SPA routing is automatic on Cloudflare Pages because the project has no top-level 404.html; do not add a _redirects catch-all rule. Ensure no root or public `404.html` exists that intercepts client paths.

### Scenario 2: Supabase API Returns 401 / 403 Forbidden
- **Root Cause:** Expired user token, mismatched anon key, or invalid RLS policy.
- **Resolution:**
  1. Inspect browser Network tab for exact Supabase request.
  2. Check if user profile is deactivated (`profiles.is_active = false`).
  3. Verify RLS policy for the table using Supabase SQL editor.
  4. Ensure anon key in Cloudflare Pages environment variables matches project API settings.

### Scenario 3: Secret Leak / Rotation Procedure
If any secret key is accidentally exposed:
1. In Supabase Dashboard &rarr; **Settings** &rarr; **API**:
2. Click **Generate New API Secret** for `service_role` or `anon` key.
3. Immediately update the corresponding environment variable in Cloudflare Dashboard &rarr; **Settings** &rarr; **Environment variables**.
4. Trigger a fresh deployment in Cloudflare Pages (**Retry deployment** / push commit).
5. Old tokens will be invalidated immediately.

---

## 4. Backup & Disaster Recovery

- **Automated Daily Backups:** Supabase executes daily Postgres database dumps.
- **Manual Snapshots:** Prior to any significant schema or curriculum upgrade, export database state:
  ```bash
  # Using Supabase CLI (if installed locally):
  supabase db dump -f academy_backup_$(date +%F).sql
  ```
- **Cloudflare Pages Instant Rollback:** If a deployment introduces a frontend or API regression, navigate to Cloudflare Dashboard &rarr; **Workers & Pages** &rarr; select project &rarr; **Deployments**, locate the last healthy build, click `...` / `Manage deployment` &rarr; **Rollback to this deployment**. Deployment reverts in under 5 seconds.
