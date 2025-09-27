const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { ObjectId } = require('mongodb');
const Registration = require('../models/Registration');
const Participant = require('../models/Participant');
const dbConnection = require('../utils/database');

const router = express.Router();

// Rate limiting for scanner endpoints
const scannerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 200, // Higher limit for active scanning
  message: {
    success: false,
    error: 'Too many scanner requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check-in validation schema
const checkInSchema = Joi.object({
  registrationId: Joi.string().required()
    .messages({
      'string.empty': 'Registration ID is required',
      'any.required': 'Registration ID is required',
    }),
});

/**
 * @route GET /api/scanner/stats
 * @desc Get event check-in statistics
 * @access Public (should be restricted in production)
 */
router.get('/stats', scannerLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const db = dbConnection.getDatabase();
    
    // Get total registrations
    const totalRegistered = await db.collection('registrations').countDocuments({
      status: 'confirmed'
    });
    
    // Get checked-in count
    const checkedIn = await db.collection('registrations').countDocuments({
      status: 'confirmed',
      checkedInAt: { $exists: true }
    });
    
    // Calculate attendance rate
    const attendanceRate = totalRegistered > 0 ? 
      Math.round((checkedIn / totalRegistered) * 100) : 0;
    
    // Get today's check-ins
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCheckins = await db.collection('registrations').countDocuments({
      checkedInAt: { $gte: today }
    });
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      data: {
        totalRegistered,
        checkedIn,
        attendanceRate,
        todayCheckins,
        lastUpdated: new Date().toISOString()
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Scanner stats error:', error);
    
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

/**
 * @route POST /api/scanner/checkin
 * @desc Check in a participant using their registration ID
 * @access Public (should be restricted in production)
 */
router.post('/checkin', scannerLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate input
    const { error, value } = checkInSchema.validate(req.body, {
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

    const { registrationId } = value;
    
    // Find registration by ID
    let registration;
    try {
      // Try as ObjectId first
      if (registrationId.match(/^[0-9a-fA-F]{24}$/)) {
        registration = await Registration.findById(registrationId);
      }
    } catch (error) {
      // If ObjectId fails, try as string
      console.warn('ObjectId parsing failed, trying string search:', error.message);
    }
    
    // If not found by ObjectId, try finding by access code or other identifier
    if (!registration) {
      const db = dbConnection.getDatabase();
      registration = await db.collection('registrations').findOne({
        $or: [
          { accessCode: registrationId },
          { _id: registrationId } // In case it's a string ID
        ]
      });
    }
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found. Please check the QR code or registration ID.',
        errorType: 'NOT_FOUND'
      });
    }
    
    // Check if registration is confirmed
    if (registration.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Registration is not confirmed. Cannot check in.',
        errorType: 'NOT_CONFIRMED'
      });
    }
    
    // Get participant details
    const participant = await Participant.findById(registration.participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Participant details not found.',
        errorType: 'PARTICIPANT_NOT_FOUND'
      });
    }
    
    // Check if already checked in
    const alreadyCheckedIn = !!registration.checkedInAt;
    let checkedInAt = registration.checkedInAt;
    
    if (!alreadyCheckedIn) {
      // Perform check-in
      const db = dbConnection.getDatabase();
      checkedInAt = new Date();
      
      await db.collection('registrations').updateOne(
        { _id: registration._id },
        { 
          $set: { 
            checkedInAt,
            updatedAt: new Date()
          }
        }
      );
      
      console.log('Participant checked in:', {
        registrationId: registration._id,
        participantName: `${participant.firstName} ${participant.lastName}`,
        checkedInAt
      });
    }
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      data: {
        alreadyCheckedIn,
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
          registrationId: registration._id
        },
        registration: {
          id: registration._id,
          accessCode: registration.accessCode,
          status: registration.status,
          createdAt: registration.createdAt,
          checkedInAt
        },
        checkedInAt: checkedInAt.toISOString(),
        message: alreadyCheckedIn ? 
          `${participant.firstName} ${participant.lastName} was already checked in` :
          `${participant.firstName} ${participant.lastName} has been successfully checked in`
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Check-in error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during check-in',
      errorType: 'SERVER_ERROR',
      meta: {
        responseTime: `${responseTime}ms`
      }
    });
  }
});

/**
 * @route GET /api/scanner/checkins
 * @desc Get recent check-ins for the scanner interface
 * @access Public (should be restricted in production)
 */
router.get('/checkins', scannerLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { limit = 20, skip = 0 } = req.query;
    
    const db = dbConnection.getDatabase();
    
    // Get recent check-ins with participant details
    const checkins = await db.collection('registrations').aggregate([
      {
        $match: {
          checkedInAt: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'participants',
          localField: 'participantId',
          foreignField: '_id',
          as: 'participant'
        }
      },
      {
        $unwind: '$participant'
      },
      {
        $sort: { checkedInAt: -1 }
      },
      {
        $skip: parseInt(skip)
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          accessCode: 1,
          checkedInAt: 1,
          'participant.firstName': 1,
          'participant.lastName': 1,
          'participant.email': 1,
          'participant.phone': 1,
          'participant.district': 1
        }
      }
    ]).toArray();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      data: {
        checkins: checkins.map(checkin => ({
          id: checkin._id,
          accessCode: checkin.accessCode,
          checkedInAt: checkin.checkedInAt,
          participant: checkin.participant
        })),
        total: checkins.length
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Check-ins list error:', error);
    
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

/**
 * @route POST /api/scanner/verify
 * @desc Verify a QR code without checking in (dry run)
 * @access Public (should be restricted in production)
 */
router.post('/verify', scannerLimiter, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { error, value } = checkInSchema.validate(req.body, {
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

    const { registrationId } = value;
    
    // Find registration
    let registration;
    try {
      if (registrationId.match(/^[0-9a-fA-F]{24}$/)) {
        registration = await Registration.findById(registrationId);
      }
    } catch (error) {
      // Try other search methods
    }
    
    if (!registration) {
      const db = dbConnection.getDatabase();
      registration = await db.collection('registrations').findOne({
        $or: [
          { accessCode: registrationId },
          { _id: registrationId }
        ]
      });
    }
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found',
        errorType: 'NOT_FOUND'
      });
    }
    
    // Get participant details
    const participant = await Participant.findById(registration.participantId);
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      data: {
        valid: true,
        alreadyCheckedIn: !!registration.checkedInAt,
        participant: participant ? {
          firstName: participant.firstName,
          lastName: participant.lastName,
          email: participant.email,
          registrationId: registration._id
        } : null,
        registration: {
          id: registration._id,
          status: registration.status,
          checkedInAt: registration.checkedInAt
        }
      },
      meta: {
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('QR verification error:', error);
    
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