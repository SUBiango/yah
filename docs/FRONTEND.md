# Frontend Development Guide

## Overview
This guide covers the frontend architecture, components, and development practices for the YAH website.

## Technology Stack
- **HTML5**: Semantic markup and modern web standards
- **CSS3**: Custom styles with Bootstrap 5 framework
- **JavaScript ES6+**: Modern JavaScript features
- **Bootstrap 5**: Responsive framework
- **Font Awesome 6.0.0**: Icon library
- **HTML5-QRCode v2.3.8**: QR code scanning

## Project Structure

```
yah/
├── *.html                     # Page templates
├── assets/                    # Static assets
│   ├── logo.png              # YAH logo
│   ├── photos/               # General photos
│   │   ├── binta_bah_profile_photo.jpeg
│   │   ├── fredson_profile_photo.jpeg
│   │   ├── mariama_bah_profile_photo.JPG
│   │   ├── summit.JPG
│   │   └── umaru_profile_photo.JPG
│   └── speaker-photos/        # Speaker photos
│       └── 2025/
├── css/                       # Stylesheets
│   ├── bootstrap.css         # Bootstrap framework
│   └── style.css             # Custom styles
└── js/                        # JavaScript files
    ├── bootstrap.bundle.js   # Bootstrap JavaScript
    ├── main.js               # General functionality
    ├── summit.js             # Summit-specific features
    └── admin.js              # Admin dashboard
```

## Page Architecture

### Core Pages

#### index.html (Homepage)
**Purpose**: Main landing page showcasing YAH's mission and current initiatives.

**Key Features**:
- Hero section with call-to-action
- About preview section
- Summit promotion banner
- Impact statistics
- Projects showcase

**JavaScript Dependencies**:
- `main.js`: General site functionality
- Bootstrap bundle for interactive components

**Custom Styles**:
- Hero background gradient
- Summit promotion styling
- Responsive design for mobile

#### about.html (About Page)
**Purpose**: Detailed information about Young Access Hub organization.

**Key Features**:
- Organization history and mission
- Team member profiles
- Core values and objectives

#### contact.html (Contact Page)
**Purpose**: Contact information and inquiry form.

**Key Features**:
- Contact form with validation
- Organization contact details
- Social media links

#### projects.html (Projects Showcase)
**Purpose**: Display YAH's current and upcoming projects.

**Key Features**:
- Project cards with descriptions
- Feature highlights
- Call-to-action buttons

#### summit.html (Youth Summit 2025)
**Purpose**: Event landing page for the annual Youth Summit.

**Key Features**:
- Event countdown timer
- Speaker profiles with social media
- Event schedule
- Registration CTA
- Venue information

**JavaScript Dependencies**:
- `summit.js`: Countdown timer, speaker interactions
- QR functionality integration

### Registration System Pages

#### registration.html (Main Registration)
**Purpose**: Primary registration form for event participants.

**Key Components**:
```html
<!-- Access Code Input -->
<div class="access-code-section">
  <input type="text" id="accessCode" maxlength="8" pattern="[A-Z0-9]{8}">
  <div class="validation-feedback"></div>
</div>

<!-- Registration Form -->
<form id="registrationForm">
  <!-- Personal Information -->
  <input type="text" id="firstName" required>
  <input type="text" id="lastName" required>
  <input type="email" id="email" required>
  <input type="tel" id="phone" required>
  
  <!-- Demographics -->
  <select id="age" required>
    <option value="15-18">15-18</option>
    <option value="19-24">19-24</option>
    <option value="25-30">25-30</option>
    <option value="31-35">31-35</option>
  </select>
  
  <select id="occupation" required>
    <option value="student">Student</option>
    <option value="professional">Working Professional</option>
    <option value="entrepreneur">Entrepreneur</option>
    <option value="unemployed">Currently Unemployed</option>
    <option value="other">Other</option>
  </select>
  
  <input type="text" id="organization" placeholder="School/Organization">
</form>
```

**Validation Features**:
- Real-time access code format validation
- Required field enforcement
- Email format validation
- Phone number validation
- Form state management

**Mobile Optimizations**:
- Touch-friendly form inputs
- Responsive layout
- Keyboard optimization for mobile
- Progress indicators

#### confirmation.html (Registration Success)
**Purpose**: Display registration confirmation and QR code.

**Key Features**:
- Participant ID display
- QR code for event check-in
- Event details confirmation
- Email confirmation notice

#### scanner.html (QR Code Scanner)
**Purpose**: Event check-in system using QR code scanning.

**Key Components**:
```html
<!-- Scanner Interface -->
<div id="qr-scanner">
  <div id="scanner-container"></div>
  <div id="scanner-controls">
    <button id="start-scanner">Start Scanner</button>
    <button id="stop-scanner">Stop Scanner</button>
  </div>
</div>

<!-- Scan Results -->
<div id="scan-results">
  <div id="participant-info"></div>
  <div id="check-in-status"></div>
</div>
```

