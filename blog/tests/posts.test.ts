import { describe, it, expect } from 'vitest';
// Implemented in Phase 3.3 — these imports fail first (TDD).
import {
  slugify,
  resolveSlug,
  publishedSorted,
  metaDescription,
  resolveOgImage,
  canonicalUrl,
  readingMinutes,
  uniqueTags,
} from '../src/lib/posts';

// Minimal stand-ins for Astro's CollectionEntry shape (only `.data` is used here).
const post = (id: string, data: Record<string, unknown>) => ({ id, data } as any);

const featured = { src: '/blog/_astro/featured.webp' };
const dedicatedOg = { src: '/blog/_astro/og.webp' };

const posts = [
  post('old', { title: 'Old', publishDate: new Date('2026-01-01'), excerpt: 'old', featuredImage: featured, draft: false }),
  post('new', { title: 'New', publishDate: new Date('2026-03-01'), excerpt: 'new', featuredImage: featured, draft: false }),
  post('mid', { title: 'Mid', publishDate: new Date('2026-02-01'), excerpt: 'mid', featuredImage: featured, draft: false }),
  post('hidden', { title: 'Hidden', publishDate: new Date('2026-04-01'), excerpt: 'hidden', featuredImage: featured, draft: true }),
];

describe('slugify / resolveSlug', () => {
  it('slugifies a title', () => {
    expect(slugify('Annual Report 2026!')).toBe('annual-report-2026');
    expect(slugify('  Mixed  CASE  ')).toBe('mixed-case');
  });
  it('prefers an explicit slug override, else derives from title', () => {
    expect(resolveSlug(post('x', { title: 'Hello World' }))).toBe('hello-world');
    expect(resolveSlug(post('x', { title: 'Hello World', slug: 'custom' }))).toBe('custom');
  });
});

describe('publishedSorted (FR-005, FR-007)', () => {
  it('excludes drafts and sorts by publishDate descending', () => {
    const result = publishedSorted(posts).map((p) => p.id);
    expect(result).toEqual(['new', 'mid', 'old']);
    expect(result).not.toContain('hidden');
  });
});

describe('uniqueTags', () => {
  it('returns sorted, de-duplicated tags across posts', () => {
    const tagged = [
      post('a', { tags: ['events', 'summit'] }),
      post('b', { tags: ['announcement', 'events'] }),
      post('c', { tags: [] }),
      post('d', {}),
    ];
    expect(uniqueTags(tagged)).toEqual(['announcement', 'events', 'summit']);
  });
});

describe('readingMinutes', () => {
  it('estimates minutes at ~200 wpm, rounded, minimum 1', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('word '.repeat(50))).toBe(1); // 50 words -> <1 -> 1
    expect(readingMinutes('word '.repeat(200))).toBe(1); // 200 words -> 1
    expect(readingMinutes('word '.repeat(500))).toBe(3); // 500/200 = 2.5 -> 3
  });
  it('ignores extra whitespace and markdown noise gracefully', () => {
    expect(readingMinutes('  hello   world  ')).toBe(1);
  });
});

describe('SEO helpers (FR-010)', () => {
  it('meta description defaults to excerpt, overridable', () => {
    expect(metaDescription(post('x', { excerpt: 'the excerpt' }))).toBe('the excerpt');
    expect(metaDescription(post('x', { excerpt: 'the excerpt', metaDescription: 'override' }))).toBe('override');
  });
  it('og image defaults to featured image, overridable', () => {
    expect(resolveOgImage(post('x', { featuredImage: featured }))).toBe(featured);
    expect(resolveOgImage(post('x', { featuredImage: featured, ogImage: dedicatedOg }))).toBe(dedicatedOg);
  });
  it('canonical URL is on the main domain under /blog with trailing slash', () => {
    expect(canonicalUrl('annual-report-2026')).toBe('https://www.yahsl.org/blog/annual-report-2026/');
  });
});
