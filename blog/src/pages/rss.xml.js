import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { rssItems } from '../lib/posts';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: 'Young Access Hub Blog',
    description:
      "Stories, updates, and lessons from Young Access Hub's work with young people across Kono District, Sierra Leone.",
    site: context.site,
    items: rssItems(posts),
  });
}
