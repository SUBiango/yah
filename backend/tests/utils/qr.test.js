const { QRService } = require('../../src/utils/qr');
const QRCode = require('qrcode');
const { config } = require('../../src/utils/config');

// Mock QRCode library for testing
jest.mock('qrcode');

describe('QR Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRegistrationQR', () => {
    const mockParticipant = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+23276123456',
    };

    const mockRegistration = {
      id: '507f1f77bcf86cd799439011',
      accessCode: 'ABC12345',
      createdAt: new Date('2025-01-01'),
    };

    it('should generate QR code for registration successfully', async () => {
      const mockDataUrl = 'data:image/png;base64,mockQRCode';
      QRCode.toDataURL.mockResolvedValue(mockDataUrl);
      
      const result = await QRService.generateRegistrationQR(mockParticipant, mockRegistration);
      
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('"id":"507f1f77bcf86cd799439011"'),
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 2,
          color: {
            dark: '#2c5aa0',
            light: '#ffffff'
          },
          width: 300,
        })
      );
      
      expect(result).toBe(mockDataUrl);
    });

    it('should include all required data in QR code payload', async () => {
      const mockDataUrl = 'data:image/png;base64,mockQRCode';
      QRCode.toDataURL.mockResolvedValue(mockDataUrl);
      
      await QRService.generateRegistrationQR(mockParticipant, mockRegistration);
      
      const qrDataString = QRCode.toDataURL.mock.calls[0][0];
      const qrData = JSON.parse(qrDataString);
      
      expect(qrData).toMatchObject({
        id: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+23276123456',
        event: 'YAH-Event-2025',
        timestamp: mockRegistration.createdAt.toISOString(),
        verify: `${config.app.baseUrl}/verify/ABC12345`,
      });
    });

    it('should warn if generation exceeds 2 second limit', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock slow QR generation
      QRCode.toDataURL.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('data:image/png;base64,slow'), 2100))
      );
      
      await QRService.generateRegistrationQR(mockParticipant, mockRegistration);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('QR generation exceeded 2s limit')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle QR generation errors', async () => {
      QRCode.toDataURL.mockRejectedValue(new Error('QR generation failed'));
      
      await expect(
        QRService.generateRegistrationQR(mockParticipant, mockRegistration)
      ).rejects.toThrow('QR code generation failed');
    });
  });

  describe('generateAccessCodeQR', () => {
    it('should generate QR code for access code successfully', async () => {
      const mockDataUrl = 'data:image/png;base64,accessCodeQR';
      QRCode.toDataURL.mockResolvedValue(mockDataUrl);
      
      const result = await QRService.generateAccessCodeQR('ABC12345');
      
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        `${config.app.baseUrl}/verify/ABC12345`,
        expect.objectContaining({
          errorCorrectionLevel: 'H',
          width: 200,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
        })
      );
      
      expect(result).toBe(mockDataUrl);
    });

    it('should handle access code QR generation errors', async () => {
      QRCode.toDataURL.mockRejectedValue(new Error('Access QR failed'));
      
      await expect(
        QRService.generateAccessCodeQR('ABC12345')
      ).rejects.toThrow('Access code QR generation failed');
    });
  });

  describe('generateEventQR', () => {
    const mockEventInfo = {
      name: 'YAH Youth Summit 2025',
      date: '2025-03-15',
      location: 'Freetown, Sierra Leone',
    };

    it('should generate QR code for event info successfully', async () => {
      const mockDataUrl = 'data:image/png;base64,eventQR';
      QRCode.toDataURL.mockResolvedValue(mockDataUrl);
      
      const result = await QRService.generateEventQR(mockEventInfo);
      
      const qrDataString = QRCode.toDataURL.mock.calls[0][0];
      const qrData = JSON.parse(qrDataString);
      
      expect(qrData).toMatchObject({
        name: 'YAH Youth Summit 2025',
        date: '2025-03-15',
        location: 'Freetown, Sierra Leone',
        organizer: 'Youth Advocacy Hub Sierra Leone',
      });
      
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          color: {
            dark: '#d4951a',
            light: '#ffffff'
          },
          width: 250,
        })
      );
      
      expect(result).toBe(mockDataUrl);
    });
  });

  describe('generateBatch', () => {
    const mockItems = [
      {
        participant: { firstName: 'John', lastName: 'Doe' },
        registration: { id: '1', accessCode: 'ABC12345', createdAt: new Date() }
      },
      {
        participant: { firstName: 'Jane', lastName: 'Smith' },
        registration: { id: '2', accessCode: 'XYZ67890', createdAt: new Date() }
      }
    ];

    it('should generate batch QR codes successfully', async () => {
      QRCode.toDataURL
        .mockResolvedValueOnce('data:image/png;base64,qr1')
        .mockResolvedValueOnce('data:image/png;base64,qr2');
      
      const result = await QRService.generateBatch(mockItems, 'registration');
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(true);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    it('should handle partial failures in batch generation', async () => {
      QRCode.toDataURL
        .mockResolvedValueOnce('data:image/png;base64,qr1')
        .mockRejectedValueOnce(new Error('QR generation failed'));
      
      const result = await QRService.generateBatch(mockItems, 'registration');
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('QR code generation failed: QR generation failed');
    });

    it('should handle unknown QR type', async () => {
      const result = await QRService.generateBatch(mockItems, 'unknown');
      
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Unknown QR type: unknown');
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Unknown QR type: unknown');
    });

    it('should maintain order in batch results', async () => {
      QRCode.toDataURL
        .mockResolvedValueOnce('data:image/png;base64,qr1')
        .mockResolvedValueOnce('data:image/png;base64,qr2');
      
      const result = await QRService.generateBatch(mockItems, 'registration');
      
      expect(result.results[0].index).toBe(0);
      expect(result.results[1].index).toBe(1);
      expect(result.results[0].item).toBe(mockItems[0]);
      expect(result.results[1].item).toBe(mockItems[1]);
    });
  });

  describe('validateQRData', () => {
    it('should validate registration QR data', () => {
      const registrationData = JSON.stringify({
        id: '507f1f77bcf86cd799439011',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+23276123456',
      });
      
      const result = QRService.validateQRData(registrationData);
      
      expect(result).toEqual({
        valid: true,
        type: 'registration',
        data: expect.objectContaining({
          id: '507f1f77bcf86cd799439011',
          name: 'John Doe',
          email: 'john.doe@example.com',
        }),
      });
    });

    it('should validate event QR data', () => {
      const eventData = JSON.stringify({
        name: 'YAH Summit',
        date: '2025-03-15',
        location: 'Freetown',
      });
      
      const result = QRService.validateQRData(eventData);
      
      expect(result).toEqual({
        valid: true,
        type: 'event',
        data: expect.objectContaining({
          name: 'YAH Summit',
          date: '2025-03-15',
          location: 'Freetown',
        }),
      });
    });

    it('should validate access code URL', () => {
      const accessCodeUrl = 'http://localhost:3000/verify/ABC12345';
      
      const result = QRService.validateQRData(accessCodeUrl);
      
      expect(result).toEqual({
        valid: true,
        type: 'accessCode',
        data: { accessCode: 'ABC12345' },
      });
    });

    it('should reject invalid QR data', () => {
      const invalidData = JSON.stringify({ invalid: 'data' });
      
      const result = QRService.validateQRData(invalidData);
      
      expect(result).toEqual({
        valid: false,
        error: 'Invalid QR data format',
      });
    });

    it('should handle non-JSON data', () => {
      const nonJsonData = 'not-json-data';
      
      const result = QRService.validateQRData(nonJsonData);
      
      expect(result).toEqual({
        valid: false,
        error: 'Unable to parse QR code data',
      });
    });

    it('should reject invalid access code URL', () => {
      const invalidUrl = 'http://localhost:3000/verify/INVALID';
      
      const result = QRService.validateQRData(invalidUrl);
      
      expect(result).toEqual({
        valid: false,
        error: 'Unable to parse QR code data',
      });
    });
  });

  describe('getQROptions', () => {
    it('should return ticket options', () => {
      const options = QRService.getQROptions('ticket');
      
      expect(options).toMatchObject({
        width: 300,
        color: {
          dark: '#2c5aa0',
          light: '#ffffff'
        }
      });
    });

    it('should return verification options', () => {
      const options = QRService.getQROptions('verification');
      
      expect(options).toMatchObject({
        errorCorrectionLevel: 'H',
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    });

    it('should return info options', () => {
      const options = QRService.getQROptions('info');
      
      expect(options).toMatchObject({
        width: 250,
        color: {
          dark: '#d4951a',
          light: '#ffffff'
        }
      });
    });

    it('should return base options for unknown purpose', () => {
      const options = QRService.getQROptions('unknown');
      
      expect(options).toMatchObject({
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
      });
    });
  });

  describe('dataUrlToBuffer', () => {
    it('should convert data URL to buffer', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const buffer = QRService.dataUrlToBuffer(dataUrl);
      
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('getQRStats', () => {
    it('should return QR code statistics', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const stats = QRService.getQRStats(dataUrl);
      
      expect(stats).toMatchObject({
        size: expect.any(Number),
        sizeKB: expect.any(Number),
        format: 'PNG',
        encoding: 'base64',
      });
    });

    it('should handle invalid QR code data', () => {
      const invalidData = 'invalid-qr-data';
      
      const stats = QRService.getQRStats(invalidData);
      
      expect(stats).toEqual({
        error: 'Unable to analyze QR code',
      });
    });
  });
});