# Joint Platform - Complete UI/UX Remediation & Account Persistence
## Agent Implementation Specification

**Version:** 1.0  
**Date:** 2025-11-21  
**Owner:** @gcolon75  
**Dependencies:** PR #255 (Secrets Management) - Should be merged first

---

## Executive Summary

This specification defines a comprehensive 8-phase improvement plan for the Joint Platform (formerly "Project Valine"). Each phase is designed as an independent, reviewable unit that can be implemented sequentially with minimal risk.

**Total Estimated Effort:** 40-50 hours  
**Rollout Duration:** 5 weeks (recommended)  
**Breaking Changes:** None - Full backward compatibility maintained

---

## Phase 1: Branding & Visual Consistency
**Priority:** High | **Risk:** Low | **Effort:** 4-6 hours

### Objectives
- Eliminate all "Project Valine" legacy branding
- Standardize footer UI components
- Establish consistent design system patterns

### Tasks

#### 1.1 Brand Name Global Replacement
**Files to modify:**
- `src/pages/About.jsx` - Hero section, meta descriptions
- `src/pages/Features.jsx` - Feature descriptions
- `src/pages/Onboarding/Welcome.jsx` - Welcome screens
- `src/pages/404.jsx` - Error page branding
- `src/pages/Terms.jsx` - Legal document headers
- `src/config/metaConfig.js` - Site metadata
- `README.md` - Project title and descriptions
- `package.json` - Project name field

**Implementation:**
```bash
# Search pattern (case-insensitive)
grep -ri "project valine" src/ docs/ public/

# Replace with "Joint" maintaining sentence structure
# Example transformations:
# "Project Valine is a platform" → "Joint is a platform"
# "Welcome to Project Valine" → "Welcome to Joint"
# "Project Valine Dashboard" → "Joint Dashboard"
```

**Verification:**
```bash
# Post-implementation check
grep -ri "project valine" src/ docs/ public/ | wc -l
# Expected: 0 (except in archive/ or CHANGELOG.md historical entries)
```

#### 1.2 Footer Standardization
**File:** `src/components/MarketingLayout.jsx` (or wherever footer is defined)

**Current issues:**
- Inconsistent font weights (neutral-500, neutral-700 mixed)
- Hover states vary between sections
- Gradient text conflicts with brand guidelines

**New standards:**
```jsx
// Footer Section Headings
className="text-neutral-900 dark:text-neutral-100 font-semibold text-sm md:text-base"

// Footer Links (Default state)
className="text-neutral-700 dark:text-neutral-300 hover:text-[#0CCE6B] 
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0CCE6B] 
           transition-colors duration-200"

// Disabled/Placeholder Links
className="text-neutral-500 dark:text-neutral-600 cursor-default"
aria-disabled="true"

// Brand Text (no gradient)
className="text-neutral-900 dark:text-neutral-100"
```

**WCAG AA Compliance Check:**
```javascript
// Verify contrast ratios
const checks = [
  { fg: '#0CCE6B', bg: '#FFFFFF', min: 4.5 }, // Primary on white
  { fg: '#737373', bg: '#FFFFFF', min: 4.5 }, // Neutral-500 on white
  { fg: '#404040', bg: '#FFFFFF', min: 7.0 }, // Neutral-700 on white (AAA target)
];
// Use tool: https://webaim.org/resources/contrastchecker/
```

#### 1.3 Optional: Brand Audit Script
**File:** `scripts/brand-audit.mjs`

```javascript
#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const BLOCKED_PHRASES = [
  /project\s+valine/i,
  /valine\s+project/i,
];

const SCAN_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.md', '.html'];
const IGNORE_DIRS = ['node_modules', '.git', 'archive', 'dist'];

function scanDirectory(dir) {
  const findings = [];
  // ... implement recursive scan logic
  return findings;
}

const results = scanDirectory(process.cwd());
if (results.length > 0) {
  console.error(`❌ Found ${results.length} legacy brand references`);
  process.exit(1);
} else {
  console.log('✅ Brand audit passed - no legacy references found');
  process.exit(0);
}
```

**CI Integration:** Add to `.github/workflows/ci.yml`
```yaml
- name: Brand Audit
  run: node scripts/brand-audit.mjs
```

