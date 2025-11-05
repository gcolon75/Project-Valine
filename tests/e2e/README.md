# E2E Tests for Project Valine

## Overview

This directory contains end-to-end (e2e) tests for the Project Valine frontend application using Playwright.

## Test Files

### `profile-edit.spec.ts`

Comprehensive e2e test suite for authentication and profile editing functionality.

#### Test Coverage

1. **Authentication Flow**
   - ✅ Login page rendering
   - ✅ Dev login bypass (in development mode)
   - ✅ Regular login form submission
   - ✅ Token persistence in localStorage
   - ✅ Navigation after successful login

2. **Profile Edit Page**
   - ✅ Page navigation and rendering
   - ✅ Headline field (max 100 characters)
   - ✅ Professional title field (max 100 characters)
   - ✅ Profile links editor component

3. **Profile Links Management**
   - ✅ Add new links
   - ✅ Edit existing links
   - ✅ Remove links
   - ✅ Drag-and-drop reordering
   - ✅ Link types: website, imdb, showreel, other

4. **Client-Side Validation**
   - ✅ Label: 1-40 characters (enforced via maxLength)
   - ✅ URL: Must start with http:// or https://
   - ✅ URL: Maximum 2048 characters
   - ✅ Headline: Maximum 100 characters
   - ✅ Title: Maximum 100 characters
   - ✅ Real-time validation feedback

5. **Data Persistence**
   - ✅ Profile changes saved to backend
   - ✅ Optimistic UI updates
   - ✅ Data persists across page reloads
   - ✅ Auth token persists across sessions

6. **Logout Flow**
   - ✅ Logout button interaction
   - ✅ Token removal from localStorage
   - ✅ Redirect to public pages

## Running the Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Run Tests

```bash
# Run all e2e tests
npx playwright test

# Run specific test file
npx playwright test tests/e2e/profile-edit.spec.ts

# Run with custom base URL
PW_BASE_URL=http://localhost:3000 npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode (interactive)
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

## Test Structure

### Test 1: Complete Auth and Profile Edit Flow

```typescript
test('complete auth and profile edit flow', async ({ page }) => { ... })
```

**Steps:**
1. Navigate to login page
2. Perform login (dev mode or regular)
3. Verify token in localStorage
4. Navigate to profile edit page
5. Update headline and title
6. Add profile links with validation
7. Test client-side validation
8. Save profile changes
9. Verify data persistence
10. Test logout

**Expected Outcomes:**
- User can successfully log in
- Auth token is stored and persists
- Profile fields can be edited
- Links can be added with proper validation
- Data persists after save and reload
- Logout clears auth state

### Test 2: Validate Profile Link Constraints

```typescript
test('validate profile link constraints', async ({ page }) => { ... })
```

**Steps:**
1. Login via dev mode
2. Navigate to profile edit
3. Add a test link
4. Validate label length constraint (max 40)
5. Validate URL protocol requirement (http/https)
6. Validate URL length constraint (max 2048)
7. Verify link type options

**Expected Outcomes:**
- Label input enforces 40 character limit
- URL must have http:// or https:// protocol
- URL length is validated
- Only supported link types are available

## Validation Rules (Matching Backend)

### Headline
- Type: String
- Max Length: 100 characters
- Required: Yes
- Location: `formData.headline`

### Professional Title
- Type: String
- Max Length: 100 characters
- Required: No
- Location: `formData.title`

### Profile Links
- Max Links: 20 per profile (configurable)
- Each Link Object:
  - `label`: String, 1-40 characters, required
  - `url`: String, http/https only, max 2048 characters, required
  - `type`: Enum ['website', 'imdb', 'showreel', 'other'], required

### Client-Side Implementation

**URL Validation** (`src/utils/urlValidation.js`):
```javascript
validateProfileLink(link)
- Checks label: 1-40 chars
- Checks URL: http/https protocol
- Checks URL: max 2048 chars
- Returns: { valid: boolean, errors: object }
```

**ProfileLinksEditor Component** (`src/components/ProfileLinksEditor.jsx`):
- Real-time validation on field changes
- Visual error messages
- MaxLength attributes on inputs
- Drag-and-drop reordering support

## Backend API Endpoints

### Login
- **POST** `/auth/login`
- Body: `{ email: string, password: string }`
- Response: `{ user: object, token: string }`

### Get Profile
- **GET** `/profiles/:userId`
- Response: `{ profile: object }`

### Update Profile
- **PATCH** `/profiles/:userId`
- Body: `{ title?, headline?, links?: array }`
- Response: `{ profile: object }`

## Environment Variables

- `PW_BASE_URL`: Base URL for tests (default: http://localhost:3000)
- `VITE_ENABLE_AUTH`: Enable/disable auth enforcement
- `VITE_ENABLE_PROFILE_LINKS_API`: Enable/disable backend API integration

## Troubleshooting

### Browser Not Installed
```bash
npx playwright install chromium
```

### Dev Server Not Running
```bash
npm run dev
```

### Tests Timing Out
Increase timeout in `playwright.config.js`:
```javascript
timeout: 180000  // 3 minutes
```

### Dev Login Not Available
Set environment variable:
```bash
VITE_ENABLE_AUTH=false npm run dev
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Start dev server
  run: npm run dev &
  
- name: Wait for server
  run: npx wait-on http://localhost:3000

- name: Run Playwright tests
  run: npx playwright test
```

## Test Artifacts

Tests can generate artifacts:
- Screenshots: `artifacts/*.png`
- Videos: `test-results/*/*.webm`
- Traces: `test-results/*/*.zip`

Enable in `playwright.config.js`:
```javascript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry'
}
```

## Contributing

When adding new e2e tests:

1. Follow existing test structure
2. Use descriptive test names
3. Add clear console.log statements for debugging
4. Document expected behaviors
5. Match backend validation rules
6. Test both success and error cases
7. Clean up test data (if applicable)

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
