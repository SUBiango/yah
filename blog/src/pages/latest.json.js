import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { publishedSorted, resolveSlug, canonicalUrl } from '../lib/posts';

// Public JSON feed of published posts for external consumers (currently: the
// main site's homepage "Latest from the Blog" teaser, fetched client-side
// through the same-origin /blog/* proxy). Static-prerendered at build time,
// same as rss.xml.
export const prerender = true;

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20; // guard against ?limit=99999

export async function GET({ url, site }) {
  const posts = publishedSorted(await getCollection('blog'));

  const requested = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit =
    Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  const items = await Promise.all(
    posts.slice(0, limit).map(async (post) => {
      // featuredImage is an Astro ImageMetadata object, not a URL — resolve it
      // to the same 800w webp variant PostCard.astro already generates.
      const optimized = await getImage({
        src: post.data.featuredImage,
        width: 800,
        format: 'webp',
      });
      const image = new URL(optimized.src, site).href;

      const slug = resolveSlug(post);
      return {
        title: post.data.title,
        excerpt: post.data.excerpt,
        url: canonicalUrl(slug),
        image,
        publishDate: post.data.publishDate.toISOString(),
        author: post.data.author,
        tags: post.data.tags,
      };
    })
  );

  return new Response(JSON.stringify({ posts: items }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
