# Joint Platform – Dashboard / Auth / UI Remediation & Expansion Plan
(Reference image: ![image3](image3) – circled areas show: legacy brand “Project Valine”, Stats card, Post composer, tag chips.)

## 0. Purpose
You asked for a complete summary of current issues plus how to fix them, including short‑term UI clean‑up and the larger “make real accounts persist” objective. This document is your actionable blueprint to start the next implementation chat or create sequential PRs safely.

---

## 1. Branding Inconsistencies (“Project Valine” vs “Joint”)
### Symptoms
- Dashboard header/logo or text still shows “Project Valine”.
- Some marketing / secondary pages (About, Features, 404, Terms, Onboarding steps) may retain legacy phrases.

### Root Causes
- Hard‑coded strings in page components (e.g. About.jsx hero badge, Onboarding/Welcome.jsx, meta descriptions).
- Possibly cached build assets or an alternate layout (AppLayout vs MarketingLayout) using older markup.

### Fix Actions
1. Code Search: Grep for `Project Valine` (case-insensitive).
2. Replace with “Joint” (retain semantic meaning; if sentence includes “Project Valine is…”, convert to “Joint is…”).
3. Update SEO meta config (already partially done, confirm `metaConfig.js` uses SITE_NAME = 'Joint'; remove fallback text).
4. Re-run visual tests & adjust snapshots after rename if tested.
5. Add lint check (optional): custom script scanning for blocked phrases (`scripts/brand-audit.mjs`).

### Acceptance
- No visible “Project Valine” anywhere in signed‑in or marketing UI except historical archive docs.
- Health endpoint / system logs unaffected.

---

## 2. Stats Card → Subscription CTA (“Emerald” Subscription)
### Goal
Convert “Your Stats” card into a button/entry point to a subscription purchase screen for Emerald tier.

### Design Outline
- Replace the existing gradient stats block with:
  - Title: “Unlock Full Stats”
  - Short benefits list (Connections, Likes, Views, Engagement tracking).
  - Button: “Get Emerald” (primary).
- Route: `/subscribe` or `/pricing`.
- Pricing page stub:
  - Plan tiers: Free (limited stats), Emerald (full analytics + early features).
  - Add instrumentation event: `subscription.view` & `subscription.click`.
- Keep existing metrics hidden/obscured until subscribed (placeholder skeleton or “Locked” icons).

### Implementation Steps
1. Create `src/pages/Pricing.jsx` + minimal feature flag `VITE_ENABLE_SUBSCRIPTIONS`.
2. Update dashboard layout: remove metrics grid, insert CTA card left column.
3. Introduce `useSubscription()` hook (stub returning `{ plan: 'free' }`).
4. Analytics: add lightweight client event dispatcher.
5. E2E test: visiting `/subscribe` renders plan options.

### Acceptance
- Clicking former stats area navigates to `/subscribe`.
- No metrics leak unless plan is Emerald (the gating can come later – show mock gating now).

---

## 3. Tag System Revision (Limit + Controlled Vocabulary)
### Current
- Users can freely add arbitrary tags; saved tags card shows user-defined chips.
- Trending tags list is hard‑coded.

### Desired
- Max 5 tags per post or profile collection.
- Only selectable from curated taxonomy; no free‑text additions.

### Proposed Tag Taxonomy (Editable)
(Initial large list – trim as needed)
`['Monologue','Drama','Comedy','SciFi','Fantasy','Horror','Romance','Thriller','Action','Narration','Animation','Commercial','Audiobook','Podcast','Casting','VoiceOver','Reading','Reel','ShortFilm','Feature','Pilot','ColdRead','Dialect','Character','Improv','Stage','Playwriting','Directing','Producing','Editing']`

### UI Adjustments
- Replace input field with a searchable dropdown / multi-select chip list.
- Disable “Add tag” once 5 chosen (aria-disabled).
- Visual count indicator: “3 / 5 tags”.
- Validation: On submit (post/create) reject >5 tags.

### Backend Guardrail
- Add server-side validation (if post creation endpoint exists) to reject tags outside allowed list or >5.

