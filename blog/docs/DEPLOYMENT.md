# Production Deployment Guide — YAH Blog

How to deploy the Astro blog to production and wire it under
`https://www.yahsl.org/blog`. One-time setup; after that, publishing is
automatic (see [PUBLISHING.md](./PUBLISHING.md)).

**Audience:** administrator / developer with access to the Netlify account and
the `SUBiango/yah` GitHub repo.

---

## Architecture recap

Two independent Netlify sites, one GitHub repo:

```
github.com/SUBiango/yah
├── (repo root)         → MAIN SITE  (existing Netlify site — unchanged)
│   └── netlify.toml     → adds the /blog/* proxy (the only change to the main site)
└── blog/               → BLOG SITE  (new Netlify site, base directory = blog)
    └── netlify.toml     → build/publish/ignore config for the blog
```

Visitors hit `www.yahsl.org/blog/...`. The main site proxies (`status=200`,
`force=true`) to the blog site, so the browser URL stays on the main domain.
The blog is built with Astro `base: '/blog'`, so its output already lives under
`/blog`.

- Main-site build/deploy is **untouched** apart from the proxy.
- The blog builds, deploys, and rolls back **independently**.

---

## Prerequisites

- [ ] Admin access to the Netlify team that owns the main `www.yahsl.org` site.
- [ ] Admin/push access to `github.com/SUBiango/yah`.
- [ ] The `003-blog-system` branch merged to `main` (Decap commits to `main`).
- [ ] Node 18+ locally if you want to test the build first (`cd blog && npm ci && npm run build`).

---

## Step 1 — Create the blog Netlify site

1. Netlify → **Add new site → Import an existing project** → pick `SUBiango/yah`.
2. Configure build settings:
   - **Base directory:** `blog`
   - **Build command:** `npm run build`  (already in `blog/netlify.toml`)
   - **Publish directory:** `blog/dist`  (already in `blog/netlify.toml`)
   - **Production branch:** `main`
3. Deploy. Note the generated URL, e.g. `https://yah-blog-xyz.netlify.app`.
4. Sanity-check the raw site: open `https://<blog-site>.netlify.app/blog/` — the
   listing should render (styling/links may look off here because it expects to
   be served from the main domain; that's fine, the proxy fixes it).

> `blog/netlify.toml` also sets an **ignore** rule so the blog only rebuilds when
> files under `blog/` change — commits that touch only the main site won't
> trigger a blog build.

---

## Step 2 — Enable authentication (Netlify Identity + Git Gateway)

Writers log in through the CMS without a GitHub account, via Identity + Git Gateway.

1. On the **blog** Netlify site → **Integrations / Identity** → **Enable Identity**.
2. **Identity → Services → Git Gateway → Enable Git Gateway.**
3. **Identity → Registration:** set to **Invite only** (recommended) so only
   invited staff can access the CMS.
4. **Identity → Emails / Site URL:** set the Identity **site URL** and email
   redirect templates to the **main domain**:
   `https://www.yahsl.org/blog/admin/` — NOT the `.netlify.app` URL. If this
   points at `.netlify.app`, invite/login links will misdirect writers.
5. Invite writers: **Identity → Invite users** → enter their emails. They receive
   an email; the link should open `www.yahsl.org/blog/admin/` and prompt them to
   set a password.

### ⚠️ If Netlify Identity is unavailable

Netlify Identity is in maintenance mode and new instances are restricted on some
plans. If you can't enable it, use the **GitHub OAuth fallback** documented in
`specs/003-blog-system/research.md`:

- Change `blog/public/admin/config.yml` `backend` to:
  ```yaml
  backend:
    name: github
    repo: SUBiango/yah
    branch: main
  ```
- Deploy a small OAuth relay (Netlify Function or the community
  `netlify-cms-oauth-provider`) and set its URL as the CMS `base_url`.
- Writers then authenticate with GitHub accounts that have access to the repo.

---

## Step 3 — Wire the proxy on the main site

The proxy already exists in the repo-root `netlify.toml`; you only replace the
placeholder with the real blog-site subdomain.

1. Edit **`netlify.toml`** at the repo root:
   ```toml
   [[redirects]]
     from = "/blog/*"
     to = "https://<BLOG-SITE>.netlify.app/:splat"   # ← replace <BLOG-SITE>
     status = 200
     force = true
   ```
   Replace `<BLOG-SITE>` with the Step 1 subdomain (e.g. `yah-blog`). The proxy
   **strips** the `/blog` prefix: Astro's `base: '/blog'` rewrites link/asset URLs
   to `/blog/...` but does **not** nest the physical output under `dist/blog/` —
   the blog site serves its files at the root (`/index.html`, `/_astro/...`,
   `/rss.xml`). So `www.yahsl.org/blog/rss.xml` → `yah-blog.netlify.app/rss.xml`.
2. Commit and push to `main`. The **main** Netlify site redeploys and picks up the proxy.

---

## Step 4 — Validate production

- [ ] `https://www.yahsl.org/blog/` loads, styled correctly, URL stays on the main domain.
- [ ] An article opens: `https://www.yahsl.org/blog/welcome-to-the-yah-blog/`.
- [ ] `https://www.yahsl.org/blog/rss.xml` and `…/blog/sitemap-index.xml` return valid XML.
- [ ] `https://www.yahsl.org/blog/admin/` loads the CMS and an invited writer can log in
      (Identity callback completes on the main domain).
- [ ] Nav/footer links point back to the main site pages and work.
- [ ] Run Lighthouse on the live listing + an article: Performance / SEO / Accessibility ≥ 90.

### If `/blog/...` paths 404 through the proxy

The splat mapping is the most common misconfiguration. Try the alternatives in
the main-site `netlify.toml` and redeploy:

| Symptom | Try `to =` |
|---|---|
| Everything 404s through the proxy | `https://<BLOG-SITE>.netlify.app/:splat` (current default — strips `/blog`) |
| Double `/blog/blog/` appears, or assets 404 | your blog deploy nests output under `dist/blog/`; then use `.../blog/:splat` |

> Verify the blog site's own structure first: `curl -o /dev/null -w '%{http_code}' https://<BLOG-SITE>.netlify.app/rss.xml`. If that returns 200 (files at root), use the stripping mapping (the default above).

---

## Ongoing operations

- **Publishing content:** automatic via the CMS — see [PUBLISHING.md](./PUBLISHING.md).
- **Rollback:** on the **blog** Netlify site → **Deploys** → pick a previous deploy →
  **Publish deploy**. The main site is unaffected.
- **Local build check:** `cd blog && npm ci && npm run build && npm run preview`.
- **Tests:** `cd blog && npm test` (schema + rendered-output contracts).
- **Dependency/image rules:** the build runs `scripts/check-images.mjs` first and
  **fails** if any upload exceeds 2000px / 1MB or is not JPG/PNG/WEBP.

---

## Environment / config summary

| Setting | Value |
|---|---|
| Blog Netlify base directory | `blog` |
| Build command | `npm run build` |
| Publish directory | `blog/dist` |
| Production branch | `main` |
| Astro `site` / `base` | `https://www.yahsl.org` / `/blog` |
| CMS backend | `git-gateway` (branch `main`), editorial workflow |
| Media folder | `blog/src/assets/uploads/` |
| Identity callback URL | `https://www.yahsl.org/blog/admin/` |

See also: `specs/003-blog-system/quickstart.md` (validation walkthrough) and
`specs/003-blog-system/research.md` (decisions & fallbacks).
