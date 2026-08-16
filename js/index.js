/**
 * index.js — Home page JavaScript
 * Depends on: utils.js (loaded before this file)
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initImpactCounters();
  initBlogTeaser();
});

/* ─────────────────────────────────────────────────────────────────────────────
   Animated Impact Counters
   Counts up numbers in .impact-stat__number[data-count-to] when they scroll
   into view.
───────────────────────────────────────────────────────────────────────────── */
function initImpactCounters() {
  const counters = document.querySelectorAll('[data-count-to]');
  if (!counters.length) return;

  if (!('IntersectionObserver' in window)) {
    // No observer support — just show final values
    counters.forEach(el => {
      const suffix = el.dataset.suffix || '';
      el.textContent = el.dataset.countTo + suffix;
    });
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

/**
 * @param {HTMLElement} el  Element with data-count-to and optional data-suffix
 */
function animateCounter(el) {
  const target   = parseInt(el.dataset.countTo, 10);
  const suffix   = el.dataset.suffix || '';
  const duration = 1500; // ms
  const step     = 16;   // ~60 fps
  const steps    = Math.ceil(duration / step);
  let   current  = 0;

  const timer = setInterval(() => {
    current += Math.ceil(target / steps);
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = current + suffix;
  }, step);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Latest from the Blog
   Fetches /blog/latest.json?limit=3 (same-origin via the Netlify proxy) and
   renders up to 3 post cards. Hides the whole #blog section if the fetch
   fails or returns zero posts, so there's never a broken/empty section.
───────────────────────────────────────────────────────────────────────────── */
const BLOG_TEASER_ENDPOINT = '/blog/latest.json?limit=3';
const EXCERPT_MAX_CHARS = 120;

async function initBlogTeaser() {
  const section = document.getElementById('blog');
  const grid = document.getElementById('blog-teaser-grid');
  if (!section || !grid) return;

  try {
    const res = await fetch(BLOG_TEASER_ENDPOINT);
    if (!res.ok) throw new Error(`Blog feed responded ${res.status}`);

    const data = await res.json();
    const posts = Array.isArray(data.posts) ? data.posts : [];
    if (posts.length === 0) throw new Error('No posts returned');

    renderBlogTeaser(grid, posts.slice(0, 3));
  } catch (err) {
    console.warn('Blog teaser unavailable:', err);
    section.hidden = true;
  }
}

/**
 * @param {HTMLElement} grid
 * @param {Array<{title:string, excerpt:string, url:string, image:string}>} posts
 */
function renderBlogTeaser(grid, posts) {
  grid.textContent = ''; // clear skeleton placeholders
  posts.forEach(post => grid.appendChild(buildBlogCard(post)));
}

/**
 * Builds a card via DOM APIs only (textContent / property assignment) — post
 * data comes from an external, editor-authored JSON feed, so it must never
 * be passed through innerHTML unescaped.
 * @param {{title:string, excerpt:string, url:string, image:string}} post
 */
function buildBlogCard(post) {
  const card = document.createElement('article');
  card.className = 'card card--elevated h-full';

  const mediaLink = document.createElement('a');
  mediaLink.className = 'blog-teaser-card__media';
  mediaLink.href = post.url;
  mediaLink.setAttribute('tabindex', '-1');
  mediaLink.setAttribute('aria-hidden', 'true');

  const img = document.createElement('img');
  img.src = post.image;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 800;
  img.height = 450;
  mediaLink.appendChild(img);

  const body = document.createElement('div');
  body.className = 'card__body';

  const heading = document.createElement('h3');
  heading.className = 'card__title';
  const titleLink = document.createElement('a');
  titleLink.href = post.url;
  titleLink.textContent = post.title;
  heading.appendChild(titleLink);

  const excerpt = document.createElement('p');
  excerpt.className = 'card__text';
  excerpt.textContent = truncateExcerpt(post.excerpt);

  const readMore = document.createElement('a');
  readMore.className = 'btn btn--primary btn--sm';
  readMore.href = post.url;
  readMore.append('Read more ');
  const icon = document.createElement('i');
  icon.className = 'fas fa-arrow-right';
  icon.setAttribute('aria-hidden', 'true');
  readMore.appendChild(icon);

  body.append(heading, excerpt, readMore);
  card.append(mediaLink, body);
  return card;
}

/**
 * Truncates on a word boundary near EXCERPT_MAX_CHARS, appending an ellipsis.
 * @param {string} text
 */
function truncateExcerpt(text) {
  if (!text || text.length <= EXCERPT_MAX_CHARS) return text || '';
  const cut = text.slice(0, EXCERPT_MAX_CHARS);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : EXCERPT_MAX_CHARS)}…`;
}
