# Frontend Cleanup Plan
**Date:** 2025-11-24

This document outlines a plan for cleaning up the frontend codebase.

## Overview

The frontend codebase is generally well-organized but has some areas that could be improved:
- Potential duplicate components
- Possibly orphaned files
- Inconsistent file organization
- Test coverage gaps

## Phase 1: Verify Orphaned Files (Low Risk)

Before deleting anything, verify these files are actually unused:

### Pages to Verify

| File | Possible Status | Action |
|------|-----------------|--------|
| `Home.jsx` | Replaced by `Landing.jsx` | Verify and archive |
| `Feed.jsx` | Replaced by `Dashboard.jsx` | Verify and archive |
| `Messages.jsx` | Replaced by `Inbox.jsx` | Verify and archive |
| `Trending.jsx` | Not routed | Verify purpose |
| `Forbidden.jsx` | 403 page, not routed | Add route or archive |
| `AuthCallback.jsx` | OAuth callback | Verify if OAuth is used |

### Verification Steps

```powershell
# Check if file is imported anywhere
Select-String -r "Home.jsx\|'./Home'\|\"./Home\"" src/

# Check if component is used in routes
Select-String -r "HomePage\|Home " src/routes/

# Check git history for context
git log --oneline -- src/pages/Home.jsx
```

### Feature Pages to Verify

The following features may be planned but not yet integrated:

1. **Scripts Feature** (`src/pages/Scripts/`)
   - `Index.jsx`, `Show.jsx`, `New.jsx`
   - `PostScript.jsx`, `ScriptDetail.jsx`
   - Verify if this feature is active

2. **Auditions Feature** (`src/pages/Auditions/`)
   - `Auditions.jsx`, `AuditionDetail.jsx`, `NewAudition.jsx`
   - Verify if this feature is active

### Decision Matrix

| If Feature... | Then... |
|---------------|---------|
| Is active and used | Keep files |
| Is planned for future | Move to `src/pages/_planned/` |
| Is deprecated | Archive to `archive/pages/` |

## Phase 2: Consolidate Duplicates (Medium Risk)

### Card Component Duplication

**Issue:** Two Card components exist:
- `src/components/Card.jsx`
- `src/components/ui/Card.jsx`

**Analysis Steps:**
```powershell
# Find all imports of each Card
Select-String -r "from '.*Card'" src/ | Select-String -v "__tests__"
Select-String -r "from '.*ui/Card'" src/ | Select-String -v "__tests__"
```

**Resolution Options:**
1. If `ui/Card.jsx` has more features → Migrate to it
2. If they serve different purposes → Rename one
3. If identical → Delete one, update imports

**Recommended:**
Keep `src/components/ui/Card.jsx` as it follows the ui component pattern.

### Migration Script (if needed)

```powershell
# Update imports from Card to ui/Card
# ⚠️ CAUTION: Run these commands with care and verify results
# Recommended approach: Use IDE refactoring tools instead (VS Code: F2 rename symbol)

# Option 1: Preview changes first (recommended)
find src -name "*.jsx" -exec Select-String -l "from '\.\./Card'" {} \;
find src -name "*.jsx" -exec Select-String -l "from '\./Card'" {} \;

# Option 2: Manual sed (backup first!)
# find src -name "*.jsx" -exec sed -i "s|from '\.\./Card'|from '../ui/Card'|g" {} \;
# find src -name "*.jsx" -exec sed -i "s|from '\./Card'|from './ui/Card'|g" {} \;

# Option 3: Use jscodeshift (safest for complex migrations)
# npx jscodeshift -t path/to/transform.js src/
```

**⚠️ Important:** After any import changes:
1. Run `npm run build` to verify no broken imports
2. Test affected pages manually
3. Commit changes in small batches for easy rollback

## Phase 3: Organize Directory Structure (Low Risk)

