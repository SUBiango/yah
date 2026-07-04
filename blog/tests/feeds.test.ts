import { describe, it, expect } from 'vitest';
// Implemented in Phase 3.3 — this import fails first (TDD).
import { rssItems } from '../src/lib/posts';

const post = (id: string, data: Record<string, unknown>) => ({ id, data } as any);
const featured = { src: '/blog/_astro/f.webp' };

const posts = [
  post('a', { title: 'A', publishDate: new Date('2026-01-01'), excerpt: 'a', featuredImage: featured, draft: false }),
  post('b', { title: 'B', publishDate: new Date('2026-05-01'), excerpt: 'b', featuredImage: featured, draft: false }),
  post('draft', { title: 'D', publishDate: new Date('2026-06-01'), excerpt: 'd', featuredImage: featured, draft: true }),
];

describe('rssItems (FR-009)', () => {
  it('emits published posts newest-first with canonical links and descriptions', () => {
    const items = rssItems(posts);
    expect(items.map((i) => i.title)).toEqual(['B', 'A']);
    expect(items.every((i) => i.link.startsWith('https://www.yahsl.org/blog/'))).toBe(true);
    expect(items[0]).toMatchObject({ title: 'B', description: 'b' });
    expect(items[0].pubDate).toBeInstanceOf(Date);
  });

  it('excludes drafts from the feed', () => {
    expect(rssItems(posts).some((i) => i.title === 'D')).toBe(false);
  });
});
