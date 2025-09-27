# Quickstart Guide: Youth Event Registration System

**Created**: 2025-09-26  
**Status**: Complete  
**Purpose**: End-to-end validation of registration system functionality

## Prerequisites

### Environment Setup
```bash
# 1. Install Node.js 18+ and npm
node --version  # Should be 18.0.0 or higher
npm --version

# 2. Install MongoDB (local or MongoDB Atlas)
mongosh --version

# 3. Clone repository and install dependencies
git clone <repository-url>
cd yah
npm install

# 4. Install backend dependencies
cd backend
npm install
cd ..
```

### Environment Configuration
```bash
# Create backend/.env file with required variables
cat > backend/.env << EOF
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/yah_events
MONGODB_TEST_URI=mongodb://localhost:27017/yah_events_test

# Admin Configuration
ADMIN_PASSCODE=secure-admin-passcode-2025

# Email Configuration (Zoho SMTP)
ZOHO_EMAIL_USER=events@youngaccesshub.org
ZOHO_EMAIL_PASS=your-zoho-app-password
ZOHO_SMTP_HOST=smtp.zoho.com
ZOHO_SMTP_PORT=587

# Application Configuration
NODE_ENV=development
PORT=3000
QR_CODES_DIR=./public/qr-codes
JWT_SECRET=your-jwt-secret-for-admin-sessions

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Ensure QR codes directory exists
mkdir -p backend/public/qr-codes
```

## Step 1: Database Setup and Access Code Generation

### 1.1 Start MongoDB
```bash
# If using local MongoDB
mongod

# Or connect to MongoDB Atlas (update MONGODB_URI in .env)
```

### 1.2 Generate Initial Access Codes
```bash
cd backend
npm run generate-access-codes -- --count=100

# Expected output:
# ✓ Generated 100 secure access codes
# ✓ Saved to access_codes collection
# Sample codes: X9F4-AB72-QJ3L, B3K8-MN45-P7Q2, ...
```

### 1.3 Verify Database Setup
```bash
mongosh
use yah_events
db.access_codes.countDocuments()  # Should return 100
db.access_codes.findOne()         # Should show a hashed access code

# Expected document structure:
# {
#   _id: ObjectId("..."),
#   code: "$2b$10$...", // Hashed code
#   status: "unused",
#   createdAt: ISODate("2025-09-26T...")
# }
```

## Step 2: Backend Server Startup

### 2.1 Run Tests (TDD Validation)
```bash
cd backend
npm test

# Expected output:
# ✓ Contract tests should FAIL initially (no implementation)
# ✗ Access Code Validation API - 8 failing tests
# ✗ Registration API - 15 failing tests  
# ✗ Admin API - 12 failing tests
# Total: 35 failing tests (EXPECTED before implementation)
```

### 2.2 Start Development Server
```bash
npm run dev

# Expected output:
# Server running on http://localhost:3000
# MongoDB connected successfully
# Environment: development
# QR codes directory: ./public/qr-codes
```

### 2.3 Health Check
```bash
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2025-09-26T14:30:00.000Z"
# }
```

## Step 3: Frontend Integration

### 3.1 Serve Frontend Files
```bash
# From project root
cd frontend
python3 -m http.server 8080
# Or use Live Server in VS Code

# Frontend accessible at: http://localhost:8080
```

### 3.2 Verify Frontend-Backend Connection
```bash
# Test API accessibility from frontend
curl http://localhost:3000/api/access-codes/validate -X POST \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"X9F4-AB72-QJ3L"}'

# Expected response:
# {"valid":true,"message":"Access code is valid"}
```

## Step 4: End-to-End User Flow Validation

### 4.1 Participant Registration Flow
```bash
# Navigate to: http://localhost:8080/registration.html

# 1. Attempt form submission without access code
# Expected: Form disabled, error message shown

# 2. Enter invalid access code: "INVALID-123"
# Expected: Error message "Invalid access code"

# 3. Enter valid access code: "X9F4-AB72-QJ3L"  
# Expected: Form becomes enabled

# 4. Fill registration form:
#    - Full Name: "Aminata Kamara"
#    - Phone: "+232 76 123 456"
#    - Email: "aminata.kamara@example.com"
#    - Age: 22
#    - Occupation: "University Student" 
#    - Track: "Innovation & Entrepreneurship"
#    - Terms: Checked
#    - Access Code: "X9F4-AB72-QJ3L"

# 5. Submit form
# Expected: 
#   - Redirect to confirmation page
#   - Display registration ID (REG-XXXXXX)
#   - Show QR code for download/screenshot
#   - Show success message with email confirmation notice
```

