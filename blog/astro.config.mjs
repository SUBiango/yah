// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The blog is served under https://www.yahsl.org/blog via a Netlify proxy.
// `site` is the origin; `base` is the subpath. Astro combines them for
// canonical URLs, the sitemap, and RSS so everything resolves on the main domain.
export default defineConfig({
  site: 'https://www.yahsl.org',
  base: '/blog',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
