const { EmailService, emailService } = require('../../src/utils/email');
const nodemailer = require('nodemailer');
const { config } = require('../../src/utils/config');

// Mock nodemailer for testing
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockTransporter;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock transporter
    mockTransporter = {
      verify: jest.fn(),
      sendMail: jest.fn(),
    };
    
    nodemailer.createTransport.mockReturnValue(mockTransporter);
    
    // Reset email service state
    emailService.transporter = null;
    emailService.initialized = false;
  });

  describe('initialize', () => {
    it('should initialize email transporter with correct configuration', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      
      await emailService.initialize();
      
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
        tls: {
          rejectUnauthorized: config.email.tls.rejectUnauthorized !== false,
          minVersion: 'TLSv1.2',
        },
      });
      
      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(emailService.initialized).toBe(true);
    });

    it('should handle initialization errors', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('SMTP connection failed'));
      
      await expect(emailService.initialize()).rejects.toThrow('Email service initialization failed');
    });

    it('should skip verification if disabled in config', async () => {
      // Temporarily disable verification
      const originalVerify = config.email.verify;
      config.email.verify = false;
      
      await emailService.initialize();
      
      expect(mockTransporter.verify).not.toHaveBeenCalled();
      expect(emailService.initialized).toBe(true);
      
      // Restore original config
      config.email.verify = originalVerify;
    });
  });

  describe('sendQRCode', () => {
    const mockParticipant = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+23276123456',
      age: 22,
      location: 'Freetown',
      churchAffiliation: 'Grace Baptist Church',
    };

    const mockRegistration = {
      id: '507f1f77bcf86cd799439011',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      createdAt: new Date('2025-01-01'),
      accessCode: 'ABC12345',
    };

    beforeEach(async () => {
      mockTransporter.verify.mockResolvedValue(true);
      await emailService.initialize();
    });

    it('should send QR code email successfully', async () => {
      const mockSendResult = {
        messageId: 'test-message-id',
        accepted: ['john.doe@example.com'],
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockSendResult);
      
      const result = await emailService.sendQRCode(mockParticipant, mockRegistration);
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'Youth Advocacy Hub Sierra Leone',
          address: config.email.from,
        },
        to: {
          name: 'John Doe',
          address: 'john.doe@example.com',
        },
        subject: 'Your Event Registration Confirmation - YAH Sierra Leone',
        text: expect.stringContaining('Dear John Doe'),
        html: expect.stringContaining('Registration Confirmed'),
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: `registration-${mockRegistration.id}.png`,
            content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            encoding: 'base64',
            cid: 'qrcode',
          }),
        ]),
      });
      
      expect(result).toEqual({
        success: true,
        messageId: 'test-message-id',
        recipient: 'john.doe@example.com',
        timestamp: expect.any(Date),
      });
    });

    it('should handle email sending errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP send failed'));
      
      await expect(emailService.sendQRCode(mockParticipant, mockRegistration))
        .rejects.toThrow('QR code email failed');
    });

    it('should initialize if not already initialized', async () => {
      emailService.initialized = false;
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      
      await emailService.sendQRCode(mockParticipant, mockRegistration);
      
      expect(emailService.initialized).toBe(true);
    });

    it('should handle participant without church affiliation', async () => {
      const participantNoChurch = { ...mockParticipant };
      delete participantNoChurch.churchAffiliation;
      
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      
      await emailService.sendQRCode(participantNoChurch, mockRegistration);
      
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.html).not.toContain('Church:');
      expect(sendMailCall.text).not.toContain('Church:');
    });
  });

  describe('sendAdminNotification', () => {
    const mockNotificationData = {
      eventName: 'YAH Youth Summit 2025',
      participant: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+23276123457',
        age: 24,
        gender: 'Female',
        location: 'Bo',
        churchAffiliation: 'Methodist Church',
      },
      registration: {
        id: '507f1f77bcf86cd799439012',
      },
      totalRegistrations: 42,
    };

    beforeEach(async () => {
      mockTransporter.verify.mockResolvedValue(true);
      await emailService.initialize();
    });

    it('should send admin notification email successfully', async () => {
      const mockSendResult = {
        messageId: 'admin-message-id',
        accepted: [config.email.adminEmail],
      };
      
      mockTransporter.sendMail.mockResolvedValue(mockSendResult);
      
      const result = await emailService.sendAdminNotification(mockNotificationData);
      
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'YAH Registration System',
          address: config.email.from,
        },
        to: config.email.adminEmail,
        subject: 'New Registration Alert - YAH Youth Summit 2025',
        text: expect.stringContaining('NEW REGISTRATION ALERT'),
        html: expect.stringContaining('New Registration Alert'),
      });
      
      expect(result).toEqual({
        success: true,
        messageId: 'admin-message-id',
        timestamp: expect.any(Date),
      });
    });

    it('should handle missing event name', async () => {
      const dataNoEvent = { ...mockNotificationData };
      delete dataNoEvent.eventName;
      
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test' });
      
      await emailService.sendAdminNotification(dataNoEvent);
      
      const sendMailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(sendMailCall.subject).toContain('YAH Event');
    });
  });

  describe('generateQREmailHTML', () => {
    const mockParticipant = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+23276123456',
      age: 25,
      location: 'Freetown',
      churchAffiliation: 'Test Church',
    };

    const mockRegistration = {
      id: 'test-registration-id',
      createdAt: new Date('2025-01-01'),
    };

    it('should generate valid HTML email template', () => {
      const html = emailService.generateQREmailHTML(mockParticipant, mockRegistration);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test User');
      expect(html).toContain('test@example.com');
      expect(html).toContain('test-registration-id');
      expect(html).toContain('src="cid:qrcode"');
      expect(html).toContain('Youth Advocacy Hub Sierra Leone');
    });

    it('should handle participant without church affiliation', () => {
      const participantNoChurch = { ...mockParticipant };
      delete participantNoChurch.churchAffiliation;
      
      const html = emailService.generateQREmailHTML(participantNoChurch, mockRegistration);
      
      expect(html).not.toContain('Church:');
    });
  });

  describe('generateQREmailText', () => {
    const mockParticipant = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+23276123456',
      age: 25,
      location: 'Freetown',
    };

    const mockRegistration = {
      id: 'test-registration-id',
      createdAt: new Date('2025-01-01'),
    };

    it('should generate valid plain text email', () => {
      const text = emailService.generateQREmailText(mockParticipant, mockRegistration);
      
      expect(text).toContain('REGISTRATION CONFIRMED');
      expect(text).toContain('Test User');
      expect(text).toContain('test@example.com');
      expect(text).toContain('test-registration-id');
      expect(text).toContain('Youth Advocacy Hub Sierra Leone');
    });
  });

  describe('testConfiguration', () => {
    it('should test email configuration successfully', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      
      const result = await emailService.testConfiguration();
      
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should handle configuration test failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Config test failed'));
      
      const result = await emailService.testConfiguration();
      
      expect(result).toBe(false);
    });
  });

  describe('Email Service Class', () => {
    it('should create new EmailService instances', () => {
      const service1 = new EmailService();
      const service2 = new EmailService();
      
      expect(service1).not.toBe(service2);
      expect(service1.initialized).toBe(false);
      expect(service2.initialized).toBe(false);
    });
  });
});