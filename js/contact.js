/**
 * contact.js — Contact page logic
 * Handles form validation and submission feedback.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initContactForm();
  });

  function initContactForm() {
    const form = document.querySelector('.contact-form-page');
    if (!form) return;

    const submitBtn = document.getElementById('contactSubmitBtn');

    form.addEventListener('submit', function (e) {
      const firstName   = document.getElementById('firstName');
      const lastName    = document.getElementById('lastName');
      const email       = document.getElementById('email');
      const subject     = document.getElementById('subject');
      const message     = document.getElementById('message');

      // Clear previous validation state
      YAH.clearFormValidation(form);

      let valid = true;

      if (!firstName.value.trim()) {
        YAH.setFieldError(firstName, 'First name is required.');
        valid = false;
      } else {
        YAH.setFieldValid(firstName);
      }

      if (!lastName.value.trim()) {
        YAH.setFieldError(lastName, 'Last name is required.');
        valid = false;
      } else {
        YAH.setFieldValid(lastName);
      }

      if (!email.value.trim()) {
        YAH.setFieldError(email, 'Email address is required.');
        valid = false;
      } else if (!YAH.isValidEmail(email.value.trim())) {
        YAH.setFieldError(email, 'Please enter a valid email address.');
        valid = false;
      } else {
        YAH.setFieldValid(email);
      }

      if (!subject.value) {
        YAH.setFieldError(subject, 'Please select a topic.');
        valid = false;
      } else {
        YAH.setFieldValid(subject);
      }

      if (!message.value.trim()) {
        YAH.setFieldError(message, 'Message cannot be empty.');
        valid = false;
      } else {
        YAH.setFieldValid(message);
      }

      if (!valid) {
        e.preventDefault();
        YAH.showAlert('Please fill in all required fields.', 'error');
        return;
      }

      // Show loading state — let Netlify handle the actual submission
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
        submitBtn.disabled = true;
      }
    });
  }
})();
