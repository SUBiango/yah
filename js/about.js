/**
 * about.js — About page JavaScript
 * Depends on: utils.js (loaded before this file)
 *
 * Handles the animated impact counters on the about page.
 * Scroll animations are handled by utils.js (IntersectionObserver on [data-animate]).
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initImpactCounters();
});

/**
 * Animated counters for [data-count-to] elements on the about page.
 * Identical logic to index.js — shared here to keep each page self-contained.
 */
function initImpactCounters() {
  const counters = document.querySelectorAll('[data-count-to]');
  if (!counters.length) return;

  if (!('IntersectionObserver' in window)) {
    counters.forEach(el => {
      el.textContent = el.dataset.countTo + (el.dataset.suffix || '');
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

function animateCounter(el) {
  const target   = parseInt(el.dataset.countTo, 10);
  const suffix   = el.dataset.suffix || '';
  const duration = 1500;
  const step     = 16;
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
