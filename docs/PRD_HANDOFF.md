# The Inspire Business Academy — Handoff PRD (v3, 15 Oct 2026)

> Is file ko naye Claude chat mein paste karein. Yeh project ka poora context, ab tak ka kaam, baqi kaam aur kaam karne ke usool batati hai.
> **User Roman Urdu mein baat karta hai (developer nahi hai). Jawab Roman Urdu mein dein; code aur technical terms English mein.**

---

## 0. Handoff protocol (sabse zaroori)

Agar user likhe **"Main new Claude pe ja rha hun"**, to is chat ke Claude ko:
1. Repo ki latest state check karni hai (`git log`, open PRs, `docs/PRD_HANDOFF.md`).
2. Live Supabase ki state check karni hai (migrations list, policies, functions) taake PRD sach rahe.
3. Is file ka **naya version** banana hai: Section 4 (Done), Section 5 (Open issues), Section 6 (Manual steps pending), Section 9 (Change log) update karke, aur user ko poori file de deni hai (repo mein `docs/PRD_HANDOFF.md` par bhi commit karni hai, PR ke zariye).
4. User ko batana hai ke naye Claude mein kya kya connect karna hai (Section 2) aur yeh file paste karni hai.
Kaam rukna nahi chahiye: naya Claude Section 5 ke pehle open item se shuru kare.

---

## 1. Project

- **Naam:** The Inspire Business Academy (Sadiqabad, Pakistan) — physical campus + online LMS.
- **Stack:** React 19 + TypeScript + Vite + Tailwind 4 + React Router 7; Supabase (DB, Auth, Storage); Cloudflare Pages + Pages Functions (`functions/api/*` wrap `api/*` handlers via `functions/_adapter.ts`) + Workers AI.
- **Payments:** manual proof-based (JazzCash / Easypaisa / bank) — student TID + screenshot upload, admin verifies, admin grants access.
- **Repo:** https://github.com/simisam5656-debug/The-Inspire-Business-Academy (branch `main`; kaam branch + PR se hota hai).
- **Live:** https://the-inspire-business-academy.pages.dev/ (Cloudflare Pages, GitHub se auto-deploy).
- **Supabase project id:** `dyynkajukzkvjybvipvr`.
- `/api/*` sirf Cloudflare par chalta hai (local Vite par nahi).
- Roles: `super_admin`, `manager` (max 4, granular `manager_permissions`), `student`. Physical students ka website login nahi.

## 2. Naye Claude mein connect karna (user ke liye steps)

1. Claude → Settings → Connectors → **GitHub** connect karein, aur **Claude GitHub App** install/authorize karein is repo par (taake push + PR ho sake).
2. Claude → Settings → Connectors → **Supabase** connect karein, project `dyynkajukzkvjybvipvr` select karein.
3. Is PRD ko chat mein paste karein aur likhein: "Section 5 ke pehle open item se shuru karo."
4. **Kabhi bhi secrets chat mein na bhejein.** `SUPABASE_SERVICE_ROLE_KEY` sirf Cloudflare dashboard (Pages → Settings → Variables and Secrets) mein jata hai.

## 3. Standing rules (Claude ko follow karne hain)

- Admin panel se sab kuch control hota hai; public pages usay reflect karein. Hard-coded phone/payment/price/image values nahi (sirf last-resort fallback).
- Har course ki price admin tay karta hai aur har jagah wahi dikhe (single source of truth: server `api/_lib/pricing.ts`).
- DB changes **additive** hon. **RLS hamesha ON**; kabhi kamzor na karein. Student ko kisi table par broad write/update na dein — narrow `SECURITY DEFINER` function (`SET search_path`, `REVOKE ... FROM PUBLIC`, specific `GRANT`) use karein.
- Quiz / exam ke correct answers student ko kabhi na jayein: `/api/student/assessments` server par grade karta hai.
- Workflow: naya branch → commit → push → PR (`gh pr create` GraphQL block hai, isliye `gh api repos/simisam5656-debug/The-Inspire-Business-Academy/pulls -f title=... -f head=... -f base=main -F body=@file`).
- Supabase connector se `execute_sql` **read/test** ke liye theek hai, lekin `apply_migration` / DDL / policy changes aksar *cancel* ho jate hain. Aisi surat mein SQL repo ki `supabase/migrations/` mein rakhein aur user ko **Supabase SQL Editor** mein chalane ko dein (step-by-step Roman Urdu mein), phir verify karein.
- Sandbox mein npm registry aur live site curl block hain: build / live test nahi hota. Isliye **"100% working" kabhi na kahein**; test checklist dein. Tests: `npx tsx --test test/*.test.ts` (8 purane AI-endpoint tests pehle se fail hote hain — Workers AI env ki wajah se, related nahi).
- User ko step-by-step guide karein; chhoti, saaf Roman Urdu.

## 4. Ab tak ho chuka (merged / PR mein)

| Kaam | Status |
|---|---|
| Online join page crash (`discountAmount`) fix, pricing | PR #1 merged |
| Student quizzes + final exams server-graded API, admin "New Final Exam", admin online certificate issue, classroom fake quiz removed | PR #2 merged |
| Round 3: certificate verify (RPC), student certificate claim (RPC), progress bar (RPC), admin online-cert list fix, audit log real actor, physical admission fallback, course-request screenshot, Terms + Refund pages | **PR #3 — merge + SQL pending (Section 6)** |
| Lessons student ko dikhte hain (RLS policies `enrolled_students_can_view_lessons`) | live |
| Chatbot (Workers AI) Cloudflare par chal raha hai | live |
| `online_payments` columns, proof bucket limit, `site_settings_public` insert policy | live |

## 5. Open issues / baqi kaam (priority order)