**Scanner Implementation**:
```javascript
// HTML5-QRCode integration
const html5QrCode = new Html5Qrcode("scanner-container");

async function startScanning() {
  try {
    await html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      onScanSuccess,
      onScanError
    );
  } catch (err) {
    console.error("Scanner start failed:", err);
  }
}

function onScanSuccess(decodedText, decodedResult) {
  // Process scanned participant ID
  handleParticipantCheckIn(decodedText);
}
```

#### note.html (Mobile Success Page)
**Purpose**: Mobile-optimized confirmation page.

**Key Features**:
- Simplified mobile interface
- Essential information display
- Touch-friendly navigation

### Admin Interface

#### admin.html (Admin Dashboard)
**Purpose**: Complete admin interface for event management.

**Key Sections**:

1. **Statistics Dashboard**
```html
<div class="admin-stats">
  <div class="stat-card">
    <h3 id="total-registrations">0</h3>
    <p>Total Registrations</p>
  </div>
  <div class="stat-card">
    <h3 id="available-codes">0</h3>
    <p>Available Codes</p>
  </div>
</div>
```

2. **Access Code Management**
```html
<div class="code-management">
  <form id="generate-codes-form">
    <input type="number" id="code-count" min="1" max="100" value="10">
    <select id="expiry-type">
      <option value="fixed">Fixed Expiry (Nov 14, 2025)</option>
      <option value="hours">Hours from now</option>
    </select>
    <button type="submit">Generate Codes</button>
  </form>
  
  <div id="generated-codes-list"></div>
</div>
```

3. **Registration Management**
```html
<div class="registration-management">
  <table id="registrations-table">
    <thead>
      <tr>
        <th>Participant ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Registration Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="registrations-tbody"></tbody>
  </table>
</div>
```

## JavaScript Architecture

### main.js (General Functionality)
**Purpose**: Site-wide JavaScript functionality.

**Key Features**:
```javascript
// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    target.scrollIntoView({ behavior: 'smooth' });
  });
});

// Back to top button
const backToTopButton = document.querySelector('.back-to-top');
window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopButton.style.display = 'block';
  } else {
    backToTopButton.style.display = 'none';
  }
});

// Mobile menu toggle
const navbarToggler = document.querySelector('.navbar-toggler');
const navbarCollapse = document.querySelector('.navbar-collapse');

navbarToggler.addEventListener('click', () => {
  navbarCollapse.classList.toggle('show');
});
```

### summit.js (Summit-Specific Features)
**Purpose**: Youth Summit 2025 page functionality.

**Key Components**:

1. **Countdown Timer**
```javascript
class SummitRegistration {
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
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
  }
}
```

2. **Speaker Interactions**
```javascript
// Speaker card animations
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

document.querySelectorAll('.speaker-card').forEach(card => {
  observer.observe(card);
});
```

### admin.js (Admin Dashboard)
**Purpose**: Admin interface functionality with API integration.

**Key Features**:

1. **Statistics Loading**
```javascript
async function loadStatistics() {
  try {
    const response = await fetch('/api/admin/statistics', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      updateStatisticsDisplay(result.data);
    } else {
      showError('Failed to load statistics');
    }
  } catch (error) {
    console.error('Statistics loading error:', error);
    showError('Connection error while loading statistics');
  }
}

function updateStatisticsDisplay(data) {
  document.getElementById('total-registrations').textContent = data.registrations.total;
  document.getElementById('total-codes').textContent = data.accessCodes.total;
  document.getElementById('used-codes').textContent = data.accessCodes.used;
  document.getElementById('available-codes').textContent = data.accessCodes.unused;
}
```

2. **Access Code Generation**
```javascript
async function generateAccessCodes(count, useFixedExpiry = true) {
  try {
    const response = await fetch('/api/admin/generate-codes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        count,
        useFixedExpiry,
        eventName: 'Youth Summit 2025'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      displayGeneratedCodes(result.data.codes);
      loadStatistics(); // Refresh stats
    } else {
      showError(result.error);
    }
  } catch (error) {
    console.error('Code generation error:', error);
    showError('Failed to generate access codes');
  }
}
```

