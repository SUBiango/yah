const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');
const Participant = require('../models/Participant');
const Registration = require('../models/Registration');
const AccessCode = require('../models/AccessCode');
const { emailService } = require('../utils/email');

const router = express.Router();

// Rate limiting for registration endpoints
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 10, // Higher limit for tests
  message: {
    success: false,
    error: 'Too many registration attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for verification endpoint (more lenient)
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 50, // Higher limit for tests
  message: {
    success: false,
    error: 'Too many verification attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation schema for registration
const registrationSchema = Joi.object({
  accessCode: Joi.string().pattern(/^[A-Z0-9]{8}$/).required()
    .messages({
      'string.pattern.base': 'Invalid access code format',
      'any.required': 'accessCode is required',
    }),
  firstName: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': 'firstName is required',
      'any.required': 'firstName is required',
    }),
  lastName: Joi.string().trim().min(1).max(50).required()
    .messages({
      'string.empty': 'lastName is required',
      'any.required': 'lastName is required',
    }),
  email: Joi.string().trim().email().max(100).required()
    .messages({
      'string.empty': 'email is required',
      'string.email': 'Invalid email format',
      'any.required': 'email is required',
    }),
  phone: Joi.string().trim().pattern(/^\+232\d{8}$/).required()
    .messages({
      'string.empty': 'phone is required',
      'string.pattern.base': 'Invalid phone format',
      'any.required': 'phone is required',
    }),
  age: Joi.number().integer().min(13).max(35).required()
    .messages({
      'number.base': 'Age must be between 13 and 35',
      'number.min': 'Age must be between 13 and 35',
      'number.max': 'Age must be between 13 and 35',
      'any.required': 'age is required',
    }),
  occupation: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'occupation is required',
      'any.required': 'occupation is required',
    }),
  gender: Joi.string().valid('Male', 'Female').required()
    .messages({
      'any.only': 'Gender must be Male or Female',
      'any.required': 'gender is required',
    }),
  district: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'district is required',
      'any.required': 'district is required',
    }),
  interest: Joi.string().valid('Innovation & Entrepreneurship', 'Leadership Development', 'Networking').required()
    .messages({
      'any.only': 'Interest must be Innovation & Entrepreneurship, Leadership Development, or Networking',
      'any.required': 'interest is required',
    }),
  churchAffiliation: Joi.string().trim().max(100).optional().allow(''),
});

// Access code validation schema
const accessCodeSchema = Joi.string().pattern(/^[A-Z0-9]{8}$/).required()
  .messages({
    'string.pattern.base': 'Invalid access code format',
    'any.required': 'Access code is required',
  });

// Sanitize HTML to prevent XSS attacks
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }
  return input;
}

// Recursive sanitization for objects
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * @route POST /api/register
 * @desc Register a participant for the youth event
 * @access Public
 */
router.post('/register', registrationLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Sanitize input data
    const sanitizedBody = sanitizeObject(req.body);
    
    // Validate input
    const { error, value } = registrationSchema.validate(sanitizedBody, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details[0].message;
      return res.status(400).json({
        success: false,
        error: message,
      });
    }

    const { accessCode, ...participantData } = value;

    // Create registration (this will also create the participant with new ID system)
    const registration = await Registration.create(accessCode, participantData);

    // Calculate response time for performance monitoring
    const responseTime = Date.now() - startTime;
    
    // Response should not include sensitive internal data
    const response = {
      success: true,
      data: {
        registration: {
          id: registration._id,
          participantId: registration.participantId, // Include the new KDYES25{number} ID
          status: registration.status,
          qrCode: registration.qrCode,
          createdAt: registration.createdAt,
        },
        participant: {
          participantId: registration.participantId,
          firstName: registration.participantData.firstName,
          lastName: registration.participantData.lastName,
          email: registration.participantData.email,
          phone: registration.participantData.phone,
          age: registration.participantData.age,
          gender: registration.participantData.gender,
          district: registration.participantData.district,
          occupation: registration.participantData.occupation,
          interest: registration.participantData.interest,
        },
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    };

    // Log performance warning if over constitutional limit
    if (responseTime > 500) {
      console.warn(`Registration response time exceeded 500ms: ${responseTime}ms`);
    }

    // Send QR code email asynchronously (don't block response)
    try {
      console.log('Attempting to send QR code email to:', registration.participantData.email);
      await emailService.sendQRCode(registration.participantData, registration);
      console.log('✅ QR code email sent successfully to:', registration.participantData.email);
    } catch (emailError) {
      console.error('❌ Failed to send QR code email:', {
        error: emailError.message,
        participantEmail: registration.participantData.email,
        registrationId: registration._id,
        stack: emailError.stack
      });
      // Don't fail the registration if email fails - this is by design
    }

    res.status(201).json(response);

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Registration error:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let message = 'Internal server error';
    let errorType = 'SERVER_ERROR';

    if (error.errorType) {
      // Use the specific error type from the access code validation
      statusCode = 400;
      message = error.message;
      errorType = error.errorType;
    } else if (error.message.includes('already exists') || error.message.includes('already registered')) {
      statusCode = 400;
      message = error.message;
      errorType = 'DUPLICATE_REGISTRATION';
    } else if (error.message.includes('not found')) {
      statusCode = 400;
      message = error.message;
      errorType = 'NOT_FOUND';
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      errorType: errorType,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route POST /api/validate-access-code
 * @desc Validate if an access code is valid and unused (for testing)
 * @access Public
 */
router.post('/validate-access-code', verificationLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { accessCode } = req.body;

    if (!accessCode) {
      return res.status(400).json({
        success: false,
        error: 'Access code is required',
        errorType: 'MISSING_CODE'
      });
    }

    // Validate access code format
    const { error } = accessCodeSchema.validate(accessCode);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access code format',
        errorType: 'INVALID_FORMAT'
      });
    }

    // Validate access code format first
    if (!AccessCode.validateCodeFormat(accessCode)) {
      return res.status(400).json({
        success: false,
        error: 'Access code does not meet security requirements',
        errorType: 'INVALID_FORMAT'
      });
    }

    // Check if access code exists and get its status
    const accessCodeData = await AccessCode.findByCode(accessCode);
    const responseTime = Date.now() - startTime;
    
    if (!accessCodeData) {
      return res.status(400).json({
        success: false,
        error: 'Access code not found',
        errorType: 'NOT_FOUND',
        meta: { responseTime: `${responseTime}ms` }
      });
    }
    
    if (accessCodeData.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Access code has expired',
        errorType: 'EXPIRED',
        meta: { responseTime: `${responseTime}ms` }
      });
    }

    // Check if access code has been used for a completed registration
    const existingRegistration = await Registration.findByAccessCode(accessCode);
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        error: 'This access code has already been used for a completed registration',
        errorType: 'ALREADY_USED',
        meta: { responseTime: `${responseTime}ms` }
      });
    }

    // Access code is valid and available
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        accessCode: accessCode,
        expiresAt: accessCodeData.expiresAt,
        createdAt: accessCodeData.createdAt
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Access code validation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorType: 'SERVER_ERROR',
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route GET /api/registration/:id
 * @desc Get registration details by ID for confirmation page
 * @access Public
 */
