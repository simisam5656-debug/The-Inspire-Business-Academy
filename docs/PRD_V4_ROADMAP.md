# The Inspire Business Academy — PRD v4 Roadmap (15 Oct 2026)

> Yeh file `docs/PRD_HANDOFF.md` ke sath padhi jati hai (project context, rules, handoff protocol wahan hain).
> **Status (user ne confirm kiya, 15 Oct 2026):** PR #1, #2, #3 merged; round-3 SQL chal chuka; certificate verify, student certificate, physical registration, additional-course request, progress, audit log, admin online certificate — sab live aur theek chal rahe hain.
> User Roman Urdu mein baat karta hai; jawab Roman Urdu mein, code/technical terms English mein.

---

## 0. Kaam ki tarteeb (recommended)

| Phase | Naam | Kyun pehle |
|---|---|---|
| 1 | Safety aur buniyadi cleanup | Spam, hard-coded numbers, chhote bugs — bade nuqsan se bachata hai |
| 2 | Offers + Promo Code system | Seedha sales par asar |
| 3 | Student Profile, Portfolio URL, "Admin se sawal" (WhatsApp) | User ki naye feature requests |
| 4 | Notifications, admin dashboard numbers, learning experience | Retention aur admin ki asani |
| 5 | Single-device login, AI Content Studio | Bade features, design PRD mein pehle se hai |
| 6 | Reliability (backups, error tracking, mobile QA) | Chalte rehne ke liye |

Har phase ka kaam: naya branch → PR → (agar DB change ho) SQL migration file + user Supabase SQL Editor mein chalaye → test checklist.

---

## Phase 1 — Safety aur cleanup

1. **Spam protection:** public forms (physical admission, online join, contact, short-session registration) par **Cloudflare Turnstile** (free) + server-side verify + rate limit (IP/phone per ghanta). `site_settings` mein Turnstile site key (public); secret Cloudflare env mein. Form ke andar fail hone par saaf Roman Urdu error.
   - Acceptance: bot jaisi 10 requests/min par block; asli user ko koi rukawat nahi.
2. **Hard-coded contact/payment values hatana:** `siteConfig.whatsapp/phone` ki jagah `site_settings_public` (admin Settings se). `siteConfig` sirf last-resort fallback.
3. **Admin "Enroll student" + manual payment:** admin kisi bhi student ko course (expiry ke sath) de sake, aur cash payment record kar sake; audit log mein entry.
4. **Chatbot bug:** `packages.is_public` → live column `is_active`.
5. **Purane 8 failing tests** (Workers AI env) theek ya hataye jayein.
6. **Supabase Auth settings** (user dashboard mein): Site URL + Redirect URLs `pages.dev` domain; leaked-password protection ON.
7. Terms/Refund wording owner review (refund shartein business decision).

## Phase 2 — Offers + Promo Code system (user ki requirement)

**Maqsad:** admin discount offer banaye, uska promo code banaye; student promo code daale to admin ka rakha hua % discount mile; admin kabhi bhi offer khatam kar sake.

**Maujooda state (verify ho chuka):** tables `offers` (`discount_percentage`, `start_date`, `end_date`, `is_active`, `requires_promo_code`, `applicable_course_slugs`), `offer_promo_codes` (`offer_id`, `code`, `usage_limit`, `times_used`, `is_active`), `coupons`, `coupon_redemptions`. Server price logic `api/_lib/pricing.ts` pehle se offer/promo/coupon evaluate karti hai. `AdminOffersPage` mein offer banana, % set karna aur activate/deactivate hai — **lekin offer ke promo codes banane/manage karne ka UI nahi dikhta.**

**Kaam:**
- AdminOffersPage mein har offer ke andar **"Promo Codes"** section: code add/edit (uppercase, unique), usage limit (optional), per-user limit, is_active toggle, "times used" counter.
- Offer form: % discount, start/end date (optional), kaun se courses par (all / selected), "promo code zaroori hai" toggle, **"Offer abhi band karo"** button (is_active=false + audit log). Band hote hi naye payments par discount na lage (server-side check; purani verified payments ko asar nahi).
- Student/public price box: promo code daalte hi server `/api/payments/calculate` se % ke hisab se naya price, "Rs. X off (Y%)" dikhe; ghalat/expired code par saaf message.
- Qeemat ka asli faisla hamesha **server** kare (client ki di hui price par bharosa nahi). Discount kabhi price se zyada nahi.
- Reporting: AdminReports mein "kis code se kitni sales / kitna discount".
- Acceptance: code lagane par % sahi; offer band karne ke baad code reject; usage limit khatam hone par reject; total kabhi negative nahi.

## Phase 3 — Student Profile, Portfolio URL, "Admin se sawal"

### 3A. Student profile settings (student apni profile edit kare)
- Naya page `/student/profile`: full name, phone, **profile picture URL**, short bio (optional), city (optional). Email/role/student_code sirf dikhe.
- DB: `profiles` mein additive columns `avatar_url text`, `bio text`, `city text` (+ length checks).
- **Security:** student ko `profiles` par broad UPDATE nahi (warna role/is_active badal sakta hai). Narrow `SECURITY DEFINER` function `update_my_profile(p_full_name, p_phone, p_avatar_url, p_bio, p_city)` jo sirf yeh columns badle, `auth.uid()` par, aur validate kare: phone `^03\d{9}$`, avatar URL sirf `https://`, max 500 chars, `javascript:`/`data:` reject.
- Avatar render: `<img referrerPolicy="no-referrer" loading="lazy">`, ghalat URL par initials fallback. (Baad mein optional: Supabase Storage upload.)
- Header/dashboard par avatar aur naam dikhe.