### Acceptance
- User can only select existing taxonomy tags.
- Attempts to type unlisted tag fail (UI blocked, or error toast).
- The saved tags component respects limit; trending tags show subset of curated list.

---

## 4. Dashboard Post Composer Removal & Create Screen Revamp
### Current
- Dashboard includes “Share a script, audition...” composer inline.
- /create route also exists but fields unclear (title/description look like generic boxes).

### Changes
1. Remove `<PostComposer />` from Dashboard center column.
2. Add simple callout card: “Ready to share? Go to Create” with button linking `/create`.
3. `/create` page redesign:
   - Structured form: 
     - Content Type selector: (Script | Audition | Reading | Reel)
     - Title (required) – label + helper “Clear, descriptive headline.”
     - Description (multiline) – placeholder “Describe context, goals, or feedback needed.”
     - Tags (multi-select component from new taxonomy).
     - Visibility (public | on-request | private).
     - Submit button disabled until title + type + consent (if you later add ToS check again for content policies).
   - Accessibility: associate labels with inputs; error messaging inline.

### Acceptance
- No composer on Dashboard.
- /create page shows clear labeled fields; required fields enforced.
- Navigation from Dashboard CTA works.

---

## 5. Dark Mode Persistence Bug
### Symptoms
- Dark mode activates then “cuts out” reverting to light after a few seconds.
  
### Likely Causes
- MarketingLayout `useEffect` forcibly sets `setTheme('light')`.
- theme-init script runs early and may override user preference.
- After navigation/back, root `<html>` class toggled incorrectly during sync hook.

### Fix Plan
1. Theme Flow Audit:
   - `public/theme-init.js` – only force light for marketing routes; ensure it does not override when user already has 'dark'.
   - MarketingLayout: remove unconditional `setTheme('light')` effect; instead:
     - If `theme === 'dark'` and page requires light (marketing-only), apply a temporary override via CSS wrapper class rather than global theme flip.
2. Introduce “override” context flag: `forceMarketingLight`.
   - Wrap marketing pages body with class `marketing-light` (scoped styles, or use CSS variables).
3. Ensure `useThemeSync` does not trigger repeated resets (check `hasSync.current` logic).
4. Add guard to backend theme preference loader: only update if incoming `backendTheme !== theme`.
5. Add test:
   - Simulate selecting dark in Settings, navigate marketing → return to app page → dark persists.

### Acceptance
- User-selected dark mode persists across route changes (except marketing pages visually appear light without flipping global setting permanently).
- No flicker after initial hydration.

---

## 6. Footer Revamp (Marketing Home Page)
### Issues
- Font weights and colors inconsistent (some neutral-500/700, disabled items vary).
- Hover states inconsistent; brand text color mismatch.

