# UI Whitespace & Spacing Guide

> **Project Valine Design System**  
> Comprehensive spacing, padding, and layout standards for consistent UI rhythm

## 📋 Overview

This guide defines the spacing standards and whitespace patterns used throughout Project Valine. Consistent spacing creates visual rhythm, improves readability, and ensures a professional, polished user experience across all pages and components.

**Design Philosophy**:
- **Rhythm**: Consistent vertical spacing creates visual flow
- **Breathing Room**: Generous padding improves readability
- **Responsive**: Spacing adapts gracefully across breakpoints
- **Systematic**: Use Tailwind's spacing scale for all spacing decisions

---

## 🎨 Spacing Scale

Project Valine uses **Tailwind CSS's spacing scale** based on `0.25rem` (4px) increments.

### Base Scale

| Token | Value | px | Common Use |
|-------|-------|-----|------------|
| `0` | 0 | 0px | Reset spacing |
| `1` | 0.25rem | 4px | Micro spacing |
| `2` | 0.5rem | 8px | Tight spacing |
| `3` | 0.75rem | 12px | Small gaps |
| `4` | 1rem | 16px | Default gap |
| `5` | 1.25rem | 20px | Medium gap |
| `6` | 1.5rem | 24px | Large gap |
| `8` | 2rem | 32px | Section spacing |
| `10` | 2.5rem | 40px | Section padding (mobile) |
| `12` | 3rem | 48px | Section padding (tablet) |
| `16` | 4rem | 64px | Section padding (desktop) |
| `20` | 5rem | 80px | Extra large spacing |
| `24` | 6rem | 96px | Huge spacing |

### When to Use Each

- **0-2**: Internal component spacing (icon margins, badge padding)
- **3-4**: Component internal gaps (between label and input, button padding)
- **5-6**: Component external margins (card spacing, list item gaps)
- **8**: Inter-component spacing (stack spacing, grid gaps)
- **10-16**: Section padding (hero, features, footer)
- **20-24**: Exceptional cases (hero extra padding, landing page accents)

---

## 📏 Section Padding Standards

All full-width sections follow consistent vertical padding that adapts to screen size.

### Desktop (default)

```jsx
<section className="py-16">
  {/* Section content */}
</section>
```

- **Padding**: `4rem` (64px) top and bottom
- **Use**: All sections on desktop viewports (≥1024px)
- **Visual**: Creates generous breathing room

### Tablet (md breakpoint, 768px+)

```jsx
<section className="py-10 md:py-12">
  {/* Section content */}
</section>
```

- **Padding**: `3rem` (48px) top and bottom
- **Use**: Intermediate breakpoint between mobile and desktop
- **Visual**: Balanced spacing for tablet viewports

**Alternative (less aggressive)**:
```jsx
<section className="py-10 lg:py-16">
  {/* Skip md, jump from mobile to desktop */}
</section>
```

### Mobile (base, <768px)

```jsx
<section className="py-10">
  {/* Section content */}
</section>
```

- **Padding**: `2.5rem` (40px) top and bottom
- **Use**: Default for small screens
- **Visual**: Sufficient spacing without wasting vertical real estate

### Responsive Pattern (Recommended)

```jsx
{/* Standard section */}
<section className="py-10 md:py-12 lg:py-16">
  <div className="max-w-7xl mx-auto px-4">
    {/* Section content */}
  </div>
</section>

{/* Hero section (extra padding) */}
<section className="py-16 md:py-20 lg:py-24">
  <div className="max-w-7xl mx-auto px-4">
    {/* Hero content */}
  </div>
</section>

{/* Compact section */}
<section className="py-8 md:py-10 lg:py-12">
  <div className="max-w-7xl mx-auto px-4">
    {/* Compact content */}
  </div>
</section>
```

---

## 📦 Container Standards

All sections use consistent container patterns for content width and horizontal padding.

### Standard Container

```jsx
<div className="max-w-7xl mx-auto px-4">
  {/* Content */}
</div>
```

**Properties**:
- **max-w-7xl**: Maximum width of `80rem` (1280px)
- **mx-auto**: Centered horizontally
- **px-4**: `1rem` (16px) horizontal padding on mobile

