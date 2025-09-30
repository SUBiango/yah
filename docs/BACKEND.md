# Backend Development Guide

## Overview
This guide covers the backend architecture, API design, and development practices for the YAH Event Registration System.

## Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with native driver
- **Email**: Nodemailer with Zoho SMTP
- **Security**: Joi validation, rate limiting
- **QR Codes**: qrcode npm package
- **Deployment**: Render.com

## Project Structure

```
backend/
├── package.json               # Dependencies and scripts
├── .env                       # Environment variables
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
└── src/                       # Source code
    ├── app.js                 # Main Express application
    ├── routes/                # API route handlers
    │   ├── registration.js    # Registration endpoints
    │   └── admin.js           # Admin endpoints
    ├── models/                # Business logic models
    │   ├── Registration.js    # Registration operations
    │   └── AccessCode.js      # Access code management
    ├── utils/                 # Utility modules
    │   ├── database.js        # MongoDB connection
    │   ├── config.js          # Configuration management
    │   └── email.js           # Email service
    └── middleware/            # Custom middleware
        └── rateLimit.js       # Rate limiting configuration
```

## Application Architecture

### app.js (Main Application)
**Purpose**: Express application setup, middleware configuration, and server initialization.

```javascript
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dbConnection = require('./utils/database');
const { config } = require('./utils/config');

// Import routes
const registrationRoutes = require('./routes/registration');
const adminRoutes = require('./routes/admin');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Security middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', generalLimiter);

// Routes
app.use('/api/registration', registrationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await dbConnection.closeConnection();
  process.exit(0);
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

## Database Layer

### database.js (MongoDB Connection)
**Purpose**: MongoDB connection management with retry logic and connection pooling.

```javascript
const { MongoClient } = require('mongodb');
const { config } = require('./config');

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.database = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        return this.database;
      }

      console.log('[Database] Connecting to MongoDB...');
      
      this.client = new MongoClient(config.database.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });

      await this.client.connect();
      this.database = this.client.db(config.database.name);
      this.isConnected = true;

      console.log('[Database] Connected successfully');
      
      // Create indexes
      await this.createIndexes();
      
      return this.database;
    } catch (error) {
      console.error('[Database] Connection failed:', error);
      throw error;
    }
  }

  async createIndexes() {
    try {
      // Access codes indexes
      await this.database.collection('access_codes').createIndex(
        { code: 1 }, 
        { unique: true }
      );
      await this.database.collection('access_codes').createIndex({ expiresAt: 1 });
      await this.database.collection('access_codes').createIndex({ isUsed: 1 });

      // Registrations indexes  
      await this.database.collection('registrations').createIndex(
        { accessCode: 1 }, 
        { unique: true }
      );
      await this.database.collection('registrations').createIndex(
        { participantId: 1 }, 
        { unique: true }
      );
      await this.database.collection('registrations').createIndex({ 'participant.email': 1 });

      console.log('[Database] Indexes created successfully');
    } catch (error) {
      console.error('[Database] Index creation failed:', error);
    }
  }

  getDatabase() {
    if (!this.isConnected || !this.database) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.database;
  }

  async closeConnection() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('[Database] Connection closed');
    }
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

// Auto-connect on module load
dbConnection.connect().catch(error => {
  console.error('[Database] Auto-connect failed:', error);
  process.exit(1);
});

