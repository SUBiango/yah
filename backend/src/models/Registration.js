const { ObjectId } = require('mongodb');
const dbConnection = require('../utils/database');
const AccessCode = require('./AccessCode');
const Participant = require('./Participant');
const { QRService } = require('../utils/qr');
const { config } = require('../utils/config');

class Registration {
  /**
   * Create a new registration
   * @param {string} accessCode - The access code to use
   * @param {string|ObjectId} participantId - The participant ID
   * @returns {Object} The created registration
   */
  static async create(accessCode, participantId) {
    const db = dbConnection.getDatabase();
    
    // First, validate access code exists and is not expired (but don't mark as used yet)
    const accessCodeData = await AccessCode.findByCode(accessCode);
    if (!accessCodeData) {
      const error = new Error('Access code not found');
      error.errorType = 'NOT_FOUND';
      throw error;
    }

    if (accessCodeData.expiresAt < new Date()) {
      const error = new Error('Access code has expired');
      error.errorType = 'EXPIRED';
      throw error;
    }

    // Check if access code has already been used for a completed registration
    const existingRegistrationWithCode = await db.collection('registrations')
      .findOne({ accessCode });
    
    if (existingRegistrationWithCode) {
      const error = new Error('This access code has already been used for a completed registration');
      error.errorType = 'ALREADY_USED';
      throw error;
    }

    // Validate participant exists
    let objectId;
    try {
      objectId = typeof participantId === 'string' ? new ObjectId(participantId) : participantId;
    } catch (error) {
      throw new Error('Invalid participant ID format');
    }

    const participant = await Participant.findById(objectId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    // Check if participant already has a registration
    const existingRegistration = await db.collection('registrations')
      .findOne({ participantId: objectId });
    
    if (existingRegistration) {
      throw new Error('Participant already registered');
    }

    // Generate QR code using QR service
    const qrCodeDataUrl = await QRService.generateRegistrationQR(participant, {
      id: new ObjectId().toString(), // Temporary ID for QR generation
      accessCode,
      createdAt: new Date(),
    });

    // Create registration object
    const registration = {
      accessCode,
      participantId: objectId,
      status: 'confirmed',
      qrCode: qrCodeDataUrl,
      createdAt: new Date(),
    };

    // Insert registration first
    const result = await db.collection('registrations').insertOne(registration);

    // Only NOW mark the access code as used (after successful registration creation)
    try {
      const codeResult = await AccessCode.markAsUsedDetailed(accessCode);
      if (!codeResult.success) {
        // If marking as used fails, we should still return the registration since it was created
        console.warn('Failed to mark access code as used after successful registration:', {
          accessCode,
          registrationId: result.insertedId,
          error: codeResult.error
        });
      }
    } catch (markError) {
      // Log the error but don't fail the registration
      console.error('Error marking access code as used after successful registration:', {
        accessCode,
        registrationId: result.insertedId,
        error: markError.message
      });
    }

    return {
      _id: result.insertedId,
      ...registration,
    };
  }

  /**
   * Find registration by access code
   * @param {string} accessCode - The access code
   * @returns {Object|null} The registration or null if not found
   */
  static async findByAccessCode(accessCode) {
    if (!accessCode || typeof accessCode !== 'string') {
      return null;
    }

    const db = dbConnection.getDatabase();
    return await db.collection('registrations').findOne({ accessCode });
  }

  /**
   * Find registration by participant ID
   * @param {string|ObjectId} participantId - The participant ID
   * @returns {Object|null} The registration or null if not found
   */
  static async findByParticipantId(participantId) {
    if (!participantId) {
      return null;
    }

    let objectId;
    try {
      objectId = typeof participantId === 'string' ? new ObjectId(participantId) : participantId;
    } catch (error) {
      return null;
    }

    const db = dbConnection.getDatabase();
    return await db.collection('registrations').findOne({ participantId: objectId });
  }

  /**
   * Get all registrations with participant details
   * @param {Object} options - Query options
   * @returns {Array} Array of registrations with participant details
   */
  static async getAllRegistrations(options = {}) {
    const { skip = 0, limit = 100 } = options;
    
    const db = dbConnection.getDatabase();
    
    const registrations = await db.collection('registrations').aggregate([
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
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      },
      {
        $project: {
          _id: 1,
          accessCode: 1,
          status: 1,
          createdAt: 1,
          qrCode: 1,
          'participant._id': 1,
          'participant.firstName': 1,
          'participant.lastName': 1,
          'participant.email': 1,
          'participant.phone': 1,
          'participant.age': 1,
          'participant.gender': 1,
          'participant.district': 1,
          'participant.occupation': 1,
          'participant.interest': 1,
          'participant.churchAffiliation': 1
        }
      }
    ]).toArray();

    return registrations;
  }

