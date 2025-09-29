const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const AccessCode = require('../models/AccessCode');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const { emailService } = require('../utils/email');

const router = express.Router();

// Debug middleware for admin routes
router.use((req, res, next) => {
  console.log(`[ADMIN DEBUG] ${req.method} ${req.originalUrl}`);
  console.log(`[ADMIN DEBUG] Origin: ${req.headers.origin}`);
  console.log(`[ADMIN DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
  
  // Ensure CORS headers are always set for admin routes
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-HTTP-Method-Override');
    console.log(`[ADMIN DEBUG] Set CORS headers for origin: ${origin}`);
  }
  
  next();
});

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 admin requests per windowMs
  message: {
    success: false,
    error: 'Too many admin requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation schemas
const generateAccessCodesSchema = Joi.object({
  count: Joi.number().integer().min(1).max(100).default(1)
    .messages({
      'number.base': 'Count must be between 1 and 100',
      'number.min': 'Count must be between 1 and 100',
      'number.max': 'Count must be between 1 and 100',
    }),
  expiryHours: Joi.number().integer().min(1).max(168).default(72)
    .messages({
      'number.base': 'Expiry hours must be between 1 and 168 (1 week)',
      'number.min': 'Expiry hours must be between 1 and 168 (1 week)',
      'number.max': 'Expiry hours must be between 1 and 168 (1 week)',
    }),
  eventName: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Event name cannot exceed 100 characters',
    }),
});

const paginationSchema = Joi.object({
  skip: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'Skip must be a non-negative integer',
      'number.min': 'Skip must be a non-negative integer',
    }),
  limit: Joi.number().integer().min(1).max(1000).default(100)
    .messages({
      'number.base': 'Limit must be between 1 and 1000',
      'number.min': 'Limit must be between 1 and 1000',
      'number.max': 'Limit must be between 1 and 1000',
    }),
});

/**
 * @route POST /api/admin/generate-codes
 * @desc Generate new access codes with full details for testing
 * @access Admin
 */
router.post('/generate-codes', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const { error, value } = generateAccessCodesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { count, expiryHours, eventName } = value;

    // Generate access codes with full details
    const codes = [];
    const maxRetries = 3;
    
    for (let i = 0; i < count; i++) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const accessCode = await AccessCode.generate({
            expiryHours,
            eventName: eventName || 'Test Event'
          });
          
          codes.push({
            code: accessCode.code,
            expiresAt: accessCode.expiresAt,
            eventName: accessCode.eventName || 'Test Event',
            createdAt: accessCode.createdAt
          });
          break;
        } catch (generateError) {
          if (generateError.message.includes('E11000') && retries < maxRetries - 1) {
            retries++;
            // Small delay to reduce collision probability
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
        expiryHours,
        eventName: eventName || 'Test Event'
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Access code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route POST /api/admin/access-codes
 * @desc Generate new access codes for the event
 * @access Admin
 */
router.post('/access-codes', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const { error, value } = generateAccessCodesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { count, expiryHours, eventName } = value;

    // Generate access codes with retry logic for duplicates
    const codes = [];
    const maxRetries = 3;
    
    // For bulk generation, use sequential approach to avoid race conditions
    if (count > 10) {
      for (let i = 0; i < count; i++) {
        let retries = 0;
        while (retries < maxRetries) {
          try {
            const code = await AccessCode.generate();
            codes.push(code.code);
            break;
          } catch (generateError) {
            if (generateError.message.includes('E11000') && retries < maxRetries - 1) {
              retries++;
              // Small delay to reduce collision probability
              await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
              continue;
            }
            throw generateError;
          }
        }
      }
    } else {
      // For smaller batches, use parallel with retry
      const generationPromises = [];
      for (let i = 0; i < count; i++) {
        generationPromises.push(
          (async () => {
            let retries = 0;
            while (retries < maxRetries) {
              try {
                return await AccessCode.generate();
              } catch (generateError) {
                if (generateError.message.includes('E11000') && retries < maxRetries - 1) {
                  retries++;
                  await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
                  continue;
                }
                throw generateError;
              }
            }
          })()
        );
      }
      
      const generatedCodes = await Promise.all(generationPromises);
      codes.push(...generatedCodes.map(code => code.code));
    }

    const responseTime = Date.now() - startTime;

    res.status(201).json({
      success: true,
      data: {
        codes,
        generated: codes.length,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Access code generation error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route GET /api/admin/registrations
 * @desc Get all registrations with participant details (paginated)
 * @access Admin
 */
router.get('/registrations', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate query parameters
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }

    const { skip, limit } = value;

    // Get registrations with participant details
    const [registrations, total] = await Promise.all([
      Registration.getAllRegistrations({ skip, limit }),
      Registration.getRegistrationCount(),
    ]);

    const responseTime = Date.now() - startTime;

    // Log performance warning if over constitutional limit for large datasets
    if (responseTime > 2000 && total > 1000) {
      console.warn(`Admin registrations query exceeded 2s for ${total} records: ${responseTime}ms`);
    }

    res.status(200).json({
      success: true,
      data: {
        registrations,
        total,
        pagination: {
          skip,
          limit,
          hasMore: skip + limit < total,
        },
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Admin registrations fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route GET /api/admin/stats
 * @desc Get comprehensive statistics for the admin dashboard
 * @access Admin
 */
router.get('/stats', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Fetch all statistics in parallel for performance
    const [
      registrationStats,
      accessCodeStats,
    ] = await Promise.all([
      Registration.getStats(),
      AccessCode.getStats(),
    ]);

    // Calculate additional metrics - participants are now embedded in registrations
    const totalRegistrations = registrationStats.total;
    const totalParticipants = totalRegistrations; // Same as registrations in new architecture

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        totalRegistrations,
        totalParticipants,
        accessCodes: accessCodeStats,
        demographics: {
          // We could calculate demographics from embedded participant data if needed
          totalParticipants: totalParticipants
        },
        recentActivity: {
          registrationsToday: registrationStats.today,
          registrationsThisWeek: registrationStats.thisWeek,
          registrationsThisMonth: registrationStats.thisMonth,
        },
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Admin stats fetch error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route POST /api/admin/cleanup-failed-registration
 * @desc Clean up failed/incomplete registration by access code
 * @access Admin
 */
router.post('/cleanup-failed-registration', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { accessCode } = req.body;

    if (!accessCode) {
      return res.status(400).json({
        success: false,
        error: 'Access code is required'
      });
    }

    // Clean up incomplete registrations for this access code
    const db = require('../utils/database').getDatabase();
    
    // Find registrations to be deleted
    const registrationsToDelete = await db.collection('registrations').find({
      accessCode,
      $or: [
        { status: { $ne: 'confirmed' } },  // Not confirmed
        { qrCode: { $exists: false } },    // No QR code generated
        { qrCode: null }                   // QR code is null
      ]
    }).toArray();

    // Delete the incomplete registrations
    const deleteResult = await db.collection('registrations').deleteMany({
      accessCode,
      $or: [
        { status: { $ne: 'confirmed' } },
        { qrCode: { $exists: false } },
        { qrCode: null }
      ]
    });

    // Also reset the access code to unused status
    const AccessCode = require('../models/AccessCode');
    await db.collection('access_codes').updateOne(
      { code: accessCode },
      { 
        $set: { isUsed: false },
        $unset: { usedAt: 1 }
      }
    );

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        accessCode,
        deletedRegistrations: deleteResult.deletedCount,
        registrationsFound: registrationsToDelete,
        message: `Cleaned up ${deleteResult.deletedCount} incomplete registration(s) and reset access code ${accessCode}`
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Failed registration cleanup error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route DELETE /api/admin/cleanup
 * @desc Clean up expired access codes
 * @access Admin
 */
router.delete('/cleanup', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Clean up expired access codes
    const deletedCount = await AccessCode.cleanup();

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        deletedCount,
        message: `Removed ${deletedCount} expired access codes`,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Admin cleanup error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route GET /api/admin/registration/:id
 * @desc Get detailed registration information by ID
 * @access Admin
 */
router.get('/registration/:id', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;

    // Get full registration details
    const registration = await Registration.getFullDetails(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
      });
    }

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        registration,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Admin registration detail error:', error);
    
    let statusCode = 500;
    let message = 'Internal server error';

    if (error.message.includes('Invalid') && error.message.includes('ID')) {
      statusCode = 400;
      message = 'Invalid registration ID format';
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route PUT /api/admin/registration/:id/status
 * @desc Update registration status
 * @access Admin
 */
router.put('/registration/:id/status', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !['confirmed', 'cancelled', 'attended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: confirmed, cancelled, or attended',
      });
    }

    // Update registration status
    const updatedRegistration = await Registration.updateStatus(id, status);

    if (!updatedRegistration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
      });
    }

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        registration: updatedRegistration,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Admin status update error:', error);
    
    let statusCode = 500;
    let message = 'Internal server error';

    if (error.message.includes('Invalid') && error.message.includes('ID')) {
      statusCode = 400;
      message = 'Invalid registration ID format';
    } else if (error.message.includes('Invalid status')) {
      statusCode = 400;
      message = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route POST /api/admin/send-confirmation
 * @desc Resend confirmation email for a registration
 * @access Admin
 */
router.post('/send-confirmation', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        error: 'Registration ID is required',
      });
    }

    // Get full registration details
    const registration = await Registration.getFullDetails(registrationId);

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
      });
    }

    // Check if registration has a participant
    if (!registration.participant) {
      return res.status(400).json({
        success: false,
        error: 'No participant data found for this registration',
      });
    }

    // Send confirmation email with QR code
    await emailService.sendQRCode(registration.participant, registration);

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: `Confirmation email sent successfully to ${registration.participant.email}`,
      data: {
        registrationId,
        sentTo: registration.participant.email,
        participantName: `${registration.participant.firstName} ${registration.participant.lastName}`,
      },
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Send confirmation email error:', error);
    
    let statusCode = 500;
    let message = 'Failed to send confirmation email';

    if (error.message.includes('Invalid') && error.message.includes('ID')) {
      statusCode = 400;
      message = 'Invalid registration ID format';
    } else if (error.message.includes('Email')) {
      statusCode = 503;
      message = 'Email service temporarily unavailable';
    }

    res.status(statusCode).json({
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      meta: {
        responseTime: `${responseTime}ms`,
      },
    });
  }
});

/**
 * @route POST /api/admin/test-email
 * @desc Test email service functionality
 * @access Admin
 */
router.post('/test-email', adminLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { testEmail } = req.body;
    const emailTo = testEmail || 'test@example.com';
    
    // Create test participant and registration data
    const testParticipant = {
      firstName: 'Test',
      lastName: 'User',
      email: emailTo,
      phone: '+23276123456',
      age: 25,
      gender: 'Male',
      district: 'Western Area Urban',
      occupation: 'Tester',
      interest: 'Innovation & Entrepreneurship'
    };
    
    const testRegistration = {
      _id: '507f1f77bcf86cd799439011',
      accessCode: 'TEST1234',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      createdAt: new Date(),
      status: 'confirmed'
    };
    
    await emailService.sendQRCode(testParticipant, testRegistration);
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${emailTo}`,
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Test email failed:', error);
    
    res.status(500).json({
      success: false,
      error: `Failed to send test email: ${error.message}`,
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
  }
});

module.exports = router;