router.get('/registration/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid registration ID format'
      });
    }

    const db = require('../utils/database').getDatabase();
    const { ObjectId } = require('mongodb');
    
    // Find the registration by ID
    const registration = await db.collection('registrations').findOne({
      _id: new ObjectId(id)
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    const responseTime = Date.now() - startTime;

    // Return registration data in the format expected by confirmation page
    res.status(200).json({
      success: true,
      data: {
        registration: {
          id: registration._id,
          participantId: registration.participantId,
          status: registration.status,
          qrCode: registration.qrCode,
          createdAt: registration.createdAt,
          accessCode: registration.accessCode
        },
        participant: {
          participantId: registration.participantId,
          firstName: registration.participantData.firstName,
          lastName: registration.participantData.lastName,
          email: registration.participantData.email,
          phone: registration.participantData.phone,
          age: registration.participantData.age,
          gender: registration.participantData.gender,
          district: registration.participantData.district,
          occupation: registration.participantData.occupation,
          interest: registration.participantData.interest,
          churchAffiliation: registration.participantData.churchAffiliation || ''
        }
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Registration fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
  }
});

/**
 * @route GET /api/verify/:accessCode
 * @desc Verify if an access code is valid and unused
 * @access Public
 */
router.get('/verify/:accessCode', verificationLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { accessCode } = req.params;

    // Validate access code format
    const { error } = accessCodeSchema.validate(accessCode);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid access code format',
        errorType: 'INVALID_FORMAT'
      });
    }

    // Get detailed access code status
    const accessCodeData = await AccessCode.findByCode(accessCode);
    const responseTime = Date.now() - startTime;
    
    if (!accessCodeData) {
      return res.status(400).json({
        success: false,
        error: 'Access code not found',
        errorType: 'NOT_FOUND',
        meta: { responseTime: `${responseTime}ms` }
      });
    }
    
    if (accessCodeData.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Access code has expired',
        errorType: 'EXPIRED',
        meta: { responseTime: `${responseTime}ms` }
      });
    }

    // Check if access code has been used for a completed registration
    const existingRegistration = await Registration.findByAccessCode(accessCode);
    if (existingRegistration) {
      console.log(`[Registration] Access code ${accessCode} already used for completed registration: ${existingRegistration._id}`);
      return res.status(400).json({
        success: false,
        error: 'This access code has already been used for a completed registration',
        errorType: 'ALREADY_USED',
        meta: { responseTime: `${responseTime}ms` }
      });
    }

    console.log(`[Registration] Access code ${accessCode} is valid and available for use`);
    
    // Access code is valid and unused
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        accessCode: accessCode,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Verification error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorType: 'SERVER_ERROR',
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route GET /api/registration/:id
 * @desc Get registration details by ID for confirmation page
 * @access Public
 */
router.get('/registration/:id', verificationLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid registration ID format',
        errorType: 'INVALID_ID'
      });
    }
    
    // Get registration with participant details
    const registration = await Registration.findById(id);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
        errorType: 'NOT_FOUND'
      });
    }
    
    // Get participant details
    const participant = await Participant.findById(registration.participantId);
    
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant details not found',
        errorType: 'PARTICIPANT_NOT_FOUND'
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    // Return public registration details
    res.status(200).json({
      success: true,
      data: {
        registration: {
          id: registration._id,
          status: registration.status,
          qrCode: registration.qrCode,
          createdAt: registration.createdAt,
          accessCode: registration.accessCode
        },
        participant: {
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          phone: participant.phone,
          age: participant.age,
          gender: participant.gender,
          district: participant.district,
          occupation: participant.occupation,
          interest: participant.interest,
          churchAffiliation: participant.churchAffiliation
        }
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Registration details error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorType: 'SERVER_ERROR',
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
  }
});

module.exports = router;