module.exports = dbConnection;
```

## Business Logic Models

### AccessCode.js (Access Code Management)
**Purpose**: Handle all access code operations including generation, validation, and lifecycle management.

**Key Methods**:

1. **Code Generation**
```javascript
static async generate(options = {}) {
  const { expiryHours = 72, expiryDate, eventName } = options;
  
  // Generate cryptographically secure code
  let code = await this.generateSecureCode();
  
  // Create access code object
  const accessCodeObj = {
    code,
    isUsed: false,
    expiresAt: expiryDate || new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    createdAt: new Date(),
  };
  
  if (eventName) {
    accessCodeObj.eventName = eventName;
  }
  
  // Save to database
  const db = dbConnection.getDatabase();
  await db.collection('access_codes').insertOne(accessCodeObj);
  
  return accessCodeObj;
}
```

2. **Security Validation**
```javascript
static validateCodeFormat(code) {
  // Must be exactly 8 characters
  if (!code || code.length !== 8) return false;
  
  // Must contain only uppercase letters A-Z and digits 0-9
  if (!/^[A-Z0-9]{8}$/.test(code)) return false;
  
  // Security checks to avoid weak patterns
  
  // Must not be all the same character
  if (/^(.)\1{7}$/.test(code)) return false;
  
  // Must not be sequential patterns
  let isSequential = true;
  for (let i = 1; i < code.length; i++) {
    if (code.charCodeAt(i) !== code.charCodeAt(i - 1) + 1) {
      isSequential = false;
      break;
    }
  }
  if (isSequential) return false;
  
  // Must have mix of letters and numbers
  const hasLetter = /[A-Z]/.test(code);
  const hasNumber = /[0-9]/.test(code);
  if (!hasLetter || !hasNumber) return false;
  
  return true;
}
```

3. **Atomic Usage Marking**
```javascript
static async markAsUsedDetailed(code) {
  try {
    const accessCode = await this.findByCode(code);
    
    if (!accessCode) {
      return {
        success: false,
        errorType: 'NOT_FOUND',
        error: 'Access code not found'
      };
    }

    if (accessCode.isUsed) {
      return {
        success: false,
        errorType: 'ALREADY_USED',
        error: 'This access code has already been used'
      };
    }

    if (accessCode.expiresAt < new Date()) {
      return {
        success: false,
        errorType: 'EXPIRED',
        error: 'Access code has expired'
      };
    }

    // Atomic update to prevent race conditions
    const db = dbConnection.getDatabase();
    const result = await db.collection('access_codes').updateOne(
      { 
        code,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      },
      { 
        $set: { 
          isUsed: true,
          usedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 1) {
      return { success: true };
    } else {
      return {
        success: false,
        errorType: 'ALREADY_USED',
        error: 'This access code has already been used'
      };
    }
  } catch (error) {
    return {
      success: false,
      errorType: 'SERVER_ERROR',
      error: 'Internal server error'
    };
  }
}
```

### Registration.js (Registration Operations)
**Purpose**: Handle participant registration workflow with transaction safety.

**Key Methods**:

1. **Registration Process**
```javascript
static async create(registrationData) {
  const { accessCode, ...participantData } = registrationData;
  
  // Start transaction-like operation
  const session = dbConnection.getDatabase().client.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Validate and mark access code as used
      const codeResult = await AccessCode.markAsUsedDetailed(accessCode);
      if (!codeResult.success) {
        const error = new Error(codeResult.error);
        error.errorType = codeResult.errorType;
        throw error;
      }

      // Check for duplicate email
      const existingRegistration = await this.findByEmail(participantData.email);
      if (existingRegistration) {
        const error = new Error('Email address already registered');
        error.errorType = 'DUPLICATE_EMAIL';
        throw error;
      }

      // Generate participant ID
      const participantId = await this.generateParticipantId();

      // Generate QR code
      const qrCode = await this.generateQRCode(participantId);

      // Create registration document
      const registration = {
        accessCode,
        participant: participantData,
        participantId,
        registrationDate: new Date(),
        qrCode
      };

      // Save registration
      const db = dbConnection.getDatabase();
      const result = await db.collection('registrations').insertOne(registration);

      return {
        participantId,
        qrCode,
        registrationId: result.insertedId
      };
    });
  } finally {
    await session.endSession();
  }
}
```

2. **Participant ID Generation**
```javascript
static async generateParticipantId() {
  const db = dbConnection.getDatabase();
  
  // Get count of existing registrations
  const count = await db.collection('registrations').countDocuments();
  
  // Generate sequential ID: KDYES25001, KDYES25002, etc.
  const idNumber = (count + 1).toString().padStart(3, '0');
  return `KDYES25${idNumber}`;
}
```

3. **QR Code Generation**
```javascript
static async generateQRCode(participantId) {
  const QRCode = require('qrcode');
  
  try {
    // Generate QR code as base64 data URL
    const qrCodeDataURL = await QRCode.toDataURL(participantId, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('[Registration] QR code generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}
```

## API Routes

### registration.js (Registration Routes)
**Purpose**: Handle participant registration and related endpoints.

```javascript
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const Registration = require('../models/Registration');
const emailService = require('../utils/email');

const router = express.Router();

// Rate limiting for registration
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 registration attempts per windowMs
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.'
  }
});

// Validation schema
const registrationSchema = Joi.object({
  accessCode: Joi.string().length(8).pattern(/^[A-Z0-9]+$/).required()
    .messages({
      'string.length': 'Access code must be exactly 8 characters',
      'string.pattern.base': 'Access code must contain only letters and numbers',
      'any.required': 'Access code is required'
    }),
  firstName: Joi.string().min(2).max(50).required()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string().min(2).max(50).required()
    .messages({
      'string.min': 'Last name must be at least 2 characters', 
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please enter a valid email address',
      'any.required': 'Email address is required'
    }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number',
      'any.required': 'Phone number is required'
    }),
  age: Joi.string().valid('15-18', '19-24', '25-30', '31-35').required()
    .messages({
      'any.only': 'Please select a valid age range',
      'any.required': 'Age range is required'
    }),
  occupation: Joi.string().valid('student', 'professional', 'entrepreneur', 'unemployed', 'other').required()
    .messages({
      'any.only': 'Please select a valid occupation',
      'any.required': 'Occupation is required'
    }),
  organization: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Organization name cannot exceed 100 characters'
    })
});