1. **PR #3 test + physical registration confirm.** Agar physical form ab bhi fail ho to user se form par nazar aane wala exact red error text lein (ya browser Network tab mein `/api/admissions/submit` ka status + response). Fallback ab direct pending insert karta hai.
2. **Course request (additional course) confirm.** Wajah mili: screenshot "optional" likha tha lekin zaroori tha aur error modal ke upar chhup jata tha. Ab fix hai; user se test karwayein.
3. **Student ka progress** (Dashboard "Course Completion"/"Current Progress") — `update_my_course_progress` function ke baad verify karein.
4. **Admin "Enroll student" / manual payment buttons** (admin khud student ko course de sake).
5. **Settings-driven contact/payment numbers** (hard-coded `0309-3534289` hatana), course price single source of truth sab pages par.
6. Chatbot `packages.is_public` bug (live column `is_active`).
7. Supabase Auth Site URL / Redirect URLs `pages.dev` domain ke liye (user dashboard mein karta hai); leaked-password protection toggle.
8. **Future plan A — Single-device login** (Section 7).
9. **Future plan B — AI Content Studio** (Section 8).
10. Refund/Terms ka matn **owner ko review karna hai** (maine reasonable draft likha hai; refund ki muddat/shartein business decision hai).

## 6. Manual steps jo user ke zimme hain (Supabase SQL Editor)

Har migration ek baar chalani hai (sab `IF EXISTS / OR REPLACE` hain, dobara chalana safe hai):
1. `supabase/migrations/20261014100000_student_content_access_and_assessment_support.sql` — `student_quiz_attempts.lesson_id` nullable + index. *(PR #2 ke baad user ne chalane the — verify karein: `select is_nullable from information_schema.columns where table_name='student_quiz_attempts' and column_name='lesson_id'` → YES hona chahiye.)*
2. `supabase/migrations/20261014200000_certificates_progress_audit_fixes.sql` — `verify_certificate`, `claim_online_certificate`, `update_my_course_progress`, audit trigger + backfill.
Phir PR #3 merge → Cloudflare auto-deploy.

Verification queries (naye Claude chala sakta hai):
```sql
select proname from pg_proc where pronamespace='public'::regnamespace
  and proname in ('verify_certificate','claim_online_certificate','update_my_course_progress','audit_logs_stamp_actor');
select tgname from pg_trigger where tgname='trg_audit_logs_stamp_actor';
```

## 7. Future plan A — Student sirf ek device par login (design)

**Maqsad:** student apna login share karke courses free mein na bech sake.
- Table `student_sessions(user_id, device_id, session_id, user_agent, last_seen_at, created_at, is_active)`; RLS: student sirf apni rows dekhe.
- Browser pehli baar `device_id` (random UUID, localStorage) banata hai. Login ke baad function `register_student_session(device_id)` (SECURITY DEFINER) chalta hai.
- Policy (user se confirm karein): **naya login purane ko logout kare** (asaan, recommended) ya **naya login block ho jab tak admin reset na kare**.
- App har ~60 sec / har page load par `check_student_session(device_id)` call kare; agar session invalid ho to sign-out + message "Aapka account dusre device par login hua hai".
- Admin panel mein "Reset devices" button (student ke sessions clear). Staff accounts par yeh rule na ho.
- Limitation: browser-level lock 100% fool-proof nahi (user ko batayein); sath mein Terms mein account sharing par suspension likha hai.

## 8. Future plan B — AI Content Studio (admin ke liye)

**Maqsad:** admin idea likhe, AI draft banaye, admin approve karke add kare: New Course, Modules, Lessons, Quizzes, Final Exams, Announcements.
- Existing: `api/admin/ai/generate.ts` + `src/services/adminAiService.ts` (Workers AI, staff-only).
- Design: har content type ke liye **strict JSON schema** (course → modules → lessons; quiz → questions with options + `correct_option_id`; exam; announcement). API sirf draft JSON lautata hai (DB mein kuch nahi likhta).
- UI: "AI Studio" page — idea box + type select → draft preview (editable) → **Approve & Save** button jo existing services (`CourseService`, `AssessmentService`, `CmsService`) se save kare, default `is_published=false` (draft) taake admin dobara dekh kar publish kare.
- Safety: JSON validate server-side, length limits, audit log entry har AI-generated save par, admin permission check (`authenticateStaff`).

## 9. Change log

- 2026-10-14: PR #1, #2 merged. Round 3 diagnosis: (a) anon cannot read `certificates` → verify fails; (b) students had no INSERT on `certificates` → RLS error; (c) students had no UPDATE on `student_enrollments` → progress never moved; (d) `student_enrollments.user_id` → `auth.users` (no FK to `profiles`) → embed error; (e) audit `actor_role` defaulted to `'manager'` in client code → now DB trigger stamps real role.
- 2026-10-15: PR #3 opened (round 3 fixes) + this PRD.

## 10. Quick test checklist (PR #3 merge ke baad)

- Public `/verify`: `INSPIRE-CERT-2026-0001` → valid certificate dikhe.
- `/join/physical`: form submit → reference number aaye; admin "Admissions" mein nazar aaye.
- Student: ek lesson complete karein → Dashboard progress % barhe.
- Student: final exam pass → "Issue Official Certificate" → certificate ban jaye (RLS error na aaye).
- Student: dusra course request (screenshot ke sath) → "Request Submitted"; admin Payments mein nazar aaye.
- Admin → Certificates → "Issue Online Certificate": students ki list aaye, issue ho.
- Admin → Audit Log: actor ka naam + sahi role (Super Admin) dikhe; Manager sirf asli manager ke liye.
- `/terms`, `/refund`: pages mein poora matn ho.
