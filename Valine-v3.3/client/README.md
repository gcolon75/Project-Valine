# Valine Drop‑in Patch (Login Fix + Router + Home ideas)

This folder contains:
- A **uniform login** screen with two same‑size cards.
- **Working navigation** using `react-router-dom@6` (cards and buttons navigate).
- A **Home ideas plan** (`HOME_IDEAS.md`) describing what to add later.

## What's inside

```
src/
  App.jsx                 // Example Router wrapper (use if you don't already have one)
  components/
    RoleCard.jsx
  pages/
    Login.jsx
    ArtistAuth.jsx        // placeholders (replace with your real pages)
    ObserverAuth.jsx
  styles/
    login.css
  assets/
    artist.svg
    observer.svg
HOME_IDEAS.md
```

## How to use

### Option A — Quick test (replace your `src/App.jsx` temporarily)
1. Copy `src/` into your project (overwrite if prompted).
2. Ensure you have `react-router-dom` installed:
   ```bash
   npm i react-router-dom
   ```
3. Run your app and visit `/login`. Click the cards/buttons to verify navigation works.

### Option B — Integrate into your existing router
1. Copy `components/RoleCard.jsx`, `pages/Login.jsx`, `pages/ArtistAuth.jsx`, `pages/ObserverAuth.jsx`, `styles/login.css`, and `assets/*` into the same locations in your project.
2. Import the stylesheet once (e.g., in `src/main.jsx` or your global CSS):
   ```js
   import "./styles/login.css";
   ```
3. Add routes in your router:
   ```jsx
   <Route path="/login" element={<Login />} />
   <Route path="/auth/artist" element={<ArtistAuth />} />
   <Route path="/auth/observer" element={<ObserverAuth />} />
   ```
4. If a login button lives inside a `<form>`, be sure it uses `type="button"` to avoid a full page reload.

### SPA hosting note
If hosted on S3/CloudFront/Amplify, add a rewrite rule so all routes serve `index.html`. Otherwise deep links like `/auth/artist` 404 on refresh.

## What was fixed
- **Equal card size:** cards are fixed to `320x460`, images use `object-fit: cover`, content flex pushes the CTA to the bottom so both cards align.
- **Navigation:** cards and CTAs call `useNavigate()`; CTAs have `type="button"` to prevent form submit reloads. The whole card is keyboard accessible.