// Register participant
router.post('/register', registrationLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const { error, value } = registrationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    // Process registration
    const result = await Registration.create(value);

    // Send confirmation email
    await emailService.sendConfirmationEmail(value.email, {
      participantId: result.participantId,
      name: `${value.firstName} ${value.lastName}`,
      qrCode: result.qrCode
    });

    // Send admin notification
    await emailService.sendAdminNotification({
      type: 'new_registration',
      participant: value,
      participantId: result.participantId
    });

    const responseTime = Date.now() - startTime;

    res.status(201).json({
      success: true,
      data: {
        participantId: result.participantId,
        qrCode: result.qrCode,
        registrationDate: new Date().toISOString()
      },
      message: 'Registration successful! Check your email for confirmation.',
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('[Registration] Registration error:', error);

    // Handle specific error types
    if (error.errorType) {
      return res.status(400).json({
        success: false,
        errorType: error.errorType,
        error: error.message,
        meta: { responseTime: `${responseTime}ms` }
      });
    }

    res.status(500).json({
      success: false,
      errorType: 'SERVER_ERROR',
      error: 'Registration failed due to server error. Please try again.',
      meta: { responseTime: `${responseTime}ms` }
    });
  }
});

// Get registration statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Registration.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Registration] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load statistics'
    });
  }
});

module.exports = router;
```

### admin.js (Admin Routes)
**Purpose**: Administrative functions for event management.

```javascript
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const AccessCode = require('../models/AccessCode');
const Registration = require('../models/Registration');

const router = express.Router();

// Admin rate limiting
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: 'Too many admin requests. Please try again later.'
  }
});

// Apply rate limiting to all admin routes
router.use(adminLimiter);

