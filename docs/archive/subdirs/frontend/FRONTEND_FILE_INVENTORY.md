# Frontend File Inventory
**Date:** 2025-11-24

This document inventories all frontend source files and identifies any issues.

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Pages | 58 | ✅ Reviewed |
| Components | 54 | ✅ Reviewed |
| Contexts | 5 | ✅ Active |
| Hooks | Multiple | ✅ Active |
| Services | Multiple | ✅ Active |
| Tests | 15+ | ⚠️ Partial |

## Pages (`src/pages/`)

### Marketing Pages
| File | Route | Status |
|------|-------|--------|
| `Landing.jsx` | `/` | ✅ Active |
| `About.jsx` | Redirect | ✅ Active |
| `Features.jsx` | Redirect | ✅ Active |
| `Join.jsx` | `/join`, `/signup` | ✅ Active |
| `Login.jsx` | `/login` | ✅ Active |
| `LoginPage.jsx` | `/login-page` | ⚠️ Skeleton test |
| `SignupPage.jsx` | `/signup-page` | ⚠️ Skeleton test |

### Auth Pages
| File | Route | Status |
|------|-------|--------|
| `VerifyEmail.jsx` | `/verify-email` | ✅ Active |
| `ForgotPassword.jsx` | `/forgot-password` | ✅ Active |
| `ResetPassword.jsx` | `/reset-password` | ✅ Active |
| `AuthCallback.jsx` | OAuth callback | ⚠️ May be unused |

### Onboarding Pages
| File | Route | Status |
|------|-------|--------|
| `Onboarding/index.jsx` | `/onboarding` | ✅ Active |
| `Onboarding/OnboardingLayout.jsx` | Layout | ✅ Active |
| `Onboarding/steps/Welcome.jsx` | Step 1 | ✅ Active |
| `Onboarding/steps/ProfileBasics.jsx` | Step 2 | ✅ Active |
| `Onboarding/steps/LinksSetup.jsx` | Step 3 | ✅ Active |
| `Onboarding/steps/PreferencesSetup.jsx` | Step 4 | ✅ Active |

### App Pages
| File | Route | Status |
|------|-------|--------|
| `Dashboard.jsx` | `/dashboard`, `/feed` | ✅ Active |
| `Discover.jsx` | `/discover`, `/search` | ✅ Active |
| `Reels.jsx` | `/reels` | ✅ Active |
| `Post.jsx` | `/post` | ✅ Active |
| `Inbox.jsx` | `/inbox` | ✅ Active |
| `Profile.jsx` | `/profile/:id?` | ✅ Active |
| `ProfileEdit.jsx` | `/profile-edit` | ✅ Active |
| `ProfileSetup.jsx` | `/setup` | ✅ Active |
| `Bookmarks.jsx` | `/bookmarks` | ✅ Active |
| `Requests.jsx` | `/requests` | ✅ Active |
| `Settings.jsx` | `/settings` | ✅ Active |
| `Notifications.jsx` | `/notifications` | ✅ Active |
| `Pricing.jsx` | `/pricing`, `/subscribe` | ✅ Active |
| `NotFound.jsx` | `*` | ✅ Active |
| `SkeletonTest.jsx` | `/skeleton-test` | ⚠️ Dev only |

### Legal Pages
| File | Route | Status |
|------|-------|--------|
| `legal/PrivacyPolicy.jsx` | `/legal/privacy` | ✅ Active |
| `legal/TermsOfService.jsx` | `/legal/terms` | ✅ Active |
| `legal/CookieDisclosure.jsx` | `/legal/cookies` | ✅ Active |

### Scripts Pages
| File | Route | Status |
|------|-------|--------|
| `Scripts/Index.jsx` | Scripts list | ⚠️ Verify usage |
| `Scripts/Show.jsx` | Script detail | ⚠️ Verify usage |
| `Scripts/New.jsx` | New script | ⚠️ Verify usage |
| `ScriptDetail.jsx` | Legacy? | ⚠️ Verify usage |
| `PostScript.jsx` | Legacy? | ⚠️ Verify usage |

### Auditions Pages
| File | Route | Status |
|------|-------|--------|
| `Auditions.jsx` | Auditions list | ⚠️ Verify usage |
| `AuditionDetail.jsx` | Audition detail | ⚠️ Verify usage |
| `Auditions/*.jsx` | Sub-pages | ⚠️ Verify usage |
| `NewAudition.jsx` | Create audition | ⚠️ Verify usage |

### Other Pages
| File | Route | Status |
|------|-------|--------|
| `Home.jsx` | Legacy? | ⚠️ Verify usage |
| `Feed.jsx` | Legacy? | ⚠️ Verify usage |
| `Messages.jsx` | Legacy? | ⚠️ Verify usage |
| `Trending.jsx` | Not routed? | ⚠️ Verify usage |
| `Forbidden.jsx` | 403 page? | ⚠️ Verify usage |

## Components (`src/components/`)

### Core UI Components
| File | Status | Notes |
|------|--------|-------|
| `ui/Button.jsx` | ✅ Active | Has tests |
| `ui/Card.jsx` | ✅ Active | Has tests |
| `ui/Alert.jsx` | ✅ Active | |

