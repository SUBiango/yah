# API Reference Documentation

## Overview
Complete API reference for the YAH Event Registration System.

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-backend-url.com/api`

## Authentication
Currently, the API uses basic rate limiting. Admin endpoints may require additional authentication in future versions.

## Rate Limits
- Registration endpoints: 10 requests per minute per IP
- Admin endpoints: 20 requests per minute per IP
- General endpoints: 100 requests per minute per IP

---

## Registration API

### POST /registration/register
Register a new participant using an access code.

#### Request Body
```javascript
{
  "accessCode": "string",      // Required: 8-character alphanumeric
  "firstName": "string",       // Required: Participant's first name
  "lastName": "string",        // Required: Participant's last name
  "email": "string",           // Required: Valid email address
  "phone": "string",           // Required: Phone number
  "age": "string",             // Required: Age range
  "occupation": "string",      // Required: Current occupation/status
  "organization": "string"     // Optional: School/company/organization
}
```

#### Age Options
- `"15-18"`
- `"19-24"`
- `"25-30"`
- `"31-35"`

#### Occupation Options
- `"student"`
- `"professional"`
- `"entrepreneur"`
- `"unemployed"`
- `"other"`

#### Success Response (201)
```javascript
{
  "success": true,
  "data": {
    "participantId": "KDYES25001",                    // Sequential participant ID
    "qrCode": "data:image/png;base64,iVBORw0KGgo...", // Base64 QR code
    "registrationDate": "2025-09-30T10:30:00.000Z"
  },
  "message": "Registration successful! Check your email for confirmation."
}
```

#### Error Responses

**400 - Validation Error**
```javascript
{
  "success": false,
  "error": "First name is required"
}
```

**400 - Invalid Access Code Format**
```javascript
{
  "success": false,
  "errorType": "INVALID_CODE",
  "error": "Invalid access code format. Must be 8 characters (letters and numbers only)."
}
```

**400 - Access Code Not Found**
```javascript
{
  "success": false,
  "errorType": "NOT_FOUND", 
  "error": "Access code not found. Please check your code and try again."
}
```

**400 - Access Code Already Used**
```javascript
{
  "success": false,
  "errorType": "ALREADY_USED",
  "error": "This access code has already been used. Each code can only be used once."
}
```

**400 - Access Code Expired**
```javascript
{
  "success": false,
  "errorType": "EXPIRED",
  "error": "Access code has expired. Please contact organizers for a new code."
}
```

**409 - Email Already Registered**
```javascript
{
  "success": false,
  "errorType": "DUPLICATE_EMAIL",
  "error": "This email address is already registered. Each person can only register once."
}
```

**500 - Server Error**
```javascript
{
  "success": false,
  "errorType": "SERVER_ERROR",
  "error": "Registration failed due to server error. Please try again."
}
```

### GET /registration/stats
Get basic registration statistics.

#### Success Response (200)
```javascript
{
  "success": true,
  "data": {
    "totalRegistrations": 45,
    "lastRegistration": "2025-09-30T10:30:00.000Z"
  }
}
```

---

## Admin API

### POST /admin/generate-codes
Generate new access codes for the event.

#### Request Body
```javascript
{
  "count": 10,                    // Required: Number of codes (1-100)
  "useFixedExpiry": true,         // Optional: Use fixed expiry date (default: true)
  "expiryHours": 72,              // Optional: Hours until expiry (if useFixedExpiry: false)
  "eventName": "Youth Summit 2025" // Optional: Event name for tracking
}
```

#### Success Response (201)
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
    "expiryDate": "2025-11-14T23:59:59.000Z",  // When useFixedExpiry: true
    "expiryHours": null,                        // When useFixedExpiry: false
    "eventName": "Youth Summit 2025"
  },
  "meta": {
    "responseTime": "150ms"
  }
}
```

### POST /admin/access-codes
Alternative endpoint for generating access codes (same functionality as above).

### GET /admin/registrations
Retrieve all registrations with pagination.

#### Query Parameters
- `skip`: Number of records to skip (default: 0)
- `limit`: Number of records to return (default: 100, max: 1000)