// Generate access codes
router.post('/generate-codes', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { error, value } = generateAccessCodesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { count, expiryHours, useFixedExpiry, eventName } = value;

    // Set fixed expiry date for the summit
    const summitExpiryDate = new Date('2025-11-14T23:59:59.000Z');
    
    const codes = [];
    const maxRetries = 3;
    
    for (let i = 0; i < count; i++) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const accessCode = await AccessCode.generate({
            expiryHours: useFixedExpiry ? undefined : expiryHours,
            expiryDate: useFixedExpiry ? summitExpiryDate : undefined,
            eventName: eventName || 'Youth Summit 2025'
          });
          
          codes.push({
            code: accessCode.code,
            expiresAt: accessCode.expiresAt,
            eventName: accessCode.eventName || 'Youth Summit 2025',
            createdAt: accessCode.createdAt
          });
          break;
        } catch (generateError) {
          if (generateError.message.includes('E11000') && retries < maxRetries - 1) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            continue;
          }
          throw generateError;
        }
      }
    }

    const responseTime = Date.now() - startTime;

    res.status(201).json({
      success: true,
      data: {
        codes,
        generated: codes.length,
        expiryDate: useFixedExpiry ? summitExpiryDate : undefined,
        expiryHours: useFixedExpiry ? undefined : expiryHours,
        eventName: eventName || 'Youth Summit 2025'
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('[Admin] Code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate access codes',
      meta: { responseTime: `${responseTime}ms` }
    });
  }
});

