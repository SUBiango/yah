// Contract Test: Registration API
// This test MUST FAIL until implementation is complete

const request = require('supertest');
const app = require('../../../backend/src/app');

describe('POST /api/registrations', () => {
  describe('Successful registration', () => {
    it('should create registration with valid data and unused access code', async () => {
      const registrationData = {
        fullName: 'Aminata Kamara',
        phoneNumber: '+232 76 123 456',
        emailAddress: 'aminata.kamara@example.com',
        age: 22,
        occupation: 'University Student',
        trackOfInterest: 'Innovation & Entrepreneurship',
        accessCode: 'VALID-CODE-123',
        termsAccepted: true
      };

      const response = await request(app)
        .post('/api/registrations')
        .send(registrationData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        registrationId: expect.stringMatching(/^REG-\d{6}$/),
        qrCode: expect.stringMatching(/^data:image\/png;base64,/),
        message: expect.stringContaining('Registration successful'),
        participant: {
          fullName: 'Aminata Kamara',
          emailAddress: 'aminata.kamara@example.com',
          trackOfInterest: 'Innovation & Entrepreneurship'
        }
      });

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('registrationId');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('participant');
    });

    it('should mark access code as used after successful registration', async () => {
      const accessCode = 'UNIQUE-CODE-456';
      
      // First register with the code
      await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'test@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Leadership Development',
          accessCode: accessCode,
          termsAccepted: true
        })
        .expect(201);

      // Then try to validate the same code - should be invalid
      const validationResponse = await request(app)
        .post('/api/access-codes/validate')
        .send({ accessCode: accessCode })
        .expect(200);

      expect(validationResponse.body).toMatchObject({
        valid: false,
        message: 'This access code has already been used'
      });
    });
  });

  describe('Registration validation', () => {
    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User'
          // Missing other required fields
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Registration failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      });
    });

    it('should reject registration with invalid email format', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'invalid-email',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Networking',
          accessCode: 'VALID-CODE-789',
          termsAccepted: true
        })
        .expect(400);

      expect(response.body.errors).toContainEqual({
        field: 'emailAddress',
        message: 'Please enter a valid email address'
      });
    });

    it('should reject registration with invalid age', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'test@example.com',
          age: 12, // Below minimum age
          occupation: 'Student',
          trackOfInterest: 'Networking',
          accessCode: 'VALID-CODE-789',
          termsAccepted: true
        })
        .expect(400);

      expect(response.body.errors).toContainEqual({
        field: 'age',
        message: 'Age must be between 13 and 100'
      });
    });

    it('should reject registration with invalid track of interest', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'test@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Invalid Track',
          accessCode: 'VALID-CODE-789',
          termsAccepted: true
        })
        .expect(400);

      expect(response.body.errors).toContainEqual({
        field: 'trackOfInterest',
        message: expect.stringContaining('must be one of')
      });
    });

    it('should reject registration without terms acceptance', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'test@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Networking',
          accessCode: 'VALID-CODE-789',
          termsAccepted: false
        })
        .expect(400);

      expect(response.body.errors).toContainEqual({
        field: 'termsAccepted',
        message: 'You must accept the Terms & Conditions and Privacy Policy'
      });
    });
  });

  describe('Access code validation during registration', () => {
    it('should reject registration with already used access code', async () => {
      const usedCode = 'ALREADY-USED-123';
      
      // First use the code
      await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'First User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'first@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Innovation & Entrepreneurship',
          accessCode: usedCode,
          termsAccepted: true
        })
        .expect(201);

      // Try to use the same code again
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Second User',
          phoneNumber: '+232 76 123 789',
          emailAddress: 'second@example.com',
          age: 28,
          occupation: 'Professional',
          trackOfInterest: 'Leadership Development',
          accessCode: usedCode,
          termsAccepted: true
        })
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: 'This access code has already been used'
      });
    });

    it('should reject registration with invalid access code', async () => {
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'test@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Networking',
          accessCode: 'INVALID-CODE',
          termsAccepted: true
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid access code')
      });
    });
  });

  describe('QR code generation', () => {
    it('should generate unique QR codes for each registration', async () => {
      const response1 = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'User One',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'user1@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Innovation & Entrepreneurship',
          accessCode: 'QR-TEST-001',
          termsAccepted: true
        })
        .expect(201);

      const response2 = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'User Two',
          phoneNumber: '+232 76 123 789',
          emailAddress: 'user2@example.com',
          age: 28,
          occupation: 'Professional',
          trackOfInterest: 'Leadership Development',
          accessCode: 'QR-TEST-002',
          termsAccepted: true
        })
        .expect(201);

      expect(response1.body.qrCode).not.toEqual(response2.body.qrCode);
      expect(response1.body.registrationId).not.toEqual(response2.body.registrationId);
    });
  });

  describe('Performance requirements', () => {
    it('should complete registration within 500ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Performance Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'perf@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Innovation & Entrepreneurship',
          accessCode: 'PERF-CODE-123',
          termsAccepted: true
        })
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    it('should generate QR code within 2 seconds', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'QR Speed Test',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'qrspeed@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Innovation & Entrepreneurship',
          accessCode: 'QR-SPEED-123',
          termsAccepted: true
        })
        .expect(201);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000);
      expect(response.body.qrCode).toBeDefined();
    });
  });

  describe('Race condition prevention', () => {
    it('should handle concurrent registration attempts with same access code', async () => {
      const accessCode = 'RACE-TEST-123';
      
      // Start multiple registrations simultaneously
      const promises = Array(3).fill().map((_, index) => 
        request(app)
          .post('/api/registrations')
          .send({
            fullName: `Race User ${index}`,
            phoneNumber: `+232 76 123 ${index}`,
            emailAddress: `race${index}@example.com`,
            age: 25,
            occupation: 'Student',
            trackOfInterest: 'Innovation & Entrepreneurship',
            accessCode: accessCode,
            termsAccepted: true
          })
      );

      const responses = await Promise.allSettled(promises);
      
      // Only one should succeed (201), others should fail (409)
      const successful = responses.filter(r => r.value?.status === 201);
      const failed = responses.filter(r => r.value?.status === 409);
      
      expect(successful.length).toBe(1);
      expect(failed.length).toBe(2);
    });
  });
});

module.exports = {
  testSuite: 'Registration API Contract Tests',
  requirements: [
    'FR-002: System MUST display registration form that cannot be submitted without a valid access code',
    'FR-003: System MUST capture participant information including all required fields',
    'FR-004: System MUST generate unique QR codes for each successful registration',
    'FR-005: System MUST mark access codes as used immediately upon successful registration',
    'FR-012: System MUST validate all form fields including email format and required field completion',
    'PR-001: Registration form submission MUST complete within 500ms under normal load',
    'PR-002: QR code generation MUST complete within 2 seconds of form submission',
    'SR-002: System MUST use atomic database operations to prevent race conditions in code validation'
  ]
};