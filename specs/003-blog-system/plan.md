
# Implementation Plan: Blog System

**Branch**: `003-blog-system` | **Date**: 2026-07-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-blog-system/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add a blog to the YAH website as a **standalone Astro static site with Decap CMS**, built with `base: '/blog'`, deployed as its **own Netlify site**, and served at `www.yahsl.org/blog/*` via a `status=200 force` proxy redirect in a new root `netlify.toml` on the existing (Netlify-hosted) main site. Non-technical Writers manage content through a browser CMS running an editorial (draft → review → publish) workflow, authenticated via Netlify Identity + Git Gateway with callbacks on the main domain. Articles are Markdown committed to the `yah` repo; images are optimized at build time. The blog reuses the existing site's header/footer/branding and must hit Lighthouse Performance/SEO/Accessibility ≥ 90.

## Technical Context
**Language/Version**: JavaScript/TypeScript, Astro 4+, Node.js 18+ (repo toolchain: Node 23)  
**Primary Dependencies**: `astro`, `@astrojs/rss`, `@astrojs/sitemap`, `sharp` (via built-in `astro:assets`), Decap CMS (`decap-cms-app` in admin), `decap-server` (local CMS dev)  
**Storage**: Markdown files in `blog/src/content/blog/`; media in `blog/src/assets/uploads/`; **no database, no backend server**  
**Testing**: Vitest (content-schema/unit); Astro build + rendered-output assertions (draft exclusion, RSS/sitemap validity, SEO tags); Lighthouse as perf/SEO/a11y gate  
**Target Platform**: Static site on Netlify, served under `/blog` on the main domain via proxy  
**Project Type**: web (static frontend; new isolated sub-project inside the existing repo)  
**Performance Goals**: Lighthouse Performance ≥ 90, SEO ≥ 90, Accessibility ≥ 90  
**Constraints**: existing main-site build untouched except a new root `netlify.toml`; enforced image limits (≤2000px, ≤1MB, JPG/PNG/WEBP); Identity redirect/callback URLs on the main domain; independent build/deploy/rollback from the main site  
**Scale/Scope**: MVP per spec deliverables; small-to-moderate article volume; two Netlify sites from one repo

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) was written for the registration system; its principles are applied here to the blog, and registration-specific criteria (access codes, QR codes, participant PII, MongoDB) are marked **N/A**.

### Security-First Development (NON-NEGOTIABLE)
- [x] CMS is authenticated (Netlify Identity + Git Gateway); no public write path to content
- [x] Editorial workflow prevents unauthorized/accidental live publishes (draft → review → publish)
- [x] Static output + no backend/database → minimal attack surface; no secrets shipped to the client
- [x] Image uploads validated/enforced for type and size before reaching production
- [~] N/A: cryptographic access codes, one-time-use enforcement, QR email transmission (registration-only)

### Test-Driven Development (NON-NEGOTIABLE)
- [x] Content-collection (Zod) schema contract test written before implementation; invalid frontmatter fails
- [x] Rendered-output tests written first: draft exclusion, listing order, RSS/sitemap validity, SEO tags present
- [x] `npm run build` is the integration gate (must pass with real content fixtures)
- [x] Lighthouse thresholds (≥90) act as performance/a11y validation gates

### User Experience Consistency
- [x] Reuses existing design system: nav (`index.html:54-78`), footer (`index.html:253-282`), `css/main.css`, logo, brand `#0d3b66`
- [x] Immediate CMS feedback via required-field validation in the editor
- [x] Error/empty states designed to be user-friendly
- [x] Mobile-responsive; Accessibility ≥ 90

### Performance & Scalability Standards
- [x] Static generation (no runtime queries); content pre-rendered at build
- [x] Build-time image optimization (`astro:assets`/sharp) enforces limits automatically
- [x] Blog served via low-overhead Netlify proxy; independent build so main site is unaffected
- [x] Performance target codified as Lighthouse Performance ≥ 90

### Code Quality & Maintainability
- [x] Single-responsibility Astro components (Nav, Footer, PostCard, BaseLayout)
- [x] Content model documented (data-model.md) and enforced by schema
- [x] Configuration externalized (`astro.config.mjs`, Netlify env, Decap `config.yml`); no hardcoded deploy URLs beyond config
- [x] Linting/formatting established for the `blog/` sub-project

## Project Structure

### Documentation (this feature)
```
specs/003-blog-system/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
netlify.toml                          # NEW (main site) — proxy /blog/* → blog site (ONLY touch to existing site)

blog/                                 # NEW Astro sub-project — own Netlify site (base directory = blog)
├── astro.config.mjs                  # site: https://www.yahsl.org, base: /blog, sitemap integration
├── package.json
├── .nvmrc
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── content.config.ts             # `blog` collection + Zod schema (BlogPost), image() helper
│   ├── content/blog/                 # *.md articles (Decap-managed)
│   ├── assets/uploads/               # media (Decap-managed) — optimized via astro:assets
│   ├── layouts/
│   │   └── BaseLayout.astro          # <head> SEO tags + Nav + <slot/> + Footer
│   ├── components/
│   │   ├── Nav.astro                 # ported from existing nav, absolute links to main domain
│   │   ├── Footer.astro              # ported from existing footer
│   │   └── PostCard.astro            # listing card (image, title, excerpt, author, date)
│   └── pages/
│       ├── index.astro               # /blog/ listing (sorted desc, drafts excluded)
│       ├── [slug].astro              # /blog/[slug]/ article page
│       └── rss.xml.js                # /blog/rss.xml
├── public/
│   ├── admin/
│   │   ├── index.html                # Decap CMS entry → /blog/admin/
│   │   └── config.yml                # git-gateway backend, editorial_workflow, collections
│   ├── main.css                      # copied from ../css/main.css
│   ├── assets/logo.png               # copied from ../assets/logo.png
│   └── robots.txt                    # blog-scoped; no clash with root robots.txt/sitemap.xml
└── tests/
    ├── content-schema.test.ts        # schema contract (valid/invalid fixtures)
    └── output.test.ts                # draft exclusion, listing order, SEO tags, RSS/sitemap
```

