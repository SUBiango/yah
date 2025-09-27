// Registration Form Logic - Young Access Hub Event Registration
// Version: 2025-09-27-v1 - Removed emergency contact information
// Handles access code verification, form validation, and API integration

class RegistrationForm {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 3;
        this.accessCodeVerified = false;
        this.registrationData = {};
        this.apiBaseUrl = 'http://localhost:3000/api'; // Backend API URL
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initFormValidation();
        this.setupFormState();
    }

    bindEvents() {
        // Access code verification
        document.getElementById('verifyAccessCode')?.addEventListener('click', (e) => {
            this.verifyAccessCode(e);
        });

        // Form navigation
        document.getElementById('backToStep1')?.addEventListener('click', () => {
            this.goToStep(1);
        });

        // Form submission
        document.getElementById('registrationForm')?.addEventListener('submit', (e) => {
            this.handleFormSubmission(e);
        });

        // Real-time validation
        this.setupRealTimeValidation();

        // Access code input formatting
        const accessCodeInput = document.getElementById('accessCode');
        if (accessCodeInput) {
            accessCodeInput.addEventListener('input', (e) => {
                this.formatAccessCode(e.target);
            });
            
            accessCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.verifyAccessCode(e);
                }
            });
        }
    }

    initFormValidation() {
        // Initialize form validation rules and patterns
        this.validationRules = {
            firstName: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s]+$/,
                message: 'First name must contain only letters and be at least 2 characters long'
            },
            lastName: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s]+$/,
                message: 'Last name must contain only letters and be at least 2 characters long'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            phone: {
                required: true,
                pattern: /^\d{8,9}$/, // Local format validation
                message: 'Please enter a valid Sierra Leone phone number (8-9 digits)'
            },
            dateOfBirth: {
                required: true,
                minAge: 15,
                maxAge: 35,
                message: 'You must be between 15 and 35 years old to register'
            },
            occupation: {
                required: true,
                minLength: 2,
                message: 'Please enter your occupation'
            },
            gender: {
                required: true,
                message: 'Please select your gender'
            },
            district: {
                required: true,
                message: 'Please select your district'
            },
            interest: {
                required: true,
                message: 'Please select your area of interest'
            },
            termsAgreement: {
                required: true,
                message: 'You must agree to the terms and conditions'
            }
        };
    }

    setupRealTimeValidation() {
        const inputs = document.querySelectorAll('#registrationForm input, #registrationForm select');
        
        if (inputs.length === 0) {
            console.warn('No form inputs found for real-time validation');
            return;
        }
        
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
                
                input.addEventListener('input', () => {
                    this.clearFieldError(input);
                });
            }
        });
    }

    setupFormState() {
        // Ensure only step 1 is visible initially
        this.goToStep(1);
    }

    async verifyAccessCode(e) {
        e.preventDefault();
        
        const button = e.target;
        const accessCodeInput = document.getElementById('accessCode');
        const accessCode = accessCodeInput.value.trim().toUpperCase();

        // Validate access code format
        if (!this.validateAccessCodeFormat(accessCode)) {
            this.showFieldError('accessCode', 'Please enter a valid 8-character access code');
            return;
        }

        // Show loading state
        this.setButtonLoading(button, true);
        this.clearAlerts();

        try {
            // Call backend API to verify access code
            const response = await fetch(`${this.apiBaseUrl}/verify/${accessCode}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Access code is valid
                this.accessCodeVerified = true;
                this.registrationData.accessCode = accessCode;
                
                this.showAlert('Access code verified successfully!', 'success');
                this.markFieldValid('accessCode');
                
                // Move to next step after short delay
                setTimeout(() => {
                    this.goToStep(2);
                }, 1500);
                
            } else {
                // Access code is invalid - show specific error messages
                let errorMessage;
                let alertMessage;
                
                switch (data.errorType) {
                    case 'ALREADY_USED':
                        errorMessage = 'This access code has already been used';
                        alertMessage = 'This access code has already been used. Each code can only be used once for registration.';
                        break;
                    case 'EXPIRED':
                        errorMessage = 'Access code has expired';
                        alertMessage = 'This access code has expired. Please contact the organizers for a new code.';
                        break;
                    case 'NOT_FOUND':
                        errorMessage = 'Access code not found';
                        alertMessage = 'This access code is not valid. Please check the code and try again.';
                        break;
                    case 'INVALID_FORMAT':
                        errorMessage = 'Invalid access code format';
                        alertMessage = 'Please enter a valid 8-character access code.';
                        break;
                    default:
                        errorMessage = data.error || 'Invalid access code';
                        alertMessage = data.error || 'Invalid or expired access code';
                }
                
                this.showAlert(alertMessage, 'danger');
                this.showFieldError('accessCode', errorMessage);
                this.markFieldInvalid('accessCode');
                
                // Reset access code verification status
                this.accessCodeVerified = false;
                this.registrationData.accessCode = null;
            }

        } catch (error) {
            console.error('Access code verification error:', error);
            this.showAlert('Unable to verify access code. Please check your connection and try again.', 'danger');
            this.showFieldError('accessCode', 'Verification failed');
            
            // Reset access code verification status
            this.accessCodeVerified = false;
            this.registrationData.accessCode = null;
        } finally {
            this.setButtonLoading(button, false);
        }
    }

    async handleFormSubmission(e) {
        e.preventDefault();

        if (!this.accessCodeVerified) {
            this.showAlert('Please verify your access code first', 'warning');
            this.goToStep(1);
            return;
        }

        const form = e.target;
        const submitButton = document.getElementById('submitRegistration');

        // Validate all fields
        if (!this.validateAllFields()) {
            this.showAlert('Please correct the errors in the form', 'danger');
            return;
        }

        // Collect form data
        const formData = this.collectFormData(form);
        
        // Show loading state
        this.setButtonLoading(submitButton, true);
        this.clearAlerts();

        try {
            // Submit registration to backend
            const response = await fetch(`${this.apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Registration successful
                this.showAlert('Registration completed successfully!', 'success');
                
                // Redirect to confirmation page
                setTimeout(() => {
                    window.location.href = `confirmation.html?id=${data.data.registration.id}`;
                }, 2000);
                
            } else {
                // Registration failed
                console.log('Registration failed:', data);
                
                // Handle specific error types
                if (data.errorType) {
                    switch (data.errorType) {
                        case 'ALREADY_USED':
                            this.showAlert('This access code has already been used. Each code can only be used once for registration.', 'danger');
                            this.accessCodeVerified = false;
                            this.registrationData.accessCode = null;
                            this.goToStep(1);
                            return;
                        case 'EXPIRED':
                            this.showAlert('Your access code has expired. Please contact the organizers for a new code.', 'danger');
                            this.accessCodeVerified = false;
                            this.registrationData.accessCode = null;
                            this.goToStep(1);
                            return;
                        case 'NOT_FOUND':
                            this.showAlert('Access code is not valid. Please verify your access code again.', 'danger');
                            this.accessCodeVerified = false;
                            this.registrationData.accessCode = null;
                            this.goToStep(1);
                            return;
                    }
                }
                
                // Handle other specific errors
                if (data.error?.includes('email already exists')) {
                    this.showAlert('This email address is already registered for the event.', 'danger');
                    this.showFieldError('email', 'This email address is already registered');
                    this.markFieldInvalid('email');
                } else if (data.error?.includes('access code')) {
                    this.showAlert('There was an issue with your access code. Please verify it again.', 'danger');
                    this.accessCodeVerified = false;
                    this.registrationData.accessCode = null;
                    this.goToStep(1);
                } else {
                    // Generic error message
                    this.showAlert(data.error || 'Registration failed. Please try again.', 'danger');
                }
            }

        } catch (error) {
            console.error('Registration submission error:', error);
            this.showAlert('Unable to submit registration. Please check your connection and try again.', 'danger');
        } finally {
            this.setButtonLoading(submitButton, false);
        }
    }

    collectFormData(form) {
        const formData = new FormData(form);
        
        // Calculate age from date of birth
        const dateOfBirth = formData.get('dateOfBirth');
        const age = dateOfBirth ? this.calculateAge(dateOfBirth) : null;
        
        // Format phone number (convert local to international)
        const phoneRaw = formData.get('phone')?.trim();
        
        return {
            accessCode: this.registrationData.accessCode,
            firstName: formData.get('firstName')?.trim(),
            lastName: formData.get('lastName')?.trim(),
            email: formData.get('email')?.trim().toLowerCase(),
            phone: phoneRaw ? this.formatPhoneNumber(phoneRaw) : '',
            age: age,
            occupation: formData.get('occupation')?.trim(),
            gender: this.capitalizeFirst(formData.get('gender')), // Capitalize for backend
            district: formData.get('district')?.trim(), // Send as district to match backend
            interest: formData.get('interest')?.trim(),
            ...(formData.get('churchAffiliation')?.trim() && { 
                churchAffiliation: formData.get('churchAffiliation').trim() 
            }) // Only include churchAffiliation if it's not empty
        };
    }

    validateAllFields() {
        const requiredFields = [
            'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'occupation',
            'gender', 'district', 'interest', 'termsAgreement'
        ];
        
        let isValid = true;
        
        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name || field.id;
        let isValid = true;
        let errorMessage = '';

        // Clear previous validation state
        this.clearFieldError(fieldName);

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        // Email validation
        else if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
        }
        // Phone validation
        else if (field.type === 'tel' && value) {
            // Check local format first (8-9 digits)
            const localPhoneRegex = /^\d{8,9}$/;
            if (!localPhoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid Sierra Leone phone number (8-9 digits, e.g., 078988491)';
            }
        }
        // Date of birth validation
        else if (fieldName === 'dateOfBirth' && value) {
            const birthDate = new Date(value);
            const today = new Date();
            
            // Check if the date is valid
            if (isNaN(birthDate.getTime())) {
                isValid = false;
                errorMessage = 'Please enter a valid date of birth';
            } else {
                // Check if the date is in the future
                if (birthDate > today) {
                    isValid = false;
                    errorMessage = 'Date of birth cannot be in the future';
                } else {
                    // Check age range
                    const age = this.calculateAge(value);
                    if (age < 15 || age > 35) {
                        isValid = false;
                        errorMessage = 'Age must be between 15 and 35 years';
                    }
                }
            }
        }
        // Checkbox validation (Terms & Conditions)
        else if (field.type === 'checkbox' && fieldName === 'termsAgreement') {
            if (!field.checked) {
                isValid = false;
                errorMessage = 'You must agree to the Terms & Conditions and Privacy Policy';
            }
        }
        // Name validation
        else if (['firstName', 'lastName', 'emergencyName'].includes(fieldName) && value) {
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'Name must be at least 2 characters long';
            }
        }

        // Apply validation state
        if (isValid) {
            this.markFieldValid(fieldName);
        } else {
            this.markFieldInvalid(fieldName);
            this.showFieldError(fieldName, errorMessage);
        }

        return isValid;
    }

    validateAccessCodeFormat(code) {
        return /^[A-Z0-9]{8}$/.test(code);
    }

    formatAccessCode(input) {
        let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (value.length > 8) {
            value = value.substring(0, 8);
        }
        input.value = value;
    }

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.maxSteps) return;
        
        // Hide all sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(`section${stepNumber}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update step indicator
        this.updateStepIndicator(stepNumber);
        this.currentStep = stepNumber;
        
        // Scroll to top of form
        document.querySelector('.registration-form').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    updateStepIndicator(activeStep) {
        for (let i = 1; i <= this.maxSteps; i++) {
            const stepElement = document.getElementById(`step${i}`);
            if (stepElement) {
                stepElement.classList.remove('active', 'completed');
                
                if (i < activeStep) {
                    stepElement.classList.add('completed');
                } else if (i === activeStep) {
                    stepElement.classList.add('active');
                }
            }
        }
    }

    showAlert(message, type = 'info') {
        const alertArea = document.getElementById('alertArea');
        if (!alertArea) return;

        const alertClass = `alert-${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'danger' ? 'fa-exclamation-triangle' : 
                         type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

        alertArea.innerHTML = `
            <div class="alert ${alertClass} alert-custom alert-dismissible fade show" role="alert">
                <i class="fas ${iconClass} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-dismiss after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                const alert = alertArea.querySelector('.alert');
                if (alert) {
                    const bsAlert = new bootstrap.Alert(alert);
                    bsAlert.close();
                }
            }, 5000);
        }
    }

    clearAlerts() {
        const alertArea = document.getElementById('alertArea');
        if (alertArea) {
            alertArea.innerHTML = '';
        }
    }

    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    clearFieldError(fieldName) {
        const field = typeof fieldName === 'string' ? 
            document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`) : 
            fieldName;
            
        if (!field) return;
        
        const actualFieldName = field.name || field.id;
        if (!actualFieldName) return;
        
        const errorElement = document.getElementById(`${actualFieldName}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
    }

    markFieldValid(fieldName) {
        const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        }
    }

    markFieldInvalid(fieldName) {
        const field = document.getElementById(fieldName) || document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }
    }

    setButtonLoading(button, loading) {
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const loadingSpinner = button.querySelector('.loading-spinner');

        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (loadingSpinner) loadingSpinner.style.display = 'inline';
            button.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'inline';
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            button.disabled = false;
        }
    }

    // Utility Methods
    
    formatPhoneNumber(phoneNumber) {
        // Remove all non-digits
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Format for Sierra Leone numbers
        if (cleaned.startsWith('232')) {
            return `+${cleaned}`;
        } else if (cleaned.startsWith('0') && cleaned.length >= 9) {
            // Remove leading 0 and add +232
            return `+232${cleaned.substring(1)}`;
        } else if (cleaned.length >= 8) {
            // Assume it's a local number without leading 0
            return `+232${cleaned}`;
        } else {
            // If too short, return as is with +232 prefix
            return `+232${cleaned}`;
        }
    }

    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    // Analytics and tracking
    trackFormInteraction(action, data = {}) {
        // Track form interactions for analytics
        console.log('Form Interaction:', { action, ...data });
        
        // Here you could integrate with analytics services
        // gtag('event', action, { ...data });
    }

    capitalizeFirst(str) {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
}

// Initialize registration form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on registration page
    if (document.getElementById('registrationForm')) {
        new RegistrationForm();
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistrationForm;
}