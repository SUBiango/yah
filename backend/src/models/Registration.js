const { ObjectId } = require('mongodb');
const dbConnection = require('../utils/database');
const AccessCode = require('./AccessCode');
const { QRService } = require('../utils/qr');
const { ParticipantIdService } = require('../utils/participantId');
const { config } = require('../utils/config');

class Registration {
  /**
   * Create a new registration
   * @param {string} accessCode - The access code to use
   * @param {Object} participantData - The participant data
   * @returns {Object} The created registration
   */
  static async create(accessCode, participantData) {
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

    // Check if access code has already been used for a SUCCESSFUL/COMPLETED registration
    const existingSuccessfulRegistration = await db.collection('registrations')
      .findOne({ 
        accessCode,
        status: 'confirmed',  // Only block if registration was successfully completed
        qrCode: { $exists: true, $ne: null }  // And QR code was generated (indicates completion)
      });
    
    if (existingSuccessfulRegistration) {
      console.log(`[Registration] Access code ${accessCode} already used for successful registration: ${existingSuccessfulRegistration._id}`);
      const error = new Error('This access code has already been used for a completed registration');
      error.errorType = 'ALREADY_USED';
      throw error;
    }

    // Clean up any incomplete registration attempts with this access code
    // (registrations that started but didn't complete successfully)
    const cleanupResult = await db.collection('registrations').deleteMany({
      accessCode,
      $or: [
        { status: { $ne: 'confirmed' } },  // Not confirmed
        { qrCode: { $exists: false } },    // No QR code generated
        { qrCode: null }                   // QR code is null
      ]
    });
    
    if (cleanupResult.deletedCount > 0) {
      console.log(`[Registration] Cleaned up ${cleanupResult.deletedCount} incomplete registration attempts for access code: ${accessCode}`);
    }

    // Generate unique participant ID
    const participantId = await ParticipantIdService.generateUniqueId();
    console.log(`[Registration] Generated participant ID: ${participantId}`);

    // Check if this email already has a registration (prevent duplicate registrations)
    const existingRegistrationByEmail = await db.collection('registrations')
      .findOne({ 'participantData.email': participantData.email });
    
    if (existingRegistrationByEmail) {
      throw new Error('Participant already registered with this email');
    }

    // Create registration object first (without QR code)
    const registration = {
      accessCode,
      participantId: participantId,  // Use the generated participant ID (KDYES25{number})
      participantData: participantData, // Store participant data in registration
      status: 'pending', // Start with pending status until everything is complete
      createdAt: new Date(),
    };

    let insertedId = null;
    
    try {
      // Insert registration first to get the real database ID
      const result = await db.collection('registrations').insertOne(registration);
      insertedId = result.insertedId;
      const actualRegistrationId = result.insertedId.toString();

      // Now generate QR code with the participant ID (not the database ObjectId)
      const qrCodeDataUrl = await QRService.generateRegistrationQR(participantData, {
        _id: actualRegistrationId,       // Database ObjectId for internal use
        registrationId: participantId,   // Participant ID for QR scanning (KDYES25{number})
        accessCode,
        createdAt: registration.createdAt,
      });

      // Update the registration with the QR code and confirm status
      await db.collection('registrations').updateOne(
        { _id: result.insertedId },
        { 
          $set: { 
            qrCode: qrCodeDataUrl,
            status: 'confirmed' // Only mark as confirmed when everything is complete
          }
        }
      );

      // Only NOW mark the access code as used (after successful registration creation)
      try {
        const codeResult = await AccessCode.markAsUsedDetailed(accessCode);
        if (!codeResult.success) {
          console.warn('Failed to mark access code as used after successful registration:', {
            accessCode,
            registrationId: result.insertedId,
            error: codeResult.error
          });
          // Continue anyway - registration was successful
        }
      } catch (markError) {
        console.error('Error marking access code as used after successful registration:', {
          accessCode,
          registrationId: result.insertedId,
          error: markError.message
        });
        // Continue anyway - registration was successful
      }

      // Return the complete registration
      return {
        _id: result.insertedId,
        ...registration,
        status: 'confirmed',
        qrCode: qrCodeDataUrl,
      };

    } catch (error) {
      // If anything fails after the registration was inserted, clean it up
      if (insertedId) {
        try {
          console.log(`[Registration] Cleaning up failed registration ${insertedId} due to error:`, error.message);
          await db.collection('registrations').deleteOne({ _id: insertedId });
          console.log(`[Registration] Successfully cleaned up failed registration ${insertedId}`);
        } catch (cleanupError) {
          console.error(`[Registration] Failed to clean up registration ${insertedId}:`, cleanupError.message);
        }
      }
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Find registration by access code
   * @param {string} accessCode - The access code
   * @returns {Object|null} The registration or null if not found
   */
  /**
   * Find COMPLETED registration by access code (only successful registrations)
   * @param {string} accessCode - The access code to search for
   * @returns {Object|null} The completed registration or null if not found
   */
  static async findByAccessCode(accessCode) {
    if (!accessCode || typeof accessCode !== 'string') {
      return null;
    }

    const db = dbConnection.getDatabase();
    
    // Only return registrations that were successfully completed
    return await db.collection('registrations').findOne({ 
      accessCode,
      status: 'confirmed',  // Must be confirmed
      qrCode: { $exists: true, $ne: null }  // Must have QR code (indicates completion)
    });
  }

  /**
   * Find ANY registration by access code (including incomplete attempts)
   * @param {string} accessCode - The access code to search for
   * @returns {Object|null} Any registration or null if not found
   */
  static async findAnyByAccessCode(accessCode) {
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
    
    // Get confirmed registrations with embedded participant data
    const registrations = await db.collection('registrations')
      .find({ 
        status: 'confirmed',
        qrCode: { $exists: true, $ne: null }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Transform the data to match the expected format for admin dashboard
    const result = registrations.map(registration => {
      // Handle both new (participant) and legacy (participantData) field structures
      const participantData = registration.participant || registration.participantData;
      
      if (!participantData) {
        return null;
      }
      
      return {
        _id: registration._id,
        accessCode: registration.accessCode,
        status: registration.status,
        createdAt: registration.createdAt,
        qrCode: registration.qrCode,
        participantId: registration.participantId,  // KDYES25{number}
        participant: {
          _id: registration.participantId,  // Use participant ID as the identifier
          firstName: participantData.firstName,
          lastName: participantData.lastName,
          email: participantData.email,
          phone: participantData.phone,
          age: participantData.age,
          gender: participantData.gender,
          district: participantData.district,
          occupation: participantData.occupation,
          interest: participantData.interest,
          churchAffiliation: participantData.churchAffiliation || ''
        }
      };
    }).filter(Boolean);  // Remove any null entries
    
    return result;
  }

  /**
   * Get registration count
   * @returns {number} Total number of registrations
   */
  static async getRegistrationCount() {
    const db = dbConnection.getDatabase();
    return await db.collection('registrations').countDocuments({
      status: 'confirmed',
      qrCode: { $exists: true, $ne: null }
    });
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

    const baseFilter = { 
      status: 'confirmed', 
      qrCode: { $exists: true, $ne: null } 
    };

    const [total, registrationsToday, registrationsThisWeek, registrationsThisMonth] = await Promise.all([
      db.collection('registrations').countDocuments(baseFilter),
      db.collection('registrations').countDocuments({
        ...baseFilter,
        createdAt: { $gte: today }
      }),
      db.collection('registrations').countDocuments({
        ...baseFilter,
        createdAt: { $gte: thisWeek }
      }),
      db.collection('registrations').countDocuments({
        ...baseFilter,
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
    const db = dbConnection.getDatabase();
    
    // Check if this is a participant ID (KDYES25 format) or MongoDB ObjectId
    let matchCriteria;
    if (typeof id === 'string' && id.startsWith('KDYES25')) {
      // Search by participant ID
      matchCriteria = { participantId: id };
    } else {
      // Try to search by MongoDB ObjectId
      try {
        const objectId = typeof id === 'string' ? new ObjectId(id) : id;
        matchCriteria = { _id: objectId };
      } catch (error) {
        return null;
      }
    }

    const registrations = await db.collection('registrations').aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'access_codes',
          localField: 'accessCode',
          foreignField: 'code',
          as: 'accessCodeDetails'
        }
      },
      {
        $addFields: {
          // Ensure participant data is properly formatted (it's already embedded)
          participant: {
            $ifNull: ['$participant', {}]
          }
        }
      },
      {
        $unwind: '$accessCodeDetails'
      }
    ]).toArray();

    return registrations.length > 0 ? registrations[0] : null;
  }
}

module.exports = Registration;