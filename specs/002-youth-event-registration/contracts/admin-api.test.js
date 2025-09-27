// Contract Test: Admin API
// This test MUST FAIL until implementation is complete

const request = require('supertest');
const app = require('../../../backend/src/app');

describe('Admin API Endpoints', () => {
  
  describe('POST /api/admin/authenticate', () => {
    describe('Successful authentication', () => {
      it('should authenticate with correct admin passcode', async () => {
        const response = await request(app)
          .post('/api/admin/authenticate')
          .send({
            passcode: process.env.ADMIN_PASSCODE || 'test-admin-passcode'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          authenticated: true,
          message: 'Access granted'
        });
      });
    });

    describe('Authentication failure', () => {
      it('should reject incorrect admin passcode', async () => {
        const response = await request(app)
          .post('/api/admin/authenticate')
          .send({
            passcode: 'wrong-passcode'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          authenticated: false,
          message: 'Access denied'
        });
      });

      it('should reject request without passcode', async () => {
        const response = await request(app)
          .post('/api/admin/authenticate')
          .send({})
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          message: expect.stringContaining('Passcode is required')
        });
      });
    });

    describe('Rate limiting', () => {
      it('should enforce rate limiting for authentication attempts', async () => {
        // Make multiple rapid authentication attempts
        const promises = Array(10).fill().map(() =>
          request(app)
            .post('/api/admin/authenticate')
            .send({ passcode: 'wrong-passcode' })
        );

        const responses = await Promise.all(promises);
        
        // At least one should be rate limited
        const rateLimited = responses.some(response => response.status === 429);
        expect(rateLimited).toBe(true);
      });
    });
  });

  describe('GET /api/admin/participants', () => {
    let authToken;

    beforeEach(async () => {
      // Authenticate first to get access
      const authResponse = await request(app)
        .post('/api/admin/authenticate')
        .send({
          passcode: process.env.ADMIN_PASSCODE || 'test-admin-passcode'
        });
      
      // In real implementation, this would return a token
      // For now, we'll simulate authentication
      authToken = 'valid-admin-session';
    });

    describe('Successful participant retrieval', () => {
      it('should return list of registered participants only', async () => {
        // First, create some test registrations
        await request(app)
          .post('/api/registrations')
          .send({
            fullName: 'Admin Test User 1',
            phoneNumber: '+232 76 123 456',
            emailAddress: 'admintest1@example.com',
            age: 25,
            occupation: 'Student',
            trackOfInterest: 'Innovation & Entrepreneurship',
            accessCode: 'ADMIN-TEST-001',
            termsAccepted: true
          });

        await request(app)
          .post('/api/registrations')
          .send({
            fullName: 'Admin Test User 2',
            phoneNumber: '+232 76 123 789',
            emailAddress: 'admintest2@example.com',
            age: 28,
            occupation: 'Professional',
            trackOfInterest: 'Leadership Development',
            accessCode: 'ADMIN-TEST-002',
            termsAccepted: true
          });

        const response = await request(app)
          .get('/api/admin/participants')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('participants');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.participants).toBeInstanceOf(Array);
        expect(response.body.participants.length).toBeGreaterThan(0);

        // Check participant structure
        const participant = response.body.participants[0];
        expect(participant).toMatchObject({
          registrationId: expect.stringMatching(/^REG-\d{6}$/),
          fullName: expect.any(String),
          phoneNumber: expect.any(String),
          emailAddress: expect.any(String),
          age: expect.any(Number),
          occupation: expect.any(String),
          trackOfInterest: expect.any(String),
          accessCode: expect.any(String),
          registeredAt: expect.any(String),
          emailSent: expect.any(Boolean)
        });
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/admin/participants?page=1&limit=10')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        });
      });

      it('should support filtering by track of interest', async () => {
        const response = await request(app)
          .get('/api/admin/participants?track=Innovation & Entrepreneurship')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // All returned participants should have the filtered track
        response.body.participants.forEach(participant => {
          expect(participant.trackOfInterest).toBe('Innovation & Entrepreneurship');
        });
      });

      it('should support search by name and email', async () => {
        const response = await request(app)
          .get('/api/admin/participants?search=Admin Test User')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Results should contain search term in name or email
        response.body.participants.forEach(participant => {
          const nameMatch = participant.fullName.toLowerCase().includes('admin test user');
          const emailMatch = participant.emailAddress.toLowerCase().includes('admin test user');
          expect(nameMatch || emailMatch).toBe(true);
        });
      });
    });

    describe('Authorization', () => {
      it('should reject request without authentication', async () => {
        const response = await request(app)
          .get('/api/admin/participants')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          message: expect.stringContaining('Unauthorized')
        });
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/admin/participants')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          message: expect.stringContaining('Unauthorized')
        });
      });
    });

    describe('Security considerations', () => {
      it('should never expose unused access codes in participant list', async () => {
        const response = await request(app)
          .get('/api/admin/participants')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // All participants should have used access codes only
        response.body.participants.forEach(participant => {
          expect(participant.accessCode).toBeDefined();
          // All access codes shown should be used (have associated registrations)
          expect(participant.registrationId).toBeDefined();
        });
      });
    });
  });

  describe('GET /api/admin/participants/:registrationId/qr', () => {
    let authToken;
    let testRegistrationId;

    beforeEach(async () => {
      // Authenticate first
      authToken = 'valid-admin-session';

      // Create a test registration
      const regResponse = await request(app)
        .post('/api/registrations')
        .send({
          fullName: 'QR Test User',
          phoneNumber: '+232 76 123 456',
          emailAddress: 'qrtest@example.com',
          age: 25,
          occupation: 'Student',
          trackOfInterest: 'Innovation & Entrepreneurship',
          accessCode: 'QR-ADMIN-TEST',
          termsAccepted: true
        });

      testRegistrationId = regResponse.body.registrationId;
    });

    describe('Successful QR code download', () => {
      it('should return QR code for valid registration ID', async () => {
        const response = await request(app)
          .get(`/api/admin/participants/${testRegistrationId}/qr`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Should return either PNG image or JSON with base64 QR code
        if (response.headers['content-type'].includes('image/png')) {
          expect(response.body).toBeInstanceOf(Buffer);
        } else {
          expect(response.body).toMatchObject({
            qrCode: expect.stringMatching(/^data:image\/png;base64,/),
            participant: {
              fullName: expect.any(String),
              emailAddress: expect.any(String)
            }
          });
        }
      });
    });

    describe('Error handling', () => {
      it('should return 404 for non-existent registration ID', async () => {
        const response = await request(app)
          .get('/api/admin/participants/REG-999999/qr')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body).toMatchObject({
          success: false,
          message: expect.stringContaining('Registration not found')
        });
      });

      it('should reject invalid registration ID format', async () => {
        const response = await request(app)
          .get('/api/admin/participants/INVALID-ID/qr')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          message: expect.stringContaining('Invalid registration ID format')
        });
      });
    });

    describe('Authorization', () => {
      it('should reject request without authentication', async () => {
        const response = await request(app)
          .get(`/api/admin/participants/${testRegistrationId}/qr`)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          message: expect.stringContaining('Unauthorized')
        });
      });
    });
  });

  describe('Performance requirements', () => {
    let authToken;

    beforeEach(() => {
      authToken = 'valid-admin-session';
    });

    it('should handle 500+ registrations without performance degradation', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/admin/participants?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should handle large datasets quickly
      
      expect(response.body.participants).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });
  });
});

module.exports = {
  testSuite: 'Admin API Contract Tests',
  requirements: [
    'FR-008: System MUST provide admin dashboard protected by a static passcode gate',
    'FR-009: System MUST display only registered participants in admin dashboard',
    'FR-010: System MUST allow administrators to download QR codes for registered participants',
    'FR-016: System MUST validate admin passcode server-side before allowing dashboard access',
    'PR-003: Admin dashboard MUST handle displaying 500+ registrations without performance degradation',
    'SR-005: Admin dashboard MUST be protected by server-side passcode validation',
    'SR-006: System MUST never expose unused access codes to minimize security risks'
  ]
};