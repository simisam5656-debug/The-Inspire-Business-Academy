# Master Production Deployment Guide

> **The Inspire Business Academy**  
> *Hunarmand Pakistan* | Location: Sadiqabad, Punjab, Pakistan  
> Lead: Adeel Bhatti | WhatsApp: 0309-3534289  
> Target Architecture: React 19 + TypeScript + Vite + Cloudflare Pages (Pages Functions + Workers AI) + Supabase

---

## 1. Architectural Overview & Workflow

The production pipeline is designed **Cloudflare-first**, flowing securely from source control to Cloudflare's global edge network:

```text
┌─────────────────────────────────┐
│     AI Studio / Local Code      │
└───────────────┬─────────────────┘
                │ git push
                ▼
┌─────────────────────────────────┐
│       GitHub Repository         │  (branch: main)
└───────────────┬─────────────────┘
                │ webhook trigger
                ▼
┌─────────────────────────────────────────────────────────────┐
│             Cloudflare Pages Deployment                     │
│                                                             │
│  ┌─────────────────────────┐       ┌──────────────────────┐ │
│  │  Vite React SPA (dist/) │       │  Pages Functions     │ │
│  │  - Static CDN Assets    │       │  - functions/api/*   │ │
│  │  - public/_routes.json  │       │  - functions/_adapter│ │
│  │  - public/_headers      │       │  - api/* handlers    │ │
│  └───────────┬─────────────┘       │  - Workers AI Native │ │
│              │                     └──────────┬───────────┘ │
└──────────────┼────────────────────────────────┼─────────────┘
               │ Client Auth & Data             │ Service Role Admin
               ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase Cloud Project                      │
│  - PostgreSQL Database (35 tables, RLS enabled on all)      │
│  - Supabase Auth (super_admin, manager, online_student)     │
│  - Supabase Storage (payment-proofs, assignments, certs)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. GitHub Repository Setup

### Step 2.1: Verify Local Exclusions
Before committing and pushing, ensure no local credentials, caches, or build outputs are tracked:
- `.env`, `.env.local`, `.env.*` (strictly excluded except `.env.example`)
- `node_modules/`
- `dist/` and `build/`

### Step 2.2: Initialize and Push to GitHub
```bash
# Initialize git repository
git init

# Add all project files
git add .

# Initial production commit
git commit -m "feat: complete production release for The Inspire Business Academy"

# Rename branch to main
git branch -M main

# Link your remote GitHub repository (replace with your actual repository URL)
git remote add origin https://github.com/YOUR_GITHUB_ORGANIZATION/the-inspire-business-academy.git

