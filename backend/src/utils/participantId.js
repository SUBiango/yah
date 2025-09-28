const dbConnection = require('./database');

/**
 * Participant ID Service
 * Generates unique participant IDs in format: KDYES25-{uniqueNumber}
 * Where {uniqueNumber} is between 1-200 and each number is used only once
 */
class ParticipantIdService {
  static PREFIX = 'KDYES25';
  static MIN_NUMBER = 1;
  static MAX_NUMBER = 200;

  /**
   * Generate a unique participant ID
   * @returns {Promise<string>} Generated participant ID (e.g., "KDYES25-42")
   */
  static async generateUniqueId() {
    const db = await dbConnection.getDatabase();
    
    try {
      // Get all used numbers to find available ones
      const usedParticipantIds = await db.collection('registrations').distinct('participantId');
      const usedNumbers = new Set();
      
      // Extract numbers from existing participant IDs
      usedParticipantIds.forEach(id => {
        if (typeof id === 'string' && id.startsWith(this.PREFIX)) {
          const numberPart = id.replace(this.PREFIX, '');
          const number = parseInt(numberPart, 10);
          if (!isNaN(number) && number >= this.MIN_NUMBER && number <= this.MAX_NUMBER) {
            usedNumbers.add(number);
          }
        }
      });

      console.log(`[ParticipantID] Found ${usedNumbers.size} used numbers out of ${this.MAX_NUMBER} available`);

      // Find available numbers
      const availableNumbers = [];
      for (let i = this.MIN_NUMBER; i <= this.MAX_NUMBER; i++) {
        if (!usedNumbers.has(i)) {
          availableNumbers.push(i);
        }
      }

      if (availableNumbers.length === 0) {
        throw new Error(`All participant ID numbers (${this.MIN_NUMBER}-${this.MAX_NUMBER}) have been used. Cannot generate more IDs.`);
      }

      // Select a random available number
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const selectedNumber = availableNumbers[randomIndex];
      const participantId = `${this.PREFIX}${selectedNumber}`;

      console.log(`[ParticipantID] Generated new participant ID: ${participantId} (${availableNumbers.length} numbers still available)`);
      
      return participantId;
      
    } catch (error) {
      console.error('[ParticipantID] Error generating unique participant ID:', error);
      throw new Error(`Failed to generate unique participant ID: ${error.message}`);
    }
  }

  /**
   * Validate participant ID format
   * @param {string} participantId - Participant ID to validate
   * @returns {Object} Validation result
   */
  static validateId(participantId) {
    if (typeof participantId !== 'string') {
      return {
        valid: false,
        error: 'Participant ID must be a string'
      };
    }

    const regex = new RegExp(`^${this.PREFIX}(\\d+)$`);
    const match = participantId.match(regex);

    if (!match) {
      return {
        valid: false,
        error: `Participant ID must be in format ${this.PREFIX}{number}`
      };
    }

    const number = parseInt(match[1], 10);
    
    if (number < this.MIN_NUMBER || number > this.MAX_NUMBER) {
      return {
        valid: false,
        error: `Participant ID number must be between ${this.MIN_NUMBER} and ${this.MAX_NUMBER}`
      };
    }

    return {
      valid: true,
      number: number,
      prefix: this.PREFIX
    };
  }

  /**
   * Extract number from participant ID
   * @param {string} participantId - Participant ID
   * @returns {number|null} Extracted number or null if invalid
   */
  static extractNumber(participantId) {
    const validation = this.validateId(participantId);
    return validation.valid ? validation.number : null;
  }

  /**
   * Check if participant ID is available
   * @param {string} participantId - Participant ID to check
   * @returns {Promise<boolean>} True if available, false if already used
   */
  static async isIdAvailable(participantId) {
    const validation = this.validateId(participantId);
    if (!validation.valid) {
      return false;
    }

    const db = await dbConnection.getDatabase();
    const existing = await db.collection('registrations').findOne({ participantId });
    return !existing;
  }

  /**
   * Get statistics about participant ID usage
   * @returns {Promise<Object>} Usage statistics
   */
  static async getUsageStats() {
    const db = await dbConnection.getDatabase();
    
    try {
      const usedParticipantIds = await db.collection('registrations').distinct('participantId');
      const validIds = usedParticipantIds.filter(id => 
        typeof id === 'string' && this.validateId(id).valid
      );

      const usedNumbers = validIds.map(id => this.extractNumber(id)).sort((a, b) => a - b);
      const totalCapacity = this.MAX_NUMBER - this.MIN_NUMBER + 1;
      const used = validIds.length;
      const available = totalCapacity - used;
      const usagePercentage = Math.round((used / totalCapacity) * 100);

      return {
        totalCapacity,
        used,
        available,
        usagePercentage,
        usedNumbers,
        prefix: this.PREFIX,
        numberRange: `${this.MIN_NUMBER}-${this.MAX_NUMBER}`
      };
    } catch (error) {
      console.error('[ParticipantID] Error getting usage stats:', error);
      throw new Error(`Failed to get participant ID usage stats: ${error.message}`);
    }
  }

  /**
   * Reserve a specific participant ID number (for admin use)
   * @param {number} number - Number to reserve
   * @returns {Promise<string>} Reserved participant ID
   */
  static async reserveSpecificNumber(number) {
    if (number < this.MIN_NUMBER || number > this.MAX_NUMBER) {
      throw new Error(`Number must be between ${this.MIN_NUMBER} and ${this.MAX_NUMBER}`);
    }

    const participantId = `${this.PREFIX}${number}`;
    const isAvailable = await this.isIdAvailable(participantId);
    
    if (!isAvailable) {
      throw new Error(`Participant ID ${participantId} is already in use`);
    }

    return participantId;
  }

  /**
   * Get next available numbers (for admin preview)
   * @param {number} count - Number of next available IDs to return
   * @returns {Promise<Array>} Array of next available participant IDs
   */
  static async getNextAvailableIds(count = 5) {
    const db = await dbConnection.getDatabase();
    
    try {
      const usedParticipantIds = await db.collection('registrations').distinct('participantId');
      const usedNumbers = new Set();
      
      usedParticipantIds.forEach(id => {
        if (typeof id === 'string' && id.startsWith(this.PREFIX)) {
          const number = this.extractNumber(id);
          if (number !== null) {
            usedNumbers.add(number);
          }
        }
      });

      const availableIds = [];
      for (let i = this.MIN_NUMBER; i <= this.MAX_NUMBER && availableIds.length < count; i++) {
        if (!usedNumbers.has(i)) {
          availableIds.push(`${this.PREFIX}${i}`);
        }
      }

      return availableIds;
    } catch (error) {
      console.error('[ParticipantID] Error getting next available IDs:', error);
      throw new Error(`Failed to get next available participant IDs: ${error.message}`);
    }
  }
}

module.exports = {
  ParticipantIdService
};