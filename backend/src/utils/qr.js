const QRCode = require('qrcode');
const { config } = require('./config');

/**
 * QR Code generation service
 * Constitutional requirement: <2s QR generation
 */
class QRService {
  /**
   * Generate QR code for registration
   * @param {Object} participant - Participant data
   * @param {Object} registration - Registration data
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateRegistrationQR(participant, registration) {
    const startTime = Date.now();
    
    try {
      // Create QR data payload with registration ID for scanning
      // Use simple format that scanner can easily parse
      const qrData = {
        registrationId: registration._id || registration.id,
        type: 'YAH_REGISTRATION',
        participant: {
          name: `${participant.firstName} ${participant.lastName}`,
          email: participant.email
        },
        event: 'YAH-Summit-2025',
        issued: new Date().toISOString()
      };

      // Generate QR code as base64 data URL
      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M', // Medium error correction for reliability
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#2c5aa0', // YAH brand color
          light: '#ffffff'
        },
        width: config.app.qrCodeSize || 400, // Use config size
      });

      const generationTime = Date.now() - startTime;
      
      // Constitutional requirement: <2s QR generation
      if (generationTime > 2000) {
        console.warn(`QR generation exceeded 2s limit: ${generationTime}ms`);
      }

      console.log(`QR code generated successfully in ${generationTime}ms for registration: ${registration._id || registration.id}`);
      
      return qrCodeDataUrl;
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.error(`QR generation failed after ${errorTime}ms:`, error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code for access code verification
   * @param {string} accessCode - Access code to encode
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateAccessCodeQR(accessCode) {
    const startTime = Date.now();
    
    try {
      // Create verification URL QR code
      const verificationUrl = `${config.app.baseUrl}/verify/${accessCode}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H', // High error correction for access codes
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        width: 200, // Smaller for access codes
      });

      const generationTime = Date.now() - startTime;
      console.log(`Access code QR generated in ${generationTime}ms`);
      
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Access code QR generation failed:', error);
      throw new Error(`Access code QR generation failed: ${error.message}`);
    }
  }

  /**
   * Generate event information QR code
   * @param {Object} eventInfo - Event information
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateEventQR(eventInfo) {
    const startTime = Date.now();
    
    try {
      // Create event info payload
      const eventData = {
        name: eventInfo.name,
        date: eventInfo.date,
        location: eventInfo.location,
        organizer: 'Youth Advocacy Hub Sierra Leone',
        website: config.app.baseUrl,
        contact: config.email.supportEmail,
      };

      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(eventData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#d4951a', // YAH secondary color for events
          light: '#ffffff'
        },
        width: 250,
      });

      const generationTime = Date.now() - startTime;
      console.log(`Event QR generated in ${generationTime}ms`);
      
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Event QR generation failed:', error);
      throw new Error(`Event QR generation failed: ${error.message}`);
    }
  }

  /**
   * Generate batch QR codes for multiple items
   * @param {Array} items - Array of items to generate QR codes for
   * @param {string} type - Type of QR code ('registration', 'accessCode', 'event')
   * @returns {Promise<Array>} Array of QR code results
   */
  static async generateBatch(items, type = 'registration') {
    const startTime = Date.now();
    const results = [];
    
    try {
      console.log(`Starting batch QR generation for ${items.length} items of type: ${type}`);
      
      // Process items in parallel for better performance
      const promises = items.map(async (item, index) => {
        try {
          let qrCode;
          
          switch (type) {
            case 'registration':
              qrCode = await this.generateRegistrationQR(item.participant, item.registration);
              break;
            case 'accessCode':
              qrCode = await this.generateAccessCodeQR(item.accessCode);
              break;
            case 'event':
              qrCode = await this.generateEventQR(item.eventInfo);
              break;
            default:
              throw new Error(`Unknown QR type: ${type}`);
          }
          
          return {
            index,
            success: true,
            qrCode,
            item: item,
          };
        } catch (error) {
          console.error(`Failed to generate QR for item ${index}:`, error);
          return {
            index,
            success: false,
            error: error.message,
            item: item,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      
      // Sort by original index to maintain order
      const sortedResults = batchResults.sort((a, b) => a.index - b.index);
      
      const totalTime = Date.now() - startTime;
      const successful = sortedResults.filter(r => r.success).length;
      const failed = sortedResults.filter(r => !r.success).length;
      
      console.log(`Batch QR generation completed in ${totalTime}ms: ${successful} successful, ${failed} failed`);
      
      return {
        totalTime,
        successful,
        failed,
        results: sortedResults,
      };
    } catch (error) {
      console.error('Batch QR generation failed:', error);
      throw new Error(`Batch QR generation failed: ${error.message}`);
    }
  }

  /**
   * Validate and parse QR code data
   * @param {string} qrData - QR code data to validate
   * @returns {Object} Parsed and validated QR data
   */
  static validateQRData(qrData) {
    try {
      // Try to parse as JSON first (for our generated QR codes)
      const parsed = JSON.parse(qrData);
      
      // Validate YAH registration QR format
      if (parsed.type === 'YAH_REGISTRATION' && parsed.registrationId) {
        return {
          valid: true,
          type: 'registration',
          data: parsed,
          registrationId: parsed.registrationId
        };
      }
      
      // Validate legacy format for backward compatibility
      if (parsed.id && parsed.name && parsed.email) {
        return {
          valid: true,
          type: 'registration',
          data: parsed,
          registrationId: parsed.id
        };
      }
      
      // Validate for event QR
      if (parsed.name && parsed.date && parsed.location) {
        return {
          valid: true,
          type: 'event',
          data: parsed,
        };
      }
      
      return {
        valid: false,
        error: 'Invalid QR data format',
      };
    } catch (jsonError) {
      // If not JSON, try as URL (for access code QR)
      if (qrData.includes('/verify/')) {
        const accessCode = qrData.split('/verify/')[1];
        if (accessCode && accessCode.length === 8) {
          return {
            valid: true,
            type: 'accessCode',
            data: { accessCode },
          };
        }
      }
      
      // Try as simple registration ID (24-character hex string)
      if (qrData.match(/^[0-9a-fA-F]{24}$/)) {
        return {
          valid: true,
          type: 'registration',
          data: { registrationId: qrData },
          registrationId: qrData
        };
      }
      
      return {
        valid: false,
        error: 'Unable to parse QR code data',
      };
    }
  }

  /**
   * Generate QR code options for different use cases
   * @param {string} purpose - Purpose of QR code ('ticket', 'verification', 'info')
   * @returns {Object} QR code generation options
   */
  static getQROptions(purpose) {
    const baseOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 2,
    };

    switch (purpose) {
      case 'ticket':
        return {
          ...baseOptions,
          width: 300,
          color: {
            dark: '#2c5aa0',
            light: '#ffffff'
          }
        };
      
      case 'verification':
        return {
          ...baseOptions,
          errorCorrectionLevel: 'H',
          width: 200,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        };
      
      case 'info':
        return {
          ...baseOptions,
          width: 250,
          color: {
            dark: '#d4951a',
            light: '#ffffff'
          }
        };
      
      default:
        return baseOptions;
    }
  }

  /**
   * Convert data URL to buffer
   * @param {string} dataUrl - Data URL to convert
   * @returns {Buffer} Image buffer
   */
  static dataUrlToBuffer(dataUrl) {
    const base64Data = dataUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Get QR code statistics
   * @param {string} qrCode - QR code data URL
   * @returns {Object} QR code statistics
   */
  static getQRStats(qrCode) {
    try {
      const buffer = this.dataUrlToBuffer(qrCode);
      return {
        size: buffer.length,
        sizeKB: Math.round(buffer.length / 1024 * 100) / 100,
        format: 'PNG',
        encoding: 'base64',
      };
    } catch (error) {
      return {
        error: 'Unable to analyze QR code',
      };
    }
  }
}

module.exports = {
  QRService,
};