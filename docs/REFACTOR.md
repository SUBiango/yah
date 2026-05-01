# Refactoring Plan: Bootstrap → Vanilla CSS3 + JS

**Created:** 2026-02-21  
**Status:** 🟡 In Progress  

---

## Overview

Remove all Bootstrap and SCSS dependencies. Replace with a single `css/main.css` design‑system file (CSS custom properties + vanilla CSS3) and modular per‑page JS files. Font Awesome CDN is retained (independent of Bootstrap).

---

## Current State

| Item | Detail |
|---|---|
| CSS | `css/bootstrap.css` + `css/style.css` — 12,248 lines, 99% Bootstrap |
| SCSS | `scss/bootstrap.scss` + `scss/style.scss` — just `@import 'bootstrap'` |
| Shared JS | `js/bootstrap.bundle.js` + `js/main.js` |
| Per-page JS | `admin.js`, `registration.js`, `scanner.js`, `summit.js` (4 of 14 pages) |
| HTML pages | 14 production pages, all using Bootstrap grid + utility classes |

---

## Target Architecture

```
css/
  main.css              ← single file: variables, reset, layout, components, utilities
js/
  utils.js              ← shared: navbar toggle, smooth scroll, back-to-top, scroll animations
  index.js              ← home: impact counters, hero animations
  about.js              ← about page animations
  contact.js            ← contact form (extracted from main.js)
  projects.js           ← projects page
  news.js               ← news page
  summit.js             ← refactor existing
  registration.js       ← refactor existing
  confirmation.js       ← confirmation page
  admin.js              ← refactor existing
  scanner.js            ← refactor existing
  tools.js              ← tools hub page
  note.js               ← note page
  privacy.js            ← minimal
  terms.js              ← minimal
```

**Delete after migration:**
- `css/bootstrap.css`, `css/style.css`
- `scss/` folder
- `js/bootstrap.bundle.js`, `js/main.js`, `js/admin.js.backup`

---

## css/main.css Sections

```
1.  CSS Custom Properties (design tokens)
2.  Reset (box-sizing, margin, padding, font)
3.  Base (body, typography, links, images)
4.  Layout (.container, .grid variants)
5.  Navigation (.nav, .nav__brand, .nav__menu, .nav__toggle)
6.  Buttons (.btn variants)
7.  Cards (.card, .card__body)
8.  Forms (.form-group, .form-control, .form-label)
9.  Hero sections (.hero, .hero--dark, .hero--accent)
10. Badges (.badge)
11. Utilities (text, spacing, display, visibility)
12. Animations (fade-in, slide-up, pulse, [data-animate])
13. Back-to-top
14. Footer
15. Responsive @media breakpoints
```

---

## Bootstrap Class Migration Map

| Bootstrap | Custom |
|---|---|
| `navbar navbar-expand-lg navbar-light bg-white fixed-top shadow` | `nav nav--light nav--fixed` |
| `navbar-brand` | `nav__brand` |
| `navbar-toggler` | `nav__toggle` |
| `collapse navbar-collapse` | `nav__menu` |
| `navbar-nav ms-auto` | `nav__links` |
| `nav-link` | `nav__link` |
| `nav-link active` | `nav__link nav__link--active` |
| `container` | `container` |
| `row g-4` | `grid` (with `style="--gap:1.5rem"` when needed) |
| `col-lg-6` | grid child (width controlled by parent) |
| `col-md-3` | grid child in `.grid--4` |
| `col-lg-4` | grid child in `.grid--3` |
| `btn btn-primary btn-lg` | `btn btn--primary btn--lg` |
| `btn btn-warning` | `btn btn--accent` |
| `btn btn-outline-light` | `btn btn--outline-light` |
| `btn btn-light btn-lg` | `btn btn--light btn--lg` |
| `card border-0 shadow` | `card` |
| `card-body p-5` | `card__body` |
| `badge bg-light text-dark rounded-pill` | `badge` |
| `badge bg-primary` | `badge badge--primary` |
| `display-4 fw-bold` | `heading--xl` |
| `display-5 fw-bold` | `heading--lg` |
| `display-6 fw-bold` | `heading--md` |
| `lead` | `text--lead` |
| `text-muted` | `text--muted` |
| `text-primary` | `text--primary` |
| `text-warning` | `text--accent` |
| `text-white` | `text--white` |
| `text-white-50` | `text--white-muted` |
| `text-center` | `text-center` |
| `bg-light` | `bg--light` |
| `bg-primary text-white` | `bg--primary` |
| `py-5` | `section` (default padding) |
| `py-6` | `section section--wide` |
| `py-5 bg-light` | `section bg--light` |
| `list-unstyled` | `list--plain` |
| `img-fluid w-100` | handled by CSS reset |
| `d-block` | `display-block` |
| `d-none` | `hidden` |
| `d-flex align-items-center` | `flex-center` |
| `ms-auto` | `ml-auto` |
| `shadow` | `.card` default shadow |
| `shadow-sm` | `shadow--sm` |
| `overflow-hidden rounded` | `rounded overflow-hidden` |
| `min-vh-100` | `min-vh-100` |
| `h-100` | `h-full` |

