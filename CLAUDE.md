# Project Valine — Claude Notes

Public site: **joint-networking.com** · API: **api.joint-networking.com**

## What is this project?

**Joint** (codename "Project Valine") is a collaborative social platform for **voice actors, writers, and artists** to find each other, share creative work, and book projects. Think LinkedIn meets a creative-work portfolio — but specifically for the audio drama / scripted media / VO world.

**Two audience sides:**
- **Artists** (voice actors, writers, illustrators, etc.) — build a profile, post work samples, audition for scripts
- **Seekers** (project owners, writers, directors) — browse talent, post scripts, request collaborators

**Core features:**
- **Posts** — public/followers-only posts with attached media (audio, PDF scripts, video links). Posts can be free or **paid** ($X for access).
- **Comments** — threaded comments + likes on posts.
- **Profiles** — display name, vanity URL (`/profile/:username`), bio, headline, banner, links, education, credits (experience), gallery.
- **Connections** — follow/unfollow, block, connection requests, follower/following lists.
- **DMs / Messaging** — 1:1 and group threads (`/inbox`, `/inbox/:id`).
- **Auditions / Scripts / Reels** — the original feature triad; scripts have feedback-request flows with annotations.
- **Peer Feedback** (free) — owner of a post can request structured feedback from another user, with PDF annotations. This is the "ask a friend" model.
- **Script Feedback Service** (paid, marketplace — PDF Part 2) — writer pays $0.50/page, reader earns $0.25/page, Joint keeps $0.25/page. Admin approval gate, 24h reader deadline, lives at `/feedback-request`.
- **Notifications** — likes, comments, follows, purchases, etc.
- **Pricing / Emerald subscription** — `$9.99/month` recurring via Stripe Checkout. Subscribers get an Emerald gem badge next to their name everywhere AND get 1 FREE script-feedback eval per calendar month. The plan field on `User` is `'free'` or `'emerald'`.
- **SMS notifications** — Twilio A2P 10DLC. Onboarding has an optional PhoneVerification step with required consent checkbox (compliance with carrier review).
- **Search** — `/search` (profiles), `/search/users`.

**Key user-facing routes** (frontend):
- `/` — public landing (artists & seekers marketing site)
- `/join`, `/signup`, `/login`, `/onboarding`, `/forgot-password`, `/reset-password`
- `/dashboard` — logged-in home (feed + sidebar)
- `/feed`, `/discover` — content streams
- `/post` (composer), `/posts/:id` (detail)
- `/profile/:id?` — own or another user's profile (`id` accepts username or user ID)
- `/inbox`, `/inbox/:id`
- `/pricing`, `/subscribe`
- `/feedback-request` — Script Feedback Service hub (paid marketplace; PDF Part 2)
- `/feedback-request/new` — writer submits a script
- `/feedback-request/:id` — request detail (writer + reader + admin views)
- `/feedback-request/admin` — admin queue for pending submissions
- `/feedback-request/admin/readers` — admin: manage reader pool
- `/sms-opt-in-evidence` — public mockup of SMS consent (for Twilio A2P review)
- `/settings`, `/notifications`, `/bookmarks`, `/requests`

**Codename note:** the public brand is **"Joint"** (joint-networking.com). The repo / codename is **"Project Valine"**. Some older code references `joint-client` (package name), `pv-api` (Serverless service name). They all refer to the same product.

## Stack
- **Frontend:** React 18 + Vite + Tailwind + React Router. Lives in `src/`. Served via CloudFront.
- **Backend:** Serverless Framework v3 → AWS Lambda (Node 20). Lives in `serverless/`. HTTP API Gateway in front.
- **DB:** PostgreSQL via Prisma. Schema at `serverless/prisma/schema.prisma`. Migrations in `serverless/prisma/migrations/`.
- **Auth:** JWT in HttpOnly cookies (access + refresh). Tokens decoded with `getUserIdFromEvent` from `serverless/src/utils/tokenManager.js`.
- **Payments:** Stripe subscriptions (Emerald tier, $9/mo). Webhook at `/stripe/webhook`.

## Lambda layout — IMPORTANT
There is a **hard CloudFormation 500-resource-per-stack limit**. Adding new functions has bitten us TWICE. Most endpoints are consolidated into router Lambdas (one function dispatches many routes by path):
- `authRouter` → `/auth/*`
- `postsRouter` → `/posts/*`, `/comments/*`
- `profilesRouter` → `/profiles/*`, `/me/profile/*`
- `socialMessaging` → `/profiles/*/follow|block`, `/me/messages/threads/*`
- `notificationsRouter` → `/notifications/*`, `/unread-counts`
- `billingRouter` → `/billing/*`, `/stripe/webhook`
- `feedbackRequestsRouter` → peer feedback (`/posts/:id/feedback-request`, `/feedback-requests/*`, `/annotations/:id`, `/posts/:id/feedback-status`)
- `scriptFeedbackRouter` → paid script feedback (`/script-feedback`, `/script-feedback/:id`, `/script-feedback/:id/{approve,deny,accept,submit-notes}`, `/script-feedback/admin/*`, `/script-feedback/annotations/:id`)

