# Contract: Rendered Output

Assertions the built blog (`blog/dist`) MUST satisfy, verified by `blog/tests/output.test.ts` (authored to **fail first**) and by the quickstart. Maps to spec FRs and acceptance scenarios.

## Routes
| Route | Requirement |
|---|---|
| `/blog/` | Listing page. Renders each non-draft post's featured image, title, excerpt, author, publish date. Sorted by `publishDate` descending. (FR-007) |
| `/blog/<slug>/` | Article page. Renders title, featured image, author, publish date, body content, inline images. (FR-008) |
| `/blog/rss.xml` | Valid RSS 2.0 feed of non-draft posts. (FR-009) |
| `/blog/sitemap-index.xml` (+ child) | Valid sitemap scoped to `/blog`, respecting the base path. (FR-009) |
| `/blog/robots.txt` | Blog-scoped; references the blog sitemap; does not conflict with the main site's root `robots.txt`/`sitemap.xml`. (FR-009) |
| `/blog/admin/` | Decap CMS entry, reachable through the proxy on the main domain. (FR-001) |

## Draft exclusion (FR-005)
- A post with `draft: true` MUST NOT appear on `/blog/`, MUST NOT produce a `/blog/<slug>/` route, and MUST NOT appear in the RSS feed or sitemap.

## Per-article SEO (FR-010)
For each article page, the built HTML MUST contain:
- A unique `<title>`.
- `<meta name="description">` = `metaDescription ?? excerpt`.
- `<meta property="og:image">` = absolute URL of `ogImage ?? featuredImage` under `https://www.yahsl.org/blog/...`.
- `<link rel="canonical" href="https://www.yahsl.org/blog/<slug>/">`.

## Design consistency (FR-013)
- Every page renders the ported header/nav and footer using `main.css`, with nav/footer links pointing to **absolute** main-domain URLs (`https://www.yahsl.org/...`).

## Performance/quality gate (FR-014)
- Lighthouse on `/blog/` and a representative `/blog/<slug>/`: Performance ≥ 90, SEO ≥ 90, Accessibility ≥ 90.

## Build gate
- `astro build` MUST succeed with the content fixtures present (schema-valid content only); a schema-invalid fixture MUST fail the build.