  /**
   * Get registration count
   * @returns {number} Total number of registrations
   */
  static async getRegistrationCount() {
    const db = dbConnection.getDatabase();
    return await db.collection('registrations').countDocuments({});
  }

  /**
   * Get registration statistics with time-based filtering
   * @returns {Object} Registration statistics
   */
  static async getStats() {
    const db = dbConnection.getDatabase();
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, registrationsToday, registrationsThisWeek, registrationsThisMonth] = await Promise.all([
      db.collection('registrations').countDocuments({}),
      db.collection('registrations').countDocuments({
        createdAt: { $gte: today }
      }),
      db.collection('registrations').countDocuments({
        createdAt: { $gte: thisWeek }
      }),
      db.collection('registrations').countDocuments({
        createdAt: { $gte: thisMonth }
      })
    ]);

    return {
      total,
      today: registrationsToday,
      thisWeek: registrationsThisWeek,
      thisMonth: registrationsThisMonth,
    };
  }

  /**
   * Find registration by ID
   * @param {string|ObjectId} id - The registration ID
   * @returns {Object|null} The registration or null if not found
   */
  static async findById(id) {
    if (!id) {
      return null;
    }

    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      return null;
    }

    const db = dbConnection.getDatabase();
    return await db.collection('registrations').findOne({ _id: objectId });
  }

  /**
   * Update registration status
   * @param {string|ObjectId} id - The registration ID
   * @param {string} status - The new status
   * @returns {Object|null} Updated registration or null if not found
   */
  static async updateStatus(id, status) {
    const validStatuses = ['confirmed', 'cancelled', 'attended'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status. Must be: confirmed, cancelled, or attended');
    }

    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      throw new Error('Invalid registration ID format');
    }

    const db = dbConnection.getDatabase();
    const result = await db.collection('registrations').findOneAndUpdate(
      { _id: objectId },
      { 
        $set: { 
          status,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value;
  }

  /**
   * Delete registration
   * @param {string|ObjectId} id - The registration ID
   * @returns {boolean} True if deleted, false if not found
   */
  static async delete(id) {
    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      throw new Error('Invalid registration ID format');
    }

    const db = dbConnection.getDatabase();
    const result = await db.collection('registrations').deleteOne({ _id: objectId });
    
    return result.deletedCount === 1;
  }

  /**
   * Get registration with full participant and access code details
   * @param {string|ObjectId} id - The registration ID
   * @returns {Object|null} Full registration details or null if not found
   */
  static async getFullDetails(id) {
    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      return null;
    }

    const db = dbConnection.getDatabase();
    
    const registrations = await db.collection('registrations').aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: 'participants',
          localField: 'participantId',
          foreignField: '_id',
          as: 'participant'
        }
      },
      {
        $lookup: {
          from: 'access_codes',
          localField: 'accessCode',
          foreignField: 'code',
          as: 'accessCodeDetails'
        }
      },
      {
        $unwind: '$participant'
      },
      {
        $unwind: '$accessCodeDetails'
      }
    ]).toArray();

    return registrations.length > 0 ? registrations[0] : null;
  }
}

module.exports = Registration;