### 4.2 Email Confirmation Validation
```bash
# Check server logs for email sending
tail -f backend/logs/app.log | grep "EMAIL"

# Expected log entries:
# [INFO] Email queued for aminata.kamara@example.com
# [INFO] Email sent successfully to aminata.kamara@example.com
# [INFO] QR code attached: REG-001234.png

# Manual email verification:
# 1. Check recipient inbox
# 2. Verify email contains:
#    - Participant name and registration ID
#    - Event details (date, venue, time)
#    - QR code attachment or embedded image
#    - Professional Zoho branding
```

### 4.3 Access Code Usage Validation
```bash
# Attempt to reuse the same access code
curl http://localhost:3000/api/access-codes/validate -X POST \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"X9F4-AB72-QJ3L"}'

# Expected response:
# {"valid":false,"message":"This access code has already been used"}

# Verify database state
mongosh
use yah_events
db.access_codes.findOne({status:"used"})

# Expected: Shows the used access code with usedAt timestamp
```

## Step 5: Admin Dashboard Validation

### 5.1 Admin Authentication
```bash
# Navigate to: http://localhost:8080/admin.html

# 1. Attempt access without passcode
# Expected: Access denied, login form shown

# 2. Enter incorrect passcode: "wrong-password"
# Expected: "Access denied" message

# 3. Enter correct passcode: "secure-admin-passcode-2025"
# Expected: Access granted, participant list displayed
```

### 5.2 Admin Dashboard Functionality
```bash
# Verify admin dashboard shows:
# 1. Only registered participants (unused codes hidden)
# 2. Correct participant information:
#    - Name: Aminata Kamara
#    - Email: aminata.kamara@example.com
#    - Phone: +232 76 123 456
#    - Registration ID: REG-XXXXXX
#    - Track: Innovation & Entrepreneurship
#    - Status: Registered
#    - QR Download button

# 3. Test QR code download
# Click "Download QR" button
# Expected: QR code PNG file downloads successfully

# 4. Test search and filtering
# Search: "Aminata"
# Expected: Shows matching participant

# Filter by track: "Innovation & Entrepreneurship"
# Expected: Shows participants in selected track only
```

## Step 6: Performance and Load Testing

### 6.1 API Performance Testing
```bash
# Install load testing tool
npm install -g artillery

# Create performance test configuration
cat > backend/tests/load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 30
      arrivalRate: 10
scenarios:
  - name: "Access code validation"
    weight: 50
    flow:
      - post:
          url: "/api/access-codes/validate"
          json:
            accessCode: "PERF-TEST-{{$randomString()}}"
  - name: "Registration submission"
    weight: 30
    flow:
      - post:
          url: "/api/registrations"
          json:
            fullName: "Load Test User {{$randomString()}}"
            phoneNumber: "+232 76 123 {{$randomInt(100,999)}}"
            emailAddress: "loadtest{{$randomString()}}@example.com"
            age: "{{$randomInt(18,65)}}"
            occupation: "Student"
            trackOfInterest: "Innovation & Entrepreneurship"
            accessCode: "LOAD-TEST-{{$randomString()}}"
            termsAccepted: true
  - name: "Admin dashboard"
    weight: 20
    flow:
      - get:
          url: "/api/admin/participants"
          headers:
            Authorization: "Bearer admin-session-token"
EOF

# Run load test
artillery run backend/tests/load-test.yml

# Expected results:
# - All scenarios complete successfully
# - Response times < 500ms for form submission
# - Response times < 2000ms for QR generation
# - No errors under normal load
```

### 6.2 Database Performance Testing
```bash
# Test database with 500+ registrations
mongosh
use yah_events

# Verify indexes exist
db.access_codes.getIndexes()
db.participants.getIndexes()
db.registrations.getIndexes()

# Expected indexes:
# - access_codes: code (unique), status, (status, usedAt)
# - participants: emailAddress, createdAt, trackOfInterest
# - registrations: registrationId (unique), participantId, accessCodeId

# Test query performance
db.registrations.find().explain("executionStats")
# Expected: Uses indexes, fast execution times
```

