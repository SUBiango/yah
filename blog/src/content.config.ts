import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// BlogPost collection. Images use the `image()` helper so astro:assets
// optimizes them at build. Text fields mirror src/lib/schema.ts.
// See specs/003-blog-system/data-model.md.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      slug: z.string().min(1).optional(),
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

export const collections = { blog };