**Why `px-4`?**: Provides 16px gutters on mobile, preventing content from touching screen edges.

### Container Variants

#### Narrow Container (prose, articles)
```jsx
<div className="max-w-3xl mx-auto px-4">
  <article className="prose">
    {/* Long-form content */}
  </article>
</div>
```

- **max-w-3xl**: `48rem` (768px) for optimal reading line length
- **Use**: Blog posts, documentation, legal pages

#### Wide Container (full-bleed)
```jsx
<div className="max-w-full px-4">
  {/* Full-width content */}
</div>
```

- **max-w-full**: No maximum width constraint
- **Use**: Image galleries, full-width data tables

#### Contained Container (cards, forms)
```jsx
<div className="max-w-md mx-auto px-4">
  <form className="space-y-4">
    {/* Form fields */}
  </form>
</div>
```

- **max-w-md**: `28rem` (448px) for focused content
- **Use**: Login forms, signup flows, narrow modals

### Responsive Horizontal Padding

```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content with increasing padding at larger screens */}
</div>
```

**Breakpoint Padding**:
- `px-4`: 16px on mobile (default)
- `sm:px-6`: 24px on small screens (640px+)
- `lg:px-8`: 32px on large screens (1024px+)

**When to use**: Premium sections like hero, testimonials, or pricing where extra breathing room is desired.

---

## 🧩 Component Spacing Patterns

### Stack Spacing (Vertical)

Use `space-y-{size}` for consistent vertical gaps between child elements.

```jsx
{/* Form fields */}
<form className="space-y-4">
  <div>{/* Field 1 */}</div>
  <div>{/* Field 2 */}</div>
  <div>{/* Field 3 */}</div>
</form>

{/* Content sections */}
<article className="space-y-6">
  <p>Paragraph 1</p>
  <p>Paragraph 2</p>
  <p>Paragraph 3</p>
</article>

{/* Card stack */}
<div className="space-y-8">
  <Card />
  <Card />
  <Card />
</div>
```

**Common Values**:
- `space-y-2`: Tight (8px) - Labels and inputs
- `space-y-4`: Default (16px) - Form fields, list items
- `space-y-6`: Comfortable (24px) - Paragraphs, sections
- `space-y-8`: Generous (32px) - Major content blocks

### Grid Gaps

Use `gap-{size}` for consistent spacing in grid layouts.

```jsx
{/* Feature grid */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <FeatureCard />
  <FeatureCard />
  <FeatureCard />
</div>

{/* Tight grid (icons, avatars) */}
<div className="grid grid-cols-4 gap-4">
  <Icon />
  <Icon />
  <Icon />
  <Icon />
</div>

{/* Responsive gap */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
  <Card />
  <Card />
</div>
```

**Common Values**:
- `gap-4`: Compact (16px) - Dense grids
- `gap-6`: Default (24px) - Standard card grids
- `gap-8`: Spacious (32px) - Feature grids
- `gap-12`: Extra spacious (48px) - Hero split layouts

### Flex Gaps

Use `gap-{size}` for flex layouts (replaces margin-based spacing).

```jsx
{/* Button group */}
<div className="flex gap-4">
  <button>Primary</button>
  <button>Secondary</button>
</div>

{/* Navigation */}
<nav className="flex gap-6">
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/features">Features</a>
</nav>

{/* Icon with text */}
<div className="flex items-center gap-2">
  <Icon />
  <span>Label</span>
</div>
```

**Common Values**:
- `gap-2`: Tight (8px) - Icon + label
- `gap-4`: Default (16px) - Buttons, nav items
- `gap-6`: Comfortable (24px) - Major navigation

### Card Padding

```jsx
{/* Standard card */}
<div className="bg-white rounded-lg shadow-md p-6">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

{/* Compact card */}
<div className="bg-white rounded-lg shadow-sm p-4">
  <p>Compact content</p>
</div>

{/* Generous card */}
<div className="bg-white rounded-lg shadow-lg p-8">
  <h2>Feature Title</h2>
  <p>Feature description</p>
</div>
```

**Common Values**:
- `p-4`: Compact cards (16px)
- `p-6`: Standard cards (24px) **← Most common**
- `p-8`: Feature/highlight cards (32px)

---

## 📱 Responsive Breakpoints