### Acceptance Criteria
- [ ] Zero instances of "Project Valine" in user-facing UI (verified with grep)
- [ ] Footer has uniform typography (headings, links, disabled states)
- [ ] All hover states use consistent color (#0CCE6B)
- [ ] WCAG AA contrast ratios verified for all text/background combinations
- [ ] Visual regression tests updated (Percy/Chromatic snapshots)

### Testing Strategy
```bash
# Unit: Brand name replacements
npm test -- brand-name

# Visual: Footer consistency
npm run test:visual

# Manual: Navigate all marketing pages and verify branding
```

---

## Phase 2: Dashboard Composition Changes
**Priority:** High | **Risk:** Medium | **Effort:** 3-4 hours

### Objectives
- Remove inline post composer from dashboard
- Convert stats card to subscription CTA
- Create pricing page foundation

### Tasks

#### 2.1 Remove Dashboard Post Composer
**File:** `src/pages/Dashboard.jsx`

**Current code (example):**
```jsx
<div className="center-column">
  <PostComposer onSubmit={handlePostSubmit} />
  <Feed posts={posts} />
</div>
```

**New code:**
```jsx
<div className="center-column">
  {/* Callout Card */}
  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Ready to share your work?
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Create scripts, auditions, readings, and reels
        </p>
      </div>
      <Link 
        to="/create"
        className="btn-primary px-6 py-2.5 rounded-lg"
      >
        Create Post
      </Link>
    </div>
  </div>
  
  <Feed posts={posts} />
</div>
```

**Cleanup:**
- Remove `<PostComposer />` component import
- Remove `handlePostSubmit` function if only used here
- Keep composer component file for potential future use

#### 2.2 Stats Card → Subscription CTA
**File:** `src/components/dashboard/StatsCard.jsx` (or create new `SubscriptionCTA.jsx`)

**Current (stats display):**
```jsx
<div className="stats-card gradient-bg">
  <div className="stat-item">
    <span className="label">Connections</span>
    <span className="value">{stats.connections}</span>
  </div>
  {/* More stats... */}
</div>
```

**New (subscription CTA):**
```jsx
<div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
  <div className="flex items-start justify-between mb-4">
    <div>
      <h3 className="text-xl font-bold mb-2">Unlock Full Stats</h3>
      <p className="text-emerald-50 text-sm">
        Get detailed analytics with Emerald
      </p>
    </div>
    <svg className="w-12 h-12 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
      {/* Chart icon */}
    </svg>
  </div>
  
  <ul className="space-y-2 mb-6">
    <li className="flex items-center text-sm">
      <CheckIcon className="w-4 h-4 mr-2" />
      Track connections growth
    </li>
    <li className="flex items-center text-sm">
      <CheckIcon className="w-4 h-4 mr-2" />
      Monitor likes & engagement
    </li>
    <li className="flex items-center text-sm">
      <CheckIcon className="w-4 h-4 mr-2" />
      View detailed analytics
    </li>
  </ul>
  
  <Link 
    to="/subscribe"
    className="block w-full bg-white text-emerald-600 text-center font-semibold py-3 rounded-lg hover:bg-emerald-50 transition"
    onClick={() => trackEvent('subscription.view', { source: 'dashboard_stats' })}
  >
    Get Emerald
  </Link>
</div>
```

#### 2.3 Feature Flag Implementation
**File:** `.env.example`
```bash
# Subscription Features
VITE_ENABLE_SUBSCRIPTIONS=true
```

**File:** `src/config/features.js`
```javascript
export const features = {
  subscriptions: import.meta.env.VITE_ENABLE_SUBSCRIPTIONS === 'true',
  // ... other flags
};
```

**Usage:**
```jsx
import { features } from '@/config/features';

{features.subscriptions && <SubscriptionCTA />}
```

#### 2.4 Create Pricing Page
**File:** `src/pages/Pricing.jsx`

```jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Create unlimited posts',
        'Basic profile',
        'Community access',
        'Limited stats (connections only)',
      ],
      limitations: [
        'No detailed analytics',
        'No priority support',
      ],
      cta: 'Current Plan',
      disabled: true,
    },
    {
      name: 'Emerald',
      price: '$9',
      period: 'month',
      featured: true,
      features: [
        'Everything in Free',
        'Full analytics dashboard',
        'Track likes, views, engagement',
        'Export data reports',
        'Early access to new features',
        'Priority support',
      ],
      cta: 'Upgrade to Emerald',
      disabled: false, // Enable when payment ready
      comingSoon: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-neutral-600">
          Unlock powerful analytics and insights
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-xl p-8 ${
              plan.featured
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                : 'bg-white border-2 border-neutral-200'
            }`}
          >
            <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
            <div className="mb-6">
              <span className="text-5xl font-bold">{plan.price}</span>
              <span className="text-lg">/{plan.period}</span>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start">
                  <CheckIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {plan.comingSoon ? (
              <div className="bg-white bg-opacity-20 text-center py-3 rounded-lg">
                Payment integration coming soon
              </div>
            ) : (
              <button
                disabled={plan.disabled}
                className="w-full py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Routing:** Add to `src/App.jsx`
```jsx
<Route path="/subscribe" element={<Pricing />} />
<Route path="/pricing" element={<Pricing />} />
```

#### 2.5 Analytics Events
**File:** `src/utils/analytics.js`

```javascript
export function trackEvent(eventName, properties = {}) {
  // Console logging for MVP (replace with actual analytics later)
  console.log('[Analytics]', eventName, properties);
  
  // TODO: Integrate with analytics provider (PostHog, Mixpanel, etc.)
  // analytics.track(eventName, properties);
}
```

### Acceptance Criteria
- [ ] Dashboard no longer shows inline post composer
- [ ] Callout card navigates to `/create` when clicked
- [ ] Stats area displays subscription CTA with benefits list
- [ ] `/subscribe` route renders pricing page
- [ ] Feature flag `VITE_ENABLE_SUBSCRIPTIONS` controls subscription UI
- [ ] Analytics events fire (verify in console) for subscription.view

### Testing
```javascript
// src/tests/Dashboard.test.jsx
describe('Dashboard Composition', () => {
  it('should not render PostComposer component', () => {
    render(<Dashboard />);
    expect(screen.queryByTestId('post-composer')).not.toBeInTheDocument();
  });

  it('should render create callout card', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Ready to share your work/i)).toBeInTheDocument();
  });

  it('should navigate to /create on callout click', () => {
    render(<Dashboard />);
    fireEvent.click(screen.getByRole('link', { name: /create post/i }));
    expect(window.location.pathname).toBe('/create');
  });
});
```

---

## Phase 3: Tag System Refactor
**Priority:** High | **Risk:** Medium-High | **Effort:** 6-8 hours

### Objectives
- Implement curated tag taxonomy (30 tags)
- Enforce 5-tag maximum per post/profile
- Replace free-text input with controlled multi-select

### Tasks

#### 3.1 Define Tag Taxonomy
**File:** `src/constants/tags.js`

```javascript
/**
 * Curated tag taxonomy for Joint platform
 * Categories: Performance, Genre, Format, Skill
 * 
 * Update process: Add new tags here, deploy, deprecate old tags via migration script
 */
export const ALLOWED_TAGS = [
  // Performance Types
  'Monologue',
  'Drama',
  'Comedy',
  'Improv',
  'Character',
  'Stage',
  
  // Genres
  'SciFi',
  'Fantasy',
  'Horror',
  'Romance',
  'Thriller',
  'Action',
  
  // Formats
  'Narration',
  'Animation',
  'Commercial',
  'Audiobook',
  'Podcast',
  'VoiceOver',
  
  // Content Types
  'Reading',
  'Reel',
  'ShortFilm',
  'Feature',
  'Pilot',
  'ColdRead',
  
  // Skills
  'Dialect',
  'Playwriting',
  'Directing',
  'Producing',
  'Editing',
  'Casting',
];

export const MAX_TAGS = 5;

export const TAG_CATEGORIES = {
  performance: ['Monologue', 'Drama', 'Comedy', 'Improv', 'Character', 'Stage'],
  genre: ['SciFi', 'Fantasy', 'Horror', 'Romance', 'Thriller', 'Action'],
  format: ['Narration', 'Animation', 'Commercial', 'Audiobook', 'Podcast', 'VoiceOver'],
  content: ['Reading', 'Reel', 'ShortFilm', 'Feature', 'Pilot', 'ColdRead'],
  skill: ['Dialect', 'Playwriting', 'Directing', 'Producing', 'Editing', 'Casting'],
};

/**
 * Validate tags against allowed list and max count
 */
export function validateTags(tags) {
  const errors = [];
  
  if (!Array.isArray(tags)) {
    return { valid: false, errors: ['Tags must be an array'] };
  }
  
  if (tags.length > MAX_TAGS) {
    errors.push(`Maximum ${MAX_TAGS} tags allowed (you have ${tags.length})`);
  }
  
  const invalidTags = tags.filter(tag => !ALLOWED_TAGS.includes(tag));
  if (invalidTags.length > 0) {
    errors.push(`Invalid tags: ${invalidTags.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

#### 3.2 Tag Selector Component
**File:** `src/components/forms/TagSelector.jsx`

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { ALLOWED_TAGS, MAX_TAGS, TAG_CATEGORIES } from '@/constants/tags';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';

export default function TagSelector({ value = [], onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  
  // Filter tags based on search query
  const filteredTags = ALLOWED_TAGS.filter(tag =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Group filtered tags by category
  const groupedTags = Object.entries(TAG_CATEGORIES).reduce((acc, [category, tags]) => {
    const filtered = tags.filter(tag => filteredTags.includes(tag));
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});
  
  const handleToggleTag = (tag) => {
    if (value.includes(tag)) {
      // Remove tag
      onChange(value.filter(t => t !== tag));
    } else {
      // Add tag if under limit
      if (value.length < MAX_TAGS) {
        onChange([...value, tag]);
      }
    }
  };
  
  const handleRemoveTag = (tag) => {
    onChange(value.filter(t => t !== tag));
  };
  
  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const isAtLimit = value.length >= MAX_TAGS;
  
  return (
    <div ref={containerRef} className="relative">
      {/* Selected Tags Display */}
      <div className="mb-2 flex flex-wrap gap-2 min-h-[2.5rem]">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100 rounded-full text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
              aria-label={`Remove ${tag} tag`}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </span>
        ))}
        
        {value.length === 0 && (
          <span className="text-neutral-500 text-sm py-1.5">
            No tags selected
          </span>
        )}
      </div>
      
      {/* Tag Count Indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {value.length} / {MAX_TAGS} tags
        </span>
        {isAtLimit && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Maximum tags reached
          </span>
        )}
      </div>
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search tags..."
          disabled={isAtLimit}
          className="block w-full pl-10 pr-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Search tags"
          aria-expanded={isOpen}
          aria-controls="tag-dropdown"
        />
      </div>
      
      {/* Dropdown */}
      {isOpen && !isAtLimit && (
        <div
          id="tag-dropdown"
          className="absolute z-10 mt-2 w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {Object.keys(groupedTags).length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-500">
              No tags found
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-4 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {tags.map(tag => {
                      const isSelected = value.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-100 font-medium'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{tag}</span>
                            {isSelected && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

#### 3.3 Update Existing Tag Components
**File:** `src/components/dashboard/SavedTags.jsx`

Replace free-text input with TagSelector:
```jsx
import TagSelector from '@/components/forms/TagSelector';

// Old:
// <input type="text" onKeyPress={handleAddTag} />

// New:
<TagSelector 
  value={savedTags} 
  onChange={handleTagsChange}
  error={tagError}
/>
```

#### 3.4 Update Trending Tags
**File:** `src/components/dashboard/TrendingTags.jsx`

```jsx
import { ALLOWED_TAGS } from '@/constants/tags';

// Instead of hard-coded array:
const hardcodedTags = ['Acting', 'Writing', 'Directing'];

// Use subset of curated taxonomy:
const trendingTags = ALLOWED_TAGS.slice(0, 8); // First 8 tags as "trending"

// TODO: Replace with actual trending calculation from backend
```

### Acceptance Criteria
- [ ] TagSelector component renders with search functionality
- [ ] Only tags from ALLOWED_TAGS can be selected
- [ ] Maximum 5 tags enforced (selector disabled when limit reached)
- [ ] Visual count indicator shows "X / 5 tags"
- [ ] Attempting to add 6th tag shows error toast or is prevented
- [ ] Saved tags component uses new taxonomy
- [ ] Trending tags show subset of allowed tags

### Testing
```javascript
// src/tests/TagSelector.test.jsx
describe('TagSelector', () => {
  it('enforces maximum 5 tags', () => {
    const { rerender } = render(<TagSelector value={[]} onChange={mockOnChange} />);
    
    // Select 5 tags
    const fiveTags = ALLOWED_TAGS.slice(0, 5);
    rerender(<TagSelector value={fiveTags} onChange={mockOnChange} />);
    
    // Selector should be disabled
    const input = screen.getByLabelText(/search tags/i);
    expect(input).toBeDisabled();
  });

  it('rejects tags not in allowed list', () => {
    const result = validateTags(['InvalidTag', 'Drama']);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid tags: InvalidTag');
  });
});
```

---

## Phase 4: Create Page Redesign
**Priority:** Medium | **Risk:** Low | **Effort:** 4-5 hours

### Objectives
- Structured content creation form
- Clear labeled fields with accessibility
- Integration with Phase 3 tag system

### Tasks

#### 4.1 Create Page Form Structure
**File:** `src/pages/Create.jsx`

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TagSelector from '@/components/forms/TagSelector';
import { validateTags } from '@/constants/tags';

const CONTENT_TYPES = [
  { value: 'script', label: 'Script', icon: '📝' },
  { value: 'audition', label: 'Audition', icon: '🎭' },
  { value: 'reading', label: 'Reading', icon: '📖' },
  { value: 'reel', label: 'Reel', icon: '🎬' },
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can view' },
  { value: 'on-request', label: 'On Request', description: 'Visible with link' },
  { value: 'private', label: 'Private', description: 'Only you can view' },
];

export default function Create() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    contentType: '',
    title: '',
    description: '',
    tags: [],
    visibility: 'public',
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.contentType) {
      newErrors.contentType = 'Please select a content type';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Title must be 100 characters or less';
    }
    
    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }
    
    const tagValidation = validateTags(formData.tags);
    if (!tagValidation.valid) {
      newErrors.tags = tagValidation.errors[0];
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      document.querySelector(`[name="${firstErrorField}"]`)?.focus();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        navigate('/dashboard');
      } else {
        throw new Error('Failed to create post');
      }
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isFormValid = formData.contentType && formData.title.trim() && formData.tags.length > 0;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Create New Post</h1>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Content Type */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Content Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CONTENT_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleChange('contentType', type.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.contentType === type.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-300'
                }`}
                aria-pressed={formData.contentType === type.value}
              >
                <div className="text-3xl mb-2">{type.icon}</div>
                <div className="font-medium">{type.label}</div>
              </button>
            ))}
          </div>
          {errors.contentType && (
            <p className="mt-2 text-sm text-red-600" role="alert">{errors.contentType}</p>
          )}
        </div>
        
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-neutral-500 mb-2">
            Clear, descriptive headline
          </p>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={100}
            className="block w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : 'title-help'}
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.title ? (
              <p id="title-error" className="text-red-600" role="alert">{errors.title}</p>
            ) : (
              <p id="title-help" className="text-neutral-500">&nbsp;</p>
            )}
            <span className="text-neutral-500">{formData.title.length}/100</span>
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder="Describe context, goals, or feedback needed..."
            className="block w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            aria-invalid={!!errors.description}
            aria-describedby="description-count"
          />
          <div className="mt-1 flex justify-between text-sm">
            {errors.description && (
              <p className="text-red-600" role="alert">{errors.description}</p>
            )}
            <span id="description-count" className="text-neutral-500 ml-auto">
              {formData.description.length}/1000
            </span>
          </div>
        </div>
        
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Tags <span className="text-red-500">*</span>
          </label>
          <TagSelector
            value={formData.tags}
            onChange={(tags) => handleChange('tags', tags)}
            error={errors.tags}
          />
        </div>
        
        {/* Visibility */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Visibility
          </label>
          <div className="space-y-3">
            {VISIBILITY_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.visibility === option.value
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-emerald-300'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option.value}
                  checked={formData.visibility === option.value}
                  onChange={(e) => handleChange('visibility', e.target.value)}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Post'
            )}
          </button>
        </div>
        
        {errors.submit && (
          <p className="text-red-600 text-center" role="alert">{errors.submit}</p>
        )}
      </form>
    </div>
  );
}
```

### Acceptance Criteria
- [ ] All form fields have associated labels (for/id or aria-labelledby)
- [ ] Required fields visually marked with asterisk
- [ ] Helper text provides guidance for each field
- [ ] Character counts displayed for title (100) and description (1000)
- [ ] Submit button disabled until title + contentType + tags valid
- [ ] Keyboard navigation works (Tab through fields, Enter to submit)
- [ ] Focus moves to first error field on validation failure
- [ ] Error messages displayed inline below each field

### Testing
```javascript
describe('Create Page Accessibility', () => {
  it('has labels for all inputs', () => {
    render(<Create />);
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
  });

  it('disables submit when required fields empty', () => {
    render(<Create />);
    const submitButton = screen.getByRole('button', { name: /create post/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit when form valid', () => {
    render(<Create />);
    // Fill required fields
    // ...
    expect(submitButton).not.toBeDisabled();
  });
});
```

---

## Phase 5: Dark Mode Persistence Fix
**Priority:** Critical Bug | **Risk:** Medium | **Effort:** 3-4 hours

### Objectives
- Eliminate dark mode "cut out" bug where theme reverts after navigation
- Separate marketing page light theme from global theme setting
- Ensure theme persistence across routes

### Root Cause Analysis

**Current problematic flow:**
1. User enables dark mode → `setTheme('dark')` → localStorage updated
2. User navigates to marketing page → MarketingLayout `useEffect` runs
3. MarketingLayout calls `setTheme('light')` unconditionally
4. Global theme changed to light, overrides user preference
5. User navigates back to app → dark mode lost

### Tasks

#### 5.1 Audit Theme Initialization
**File:** `public/theme-init.js`

**Current (problematic):**
```javascript
(function() {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.add(theme);
})();
```

**Issue:** No route awareness - always applies stored theme even on marketing pages

**Fixed:**
```javascript
(function() {
  const storedTheme = localStorage.getItem('theme') || 'light';
  const path = window.location.pathname;
  
  // Marketing pages always use light mode (visual override only)
  const isMarketingPage = ['/', '/about', '/features', '/pricing', '/404'].includes(path);
  
  if (isMarketingPage) {
    // Apply light mode for marketing, but don't change localStorage
    document.documentElement.classList.add('light');
  } else {
    // Apply user preference for app pages
    document.documentElement.classList.add(storedTheme);
  }
  
  // Store original preference for restoration
  if (!isMarketingPage) {
    window.__userThemePreference = storedTheme;
  }
})();
```

#### 5.2 Refactor MarketingLayout
**File:** `src/layouts/MarketingLayout.jsx`

**Current (problematic):**
```jsx
useEffect(() => {
  setTheme('light'); // PROBLEM: Overwrites global theme
}, []);
```

**Fixed:**
```jsx
import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function MarketingLayout({ children }) {
  const { theme } = useTheme();
  const originalTheme = useRef(theme);
  
  useEffect(() => {
    // Store user's original theme preference
    originalTheme.current = theme;
    
    // Apply marketing-specific light styling via CSS class
    document.body.classList.add('marketing-light-mode');
    
    return () => {
      // Remove marketing styling on unmount
      document.body.classList.remove('marketing-light-mode');
    };
  }, []);
  
  return (
    <div className="marketing-layout">
      {children}
    </div>
  );
}
```

**CSS override (instead of theme change):**
```css
/* src/styles/marketing.css */
body.marketing-light-mode {
  /* Force light colors without changing theme context */
  --bg-primary: white;
  --text-primary: #171717;
  /* ... other marketing-specific overrides */
}

body.marketing-light-mode * {
  /* Override dark mode classes within marketing pages */
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}
```

#### 5.3 Fix Theme Sync Hook
**File:** `src/hooks/useThemeSync.js`

**Current issue:** Repeated sync triggers cause flicker

**Fixed:**
```javascript
import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export function useThemeSync() {
  const { theme, setTheme } = useTheme();
  const hasSynced = useRef(false);
  const syncInProgress = useRef(false);
  
  useEffect(() => {
    // Only sync once on mount
    if (hasSynced.current || syncInProgress.current) {
      return;
    }
    
    syncInProgress.current = true;
    
    const fetchUserTheme = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        const { theme: backendTheme } = await response.json();
        
        // Only update if different from current theme
        if (backendTheme && backendTheme !== theme) {
          setTheme(backendTheme);
        }
      } catch (error) {
        console.warn('Failed to sync theme from backend', error);
      } finally {
        syncInProgress.current = false;
        hasSynced.current = true;
      }
    };
    
    fetchUserTheme();
  }, []); // Empty deps - run once on mount
  
  // Persist theme changes to backend (debounced)
  useEffect(() => {
    if (!hasSynced.current) return; // Don't persist initial load
    
    const persistTheme = async () => {
      try {
        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme }),
        });
      } catch (error) {
        console.warn('Failed to persist theme to backend', error);
      }
    };
    
    const timeoutId = setTimeout(persistTheme, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [theme]);
}
```

#### 5.4 Theme Context Guard
**File:** `src/contexts/ThemeContext.jsx`

Add guard to prevent external overrides:
```jsx
export function ThemeProvider({ children }) {
  const [theme, setThemeInternal] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  
  const setTheme = useCallback((newTheme) => {
    // Guard: Don't allow theme changes on marketing pages
    const isMarketingPage = window.location.pathname.match(/^\/(|about|features|pricing|404)$/);
    
    if (isMarketingPage) {
      console.warn('[ThemeContext] Ignoring theme change on marketing page');
      return;
    }
    
    setThemeInternal(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
  }, []);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Acceptance Criteria
- [ ] User selects dark mode → navigates to marketing page → marketing appears light
- [ ] User returns to dashboard → dark mode still active (no revert)
- [ ] No theme flicker on initial page load
- [ ] No theme flicker within 5-minute navigation cycle
- [ ] Marketing pages always appear light regardless of user preference
- [ ] App pages respect user theme preference
- [ ] Theme preference saved to backend correctly

### Testing
```javascript
describe('Dark Mode Persistence', () => {
  it('persists dark mode across navigation', () => {
    // Enable dark mode
    cy.visit('/dashboard');
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('html').should('have.class', 'dark');
    
    // Navigate to marketing
    cy.visit('/about');
    cy.get('html').should('have.class', 'light'); // Marketing override
    
    // Return to dashboard
    cy.visit('/dashboard');
    cy.get('html').should('have.class', 'dark'); // User preference restored
  });
  
  it('does not flicker on route change', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="theme-toggle"]').click();
    
    // Monitor theme class changes
    const themeChanges = [];
    cy.get('html').then($html => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          if (m.attributeName === 'class') {
            themeChanges.push($html.attr('class'));
          }
        });
      });
      observer.observe($html[0], { attributes: true });
    });
    
    cy.visit('/profile');
    cy.wait(2000);
    
    // Should only have one theme class throughout
    cy.wrap(themeChanges).should('satisfy', (changes) => {
      const uniqueThemes = [...new Set(changes.map(c => c.includes('dark') ? 'dark' : 'light'))];
      return uniqueThemes.length === 1;
    });
  });
});
```

---

## Phase 6: Account Persistence Infrastructure
**Priority:** Critical | **Risk:** HIGH | **Effort:** 8-12 hours

⚠️ **WARNING:** This phase involves database changes and authentication flow modifications. Proceed with extreme caution. Deploy to staging first.

### Pre-requisites
- [ ] PR #255 (Secrets Management) merged
- [ ] Database backup taken
- [ ] Staging environment ready for testing
- [ ] Rollback plan documented

### Sub-Phase 6A: Admin User Creation Script
**Effort:** 2-3 hours

#### File: `scripts/admin-upsert-user.mjs`

```javascript
#!/usr/bin/env node

/**
 * Admin User Upsert Script
 * 
 * Safely creates or updates user accounts for owner-only mode
 * 
 * Usage:
 *   node scripts/admin-upsert-user.mjs \
 *     --email friend@example.com \
 *     --password SecurePassword123! \
 *     --display-name "Friend Name" \
 *     [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') config.email = args[++i];
    else if (args[i] === '--password') config.password = args[++i];
    else if (args[i] === '--display-name') config.displayName = args[++i];
    else if (args[i] === '--dry-run') config.dryRun = true;
    else if (args[i] === '--skip-if-exists') config.skipIfExists = true;
  }
  
  return config;
}

// Validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate password strength
function validatePassword(password) {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (!hasUpper || !hasLower || !hasNumber) {
    return { 
      valid: false, 
      reason: 'Password must contain uppercase, lowercase, and numbers' 
    };
  }
  
  return { valid: true };
}

// Generate username from email
function generateUsername(email) {
  const localPart = email.split('@')[0];
  return localPart.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Confirm action in production
async function confirmAction(message) {
  if (process.env.NODE_ENV !== 'production') {
    return true; // Auto-confirm in non-production
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (type 'yes' to confirm): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

// Main upsert logic
async function upsertUser(config) {
  const { email, password, displayName, dryRun, skipIfExists } = config;
  
  // Validation
  if (!email || !validateEmail(email)) {
    throw new Error('Invalid email address');
  }
  
  if (!password) {
    throw new Error('Password is required');
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.reason);
  }
  
  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser && skipIfExists) {
    console.log(`ℹ️  User ${email} already exists - skipping (--skip-if-exists)`);
    return;
  }
  
  // Generate values
  const username = generateUsername(email);
  const passwordHash = await bcrypt.hash(password, 10);
  const finalDisplayName = displayName || username;
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('USER UPSERT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Email:        ${email}`);
  console.log(`Username:     ${username}`);
  console.log(`Display Name: ${finalDisplayName}`);
  console.log(`Action:       ${existingUser ? 'UPDATE' : 'CREATE'}`);
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`Dry Run:      ${dryRun ? 'YES' : 'NO'}`);
  console.log('='.repeat(60) + '\n');
  
  if (dryRun) {
    console.log('🏃 Dry run mode - no changes will be made');
    return;
  }
  
  // Confirm in production
  const confirmed = await confirmAction(
    `Create/update user ${email} in ${process.env.NODE_ENV || 'development'}?`
  );
  
  if (!confirmed) {
    console.log('❌ Operation cancelled');
    return;
  }
  
  // Execute upsert
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        displayName: finalDisplayName,
      },
      create: {
        email,
        username,
        passwordHash,
        displayName: finalDisplayName,
        onboardingComplete: false,
      },
    });
    
    // Create/update profile
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        headline: '',
        bio: '',
        roles: [],
        tags: [],
      },
    });
    
    console.log('✅ User created/updated successfully');
    console.log(`User ID: ${user.id}`);
    
    // Optionally add to ALLOWED_USER_EMAILS
    const currentAllowlist = process.env.ALLOWED_USER_EMAILS || '';
    const allowedEmails = currentAllowlist.split(',').map(e => e.trim()).filter(Boolean);
    
    if (!allowedEmails.includes(email)) {
      console.log('\n⚠️  Remember to add this email to ALLOWED_USER_EMAILS:');
      console.log(`ALLOWED_USER_EMAILS="${[...allowedEmails, email].join(',')}"`);
    }
    
  } catch (error) {
    console.error('❌ Error creating/updating user:', error.message);
    throw error;
  }
}

// Entry point
async function main() {
  try {
    const config = parseArgs();
    await upsertUser(config);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

**Usage examples:**
```bash
# Dry run (test mode)
node scripts/admin-upsert-user.mjs \
  --email friend@example.com \
  --password SecurePass123! \
  --display-name "Friend Name" \
  --dry-run

# Actual creation
node scripts/admin-upsert-user.mjs \
  --email friend@example.com \
  --password SecurePass123! \
  --display-name "Friend Name"

# Skip if exists
node scripts/admin-upsert-user.mjs \
  --email existing@example.com \
  --password NewPass123! \
  --skip-if-exists
```

### Sub-Phase 6B: Profile Update Endpoint
**Effort:** 4-5 hours

#### File: `serverless/src/handlers/profiles.js`

Add PATCH endpoint:
```javascript
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import { json, error } from '../utils/headers.js';
import { validateTags } from '../../../src/constants/tags.js';

const prisma = new PrismaClient();

// Allowed roles (add to constants)
const ALLOWED_ROLES = [
  'Voice Actor',
  'Writer',
  'Director',
  'Producer',
  'Editor',
  'Sound Designer',
  'Casting Director',
];

// PATCH /api/me/profile - Update current user's profile
export const updateProfile = async (event) => {
  // Authenticate
  const authResult = await authenticateToken(event);
  if (!authResult.authorized) {
    return error(401, 'Unauthorized');
  }
  
  const userId = authResult.user.id;
  
  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return error(400, 'Invalid JSON');
  }
  
  const { 
    displayName, 
    username, 
    headline, 
    bio, 
    roles, 
    tags, 
    avatarUrl, 
    bannerUrl 
  } = body;
  
  // Validation
  const errors = [];
  
  if (username) {
    // Check alphanumeric + underscore/hyphen
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      errors.push('Username must be 3-30 characters (alphanumeric, underscore, hyphen)');
    }
    
    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { 
        username, 
        id: { not: userId } 
      },
    });
    
    if (existing) {
      errors.push('Username already taken');
    }
  }
  
  if (headline && headline.length > 100) {
    errors.push('Headline must be 100 characters or less');
  }
  
  if (bio && bio.length > 500) {
    errors.push('Bio must be 500 characters or less');
  }
  
  if (roles) {
    if (!Array.isArray(roles)) {
      errors.push('Roles must be an array');
    } else {
      const invalidRoles = roles.filter(r => !ALLOWED_ROLES.includes(r));
      if (invalidRoles.length > 0) {
        errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
      }
    }
  }
  
  if (tags) {
    const tagValidation = validateTags(tags);
    if (!tagValidation.valid) {
      errors.push(...tagValidation.errors);
    }
  }
  
  if (errors.length > 0) {
    return error(400, 'Validation failed', { errors });
  }
  
  // Check allowlist (owner-only mode)
  const strictAllowlist = process.env.STRICT_ALLOWLIST === '1';
  if (strictAllowlist) {
    const allowedEmails = (process.env.ALLOWED_USER_EMAILS || '').split(',').map(e => e.trim());
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!allowedEmails.includes(user.email)) {
      return error(403, 'Access denied - not in allowlist');
    }
  }
  
  // Update user and profile
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(displayName && { displayName }),
      },
    });
    
    const updatedProfile = await prisma.profile.upsert({
      where: { userId },
      update: {
        ...(headline !== undefined && { headline }),