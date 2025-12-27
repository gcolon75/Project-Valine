# Landing Page Structure

## Overview

The landing page has been consolidated from three separate marketing pages (Home, About, Features) into a single high-conversion landing page with modular sections and anchor navigation.

## Architecture

### Routing Strategy

**Before:**
- `/` → Home.jsx
- `/about` → About.jsx  
- `/features` → Features.jsx

**After:**
- `/` → Landing.jsx (consolidated)
- `/about` → Redirects to `/#about`
- `/about-us` → Redirects to `/#about`
- `/features` → Redirects to `/#features`

### File Structure

```
src/
├── components/
│   ├── landing/                    # Modular landing sections
│   │   ├── HeroSection.jsx
│   │   ├── ValuePropsSection.jsx
│   │   ├── FeatureGridSection.jsx
│   │   ├── ProductVisualSection.jsx
│   │   ├── SocialProofSection.jsx
│   │   ├── FAQSection.jsx
│   │   ├── FinalCTASection.jsx
│   │   └── __tests__/              # Component tests
│   └── MarketingFooter.jsx         # 4-column footer
├── layouts/
│   └── MarketingLayout.jsx         # Anchor navigation + smooth scroll
└── pages/
    └── Landing.jsx                 # Composed landing page
```

## Landing Sections

### 1. HeroSection
**Purpose:** First impression with value proposition and primary CTA  
**Key Elements:**
- Main headline with gradient animation
- Tagline badge
- Dual CTAs (primary: "Get Started Free", secondary: "Learn More")
- Centered hero visual placeholder
- Stats cards (10K+ Artists, 50K+ Posts, 5K+ Projects) displayed below hero content

**Design Notes:**
- Fully centered layout for visual balance
- Stats positioned below main content in a responsive horizontal row
- Enhanced shadows for depth and section separation

**Future Expansion:**
- Replace placeholder with product screenshot/video
- Add dynamic stats from backend API
- A/B test CTA copy

### 2. ValuePropsSection
**Purpose:** Communicate mission, community, and promise  
**Key Elements:**
- Three value cards (Mission, Community, Promise)
- Icons for visual interest
- Hover effects for engagement

**Anchor:** `#about`

**Future Expansion:**
- Add founder story
- Team photos
- Company timeline

### 3. FeatureGridSection
**Purpose:** Showcase platform capabilities  
**Key Elements:**
- 6 primary feature cards
- "More Features" section with 4 additional items
- Icons representing each feature
- Hover states for interactivity

**Anchor:** `#features`

**Future Expansion:**
- Add feature demos/videos
- Link to detailed feature pages
- User success metrics per feature

### 4. ProductVisualSection
**Purpose:** Visual demonstration of platform value  
**Key Elements:**
- Bullet points highlighting key benefits
- Large visual placeholder for product demo
- Play button overlay for future video integration

**Future Expansion:**
- Embed product demo video
- Interactive product tour
- Before/after comparisons

### 5. SocialProofSection
**Purpose:** Build trust through testimonials  
**Key Elements:**
- 3 testimonials from different user types
- Avatar images
- Role labels

**Future Expansion:**
- Rotate testimonials dynamically
- Add video testimonials
- Link to case studies
- Pull real user reviews from backend

### 6. FAQSection
**Purpose:** Address common questions and reduce friction  
**Key Elements:**
- Accordion-style FAQ items
- 6 curated questions covering basics
- Smooth expand/collapse animations

**Anchor:** `#faq`

**Future Expansion:**
- Add search functionality
- Categorize FAQs (Getting Started, Billing, Features, etc.)
- Link to knowledge base
- Track most-clicked questions

### 7. FinalCTASection
**Purpose:** Final conversion opportunity  
**Key Elements:**
- Bold headline
- Single prominent CTA
- Gradient background matching brand

**Future Expansion:**
- A/B test different CTAs
- Add social proof counter ("Join 10,000+ artists")
- Include signup form inline

## Navigation & Accessibility

### Anchor Navigation
The MarketingLayout header includes anchor links:
- Features → `#features`
- About → `#about`
- FAQ → `#faq`

JavaScript smooth scrolling is enabled via CSS: `scroll-behavior: smooth`

### Accessibility Features
- **Skip to Content:** Screen reader users can bypass header navigation
- **Semantic HTML:** Proper heading hierarchy (single h1, logical h2/h3)
- **ARIA Labels:** All icon-only buttons and links have descriptive labels
- **Focus States:** All interactive elements have visible focus indicators
- **Alt Text:** All images include descriptive alt attributes
- **Color Contrast:** All text meets WCAG AA standards

## Spacing & Typography

### Section Shadows & Visual Separation
All landing sections now include refined shadow styling for better visual depth and separation:
- Shadow utility: `shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]`
- Applied to: ValuePropsSection, FeatureGridSection, ProductVisualSection, SocialProofSection, FAQSection
- FinalCTASection uses slightly heavier shadow: `shadow-[0_8px_30px_-5px_rgba(0,0,0,0.12)]`
- Shadows remain subtle, accessible, and performant