Project Valine uses Tailwind's default breakpoint system.

### Breakpoint Reference

| Prefix | Min Width | Device | Spacing Strategy |
|--------|-----------|--------|------------------|
| `(base)` | 0px | Mobile portrait | Compact (py-10, px-4, gap-4) |
| `sm:` | 640px | Mobile landscape | Slight increase (px-6) |
| `md:` | 768px | Tablet | Medium spacing (py-12, gap-6) |
| `lg:` | 1024px | Desktop | Desktop spacing (py-16, px-8, gap-8) |
| `xl:` | 1280px | Large desktop | Same as lg (max-w-7xl caps width) |
| `2xl:` | 1536px | Extra large | Same as lg |

### Mobile-First Approach

Always start with mobile styles and scale up.

```jsx
{/* ✅ Good: Mobile-first */}
<section className="py-10 md:py-12 lg:py-16">
  <div className="max-w-7xl mx-auto px-4 lg:px-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* Content */}
    </div>
  </div>
</section>

{/* ❌ Bad: Desktop-first (harder to maintain) */}
<section className="py-16 md:py-12 sm:py-10">
  {/* Confusing override cascade */}
</section>
```

### Common Responsive Patterns

#### Responsive Section
```jsx
<section className="py-10 lg:py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-3xl lg:text-4xl mb-6 lg:mb-8">
      Section Title
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
      {/* Cards */}
    </div>
  </div>
</section>
```

#### Responsive Text Spacing
```jsx
<div className="space-y-4 md:space-y-6">
  <h1 className="text-4xl md:text-5xl lg:text-6xl">
    Hero Heading
  </h1>
  <p className="text-lg md:text-xl">
    Subheading
  </p>
</div>
```

#### Responsive Flexbox
```jsx
<div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center">
  <div className="flex-1">Left content</div>
  <div className="flex-1">Right content</div>
</div>
```

---

## 🎯 Examples from Codebase

### Landing Page Hero Section

```jsx
// File: src/components/landing/HeroSection.jsx
<section className="py-16 md:py-20 lg:py-24 bg-gradient-to-br from-primary/5 via-white to-secondary/5">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex flex-col items-center text-center space-y-8">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
        Welcome to Project Valine
      </h1>
      <p className="text-xl md:text-2xl text-neutral-600 max-w-3xl">
        Build faster, ship better
      </p>
      <div className="flex gap-4">
        <button className="px-6 py-3">Get Started</button>
        <button className="px-6 py-3">Learn More</button>
      </div>
    </div>
  </div>
</section>
```

**Spacing Breakdown**:
- Section: `py-16 md:py-20 lg:py-24` (64px → 80px → 96px)
- Container: `max-w-7xl mx-auto px-4` (1280px max, 16px gutters)
- Content stack: `space-y-8` (32px gaps between elements)
- Button group: `gap-4` (16px gap between buttons)
- Button padding: `px-6 py-3` (24px horizontal, 12px vertical)

### Feature Grid Section

```jsx
// File: src/components/landing/FeatureGridSection.jsx
<section className="py-16 bg-white">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-12">
      Key Features
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {features.map(feature => (
        <div key={feature.id} className="p-6 bg-neutral-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">
            {feature.title}
          </h3>
          <p className="text-neutral-600">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Spacing Breakdown**:
- Section: `py-16` (64px top/bottom)
- Heading margin: `mb-12` (48px gap before grid)
- Grid gap: `gap-8` (32px between cards)
- Card padding: `p-6` (24px all sides)
- Card title margin: `mb-4` (16px gap before description)

### Marketing Footer

```jsx
// File: src/components/MarketingFooter.jsx
<footer className="py-12 bg-neutral-900 text-white">
  <div className="max-w-7xl mx-auto px-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Footer columns */}
    </div>
    <div className="mt-12 pt-8 border-t border-neutral-700">
      <p className="text-center text-neutral-400">
        © 2025 Project Valine
      </p>
    </div>
  </div>