**When adding new endpoints, ADD ROUTES TO AN EXISTING ROUTER, not new Lambda functions.** Router pattern reference: `src/handlers/billingRouter.js` (small, clean) or `src/handlers/scriptFeedbackRouter.js` (more complex with admin/action routes).

**Route order matters in routers.** Match more specific routes BEFORE generic ones. Example: `/script-feedback/admin/readers` must match before `/script-feedback/:id` or "admin" gets parsed as an ID.

## Prisma Lambda Layer
The Prisma client + native engine is ~93 MB and goes into a separate Lambda Layer (Lambda function bundles can't exceed 250 MB). The layer is built before deploy:
- Windows: `serverless/scripts/build-prisma-layer.ps1`
- Linux/Mac (CI): `serverless/scripts/build-prisma-layer.sh`

`@prisma/client` and `.prisma/*` are marked `external` AND `exclude` in `serverless.yml` so esbuild won't bundle them into function zips.

## Deploy

Pushes to `main` trigger:
- `.github/workflows/backend-deploy.yml` — applies Prisma schema via `prisma db push --accept-data-loss`, builds layer, runs `serverless deploy`
- `.github/workflows/frontend-deploy.yml` — builds Vite, uploads to S3, invalidates CloudFront

**Backend deploy env vars** must be wired in both:
1. GitHub repo secret (Settings → Secrets and variables → Actions)
2. The `env:` block in `backend-deploy.yml` (passed to the `serverless deploy` step)
3. `serverless.yml` `provider.environment` block

If a Stripe-related endpoint returns **503**, it's almost certainly a missing env var on Lambda (not a real outage). Check the three places above.

## Stripe / Subscriptions

Configured in **Test Mode**. Required env vars:
- `STRIPE_SECRET_KEY` (`sk_test_...` or `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...`)
- `STRIPE_EMERALD_PRICE_ID` (`price_...`, recurring monthly — $9.99)
- `FRONTEND_URL` — read from `FRONTEND_BASE_URL` GitHub secret. **Must include `https://`** or Stripe rejects the URL. There's a `normalizeFrontendUrl` helper in `payments.js` that prepends `https://` defensively.

Webhook events handled (see `payments.js`):
- `checkout.session.completed` — dispatches by `metadata.kind`:
  - `mode === 'subscription'` → set `user.plan='emerald'`
  - `metadata.kind === 'script_feedback'` → flip request to `pending_approval` (via dynamic import of `scriptFeedback.handleScriptFeedbackPaymentCompleted`)
  - otherwise → one-time post purchase (legacy)
- `customer.subscription.updated` / `.deleted` → keep `plan` and `subscriptionStatus` synced
- `invoice.payment_failed` → mark `past_due`
- `checkout.session.expired` → clean up pending one-time purchases

Test card: `4242 4242 4242 4242`, any future expiry/CVC/ZIP.

**Script feedback uses dynamic pricing** via `price_data` inline (NO pre-created Stripe Price needed). Amount = pages × $0.50 calculated server-side.

## Emerald badge

`src/components/EmeraldBadge.jsx` renders a green gem when `user.plan === 'emerald'`. Rendered next to display name in: PostCard, PostDetail, CommentList (and nested replies via recursion), Messages (thread list + open conversation header), Profile header, Dashboard sidebar + feed posts.

Backend must include `plan: true` in any Prisma `select` for author/user/sender. `/auth/me` and `/me/profile` build their response objects manually and need `plan` added explicitly. `GET /users/:username` does an unconstrained `findUnique` so it already includes `plan`.

The Dashboard transforms feed posts before passing to `PostCard` and must include `plan` in the transform.

## Script Feedback Service (PDF Part 2)

Paid marketplace. Pricing: writer pays $0.50/page → reader earns $0.25/page → Joint keeps $0.25/page. 24h reader deadline once accepted.

**Status lifecycle:**
`pending_payment` → `pending_approval` → `approved` → `accepted` → `completed` (or `denied`/`refunded` from `pending_approval`)

**Reader pool:**
- Users gain reader status via `User.isReader=true` (admin-toggle only; managed at `/feedback-request/admin/readers`)
- Approved readers see the "Earn Money" tab on `/feedback-request` with available scripts in FIFO order
- First reader to click Accept wins (transaction-safe in handler)
- Reader earnings accumulate on `User.pendingPayoutCents`; paid out manually via Venmo/Zelle (no Stripe Connect)

**Admin gate:**
- After payment, request sits in `pending_approval` queue at `/feedback-request/admin`
- Admin clicks Approve → enters reader pool, OR Deny → auto-refunds via Stripe (paid only; free Emerald evals just mark denied)
- Admin role: `User.role === 'admin'` (set via `serverless/src/scripts/seedAdminAndAllowlist.js`)

**Hybrid annotation model** (per design decision):
- `FeedbackAnnotation` model is shared between peer feedback AND paid script feedback. The FK `feedbackRequestId` is now nullable; new field `scriptFeedbackRequestId` distinguishes the two.
- Reader can use inline highlights/page-comments PLUS a summary `summaryNotes` field (markdown, 1-4 pages).
- Frontend MVP only renders summary notes editor; rich PDF annotation viewer (in `FeedbackView.jsx`) is not yet wired into the paid flow.

**Emerald free eval perk:**
- Emerald subscribers get 1 free script eval per calendar month
- Tracked via `User.monthlyFreeEvalUsedAt`
- `freeEvalEligible` boolean exposed on `/auth/me`
- Free path skips Stripe entirely, transaction-safely stamps `monthlyFreeEvalUsedAt`, goes straight to `pending_approval`
- Joint absorbs the reader cost ($0.25/page) — bounded by subscription value

## SMS / Twilio A2P

Onboarding has a **PhoneVerification step** (step 5 of 5, skippable). It contains a **required consent checkbox** with the exact verbatim disclosure language Twilio's campaign reviewers verify against:

> "By submitting your phone number, you agree to receive SMS messages from Joint Networking, including one-time verification codes and activity notifications (likes, comments, follows, direct messages). Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help."

Public visual reference page at `/sms-opt-in-evidence` — submitted with the A2P campaign. **All three places (the checkbox in `PhoneVerification.jsx`, `SmsOptInEvidence.jsx`, the Twilio campaign description) must use IDENTICAL wording** — reviewers cross-check.

Activity SMS sending (likes/comments/follows/DMs) is **not implemented yet**. Only phone verification SMS actually sends. The 5 sample messages in the Twilio submission are aspirational for when activity SMS is built.

## Conventions
- Backend handler responses use `json()` / `error()` helpers from `serverless/src/utils/headers.js`.
- Path normalization in routers: stage prefix (`/prod/...`) is stripped via `normalizePath`. See `postsRouter.js`.
- esbuild output is **CommonJS** (Lambda handler resolution). `import.meta` doesn't work — `cleanupOrphanedMedia.js` has a known warning that's harmless.
- `versionFunctions: false` — no Lambda Version resources, saves CFN budget.
- `httpApi` cors origins are pinned in `serverless.yml`. Add new origins there if hosting elsewhere.

## Useful commands

```powershell
# Frontend
npm run dev               # vite dev server (localhost:5173)
npm run build             # prebuild + vite build
npm test                  # vitest

# Backend
cd serverless
npm run prisma:generate
npm run deploy            # prisma:generate + serverless deploy

# Stripe local webhook testing
stripe listen --forward-to http://localhost:3000/stripe/webhook
```

## Known gotchas
- **CFN 500-resource limit** — see Lambda layout above. Consolidate, don't add functions.
- **Route order in routers matters** — match specific routes before generic `/:id` routes (e.g. `/script-feedback/admin/readers` before `/script-feedback/:id`).
- **Stripe `success_url` must have `https://` prefix** — `normalizeFrontendUrl` in `payments.js` and `scriptFeedback.js` handles this defensively. Default fallback in `serverless.yml` is now `https://joint-networking.com` (was `cloudfront.net`).
- **AuthContext caches user on login** — after flipping flags like `isReader`, `role`, or `plan`, the affected user needs to log out + log back in (or hard refresh — `AuthContext` re-calls `/auth/me` on every mount). When users complain they don't see admin/reader tools after being promoted, this is almost always why.
- **`prisma db push` runs in CI** with `--accept-data-loss` — don't rely on `prisma migrate deploy` semantics. Migration SQL files exist for documentation but `db push` syncs straight from `schema.prisma`.
- **CORS** — when adding a new domain, update `provider.httpApi.cors.allowedOrigins` in `serverless.yml`.
- **Banner display ratio** — Profile.jsx banner uses `aspect-[4/1]` (matches the ImageCropper aspect=4 setting in ProfileEdit). Don't use fixed `h-XX` classes there or the crop won't match.
- **Webhook re-deliveries** — Stripe Dashboard → Event destinations → joint-prod → click any event → **Resend**. Useful if a webhook fired before the backend handler existed (e.g., subscription that flipped plan='free' to 'emerald' AFTER initial purchase).
- **Test mode vs Live mode in Stripe are completely separate** — products, prices, webhooks, customers. Going live = swap 3 env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_EMERALD_PRICE_ID`) to the `sk_live_...` / live-mode equivalents and redeploy.

## Admin & reader roles
- **Admin role**: `User.role === 'admin'`. Set via `serverless/src/scripts/seedAdminAndAllowlist.js` (run manually with `DATABASE_URL`) or raw SQL. Currently configured for `brenny.sullivan@gmail.com` and `admin@joint-networking.com`.
- **Reader flag**: `User.isReader === true`. Set via admin UI at `/feedback-request/admin/readers` — search + toggle. No public application flow yet (PDF describes manual recruitment of 15-25 readers).
- Both flags are independent. Admin doesn't imply reader and vice versa.