### Feature Components
| File | Status | Notes |
|------|--------|-------|
| `PostCard.jsx` | ✅ Active | |
| `PostComposer.jsx` | ✅ Active | |
| `AvatarUploader.jsx` | ✅ Active | |
| `ProfileLinksEditor.jsx` | ✅ Active | |
| `CommentList.jsx` | ✅ Active | |
| `ReelsCommentModal.jsx` | ✅ Active | |
| `MediaUploader.jsx` | ✅ Active | |
| `ImageCropper.jsx` | ✅ Active | |
| `LazyImage.jsx` | ✅ Active | |
| `SkillsTags.jsx` | ✅ Active | |
| `TagPill.jsx` | ✅ Active | |
| `Tabs.jsx` | ✅ Active | |

### Layout Components
| File | Status | Notes |
|------|--------|-------|
| `Header.jsx` | ✅ Active | |
| `NavBar.jsx` | ✅ Active | |
| `Footer.jsx` | ✅ Active | |
| `MarketingFooter.jsx` | ✅ Active | |

### Utility Components
| File | Status | Notes |
|------|--------|-------|
| `Modal.jsx` | ✅ Active | |
| `ConfirmationModal.jsx` | ✅ Active | |
| `EmptyState.jsx` | ✅ Active | |
| `ErrorBoundary.jsx` | ✅ Active | |
| `ThemeToggle.jsx` | ✅ Active | |
| `ToastProvider.jsx` | ✅ Active | |
| `DevModeIndicator.jsx` | ✅ Active | New |
| `RestrictedRegistrationNotice.jsx` | ✅ Active | |

### Landing Components
| File | Status | Notes |
|------|--------|-------|
| `landing/HeroSection.jsx` | ✅ Active | Has tests |
| `landing/FeatureGridSection.jsx` | ✅ Active | Has tests |
| `landing/FinalCTASection.jsx` | ✅ Active | Has tests |
| `landing/SocialProofSection.jsx` | ✅ Active | Has tests |
| `landing/FAQSection.jsx` | ✅ Active | Has tests |
| `landing/ProductVisualSection.jsx` | ✅ Active | |
| `landing/ValuePropsSection.jsx` | ✅ Active | Has tests |

### Skeleton Components
| File | Status | Notes |
|------|--------|-------|
| `skeletons/SkeletonText.jsx` | ✅ Active | |
| `skeletons/SkeletonProfile.jsx` | ✅ Active | |
| `skeletons/SkeletonCard.jsx` | ✅ Active | |

### Form Components
| File | Status | Notes |
|------|--------|-------|
| `forms/TagSelector.jsx` | ✅ Active | |

### Potential Duplicates
| File 1 | File 2 | Action |
|--------|--------|--------|
| `Card.jsx` | `ui/Card.jsx` | ⚠️ Review |

## Contexts (`src/context/`)

| File | Status | Purpose |
|------|--------|---------|
| `AuthContext.jsx` | ✅ Active | Authentication |
| `FeedContext.jsx` | ✅ Active | Feed state |
| `ThemeContext.jsx` | ✅ Active | Theme |
| `ToastContext.jsx` | ✅ Active | Notifications |
| `UnreadContext.jsx` | ✅ Active | Unread counts |

## Layouts (`src/layouts/`)

| File | Status | Purpose |
|------|--------|---------|
| `AppLayout.jsx` | ✅ Active | App shell |
| `MarketingLayout.jsx` | ✅ Active | Marketing pages |

## Routes (`src/routes/`)

| File | Status | Purpose |
|------|--------|---------|
| `App.jsx` | ✅ Active | Route definitions |

## Services (`src/services/`)

Review needed for service layer completeness.

## Potentially Orphaned Files

These files may not be imported anywhere and should be verified:

1. `Home.jsx` - May be replaced by `Landing.jsx`
2. `Feed.jsx` - May be replaced by `Dashboard.jsx`
3. `Messages.jsx` - May be replaced by `Inbox.jsx`
4. `AuthCallback.jsx` - OAuth callback, verify if used
5. `Trending.jsx` - Not in routes
6. `Forbidden.jsx` - 403 page, not in routes
7. `Scripts/*` - Script feature pages, verify usage
8. `Auditions/*` - Audition feature pages, verify usage

## Test Files

Test files are located in `__tests__/` subdirectories.

| Directory | Test Count | Status |
|-----------|------------|--------|
| `components/landing/__tests__/` | 6 | ✅ Good |
| `components/ui/__tests__/` | 2 | ✅ Good |
| `context/__tests__/` | 1 | ⚠️ Partial |
| `pages/__tests__/` | Limited | ❌ Needs work |
| `layouts/__tests__/` | Limited | ❌ Needs work |

## Related Documentation

- [FRONTEND_AUDIT_REPORT.md](./FRONTEND_AUDIT_REPORT.md)
- [FRONTEND_CLEANUP_PLAN.md](./FRONTEND_CLEANUP_PLAN.md)
