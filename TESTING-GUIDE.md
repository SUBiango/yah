# Manual Testing Guide - YAH Youth Event Registration System

## 🧪 Pre-Production Testing Checklist

**Before deploying to production, ensure ALL items below are tested and verified.**

---

## 1. Backend API Testing ✅

### Test Environment Setup
- [ ] MongoDB database running and accessible
- [ ] Backend server starts without errors
- [ ] Environment variables configured correctly
- [ ] Email service credentials configured (Zoho SMTP)

### Unit Tests
```bash
cd backend
npm test
```
**Expected:** All 129 tests should pass
- [ ] ✅ AccessCode Model tests: 16 tests
- [ ] ✅ Participant Model tests: 18 tests  
- [ ] ✅ Registration Model tests: 17 tests
- [ ] ✅ Admin Routes tests: 22 tests
- [ ] ✅ Registration Routes tests: 18 tests
- [ ] ✅ Email Service tests: 15 tests
- [ ] ✅ QR Service tests: 23 tests

### API Endpoint Testing

#### Access Code Verification
```bash
# Test valid access code
curl -X GET http://localhost:3000/api/verify/ABC12345

# Expected Response:
{
  "success": true,
  "data": {
    "valid": true,
    "accessCode": "ABC12345"
  }
}

# Test invalid access code  
curl -X GET http://localhost:3000/api/verify/INVALID1

# Expected Response:
{
  "success": false,
  "error": "Invalid or expired access code"
}
```

#### Registration
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "accessCode": "ABC12345",
    "firstName": "Test",
    "lastName": "User", 
    "email": "test@example.com",
    "phone": "+23276123456",
    "dateOfBirth": "1995-01-01",
    "gender": "male",
    "emergencyContact": {
      "name": "Emergency Contact",
      "phone": "+23276987654",
      "relationship": "parent"
    }
  }'
```

#### Admin Endpoints
```bash
# Generate access codes
curl -X POST http://localhost:3000/api/admin/access-codes \
  -H "Content-Type: application/json" \
  -d '{"count": 10}'

# Get statistics
curl -X GET http://localhost:3000/api/admin/stats

