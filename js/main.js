// Main JavaScript for Young Access Hub Website
// Version: 2025-09-26-v2 - Fixed all null reference errors

console.log('Loading main.js v2025-09-26-v2');

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initSmoothScrolling();
    initBackToTop();
    initContactForm();
    initScrollAnimations();
    initNavbarBehavior();
    initSummitCountdown();
    initImpactCounters(); // Add this new function
});

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Back to top button functionality
function initBackToTop() {
    const backToTopBtn = document.querySelector('.back-to-top');
    
    // Only initialize if back-to-top button exists
    if (!backToTopBtn) return;
    
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopBtn.style.display = 'block';
            backToTopBtn.style.opacity = '1';
        } else {
            backToTopBtn.style.display = 'none';
            backToTopBtn.style.opacity = '0';
        }
    });
    
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Contact form handling
function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data - check if elements exist
            const nameField = document.getElementById('name');
            const emailField = document.getElementById('email');
            const subjectField = document.getElementById('subject');
            const messageField = document.getElementById('message');
            
            if (!nameField || !emailField || !subjectField || !messageField) {
                showAlert('Form elements not found. Please refresh the page.', 'error');
                return;
            }
            
            const name = nameField.value;
            const email = emailField.value;
            const subject = subjectField.value;
            const message = messageField.value;
            
            // Basic validation
            if (!name || !email || !subject || !message) {
                showAlert('Please fill in all fields.', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showAlert('Please enter a valid email address.', 'error');
                return;
            }
            
            // Simulate form submission (replace with actual form handling)
            submitForm(name, email, subject, message);
        });
    }
}

// Form submission handler (placeholder - replace with actual backend integration)
function submitForm(name, email, subject, message) {
    // Show loading state
    const submitBtn = document.querySelector('.contact-form button[type="submit"]');
    
    if (!submitBtn) {
        showAlert('Submit button not found. Please refresh the page.', 'error');
        return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        const contactForm = document.querySelector('.contact-form');
        
        // Reset form if it exists
        if (contactForm) {
            contactForm.reset();
        }
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Show success message
        showAlert('Thank you for your message! We\'ll get back to you soon.', 'success');
        
        // In a real implementation, you would send the data to your backend:
        // fetch('/api/contact', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ name, email, subject, message })
        // });
    }, 2000);
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Alert system
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show custom-alert position-fixed`;
    alert.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert && alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('loaded');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.card, .impact-stat, .contact-item');
    animatedElements.forEach(el => {
        el.classList.add('loading');
        observer.observe(el);
    });
}

// Navbar behavior on scroll - Disabled to keep white background
function initNavbarBehavior() {
    // Removed scroll behavior to maintain consistent white background
    // const navbar = document.querySelector('.navbar');
    // let lastScrollY = window.scrollY;
    
    // window.addEventListener('scroll', function() {
    //     const currentScrollY = window.scrollY;
        
    //     if (currentScrollY > 100) {
    //         navbar.classList.add('navbar-scrolled');
    //     } else {
    //         navbar.classList.remove('navbar-scrolled');
    //     }
        
    //     lastScrollY = currentScrollY;
    // });
}

// Counter animation for impact stats
function animateCounters() {
    const counters = document.querySelectorAll('.impact-stat h3');
    
    if (counters.length === 0) return;
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace('+', ''));
        const duration = 2000; // 2 seconds
        const step = target / (duration / 16); // 60fps
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.textContent = target + '+';
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current) + '+';
            }
        }, 16);
    });
}

// Initialize impact counters with intersection observer
function initImpactCounters() {
    const impactSection = document.querySelector('.impact-stat');
    
    // Only initialize if impact stat elements exist
    if (!impactSection) {
        console.log('No impact stat elements found, skipping counter initialization');
        return;
    }
    
    const impactObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                impactObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    // Double check impactSection still exists and has closest method
    if (impactSection && typeof impactSection.closest === 'function') {
        const section = impactSection.closest('section');
        if (section) {
            impactObserver.observe(section);
        } else {
            // If no parent section, observe the element itself
            impactObserver.observe(impactSection);
        }
    } else {
        console.warn('Impact section element is invalid or missing closest method');
    }
}

// Add Google Analytics (placeholder)
function initAnalytics() {
    // Replace with your Google Analytics tracking ID
    // gtag('config', 'GA_TRACKING_ID');
    console.log('Analytics initialized (placeholder)');
}

// Newsletter subscription (placeholder)
function subscribeNewsletter(email) {
    if (!isValidEmail(email)) {
        showAlert('Please enter a valid email address.', 'error');
        return;
    }
    
    // Placeholder for newsletter subscription
    // In real implementation, integrate with Mailchimp or similar service
    showAlert('Thanks for subscribing to our newsletter!', 'success');
}

// Utility function to debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Removed navbar scroll CSS to maintain white background
// const style = document.createElement('style');
// style.textContent = `
//     .navbar-scrolled {
//         background-color: rgba(13, 110, 253, 0.95) !important;
//         backdrop-filter: blur(10px);
//         box-shadow: 0 2px 10px rgba(0,0,0,0.1);
//     }
// `;
// document.head.appendChild(style);

// Add loading class styles
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    .loading {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s ease;
    }
    
    .loading.loaded {
        opacity: 1;
        transform: translateY(0);
    }
`;
document.head.appendChild(loadingStyles);

// Summit Countdown Timer for Homepage
function initSummitCountdown() {
    const summitDays = document.getElementById('summitDays');
    const summitHours = document.getElementById('summitHours');
    const summitMinutes = document.getElementById('summitMinutes');
    
    // Only run if elements exist (on homepage)
    if (!summitDays) return;
    
    // Set summit date (November 15, 2025)
    const summitDate = new Date('November 15, 2025 09:00:00').getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = summitDate - now;
        
        if (distance < 0) {
            if (summitDays) summitDays.textContent = '00';
            if (summitHours) summitHours.textContent = '00';
            if (summitMinutes) summitMinutes.textContent = '00';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        if (summitDays) summitDays.textContent = days.toString().padStart(2, '0');
        if (summitHours) summitHours.textContent = hours.toString().padStart(2, '0');
        if (summitMinutes) summitMinutes.textContent = minutes.toString().padStart(2, '0');
    }
    
    // Update immediately and then every minute
    updateCountdown();
    setInterval(updateCountdown, 60000);
}