### Vertical Rhythm
Sections use consistent padding:
- **Desktop:** `py-16 md:py-20` (64-80px)
- **Tablet:** Inherits responsive classes
- **Mobile:** `py-16` (64px minimum)

### Container Width
- Max width: `1200-1280px` (varies by section)
- Horizontal padding: `px-4` (responsive)
- Centered: `mx-auto`

### Typography Scale
- **Hero h1:** `text-4xl md:text-5xl lg:text-6xl`
- **Section h2:** `text-3xl md:text-4xl`
- **Card h3:** `text-xl`
- **Body:** `text-lg md:text-xl` (lead) or base

## Footer Structure

### MarketingFooter (4-column layout)

**Columns:**
1. **Product:** Features, Changelog (disabled), Roadmap (disabled)
2. **Resources:** Documentation (disabled), Support (disabled), FAQ (anchor link)
3. **Company:** About (anchor link), Contact (disabled)
4. **Legal:** Privacy Policy, Terms of Service

**Typography & Color Normalization:**
- Column headings: `text-neutral-900` with `font-semibold`
- Active links: `text-neutral-700` with hover to `text-[#0CCE6B]`
- Disabled items: `text-neutral-500` with `aria-disabled="true"` for better contrast and accessibility
- Brand logo text: `text-neutral-900` (consistent, no gradient effect in footer)

**Bottom Bar:**
- Brand logo & name (consistent neutral-900 text)
- Copyright notice with dynamic year
- Social links (Twitter, LinkedIn, GitHub)

**Future Expansion:**
- Add newsletter signup
- Enable all disabled placeholder links
- Add locale selector
- Mobile app links

## Performance Considerations

### Code Splitting
- Landing sections are tree-shakeable
- Lazy-loaded components where appropriate
- Icons imported individually from lucide-react

### Image Optimization
- Placeholder images use CDN (pravatar.cc for testimonials)
- Future: Replace with optimized WebP/AVIF images
- Implement lazy loading for below-fold images

### Build Size
Current landing page bundle: ~10KB gzipped (excluding shared vendor code)

## Testing Strategy

### Unit Tests
Each landing section has test coverage:
- Rendering key elements
- Accessibility (headings, ARIA labels)
- Interactive elements (FAQ accordion, links)

Run tests: `npm run test:run src/components/landing`

### Manual Testing Checklist
- [ ] Desktop (1920x1080, 1440x900)
- [ ] Tablet (768x1024 portrait/landscape)
- [ ] Mobile (375x667, 414x896)
- [ ] Anchor links scroll smoothly
- [ ] No horizontal overflow
- [ ] CTA buttons functional
- [ ] FAQ accordion works
- [ ] Footer links correct

### E2E Testing
Future: Add Playwright tests for:
- Landing page loads without errors
- All sections render
- Anchor navigation works
- CTAs redirect correctly

## Rollback Plan

### Files to Revert
If rollback needed, restore:
- `src/pages/Home.jsx`
- `src/pages/About.jsx`
- `src/pages/Features.jsx`
- `src/App.jsx` (routing)
- `src/layouts/MarketingLayout.jsx` (footer)

### Commands
```powershell
# Restore original pages
git checkout main -- src/pages/Home.jsx src/pages/About.jsx src/pages/Features.jsx

# Restore original routing
git checkout main -- src/App.jsx

# Restore original layout
git checkout main -- src/layouts/MarketingLayout.jsx

# Remove landing components
rm -rf src/components/landing src/components/MarketingFooter.jsx
```

## Migration Notes

### Breaking Changes
None. Old marketing page routes redirect to appropriate sections.

### Deprecated Routes
- `/features` → Use `/#features`
- `/about` → Use `/#about`
- `/about-us` → Use `/#about`

### SEO Considerations
- Redirects are client-side (React Router) — consider server-side redirects for SEO
- Update sitemap to reflect new structure
- Meta tags unchanged on Landing page
- Consider adding structured data (JSON-LD) for sections

## Future Enhancements

### Phase 2: Content Management
- Move section content to CMS (Sanity)
- Enable non-technical team members to edit copy
- A/B test different messaging

### Phase 3: Personalization
- Dynamic hero based on referrer
- Geo-targeted testimonials
- Industry-specific feature highlights

### Phase 4: Conversion Optimization
- Add inline signup form to hero
- Implement exit-intent modal
- Add live chat widget
- Track scroll depth analytics

### Phase 5: Internationalization
- Multi-language support
- Locale-specific testimonials
- Currency/region switcher

## Questions & Support

For questions about the landing page structure, contact:
- Frontend team lead
- UX/Design team for content changes
- Marketing for conversion optimization

## Changelog

### 2025-11-20 - Design Refinement & Visual Polish
- Centered HeroSection layout with stats below main content
- Removed Trending sidebar card (design simplification)
- Added enhanced section shadows for better visual separation
- Normalized footer typography: disabled items now neutral-500, consistent brand text
- Verified all anchor IDs present and functional (#features, #about, #faq)
- Updated tests to reflect new centered layout

### 2025-11-11 - Initial Consolidation
- Merged Home, About, Features into single Landing page
- Added modular section components
- Implemented anchor navigation
- Created 4-column footer
- Added skip-to-content accessibility
- Created comprehensive test suite
