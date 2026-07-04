# Contract: Content Schema (BlogPost frontmatter)

Defines the `blog` content-collection schema that `blog/src/content.config.ts` MUST implement, and the fixtures the schema contract test (`blog/tests/content-schema.test.ts`) MUST enforce. Test is authored to **fail first** (before `content.config.ts` exists).

## Schema (reference shape)
```ts
// content.config.ts (reference)
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    slug: z.string().min(1).optional(),          // auto from title when omitted
    author: z.string().min(1),
    publishDate: z.coerce.date(),
    featuredImage: image(),
    ogImage: image().optional(),
    excerpt: z.string().min(1),
    metaDescription: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
```

## Fixtures & expected results
| Fixture | Expectation |
|---|---|
| `valid-post.md` — all required fields, valid image | PASS validation |
| `missing-title.md` — no `title` | FAIL validation |
| `missing-featured-image.md` — no `featuredImage` | FAIL validation |
| `bad-date.md` — `publishDate: "not-a-date"` | FAIL validation |
| `oversized-image` (>2000px / >1MB) referenced as `featuredImage` | REJECTED by image guard/optimizer at build |
| `draft-post.md` — `draft: true` | PASS validation, but EXCLUDED from production output (see rendered-output contract) |

## Assertions
- Every required field absent → schema parse error.
- `tags` defaults to `[]` when omitted; `draft` defaults to `false`.
- `publishDate` coerces valid date strings and rejects invalid ones.