**`data-bs-toggle="collapse"` / `data-bs-target`** → `data-nav-toggle` handled by `utils.js`

---

## Implementation Phases & Status

### Phase 0 — Save plan ✅
- [x] Write this document to `docs/REFACTOR.md`

### Phase 1 — CSS Design System
- [ ] Create `css/main.css` with all tokens, layout, components

### Phase 2 — Shared JS
- [ ] Create `js/utils.js` (navbar, scroll, animations, back-to-top)

### Phase 3 — HTML pages (in order)
| Page | HTML | JS | Status |
|---|---|---|---|
| `index.html` | migrate classes | create `js/index.js` | ⬜ |
| `about.html` | migrate classes | create `js/about.js` | ⬜ |
| `contact.html` | migrate classes | create `js/contact.js` | ⬜ |
| `projects.html` | migrate classes | create `js/projects.js` | ⬜ |
| `news.html` | migrate classes + fix malformed HTML | create `js/news.js` | ⬜ |
| `summit.html` | migrate classes + inline styles | update `js/summit.js` | ⬜ |
| `registration.html` | migrate classes + inline styles | update `js/registration.js` | ⬜ |
| `confirmation.html` | migrate classes + inline styles | create `js/confirmation.js` | ⬜ |
| `admin.html` | migrate classes + inline styles | update `js/admin.js` | ⬜ |
| `scanner.html` | migrate classes + inline styles | update `js/scanner.js` | ⬜ |
| `tools.html` | migrate classes + inline styles | create `js/tools.js` | ⬜ |
| `note.html` | migrate classes + inline styles | create `js/note.js` | ⬜ |
| `privacy.html` | migrate classes | create `js/privacy.js` | ⬜ |
| `terms.html` | migrate classes | create `js/terms.js` | ⬜ |

### Phase 4 — Cleanup
- [ ] Delete `css/bootstrap.css`
- [ ] Delete `css/style.css`
- [ ] Delete `scss/` folder
- [ ] Delete `js/bootstrap.bundle.js`
- [ ] Delete `js/main.js`
- [ ] Delete `js/admin.js.backup`
- [ ] Update `package.json` (remove `bootstrap`, `sass`)

---

## Risks & Notes

- **Font Awesome** stays as CDN — independent of Bootstrap, no change needed
- **QR scanner** (`scanner.html`) uses `html5-qrcode` CDN — keep as-is
- `news.html` has malformed `<html>` tag (nav markup before `<meta>`) — fix during refactor
- `confirmation.html` (850 lines) has the most inline `<style>` to consolidate
- All 5 existing JS classes (`AdminDashboard`, `RegistrationForm`, `EventScanner`, `SummitRegistration`) are pure vanilla JS — no Bootstrap JS API calls, they migrate cleanly
- Grid approach: CSS Grid with `auto-fit` / `minmax` — fully fluid, no 12-col floats

---

## Design Tokens Reference

```css
:root {
  /* Colors */
  --color-primary:     #037195;
  --color-primary-dk:  #025a75;
  --color-accent:      #ffc107;
  --color-accent-dk:   #e67e22;
  --color-success:     #198754;
  --color-danger:      #dc3545;
  --color-dark:        #212529;
  --color-gray:        #6c757d;
  --color-light:       #f8f9fa;
  --color-border:      #dee2e6;
  --color-white:       #ffffff;
  --color-text:        #212529;
  --color-text-muted:  #6c757d;

  /* Typography */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Spacing */
  --space-xs:  0.5rem;
  --space-sm:  1rem;
  --space-md:  2rem;
  --space-lg:  4rem;
  --space-xl:  6rem;

  /* Borders */
  --radius-sm: 6px;
  --radius:    12px;
  --radius-lg: 20px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-sm: 0 2px 6px rgba(0,0,0,.08);
  --shadow:    0 5px 15px rgba(0,0,0,.10);
  --shadow-lg: 0 15px 35px rgba(0,0,0,.15);

  /* Layout */
  --container-max: 1140px;
  --nav-height:    72px;
  --transition:    0.3s ease;
}
```