3. **Registration Management**
```javascript
async function loadRegistrations(skip = 0, limit = 100) {
  try {
    const response = await fetch(`/api/admin/registrations?skip=${skip}&limit=${limit}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      populateRegistrationsTable(result.data.registrations);
      updatePagination(result.data.total, skip, limit);
    } else {
      showError('Failed to load registrations');
    }
  } catch (error) {
    console.error('Registrations loading error:', error);
    showError('Connection error while loading registrations');
  }
}
```

## CSS Architecture

### Custom Styles (style.css)
**Purpose**: Custom styling and Bootstrap overrides.

**Key Features**:

1. **CSS Variables**
```css
:root {
  --bs-primary: #037195 !important;
  --bs-primary-rgb: 3, 113, 149 !important;
  --bs-warning: #ffc107;
  --bs-warning-rgb: 255, 193, 7;
}
```

2. **Typography**
```css
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  overflow-x: hidden;
}

.display-4 {
  font-weight: 700;
}

.lead {
  font-size: 1.125rem;
  font-weight: 400;
}
```

3. **Component Styles**
```css
/* Hero Section */
.hero-section {
  background: linear-gradient(135deg, #037195 0%, #0056b3 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
}

/* Speaker Cards */
.speaker-card {
  border: none;
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.speaker-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

/* Countdown Timer */
.countdown-timer {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  margin: 2rem 0;
}

.countdown-number {
  font-size: 3rem;
  font-weight: bold;
  color: #fff;
  display: block;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}
```

4. **Responsive Design**
```css
/* Mobile Optimizations */
@media (max-width: 768px) {
  .summit-hero {
    padding-top: 6rem !important;
    padding-bottom: 3rem !important;
  }
  
  .countdown-number {
    font-size: 2rem;
  }
  
  .display-3 {
    font-size: 2.5rem;
  }
}

@media (max-width: 576px) {
  .summit-hero {
    padding-top: 7rem !important;
  }
  
  .countdown-timer {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
}
```

5. **Form Styling**
```css
.form-control:focus {
  border-color: var(--bs-warning);
  box-shadow: 0 0 0 0.2rem rgba(255, 193, 7, 0.25);
}

.btn-warning {
  background-color: var(--bs-warning);
  border-color: var(--bs-warning);
}

.btn-warning:hover {
  background-color: #e0a800;
  border-color: #d39e00;
}
```

## Development Workflow

### Local Development Setup
```bash
# 1. Clone repository
git clone https://github.com/SUBiango/yah.git
cd yah

# 2. Start local server (choose one)
# Option A: Python
python -m http.server 3000

# Option B: Node.js serve
npx serve . -p 3000

# Option C: VS Code Live Server extension
# Right-click on index.html -> "Open with Live Server"

# 3. Start backend (in separate terminal)
cd backend
npm install
npm run dev
```

### Code Organization Best Practices

1. **HTML Structure**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Meta tags -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- External stylesheets -->
  <link rel="stylesheet" href="css/bootstrap.css">
  <link rel="stylesheet" href="css/style.css">
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
  
  <title>Page Title | Young Access Hub</title>
</head>
<body>
  <!-- Content -->
  
  <!-- Scripts at bottom -->
  <script src="js/bootstrap.bundle.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

2. **JavaScript Modules**
```javascript
// Use classes for complex functionality
class RegistrationSystem {
  constructor() {
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadInitialData();
  }
  
  setupEventListeners() {
    // Event binding
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new RegistrationSystem();
});
```

3. **CSS Organization**
```css
/* 1. CSS Variables */
:root { }

/* 2. Base styles */
body, html { }

/* 3. Layout components */
.header, .footer { }

/* 4. Page-specific styles */
.hero-section { }

/* 5. Component styles */
.card, .btn { }

/* 6. Utility classes */
.text-center, .mb-4 { }

/* 7. Media queries */
@media (max-width: 768px) { }
```

### Performance Optimization

1. **Image Optimization**
```bash
# Compress images before deployment
# Use tools like ImageOptim, TinyPNG, or imagemin
```

2. **CSS/JS Minification**
```bash
# For production, minify CSS and JS files
# Use tools like UglifyJS, Terser, or online minifiers
```

3. **Asset Loading**
```html
<!-- Preload critical resources -->
<link rel="preload" href="css/bootstrap.css" as="style">
<link rel="preload" href="js/main.js" as="script">

<!-- Lazy load non-critical images -->
<img src="image.jpg" loading="lazy" alt="Description">
```

### Browser Compatibility

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Polyfills Required**:
- None (modern browsers only)

**Feature Detection**:
```javascript
// Check for required features
if ('serviceWorker' in navigator) {
  // Service worker support
}

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  // Camera access support
}
```

### Testing Guidelines

1. **Manual Testing Checklist**
- [ ] All pages load correctly
- [ ] Forms submit successfully
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility
- [ ] QR scanner functionality
- [ ] Admin dashboard features

2. **Performance Testing**
- [ ] Page load times < 3 seconds
- [ ] Image optimization
- [ ] JavaScript performance
- [ ] Memory usage

3. **Accessibility Testing**
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Alt text for images

---

*For backend integration details, see the main DOCUMENTATION.md file.*