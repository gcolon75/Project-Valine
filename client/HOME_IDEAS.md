# Project Valine — Home Page Content Plan (Ideas, not implemented)

This document lists sections to fill empty space on the home page and notes how to build each one. Keep copy concise and visual-first.

## Sections to add
1. **Hero + Dual CTAs**
   - Headline: “Where creators meet producers.”
   - Sub: One sentence about showcasing portfolios and scripts.
   - Buttons: *Become an Artist* / *Become an Observer*.
   - **Build:** `HeroSection.jsx` with 2-col grid (text left, illustration right).

2. **Global Search**
   - Placeholder: search artists, roles, scripts, tags.
   - Filter chips for Actor, Writer, Director, Playwright, etc.
   - **Build:** `SearchBar.jsx` + `RoleChips.jsx`, route to `/search?q=...&roles=...`.

3. **Value Props (3–4 cards)**
   - Examples: Verified Profiles · Host Scripts & Reels · Smart Matching · Direct Messages.
   - **Build:** `ValueProps.jsx`, map over an array of `{icon, title, body}`.

4. **Featured / Trending Grid**
   - Two tabs: *Featured Creators* · *Trending Scripts*.
   - Image tiles with hover and badges (e.g., “New”, “Rising”). 
   - **Build:** `FeaturedGrid.jsx` with `items: {image, title, subtitle, href, badges:[]}` and tabs.

5. **How It Works (1–2–3)**
   - Steps: Create profile → Upload work → Get discovered / Apply.
   - **Build:** `HowItWorks.jsx` with three step cards and small illustrations.

6. **Testimonials / Success Stories**
   - 2–4 quotes with avatars and names. Optional company/venue logos.
   - **Build:** `TestimonialsCarousel.jsx` (auto-advance, pause on hover).

7. **Categories / Curations**
   - Chips or tiles for Acting, Screenwriting, Playwriting, Voice, Cinematography, etc.
   - **Build:** `CategoryTiles.jsx` linking to pre-filtered search pages.

8. **Stats Bar**
   - Example: “4,820 creators · 1,320 scripts · 9,400 connections made”.
   - **Build:** `StatsBar.jsx` with animated counters (optional).

9. **Trust & Safety strip**
   - Short note on verification, moderation, and takedown policy.
   - **Build:** `TrustSafety.jsx` with lock/shield icon.

10. **Final CTA band**
    - “Ready to showcase your work?” + buttons.
    - **Build:** `FinalCTA.jsx` on a dark background.

## Suggested file layout
```
src/
  components/
    HeroSection.jsx
    SearchBar.jsx
    RoleChips.jsx
    ValueProps.jsx
    FeaturedGrid.jsx
    HowItWorks.jsx
    TestimonialsCarousel.jsx
    CategoryTiles.jsx
    StatsBar.jsx
    TrustSafety.jsx
    FinalCTA.jsx
  pages/
    Home.jsx  // imports the above, in the order shown
```

## Design system notes
- Section width: `max-width: 1200px; margin: 0 auto; padding-inline: 16px;`
- Vertical rhythm: `padding-block: 64px` between sections.
- Maintain the same green CTA color used on Login.
- Prefer image-led sections; keep text blocks to 1–2 sentences.
- Reuse card shadows/radii from the Login cards for visual consistency.