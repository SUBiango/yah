// Summit Registration System - Enhanced JavaScript

class SummitRegistration {
    constructor() {
        this.selectedTicket = null;
        this.registrationData = {};
        this.init();
    }
    
    init() {
        this.initCountdown();
        this.initRegistrationForm();
        this.initTicketSelection();
        this.initValidation();
        this.initAnimations();
    }
    
    // Enhanced countdown timer with more features
    initCountdown() {
        const summitDate = new Date('November 15, 2025 09:00:00').getTime();
        
        const countdown = setInterval(() => {
            const now = new Date().getTime();
            const distance = summitDate - now;
            
            if (distance < 0) {
                clearInterval(countdown);
                this.handleCountdownExpired();
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            this.updateCountdownDisplay(days, hours, minutes, seconds);
        }, 1000);
    }
    
    updateCountdownDisplay(days, hours, minutes, seconds) {
        const elements = {
            days: document.getElementById('days'),
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds')
        };
        
        if (elements.days) elements.days.textContent = days.toString().padStart(2, '0');
        if (elements.hours) elements.hours.textContent = hours.toString().padStart(2, '0');
        if (elements.minutes) elements.minutes.textContent = minutes.toString().padStart(2, '0');
        if (elements.seconds) elements.seconds.textContent = seconds.toString().padStart(2, '0');
        
        // Add animation effect
        Object.values(elements).forEach(el => {
            if (el) {
                el.style.transform = 'scale(1.1)';
                setTimeout(() => el.style.transform = 'scale(1)', 100);
            }
        });
    }
    
    handleCountdownExpired() {
        const countdownContainer = document.getElementById('countdown');
        if (countdownContainer) {
            countdownContainer.innerHTML = `
                <div class="col-12 text-center">
                    <h4 class="text-white mb-2">🎉 Summit is Live!</h4>
                    <p class="text-light">Join the live sessions now</p>
                </div>
            `;
        }
    }
    
    // Ticket selection with enhanced UX
    initTicketSelection() {
        window.selectTicket = (type, price) => {
            this.selectedTicket = { type, price };
            this.updateSelectedTicketDisplay(type, price);
            this.updatePricing(price);
            this.scrollToForm();
            this.updateButtonStates();
            this.trackTicketSelection(type, price);
        };
    }
    
    updateSelectedTicketDisplay(type, price) {
        const typeElement = document.getElementById('selectedTicketType');
        const priceElement = document.getElementById('selectedTicketPrice');
        const containerElement = document.querySelector('.selected-ticket');
        
        if (typeElement) typeElement.textContent = this.capitalizeFirst(type);
        if (priceElement) priceElement.textContent = price;
        if (containerElement) {
            containerElement.style.display = 'block';
            containerElement.classList.add('animate__animated', 'animate__fadeIn');
        }
    }
    
    updatePricing(ticketPrice) {
        const processingFee = Math.round(ticketPrice * 0.03 * 100) / 100;
        const total = ticketPrice + processingFee;
        
        const elements = {
            ticketPrice: document.getElementById('ticketPrice'),
            processingFee: document.getElementById('processingFee'),
            totalPrice: document.getElementById('totalPrice')
        };
        
        if (elements.ticketPrice) elements.ticketPrice.textContent = `$${ticketPrice}`;
        if (elements.processingFee) elements.processingFee.textContent = `$${processingFee}`;
        if (elements.totalPrice) elements.totalPrice.textContent = `$${total}`;
        
        // Animate price changes
        Object.values(elements).forEach(el => {
            if (el) {
                el.style.color = '#e67e22';
                el.style.fontWeight = 'bold';
                setTimeout(() => {
                    el.style.color = '';
                    el.style.fontWeight = '';
                }, 1000);
            }
        });
    }
    
    scrollToForm() {
        const form = document.getElementById('registrationForm');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    updateButtonStates() {
        // Reset all buttons
        document.querySelectorAll('.pricing-card button').forEach(btn => {
            btn.classList.remove('btn-success');
            btn.innerHTML = btn.innerHTML.replace('<i class="fas fa-check me-2"></i>', '');
            if (btn.textContent.includes('Selected')) {
                btn.innerHTML = 'Select Plan';
            }
        });
        
        // Update selected button
        if (event && event.target) {
            event.target.classList.add('btn-success');
            event.target.innerHTML = '<i class="fas fa-check me-2"></i>Selected';
        }
    }
    
    // Enhanced form validation
    initValidation() {
        const form = document.getElementById('registrationForm');
        if (!form) return;
        
        // Real-time validation
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Email validation
        if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        
        // Phone validation
        if (field.type === 'tel' && value) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            }
        }
        
        this.showFieldValidation(field, isValid, errorMessage);
        return isValid;
    }
    