### Standardize
- Headings: `text-neutral-900 font-semibold text-sm md:text-base`
- Links (default): `text-neutral-700 hover:text-[#0CCE6B] focus-visible:outline-none focus-visible:ring-2`
- Disabled placeholders: `text-neutral-500 aria-disabled="true"` – consistent style, no hover.
- Brand line: remove gradient; use plain `text-neutral-900` (keep gradient only in hero brand if desired).
- Ensure contrast (WCAG AA): check color combinations (#0CCE6B on white acceptable; verify disabled contrast ~4.5:1 vs background – if short fall, bump to neutral-600).
- Optional: Add small column labels aria-labelledby to preserve accessibility.

### Acceptance
- All links same base color & hover style.
- Disabled items uniformly styled.
- No remaining gradient text in footer unless intentionally consistent site-wide.

---

## 7. Large Project: Actual Account Persistence & Onboarding Completion
### Current State (From Last Chat + Code Context)
- Login works (user row presumably exists or dev bypass).
- Onboarding / profile setup doesn’t persist changes (either endpoint missing or disabled by feature flags).
- Owner-only mode via email allowlist: `ALLOWED_USER_EMAILS`.
- Registration may be gated by `ENABLE_REGISTRATION` / dev bypass env flags.
- Profiles API present (`serverless/src/handlers/profiles.js`) with CRUD logic.
- User creation route exists (`/users` sign-up) but may be disabled; admin password script only updates existing users.

### Goals
1. Allow real profile data (displayName, headline, bio, roles, avatar/banner) to save.
2. After completion, redirect to dashboard without looping back to setup.
3. Add friend’s account safely without breaking owner-only gating.

### Strategy Overview
| Phase | Change | Risk | Effort |
|-------|--------|------|--------|
| 1 | Admin upsert script (`scripts/admin-upsert-user.mjs`) to create user row + set password + initial username/displayName | Low | ~45 min |
| 2 | Implement `/users/me` PUT endpoint (profile basics) with allowlist protection | Low/Med | 2–4 h |
| 3 | Wire frontend onboarding save to new endpoint (ProfileBasics & LinksSetup steps) | Low | 1–2 h |
| 4 | Posts & Comments minimal testing (ensure existing endpoints or stub) | Med | 2–6 h |
| 5 | Subscription gating for stats (Emerald) | Med | incremental |
| 6 | Additional persistence for theme preference (already partially implemented) | Low | 30 min |

### Endpoint Sketch – `/api/me/profile` (Alternative to /users/me)
```
PATCH /api/me/profile
Body: {
  displayName, username, headline, bio, roles, tags, avatarUrl?, bannerUrl?
}
Auth: Bearer token
Validation: 
  - username unique (if changed)
  - roles within allowed set
  - tags within curated list (<=5)
Allowlist check (owner-only mode):
  - if STRICT_ALLOWLIST=1 and user.email not in ALLOWED_USER_EMAILS → 403
Response: updated profile object
```

### Admin Upsert Script
Capabilities:
- Check if user exists by email
- If not, create `users` table row + minimal `profile` row
- Hash password (bcrypt) – reuse existing password utility
- Generate default username from email prefix
- Optional flags: `--skip-if-exists`, `--set-display-name "Friend Name"`

### Database / Schema Considerations
- Ensure `profile` table linked to `users` (already present).
- Confirm fields used by onboarding exist (`headline`, `bio`, `roles`, `tags`).
- If `tags` not in schema, store as string array or join table (MVP: JSON array column).
- Add necessary Prisma migration if missing.

### Onboarding Completion Flag
Add `onboardingComplete` boolean on `users` or `profiles`:
- Once PATCH successful with required fields, set `onboardingComplete=true`.
- Frontend: if user.onboardingComplete redirect to `/dashboard` on login.

### Acceptance (MVP)
- Running upsert script adds friend so they can log in without onboarding loop.
- Editing and saving profile persists data; subsequent login shows saved data.
- Tag limit enforced in backend & frontend.
- Dashboard recognizes subscription gating (if toggled later).

---

## 8. Suggested PR Breakdown
| PR | Contents |
|----|----------|
| PR A | Branding sweep + footer standardization + remove composer + make stats a CTA |
| PR B | Tag system refactor (UI + basic client validation) |
| PR C | Dark mode persistence fix (layout/theming adjustments) |
| PR D | Admin upsert script + /users/me (or /me/profile) endpoint + onboarding save wiring |
| PR E | Subscription pricing page + stats gating (Emerald) |
| PR F | Backend tag/server validation + tests |

---

## 9. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Dark mode flicker persists | Separate override from global theme; add regression test |
| Tag taxonomy too large/clutter | Start with 20–30 curated tags and expand later |
| Onboarding API introduces security gap | Enforce allowlist + auth + server validation; no open registration unless flag enabled |
| Branding search misses hidden reference | Add automated brand audit script for CI |
| Subscription feature confusion without payment backend | Mark pages clearly “Placeholder – purchase flow coming” and feature flag |
| Upsert script accidental duplicate users | Add `--dry-run` mode + explicit console summary before writing |

---

## 10. Testing Strategy
1. Unit: 
   - Tag selector (max enforcement).
   - Theme persistence (mock localStorage + context).
   - Profile save: optimistic update rollback on failure.
2. Integration:
   - Login → onboarding → save profile → redirect.
   - Dark mode stays after routing away and back.
   - Stats CTA navigates correctly.
3. E2E (Playwright):
   - Create page form submission with valid & invalid tag counts.
   - Light/dark toggle retention.
4. Security:
   - Health endpoint still no secret leakage.
   - /users/me rejects when email not allowed in strict mode.

---

## 11. Environment / Flags to Confirm
| Variable | Purpose |
|----------|---------|
| ALLOWED_USER_EMAILS | Owner-only list (add friend’s email here) |
| STRICT_ALLOWLIST (optional) | Force gating of non-allowlisted accounts |
| ENABLE_REGISTRATION | Temporary toggle for self-service signup (use carefully) |
| VITE_ENABLE_SUBSCRIPTIONS | Feature flag for subscription UI |
| VITE_API_BASE | Points to API for new PATCH endpoint |
| JWT_SECRET | Must be secure (rotate if still default) |

---

## 12. Data Model (MVP Snapshot)
```
User {
  id, email, passwordHash, username, displayName,
  onboardingComplete (bool), theme (optional)
}

Profile {
  id, userId(FK), headline, bio, roles[], tags[],
  avatar, banner, createdAt, updatedAt
}
```
(If roles/tags currently live directly on user, unify under profile or leave as is; consistency > perfection.)

---

## 13. Rollout Order (Recommended)
1. Branding + UI clean-up (low risk).
2. Dark mode fix (reduces user confusion early).
3. Tag limit + taxonomy (before new content creation).
4. Remove dashboard composer + create page redesign (aligns with taxonomy).
5. Account persistence (upsert + profile save endpoint).
6. Subscription CTA (non-blocking, marketing value).
7. Hardening: backend tag validation, tests, brand audit script.

---

## 14. Developer Checklist (Copy/Paste)
- [ ] Search & replace residual “Project Valine”
- [ ] Footer style normalization
- [ ] Remove Dashboard PostComposer
- [ ] Stats → subscription CTA
- [ ] Implement TagSelector (max 5, curated list)
- [ ] Adjust /create page fields & labels
- [ ] Theme override refactor (remove forced global light)
- [ ] Admin upsert script added & tested
- [ ] /users/me (or /api/me/profile) PATCH endpoint
- [ ] Onboarding form wired to PATCH
- [ ] Add onboardingComplete flag
- [ ] Add feature flag for subscriptions
- [ ] Basic Pricing page stub
- [ ] Backend validates tag list & count
- [ ] Unit & E2E tests updated
- [ ] CI brand audit (optional)
- [ ] Update docs & README sections

---

## 15. Future Enhancements (Post-MVP)
- Payment integration (Stripe or Paddle) for Emerald.
- Metrics service for real stats (connections, views).
- Tag analytics for trending computation (dynamic instead of hard-coded).
- Role-based access (admin analytics dashboard).
- Email verification flow (use existing token issuance + mail service).
- Rich media processing pipeline (reels transcoding).
- Post & comment full CRUD if not present.

---

## 16. Quick Reference – Prior Chat Decisions
| Topic | Decision |
|-------|----------|
| Friend Access | Add email to allowlist; choose upsert script or temporary registration |
| Registration Disabled | Use admin script to bypass onboarding loop |
| Profile Saving Missing | Implement profile PATCH endpoint |
| Posts Testing | Requires either existing endpoints or new schema if absent |

---

## 17. Success Metrics
- Branding uniformity (audit returns zero legacy strings).
- Dark mode stable (no override within 5 min navigation cycle).
- Tag misuse attempts (< 5% validation errors after release).
- Profile completion success rate (onboardingComplete true for >90% of new allowlisted users).
- Subscription CTA click‑through baseline (instrument simple event).

---

## 18. Final Notes
This plan isolates changes into safe, reviewable increments without disrupting existing authentication or secrets management. Proceed incrementally; avoid bundling the large account persistence change with visual refactors in a single PR to keep risk low.

Ready for implementation. Use this file to kick off the next chat or create issues/PRs.