</footer>
```

**Spacing Breakdown**:
- Footer: `py-12` (48px top/bottom)
- Grid: `gap-8` (32px between columns)
- Copyright section: `mt-12 pt-8` (48px margin, 32px padding after border)

### Form Layout

```jsx
// File: src/pages/Login.jsx
<form className="space-y-6 max-w-md mx-auto">
  <div>
    <label className="block text-sm font-medium mb-2">
      Email
    </label>
    <input className="w-full px-4 py-2 border rounded-lg" />
  </div>
  <div>
    <label className="block text-sm font-medium mb-2">
      Password
    </label>
    <input className="w-full px-4 py-2 border rounded-lg" />
  </div>
  <button className="w-full px-6 py-3 bg-primary text-white rounded-lg">
    Sign In
  </button>
</form>
```

**Spacing Breakdown**:
- Form stack: `space-y-6` (24px between fields)
- Label margin: `mb-2` (8px gap before input)
- Input padding: `px-4 py-2` (16px horizontal, 8px vertical)
- Button padding: `px-6 py-3` (24px horizontal, 12px vertical)

---

## ✅ Best Practices

### Do's ✅

- **Use Tailwind spacing utilities** - Consistent with design system
- **Mobile-first responsive** - Start with mobile, scale up
- **Consistent section padding** - py-10 (mobile) → py-16 (desktop)
- **Use gap over margins** - For flex/grid layouts (cleaner)
- **Container pattern** - max-w-7xl mx-auto px-4 on all sections
- **Vertical rhythm** - space-y-{size} for consistent stacking

### Don'ts ❌

- **Arbitrary values** - Avoid `p-[13px]` or custom pixel values
- **Inconsistent section padding** - Pick py-10/12/16, stick to it
- **Skipping breakpoints** - Use base → md → lg for smooth scaling
- **Margin collisions** - Prefer gap/space-y over manual margins
- **Negative margins** - Rare cases only (prefer layout adjustments)
- **Hardcoded pixels** - Use Tailwind tokens (`p-4` not `padding: 16px`)

---

## 🔧 Troubleshooting

### Issue: Content touching screen edges on mobile

**Solution**: Add `px-4` to container
```jsx
<div className="max-w-7xl mx-auto px-4">
  {/* Content */}
</div>
```

### Issue: Uneven spacing between sections

**Solution**: Use consistent section padding
```jsx
{/* All sections use same pattern */}
<section className="py-10 lg:py-16">
  {/* Section 1 */}
</section>
<section className="py-10 lg:py-16">
  {/* Section 2 */}
</section>
```

### Issue: Horizontal scroll on mobile

**Solution**: Ensure all content uses max-w and doesn't exceed viewport
```jsx
{/* ✅ Good */}
<div className="max-w-7xl mx-auto px-4">
  <img src="..." className="w-full" alt="..." />
</div>

{/* ❌ Bad */}
<img src="..." width="1200" alt="..." />
```

### Issue: Spacing looks different across browsers

**Solution**: Ensure Tailwind CSS is properly configured and imported
```jsx
// vite.config.js
import tailwindcss from 'tailwindcss'

export default {
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
}
```

---

## 📚 Related Documentation

- [Accessibility Documentation](../a11y/README.md) - WCAG AA compliance
- [QA Documentation](../qa/README.md) - Testing and quality gates
- [Frontend Patterns](../frontend/) - Component patterns and conventions
- [Tailwind Documentation](https://tailwindcss.com/docs/spacing) - Official Tailwind spacing docs

---

## 🎯 Quick Reference

### Section Padding

```jsx
{/* Standard */}
<section className="py-10 lg:py-16">

{/* Hero (extra) */}
<section className="py-16 lg:py-24">

{/* Compact */}
<section className="py-8 lg:py-12">
```

### Container

```jsx
{/* Standard */}
<div className="max-w-7xl mx-auto px-4">

{/* Narrow (prose) */}
<div className="max-w-3xl mx-auto px-4">

{/* Form */}
<div className="max-w-md mx-auto px-4">
```

### Component Spacing

```jsx
{/* Stack (vertical) */}
<div className="space-y-6">

{/* Grid */}
<div className="grid gap-8">

{/* Flex */}
<div className="flex gap-4">
```

---

**Last Updated**: November 12, 2025  
**Phase**: Accessibility & Visual QA Sweep  
**Branch**: `copilot/a11y-visual-qa-sweep`  
**Status**: ✅ Complete
