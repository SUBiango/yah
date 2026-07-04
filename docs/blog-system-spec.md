# Blog System Specification

## Overview

Add a blog to the existing organizational website without modifying the current HTML pages or their Netlify build pipeline.

The blog is built as a **standalone Astro application**, deployed as its own Netlify site, and published under the `/blog` path of the existing website via a proxy redirect. The existing site's repo, build process, and deploy history remain completely untouched.

The system supports non-technical content writers through a browser-based content management interface powered by Decap CMS.

---

## Goals

### Business Goals

* Allow staff members to publish blog articles without coding knowledge.
* Keep hosting costs at or near zero.
* Retain the existing website's repo and build pipeline unchanged.
* Support article images embedded within content.
* Maintain fast page load speeds and strong SEO, consolidated under the main domain (not a subdomain).

### Technical Goals

* Static site generation.
* No database, no backend server.
* Automatic deployment through Netlify.
* Content stored in GitHub.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Frontend | Astro |
| CMS | Decap CMS |
| Source control | GitHub |
| Hosting | Netlify (two separate sites — see Deployment Topology) |
| Content format | Markdown |
| Auth | Netlify Identity + Git Gateway (confirmed active and supported) |

---

## Deployment Topology

This is the key architectural decision and is called out explicitly rather than left implicit.

### Two-site + proxy-redirect model

* The **existing site** stays on its current Netlify site, repo, and build pipeline — no changes to its code or deploy process.
* The **blog** is a separate Astro project, deployed as its **own Netlify site** (its own repo, its own build, its own environment variables).
* The two are stitched together with a single proxy redirect added to the existing site's `netlify.toml`:

```toml
[[redirects]]
  from = "/blog/*"
  to = "https://your-blog-site.netlify.app/:splat"
  status = 200
  force = true
```

`status = 200` makes this a **proxy**, not a redirect — the browser URL stays `yourdomain.org/blog/...` while Netlify fetches the response from the blog site behind the scenes.

### Astro configuration

Because the blog is served under a subpath, set the base path so generated links, assets, sitemap, and RSS URLs resolve correctly:

```js
// astro.config.mjs
export default defineConfig({
  base: '/blog',
  site: 'https://yourdomain.org/blog',
});
```

### Why this approach

* The existing site's deploy pipeline is genuinely untouched — no risk of breaking it during blog setup or ongoing blog changes.
* Independent build/deploy history, environment variables, and Identity/Git Gateway config for the blog — no interference between the two sites.
* Independent rollbacks: a bad blog deploy can't take down the main site and vice versa.
* Path-based URLs (`/blog/...`) consolidate SEO authority under the main domain, unlike a `blog.subdomain` approach, which search engines tend to treat as a more separate property.

### Known trade-offs

* Proxied requests add a small extra edge-to-edge hop (negligible in practice).
* `/blog/admin` (the CMS) is also proxied through this rule — **Netlify Identity's redirect/callback URLs must point to the main domain** (`yourdomain.org`), not the blog site's `.netlify.app` URL, or the login flow will misdirect writers.

---

## Site Structure

```text
/  (existing Netlify site — untouched)
├── index.html
├── about.html
├── contact.html
└── netlify.toml          ← only file touched: adds the /blog/* proxy redirect

blog/  (new, separate Netlify site — Astro project)
├── src/
│   ├── pages/
│   │   ├── index.astro         → /blog/
│   │   └── [slug].astro        → /blog/[slug]/
│   └── content/
├── public/
│   ├── admin/                  → /blog/admin/ (Decap CMS)
│   └── uploads/
└── astro.config.mjs
```

---

## User Roles

### Writer

**Permissions**
* Create, edit, and publish articles
* Upload images
* Save drafts

**Restrictions**
* Cannot modify application code
* Cannot modify CMS configuration

### Administrator

**Permissions**
* Configure CMS
* Manage repository
* Manage deployments (both the main site and the blog site)

---

## Editorial Workflow

To avoid accidental live publishes, the CMS runs in **editorial workflow** mode rather than committing writer changes straight to the production branch:

```yaml
# config.yml
publish_mode: editorial_workflow
```

This gives each entry a draft → in review → ready states, backed by branches/PRs under the hood, so a writer's in-progress article never triggers a live deploy until explicitly published.

---

## Content Model

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| Title | String | Yes | |
| Slug | String | Yes | **Auto-generated from Title**, with manual override available. Prevents inconsistent casing/spacing/duplicates from manual entry. |
| Author | String | Yes | |
| Publish Date | Date | Yes | |
| Featured Image | Image | Yes | Also used as the default Open Graph image (see SEO Requirements) unless a dedicated OG image is uploaded. |
| Excerpt | Text | Yes | Also used as the default meta description unless overridden. |
| Body Content | Rich Text / Markdown | Yes | |
| Tags | List | No | |
| Draft | Boolean | No | Draft posts are excluded from the production build (filtered at the Astro content-collection level). |

