# Data Model: Youth Event Registration System

**Created**: 2025-09-26  
**Status**: Complete

## Entity Definitions

### AccessCode
**Purpose**: Unique identifier purchased offline to unlock registration
**Collection**: `access_codes`

```javascript
{
  _id: ObjectId,
  code: String,           // 8-12 character alphanumeric (hashed with bcrypt)
  status: String,         // 'unused' | 'used'  
  createdAt: Date,        // When code was generated
  usedAt: Date,          // When code was used (null if unused)
  registrationId: ObjectId // Reference to registration (null if unused)
}
```

**Validation Rules**:
- `code`: Required, unique, 8-12 characters, alphanumeric only
- `status`: Required, enum ['unused', 'used'], defaults to 'unused'
- `createdAt`: Required, defaults to current timestamp
- `usedAt`: Optional, set only when status changes to 'used'
- `registrationId`: Optional, set only when registration is created

**Indexes**:
- `code`: Unique index for fast validation queries
- `status`: Index for admin dashboard filtering
- Compound index on `(status, usedAt)` for admin dashboard queries

### Participant
**Purpose**: Person registering for the event
**Collection**: `participants`

```javascript
{
  _id: ObjectId,
  fullName: String,       // Required, 2-100 characters
  phoneNumber: String,    // Required, validated format
  emailAddress: String,   // Required, valid email format (not unique)
  age: Number,           // Required, 13-100 range
  occupation: String,     // Required, 2-100 characters
  trackOfInterest: String, // Required, enum values
  termsAccepted: Boolean, // Required, must be true
  createdAt: Date,       // Registration timestamp
  updatedAt: Date        // Last modification timestamp
}
```

**Validation Rules**:
- `fullName`: Required, 2-100 characters, sanitized for XSS
- `phoneNumber`: Required, validated international format
- `emailAddress`: Required, valid email format (duplicates allowed)
- `age`: Required, integer between 13-100
- `occupation`: Required, 2-100 characters, sanitized
- `trackOfInterest`: Required, enum ['Innovation & Entrepreneurship', 'Leadership Development', 'Networking']
- `termsAccepted`: Required, must be exactly true
- `createdAt`: Required, defaults to current timestamp
- `updatedAt`: Required, updated on modification

**Indexes**:
- `emailAddress`: Index for admin dashboard search
- `createdAt`: Index for chronological sorting
- `trackOfInterest`: Index for filtering by track

### Registration
**Purpose**: Complete registration record linking participant to access code
**Collection**: `registrations`

```javascript
{
  _id: ObjectId,
  registrationId: String,  // Human-readable ID (e.g., REG-001234)
  participantId: ObjectId, // Reference to participant
  accessCodeId: ObjectId,  // Reference to access code
  qrCodePath: String,     // File path to generated QR code
  qrCodeData: String,     // Data encoded in QR code
  emailSent: Boolean,     // Whether confirmation email was sent
  emailSentAt: Date,      // When email was sent (null if not sent)
  createdAt: Date,        // Registration completion timestamp
  updatedAt: Date         // Last modification timestamp
}
```

**Validation Rules**:
- `registrationId`: Required, unique, format 'REG-XXXXXX' where X is digit
- `participantId`: Required, valid ObjectId, references participants collection
- `accessCodeId`: Required, valid ObjectId, references access_codes collection
- `qrCodePath`: Required, valid file path to generated QR code
- `qrCodeData`: Required, string data encoded in QR code
- `emailSent`: Required, boolean, defaults to false
- `emailSentAt`: Optional, set when email is successfully sent
- `createdAt`: Required, defaults to current timestamp
- `updatedAt`: Required, updated on modification

**Indexes**:
- `registrationId`: Unique index for lookups
- `participantId`: Index for participant-based queries
- `accessCodeId`: Index for access code validation
- `createdAt`: Index for chronological sorting
- `emailSent`: Index for email processing queries

## Relationships

### Access Code → Registration (1:0..1)
- One access code can have zero or one registration
- When registration is created, access code status becomes 'used'
- Enforced by atomic `findOneAndUpdate` operation

### Participant → Registration (1:1)
- One participant has exactly one registration
- Participant is created as part of registration process
- Foreign key relationship via `participantId`

### Registration → QR Code (1:1)
- Each registration generates exactly one QR code
- QR code contains registration ID and verification data
- File stored on server, path stored in registration record

## State Transitions

### Access Code Lifecycle
```
[Generated] → status: 'unused', usedAt: null, registrationId: null
     ↓ (Registration submitted with this code)
[Used] → status: 'used', usedAt: Date, registrationId: ObjectId
```

### Registration Lifecycle
```
[Created] → emailSent: false, emailSentAt: null
     ↓ (Email sent successfully)
[Email Sent] → emailSent: true, emailSentAt: Date
```

## Data Integrity Constraints

### Database Level
- Access code uniqueness enforced by unique index
- Registration ID uniqueness enforced by unique index
- Foreign key relationships maintained through application logic

### Application Level
- Access code can only be used once (atomic findOneAndUpdate)
- Registration ID generation ensures uniqueness
- QR code generation creates unique codes per registration
- Email sending is idempotent (won't resend if already sent)

## Security Considerations

### Data Protection
- Access codes are hashed using bcrypt before storage
- Personal information is sanitized before database insertion
- No sensitive data exposed in database queries or logs
- QR codes contain only registration ID, not personal information

### Data Retention
- All data retained indefinitely for event management purposes
- Personal information stored with minimal required fields only
- Admin access to participant data logged with timestamps
- Unused access codes remain in system for auditing purposes

## Performance Optimizations

### Query Patterns
- Admin dashboard: Query registrations with participant joins
- Access code validation: Hash input and query by code field
- QR code lookup: Query by registration ID for downloads
- Email processing: Query registrations where emailSent is false

### Indexing Strategy
- Primary queries optimized with appropriate indexes
- Compound indexes reduce query execution time
- Index maintenance balanced with write performance
- Regular index usage monitoring recommended

## Migration Considerations

### Initial Data Load
- Access codes pre-generated and loaded into database
- Bulk insert operations with proper validation
- Index creation after data loading for performance
- Test data cleanup procedures established

### Schema Evolution
- All schema changes must be backwards compatible
- Migration scripts for data transformation
- Rollback procedures documented and tested
- Environment-specific migration validation

This data model supports all functional requirements while maintaining security, performance, and constitutional compliance.