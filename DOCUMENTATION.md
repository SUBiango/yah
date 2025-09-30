# Young Access Hub (YAH) Website Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Frontend Structure](#frontend-structure)
4. [Backend System](#backend-system)
5. [Event Registration System](#event-registration-system)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [Deployment](#deployment)
9. [Development Setup](#development-setup)
10. [Security Features](#security-features)
11. [Troubleshooting](#troubleshooting)

## Project Overview

The Young Access Hub (YAH) website is a comprehensive platform for youth empowerment featuring:
- Multi-page informational website
- Event registration system with QR code functionality
- Admin dashboard for event management
- Secure access code system
- Email notification system
- Mobile-responsive design

### Key Features
- **Youth Summit 2025**: Event registration with QR code check-in
- **Secure Access Codes**: Cryptographically secure, one-time use codes
- **Mobile-First Design**: Bootstrap-based responsive UI
- **Admin Management**: Complete admin dashboard for event oversight
- **Email System**: Automated confirmations and notifications

## Architecture

```
YAH Website
├── Frontend (Static HTML/CSS/JS)
│   ├── Public Pages (index, about, contact, etc.)
│   ├── Registration System (registration.html, scanner.html)
│   └── Admin Dashboard (admin.html)
├── Backend (Node.js/Express)
│   ├── API Routes (/api/registration, /api/admin)
│   ├── Email Service (Nodemailer + Zoho)
│   └── Database Layer (MongoDB)
└── Database (MongoDB)
    ├── access_codes collection
    └── registrations collection (embedded participants)
```

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript ES6+, Bootstrap 5
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Email**: Nodemailer with Zoho SMTP
- **QR Codes**: qrcode npm package
- **QR Scanner**: HTML5-QRCode library
- **Deployment**: Render.com (Backend), Static hosting (Frontend)

## Frontend Structure

```
yah/
├── index.html              # Homepage
├── about.html              # About page
├── contact.html            # Contact page
├── projects.html           # Projects showcase
├── summit.html             # Youth Summit 2025 landing page
├── registration.html       # Event registration form
├── confirmation.html       # Registration confirmation
├── scanner.html            # QR code scanner for check-in
├── admin.html              # Admin dashboard
├── note.html               # Mobile-optimized success page
├── assets/                 # Images and media
│   ├── logo.png
│   ├── photos/
│   └── speaker-photos/
├── css/                    # Stylesheets
│   ├── bootstrap.css       # Bootstrap framework
│   └── style.css           # Custom styles
└── js/                     # JavaScript files
    ├── bootstrap.bundle.js # Bootstrap JS
    ├── main.js             # General site functionality
    ├── summit.js           # Summit-specific features
    └── admin.js            # Admin dashboard functionality
```

### Page Descriptions

#### Core Pages
- **index.html**: Homepage with hero section, about preview, summit promotion
- **about.html**: Detailed organization information
- **contact.html**: Contact form and information
- **projects.html**: Showcase of YAH initiatives
- **summit.html**: Youth Summit 2025 event page with speaker profiles

#### Registration System
- **registration.html**: Main registration form with access code validation
- **confirmation.html**: Success page after registration
- **scanner.html**: QR code scanner for event check-in
- **note.html**: Mobile-optimized confirmation page

#### Admin Interface
- **admin.html**: Complete admin dashboard for event management

## Backend System

Located in `/backend/` directory:

```
backend/
├── src/
│   ├── app.js                 # Main Express application
│   ├── routes/
│   │   ├── registration.js    # Registration API endpoints
│   │   └── admin.js           # Admin API endpoints
│   ├── models/
│   │   ├── Registration.js    # Registration business logic
│   │   └── AccessCode.js      # Access code management
│   ├── utils/
│   │   ├── database.js        # MongoDB connection
│   │   ├── config.js          # Configuration management
│   │   └── email.js           # Email service
│   └── middleware/
│       └── rateLimit.js       # Rate limiting middleware
├── package.json               # Dependencies
└── .env                       # Environment variables
```

### Key Backend Features

#### Express Application (app.js)
- CORS configuration for cross-origin requests
- Error handling and crash prevention
- Rate limiting and security headers
- Static file serving
- MongoDB connection management

#### Registration Routes (/api/registration)
- **POST /register**: Process registration with access code validation
- **GET /stats**: Registration statistics
- Transaction-based operations for data consistency

#### Admin Routes (/api/admin)
- **POST /generate-codes**: Generate new access codes
- **POST /access-codes**: Alternative code generation endpoint
- **GET /registrations**: Retrieve all registrations
- **GET /statistics**: Detailed admin statistics
- **POST /cleanup**: Remove expired access codes

## Event Registration System

### Access Code System

#### Security Features
- **Cryptographically Secure**: Uses `crypto.randomBytes()` for generation
- **Format**: 8-character alphanumeric codes (A-Z, 0-9)
- **Validation**: Ensures mix of letters and numbers
- **Weak Pattern Prevention**: Blocks sequential, repetitive, or predictable codes
- **One-Time Use**: Atomic operations prevent race conditions
- **Expiry Control**: Fixed expiry date (November 14, 2025, 11:59 PM UTC)

#### Code Generation Process
```javascript
// Example: Generate 10 codes with fixed expiry
POST /api/admin/generate-codes
{
  "count": 10,
  "useFixedExpiry": true,
  "eventName": "Youth Summit 2025"
}
```

#### Code Validation Flow
1. User enters access code on registration form
2. Frontend validates format (8 chars, alphanumeric)
3. Backend checks code exists, not used, not expired
4. Atomic update marks code as used
5. Registration proceeds with embedded participant data

### Registration Flow

#### Step 1: Access Code Entry
- User visits registration.html
- Enters 8-character access code
- Real-time format validation
- Server-side verification

#### Step 2: Form Completion
- Personal information collection
- Mobile-responsive form design
- Client-side validation
- Required field enforcement

#### Step 3: Database Storage
```javascript
// Registration document structure
{
  _id: ObjectId,
  accessCode: "ABC123XY",
  participant: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+232123456789",
    age: "19-24",
    occupation: "student",
    organization: "University X"
  },
  participantId: "KDYES25001",  // Sequential: KDYES25001-200
  registrationDate: ISODate,
  qrCode: "data:image/png;base64,..." // Base64 QR code
}
```

#### Step 4: Confirmation
- QR code generation for check-in
- Email confirmation with participant details
- Admin notification email
- Redirect to success page

### QR Code System

#### Generation
- Uses participant ID (KDYES25XXX format)
- Embedded in registration document
- Base64 encoded for storage
- Displayed on confirmation page

#### Scanning (scanner.html)
- HTML5-QRCode library v2.3.8
- Camera-based scanning
- Participant lookup by ID
- Check-in status management

## Database Schema

### Collections

#### access_codes
```javascript
{
  _id: ObjectId,
  code: "ABC123XY",           // 8-char alphanumeric
  isUsed: false,              // Usage status
  expiresAt: ISODate,         // Fixed: 2025-11-14T23:59:59.000Z
  createdAt: ISODate,         // Generation timestamp
  usedAt: ISODate,            // Usage timestamp (when used)
  eventName: "Youth Summit 2025"
}
```

#### registrations
```javascript
{
  _id: ObjectId,
  accessCode: "ABC123XY",     // Reference to used access code
  participant: {              // Embedded participant document
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    age: String,              // Range: "15-18", "19-24", etc.
    occupation: String,
    organization: String
  },
  participantId: "KDYES25001", // Sequential format
  registrationDate: ISODate,
  qrCode: String              // Base64 QR code
}
```

### Indexing Strategy
```javascript
// Recommended indexes
db.access_codes.createIndex({ "code": 1 }, { unique: true })
db.access_codes.createIndex({ "expiresAt": 1 })
db.access_codes.createIndex({ "isUsed": 1 })
db.registrations.createIndex({ "accessCode": 1 }, { unique: true })
db.registrations.createIndex({ "participantId": 1 }, { unique: true })
db.registrations.createIndex({ "participant.email": 1 })
```

## API Documentation

### Registration Endpoints

#### POST /api/registration/register
Register a participant with access code.

**Request:**
```javascript
{
  "accessCode": "ABC123XY",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+232123456789",
  "age": "19-24",
  "occupation": "student",
  "organization": "University X"
}
```

**Response (Success):**
```javascript
{
  "success": true,
  "data": {
    "participantId": "KDYES25001",
    "qrCode": "data:image/png;base64,..."
  },
  "message": "Registration successful"
}
```

**Error Responses:**
```javascript
// Invalid access code
{
  "success": false,
  "errorType": "INVALID_CODE",
  "error": "Invalid access code format"
}

// Code already used
{
  "success": false,
  "errorType": "ALREADY_USED", 
  "error": "This access code has already been used"
}

// Code expired
{
  "success": false,
  "errorType": "EXPIRED",
  "error": "Access code has expired"
}
```

#### GET /api/registration/stats
Get registration statistics.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "totalRegistrations": 45,
    "lastRegistration": "2025-09-30T10:30:00.000Z"
  }
}
```

### Admin Endpoints

#### POST /api/admin/generate-codes
Generate new access codes (Admin only).

**Request:**
```javascript
{
  "count": 10,
  "useFixedExpiry": true,
  "eventName": "Youth Summit 2025"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "codes": [
      {
        "code": "ABC123XY",
        "expiresAt": "2025-11-14T23:59:59.000Z",
        "eventName": "Youth Summit 2025",
        "createdAt": "2025-09-30T10:30:00.000Z"
      }
    ],
    "generated": 10,
    "expiryDate": "2025-11-14T23:59:59.000Z",
    "eventName": "Youth Summit 2025"
  }
}
```

#### GET /api/admin/registrations
Get all registrations (Admin only).

**Query Parameters:**
- `skip`: Number of records to skip (pagination)
- `limit`: Number of records to return (max 1000)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "registrations": [...],
    "total": 45,
    "skip": 0,
    "limit": 100
  }
}
```

#### GET /api/admin/statistics
Get detailed admin statistics.

**Response:**
```javascript
{
  "success": true,
  "data": {
    "accessCodes": {
      "total": 100,
      "used": 45,
      "unused": 50,
      "expired": 5
    },
    "registrations": {
      "total": 45,
      "lastRegistration": "2025-09-30T10:30:00.000Z"
    }
  }
}
```

## Security Features

### Access Code Security
1. **Cryptographic Generation**: Uses `crypto.randomBytes()` for secure randomness
2. **Format Validation**: 8-character alphanumeric with guaranteed diversity
3. **Weak Pattern Prevention**: Blocks sequential, repetitive, predictable codes
4. **One-Time Use**: Atomic database operations prevent race conditions
5. **Expiry Control**: Fixed deadline prevents indefinite code validity

### API Security
1. **Rate Limiting**: Prevents brute force attacks on endpoints
2. **CORS Configuration**: Controlled cross-origin access
3. **Input Validation**: Joi schema validation for all inputs
4. **Error Handling**: Prevents information leakage
5. **Transaction Safety**: Database operations use proper transactions

### Frontend Security
1. **Client-Side Validation**: Immediate feedback for users
2. **Server-Side Validation**: All inputs re-validated on server
3. **XSS Prevention**: Proper input sanitization
4. **HTTPS Enforcement**: All production traffic uses HTTPS

## Deployment

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/yah_database

# Email Service (Zoho SMTP)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password

# Application
PORT=3000
NODE_ENV=production
ACCESS_CODE_EXPIRY_HOURS=72

# Admin Notifications
ADMIN_EMAIL=admin@yourdomain.com
```

### Production Setup

#### Backend (Render.com)
1. Connect GitHub repository
2. Set build command: `cd backend && npm install`
3. Set start command: `cd backend && npm start`
4. Configure environment variables
5. Enable auto-deploy from main branch

#### Frontend (Static Hosting)
1. Upload static files to hosting provider
2. Configure custom domain
3. Enable HTTPS
4. Set up CDN for assets

#### Database (MongoDB Atlas)
1. Create cluster
2. Configure network access
3. Set up database user
4. Get connection string

### CORS Configuration
```javascript
// Production CORS settings
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'http://localhost:3000' // Development only
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Installation
```bash
# Clone repository
git clone https://github.com/SUBiango/yah.git
cd yah

# Install backend dependencies
cd backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if local)
mongod

# Start backend server
npm run dev
```

### Frontend Development
```bash
# Serve frontend files
# Option 1: Use Live Server extension in VS Code
# Option 2: Use Python's built-in server
python -m http.server 3000

# Option 3: Use Node.js serve
npx serve .
```

### Database Setup
```bash
# Connect to MongoDB
mongo

# Create database
use yah_database

# Create indexes
db.access_codes.createIndex({ "code": 1 }, { unique: true })
db.access_codes.createIndex({ "expiresAt": 1 })
db.registrations.createIndex({ "accessCode": 1 }, { unique: true })
```

## Troubleshooting

### Common Issues

#### Registration Form Issues
**Problem**: Form submission fails
**Solutions**:
1. Check access code format (8 characters, alphanumeric)
2. Verify backend server is running
3. Check CORS configuration
4. Validate required fields are filled

#### QR Scanner Issues
**Problem**: Camera not working
**Solutions**:
1. Ensure HTTPS in production
2. Check camera permissions
3. Verify HTML5-QRCode library version (v2.3.8)
4. Test on different browsers

#### Email Issues
**Problem**: Confirmation emails not sending
**Solutions**:
1. Verify SMTP credentials
2. Check Zoho SMTP settings
3. Validate email addresses
4. Check spam folder
5. Review email service logs

#### Database Connection Issues
**Problem**: MongoDB connection fails
**Solutions**:
1. Verify MongoDB URI
2. Check network connectivity
3. Validate database credentials
4. Ensure MongoDB service is running

#### Admin Dashboard Issues
**Problem**: Admin functions not working
**Solutions**:
1. Check API endpoints are accessible
2. Verify CORS configuration
3. Test with browser developer tools
4. Check rate limiting

### Performance Optimization

#### Frontend
1. **Image Optimization**: Compress speaker photos and assets
2. **CSS Minification**: Minify Bootstrap and custom CSS
3. **JavaScript Bundling**: Combine and minify JS files
4. **CDN Usage**: Use CDN for Font Awesome and other libraries

#### Backend
1. **Database Indexing**: Ensure proper indexes are created
2. **Connection Pooling**: Configure MongoDB connection pool
3. **Caching**: Implement Redis for frequently accessed data
4. **Compression**: Enable gzip compression

#### Database
1. **Query Optimization**: Use efficient queries and projections
2. **Index Monitoring**: Monitor index usage and performance
3. **Connection Limits**: Set appropriate connection limits
4. **Backup Strategy**: Implement automated backups

### Monitoring and Logging

#### Application Logs
```javascript
// Backend logging points
console.log('[AccessCode] Generated candidate code:', code);
console.log('[Registration] Processing registration for:', email);
console.error('Registration error:', error);
```

#### Performance Metrics
- Response times for API endpoints
- Database query performance
- Email delivery success rates
- QR code generation times

#### Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

*Last updated: September 30, 2025*
*For additional support, contact the development team.*