    showFieldValidation(field, isValid, errorMessage) {
        const errorElement = field.parentNode.querySelector('.field-error');
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            if (errorElement) errorElement.remove();
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
            
            if (!errorElement) {
                const error = document.createElement('div');
                error.className = 'field-error text-danger small mt-1';
                error.textContent = errorMessage;
                field.parentNode.appendChild(error);
            } else {
                errorElement.textContent = errorMessage;
            }
        }
    }
    
    clearFieldError(field) {
        field.classList.remove('is-invalid', 'is-valid');
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) errorElement.remove();
    }
    
    // Enhanced form submission
    initRegistrationForm() {
        const form = document.getElementById('registrationForm');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission(form);
        });
    }
    
    handleFormSubmission(form) {
        // Check if ticket is selected
        if (!this.selectedTicket) {
            this.showAlert('Please select a ticket type first.', 'warning');
            this.scrollToTickets();
            return;
        }
        
        // Validate all fields
        const isFormValid = this.validateForm(form);
        if (!isFormValid) {
            this.showAlert('Please correct the errors in the form.', 'error');
            return;
        }
        
        // Collect form data
        this.registrationData = this.collectFormData(form);
        
        // Process registration
        this.processRegistration(form);
    }
    
    validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        // Validate radio buttons
        const trackRadios = form.querySelectorAll('input[name="track"]');
        const trackSelected = Array.from(trackRadios).some(radio => radio.checked);
        if (!trackSelected) {
            this.showAlert('Please select your primary track of interest.', 'warning');
            isValid = false;
        }
        
        // Validate terms checkbox
        const termsCheckbox = form.querySelector('#terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            this.showAlert('Please accept the Terms & Conditions.', 'warning');
            isValid = false;
        }
        
        return isValid;
    }
    
    collectFormData(form) {
        const formData = new FormData(form);
        const data = {
            ticket: this.selectedTicket,
            personalInfo: {
                firstName: formData.get('firstName') || form.querySelector('#firstName')?.value,
                lastName: formData.get('lastName') || form.querySelector('#lastName')?.value,
                email: formData.get('email') || form.querySelector('#email')?.value,
                phone: formData.get('phone') || form.querySelector('#phone')?.value,
                age: formData.get('age') || form.querySelector('#age')?.value,
                occupation: formData.get('occupation') || form.querySelector('#occupation')?.value,
                organization: formData.get('organization') || form.querySelector('#organization')?.value
            },
            preferences: {
                track: formData.get('track') || this.getSelectedRadioValue('track'),
                dietary: formData.get('dietary') || form.querySelector('#dietary')?.value,
                newsletter: formData.get('newsletter') === 'on' || form.querySelector('#newsletter')?.checked
            },
            emergency: {
                name: formData.get('emergencyName') || form.querySelector('#emergencyName')?.value,
                phone: formData.get('emergencyPhone') || form.querySelector('#emergencyPhone')?.value
            },
            timestamp: new Date().toISOString()
        };
        
        return data;
    }
    
    getSelectedRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : null;
    }
    
    processRegistration(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing Registration...';
        submitBtn.disabled = true;
        
        // Simulate payment processing
        this.simulatePaymentProcess()
            .then(() => {
                this.handleSuccessfulRegistration(form, submitBtn, originalText);
            })
            .catch(() => {
                this.handleRegistrationError(submitBtn, originalText);
            });
    }
    
    simulatePaymentProcess() {
        return new Promise((resolve, reject) => {
            // Simulate API call to payment processor
            setTimeout(() => {
                // 95% success rate for demo
                if (Math.random() > 0.05) {
                    resolve();
                } else {
                    reject(new Error('Payment processing failed'));
                }
            }, 3000);
        });
    }
    
    handleSuccessfulRegistration(form, submitBtn, originalText) {
        // Show success modal
        this.showSuccessModal();
        
        // Send confirmation email (simulated)
        this.sendConfirmationEmail();
        
        // Save registration to localStorage (for demo purposes)
        this.saveRegistrationLocal();
        
        // Reset form and UI
        this.resetFormAndUI(form, submitBtn, originalText);
        
        // Track successful registration
        this.trackRegistrationSuccess();
    }
    
    handleRegistrationError(submitBtn, originalText) {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        this.showAlert('Payment processing failed. Please try again or contact support.', 'error');
        this.trackRegistrationError();
    }
    
    showSuccessModal() {
        const modal = new bootstrap.Modal(document.getElementById('successModal'));
        modal.show();
        
        // Add confetti effect
        this.createConfettiEffect();
    }
    
    createConfettiEffect() {
        // Simple confetti effect using CSS animations
        const colors = ['#ffc107', '#e67e22', '#3498db', '#2ecc71', '#e74c3c'];
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}vw;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                z-index: 10000;
                animation: fall ${Math.random() * 3 + 2}s linear forwards;
            `;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }
        
        // Add fall animation
        if (!document.querySelector('#confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    sendConfirmationEmail() {
        // Simulate sending confirmation email
        console.log('Confirmation email sent to:', this.registrationData.personalInfo.email);
    }
    
    saveRegistrationLocal() {
        const registrations = JSON.parse(localStorage.getItem('summitRegistrations') || '[]');
        registrations.push(this.registrationData);
        localStorage.setItem('summitRegistrations', JSON.stringify(registrations));
    }
    
    resetFormAndUI(form, submitBtn, originalText) {
        // Reset form
        form.reset();
        form.classList.remove('was-validated');
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Reset ticket selection
        this.selectedTicket = null;
        const selectedTicketElement = document.querySelector('.selected-ticket');
        if (selectedTicketElement) selectedTicketElement.style.display = 'none';
        
        // Reset pricing
        this.updatePricing(0);
        
        // Reset ticket buttons
        document.querySelectorAll('.pricing-card button').forEach(btn => {
            btn.classList.remove('btn-success');
            btn.innerHTML = btn.innerHTML.replace('<i class="fas fa-check me-2"></i>', '');
            btn.innerHTML = 'Select Plan';
        });
        
        // Clear validation states
        form.querySelectorAll('.is-valid, .is-invalid').forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
        form.querySelectorAll('.field-error').forEach(error => error.remove());
    }
    
    // Utility methods
    scrollToTickets() {
        const ticketsSection = document.querySelector('.pricing-card').closest('section');
        if (ticketsSection) {
            ticketsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    showAlert(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 5000);
    }
    
    // Analytics tracking methods
    trackTicketSelection(type, price) {
        console.log('Ticket selected:', { type, price });
        // Integration with Google Analytics or other tracking
    }
    
    trackRegistrationSuccess() {
        console.log('Registration successful:', this.registrationData);
        // Track conversion event
    }
    
    trackRegistrationError() {
        console.log('Registration failed');
        // Track error event
    }
    
    // Animation effects
    initAnimations() {
        // Animate speaker cards on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        document.querySelectorAll('.speaker-card, .schedule-day, .pricing-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
        
        // Stagger animation for speaker cards
        document.querySelectorAll('.speaker-card').forEach((card, index) => {
            card.style.transitionDelay = `${index * 0.1}s`;
        });
    }
}

// Initialize Summit Registration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on summit page
    if (document.querySelector('#countdown') || document.getElementById('registrationForm')) {
        new SummitRegistration();
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummitRegistration;
}
