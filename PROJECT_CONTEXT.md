# The Inspire Business Academy — Master Project Context

> Maqsad: Is file ko repository ke root mein rakhein taake future website changes mein project ka context consistent rahe. Yeh source code ka replacement nahi; hamesha latest code/configuration verify karein. Agar is file aur actual code mein farq ho, pehle code ko check karein aur document update karein.

## 1. Project Identity

- **Project:** The Inspire Business Academy
- **GitHub repository:** https://github.com/simisam5656-debug/The-Inspire-Business-Academy
- **Production website:** https://the-inspire-business-academy.pages.dev/
- **Hosting:** Cloudflare Pages (Vercel nahi, jab tak owner explicitly na kahe)
- **Backend/database:** Supabase
- **Known Supabase project ID:** `dyynkajukzkvjybvipvr`
- **Known frontend stack:** React + TypeScript + Supabase
- **Design direction:** Premium navy-blue and gold
- **Communication preference:** Owner ko Roman Urdu mein clear explanations dena; technical terms, code aur identifiers standard English mein rehne dein.

## 2. Golden Rules

1. Is file ko parhein, phir latest repository/source code inspect karein.
2. Owner ki request ko implement karne se pehle relevant components, routes, styles, database queries aur dependencies samjhein.
3. Existing features ko preserve karein; unrelated redesign ya mock/static replacement na karein.
4. Missing requirements ko guess na karein. Agar zaroori baat unclear ho to ek focused sawal karein.
5. Chhoti, focused aur maintainable changes ko prefer karein.
6. Secrets, passwords, API tokens, private keys ya service-role keys ko source code, chat ya public docs mein kabhi add na karein.
7. Code test, build ya deploy hone ka claim sirf tab karein jab waqai verify kiya ho.
8. Final jawab Roman Urdu mein dein: kya badla, kin files mein, kaun se checks chalaye, kya verify nahi hua, aur deployment ka status kya hai.

## 3. Change Workflow

### A. Samjhein
- Requested outcome aur affected page/feature identify karein.
- Desktop, mobile, accessibility, SEO, auth aur data par asar consider karein.

### B. Inspect karein
- Current source files, imports/callers, existing UI patterns aur package scripts parhein.
- Relevant Git branch/commit/PR inspect karein.
- Database schema aur policies ko verify karein; table/column names assume na karein.

### C. Plan aur implement karein
- Existing architecture aur design system follow karein.
- Reusable components/styles use karein; unnecessary dependencies add na karein.
- Broad ya risky changes se pehle plan explain karein.
- Destructive database/production action se pehle owner ki approval lein.

### D. Verify karein
Project mein jo available ho woh run karein:
- lint
- TypeScript type check
- tests
- production build
- responsive/browser checks
- console errors aur accessibility checks

Jo check run nahi hua, usay clearly “not run” ya “not verified” kahein.

### E. Deliver karein
- Summary of changes
- Changed files/components
- Tests/checks aur unke actual results
- Remaining issues/limitations
- Commit/PR status
- Cloudflare deployment status (verified/pending/not performed)

## 4. Frontend and UX

- Known stack: React + TypeScript. `package.json`, scripts, router aur styles ko current repo mein verify karein.
- Existing styling conventions follow karein; bina zaroorat naya UI framework add na karein.
- Mobile responsiveness har UI change ka hissa samjhein, khaas taur par small Android screens.
- Text contrast, spacing, clear hierarchy, keyboard focus aur touch-friendly controls ka khayal rakhein.
- Premium navy-blue/gold style use karein jab tak owner different design na maange.
- Existing brand elements aur working page structure ko preserve karein.
- Animations content ko support karein, distract na karein; `prefers-reduced-motion` respect karein.
- Important content animation ke baghair bhi visible aur usable hona chahiye.
- Images ke liye meaningful `alt` text, sensible aspect ratio aur loading performance ka khayal rakhein.

## 5. Supabase and Security

- Known project ID: `dyynkajukzkvjybvipvr`.
- Existing client setup, schema, migrations aur Row Level Security (RLS) policies inspect karein.
- Browser mein sirf woh keys use karein jo Supabase ke public-client model ke liye intended hon; service-role key frontend mein kabhi na rakhein.
- Data access ko RLS aur appropriate authorization se secure karein; bug fix karne ke liye security disable na karein.
- Schema changes ko migrations/documentation mein record karein.
- Required environment variable names document kiye ja sakte hain, values/secrets kabhi nahi.
- User input ko validate karein aur errors safely handle karein.