module.exports = router;
```

## Email Service

### email.js (Email Service)
**Purpose**: Handle email communications with participants and administrators.

```javascript
const nodemailer = require('nodemailer');
const { config } = require('./config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.email.smtp.user,
        pass: config.email.smtp.pass,
      },
    });
  }

  async sendConfirmationEmail(email, data) {
    const { participantId, name, qrCode } = data;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmation - Youth Summit 2025</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #ffc107 0%, #e67e22 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8f9fa; }
          .qr-code { text-align: center; margin: 20px 0; }
          .footer { background: #037195; color: white; padding: 15px; text-align: center; }
          @media (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 15px !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Confirmed!</h1>
            <h2>Youth Summit 2025</h2>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Congratulations! Your registration for the Kono District Youth Empowerment Summit 2025 has been confirmed.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Your Registration Details:</h3>
              <p><strong>Participant ID:</strong> ${participantId}</p>
              <p><strong>Event:</strong> Kono District Youth Empowerment Summit 2025</p>
              <p><strong>Date:</strong> November 15, 2025</p>
              <p><strong>Venue:</strong> Fachima Complex Hall, Bona Street, Koidu City, Kono</p>
            </div>

            <div class="qr-code">
              <h3>Your Check-in QR Code:</h3>
              <img src="${qrCode}" alt="QR Code for ${participantId}" style="max-width: 200px;">
              <p><small>Save this email or screenshot the QR code for quick check-in at the event.</small></p>
            </div>

            <div style="background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>Important Reminders:</h4>
              <ul>
                <li>Arrive at 8:00 AM for registration and welcome breakfast</li>
                <li>Bring a valid ID for verification</li>
                <li>Present your QR code for quick check-in</li>
                <li>Dress code: Business casual</li>
              </ul>
            </div>

            <p>We're excited to see you at the summit! This will be an incredible day of learning, networking, and inspiration.</p>
            <p>If you have any questions, please contact us at <a href="mailto:info@youthaccesshub.org">info@youthaccesshub.org</a>.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Young Access Hub. All rights reserved.</p>
            <p>Leading change through local action.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Young Access Hub" <${config.email.smtp.user}>`,
      to: email,
      subject: 'Registration Confirmed - Youth Summit 2025',
      html: htmlContent
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[Email] Confirmation sent to ${email}`);
    } catch (error) {
      console.error(`[Email] Failed to send confirmation to ${email}:`, error);
      throw error;
    }
  }

  async sendAdminNotification(data) {
    const { type, participant, participantId } = data;
    
    const htmlContent = `
      <h2>New Registration - Youth Summit 2025</h2>
      <h3>Participant Details:</h3>
      <ul>
        <li><strong>Participant ID:</strong> ${participantId}</li>
        <li><strong>Name:</strong> ${participant.firstName} ${participant.lastName}</li>
        <li><strong>Email:</strong> ${participant.email}</li>
        <li><strong>Phone:</strong> ${participant.phone}</li>
        <li><strong>Age:</strong> ${participant.age}</li>
        <li><strong>Occupation:</strong> ${participant.occupation}</li>
        <li><strong>Organization:</strong> ${participant.organization || 'Not specified'}</li>
        <li><strong>Registration Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;

    const mailOptions = {
      from: `"YAH Registration System" <${config.email.smtp.user}>`,
      to: config.email.adminEmail,
      subject: `New Registration: ${participant.firstName} ${participant.lastName} (${participantId})`,
      html: htmlContent
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[Email] Admin notification sent for ${participantId}`);
    } catch (error) {
      console.error(`[Email] Failed to send admin notification for ${participantId}:`, error);
      // Don't throw error for admin notifications to avoid failing registration
    }
  }
}

module.exports = new EmailService();
```

## Configuration Management

### config.js (Configuration)
**Purpose**: Centralized configuration management with environment variable support.

```javascript
require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT) || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/yah_database',
    name: process.env.DB_NAME || 'yah_database'
  },
  
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    adminEmail: process.env.ADMIN_EMAIL || 'admin@youthaccesshub.org'
  },
  
  app: {
    accessCodeExpiryHours: parseInt(process.env.ACCESS_CODE_EXPIRY_HOURS) || 72,
    maxRegistrations: parseInt(process.env.MAX_REGISTRATIONS) || 200,
    summitDate: new Date('2025-11-15T09:00:00.000Z'),
    registrationDeadline: new Date('2025-11-14T23:59:59.000Z')
  }
};

// Validation
if (!config.email.smtp.user || !config.email.smtp.pass) {
  console.warn('[Config] Email credentials not configured. Email functionality will be disabled.');
}

if (!config.database.uri.includes('mongodb://') && !config.database.uri.includes('mongodb+srv://')) {
  throw new Error('[Config] Invalid MongoDB URI format');
}

module.exports = { config };
```

## Security Features

### Rate Limiting (rateLimit.js)
```javascript
const rateLimit = require('express-rate-limit');

// Registration rate limiting
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 registration attempts
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin rate limiting
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 admin requests
  message: {
    success: false,
    error: 'Too many admin requests. Please try again later.'
  }
});

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests
  message: 'Too many requests from this IP, please try again later.'
});

module.exports = {
  registrationLimiter,
  adminLimiter,
  generalLimiter
};
```

## Development Workflow

### Environment Setup
```bash
# 1. Clone and setup
git clone https://github.com/SUBiango/yah.git
cd yah/backend

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your configuration

# 4. Start development server
npm run dev
```

### Package.json Scripts
```json
{
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

### Error Handling Best Practices

1. **Consistent Error Format**
```javascript
const createError = (message, type = 'SERVER_ERROR', statusCode = 500) => {
  const error = new Error(message);
  error.errorType = type;
  error.statusCode = statusCode;
  return error;
};
```

2. **Async Error Handling**
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
router.post('/register', asyncHandler(async (req, res) => {
  // async code here
}));
```

3. **Database Error Handling**
```javascript
try {
  const result = await db.collection('registrations').insertOne(doc);
} catch (error) {
  if (error.code === 11000) {
    // Duplicate key error
    throw createError('Email already registered', 'DUPLICATE_EMAIL', 409);
  }
  throw createError('Database operation failed', 'DATABASE_ERROR', 500);
}
```

### Performance Optimization

1. **Database Optimization**
```javascript
// Use projections to limit data transfer
const registrations = await db.collection('registrations')
  .find({}, { 
    projection: { 
      qrCode: 0 // Exclude large QR code data
    } 
  })
  .toArray();

// Use proper indexing
await db.collection('access_codes').createIndex({ code: 1 }, { unique: true });
```

2. **Memory Management**
```javascript
// Clean up expired codes periodically
setInterval(async () => {
  try {
    const deletedCount = await AccessCode.cleanup();
    console.log(`[Cleanup] Removed ${deletedCount} expired codes`);
  } catch (error) {
    console.error('[Cleanup] Failed:', error);
  }
}, 24 * 60 * 60 * 1000); // Run daily
```

3. **Request Optimization**
```javascript
// Implement response compression
const compression = require('compression');
app.use(compression());

// Set appropriate cache headers
app.use('/api/registration/stats', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});
```

---

*For complete deployment and frontend integration details, see the main DOCUMENTATION.md file.*