### Current Structure
```
src/
├── components/
│   ├── landing/        # Landing page specific
│   ├── skeletons/      # Loading states
│   ├── ui/             # Reusable UI
│   ├── forms/          # Form components
│   └── *.jsx           # Mixed
├── pages/
│   ├── Onboarding/     # Onboarding flow
│   ├── Scripts/        # Scripts feature
│   ├── Auditions/      # Auditions feature
│   ├── legal/          # Legal pages
│   └── *.jsx           # Mixed
└── ...
```

### Proposed Structure
```
src/
├── components/
│   ├── layout/         # Header, Footer, NavBar
│   ├── landing/        # Landing page specific
│   ├── skeletons/      # Loading states
│   ├── ui/             # Reusable UI (Button, Card, etc.)
│   ├── forms/          # Form components
│   ├── shared/         # Shared feature components
│   └── features/       # Feature-specific (PostCard, etc.)
├── pages/
│   ├── app/            # Protected app pages
│   ├── auth/           # Auth pages (Login, etc.)
│   ├── marketing/      # Marketing pages
│   ├── legal/          # Legal pages
│   └── onboarding/     # Onboarding flow
└── ...
```

**Note:** This reorganization is optional and should be done carefully to avoid breaking imports.

## Phase 4: Fix Import Paths (Medium Risk)

### Issue: Inconsistent Path Usage

Some files use relative paths like `../../components/Button` while others might use aliases.

### Vite Alias Configuration

Check if path aliases are configured in `vite.config.js`:

```javascript
// vite.config.js
resolve: {
  alias: {
    '@': '/src',
  }
}
```

If configured, can migrate to:
```javascript
import { Button } from '@/components/ui/Button';
```

## Phase 5: Expand Test Coverage (Low Risk)

### Current Coverage

| Area | Coverage | Priority |
|------|----------|----------|
| Landing components | Good | ✅ |
| UI components | Partial | Medium |
| Contexts | Partial | High |
| Pages | Minimal | Medium |
| Services | Unknown | High |

### Test Priority

1. **High Priority:**
   - `AuthContext.jsx` - Critical for security
   - Auth service functions
   - Protected route behavior

2. **Medium Priority:**
   - Core UI components
   - Form validation
   - Error handling

3. **Low Priority:**
   - Skeleton components
   - Marketing pages

## Implementation Checklist

### Phase 1: Verify (1-2 hours)
- [ ] Run grep commands to check file usage
- [ ] Document findings for each questioned file
- [ ] Get owner approval before any deletions

### Phase 2: Consolidate (2-3 hours)
- [ ] Analyze Card component differences
- [ ] Create migration plan
- [ ] Update imports
- [ ] Test all pages using Card

### Phase 3: Organize (Optional, 4+ hours)
- [ ] Create new directories
- [ ] Move files in batches
- [ ] Update all imports
- [ ] Full regression test

### Phase 4: Fix Paths (2-3 hours)
- [ ] Configure vite aliases
- [ ] Update imports incrementally
- [ ] Test build after changes

### Phase 5: Tests (Ongoing)
- [ ] Add AuthContext tests
- [ ] Add service layer tests
- [ ] Add page integration tests

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|------------|------------|
| 1. Verify | Low | No deletions without approval |
| 2. Consolidate | Medium | Test all affected pages |
| 3. Organize | Medium | Do incrementally, test each batch |
| 4. Paths | Low | IDE refactoring tools |
| 5. Tests | None | Adding, not changing |

## Rollback Plan

If any phase causes issues:

1. **Git revert:**
   ```powershell
   git revert HEAD
   ```

2. **Restore from backup:**
   Each phase should be a separate commit for easy rollback.

3. **Feature flags:**
   For larger changes, use feature flags to disable problematic code.

## Related Documentation

- [FRONTEND_AUDIT_REPORT.md](./FRONTEND_AUDIT_REPORT.md)
- [FRONTEND_FILE_INVENTORY.md](./FRONTEND_FILE_INVENTORY.md)
