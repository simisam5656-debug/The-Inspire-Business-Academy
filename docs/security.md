# Security Architecture & Rules

This document outlines the strict security practices enforced in **The Inspire Business Academy**.

---

## 1. Authentication Boundary: Supabase Auth

1. **No Custom Password Storage:**
   - Application tables (`profiles`, `physical_students`, etc.) NEVER contain `password`, `password_hash`, or `custom_token` columns.
   - All passwords, bcrypt hashes, sessions, and JWTs are managed exclusively by Supabase Auth (`auth.users`).

2. **Physical Student Isolation:**
   - Physical academy students do NOT have website login credentials.
   - Their roll numbers (`B01`, `G01`), fee installments, and test records are managed solely by verified academy administration.

---

## 2. Authorization Boundary: Row Level Security (RLS)

1. **Mandatory RLS on All Tables:**
   - Every exposed table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
   - Never write insecure policies like `CREATE POLICY ... USING (true)` on sensitive data.

2. **Client-Side vs. Database Security:**
   - Route guards and hidden UI buttons are user-experience conveniences, NOT security boundaries.
   - Database RLS policies and server-side Cloudflare Pages Functions enforce actual permissions.

3. **Role Checks:**
   - Role verification is executed using database security definer functions (`public.is_super_admin()`, `public.is_staff()`).

---

## 3. Credential Hierarchy: Service Role Key Isolation

```text
Browser Client:
  → Reads ONLY VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
  → Bound by RLS and auth.uid().
  → NEVER has access to SUPABASE_SERVICE_ROLE_KEY.

Cloudflare Pages Serverless Functions (/api/*):
  → Reads SUPABASE_SERVICE_ROLE_KEY (Server-only environment variable).
  → Used strictly for privileged tasks (e.g. initial manager creation, system checks).
  → Never transmits the service-role key in response payloads.
```

---

## 4. Storage Security: Private Buckets

1. **Bucket Privacy:**
   - Buckets (`payment-proofs`, `assignment-submissions`, `certificate-files`) are created with `public = false`.
   - Direct public URL access is prohibited.

2. **Upload Isolation:**
   - Students may upload files only into their own authenticated folder path: `{user_id}/*`.
   - Storage RLS checks `(storage.foldername(name))[1] = auth.uid()::text`.

3. **File Restrictions:**
   - Payment proofs: Max 512 KB, images only (`image/jpeg`, `image/png`, `image/webp`).
   - Browser client compresses payment screenshots below 250 KB prior to upload.

---

## 5. Staff Governance & Manager Provisioning

1. **Four-Manager Hard Ceiling:**
   - Under academy governance policy, no more than four (4) active operations managers may exist.
   - Enforced in UI, server-side API (`/api/admin/managers`), and review migration (`20261010000000_enforce_max_four_managers.sql`).
2. **Super Admin Authorization:**
   - Only authenticated Super Administrators can provision, modify, or deactivate managers.
   - Managers cannot escalate permissions or create other staff accounts.
3. **Credential Secrecy & Compensation:**
   - Manager passwords are never stored in application tables, never logged in audit trails, and never returned in API responses.
   - In case of partial failures (e.g. permission write error or concurrency breach), compensating rollback immediately cleans up the created Auth user.
4. **Explicit Permission Model:**
   - Managers must be explicitly granted individual module permissions (including `ai_tools`).
   - Super Admin reserved modules (`settings`, `audit_log`) can never be assigned to managers.

---

## 6. Cloudflare Workers AI & Public Chatbot Security

1. **Provider Isolation:**
   - Cloudflare Workers AI is the designated inference provider. Google Gemini or external LLMs are not used.
2. **Request-Scoped Execution:**
   - Workers AI bindings (`req.ai`) and environment variables are strictly request-scoped. No shared mutable singletons or `globalThis.process.env` pollution.
3. **Model Identifier Validation:**
   - Strict regex validation (`/^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)*$/`) prevents path traversal, query injection, or arbitrary URL mutation.
4. **Public Chatbot Protection:**
   - Bounded public input limit at 1,000 characters.
   - Authoritative `cf-connecting-ip` is trusted on Cloudflare; spoofed `x-forwarded-for` is ignored.
   - In-memory sliding window rate limiter (20 req/min) with bounded LRU eviction (max 1,000 IPs) to prevent isolate memory leaks.
   - Distributed edge protection must be complemented by Cloudflare WAF / Rate Limiting Rule.

---

## 7. Non-Negotiable Operational Rules

1. **No Fake Production Data:** Never seed fake bank account numbers, dummy IBANs, or fake jazzcash numbers.
2. **No Hard-Coded Domains:** Use configurable environment variables (`VITE_PUBLIC_SITE_URL`) until the final domain is registered and confirmed.
3. **No Unconfirmed Emails:** Do not fabricate admin contact emails.
4. **Safe Error Masking:** Never return raw SQL error messages, stack traces, or server environment dumps to client responses. Use sanitized correlation IDs (`cf_*`, `ai_*`).
