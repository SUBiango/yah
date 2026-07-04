# Phase 0 Research: Blog System

Resolves the unknowns in the plan's Technical Context. Format: Decision / Rationale / Alternatives.

## 1. CMS authentication backend (resolves FR-016 NEEDS CLARIFICATION)

**Decision**: Use **Netlify Identity + Git Gateway** as specified, but treat availability as a gate to confirm at implementation start. If an Identity instance cannot be enabled on the new blog Netlify site, fall back to Decap's **`git-gateway` via GitHub OAuth** (Decap `backend: github` with an OAuth relay running as a Netlify Function).

**Rationale**: Netlify Identity + Git Gateway lets non-technical Writers authenticate without personal GitHub accounts and matches the source spec. However, Netlify Identity has been in maintenance mode (no new feature work, restricted new provisioning on some plans), so a documented fallback avoids a blocked build. Both options keep content in the GitHub repo and support Decap's editorial workflow.

**Alternatives considered**:
- **Decap `github` backend, no relay** — requires each Writer to have a GitHub account with repo access; rejected as primary because it violates "no Git/GitHub knowledge required," but acceptable as a stop-gap for a small admin team.
- **External auth (Auth0/Clerk) bridged to Git Gateway** — more moving parts and cost; rejected for an MVP with near-zero hosting budget.

**Action at implementation**: verify Identity provisioning on the blog site *before* building the CMS config; record the outcome and, if fallback is used, the OAuth-relay setup.

## 2. Image-optimization enforcement for CMS-uploaded media

**Decision**: Store Decap media under `blog/src/assets/uploads/` and reference featured/OG images through the content-collection **`image()` schema helper**, so **`astro:assets` (sharp)** resizes/compresses at build (output WEBP, capped width). Add an optional **prebuild sharp guard** that fails or down-converts any upload exceeding 1MB or 2000px.

**Rationale**: `astro:assets` gives automatic, build-time, deterministic optimization — the spec's "enforced, not guidance" requirement — for any image the schema/pages reference. Keeping media in `src/assets` (not `public/`) is what routes it through the optimizer. The prebuild guard covers inline images and enforces the hard size/format limits regardless of Writer behavior.

**Alternatives considered**:
- **`public/uploads` + Netlify image-optimization build plugin** — simpler wiring but images in `public/` bypass `astro:assets`, giving weaker/less-portable enforcement. Rejected as primary.
- **Client-side compression in the CMS** — not reliable/enforceable; a Writer could bypass it. Rejected.

## 3. Base-path deployment behind a Netlify status=200 proxy

**Decision**: Configure Astro with `site: 'https://www.yahsl.org'` and `base: '/blog'`. On the **main** site add:
```toml
[[redirects]]
  from = "/blog/*"
  to = "https://<blog-site>.netlify.app/blog/:splat"
  status = 200
  force = true
```

**Rationale**: With `base: '/blog'`, Astro emits assets, links, canonical URLs, sitemap, and RSS already under `/blog`, so the blog's own deploy serves `/blog/...`. The proxy must therefore target `/blog/:splat` (preserving the prefix), and `status=200` keeps the browser URL on `www.yahsl.org`. `force=true` ensures `/blog/*` (including `/blog/admin`) always proxies. The exact splat mapping is the most error-prone detail and is validated live in quickstart (adjust `to` if paths 404).

**Alternatives considered**:
- **Blog on a subdomain (`blog.yahsl.org`)** — search engines treat it as a more separate property, weakening consolidated SEO; rejected per the spec's main-domain goal.
- **`base: '/'` + rewrite path** — would require rewriting every internal link/asset path at the proxy; brittle. Rejected.

**Note**: Netlify Identity callback/redirect URLs must be set to the **main domain** (`www.yahsl.org/blog/admin`), or the login flow misdirects Writers.

## 4. Two Netlify sites from one repo (build isolation)

**Decision**: Create a **second Netlify site** connected to the same `SUBiango/yah` repo with **base directory = `blog`**, build `npm run build`, publish `blog/dist`. Set the blog site's **ignore build command** to skip builds when `blog/**` is unchanged (e.g. `git diff --quiet HEAD^ HEAD -- blog/`). The main site's settings are unchanged.

**Rationale**: Netlify supports multiple sites per repo via base directory; this gives the blog an independent build/deploy/rollback and its own environment/Identity config, satisfying "existing pipeline untouched." The ignore command prevents main-only commits from triggering unnecessary blog builds. Even if the main site publishes the raw `blog/` source, the `force` proxy on `/blog/*` governs what visitors receive.

**Alternatives considered**:
- **Separate repo for the blog** — the most literal reading of "own repo," but the user chose a subfolder for single-repo simplicity; rejected in favor of the base-directory approach.
- **Netlify monorepo build with both in one site** — couples the deploys and risks the main site; rejected.

## 5. Design reuse

**Decision**: Copy the compiled `css/main.css` and `assets/logo.png` into the blog and re-implement the existing nav (`index.html:54-78`) and footer (`index.html:253-282`) as Astro components, converting the existing **relative** links (`index.html`, `about.html`, …) to **absolute** `https://www.yahsl.org/...` URLs (since the blog runs under `/blog`), and adding an active "Blog" link.

**Rationale**: Guarantees visual consistency with the live site at low cost and keeps the blog self-contained (no cross-site relative-path breakage under the `/blog` base).

**Alternatives considered**: importing the main site's Sass source into the blog build — heavier and couples the two toolchains; rejected in favor of copying the already-compiled CSS.

---

**All NEEDS CLARIFICATION resolved.** Remaining risk tracked: confirm Identity provisioning early; GitHub-OAuth fallback documented above.