# Get registrations
curl -X GET http://localhost:3000/api/admin/registrations?limit=10&skip=0
```

---

## 2. Frontend Testing 🌐

### HTML Structure Validation
- [ ] **registration.html**
  - [ ] DOCTYPE declaration present
  - [ ] Bootstrap CSS loaded
  - [ ] Font Awesome icons loaded
  - [ ] Step indicator displays correctly
  - [ ] Form elements properly structured
  - [ ] Navigation menu functional
  
- [ ] **confirmation.html**
  - [ ] Success message displays
  - [ ] QR code placeholder present
  - [ ] Download buttons functional
  - [ ] Participant details section
  - [ ] Responsive layout
  
- [ ] **admin.html**
  - [ ] Passcode gate displays
  - [ ] Dashboard statistics cards
  - [ ] Participant table structure
  - [ ] Search and filter controls
  - [ ] Modal dialogs present

### JavaScript Functionality
- [ ] **registration.js**
  - [ ] RegistrationForm class instantiates
  - [ ] Access code validation works
  - [ ] Form step navigation
  - [ ] Real-time field validation
  - [ ] API integration ready
  - [ ] Error handling displays correctly
  
- [ ] **admin.js**
  - [ ] AdminDashboard class instantiates
  - [ ] Passcode authentication
  - [ ] Data loading and display
  - [ ] Search/filter functionality
  - [ ] Export functions work
  - [ ] Modal interactions

### Browser Compatibility Testing
Test on the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive Design Testing
Test at these screen sizes:
- [ ] 320px (Mobile S)
- [ ] 375px (Mobile M)
- [ ] 768px (Tablet)
- [ ] 1024px (Desktop S)
- [ ] 1200px+ (Desktop L)

---

## 3. User Journey Testing 👥

### Participant Registration Flow
1. **Access Registration Page**
   - [ ] Navigate to `/registration.html`
   - [ ] Page loads in < 2 seconds
   - [ ] All elements display correctly
   
2. **Enter Access Code**
   - [ ] Input accepts 8-character codes
   - [ ] Code formats automatically (uppercase)
   - [ ] Invalid codes show error messages
   - [ ] Valid codes proceed to next step
   
3. **Complete Personal Information**
   - [ ] All required fields validate correctly
   - [ ] Email format validation works
   - [ ] Phone number validation works
   - [ ] Date of birth validation (15-35 years)
   - [ ] Emergency contact required fields
   
4. **Submit Registration**
   - [ ] Loading state shows during submission
   - [ ] Success redirects to confirmation page
   - [ ] Error messages display for failures
   
5. **Confirmation Page**
   - [ ] Success message displays
   - [ ] QR code generates and displays
   - [ ] Participant details are correct
   - [ ] Download functionality works
   - [ ] Email confirmation option works

### Admin Management Flow
1. **Access Admin Dashboard**
   - [ ] Navigate to `/admin.html`
   - [ ] Passcode gate displays
   
2. **Authenticate**
   - [ ] Enter passcode: `YAH2024Admin`
   - [ ] Invalid passcode shows error
   - [ ] Valid passcode shows dashboard
   
3. **View Dashboard**
   - [ ] Statistics cards display data
   - [ ] Participant table loads
   - [ ] Search functionality works
   - [ ] Filter by status works
   - [ ] Sort functionality works
   
4. **Manage Participants**
   - [ ] View participant details modal
   - [ ] Download QR codes
   - [ ] Send confirmation emails
   - [ ] Export data to CSV
   
5. **Generate Access Codes**
   - [ ] Generate codes modal opens
   - [ ] Code generation works (1-100 codes)
   - [ ] Codes download as CSV
   - [ ] Statistics update

---

## 4. Error Handling Testing ⚠️

### Registration Errors
- [ ] **Invalid Access Code**
  - [ ] Expired code shows appropriate error
  - [ ] Already used code shows error
  - [ ] Non-existent code shows error
  
- [ ] **Duplicate Registration**
  - [ ] Same email shows error message
  - [ ] User can correct and resubmit
  
- [ ] **Validation Errors**
  - [ ] Required fields show errors
  - [ ] Invalid email format shows error
  - [ ] Invalid phone format shows error
  - [ ] Age outside range (15-35) shows error

### Admin Errors
- [ ] **Authentication Errors**
  - [ ] Wrong passcode shows error
  - [ ] Session timeout handled
  
- [ ] **Data Loading Errors**
  - [ ] Network errors show messages
  - [ ] Empty state displays correctly
  - [ ] Retry functionality works

### Network Errors
- [ ] **Backend Unavailable**
  - [ ] Frontend shows appropriate errors
  - [ ] Retry mechanisms work
  - [ ] Graceful degradation to demo mode

---

## 5. Performance Testing ⚡

### Response Time Requirements
- [ ] **Form Submission: < 500ms**
  - Test with network throttling
  - Measure actual response times
  
- [ ] **QR Code Generation: < 2s**
  - Test individual QR generation
  - Test batch generation
  
- [ ] **Admin Dashboard Load: < 1s**
  - Test with 100+ participants
  - Test search/filter performance

### Load Testing (if possible)
- [ ] **Concurrent Users**
  - Test 10 simultaneous registrations
  - Test admin dashboard with traffic
  
- [ ] **Database Performance**
  - Test with 500+ access codes
  - Test with 1000+ registrations

---

## 6. Security Testing 🔒

### Input Security
- [ ] **SQL Injection Prevention**
  - Test special characters in all inputs
  - Verify database queries are parameterized
  
- [ ] **XSS Prevention**
  - Test script tags in text inputs
  - Verify output is properly escaped
  
- [ ] **CSRF Protection**
  - Verify form tokens (if implemented)
  - Test cross-origin requests

### Authentication & Authorization
- [ ] **Admin Access**
  - Verify passcode requirement
  - Test session management
  - Test logout functionality
  
- [ ] **Access Code Security**
  - Verify cryptographic generation
  - Test one-time use enforcement
  - Test expiration handling

### Email Security
- [ ] **Email Configuration**
  - Verify TLS encryption enabled
  - Test email sending functionality
  - Verify no sensitive data in logs

---

## 7. Production Deployment Checklist 🚀

### Environment Configuration
- [ ] **Database**
  - [ ] MongoDB Atlas or production database configured
  - [ ] Database connection string updated
  - [ ] Database indexes created
  - [ ] Backup strategy in place
  
- [ ] **Email Service**
  - [ ] Zoho SMTP credentials configured
  - [ ] Email templates tested
  - [ ] Send rate limits configured
  
- [ ] **Security**
  - [ ] HTTPS enabled
  - [ ] CORS configured for production domains
  - [ ] Rate limiting configured
  - [ ] Admin passcode changed from default

### Server Configuration
- [ ] **Node.js Application**
  - [ ] PM2 or similar process manager
  - [ ] Environment variables secured
  - [ ] Logs configured and monitored
  - [ ] Error reporting setup
  
- [ ] **Web Server**
  - [ ] Nginx or Apache configured
  - [ ] Static files served efficiently
  - [ ] Gzip compression enabled
  - [ ] Security headers configured

### Monitoring & Analytics
- [ ] **Health Monitoring**
  - [ ] Server uptime monitoring
  - [ ] Database connection monitoring
  - [ ] Email service monitoring
  
- [ ] **Usage Analytics**
  - [ ] Registration success/failure tracking
  - [ ] Performance metrics collection
  - [ ] User behavior analytics (optional)

---

## 8. Pre-Launch Final Checks ✨

### Content & Branding
- [ ] All YAH branding consistent
- [ ] Contact information updated
- [ ] Event details accurate
- [ ] Terms & conditions reviewed
- [ ] Privacy policy reviewed

### Accessibility
- [ ] Screen reader compatibility
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards
- [ ] Alt text for all images
- [ ] Form labels properly associated

### Mobile Experience
- [ ] Touch targets are adequate size
- [ ] Forms are easy to complete on mobile
- [ ] QR codes display clearly on mobile
- [ ] Admin dashboard works on tablets

---

## Quick Test Commands

### Run All Backend Tests
```bash
cd backend && npm test
```

### Run Frontend Tests
```bash
node frontend-test.js
```

### Run Complete Test Suite
```bash
node test-runner.js
```

### Start Local Development Server
```bash
# Backend (requires MongoDB)
cd backend && npm start

# Frontend (static files)
cd .. && python3 -m http.server 8080
```

### Test URLs
- Registration: http://localhost:8080/registration.html
- Admin Dashboard: http://localhost:8080/admin.html  
- Confirmation: http://localhost:8080/confirmation.html?id=test123

---

**✅ System is production-ready when ALL items above are checked and verified!**