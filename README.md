# Young Access Hub (YAH) Website

A modern, responsive website for Young Access Hub - an organization dedicated to bridging the gap between young people and the skills and tools for self-transformation.

## Project Overview

This website serves as the central online presence for YAH, showcasing the organization's mission, impact, and flagship projects while providing an engaging platform for youth, partners, and stakeholders.

## Features

### 🏠 Homepage
- Hero section with mission statement and call-to-action
- About Us overview with mission, vision, and values
- Flagship projects showcase (E-Learning Platform & Youth Summit)
- Impact statistics and testimonials
- Latest news and updates
- Contact form

### 📖 About Page
- Detailed mission, vision, and values
- Organization story and history
- Team member profiles
- Impact metrics
- Call-to-action for involvement

### 🚀 Projects Page
- Comprehensive E-Learning Platform overview
- Annual Youth Summit details
- Additional initiatives showcase
- Project status and progress tracking
- Registration and engagement links

### 📰 News & Updates Page
- Latest announcements and events
- Success stories and testimonials
- Filterable news categories
- Newsletter subscription
- News archive access

### 📞 Contact Page
- Multiple contact methods (email, phone, address)
- Comprehensive contact form with topic selection
- Quick action buttons for common requests
- Social media links and office hours
- FAQ section

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **CSS Framework**: Bootstrap 5.3.2
- **Preprocessor**: Sass/SCSS
- **Icons**: Font Awesome 6.0
- **Build Tools**: npm scripts for Sass compilation

## Getting Started

### Prerequisites
- Node.js and npm installed
- Modern web browser
- Text editor/IDE

### Installation

1. Clone or download the project files
2. Navigate to the project directory:
   ```bash
   cd yah
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Compile Sass to CSS:
   ```bash
   npm run sass:build
   ```

5. For development with auto-compilation:
   ```bash
   npm run sass:watch
   ```

### Project Structure

```
yah/
├── index.html              # Homepage
├── about.html              # About page
├── projects.html           # Projects page
├── news.html              # News & updates page
├── contact.html           # Contact page
├── css/
│   ├── bootstrap.css      # Bootstrap framework
│   └── style.css          # Custom compiled styles
├── scss/
│   ├── bootstrap.scss     # Bootstrap source
│   └── style.scss         # Custom SCSS
├── js/
│   ├── bootstrap.bundle.js # Bootstrap JavaScript
│   └── main.js            # Custom JavaScript
├── package.json           # Node.js dependencies
└── README.md             # Documentation
```

## Key Features & Functionality

### Responsive Design
- Mobile-first approach
- Optimized for all device sizes
- Touch-friendly interfaces

### Interactive Elements
- Smooth scrolling navigation
- Animated counters and statistics
- Hover effects and transitions
- Dynamic content filtering (news page)
- Form validation and submission

### Accessibility
- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- Keyboard navigation support
- Screen reader compatibility

### Performance
- Optimized images and assets
- Minimal external dependencies
- Clean, efficient code
- Fast loading times

## Customization

### Colors and Branding
Main brand colors can be modified in `scss/style.scss`:
- Primary: #0d6efd (Blue)
- Secondary: #6f42c1 (Purple)
- Warning: #ffc107 (Yellow)

### Content Updates
- Update text content directly in HTML files
- Add new team members in `about.html`
- Add news articles in `news.html`
- Modify contact information in `contact.html`

### Styling Changes
1. Edit `scss/style.scss` for custom styles
2. Run `npm run sass:build` to compile
3. For ongoing development, use `npm run sass:watch`

## Deployment

The website is designed for easy deployment to static hosting services:

### Recommended Platforms
- **Netlify** (recommended in PRD)
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Deployment Steps
1. Build the project: `npm run sass:build`
2. Upload all files to your hosting provider
3. Ensure `index.html` is set as the default document

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contact Form Integration

The contact forms are currently set up with client-side validation and placeholder submission. To integrate with a backend:

1. Replace the `submitForm()` function in `js/main.js`
2. Add your backend API endpoint
3. Configure email service (e.g., EmailJS, Formspree, or custom backend)

## SEO Optimization

- Semantic HTML structure
- Meta descriptions on all pages
- Proper heading hierarchy
- Fast loading performance
- Mobile optimization

## Future Enhancements

- Integration with Google Analytics
- Mailchimp newsletter integration
- CMS integration for easy content updates
- Multi-language support
- Advanced form handling with backend integration

## Support

For technical support or questions about the website:
- Email: info@youngaccesshub.org
- Phone: +1 (555) 123-4567

## License

© 2025 Young Access Hub. All rights reserved.

---

*Built with ❤️ for empowering young people and creating positive change in communities.*
Social enterprise website
