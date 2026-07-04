import { z } from 'zod';

/**
 * Text-field schema for a BlogPost's frontmatter (everything except the image
 * fields, which Astro validates via the `image()` helper in content.config.ts).
 * Kept framework-agnostic so it is unit-testable and mirrors the CMS fields.
 * See specs/003-blog-system/data-model.md.
 */
export const postDataSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  author: z.string().min(1),
  publishDate: z.coerce.date(),
  excerpt: z.string().min(1),
  metaDescription: z.string().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

export type PostData = z.infer<typeof postDataSchema>;