---

## Image Requirements

### Supported usage

* Featured image
* Inline images within articles

### Upload behavior

Images are uploaded through Decap CMS to:

```text
/public/uploads/
```

### Enforcement, not just guidance

Recommended limits (max width 2000px, max file size 1MB, JPG/PNG/WEBP) are **enforced automatically** rather than left to writer discretion, since non-technical writers will otherwise upload unoptimized phone photos and put the performance target at risk:

* Astro's built-in image integration (`astro:assets`) processes and resizes images at build time.
* A Netlify build plugin or pre-commit hook compresses uploads exceeding the size/dimension limits before they reach production.

---

## CMS Requirements

### CMS URL

```text
/blog/admin/
```
(Proxied through the main domain — see Deployment Topology.)

### Authentication

* **Netlify Identity** (confirmed active and supported — no migration needed)
* **Git Gateway** backend, so writers authenticate without needing a personal GitHub account
* Identity redirect/callback URLs configured to the **main domain**, not the blog's `.netlify.app` URL

### Writer experience

* No Git knowledge required
* Visual editor, image upload, draft support, publish button
* Editorial workflow (draft/review/publish states) instead of direct-to-main commits

---

## Blog Features

### Blog Listing Page

**Route:** `/blog/`

**Displays:** featured image, title, excerpt, author, publish date — sorted by publish date descending. Draft posts excluded.

### Article Page

**Route:** `/blog/[slug]/`

**Displays:** title, featured image, author, publish date, content, embedded images.

### RSS Feed

**Route:** `/blog/rss.xml`

Generated via Astro's RSS integration so the blog is subscribable — standard expectation for a blog, low implementation cost.

### Sitemap

**Route:** `/blog/sitemap.xml`

Generated via Astro's sitemap integration, respecting the `/blog` base path, to support the SEO goal at the site level (not just per-article).

### Search

Not required for MVP. Can be added later (e.g. client-side search over generated content, or a hosted search service).

### Categories and Tags

* **MVP:** Tags supported in the content model; no dedicated category pages.
* **Future:** Tag archive pages, category archive pages.

---

## SEO Requirements

Each article generates:

* Unique page title
* Meta description (defaults to Excerpt, overridable)
* Open Graph image (defaults to Featured Image, overridable)
* Canonical URL (respecting the `/blog` base path and main domain)

```html
<title>Annual Report 2026</title>
<meta name="description" content="Summary of our activities during 2026." />
<meta property="og:image" content="https://yourdomain.org/blog/uploads/annual-report.jpg" />
<link rel="canonical" href="https://yourdomain.org/blog/annual-report-2026/" />
```

Site-level: `sitemap.xml` and `robots.txt` scoped correctly so they don't conflict with the main site's own SEO files.

---

## Performance Requirements

Target Lighthouse scores:

| Metric | Target |
| --- | --- |
| Performance | 90+ |
| SEO | 90+ |
| Accessibility | 90+ |

Supported by: static generation, enforced image optimization, and the low-overhead proxy topology.

---

## Deployment Flow

```text
Writer edits/publishes article in Decap CMS
        ↓
Editorial workflow: draft → review → publish
        ↓
On publish, Decap CMS commits to GitHub (blog repo)
        ↓
GitHub triggers Netlify build (blog site only)
        ↓
Astro generates static pages (with /blog base path)
        ↓
Content served at yourdomain.org/blog via proxy redirect
        ↓
Existing site's own repo/build/deploy is untouched throughout
```

No manual deployment required, and no risk to the main site's deploy pipeline.

---

## MVP Deliverables

* Astro blog application, deployed as its own Netlify site
* Proxy redirect on the existing site's `netlify.toml` (`/blog/*` → blog site, status 200)
* Decap CMS integration with editorial workflow
* Netlify Identity + Git Gateway auth, callback URLs on the main domain
* Blog listing page, individual article pages
* Auto-generated slugs with manual override
* Featured image + inline image support, with automatic optimization/enforcement
* RSS feed and sitemap.xml
* GitHub-backed content storage
* Responsive design
* Full SEO metadata support (title, description, OG image, canonical URL)

---

## Out of Scope

Not required for MVP:

* User comments
* User registration
* Database
* Newsletter integration
* Analytics dashboard
* Scheduled publishing
* Multi-language support
* Full website migration
* Category archive pages (tags only for MVP)
* On-site search