#### Success Response (200)
```javascript
{
  "success": true,
  "data": {
    "registrations": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "accessCode": "ABC123XY",
        "participant": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "+232123456789",
          "age": "19-24",
          "occupation": "student",
          "organization": "University X"
        },
        "participantId": "KDYES25001",
        "registrationDate": "2025-09-30T10:30:00.000Z",
        "qrCode": "data:image/png;base64,..."
      }
    ],
    "total": 45,
    "skip": 0,
    "limit": 100
  },
  "meta": {
    "responseTime": "45ms"
  }
}
```

### GET /admin/statistics
Get comprehensive statistics for admin dashboard.

#### Success Response (200)
```javascript
{
  "success": true,
  "data": {
    "accessCodes": {
      "total": 100,        // Total codes generated
      "used": 45,          // Codes that have been used
      "unused": 50,        // Available codes (not used, not expired)
      "expired": 5         // Expired unused codes
    },
    "registrations": {
      "total": 45,
      "lastRegistration": "2025-09-30T10:30:00.000Z"
    }
  },
  "meta": {
    "responseTime": "30ms"
  }
}
```

### POST /admin/cleanup
Remove expired access codes from the database.

#### Success Response (200)
```javascript
{
  "success": true,
  "data": {
    "deletedCount": 5
  },
  "message": "Removed 5 expired access codes",
  "meta": {
    "responseTime": "25ms"
  }
}
```

---

## Error Handling

### Standard Error Response Format
```javascript
{
  "success": false,
  "error": "Human-readable error message",
  "errorType": "MACHINE_READABLE_TYPE",  // Optional
  "meta": {
    "responseTime": "45ms"
  }
}
```

### Error Types
- `INVALID_CODE`: Access code format is invalid
- `NOT_FOUND`: Access code doesn't exist
- `ALREADY_USED`: Access code has been used
- `EXPIRED`: Access code has expired
- `DUPLICATE_EMAIL`: Email already registered
- `SERVER_ERROR`: Internal server error
- `VALIDATION_ERROR`: Input validation failed

### HTTP Status Codes
- `200`: Success
- `201`: Created (new resource)
- `400`: Bad Request (validation error, invalid input)
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Code Examples

### JavaScript (Frontend)
```javascript
// Register a participant
async function registerParticipant(formData) {
  try {
    const response = await fetch('/api/registration/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Registration successful:', result.data.participantId);
      return result.data;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Registration failed:', error.message);
    throw error;
  }
}

// Generate access codes (Admin)
async function generateAccessCodes(count = 10) {
  try {
    const response = await fetch('/api/admin/generate-codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        count,
        useFixedExpiry: true,
        eventName: 'Youth Summit 2025'
      })
    });
    
    const result = await response.json();
    return result.data.codes;
  } catch (error) {
    console.error('Code generation failed:', error);
    throw error;
  }
}
```

### cURL Examples
```bash
# Register a participant
curl -X POST https://your-api.com/api/registration/register \
  -H "Content-Type: application/json" \
  -d '{
    "accessCode": "ABC123XY",
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "phone": "+232123456789",
    "age": "19-24",
    "occupation": "student",
    "organization": "University X"
  }'

# Generate access codes
curl -X POST https://your-api.com/api/admin/generate-codes \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "useFixedExpiry": true,
    "eventName": "Youth Summit 2025"
  }'

# Get registrations
curl "https://your-api.com/api/admin/registrations?skip=0&limit=50"

# Get statistics
curl https://your-api.com/api/admin/statistics
```

---

## Webhooks (Future Implementation)
The API is designed to support webhooks for real-time notifications:

### Planned Webhook Events
- `registration.created`: New participant registered
- `access_code.used`: Access code was used
- `access_code.expired`: Codes have expired

### Webhook Payload Format
```javascript
{
  "event": "registration.created",
  "timestamp": "2025-09-30T10:30:00.000Z",
  "data": {
    "participantId": "KDYES25001",
    "email": "john@example.com"
  }
}
```

---

*For implementation details, see the main DOCUMENTATION.md file.*