/**
 * utils.js — Shared utilities for Young Access Hub
 *
 * Replaces: bootstrap.bundle.js nav behaviour + main.js shared logic
 *
 * Modules:
 *  - initNav()          Hamburger toggle, active link highlight
 *  - initSmoothScroll() Anchor smooth-scrolling with nav-offset
 *  - initBackToTop()    Back-to-top button (class-based show/hide)
 *  - initAnimations()   IntersectionObserver for [data-animate]
 *  - showAlert()        Reusable in-page alert renderer
 *  - isValidEmail()     Email pattern helper
 *
 * Usage: <script src="js/utils.js"></script> on every page (loads synchronously).
 * Each page then loads its own <script src="js/page.js" defer></script>.
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   Navbar
───────────────────────────────────────────────────────────────────────────── */

/**
 * Enables the hamburger toggle and closes the menu when a link is clicked.
 * Replaces Bootstrap's data-bs-toggle="collapse".
 *
 * Expected markup:
 *   <nav class="nav nav--light nav--fixed">
 *     <div class="nav__inner container">
 *       <a class="nav__brand" href="index.html">…</a>
 *       <button class="nav__toggle" aria-expanded="false" aria-label="Toggle navigation">
 *         <span></span><span></span><span></span>
 *       </button>
 *       <div class="nav__menu" id="navMenu">
 *         <ul class="nav__links">…</ul>
 *       </div>
 *     </div>
 *   </nav>
 */
function initNav() {
  const toggle = document.querySelector('.nav__toggle');
  const menu   = document.querySelector('.nav__menu');

  if (!toggle || !menu) return;

  // Open / close on button click
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close when any nav link is clicked (useful for same-page anchors)
  menu.querySelectorAll('.nav__link').forEach(link => {
    // On mobile, dropdown parent toggles child instead of navigating
    const item = link.closest('.nav__item--has-dropdown');
    if (item) {
      link.addEventListener('click', e => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          item.classList.toggle('is-open');
        }
      });
      return;
    }
    link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Highlight the active page link
  _highlightActiveNavLink();
}

/**
 * Adds .nav__link--active to the link whose href matches the current page.
 */
function _highlightActiveNavLink() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const page = href.split('/').pop();
    if (page === current || (current === '' && page === 'index.html')) {
      link.classList.add('nav__link--active');
    }
  });
}


/* ─────────────────────────────────────────────────────────────────────────────
   Smooth Scroll
───────────────────────────────────────────────────────────────────────────── */

/**
 * Smooth-scrolls anchor links, accounting for the fixed navbar height.
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
      const top  = target.getBoundingClientRect().top + window.pageYOffset - navH;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}


/* ─────────────────────────────────────────────────────────────────────────────
   Back to Top
───────────────────────────────────────────────────────────────────────────── */

/**
 * Shows/hides the .back-to-top button after 300 px of scroll.
 */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  const onScroll = () => {
    btn.classList.toggle('is-visible', window.pageYOffset > 300);
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* ─────────────────────────────────────────────────────────────────────────────
   Scroll Animations (IntersectionObserver)
───────────────────────────────────────────────────────────────────────────── */

/**
 * Adds .is-visible to any element with [data-animate] when it enters the
 * viewport. CSS transitions handle the actual fade/slide.
 */
function initAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  // Fallback for browsers without IntersectionObserver
  if (!('IntersectionObserver' in window)) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach(el => observer.observe(el));
}


/* ─────────────────────────────────────────────────────────────────────────────
   Alert Helper
───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders an in-page alert and removes it after a timeout.
 *
 * @param {string} message     Text to display.
 * @param {'success'|'danger'|'info'|'warning'} type  Alert variant.
 * @param {string} [containerId='alertContainer']  ID of the container element.
 * @param {number} [duration=5000]  Auto-dismiss delay in ms. Pass 0 to keep.
 */
function showAlert(message, type = 'info', containerId = 'alertContainer', duration = 5000) {
  let container = document.getElementById(containerId);

  // Create a fallback container inserted before main content if none exists
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;width:min(90vw,480px);';
    document.body.appendChild(container);
  }

  const alert = document.createElement('div');
  alert.className = `alert alert--${type}`;
  alert.setAttribute('role', 'alert');
  alert.textContent = message;

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.style.cssText = 'float:right;background:none;border:none;font-size:1.2rem;cursor:pointer;margin-left:0.5rem;line-height:1;';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => alert.remove());
  alert.insertBefore(closeBtn, alert.firstChild);

  container.appendChild(alert);

  if (duration > 0) {
    setTimeout(() => alert.remove(), duration);
  }
}


/* ─────────────────────────────────────────────────────────────────────────────
   Validation Helpers
───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns true if the string is a valid email address.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Mark a form-control as invalid and show an error message.
 * @param {HTMLElement} input
 * @param {string} message
 */
function setFieldError(input, message) {
  input.classList.add('is-invalid');
  input.classList.remove('is-valid');

  let error = input.parentElement.querySelector('.form-error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'form-error';
    input.after(error);
  }
  error.textContent = message;
}

/**
 * Mark a form-control as valid and clear error message.
 * @param {HTMLElement} input
 */
function setFieldValid(input) {
  input.classList.remove('is-invalid');
  input.classList.add('is-valid');

  const error = input.parentElement.querySelector('.form-error');
  if (error) error.remove();
}

/**
 * Clear all validation state on a form.
 * @param {HTMLFormElement} form
 */
function clearFormValidation(form) {
  form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
    el.classList.remove('is-invalid', 'is-valid');
  });
  form.querySelectorAll('.form-error').forEach(el => el.remove());
}


/* ─────────────────────────────────────────────────────────────────────────────
   API Base URL helper
───────────────────────────────────────────────────────────────────────────── */

/**
 * Returns the correct API base URL depending on the current environment.
 * @returns {string}
 */
function getApiBaseUrl() {
  const isLocal = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';
  return isLocal
    ? 'http://localhost:3000/api'
    : 'https://yah-backend.onrender.com/api';
}


/* ─────────────────────────────────────────────────────────────────────────────
   Auto-init on DOMContentLoaded
───────────────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSmoothScroll();
  initBackToTop();
  initAnimations();
});


/* ─────────────────────────────────────────────────────────────────────────────
   Exports (available globally for page scripts)
───────────────────────────────────────────────────────────────────────────── */
window.YAH = window.YAH || {};
Object.assign(window.YAH, {
  showAlert,
  isValidEmail,
  setFieldError,
  setFieldValid,
  clearFormValidation,
  getApiBaseUrl,
});