## 6. GitHub Workflow

- Repository: https://github.com/simisam5656-debug/The-Inspire-Business-Academy
- Focused changes aur descriptive commit messages prefer karein.
- Significant changes ke liye feature branch/PR use karein jab current repo workflow support karta ho.
- Unrelated work overwrite na karein; force-push se parhez karein jab tak explicitly approve na ho.
- Open PR ko merged release na samjhein; current status verify karein.

## 7. Cloudflare Pages Deployment

- Known production URL: https://the-inspire-business-academy.pages.dev/
- Cloudflare Pages current known hosting platform hai.
- Local build pass hona production deploy ka proof nahi.
- Deployment/build status aur preview URL check karein before claiming deploy succeeded.
- Environment variable values expose kiye baghair configuration verify karein.
- Access available ho to release ke baad production behavior check karein.

## 8. Image and External Asset Rules

1. Relevant, stable source use karein.
2. Direct image URL ko use karne se pehle verify karein ke woh image serve karta hai.
3. Meaningful alt text add karein.
4. Mobile crop/aspect ratio check karein.
5. Production use se pehle licensing/usage terms consider karein.
6. Technical diagrams ko accurate labels ke saath banayein; jahan diagram behtar ho wahan photo ko replacement na banayein.
7. Unverified URL ko tested ya guaranteed na kahein.

## 9. Quality Checklist

- [ ] Change owner ki actual request ko match karti hai.
- [ ] Existing functionality preserve hai.
- [ ] React/TypeScript patterns current project ke mutabiq hain.
- [ ] Mobile/desktop behavior consider kiya gaya.
- [ ] Accessibility aur reduced-motion relevant jagah check kiye.
- [ ] Images/links verify kiye ya unverified mark kiye.
- [ ] Supabase/RLS behavior relevant jagah check kiya.
- [ ] Koi secret commit nahi hua.
- [ ] Available checks run hue, ya limitation batayi gayi.
- [ ] Deployment status build status se alag verify hua.
- [ ] Final report Roman Urdu mein clear hai.

## 10. Change Log Format

Har meaningful change ke baad entry add karein:

```text
### YYYY-MM-DD — Short title
- Request:
- Files/components changed:
- Behavior change:
- Verification performed:
- Deployment status:
- Follow-up / known limitations:
```

Sirf confirmed facts record karein; unknown cheez ko “not verified” mark karein.

## 11. Historical Notes — Verify Before Use

Yeh notes previous work se hain aur current repo status se different ho sakte hain:

- Public animations ke liye pehle PR banaya gaya tha: https://github.com/simisam5656-debug/The-Inspire-Business-Academy/pull/14
- Feature branch ka naam tha `feat/public-premium-animations`.
- Related file: `src/components/layout/public-animations.css`
- Pehle Cloudflare preview URL: `https://6d64b6a1.the-inspire-business-academy.pages.dev`
- Is PR, preview aur latest deployment ka current status is file mein verify nahi hai. GitHub aur Cloudflare par dobara check karein.
- Conversation mein student lecture ki standalone HTML file banayi gayi thi. Jab tak repository mein commit na ho, usay production website ka hissa assume na karein.

## 12. Details to Confirm and Maintain

In fields ko current repository/configuration inspect karne ke baad hi fill karein:

- [ ] Default branch:
- [ ] Package manager and lockfile:
- [ ] Available scripts (dev/build/lint/typecheck/test):
- [ ] Main routes/pages:
- [ ] Authentication providers and roles:
- [ ] Database schema and migrations:
- [ ] Storage buckets/policies:
- [ ] Required environment variable names only:
- [ ] Forms/email/notification integrations:
- [ ] Analytics/SEO:
- [ ] Known bugs/technical debt:
- [ ] Active branch/PR:
- [ ] Latest completed change and verification:

## 13. Future Chat Starter

Owner future chat mein yeh keh sakta hai:

> “The Inspire Business Academy ki `PROJECT_CONTEXT.md` file aur latest source code pehle inspect karo. Phir meri requested change implement karo, existing features preserve karo, relevant tests/build run karo, aur Roman Urdu mein changed files aur verification results batao. Agar koi important requirement missing ho to guess karne ke bajaye sawal karo.”

Assistant ko actual repository/source files inspect karni chahiye; yeh file source-code review ka substitute nahi hai.

---
**Last updated:** 2026-10-18  
**Status:** Initial master context draft. Historical notes aur current technical details ko latest repository ke against verify karna zaroori hai.
