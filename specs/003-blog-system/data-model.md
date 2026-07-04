# Phase 1 Data Model: Blog System

The blog has a single content entity, stored as Markdown files (frontmatter + body) in `blog/src/content/blog/*.md`, validated by an Astro content-collection Zod schema in `blog/src/content.config.ts`.

## Entity: BlogPost

| Field | Type | Required | Default | Validation / Notes |
|---|---|---|---|---|
| `title` | string | Yes | — | Non-empty. Drives auto-slug. |
| `slug` | string | Yes | auto from `title` | Auto-generated (lowercased, hyphenated, de-duplicated) with manual override. Unique across posts. When derived from the filename, the override is the frontmatter value. |
| `author` | string | Yes | — | Non-empty. |
| `publishDate` | date | Yes | — | Valid date; used for sort order (descending) and RSS/sitemap dates. |
| `featuredImage` | image | Yes | — | Via `image()` helper → optimized by `astro:assets`. Also the default OG image. Format JPG/PNG/WEBP; ≤2000px / ≤1MB enforced. |
| `ogImage` | image | No | `featuredImage` | Optional dedicated social-sharing image; falls back to `featuredImage`. |
| `excerpt` | string | Yes | — | Non-empty. Shown on listing; default `metaDescription`. |
| `metaDescription` | string | No | `excerpt` | Optional SEO override. |
| `body` | Markdown | Yes | — | Article content (the Markdown body, not frontmatter). May embed inline images (also optimized). |
| `tags` | string[] | No | `[]` | Optional. MVP: captured only; no archive pages. |
| `draft` | boolean | No | `false` | When `true`, excluded from all production output (listing, article routes, RSS, sitemap). |

## Validation rules
- Missing any required field ⇒ schema validation fails ⇒ `astro build` fails (integration gate).
- `featuredImage`/`ogImage` resolved through `image()` so non-image or oversized/wrong-format inputs are caught at build.
- `slug` must be unique; duplicate slugs ⇒ build error (route collision).

## State transitions (editorial workflow)
Managed by Decap CMS (`publish_mode: editorial_workflow`), backed by branches/PRs:

```
draft  →  in review  →  ready/published
```
- `draft` and `in review` live on working branches/PRs and never trigger a production deploy.
- Publishing merges to the production branch (`main`) → triggers the blog Netlify build.
- The `draft: true` frontmatter flag is an additional content-level exclusion independent of the workflow state (a post can be committed but still hidden from the public build).

## Derived / computed
- **Slug** — from `title` when not overridden.
- **Meta description** — `metaDescription ?? excerpt`.
- **OG image** — `ogImage ?? featuredImage`.
- **Canonical URL** — `${site}${base}/${slug}/` = `https://www.yahsl.org/blog/${slug}/`.
- **Listing order** — posts sorted by `publishDate` descending, `draft === false` only.

## Relationships
None. Single flat collection; `tags` are free-form strings with no dedicated entities in MVP.
