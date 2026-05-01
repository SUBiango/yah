/**
 * index.js — Home page JavaScript
 * Depends on: utils.js (loaded before this file)
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initImpactCounters();
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