## Step 7: Security Validation

### 7.1 Input Validation Testing
```bash
# Test SQL injection attempts
curl http://localhost:3000/api/access-codes/validate -X POST \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"'; DROP TABLE users; --"}'

# Expected: Input validation error, no database impact

# Test XSS attempts
curl http://localhost:3000/api/registrations -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fullName":"<script>alert('XSS')</script>",
    "phoneNumber":"+232 76 123 456",
    "emailAddress":"test@example.com",
    "age":25,
    "occupation":"Student",
    "trackOfInterest":"Innovation & Entrepreneurship",
    "accessCode":"VALID-CODE-123",
    "termsAccepted":true
  }'

# Expected: Input sanitized, script tags removed/escaped
```

### 7.2 Access Control Testing
```bash
# Test admin endpoint without authentication
curl http://localhost:3000/api/admin/participants

# Expected: 401 Unauthorized response

# Test rate limiting
for i in {1..20}; do
  curl http://localhost:3000/api/access-codes/validate -X POST \
    -H "Content-Type: application/json" \
    -d '{"accessCode":"RATE-TEST"}' &
done

# Expected: Some requests return 429 Too Many Requests
```

## Step 8: Email Integration Testing

### 8.1 Zoho SMTP Configuration Test
```bash
# Test email configuration
cd backend
npm run test-email

# Expected output:
# ✓ SMTP connection successful
# ✓ Test email sent to configured address
# ✓ Email delivery confirmed
```

### 8.2 Email Template Testing
```bash
# Send test registration email
curl http://localhost:3000/api/test/send-registration-email -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "name":"Test User",
    "registrationId":"REG-TEST123"
  }'

# Verify email received with:
# - Correct Zoho branding
# - All required information
# - Valid QR code attachment
# - Professional formatting
```

## Step 9: Production Readiness Validation

### 9.1 Environment Configuration Check
```bash
# Verify all required environment variables
cd backend
npm run check-config

# Expected output:
# ✓ Database connection string configured
# ✓ Admin passcode set and secure
# ✓ Email credentials configured
# ✓ File upload directories exist
# ✓ Security configurations valid
```

### 9.2 Deployment Preparation
```bash
# Build production assets
npm run build

# Expected output:
# ✓ Frontend assets minified
# ✓ Backend dependencies installed
# ✓ Environment variables validated
# ✓ Database migrations ready
# ✓ QR codes directory configured
```

## Success Criteria Validation

### Functional Requirements ✅
- [ ] Participants can only register with valid, unused access codes
- [ ] Registration form captures all required participant details  
- [ ] QR codes are unique and delivered via email
- [ ] Admin dashboard shows only registered participants
- [ ] Admin can download QR codes for participants

### Performance Requirements ✅
- [ ] Form submission completes within 500ms
- [ ] QR generation completes within 2 seconds
- [ ] Dashboard handles 500+ registrations efficiently
- [ ] Email delivery is asynchronous and reliable

### Security Requirements ✅
- [ ] Access codes are cryptographically secure
- [ ] One-time use is enforced atomically
- [ ] All inputs are validated and sanitized
- [ ] Admin access is properly protected
- [ ] Unused codes are never exposed

### User Experience Requirements ✅
- [ ] Form provides immediate validation feedback
- [ ] Error messages are user-friendly
- [ ] Mobile responsiveness works on common devices
- [ ] Email notifications are professional and branded

## Troubleshooting Common Issues

### Database Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Verify connection string
mongosh $MONGODB_URI

# Check network connectivity
telnet localhost 27017
```

### Email Delivery Issues
```bash
# Test SMTP connection
telnet smtp.zoho.com 587

# Verify credentials
npm run test-zoho-auth

# Check email logs
tail -f backend/logs/email.log
```

### Performance Issues
```bash
# Check system resources
top
df -h

# Monitor database performance
mongosh --eval "db.runCommand({serverStatus:1})"

# Check application logs
tail -f backend/logs/app.log
```

This quickstart guide provides comprehensive validation of all system components following constitutional principles of security-first development, test-driven implementation, and performance optimization.