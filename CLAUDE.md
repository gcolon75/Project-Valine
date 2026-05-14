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
- **Feedback requests** — owner of a post can request structured feedback from another user, with PDF annotations.
- **Notifications** — likes, comments, follows, purchases, etc.
- **Pricing / Emerald subscription** — `$9/month` recurring via Stripe Checkout. Subscribers get an Emerald gem badge next to their name everywhere (PostCard, comments, DMs, profile). The plan field on `User` is `'free'` or `'emerald'`.
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
- `/settings`, `/notifications`, `/bookmarks`, `/requests`

**Codename note:** the public brand is **"Joint"** (joint-networking.com). The repo / codename is **"Project Valine"**. Some older code references `joint-client` (package name), `pv-api` (Serverless service name). They all refer to the same product.

## Stack
- **Frontend:** React 18 + Vite + Tailwind + React Router. Lives in `src/`. Served via CloudFront.
- **Backend:** Serverless Framework v3 → AWS Lambda (Node 20). Lives in `serverless/`. HTTP API Gateway in front.
- **DB:** PostgreSQL via Prisma. Schema at `serverless/prisma/schema.prisma`. Migrations in `serverless/prisma/migrations/`.
- **Auth:** JWT in HttpOnly cookies (access + refresh). Tokens decoded with `getUserIdFromEvent` from `serverless/src/utils/tokenManager.js`.
- **Payments:** Stripe subscriptions (Emerald tier, $9/mo). Webhook at `/stripe/webhook`.

## Lambda layout — IMPORTANT
There is a **hard CloudFormation 500-resource-per-stack limit**. Adding new functions has bitten us. Most endpoints are consolidated into router Lambdas (one function dispatches many routes by path):
- `authRouter` → `/auth/*`
- `postsRouter` → `/posts/*`, `/comments/*`
- `profilesRouter` → `/profiles/*`, `/me/profile/*`
- `socialMessaging` → `/profiles/*/follow|block`, `/me/messages/threads/*`
- `notificationsRouter` → `/notifications/*`, `/unread-counts`
- `billingRouter` → `/billing/*`, `/stripe/webhook`

**When adding new endpoints, ADD ROUTES TO AN EXISTING ROUTER, not new Lambda functions.** The router pattern is in `src/handlers/billingRouter.js` (small, clean reference).

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
- `STRIPE_EMERALD_PRICE_ID` (`price_...`, recurring monthly)
- `FRONTEND_URL` — read from `FRONTEND_BASE_URL` GitHub secret. **Must include `https://`** or Stripe rejects the URL. There's a `normalizeFrontendUrl` helper in `payments.js` that prepends `https://` defensively.

Webhook events handled (see `payments.js`):
- `checkout.session.completed` (mode=subscription) → set `user.plan='emerald'`
- `customer.subscription.updated` / `.deleted` → keep `plan` and `subscriptionStatus` synced
- `invoice.payment_failed` → mark `past_due`
- `checkout.session.expired` → clean up pending one-time purchases

Test card: `4242 4242 4242 4242`, any future expiry/CVC/ZIP.

## Emerald badge

`src/components/EmeraldBadge.jsx` renders a green gem when `user.plan === 'emerald'`. Rendered next to display name in: PostCard, PostDetail, CommentList (and nested replies via recursion), Messages (thread list + open conversation header), Profile header, Dashboard sidebar + feed posts.

Backend must include `plan: true` in any Prisma `select` for author/user/sender. `/auth/me` and `/me/profile` build their response objects manually and need `plan` added explicitly. `GET /users/:username` does an unconstrained `findUnique` so it already includes `plan`.

The Dashboard transforms feed posts before passing to `PostCard` and must include `plan` in the transform.

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
- **Stripe `success_url` must have `https://` prefix** — normalize defensively.
- **AuthContext caches user on login** — after backend changes that affect the `/auth/me` shape, users may need to log out + log back in (or hard refresh — `AuthContext` re-calls `/auth/me` on every mount).
- **`prisma db push` runs in CI** with `--accept-data-loss` — don't rely on `prisma migrate deploy` semantics. Migration SQL files exist for documentation but `db push` syncs straight from `schema.prisma`.
- **CORS** — when adding a new domain, update `provider.httpApi.cors.allowedOrigins` in `serverless.yml`.
