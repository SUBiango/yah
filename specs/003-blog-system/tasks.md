# Tasks: Blog System

**Input**: Design documents from `/specs/003-blog-system/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are relative to the repo root (`Website/yah/`). The blog sub-project lives under `blog/`.

## Path Conventions
- Blog sub-project: `blog/src/`, `blog/public/`, `blog/tests/`
- Main-site touch point: repo-root `netlify.toml` (only file changed on the existing site)

---

## Phase 3.1: Setup
- [ ] T001 Scaffold Astro project in `blog/` (minimal TS template); add `blog/.nvmrc` (Node 18+), `blog/tsconfig.json`.
- [ ] T002 Install dependencies in `blog/`: `astro`, `@astrojs/rss`, `@astrojs/sitemap`, `sharp`, `decap-server` (dev), plus Decap CMS via CDN in admin. Add `dev`/`build`/`preview`/`cms`/`test` scripts to `blog/package.json`.
- [ ] T003 Configure `blog/astro.config.mjs`: `site: 'https://www.yahsl.org'`, `base: '/blog'`, add `@astrojs/sitemap` integration.
- [ ] T004 [P] Configure Vitest (`blog/vitest.config.ts`) and linting/formatting for the `blog/` sub-project.
- [ ] T005 [P] Copy `css/main.css` → `blog/public/main.css` and `assets/logo.png` → `blog/public/assets/logo.png`; add blog-scoped `blog/public/robots.txt` referencing the blog sitemap.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE & FAIL BEFORE 3.3
**CRITICAL: Write these tests and confirm they FAIL before any implementation.**
- [ ] T006 [P] Content-schema contract test in `blog/tests/content-schema.test.ts` from `contracts/content-schema.contract.md` (valid fixture passes; missing-title / missing-featuredImage / bad-date fail). Include fixtures under `blog/tests/fixtures/`.
- [ ] T007 [P] Draft-exclusion + listing-order test in `blog/tests/output.test.ts` (draft posts absent from listing/routes/RSS/sitemap; non-drafts sorted by `publishDate` desc).
- [ ] T008 [P] SEO-tags test in `blog/tests/seo.test.ts` (unique title; meta description = excerpt default; og:image = featuredImage default; canonical on `www.yahsl.org/blog/<slug>/`).
- [ ] T009 [P] Feed/sitemap validity test in `blog/tests/feeds.test.ts` (`/blog/rss.xml` valid RSS 2.0; blog sitemap valid and base-path scoped).

## Phase 3.3: Content Model (ONLY after 3.2 tests fail)
- [ ] T010 Implement `blog/src/content.config.ts`: `blog` collection with the BlogPost Zod schema per `data-model.md` (title, slug?, author, publishDate, featuredImage `image()`, ogImage?, excerpt, metaDescription?, tags default [], draft default false).
- [ ] T011 [P] Add seed content: 2–3 sample posts in `blog/src/content/blog/*.md` (incl. one `draft: true`) with images in `blog/src/assets/uploads/` to satisfy tests and build.

## Phase 3.4: Layout & Design (reuse existing site)
- [ ] T012 [P] `blog/src/components/Nav.astro` — port nav from `index.html:54-78`; convert relative links to absolute `https://www.yahsl.org/...`; add active "Blog" link.
- [ ] T013 [P] `blog/src/components/Footer.astro` — port footer from `index.html:253-282` with absolute links.
- [ ] T014 `blog/src/layouts/BaseLayout.astro` — `<head>` SEO block (title, description, canonical, OG/Twitter) + Nav + `<slot/>` + Footer; loads `main.css` and Font Awesome (same cdnjs link as the main site).

## Phase 3.5: Pages & Feeds
- [ ] T015 [P] `blog/src/components/PostCard.astro` — listing card (featured image via `<Image>`, title, excerpt, author, date).
- [ ] T016 `blog/src/pages/index.astro` — `/blog/` listing: query non-draft posts, sort by `publishDate` desc, render PostCards.
- [ ] T017 `blog/src/pages/[slug].astro` — `getStaticPaths()` (honor slug override else slugify title), render title/featured image/author/date/body/inline images + per-article SEO via BaseLayout.
- [ ] T018 [P] `blog/src/pages/rss.xml.js` — `@astrojs/rss` feed over non-draft posts.
- [ ] T019 Verify `@astrojs/sitemap` output respects `base` and does not clash with the main site's root sitemap; finalize `blog/public/robots.txt`.

## Phase 3.6: Image Optimization (enforcement)
- [ ] T020 Use `astro:assets` `<Image>` for featured/inline images with capped width (2000) and WEBP output in PostCard and `[slug].astro`.
- [ ] T021 [P] Add prebuild sharp guard script (`blog/scripts/check-images.mjs`) that fails/compresses uploads >1MB or >2000px or of unsupported format; wire into the `build` script.

## Phase 3.7: CMS (Decap)
- [ ] T022 `blog/public/admin/index.html` — Decap CMS entry + Netlify Identity widget.
- [ ] T023 `blog/public/admin/config.yml` — `backend: git-gateway`, `branch: main`, `publish_mode: editorial_workflow`, `media_folder: blog/src/assets/uploads`, `public_folder` set; `blog` collection fields matching the content model with auto-slug (override) and `draft` boolean.
- [ ] T024 Verify local CMS flow: `npx decap-server` + `npm run dev`, create draft → review → publish, confirm Markdown + optimized image land in `blog/src/`.

## Phase 3.8: Deploy Wiring
- [ ] T025 Create the blog Netlify site from `SUBiango/yah`: base directory `blog`, build `npm run build`, publish `blog/dist`; set ignore-build command (`git diff --quiet HEAD^ HEAD -- blog/`).
- [ ] T026 Enable Netlify Identity + Git Gateway on the blog site; set Identity redirect/callback URLs to the main domain (`https://www.yahsl.org/blog/admin`). If Identity unavailable, apply GitHub-OAuth fallback per `research.md`.
- [ ] T027 Add repo-root `netlify.toml` (main site) with the `/blog/*` → `https://<blog-site>.netlify.app/blog/:splat` proxy (`status=200`, `force=true`). **Only touch to the existing site.**

## Phase 3.9: Validation (Polish)
- [ ] T028 Run `npm test` and `npm run build` — all contract tests green, build passes; confirm schema-invalid fixture fails the build.
- [ ] T029 Run Lighthouse on `/blog/` and a representative article — Performance ≥ 90, SEO ≥ 90, Accessibility ≥ 90; fix regressions.
- [ ] T030 Execute `quickstart.md` §4 live: verify URL stays on main domain, assets/links resolve, Identity login completes, adjust proxy splat if needed, confirm independent rollback.
- [ ] T031 [P] (Optional, confirm with user) Add a "Blog" nav link to the existing main-site HTML pages for discoverability — a change to files the spec keeps untouched, so gate on approval.

---

## Dependencies
- Setup (T001–T005) before everything.
- Tests (T006–T009) MUST fail before content model/pages (T010+).
- T010 (schema) blocks T016/T017 (pages query the collection) and the tests turning green.
- T012–T014 (layout) block T016/T017 (pages use BaseLayout).
- T015 (PostCard) blocks T016.
- T020/T021 (images) inform T015/T017.
- T022/T023 (CMS) before T024 (CMS flow).
- T025/T026 before T027 (need blog site URL + Identity for the proxy/login).
- Everything before T028–T030 validation.

## Parallel Example
```
# After setup, launch the failing tests together (different files):
Task: "Content-schema contract test in blog/tests/content-schema.test.ts"
Task: "Draft-exclusion + listing-order test in blog/tests/output.test.ts"
Task: "SEO-tags test in blog/tests/seo.test.ts"
Task: "Feed/sitemap validity test in blog/tests/feeds.test.ts"

# Layout components in parallel (different files):
Task: "Nav.astro port with absolute links"
Task: "Footer.astro port with absolute links"
```

## Validation Checklist
- [x] All contracts have corresponding tests (content-schema → T006; rendered-output → T007/T008/T009)
- [x] The single entity (BlogPost) has a model task (T010)
- [x] All tests come before implementation (Phase 3.2 before 3.3+)
- [x] Parallel tasks are independent files
- [x] Each task specifies exact file paths
- [x] No [P] task modifies the same file as another [P] task
