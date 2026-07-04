# Phase 1 Quickstart: Blog System

End-to-end validation walkthrough. Each step maps to acceptance scenarios in `spec.md` and the contracts in `contracts/`.

## Prerequisites
- Node 18+ (repo toolchain Node 23), npm.
- The `blog/` sub-project scaffolded with dependencies installed.

## 1. Local render (FR-007, FR-008, FR-010, FR-013)
```bash
cd blog
npm install
npm run dev
```
Verify in the browser:
- `/blog/` lists sample posts newest-first with image, title, excerpt, author, date.
- `/blog/<slug>/` renders title, featured image, author, date, body, inline images.
- `/blog/rss.xml` and the sitemap load and are valid.
- Header/footer match the live site; nav/footer links point to `https://www.yahsl.org/...` (absolute).
- A sample post with `draft: true` does NOT appear anywhere. (FR-005)

## 2. Local CMS editorial workflow (FR-001, FR-002, FR-003, FR-004)
In one terminal run the local CMS backend, in another run the dev server:
```bash
cd blog
npx decap-server          # local Git-less CMS backend for testing
npm run dev
```
- Open `/blog/admin/`.
- Create a new article: title, author, publish date, excerpt, featured image, body with an inline image.
- Confirm the slug auto-generates from the title and can be overridden.
- Save as draft → move to review → publish. Confirm a Markdown file appears in `blog/src/content/blog/` and the image in `blog/src/assets/uploads/`.

## 3. Build + quality gate (FR-005, FR-006, FR-009, FR-010, FR-014)
```bash
cd blog
npm test                  # Vitest: schema + rendered-output contracts (green)
npm run build && npm run preview
```
Verify against `blog/dist`:
- Draft posts absent from listing, routes, RSS, and sitemap.
- Uploaded images optimized (resized/compressed WEBP); oversized inputs rejected/compressed by the guard.
- Article HTML has unique title, meta description (excerpt default), OG image (featured default), canonical URL on `www.yahsl.org/blog/...`.
- Run **Lighthouse** on `/blog/` and an article: Performance ≥ 90, SEO ≥ 90, Accessibility ≥ 90.

## 4. Deploy + proxy + auth (FR-011, FR-012, FR-016)
1. Create the blog **Netlify site** from the `SUBiango/yah` repo: base directory `blog`, build `npm run build`, publish `blog/dist`; set the ignore-build command to skip when `blog/**` is unchanged.
2. Enable **Netlify Identity + Git Gateway** on the blog site; set Identity redirect/callback URLs to the **main domain** (`https://www.yahsl.org/blog/admin`). If Identity cannot be provisioned, apply the GitHub-OAuth fallback (see `research.md`).
3. On the **main** site, add root `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/blog/*"
     to = "https://<blog-site>.netlify.app/blog/:splat"
     status = 200
     force = true
   ```
4. Validate live:
   - `https://www.yahsl.org/blog/` loads with the URL staying on the main domain; assets and links resolve.
   - `https://www.yahsl.org/blog/admin/` loads and an Identity login completes end-to-end (callback on the main domain).
   - If any `/blog/...` path 404s, adjust the proxy `to` splat mapping (`/blog/:splat` vs `:splat`) and redeploy.
   - Confirm a bad blog deploy can be rolled back on the blog site without affecting the main site. (FR-012)

## Success criteria
All contract assertions pass, Lighthouse gates met, editorial workflow publishes to the live `/blog` on the main domain, and the existing site's build/deploy remains unchanged.
