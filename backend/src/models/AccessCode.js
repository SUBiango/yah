const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const dbConnection = require('../utils/database');
const { config } = require('../utils/config');

class AccessCode {
  /**
   * Generate a new access code with cryptographically secure randomness
   * @returns {Object} The generated access code object
   */
  static async generate() {
    const db = dbConnection.getDatabase();
    
    // Generate cryptographically secure 8-character code
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 5 random bytes, convert to base32-like string, take first 8 chars
      const buffer = crypto.randomBytes(5);
      code = buffer.toString('base64')
        .replace(/[^A-Z0-9]/g, '')
        .padEnd(8, '0')
        .substring(0, 8);

      // Check if code already exists
      const existing = await db.collection('access_codes').findOne({ code });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique access code after maximum attempts');
    }

    // Create access code object
    const accessCodeObj = {
      code,
      isUsed: false,
      expiresAt: new Date(Date.now() + config.app.accessCodeExpiryHours * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    // Save to database with retry on duplicate key error
    let insertAttempts = 0;
    const maxInsertAttempts = 3;
    
    while (insertAttempts < maxInsertAttempts) {
      try {
        await db.collection('access_codes').insertOne(accessCodeObj);
        return accessCodeObj;
      } catch (insertError) {
        if (insertError.code === 11000 && insertAttempts < maxInsertAttempts - 1) {
          // Duplicate key error, try generating a new code
          insertAttempts++;
          
          // Generate a new code
          const buffer = crypto.randomBytes(5);
          code = buffer.toString('base64')
            .replace(/[^A-Z0-9]/g, '')
            .padEnd(8, '0')
            .substring(0, 8);
          
          accessCodeObj.code = code;
          continue;
        }
        // Re-throw if not a duplicate key error or exceeded retry attempts
        throw insertError;
      }
    }
    
    throw new Error('Failed to insert access code after maximum attempts');
  }

  /**
   * Find access code by code string
   * @param {string} code - The access code to find
   * @returns {Object|null} The access code object or null if not found
   */
  static async findByCode(code) {
    // Validate code format
    if (!code || typeof code !== 'string' || !/^[A-Z0-9]{8}$/.test(code)) {
      throw new Error('Invalid access code format');
    }

    const db = dbConnection.getDatabase();
    return await db.collection('access_codes').findOne({ code });
  }

  /**
   * Check if an access code is valid (exists, not used, not expired)
   * @param {string} code - The access code to validate
   * @returns {boolean} True if valid, false otherwise
   */
  static async isValid(code) {
    try {
      const accessCode = await this.findByCode(code);
      
      if (!accessCode) {
        return false;
      }

      // Check if used
      if (accessCode.isUsed) {
        return false;
      }

      // Check if expired
      if (accessCode.expiresAt < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      // Invalid format or other error
      return false;
    }
  }

  /**
   * Mark an access code as used atomically with detailed error information
   * @param {string} code - The access code to mark as used
   * @returns {Object} Result object with success status and error details
   */
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

      // Try to mark as used atomically
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
        // Race condition - code was used by another request
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

  /**
   * Mark an access code as used atomically
   * @param {string} code - The access code to mark as used
   * @returns {boolean} True if successfully marked as used, false otherwise
   */
  static async markAsUsed(code) {
    const db = dbConnection.getDatabase();
    
    // Use atomic update with conditions to prevent race conditions
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

    return result.modifiedCount === 1;
  }

  /**
   * Clean up expired access codes
   * @returns {number} Number of deleted codes
   */
  static async cleanup() {
    const db = dbConnection.getDatabase();
    
    const result = await db.collection('access_codes').deleteMany({
      expiresAt: { $lt: new Date() }
    });

    return result.deletedCount;
  }

  /**
   * Get statistics about access codes
   * @returns {Object} Statistics object
   */
  static async getStats() {
    const db = dbConnection.getDatabase();
    
    const now = new Date();
    
    const [total, used, expired] = await Promise.all([
      db.collection('access_codes').countDocuments({}),
      db.collection('access_codes').countDocuments({ isUsed: true }),
      db.collection('access_codes').countDocuments({ 
        expiresAt: { $lt: now },
        isUsed: false
      }),
    ]);

    return {
      total,
      used,
      unused: total - used - expired,
      expired,
    };
  }
}

module.exports = AccessCode;