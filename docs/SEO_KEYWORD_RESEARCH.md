# SEO Research & Implementation Plan — The Inspire Business Academy

**Status:** Phase 1 research plan; keyword metrics are not yet verified.  
**Target market:** Sadiqabad, Punjab, Pakistan + Pakistan-wide online learners.  
**Delivery model:** Physical campus + online courses/LMS.  
**Primary course areas:** Freelancing, Web Development, AI / AI Web Development, Graphic Design, Digital Marketing / SEO.  
**Hosting:** Cloudflare Pages.  
**Repository:** https://github.com/simisam5656-debug/The-Inspire-Business-Academy

## Rules for interpreting this document

- Priority (A/B/C) is a strategic recommendation based on business relevance and likely search intent. It is **not** a measured search-volume ranking.
- No monthly search volumes, keyword difficulty scores, or Google positions are claimed here; these metrics have not yet been verified.
- Google Keyword Planner's ad competition is not the same as organic SEO difficulty.
- Validate search demand using Google Keyword Planner (Pakistan; local terms where targeting is available), Google Trends (Pakistan; relative interest only), and Google Search Console (site's actual impressions/clicks/queries).
- Don't target a course page for a course unless the academy actually offers it. Don't publish unconfirmed fees, durations, certificates, outcomes, or campus details.
- Avoid keyword stuffing, fake reviews, fake location pages, and unsupported claims such as “No. 1 academy”.

## 1. Priority A — local / admission-intent keywords

| Keyword idea | Intent | Proposed target page | Metrics |
|---|---|---|---|
| The Inspire Business Academy Sadiqabad | Brand / navigational | Homepage | Volume/rank unverified |
| computer academy in Sadiqabad | Local / commercial | Homepage or academy page | Volume/difficulty unverified |
| IT courses in Sadiqabad | Local / commercial | Courses overview | Volume/difficulty unverified |
| computer courses in Sadiqabad | Local / commercial | Courses overview | Volume/difficulty unverified |
| freelancing course in Sadiqabad | Local / admission | Freelancing course | Volume/difficulty unverified |
| web development course in Sadiqabad | Local / admission | Web development course | Volume/difficulty unverified |
| graphic designing course in Sadiqabad | Local / admission | Graphic design course | Volume/difficulty unverified |
| digital marketing course in Sadiqabad | Local / admission | Digital marketing course | Volume/difficulty unverified |
| SEO course in Sadiqabad | Local / admission | SEO course or digital marketing page | Volume/difficulty unverified |
| IT training institute in Sadiqabad | Local / commercial | About / courses overview | Volume/difficulty unverified |

## 2. Priority A — Pakistan-wide course intent

| Keyword idea | Intent | Proposed target page | Metrics |
|---|---|---|---|
| online courses in Pakistan | Commercial | Online courses overview | Volume/difficulty unverified |
| freelancing course in Pakistan | Commercial / admission | Freelancing course | Volume/difficulty unverified |
| freelancing course for beginners | Learning / commercial | Freelancing course + guide | Volume/difficulty unverified |
| how to start freelancing in Pakistan | Informational | Helpful blog/guide | Volume/difficulty unverified |
| web development course in Pakistan | Commercial / admission | Web development course | Volume/difficulty unverified |
| web development course for beginners | Commercial / learning | Web development course | Volume/difficulty unverified |
| graphic design course in Pakistan | Commercial / admission | Graphic design course | Volume/difficulty unverified |
| digital marketing course in Pakistan | Commercial / admission | Digital marketing course | Volume/difficulty unverified |
| SEO course in Pakistan | Commercial / admission | SEO course | Volume/difficulty unverified |
| online courses with certificate in Pakistan | Commercial / comparison | Online courses overview | Volume/difficulty unverified |

## 3. Priority B — AI-related terms; validate before investing heavily

| Keyword idea | Intent | Proposed target page | Metrics |
|---|---|---|---|
| AI web development course | Commercial / learning | AI course page, only if offered | Volume/difficulty unverified |
| learn web development with AI | Informational | AI/web-development guide | Volume/difficulty unverified |
| AI tools for web developers | Informational | Blog/learning resource | Volume/difficulty unverified |
| AI course in Pakistan | Commercial | AI course page, only if offered | Volume/difficulty unverified |
| ChatGPT for web development | Informational | Blog/learning resource | Volume/difficulty unverified |

## 4. Priority B — fee, duration, and admission-intent queries

| Keyword idea | Intent | Proposed target page | Metrics |
|---|---|---|---|
| computer courses fees in Sadiqabad | Fee comparison | Courses/fees section | Volume/difficulty unverified |
| freelancing course fees in Pakistan | Fee comparison | Freelancing course | Volume/difficulty unverified |
| web development course fees in Pakistan | Fee comparison | Web development course | Volume/difficulty unverified |
| graphic designing course fees in Sadiqabad | Fee comparison | Graphic design course | Volume/difficulty unverified |
| digital marketing course duration | Course comparison | Digital marketing course | Volume/difficulty unverified |
| IT course admission in Sadiqabad | Admission | Admissions page | Volume/difficulty unverified |
| computer academy admission in Sadiqabad | Admission | Homepage/admissions | Volume/difficulty unverified |
| online courses with certificate in Pakistan | Course comparison | Online courses overview | Volume/difficulty unverified |

Only publish fees/durations that match the current admin-controlled pricing and real course data. Avoid hardcoding prices in multiple places.

## 5. Informational content ideas

These are topic hypotheses, not verified high-volume keywords:

- How to start freelancing in Pakistan: beginner roadmap
- Which skills are useful for beginners starting freelancing?
- Web development roadmap: HTML, CSS, JavaScript and next steps
- Graphic design skills for freelancing beginners
- Digital marketing vs SEO: what beginners should learn
- How to choose an online course in Pakistan
- What to check before enrolling in a course (curriculum, practice, support, certificate verification)

Publish only if the academy can provide genuinely helpful, accurate content and a relevant next step. Don't create thin pages just to target keyword variations.

## 6. Existing technical SEO observations (from current repository files)

1. `index.html` already has a title and meta description, but the description is generic and doesn't clearly describe the real course offering or hybrid Sadiqabad + online model.
2. `public/robots.txt` allows public crawling and disallows `/admin`, `/student`, and `/api/`, but its sitemap directive points to `https://theinspirebusinessacademy.com/sitemap.xml`.
3. `README.md` identifies the current production URL as `https://the-inspire-business-academy.pages.dev/`; a custom domain is mentioned only as an example for an environment variable. Therefore, the custom domain's live ownership/verification and canonical domain are **not confirmed** from these repository files.
4. The public route setup includes Home, Courses, About, Contact, Gallery, Verify and admission/join pages. The current public route/page metadata behavior should be audited before creating new SEO landing pages.
5. `package.json` scripts include `build`, `lint` (TypeScript check), and `test`.

### Important technical blocker

Before adding a sitemap directive, canonical URLs, or structured data, confirm the actual intended production domain and test which domain serves the canonical production site. Do not blindly replace the current sitemap URL with a guessed domain. Generate a sitemap containing only canonical, indexable public URLs. Exclude admin/student/private/auth flows and avoid exposing sensitive URLs.

## 7. Recommended implementation order

### Phase 1 — baseline and crawlability
- Confirm canonical production domain and Cloudflare Pages custom-domain configuration.
- Inspect live `robots.txt`, sitemap response, redirects, status codes, and indexing directives.
- Connect/check Google Search Console and submit the correct sitemap.
- Record current indexed pages, impressions, clicks, CTR, and queries where data exists.
- Confirm no private/admin/student pages are indexable; robots.txt alone is not access control.

### Phase 2 — on-page SEO foundations
- Improve homepage title and meta description based on actual offer and confirmed location.
- Ensure one clear, useful H1 per public page and logical heading hierarchy.
- Add appropriate canonical metadata and Open Graph fields only after canonical domain is confirmed.
- Ensure public pages have descriptive internal links, meaningful image alt text, mobile usability, and fast loading.
- Add valid structured data only for facts that are visible and verifiable. Don't fabricate ratings/reviews or course claims.

### Phase 3 — course page mapping
- Audit current Courses page and admin-managed catalog. Confirm exact public course names and routes.
- Prefer a dedicated landing page only where content is substantial and course exists; don't create doorway/thin pages.
- Add course-specific curriculum, prerequisites, delivery mode, schedule/duration/fees only when confirmed, FAQs, and clear enrollment CTA.
- Keep admin-controlled course data and pricing as the single source of truth.

### Phase 4 — local SEO
- Confirm exact public campus address and business details from owner-approved source.
- Complete Google Business Profile accurately, keep name/address/phone consistent, request genuine reviews, and add real campus photos.
- Add a useful contact/location page with directions and genuine local context.
- Do not invent nearby-area pages or claim service in places not actually served.

### Phase 5 — content and measurement
- Publish useful beginner guides based on validated search intent.
- Review Search Console queries/pages monthly; improve pages earning impressions but low CTR or weak engagement.
- Re-check performance after changes; don't promise a #1 ranking or a specific timeframe.

## 8. Verification tracker

| Item | Status | Notes |
|---|---|---|
| Keyword monthly search volumes | Not verified | Requires Keyword Planner export |
| Organic keyword difficulty | Not verified | Requires SERP/competitor audit |
| Relative interest by location | Not verified | Google Trends; relative index only |
| Existing site queries/impressions | Not checked | Requires Search Console access/export |
| Canonical production domain | Not confirmed | README says Cloudflare Pages URL; robots points to different custom domain |
| Live sitemap availability | Not checked | Verify before changing sitemap directive |
| Live robots behavior | Not checked | Repository copy inspected only |
| Per-course current public routes/data | Partial audit only | Confirm course catalog and route components before adding pages |
| Supabase schema/data | Not queried for this research draft | No database change required in Phase 1 |

## 9. Official reference tools

- Google Search Console: https://search.google.com/search-console
- Google Keyword Planner: https://ads.google.com/home/tools/keyword-planner/
- Google Trends: https://trends.google.com/trends/
- Google Search documentation: https://developers.google.com/search/docs

---
Last reviewed: 2026-10-19. This is a research/implementation plan, not a claim that changes are deployed or rankings have improved.