**Structure Decision**: New `blog/` sub-project inside the existing `yah` repo, deployed as a **separate** Netlify site (base directory `blog`, publish `blog/dist`, with an `ignore` build command so it rebuilds only when `blog/**` changes). The existing main site keeps its current build/publish; the single change to it is a new root `netlify.toml` containing the `/blog/*` proxy. Because Astro emits under the `/blog` base path, the proxy target is `.../blog/:splat` (not bare `:splat`) — validated live in quickstart.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - FR-016 auth availability (Netlify Identity + Git Gateway) — the one open `[NEEDS CLARIFICATION]`.
   - Image-optimization enforcement mechanism for CMS-uploaded media.
   - Subpath link behavior (relative → absolute) for the ported nav/footer.
   - Two-Netlify-sites-from-one-repo build isolation.
   - Proxy splat mapping under a base path.

2. **Research tasks**:
   ```
   Research Netlify Identity + Git Gateway current availability + Decap github-backend fallback
   Best practices: astro:assets image optimization from Decap-managed media
   Best practices: Astro base-path deployment behind a Netlify status=200 proxy
   Best practices: multiple Netlify sites from one repo (base dir + ignore build)
   ```

3. **Consolidate** in `research.md` as Decision / Rationale / Alternatives.

**Output**: research.md with all NEEDS CLARIFICATION resolved (auth decision + fallback documented).

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **`data-model.md`** — the `BlogPost` entity: fields, types, required/optional, validation rules, and the draft state transition (draft → in-review → published; drafts excluded from build). Encoded as a Zod schema in `content.config.ts` using the `image()` helper for `featuredImage`/`ogImage`.

2. **`contracts/`**:
   - `content-schema.contract.md` + fixtures — the frontmatter schema contract (valid sample passes; missing-required and oversized-image samples fail).
   - `rendered-output.contract.md` — assertions the site MUST satisfy: `/blog/` lists non-draft posts newest-first; `/blog/[slug]/` renders required fields; `/blog/rss.xml` and blog sitemap are valid; each article page emits unique title, meta description (excerpt default), OG image (featured default), canonical URL on the main domain.

3. **Contract tests** (`blog/tests/`) authored to **fail first** against the above.

4. **Test scenarios** from user stories → `quickstart.md` validation walkthrough (local dev + CMS, build gate + Lighthouse, deploy + proxy + Identity login on main domain).

5. **Update agent file**: run `.specify/scripts/bash/update-agent-context.sh copilot` to record the new tech (Astro, Decap, Netlify blog site) in `.github/copilot-instructions.md`.

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, updated agent file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base.
- From `data-model.md` → `content.config.ts` schema task.
- From `contracts/` → contract test tasks [P] (schema + rendered output), written to fail first.
- From user stories → integration/quickstart validation tasks.
- From structure → component, page, feed, CMS, and deploy-wiring tasks.

**Ordering Strategy (TDD + dependency order)**:
1. **Setup**: scaffold Astro in `blog/`, install deps, `astro.config.mjs` (site/base/sitemap), `.nvmrc`, lint/test config. [P] where independent.
2. **Tests-first (must fail)**: schema contract test, draft-exclusion, listing order, RSS/sitemap validity, SEO-tag assertions. [P]
3. **Content model**: `content.config.ts` (BlogPost Zod schema + image()).
4. **Layout/design**: port Nav/Footer (absolute main-domain links), BaseLayout with SEO head; copy `main.css`, logo. [P] components
5. **Pages/feeds**: `index.astro`, `[slug].astro`, `rss.xml.js`, sitemap integration, blog `robots.txt`.
6. **Image optimization**: `astro:assets` usage in cards/article + optional prebuild sharp guard enforcing ≤1MB/≤2000px.
7. **CMS**: `public/admin/index.html` + `config.yml` (git-gateway, editorial_workflow, collection fields, auto-slug, media folder).
8. **Deploy wiring**: create blog Netlify site (base dir `blog`, ignore build), enable Identity + Git Gateway (main-domain callbacks), add root `netlify.toml` proxy.
9. **Validation**: run quickstart, verify Lighthouse ≥ 90 gates, adjust proxy splat mapping if needed.

**Parallel Markers [P]**: independent components, independent contract tests, and independent page files can be developed in parallel.

**Estimated Output**: ~25–30 numbered, ordered tasks in tasks.md with TDD gates and Lighthouse validation.

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, Lighthouse validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Second Netlify site from the same repo (added deploy target) | Spec requires the existing site's build/deploy to stay untouched and to allow independent rollback | Building the blog into the main site's pipeline would modify and risk the existing deploy — explicitly disallowed by the spec |
| New sub-project stack (Astro/Decap) alongside the vanilla-HTML main site | Non-technical writers need a CMS + static generation + build-time image optimization the current hand-written site cannot provide | Hand-authoring HTML per article fails the "no coding for writers" and enforced-optimization requirements |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (auth decision + fallback in research.md)
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
