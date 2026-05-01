/**
 * news.js — News & Updates page
 * Category filter + newsletter subscription.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initNewsFilter();
    initNewsletter();
  });

  /* ── Category filter ─────────────────────────────────────── */
  function initNewsFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const newsItems  = document.querySelectorAll('.news-item');

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Update active state
        filterBtns.forEach(function (b) { b.classList.remove('filter-btn--active'); });
        this.classList.add('filter-btn--active');

        const filter = this.getAttribute('data-filter');

        newsItems.forEach(function (item) {
          const show = filter === 'all' || item.getAttribute('data-category') === filter;
          item.style.display = show ? '' : 'none';
        });
      });
    });
  }

  /* ── Newsletter ──────────────────────────────────────────── */
  function initNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const emailInput = document.getElementById('newsletterEmail');

      if (!emailInput || !emailInput.value.trim()) {
        YAH.showAlert('Please enter your email address.', 'error');
        return;
      }

      if (!YAH.isValidEmail(emailInput.value.trim())) {
        YAH.showAlert('Please enter a valid email address.', 'error');
        return;
      }

      // Simulate subscription success
      YAH.showAlert('Thank you for subscribing! We\'ll keep you updated.', 'success');
      form.reset();
    });
  }
})();
