# Development Bypass Mode

## Quick Start

1. Copy environment file:
   ```bash
   cp client/.env.local.example client/.env.local
   ```

2. Ensure `VITE_DEV_BYPASS_AUTH=true` or `VITE_ENABLE_DEV_BYPASS=true` is set

3. Start dev server:
   ```bash
   npm run dev
   ```

4. You'll be auto-logged in as "Dev User" (or click "Dev Bypass" on login page)

## Features

- ✅ Skip login/registration
- ✅ Access all protected routes
- ✅ Mock user profile
- ✅ No backend required (for UI work)
- ✅ Visual indicator (yellow badge)
- ✅ Purple warning banner when active

## How It Works

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_DEV_BYPASS_AUTH=true` | Enables dev bypass (new) |
| `VITE_ENABLE_DEV_BYPASS=true` | Enables dev bypass (legacy) |
| `VITE_ENABLE_AUTH=false` | Disables auth enforcement |

### Security Gates

Dev bypass mode has **triple-gate security**:

1. **Environment Check**: Only works when `VITE_DEV_BYPASS_AUTH=true` OR `VITE_ENABLE_DEV_BYPASS=true`
2. **Development Mode**: Only works when `import.meta.env.DEV` is true
3. **Hostname Check**: Only works on `localhost`

### Components

| File | Purpose |
|------|---------|
| `src/lib/devBypass.js` | Core bypass logic and mock user |
| `src/components/DevModeIndicator.jsx` | Visual indicator component |
| `src/context/AuthContext.jsx` | Auth provider with bypass integration |
| `src/layouts/AppLayout.jsx` | Shows bypass warning banner |

## Mock User Object

When dev bypass is active, you're logged in as:

```javascript
{
  id: 'dev-user-mock-id',
  email: 'dev@local.dev',
  username: 'devuser',
  displayName: 'Dev User (Bypass Mode)',
  onboardingComplete: true,
  status: 'active',
  role: 'artist',
  roles: ['DEV_BYPASS'],
  avatar: 'https://i.pravatar.cc/150?img=68'
}
```

## Visual Indicators

### Dev Mode Indicator Badge

When active, a **yellow badge** appears in the bottom-right corner:

```
┌──────────────────────────────┐
│ ⚠️ DEV BYPASS MODE          │
└──────────────────────────────┘
```

### App Layout Banner

A **purple gradient banner** appears at the top of the app:

```
┌────────────────────────────────────────────────────┐
│ ⚠ DEV SESSION (NO REAL AUTH) - Localhost Only    │
└────────────────────────────────────────────────────┘
```

## Security

### ⚠️ IMPORTANT SECURITY NOTES

- **ONLY WORKS IN `NODE_ENV=development`**
- **DISABLED IN PRODUCTION BUILDS**
- **NEVER COMMIT `.env.local` TO GIT**
- **ONLY WORKS ON `localhost`**

### Production Build Safeguard

The prebuild script (`scripts/prebuild.js`) validates that dev bypass is disabled for production:

```bash
npm run build
# If VITE_DEV_BYPASS_AUTH=true with production FRONTEND_URL:
# Error: VITE_DEV_BYPASS_AUTH must not be set for production builds
```

### Git Ignore

These files are already in `.gitignore`:

```
.env
.env.local
.env.*.local
```

## Troubleshooting

### Dev bypass not working?

1. **Check environment file:**
   ```bash
   cat .env.local | grep DEV_BYPASS
   # Should show: VITE_DEV_BYPASS_AUTH=true or VITE_ENABLE_DEV_BYPASS=true
   ```

2. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Clear browser cache:**
   - Open DevTools → Application → Clear storage
   - Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

4. **Check console:**
   - Look for: `[devBypass] Dev session activated`
   - Or: `[AuthContext] Auth enforcement disabled, using dev mode`

### Bypass button not appearing on login page?

The button only appears when ALL conditions are met:
- `VITE_ENABLE_DEV_BYPASS=true` in environment
- Running on `localhost`
- Development mode (`npm run dev`, not `npm run build`)

### Mock data not loading?

If MSW (Mock Service Worker) is not active:
1. Check `VITE_USE_MSW=true` in `.env.local`
2. Or ensure backend is running at `VITE_API_BASE`

## Development Workflow

### UI/UX Work (No Backend)

```bash
# 1. Copy dev environment
cp client/.env.local.example client/.env.local

# 2. Start frontend only
npm run dev

# 3. Access app at http://localhost:5173
# Auto-logged in as Dev User
```

### Full Stack Development

```bash
# 1. Start backend (separate terminal)
cd serverless
npm run dev

# 2. Update .env.local
VITE_API_BASE=http://localhost:3001
VITE_DEV_BYPASS_AUTH=false  # Use real auth
VITE_ENABLE_AUTH=true

# 3. Start frontend
npm run dev
```

## Related Documentation

- [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Full deployment guide
- [PRODUCTION_ACCOUNT_SETUP.md](./PRODUCTION_ACCOUNT_SETUP.md) - Creating real accounts
- [.env.example](./.env.example) - All environment variables
