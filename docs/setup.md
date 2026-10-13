# Local Development Setup Guide

This guide details how to set up **The Inspire Business Academy** locally for development and testing.

## Prerequisites

- **Node.js**: Version 18.x, 20.x, or 22.x
- **npm** (or `pnpm` / `bun`)
- **Git**
- A free [Supabase](https://supabase.com) account

---

## 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/the-inspire-business-academy.git
cd the-inspire-business-academy
npm install
```

---

## 2. Environment Configuration

Copy the sample environment file to create your local `.env`:

```bash
cp .env.example .env
```

Open `.env` and configure your credentials:

```env
# Browser-safe (client) keys
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
VITE_PUBLIC_SITE_URL=http://localhost:3000
VITE_DEMO_MODE=false

# Server-only keys (never expose to client)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
BOOTSTRAP_SECRET=your-chosen-bootstrap-token
```

> **IMPORTANT**: Never prefix server-only keys with `VITE_`.

---

## 3. Database Migrations

Apply the migrations to your Supabase project:

1. Open your Supabase Dashboard &rarr; **SQL Editor**.
2. Run the SQL contents from:
   - `supabase/migrations/20261007000000_initial_schema_foundation.sql`
   - `supabase/migrations/20261007000001_storage_policies_foundation.sql`
3. Verify that the tables (`profiles`, `manager_permissions`, `audit_logs`) and storage buckets (`payment-proofs`, `assignment-submissions`, `certificate-files`) are created with Row Level Security (RLS) enabled.

---

## 4. Running the Development Server

Start Vite on port 3000:

```bash
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

---

## 5. Testing the Health Check

While the dev server is running, you can test the Cloudflare Pages health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "ok": true,
  "service": "The Inspire Business Academy",
  "phase": "Phase 12 - Production Deployment",
  "status": "healthy",
  "environment": "development",
  "timestamp": "2026-10-07T..."
}
```

---

## 6. Type Checking and Build Verification

Run TypeScript compilation check:

```bash
npm run lint
```

Run production build:

```bash
npm run build
```
