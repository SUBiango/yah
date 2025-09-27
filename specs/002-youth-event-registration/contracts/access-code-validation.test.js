// Contract Test: Access Code Validation API
// This test MUST FAIL until implementation is complete

const request = require('supertest');
const app = require('../../../backend/src/app');

describe('POST /api/access-codes/validate', () => {
  describe('Valid access code validation', () => {
    it('should return valid true for unused access code', async () => {
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'X9F4-AB72-QJ3L'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        message: 'Access code is valid'
      });
      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('message');
    });

    it('should return valid false for already used access code', async () => {
      // First, use the access code by registering
      await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'test@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Innovation & Entrepreneurship',
          accessCode: 'USED-CODE-123',
          termsAccepted: true
        });

      // Then try to validate the same code
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'USED-CODE-123'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        valid: false,
        message: 'This access code has already been used'
      });
    });

    it('should return valid false for non-existent access code', async () => {
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'INVALID-CODE'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        valid: false,
        message: 'Invalid access code'
      });
    });
  });

  describe('Request validation', () => {
    it('should reject request without access code', async () => {
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Access code is required')
      });
    });

    it('should reject access code with invalid format', async () => {
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'invalid-format!'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid access code format')
      });
    });

    it('should reject access code that is too short', async () => {
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'SHORT'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Access code must be 8-12 characters')
      });
    });

    it('should reject access code that is too long', async () => {
      const response = await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'VERY-LONG-ACCESS-CODE-123'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Access code must be 8-12 characters')
      });
    });
  });

  describe('Rate limiting', () => {
    it('should enforce rate limiting for validation attempts', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/access-codes/validate')
          .send({ accessCode: 'TEST-CODE-123' })
      );

      const responses = await Promise.all(promises);
      
      // At least one should be rate limited
      const rateLimited = responses.some(response => response.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Security considerations', () => {
    it('should not reveal whether code exists in error messages', async () => {
      const response1 = await request(app)
        .post('/api/access-codes/validate')
        .send({ accessCode: 'NONEXIST-123' })
        .expect(200);

      const response2 = await request(app)
        .post('/api/access-codes/validate')
        .send({ accessCode: 'INVALID-456' })
        .expect(200);

      // Both should return the same generic message
      expect(response1.body.message).toBe('Invalid access code');
      expect(response2.body.message).toBe('Invalid access code');
    });
  });

  describe('Performance requirements', () => {
    it('should respond within 500ms for access code validation', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/access-codes/validate')
        .send({
          accessCode: 'PERF-TEST-123'
        })
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });
});

module.exports = {
  testSuite: 'Access Code Validation API Contract Tests',
  requirements: [
    'FR-001: System MUST validate access codes and only accept unused, valid codes',
    'FR-011: System MUST prevent registration with invalid, used, or non-existent access codes',
    'PR-001: Registration form submission MUST complete within 500ms under normal load',
    'SR-002: System MUST use atomic database operations to prevent race conditions',
    'UX-002: Error messages MUST be user-friendly and actionable, not technical'
  ]
};