# Push code to GitHub
git push -u origin main
```

---

## 3. Platform: Cloudflare Pages Deployment (Primary & Authoritative)

Cloudflare Pages natively hosts the compiled Vite static assets (`dist/`) while Cloudflare Pages Functions (`functions/api/*`) seamlessly serve all backend serverless endpoints on Cloudflare's global edge network.

### Step 3.1: Project Specifications & Build Settings
- **Framework Preset:** `Vite` (React 19 + TypeScript)
- **Build Command:** `npm run build` (executes `vite build`)
- **Build Output Directory:** `dist`
- **Root Directory:** `/` (default)
- **Node.js Version:** `22.14.0` (read automatically from `.nvmrc` and `.node-version`).
- **Compatibility Flag:** `nodejs_compat` (under **Settings** &rarr; **Functions** &rarr; **Compatibility flags**).
- **Package Manager Configuration:** Standard npm using `.npmrc` (`legacy-peer-deps=true`). `bun.lock` is deleted so Cloudflare Pages avoids invoking Bun.

Cloudflare Pages automatically detects the `functions/` directory at the project root and builds all Pages Functions according to `public/_routes.json` without any manual plugin installation.

### Step 3.2: Connect Cloudflare Pages to GitHub
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** &rarr; **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
3. Select your repository `the-inspire-business-academy`.
4. Fill in the build configuration:
   - **Project name:** `the-inspire-business-academy`
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/`

### Step 3.3: Configure Environment Variables & Secrets in Cloudflare
In Cloudflare Dashboard &rarr; **Workers & Pages** &rarr; select project &rarr; **Settings** &rarr; **Environment variables**. Configure these separately for **Production** and **Preview** environments:

#### 1. Public Client Variables (Build-Time):
These variables are prefixed with `VITE_` and bundled into client JavaScript at build time. They must NEVER contain secrets:
| Variable Name | Environment | Description |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Production & Preview | Supabase project URL (e.g. `https://your-project-id.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production & Preview | Supabase Anon / Publishable API key (`sb_publishable_...` or anon key) |
| `VITE_PUBLIC_SITE_URL` | Production & Preview | Canonical site URL (e.g. `https://theinspirebusinessacademy.com` or preview URL) |
| `VITE_DEMO_MODE` | Production & Preview | Set to `false` for live operations |

#### 2. Server-Only Environment Variables & Encrypted Secrets:
These variables are runtime bindings accessible ONLY to Cloudflare Pages Functions and **must NEVER have the `VITE_` prefix**:
| Variable Name | Type in Cloudflare Dashboard | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Plaintext Variable or Secret | Supabase project URL for Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret (Encrypted)** | Supabase Service Role Key for privileged server-side operations |
| `BOOTSTRAP_SECRET` | **Secret (Encrypted)** | Secret token for administrative provisioning |
| `SUPABASE_ANON_KEY` | Plaintext Variable or Secret | Anon key for public certificate verification |
| `CLOUDFLARE_AI_GATEWAY_ID` | Variable (Optional) | Cloudflare AI Gateway ID for caching, analytics, and limits (default: `default`) |
| `CLOUDFLARE_AI_CACHE_TTL` | Variable (Optional) | Positive integer in seconds for AI Gateway response caching |
| `CLOUDFLARE_AI_MODEL` | Variable (Optional) | Model override (default: `@cf/meta/llama-3.1-8b-instruct`) |
| `CLOUDFLARE_ACCOUNT_ID` | Variable (Optional) | Cloudflare Account ID (only needed for REST fallback) |
| `CLOUDFLARE_API_TOKEN` | **Secret (Encrypted)** | API Token with Workers AI permission (only needed for REST fallback) |

> **SECURITY GUARANTEE:** Variables without the `VITE_` prefix are runtime environment bindings in Cloudflare Functions. They are strictly isolated and never bundled into client JavaScript. Secrets marked as encrypted cannot be viewed once saved.

### Step 3.4: Configure Cloudflare Workers AI Native Binding & Compatibility Flags
To enable native Workers AI and runtime compatibility in Cloudflare Pages:
1. In Cloudflare Dashboard &rarr; **Workers & Pages** &rarr; select project `the-inspire-business-academy`.
2. Navigate to **Settings** &rarr; **Functions**:
   - **Compatibility flags:** Add `nodejs_compat` to both Production and Preview.
   - **Workers AI bindings:** Click **Add binding**:
     - **Variable name:** `AI` (exact uppercase match; adapter checks `context.env.AI` and passes it to `req.ai`).
3. Click **Save and deploy**.
4. **Default Model:** `@cf/meta/llama-3.1-8b-instruct`. Supported models also include `@cf/meta/llama-3-8b-instruct` and `@cf/mistral/mistral-7b-instruct-v0.1`.
5. **AI Gateway Support:** Handlers pass `{ gateway: { id: gatewayId } }` (and optional `cacheTtl`) to route requests through Cloudflare AI Gateway for unified observability, rate limiting, and edge caching.
6. **Graceful Degradation:** If the binding is unattached and no REST credentials are provided, the AI endpoints return clean HTTP 503 responses (`Workers AI service unavailable`) without breaking the website.

---

## 4. Routing & Architecture: SPA vs. Functions

### 4.1 Routing Precedence & Roles
1. **Server-Side Functions (`/api/*`):**
   - Cloudflare Pages evaluates routes defined in `functions/` with top priority.
   - Handlers in `functions/api/*` wrap canonical handlers in `api/*` using `functions/_adapter.ts`.
   - The adapter converts standard Cloudflare `Request`/`Response` objects into Node-style `(req, res, dbClient)` interfaces, populates `req.env`, attaches request-scoped `req.ai`, parses JSON payloads, and validates HTTP methods.
   - **Catch-All 404 Protection:** Any unknown `/api/*` route is captured by `functions/api/[[catchall]].ts`, returning a clean JSON 404 response rather than accidentally serving the SPA HTML.
2. **Client-Side SPA Routes:**
   - All non-API routes (e.g. `/`, `/courses`, `/about`, `/gallery`, `/contact`, `/verify`, `/join`, `/join/physical`, `/join/online`, `/login`, `/admin/*`, `/student/*`) serve the compiled SPA from `dist/`.
   - `public/_routes.json` (`{"version":1,"include":["/api/*"],"exclude":[]}`) ensures only API requests route to Functions while all static and client navigation requests are served by the CDN.
   - SPA routing is automatic on Cloudflare Pages because the project has no top-level 404.html; do not add a _redirects catch-all rule.
3. **Static Security Headers:**
   - `public/_headers` applies strict security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`) to all static assets.

### 4.2 Endpoint Mapping Matrix
| Route | Method(s) | Handler Location | Wrapper Location | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| `/api/health` | GET, HEAD | `api/health.ts` | `functions/api/health.ts` | Public |
| `/api/certificates/verify` | GET, POST, OPTIONS | `api/certificates/verify.ts` | `functions/api/certificates/verify.ts` | Public |
| `/api/admissions/submit` | POST | `api/admissions/submit.ts` | `functions/api/admissions/submit.ts` | Public |
| `/api/payments/calculate` | POST | `api/payments/calculate.ts` | `functions/api/payments/calculate.ts` | Public |
| `/api/payments/submit` | POST | `api/payments/submit.ts` | `functions/api/payments/submit.ts` | Authenticated / Public |
| `/api/ai/chat` | POST | `api/ai/chat.ts` | `functions/api/ai/chat.ts` | Public (Rate-limited) |
| `/api/admin/ai/generate` | POST | `api/admin/ai/generate.ts` | `functions/api/admin/ai/generate.ts` | Staff (`ai_tools` permission) |
| `/api/admin/verify-payment` | POST | `api/admin/verify-payment.ts` | `functions/api/admin/verify-payment.ts` | Staff (Bearer token) |
| `/api/admin/reject-payment` | POST | `api/admin/reject-payment.ts` | `functions/api/admin/reject-payment.ts` | Staff (Bearer token) |
| `/api/admin/payment-proof-url`| POST | `api/admin/payment-proof-url.ts`| `functions/api/admin/payment-proof-url.ts`| Staff (Bearer token) |
| `/api/admin/approve-registration`| POST| `api/admin/approve-registration.ts`| `functions/api/admin/approve-registration.ts`| Staff (Bearer token) |
| `/api/admin/enrollments` | POST | `api/admin/enrollments.ts` | `functions/api/admin/enrollments.ts` | Staff (Bearer token) |
| `/api/admin/certificates/issue` | POST | `api/admin/certificates/issue.ts` | `functions/api/admin/certificates/issue.ts` | Staff (Bearer token) |
| `/api/admin/certificates/revoke`| POST | `api/admin/certificates/revoke.ts`| `functions/api/admin/certificates/revoke.ts`| Staff (Bearer token) |
| `/api/*` (unmatched) | ALL | N/A | `functions/api/[[catchall]].ts` | Returns JSON 404 |

---

## 5. Custom Domain & DNS Configuration (Cloudflare Pages)

To attach a custom domain (e.g., `theinspirebusinessacademy.com`):

1. In Cloudflare Dashboard &rarr; **Workers & Pages** &rarr; select project &rarr; **Custom domains**.
2. Click **Set up a custom domain**.
3. Enter your apex domain: `theinspirebusinessacademy.com`.
4. Enter your subdomain: `www.theinspirebusinessacademy.com`.
5. **If DNS is managed by Cloudflare:** Cloudflare automatically configures the CNAME records and activates SSL certificates in seconds.
6. **If DNS is managed externally (PKNIC, Namecheap, GoDaddy):**
   - Add a `CNAME` record for `@` pointing to `<your-project-name>.pages.dev`.
   - Add a `CNAME` record for `www` pointing to `<your-project-name>.pages.dev`.
7. SSL/TLS encryption is provisioned automatically with Universal SSL.

---

## 6. Supabase Production Readiness Checklist

Before public launch, complete these configurations in the [Supabase Dashboard](https://supabase.com/dashboard):

### 6.1 Database Schema Execution Workflow

> **CRITICAL NOTICE:** SQL scripts have **NOT** been executed against the live Supabase database during automated builds or tests. They must be executed manually by the authorized database administrator in the Supabase Dashboard SQL Editor or via the Supabase CLI migration pipeline. Manual dashboard prerequisites (storage buckets, auth redirect URLs) are separate from SQL execution.

Supabase projects can be initialized using either the **Consolidated SQL Setup** or the **Sequential Migration Sequence**. Choose ONE setup path for fresh databases:

#### Option A: Sequential Migration Sequence (Recommended for Supabase CLI & Version Control)
Execute the 11 migration files located in `supabase/migrations/` in exact timestamp order:
1. `20261007000000_initial_schema_foundation.sql`: Core enums (`user_role`), foundation tables (`profiles`, `manager_permissions`, `audit_logs`), RLS helper functions (`is_super_admin`, `is_staff`), and auto-profile trigger `handle_new_user()`.
2. `20261007000001_storage_policies_foundation.sql`: Private storage buckets (`payment-proofs`, `assignment-submissions`, `certificate-files`) and storage RLS policies.
3. `20261007000002_admissions_and_auth_foundation.sql`: Table `admissions`, hardened `handle_new_user()` trigger on `auth.users`, and admissions RLS policies.
4. `20261007000003_physical_academy_operations.sql`: Tables `physical_students`, `physical_attendance`, `physical_fee_payments`, and `academy_expenses` with operational RLS policies.
5. `20261007000004_course_cms_and_lms_content.sql`: Enums (`course_status`, `resource_type`), tables `courses`, `course_modules`, `course_lessons`, `lesson_resources`, helper `can_manage_courses()`, and RLS policies.
6. `20261007000005_student_lms_portal.sql`: Tables `student_enrollments`, `student_lesson_progress`, `student_notes`, `student_quiz_attempts`, and student learning RLS policies.
7. `20261007000006_online_payments_enrollments_offers.sql`: Tables `packages`, `package_courses`, `coupons`, `coupon_redemptions`, `offers`, `online_payments`; extensions to `profiles` and `student_enrollments`; helpers `can_manage_payments()`, `can_manage_enrollments()`; and initial seed data for packages, coupon `WELCOME2026`, and promotional offer.
8. `20261007000007_quizzes_exams_certificates.sql`: Tables `quizzes`, `quiz_questions`, `final_exams`, `final_exam_questions`, `final_exam_attempts`, `certificates`; sequence `certificate_code_seq`; helpers `can_manage_quizzes()`, `can_manage_certificates()`, `generate_next_certificate_code()`, `verify_certificate_public()`.
9. `20261007000008_cms_reports_settings.sql`: Tables `site_settings_public`, `announcements`, `faqs`, `testimonials`, `notices`, `gallery_items`, `short_sessions`; default settings seed row; and CMS RLS policies.
10. `20261007000009_security_hardening_and_indexes.sql`: Security hardening (RLS adjustments, hardened `verify_certificate_public`, immutable audit logs), and performance indexes across all modules.
11. `20261010000000_enforce_max_four_managers.sql`: Trigger `trg_check_max_managers_limit` with `pg_advisory_xact_lock` on `profiles`. Enforces hard ceiling of 4 managers (both active and inactive manager profiles count toward limit). *(Review before applying).*

#### Option B: Consolidated All-in-One Setup (Dashboard SQL Editor)
The all-in-one bootstrap is an alternative fresh-database setup path, not an additional full migration sequence.
- [ ] Run `supabase/complete_database_setup.sql` in the Supabase Dashboard SQL Editor for a fresh database bootstrap. Note: `complete_database_setup.sql` consolidates Migrations 00 through 09.
- [ ] **Required Follow-Up Step:** After verifying the base tables from `complete_database_setup.sql`, execute `supabase/migrations/20261010000000_enforce_max_four_managers.sql` in the SQL Editor to activate the atomic four-manager limit trigger.
- [ ] Verify that all 35 tables are created across the schema (`profiles`, `manager_permissions`, `audit_logs`, `admissions`, `physical_students`, `physical_attendance`, `physical_fee_payments`, `academy_expenses`, `courses`, `course_modules`, `course_lessons`, `lesson_resources`, `student_enrollments`, `student_lesson_progress`, `student_notes`, `student_quiz_attempts`, `packages`, `package_courses`, `coupons`, `coupon_redemptions`, `offers`, `online_payments`, `quizzes`, `quiz_questions`, `final_exams`, `final_exam_questions`, `final_exam_attempts`, `certificates`, `site_settings_public`, `announcements`, `faqs`, `testimonials`, `notices`, `gallery_items`, `short_sessions`).
- [ ] Confirm Row Level Security (RLS) is enabled on all tables.

### 6.2 Storage Buckets
In **Storage** &rarr; **Buckets**:
- [ ] `payment-proofs`: **Private** (`public = false`). Max 512 KB.
- [ ] `assignment-submissions`: **Private** (`public = false`). Max 15 MB.
- [ ] `certificate-files`: **Private** (`public = false`). Max 5 MB.
- [ ] `course-assets` (optional): Public bucket for course cover images and thumbnails.

### 6.3 Authentication URL Configuration
In Supabase Dashboard &rarr; **Authentication** &rarr; **URL Configuration**:
- [ ] **Site URL:** Set to `https://theinspirebusinessacademy.com` (or your production domain).
- [ ] **Redirect URLs:** Add:
  - `https://theinspirebusinessacademy.com/**`
  - `https://*.pages.dev/**`
  - `http://localhost:3000/**` (for local development)

### 6.4 Initial Super Admin Account Provisioning
1. Sign up the primary administrator account in Supabase Auth or through the registration UI.
2. In Supabase SQL Editor, verify or promote the account to `super_admin`:
   ```sql
   UPDATE public.profiles
   SET role = 'super_admin', is_active = true
   WHERE email = 'adeelbhatti@theinspirebusinessacademy.com';
   ```
3. Test login at `/admin/login` using the Super Admin credentials.

---

## 7. Production Post-Deployment Verification Checklist

Execute this verification sequence on the deployed production domain or preview URL:

1. **System Health Endpoint:**
   - Send `GET /api/health` &rarr; expect HTTP 200 with `{ "ok": true, "status": "healthy" }`.
   - Send `POST /api/health` &rarr; expect HTTP 405 with `Allow: GET, HEAD`.
2. **Client-Side SPA Routing & Hard Refresh:**
   - Navigate to `/courses` and hard-refresh (`Ctrl+F5` / `Cmd+Shift+R`). Must load without 404.
   - Navigate to `/join/physical` and hard-refresh.
   - Navigate to `/join/online` and hard-refresh.
   - Navigate to `/verify` and hard-refresh.
   - Navigate to `/login` and hard-refresh.
3. **Public Certificate Verification:**
   - Open `/verify`. Test with an invalid certificate code (e.g. `INSPIRE-CERT-9999-0000`).
   - Confirm it reports "Certificate not found" cleanly without throwing unhandled exceptions.
4. **Unknown API Endpoint 404 Check:**
   - Request `GET /api/nonexistent-route` &rarr; expect HTTP 404 JSON `{ "ok": false, "statusCode": 404 }`, never HTML.
5. **Staff Authorization Enforcement:**
   - Request `POST /api/admin/verify-payment` without an `Authorization` header &rarr; expect HTTP 401 JSON.
6. **Safe Error Handling & Log Redaction:**
   - Confirm any internal adapter error returns HTTP 500 with a unique `correlationId` and generic message, without exposing stack traces, SQL errors, or internal paths.

---

## 8. Deployment Inspection & Safe Rollback (Cloudflare Pages)

### 8.1 Inspecting Deployment & Build Logs
1. In Cloudflare Dashboard &rarr; **Workers & Pages** &rarr; select project &rarr; **Deployments**.
2. Click on any deployment to view:
   - Build environment variables and tooling output.
   - Vite bundling logs and asset manifests.
   - Pages Functions compilation output.

### 8.2 Inspecting Real-Time Functions Logs Safely
1. In project view &rarr; click the **Functions** tab &rarr; select **Real-time logs**.
2. When exceptions occur, the Cloudflare adapter logs:
   ```text
   [Cloudflare Adapter Error] id=cf_... type=AdapterException method=POST path=/api/...
   ```
3. **Privacy Guarantee:** The adapter redacts raw exception messages, request headers, cookies, query parameters, request bodies, and database connection strings before writing to routine logs. Use the reported `id` (`correlationId`) to correlate client issue reports with server events.

### 8.3 Instant Rollback Procedure
If a production release introduces unexpected issues:
1. Navigate to **Workers & Pages** &rarr; select project &rarr; **Deployments**.
2. Locate the previous known-good deployment.
3. Click the three dots menu (`...`) or `Manage deployment` &rarr; **Rollback to this deployment**.
4. Cloudflare immediately updates DNS edge routing to serve the selected previous immutable artifact (takes under 5 seconds).

---

## 9. Cloudflare Pages Deployment Architecture

The application is deployed natively to **Cloudflare Pages**:
- Front-end SPA assets are built with Vite (`npm run build`) and output to `dist`.
- Serverless API endpoints live under `api/*` and are served via Cloudflare Pages Functions (`functions/api/*`).
- SPA routing is automatic on Cloudflare Pages because the project has no top-level 404.html; do not add a _redirects catch-all rule.
- `public/_routes.json` routes only `/api/*` to Functions while static CDN serves SPA assets.
- Environment variables and secrets are managed directly within Cloudflare Dashboard (Settings &rarr; Environment variables).
- Instant rollbacks are supported through Cloudflare Pages deployments overview.

---

## 10. Manual Steps & Items Requiring Live Testing

The following items cannot be fully verified in local tests and require live environment verification:
1. **Cloudflare Preview Deployment:** Verify that Cloudflare Pages Functions run accurately in Cloudflare's production V8 isolate environment by deploying a Git preview branch.
2. **Supabase Cloud Database & RLS:** Run `supabase/complete_database_setup.sql` in the Supabase SQL editor and confirm all 17 tables and RLS policies are active.
3. **Storage Bucket Policies:** Confirm the 3 private storage buckets (`payment-proofs`, `assignment-submissions`, `certificate-files`) reject unauthorized public URL downloads.
4. **End-to-End Real Payment Submissions:** Submit a test payment slip on EasyPaisa / JazzCash / Bank transfer and verify the image is uploaded to private storage and generates a valid signed URL for admin review.
5. **Initial Super Admin Account:** Promote the administrator email to `super_admin` in `profiles` and verify login at `/admin/login`.

---

## 11. Cloudflare Workers AI & Manager Provisioning Setup (Prompt 14)

### 11.1 Cloudflare Dashboard Configuration
1. **Workers AI Native Binding:**
   - In Cloudflare Dashboard &rarr; **Workers & Pages** &rarr; select `the-inspire-business-academy` &rarr; **Settings** &rarr; **Functions** &rarr; **Workers AI Bindings**.
   - Add a binding named `AI` pointing to Workers AI.
2. **Cloudflare WAF / Rate Limiting Rule (Mandatory for Distributed Edge Protection):**
   - In Cloudflare Dashboard &rarr; select domain &rarr; **Security** &rarr; **WAF** &rarr; **Rate limiting rules** &rarr; **Create rule**.
   - **Rule Name:** `Protect Academy Chatbot (/api/ai/chat)`
   - **Field:** `URI Path` | **Operator:** `equals` | **Value:** `/api/ai/chat`
   - **Requests:** `20` requests per `1 minute` per IP address.
   - **Action:** `Block` (HTTP 429) or `Managed Challenge`.
   - *Why this is necessary:* Code implements per-isolate in-memory throttling, but true global protection across Cloudflare's hundreds of edge data centers requires this edge WAF rule.
3. **Optional Workers AI REST Fallback Credentials:**
   - If native binding is unavailable, add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` under **Settings** &rarr; **Environment variables**.

### 11.2 Supabase Database Migration for Review
- **File:** `supabase/migrations/20261010000000_enforce_max_four_managers.sql`
- **Purpose:** Enforces the 4-manager ceiling atomically inside PostgreSQL using `pg_advisory_xact_lock` to serialize concurrent manager promotions and prevent race conditions.
- **Review Procedure:**
  1. Inspect the migration SQL in your Supabase SQL Editor.
  2. Confirm it creates `check_max_managers_limit()` trigger function and `trg_check_max_managers_limit` on `public.profiles`.
  3. Execute via the Supabase SQL Editor after administrator sign-off.
  4. Note: Automated testing does NOT apply this migration to live databases.

### 11.3 Live Preview Tests Requiring Production Service Verification
Unit tests use mocks and cannot substitute for live verification of:
1. **Model Latency & Edge Availability:** Confirm `@cf/meta/llama-3.1-8b-instruct` responds quickly from Pakistani and regional ISP connections via the live preview URL.
2. **Real Supabase Auth Manager Creation:** In `/admin/managers`, create an operational manager with initial password and verify the manager can successfully log into `/admin/login` and access granted modules while being restricted from unassigned modules.
3. **Live Concurrency Behavior:** Verify atomic rejection if 4 managers are already active in the production database.

