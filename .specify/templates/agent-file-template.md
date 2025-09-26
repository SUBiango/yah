# [PROJECT NAME] Development Guidelines

Auto-generated from all feature plans. Last updated: [DATE]

## Constitutional Principles (NON-NEGOTIABLE)
- **Security-First**: Cryptographically secure access codes, one-time use enforcement, server-side validation
- **Test-Driven Development**: Write tests first, ensure they fail, then implement
- **UX Consistency**: Bootstrap theming, immediate form feedback, mobile-responsive design
- **Performance Standards**: <500ms form submission, <2s QR generation, async email delivery
- **Code Quality**: Single responsibility, clear naming, externalized config, documented schemas

## Active Technologies
[EXTRACTED FROM ALL PLAN.MD FILES]

## Project Structure
```
[ACTUAL STRUCTURE FROM PLANS]
```

## Security Requirements
- Access code generation MUST use crypto.randomBytes or equivalent
- Database operations MUST use transactions for one-time code enforcement  
- All inputs MUST be validated and sanitized server-side
- Email services MUST use TLS encryption

## Performance Targets
- Form submission: <500ms response time
- QR code generation: <2 seconds completion
- Admin dashboard: Support 1000+ registrations
- Database queries: Proper indexing on access codes and emails

## Commands
[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]

## Code Style
[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]

## Recent Changes
[LAST 3 FEATURES AND WHAT THEY ADDED]

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->