const crypto = require('crypto');
const { ObjectId } = require('mongodb');
const dbConnection = require('../utils/database');
const { config } = require('../utils/config');

class AccessCode {
    /**
   * Generate a new unique access code
   * @param {Object} options - Configuration options
   * @param {number} options.expiryHours - Hours until expiry (default: 72)
   * @param {string} options.eventName - Event name for tracking (optional)
   * @returns {Object} The created access code
   */
  static async generate(options = {}) {
    const { expiryHours = 72, eventName } = options;
    const db = dbConnection.getDatabase();
    
    // Generate cryptographically secure 8-character code
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 8 characters ensuring mix of letters and numbers
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const allChars = letters + numbers;
      
      // Use crypto.randomBytes for cryptographically secure randomness
      const randomBytes = crypto.randomBytes(8);
      const codeArray = new Array(8);
      
      // Generate the code
      for (let i = 0; i < 8; i++) {
        const randomIndex = randomBytes[i] % allChars.length;
        codeArray[i] = allChars[randomIndex];
      }
      
      code = codeArray.join('');
      
      // Ensure we have at least one letter and one number
      const hasLetter = /[A-Z]/.test(code);
      const hasNumber = /[0-9]/.test(code);
      
      if (!hasLetter || !hasNumber) {
        // Force diversity by replacing random positions
        const letterRandomBytes = crypto.randomBytes(1);
        const numberRandomBytes = crypto.randomBytes(1);
        const positionRandomBytes = crypto.randomBytes(2);
        
        if (!hasLetter) {
          // Replace a random position with a letter
          const letterIndex = letterRandomBytes[0] % letters.length;
          const position = positionRandomBytes[0] % 8;
          codeArray[position] = letters[letterIndex];
        }
        
        if (!hasNumber) {
          // Replace a different random position with a number
          const numberIndex = numberRandomBytes[0] % numbers.length;
          let position = positionRandomBytes[1] % 8;
          
          // Ensure we don't overwrite the letter we just added
          if (!hasLetter && position === (positionRandomBytes[0] % 8)) {
            position = (position + 1) % 8;
          }
          
          codeArray[position] = numbers[numberIndex];
        }
        
        code = codeArray.join('');
      }
      
      console.log(`[AccessCode] Generated candidate code: ${code}`);

      // Check if code already exists
      const existing = await db.collection('access_codes').findOne({ code });
      if (!existing) {
        isUnique = true;
        console.log(`[AccessCode] Code ${code} is unique and ready for use`);
      } else {
        console.log(`[AccessCode] Code ${code} already exists, generating another...`);
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique access code after maximum attempts');
    }

    // Validate the generated code meets our security requirements
    if (!AccessCode.validateCodeFormat(code)) {
      throw new Error(`Generated code ${code} does not meet security requirements`);
    }

    console.log(`[AccessCode] Successfully generated secure access code: ${code}`);

    // Create access code object
    const accessCodeObj = {
      code,
      isUsed: false,
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      createdAt: new Date(),
    };
    
    // Add optional event name for tracking
    if (eventName) {
      accessCodeObj.eventName = eventName;
    }

    // Save to database with retry on duplicate key error
    let insertAttempts = 0;
    const maxInsertAttempts = 3;
    
    while (insertAttempts < maxInsertAttempts) {
      try {
        await db.collection('access_codes').insertOne(accessCodeObj);
        return accessCodeObj;
      } catch (insertError) {
        if (insertError.code === 11000 && insertAttempts < maxInsertAttempts - 1) {
          // Duplicate key error, try generating a new code using secure method
          insertAttempts++;
          
          // Generate a new secure code with guaranteed diversity
          const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const numbers = '0123456789';
          const allChars = letters + numbers;
          const codeArray = new Array(8);
          const randomBytes = crypto.randomBytes(8);
          
          // Generate the code
          for (let i = 0; i < 8; i++) {
            const randomIndex = randomBytes[i] % allChars.length;
            codeArray[i] = allChars[randomIndex];
          }
          
          code = codeArray.join('');
          
          // Ensure diversity
          const hasLetter = /[A-Z]/.test(code);
          const hasNumber = /[0-9]/.test(code);
          
          if (!hasLetter || !hasNumber) {
            const letterRandomBytes = crypto.randomBytes(1);
            const numberRandomBytes = crypto.randomBytes(1);
            const positionRandomBytes = crypto.randomBytes(2);
            
            if (!hasLetter) {
              const letterIndex = letterRandomBytes[0] % letters.length;
              const position = positionRandomBytes[0] % 8;
              codeArray[position] = letters[letterIndex];
            }
            
            if (!hasNumber) {
              const numberIndex = numberRandomBytes[0] % numbers.length;
              let position = positionRandomBytes[1] % 8;
              
              if (!hasLetter && position === (positionRandomBytes[0] % 8)) {
                position = (position + 1) % 8;
              }
              
              codeArray[position] = numbers[numberIndex];
            }
            
            code = codeArray.join('');
          }
          
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

  /**
   * Validate access code format for security requirements
   * @param {string} code - The access code to validate
   * @returns {boolean} True if code meets security requirements
   */
  static validateCodeFormat(code) {
    // Must be exactly 8 characters
    if (!code || code.length !== 8) {
      console.warn(`[AccessCode] Invalid length: ${code ? code.length : 'null'} (expected 8)`);
      return false;
    }

    // Must contain only uppercase letters A-Z and digits 0-9
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      console.warn(`[AccessCode] Invalid characters in code: ${code}`);
      return false;
    }

    // Security checks to avoid weak patterns
    
    // 1. Must not be all the same character (e.g., AAAAAAAA, 00000000)
    if (/^(.)\1{7}$/.test(code)) {
      console.warn(`[AccessCode] Code contains all same character: ${code}`);
      return false;
    }

    // 2. Must not be sequential patterns (e.g., 01234567, ABCDEFGH)
    let isSequential = true;
    for (let i = 1; i < code.length; i++) {
      const curr = code.charCodeAt(i);
      const prev = code.charCodeAt(i - 1);
      if (curr !== prev + 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      console.warn(`[AccessCode] Code contains sequential pattern: ${code}`);
      return false;
    }

    // 3. Must not be reverse sequential (e.g., 87654321, ZYXWVUTS)
    let isReverseSequential = true;
    for (let i = 1; i < code.length; i++) {
      const curr = code.charCodeAt(i);
      const prev = code.charCodeAt(i - 1);
      if (curr !== prev - 1) {
        isReverseSequential = false;
        break;
      }
    }
    if (isReverseSequential) {
      console.warn(`[AccessCode] Code contains reverse sequential pattern: ${code}`);
      return false;
    }

    // 4. Should have a good mix of letters and numbers (at least 1 of each)
    const hasLetter = /[A-Z]/.test(code);
    const hasNumber = /[0-9]/.test(code);
    if (!hasLetter || !hasNumber) {
      console.warn(`[AccessCode] Code lacks character diversity (letters: ${hasLetter}, numbers: ${hasNumber}): ${code}`);
      return false;
    }

    // All checks passed
    return true;
  }

  /**
   * Generate multiple secure access codes
   * @param {number} count - Number of codes to generate
   * @param {number} expiryHours - Hours until expiration
   * @returns {Array} Array of generated access code objects
   */
  static async generateBatch(count, expiryHours = null) {
    const codes = [];
    const errors = [];
    
    console.log(`[AccessCode] Generating batch of ${count} secure access codes...`);
    
    for (let i = 0; i < count; i++) {
      try {
        const expiry = expiryHours || config.app.accessCodeExpiryHours;
        const codeObj = await this.generate();
        
        // Override expiry if specified
        if (expiryHours && expiryHours !== config.app.accessCodeExpiryHours) {
          const db = dbConnection.getDatabase();
          await db.collection('access_codes').updateOne(
            { code: codeObj.code },
            { $set: { expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000) } }
          );
          codeObj.expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
        }
        
        codes.push(codeObj);
      } catch (error) {
        console.error(`[AccessCode] Failed to generate code ${i + 1}/${count}:`, error.message);
        errors.push({
          index: i + 1,
          error: error.message
        });
      }
    }
    
    console.log(`[AccessCode] Batch generation complete: ${codes.length}/${count} successful, ${errors.length} failed`);
    
    return {
      codes,
      errors,
      successCount: codes.length,
      totalRequested: count
    };
  }
}

module.exports = AccessCode;