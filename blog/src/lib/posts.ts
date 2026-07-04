/**
 * Pure blog logic shared by pages, the RSS endpoint, and tests.
 * Framework-agnostic: operates on the `.data` shape of an Astro content entry
 * (typed loosely as `PostLike` so it can be unit-tested without the Astro runtime).
 */

export const SITE = 'https://www.yahsl.org';
export const BASE = '/blog';

export interface PostLike {
  id?: string;
  data: {
    title: string;
    slug?: string;
    author?: string;
    publishDate: Date;
    excerpt: string;
    metaDescription?: string;
    featuredImage?: unknown;
    ogImage?: unknown;
    tags?: string[];
    draft?: boolean;
  };
}

/** Lowercase, hyphenate, strip non-alphanumerics — for auto slugs. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Explicit frontmatter slug wins; otherwise derive from the title. */
export function resolveSlug(post: PostLike): string {
  return post.data.slug?.trim() ? post.data.slug.trim() : slugify(post.data.title);
}

/** A post is public unless flagged as a draft. */
export function isPublished(post: PostLike): boolean {
  return post.data.draft !== true;
}

/** Newest first. Non-mutating. */
export function sortByDateDesc<T extends PostLike>(posts: T[]): T[] {
  return [...posts].sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime(),
  );
}

/** Drafts excluded, sorted newest-first — the canonical listing order. */
export function publishedSorted<T extends PostLike>(posts: T[]): T[] {
  return sortByDateDesc(posts.filter(isPublished));
}

/** Meta description defaults to the excerpt. */
export function metaDescription(post: PostLike): string {
  return post.data.metaDescription?.trim() ? post.data.metaDescription : post.data.excerpt;
}

/** OG image defaults to the featured image. */
export function resolveOgImage(post: PostLike): unknown {
  return post.data.ogImage ?? post.data.featuredImage;
}

/** Canonical URL on the main domain under /blog, with a trailing slash. */
export function canonicalUrl(slug: string): string {
  return `${SITE}${BASE}/${slug}/`;
}

/** Sorted, de-duplicated list of tags across the given posts. */
export function uniqueTags(posts: PostLike[]): string[] {
  const set = new Set<string>();
  for (const p of posts) for (const t of p.data.tags ?? []) set.add(t);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Estimated reading time in whole minutes (~200 words/min), at least 1. */
export function readingMinutes(text: string, wpm = 200): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wpm));
}

export interface RssItem {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
}

/** Map published, newest-first posts to RSS item objects with canonical links. */
export function rssItems(posts: PostLike[]): RssItem[] {
  return publishedSorted(posts).map((post) => ({
    title: post.data.title,
    description: post.data.excerpt,
    pubDate: post.data.publishDate,
    link: canonicalUrl(resolveSlug(post)),
  }));
}
