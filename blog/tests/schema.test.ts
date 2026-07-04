import { describe, it, expect } from 'vitest';
// Implemented in Phase 3.3 — this import fails first (TDD).
import { postDataSchema } from '../src/lib/schema';

const valid = {
  title: 'Annual Report 2026',
  author: 'YAH Team',
  publishDate: '2026-01-15',
  excerpt: 'A summary of our activities during 2026.',
};

describe('postDataSchema (content-schema contract)', () => {
  it('accepts a valid post and applies defaults', () => {
    const parsed = postDataSchema.parse(valid);
    expect(parsed.tags).toEqual([]);
    expect(parsed.draft).toBe(false);
    expect(parsed.publishDate).toBeInstanceOf(Date);
  });

  it('rejects a post missing the title', () => {
    const { title, ...noTitle } = valid;
    expect(() => postDataSchema.parse(noTitle)).toThrow();
  });

  it('rejects a post missing the excerpt', () => {
    const { excerpt, ...noExcerpt } = valid;
    expect(() => postDataSchema.parse(noExcerpt)).toThrow();
  });

  it('rejects an invalid publish date', () => {
    expect(() => postDataSchema.parse({ ...valid, publishDate: 'not-a-date' })).toThrow();
  });

  it('keeps an explicit slug override and non-empty tags', () => {
    const parsed = postDataSchema.parse({ ...valid, slug: 'custom-slug', tags: ['news'] });
    expect(parsed.slug).toBe('custom-slug');
    expect(parsed.tags).toEqual(['news']);
  });
});
