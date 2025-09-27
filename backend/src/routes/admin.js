const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const AccessCode = require('../models/AccessCode');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const { emailService } = require('../utils/email');

const router = express.Router();

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

    const { count } = value;

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
      participantDemographics,
    ] = await Promise.all([
      Registration.getStats(),
      AccessCode.getStats(),
      Participant.getDemographics(),
    ]);

    // Calculate additional metrics
    const totalRegistrations = registrationStats.total;
    const totalParticipants = await Participant.getCount();

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      data: {
        totalRegistrations,
        totalParticipants,
        accessCodes: accessCodeStats,
        demographics: participantDemographics,
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