### 3B. Admin ki taraf se student ka Portfolio website URL
- `profiles.portfolio_url text` — **sirf admin/staff set kare** (student nahi, taake admin ka rakha hua link asli ho). Student ko apni profile mein read-only dikhe.
- Admin → Online Students → student detail/profile mein "Portfolio URL" field + **"Open portfolio"** button (naye tab mein).
- Security/Isolation (user ki requirement: hamari website se koi taluq nahi): sirf `https://` URL, `target="_blank" rel="noopener noreferrer nofollow"`, **hamari website us site ko embed/iframe na kare, na koi auth/data share**. Admin ko chhota note: "Yeh bahari link hai, hamari website se mansloob nahi."
- Staff update RLS (ya staff API `authenticateStaff('students')`) + audit log entry. Public pages par dikhana optional baad ka faisla.

### 3C. Student → Admin sawal via WhatsApp (lecture ke dauran)
- Classroom mein har lesson ke paas **"Admin se sawal poochein"** box: student sawal type kare → **"WhatsApp par bhejein"** → `https://wa.me/<admin WhatsApp from site_settings>?text=<encoded>` khulta hai. Pre-filled text: student ka naam, student code, course, module/lesson ka naam, aur sawal.
- Admin ka WhatsApp number **Settings se** (hard-code nahi).
- **Haqeeqat jo user ko batani hai:** `wa.me` link message ko khud send nahi karta; WhatsApp khulta hai aur student ko "Send" dabana hota hai. Poori tarah automatic WhatsApp (bina student ke dabaye) ke liye WhatsApp Business API chahiye (paid, approval) — abhi scope se bahar.
- Optional (phase 3 ke andar ya baad mein): `lesson_questions` table (student_id, course_id, lesson_id, question, created_at, status) — jab student button dabaye to record bhi save ho taake admin panel mein bhi list dikhe aur jawab track ho. RLS: student sirf apne insert/select, staff sab dekhe.
- Acceptance: button par sahi number aur sahi pre-filled text; lesson ka naam sahi; khali sawal par button disabled.

## Phase 4 — Notifications, admin numbers, learning experience

1. **Notifications:** payment verify/reject/enroll hone par student ko message; nayi request par admin ko. Pehla step (sasta): admin panel mein "WhatsApp par batayein" click-to-chat link (pre-filled). Dusra step: email (Resend ya Cloudflare Email) — secret Cloudflare env mein.
2. **Admin dashboard numbers:** is mahine ki kamai, pending payments, top courses, lessons jahan students ruk jate hain (drop-off), nayi registrations.
3. **Asli lecture progress:** video ka kam az kam X% dekhne par hi "complete"; ya module quiz pass hone par agla module unlock (admin se on/off).
4. **Resume + streak:** "wahin se shuru karo" button, rozana seekhne ki streak.
5. **Certificate sharing:** PDF download, QR, LinkedIn "Add to profile" link (verify page ka URL ke sath).
6. **Reviews/testimonials:** course complete par review lena, admin approve kare, public pages par dikhe.
7. **Referral:** referral code → naye student ko discount, referrer ko credit/coupon (Phase 2 ke promo system par bana hua).
8. **Physical campus:** fee/attendance reminders, parents ko WhatsApp monthly report (click-to-chat).

## Phase 5 — Bade features (design `PRD_HANDOFF.md` Section 7–8 mein)

- **Single-device login** (`student_sessions`, `register_student_session`, `check_student_session`, admin "Reset devices"). User se pehle policy confirm: naya login purane ko logout kare (recommended) ya naya login block.
- **AI Content Studio:** admin idea likhe → Workers AI strict JSON draft (Course/Modules/Lessons/Quiz/Final Exam/Announcement) → admin preview+edit → **Approve & Save** (draft, `is_published=false`) → audit log. Server-side JSON validation aur length limits.

## Phase 6 — Reliability

- Supabase daily backups check (free plan par PITR nahi) aur ek dafa restore test.
- Error tracking (Sentry free tier) frontend + Functions.
- Mobile QA: join form, payment screenshot upload, classroom video, quizzes, certificates, admin panel (phone par).
- Cloudflare Pages preview deployments se PR test.

---

## Qaida jo har phase par laagu

- RLS ON; koi policy kamzor nahi. Student ko broad write nahi — narrow SECURITY DEFINER function (`SET search_path`, `REVOKE ... FROM PUBLIC`, specific `GRANT`).
- Sab values admin Settings se; hard-code sirf last-resort fallback.
- Price ka faisla server par.
- External URLs (avatar, portfolio) sirf `https://`, validate, `rel="noopener noreferrer nofollow"`.
- Secrets chat mein nahi; Cloudflare dashboard mein.
- Supabase connector se DDL aksar cancel hota hai → SQL repo mein + user SQL Editor mein chalaye.
- "100% working" ka dawa nahi; test checklist do.

## Open sawal user se (kaam shuru karne se pehle)

1. Phase 3C: sirf WhatsApp link (student "Send" dabaye) theek hai, ya sawal DB mein bhi save ho (admin panel list)? *(Recommend: dono.)*
2. Phase 3B: student portfolio URL khud bhi add kar sake ya sirf admin? *(User ne kaha: admin. Isi par chalenge.)*
3. Phase 5 single-device: naya login purane ko logout kare ya block ho?
4. Promo code: ek student ek code kitni baar use kare? (default: 1 baar)
