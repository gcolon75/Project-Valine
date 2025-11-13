# Manual Verification - Dev Bypass Feature

This directory contains manual verification tests for the Dev Bypass feature.

## Prerequisites

1. Ensure dev server is running with dev bypass enabled:

```bash
# In your .env.local file
VITE_ENABLE_DEV_BYPASS=true
VITE_FRONTEND_URL=http://localhost:3000

# Start the dev server
npm run dev
```

2. Install Playwright browsers if not already installed:

```bash
npx playwright install chromium
```

## Running Manual Verification

In a separate terminal (while dev server is running):

```bash
# Run the manual verification test
npx playwright test tests/manual/dev-bypass-verification.spec.ts --headed

# Or without browser window (headless)
npx playwright test tests/manual/dev-bypass-verification.spec.ts
```

## What to Verify

The test will automatically verify:

1. ✅ Dev Bypass button appears on login page
2. ✅ Button has correct styling (purple/pink gradient)
3. ✅ Clicking button redirects to dashboard
4. ✅ DEV SESSION banner appears on authenticated pages
5. ✅ User data contains DEV_BYPASS role
6. ✅ Session persists on page reload

Screenshots will be saved to `/tmp/`:
- `/tmp/dev-bypass-login.png` - Login page with Dev Bypass button
- `/tmp/dev-bypass-dashboard.png` - Dashboard with DEV SESSION banner

## Security Checks

### ✅ Localhost Only

Dev Bypass button should ONLY appear when:
- Hostname is `localhost` (not `127.0.0.1` or any domain)
- `VITE_ENABLE_DEV_BYPASS=true` is set

### ✅ Build Guard

Production builds should fail if dev bypass is enabled:

```bash
# This should FAIL
VITE_ENABLE_DEV_BYPASS=true \
VITE_FRONTEND_URL=https://d1abc.cloudfront.net \
npm run build

# Expected error:
# "Build failed: Dev bypass enabled for production domain!"
```

### ✅ Visual Warning

The DEV SESSION banner should be:
- Visible on all authenticated pages
- Purple/pink gradient background
- Contains text "DEV SESSION (NO REAL AUTH)"
- Contains "Localhost Only"

## Troubleshooting

**Dev Bypass button not showing:**
1. Verify `VITE_ENABLE_DEV_BYPASS=true` in `.env.local`
2. Ensure accessing via `http://localhost:3000` (not `http://127.0.0.1:3000`)
3. Restart dev server: `npm run dev`
4. Clear browser localStorage and reload

**Test fails:**
1. Make sure dev server is running on port 3000
2. Check console output for specific error
3. Verify Playwright is installed: `npx playwright --version`
