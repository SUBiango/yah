# Feature Specification: Blog System

**Feature Branch**: `003-blog-system`  
**Created**: 2026-07-04  
**Status**: Draft  
**Input**: User description: "Blog system" — add a blog to the YAH website so staff can publish articles without coding, per `docs/blog-system-spec.md`.

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
A non-technical YAH staff member ("Writer") opens a browser-based content management screen, signs in, and creates a new article — entering a title, author, publish date, an excerpt, a featured image, and the article body with inline images. They save it as a draft, and later move it through review to published. Once published, the article appears on the public blog at the organization's main web address under a `/blog` path, is listed alongside other articles (newest first), and is individually readable, shareable on social media, and discoverable by search engines — all without the Writer touching any code or needing knowledge of version control.

### Acceptance Scenarios
1. **Given** a Writer is signed into the content management screen, **When** they create an article and move it to published, **Then** the article appears on the public blog listing at the main domain under `/blog`, sorted by publish date (newest first).
2. **Given** an article is saved as a draft (not yet published), **When** the public blog is viewed, **Then** the draft does not appear anywhere in the public site.
3. **Given** a published article, **When** a visitor opens it, **Then** the page shows the title, featured image, author, publish date, the full body content, and any inline images.
4. **Given** a Writer enters an article title, **When** they do not manually set a URL slug, **Then** a slug is generated automatically from the title, with an option to override it manually.
5. **Given** a Writer uploads a large, unoptimized photo as a featured or inline image, **When** the article is published, **Then** the image is automatically optimized (resized/compressed within defined limits) so page performance is preserved.
6. **Given** a published article, **When** its page is loaded, **Then** it exposes a unique page title, a meta description (defaulting to the excerpt), a social-sharing image (defaulting to the featured image), and a canonical URL on the main domain under `/blog`.
7. **Given** the blog has published articles, **When** a visitor requests the blog's feed or the site map, **Then** a valid subscribable feed and a site map (scoped to the blog, not conflicting with the main site) are available.
8. **Given** a Writer without publish approval saves work in progress, **When** the work is in draft or review state, **Then** it does not trigger a public/live update until it is explicitly published.

### Edge Cases
- What happens when two articles are given the same title? → Slug generation must avoid duplicates/inconsistent casing; manual override available.
- What happens when a required field (title, author, publish date, featured image, excerpt, body) is missing? → The article must not be publishable until required fields are provided.
- What happens when an uploaded image exceeds the size/dimension limits or is an unsupported format? → It must be rejected or automatically brought within limits before it reaches the public site.
- What happens to the blog if a bad change is published? → The blog can be rolled back independently without affecting the main website, and vice versa.
- How are the blog's search-engine files kept from clashing with the main site's existing ones?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: A Writer MUST be able to create, edit, and publish articles through a browser-based interface without writing code or using version control directly.
- **FR-002**: The system MUST support a review workflow with distinct draft → in-review → published states, so in-progress work never publishes to the live site until explicitly approved.
- **FR-003**: A Writer MUST be able to upload a featured image and embed inline images within an article's body.
- **FR-004**: Each article MUST capture: Title (required), Slug (required, auto-generated from Title with manual override), Author (required), Publish Date (required), Featured Image (required), Excerpt (required), Body Content (required), Tags (optional), Draft flag (optional), and an optional dedicated social-sharing image and meta description override.
- **FR-005**: The system MUST exclude draft articles from the public site.
- **FR-006**: The system MUST automatically enforce image optimization limits (max width 2000px, max file size 1MB, formats JPG/PNG/WEBP) rather than relying on Writer discretion.
- **FR-007**: The public blog MUST provide a listing page showing each article's featured image, title, excerpt, author, and publish date, sorted by publish date descending, excluding drafts.
- **FR-008**: The public blog MUST provide an individual page per article showing title, featured image, author, publish date, body content, and inline images.
- **FR-009**: The system MUST publish a subscribable feed (RSS) and a blog-scoped site map that does not conflict with the main site's existing search-engine files.
- **FR-010**: Each article page MUST expose SEO metadata: a unique page title, a meta description (defaulting to the Excerpt, overridable), a social-sharing image (defaulting to the Featured Image, overridable), and a canonical URL on the main domain under `/blog`.
- **FR-011**: The blog MUST be served under the `/blog` path of the organization's existing main domain (not a subdomain), so search authority consolidates under the main domain.
- **FR-012**: The blog MUST be publishable, deployable, and rollback-able independently of the existing website, with the existing website's build/deploy process left effectively unchanged.
- **FR-013**: The public blog MUST be responsive and visually consistent with the existing YAH website (shared header/footer/branding).
- **FR-014**: The blog MUST meet performance and quality targets of Lighthouse Performance ≥ 90, SEO ≥ 90, and Accessibility ≥ 90.
- **FR-015**: The system MUST distinguish a Writer role (create/edit/publish articles, upload images, save drafts; cannot modify application code or CMS configuration) from an Administrator role (configure the CMS, manage the repository and deployments).
- **FR-016**: Writers MUST authenticate to the content management interface, and the sign-in flow MUST complete correctly when the interface is accessed via the main domain (not a secondary address). [NEEDS CLARIFICATION: the intended identity/authentication service is stated as available in the source spec, but its continued availability for new setups must be confirmed during research; a fallback auth method may be required.]

### Out of Scope (explicit non-requirements for MVP)
User comments; user registration/self-signup; a database; newsletter integration; an analytics dashboard; scheduled/future-dated auto-publishing; multi-language support; migrating the existing website; dedicated category/tag archive pages (tags captured in the model only); on-site search.

### Key Entities *(include if feature involves data)*
- **BlogPost**: Represents a single published or draft article. Key attributes: title, slug, author, publish date, featured image, optional social-sharing image, excerpt, optional meta-description override, body content, optional tags, draft flag. Drafts are excluded from the public site; published posts appear on the listing and as individual pages, and feed into the RSS feed and site map.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain — one open item (FR-016 auth availability), to be resolved in Phase 0 research
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Security requirements specified for sensitive data handling (authenticated CMS, review workflow, no public write path)
- [x] Performance targets defined with measurable criteria (Lighthouse ≥ 90)
- [x] User experience requirements include accessibility considerations (Accessibility ≥ 90, responsive)
- [x] Data protection and privacy requirements documented (no personal data collected from visitors; content stored in version control)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed — pending resolution of FR-016 in Phase 0

---
