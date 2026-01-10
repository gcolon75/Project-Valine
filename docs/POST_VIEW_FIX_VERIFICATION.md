# Post View Button Fix - Verification Guide

**PR Branch:** `fix/post-view-routing`  
**Commits:** `41c1181`, `e8b9ac9`  
**Status:** ✅ Code complete, awaiting runtime verification

---

## What Was Fixed

**Problem:** Clicking "View" button on post cards resulted in:
- 404 error (route not found)
- Marketing/landing header rendered instead of dashboard header
- Wrong layout context

**Root Cause:** 
- `PostDetail.jsx` page component existed but was never wired to React Router
- No `/posts/:id` route definition in `src/routes/App.jsx`

**Fix:**
- Added `PostDetailPage` lazy import
- Added `/posts/:id` route under `<AppLayout />` with `<Protected>` wrapper
- Route now renders dashboard layout (not marketing)

---

## Files Changed

1. **`src/routes/App.jsx`** (9 lines added)
   - Line 34: Added `const PostDetailPage = lazy(() => import("../pages/PostDetail"));`
   - Lines 182-189: Added route definition:
     ```jsx
     <Route
       path="posts/:id"
       element={
         <Protected>
           <PostDetailPage />
         </Protected>
       }
     />
     ```

2. **`docs/REPO_AUDIT_TRUTH_DOC.md`** (new file, 1026 lines)
   - Documents fix in Section 10: "Root Cause: Post View Button 404 [FIXED]"
   - Includes before/after diff, verification steps, lessons learned

---

## Pre-Deployment Verification ✅

- [x] **Build succeeds:** `npm run build` completed without errors
- [x] **Code review passed:** No issues found
- [x] **Route configuration correct:** Under AppLayout, with Protected wrapper
- [x] **Navigation target matches:** PostCard navigates to `/posts/:id`
- [x] **Documentation complete:** Audit doc updated with fix details

---

## Runtime Verification Steps (Required Before Merge)

### 1. Deploy to Preview/Staging Environment

```bash
# Deploy to preview environment
npm run deploy:preview

# Or manually deploy to staging
./scripts/deploy-staging.sh
```

### 2. Manual Testing Checklist

**Prerequisites:**
- [ ] Deployed to preview/staging environment
- [ ] Have allowlisted test account credentials
- [ ] At least one post exists in the database

**Test Steps:**

1. **Login**
   - [ ] Navigate to `/login`
   - [ ] Login with allowlisted test account
   - [ ] Verify redirect to `/dashboard`

2. **Navigate to Dashboard**
   - [ ] Verify dashboard header renders (not marketing header)
   - [ ] Verify posts are visible in feed
   - [ ] Identify a post card with "View" button

3. **Click View Button**
   - [ ] Click "View" button on any post card
   - [ ] **EXPECTED:** Navigate to `/posts/{postId}` (URL changes)
   - [ ] **EXPECTED:** Post detail page renders
   - [ ] **EXPECTED:** Dashboard header remains visible (not marketing header)
   - [ ] **EXPECTED:** No 404 error or blank page

4. **Verify Post Detail Page Contents**
   - [ ] Author info displays (avatar, username)
   - [ ] Post content displays
   - [ ] Tags display (if any)
   - [ ] Action buttons display (Like, Comment, Save, Share)
   - [ ] "Back to Feed" link works
   - [ ] Access control UI displays correctly (if post is gated)

5. **Direct URL Navigation**
   - [ ] Copy post detail URL (e.g., `/posts/abc-123`)
   - [ ] Open new browser tab, paste URL
   - [ ] **EXPECTED:** Post detail page loads (not 404)
   - [ ] **EXPECTED:** Dashboard header renders
   - [ ] If logged out: redirected to `/login`, then back to post after login

6. **Different Post Types**
   - [ ] Test with public post
   - [ ] Test with followers-only post
   - [ ] Test with gated post (requires access request)
   - [ ] Test with paid post (if any exist)

7. **Error Handling**
   - [ ] Navigate to `/posts/invalid-id-does-not-exist`
   - [ ] **EXPECTED:** Error message displays (not crash)
   - [ ] **EXPECTED:** Dashboard header still visible

### 3. Browser Testing

Test in multiple browsers to ensure compatibility:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if on macOS)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 4. Performance Check

- [ ] Post detail page loads in < 2 seconds
- [ ] No console errors in browser DevTools
- [ ] No unnecessary API calls (check Network tab)

---

## Rollback Plan (If Issues Found)

### Quick Rollback (Revert Route Only)

If post detail page has runtime issues, can temporarily disable route:

1. **Comment out the route:**
   ```jsx
   // TEMP FIX: Disable post detail route until runtime issue resolved
   {/* <Route path="posts/:id" element={<Protected><PostDetailPage /></Protected>} /> */}
   ```

2. **Redeploy:**
   ```bash
   npm run build && npm run deploy
   ```

3. **Result:** View button will 404 again, but no crashes

### Full Rollback (Revert Entire PR)

```bash
git revert e8b9ac9 41c1181
git push origin copilot/create-truth-doc-audit
```

---

## Success Criteria

✅ **Merge when ALL of these are true:**
1. Post detail page loads without 404
2. Dashboard header renders (not marketing header)
3. Direct URL navigation works
4. No console errors
5. Post detail page is functional (content displays, actions work)
6. Works across browsers (Chrome, Firefox, Safari)
7. Works on mobile devices

---

## Known Limitations / Future Improvements

1. **No E2E Test Coverage:** Should add Playwright test for "click View → verify post detail loads"
   - See `docs/REPO_AUDIT_TRUTH_DOC.md` Section 10 for suggested test code

2. **Deep Link Handling (CloudFront/S3):** If using S3 static hosting, ensure error document is configured:
   - S3 Bucket → Properties → Static website hosting → Error document: `index.html`
   - CloudFront → Error pages → Create custom error response (404 → /index.html, 200)

3. **Loading State:** PostDetail shows "Loading..." during fetch - consider skeleton UI

4. **Error State:** Generic error message - could be more specific (404 vs network error)

---

## Questions / Issues?

- **Runtime errors?** Check CloudWatch logs for Lambda errors
- **404 still happening?** Verify route is under `<AppLayout />` not `<MarketingLayout />`
- **Wrong header?** Verify `<Outlet />` is rendering in AppLayout
- **Redirect loop?** Check Protected component auth logic

**Contact:** Tag @gcolon75 or engineering team lead

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-10  
**Author:** Copilot Agent (Repository Audit Task)
