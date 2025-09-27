const request = require('supertest');
const app = require('../../src/app');
const dbConnection = require('../../src/utils/database');

describe('Admin Routes', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0); // Use random port for testing
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    const db = dbConnection.getDatabase();
    await db.collection('access_codes').deleteMany({});
    await db.collection('participants').deleteMany({});
    await db.collection('registrations').deleteMany({});
  });

  describe('POST /api/admin/access-codes', () => {
    it('should generate single access code', async () => {
      const response = await request(app)
        .post('/api/admin/access-codes')
        .send({ count: 1 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.codes).toHaveLength(1);
      expect(response.body.data.codes[0]).toMatch(/^[A-Z0-9]{8}$/);
      expect(response.body.data.generated).toBe(1);
    });

    it('should generate multiple access codes', async () => {
      const response = await request(app)
        .post('/api/admin/access-codes')
        .send({ count: 5 })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.codes).toHaveLength(5);
      expect(response.body.data.generated).toBe(5);
      
      // Check all codes are unique
      const codes = response.body.data.codes;
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(5);
      
      // Check all codes have correct format
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });

    it('should validate count parameter', async () => {
      const invalidCounts = [0, -1, 101, 'invalid'];

      for (const count of invalidCounts) {
        const response = await request(app)
          .post('/api/admin/access-codes')
          .send({ count })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/Count must be between 1 and 100/);
      }
    });

    it('should default to 1 if count not provided', async () => {
      const response = await request(app)
        .post('/api/admin/access-codes')
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.codes).toHaveLength(1);
      expect(response.body.data.generated).toBe(1);
    });

    it('should store generated codes in database', async () => {
      const response = await request(app)
        .post('/api/admin/access-codes')
        .send({ count: 3 })
        .expect(201);

      const codes = response.body.data.codes;
      const db = dbConnection.getDatabase();
      
      for (const code of codes) {
        const savedCode = await db.collection('access_codes').findOne({ code });
        expect(savedCode).toBeDefined();
        expect(savedCode.isUsed).toBe(false);
        expect(savedCode.expiresAt).toBeInstanceOf(Date);
        expect(savedCode.createdAt).toBeInstanceOf(Date);
      }
    });

    it('should generate codes within performance requirement', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/admin/access-codes')
        .send({ count: 50 })
        .expect(201);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should be fast even for bulk generation
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('GET /api/admin/registrations', () => {
    beforeEach(async () => {
      // Create test data
      const db = dbConnection.getDatabase();
      
      // Create participants
      const participants = await db.collection('participants').insertMany([
        {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          phone: '+23276111111',
          age: 19,
          gender: 'Female',
          location: 'Freetown',
          churchAffiliation: 'Presbyterian Church',
          createdAt: new Date(),
        },
        {
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          phone: '+23276222222',
          age: 24,
          gender: 'Male',
          location: 'Bo',
          churchAffiliation: 'Anglican Church',
          createdAt: new Date(),
        },
      ]);

      // Create access codes and registrations
      await db.collection('access_codes').insertMany([
        {
          code: 'ADMIN001',
          isUsed: true,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          code: 'ADMIN002',
          isUsed: true,
          usedAt: new Date(),
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]);

      await db.collection('registrations').insertMany([
        {
          accessCode: 'ADMIN001',
          participantId: participants.insertedIds[0],
          status: 'confirmed',
          qrCode: 'data:image/png;base64,mock-qr-code-1',
          createdAt: new Date(),
        },
        {
          accessCode: 'ADMIN002',
          participantId: participants.insertedIds[1],
          status: 'confirmed',
          qrCode: 'data:image/png;base64,mock-qr-code-2',
          createdAt: new Date(),
        },
      ]);
    });

    it('should return all registrations with participant details', async () => {
      const response = await request(app)
        .get('/api/admin/registrations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registrations).toHaveLength(2);
      expect(response.body.data.total).toBe(2);

      // Check participant details are included
      const registrations = response.body.data.registrations;
      registrations.forEach(reg => {
        expect(reg.participant).toBeDefined();
        expect(reg.participant.firstName).toBeDefined();
        expect(reg.participant.lastName).toBeDefined();
        expect(reg.participant.email).toBeDefined();
        expect(reg.participant.phone).toBeDefined();
        expect(reg.accessCode).toBeDefined();
        expect(reg.status).toBe('confirmed');
        expect(reg.createdAt).toBeDefined();
      });
    });

    it('should return empty array when no registrations exist', async () => {
      // Clear test data
      const db = dbConnection.getDatabase();
      await db.collection('registrations').deleteMany({});
      await db.collection('participants').deleteMany({});

      const response = await request(app)
        .get('/api/admin/registrations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registrations).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should support pagination with limit parameter', async () => {
      const response = await request(app)
        .get('/api/admin/registrations?limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registrations).toHaveLength(1);
      expect(response.body.data.total).toBe(2); // Total count should still be accurate
    });

    it('should support pagination with skip parameter', async () => {
      const response = await request(app)
        .get('/api/admin/registrations?skip=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registrations).toHaveLength(1);
      expect(response.body.data.total).toBe(2);
    });

    it('should validate pagination parameters', async () => {
      const invalidParams = [
        { limit: -1 },
        { limit: 1001 },
        { skip: -1 },
        { limit: 'invalid' },
        { skip: 'invalid' },
      ];

      for (const params of invalidParams) {
        const queryString = new URLSearchParams(params).toString();
        const response = await request(app)
          .get(`/api/admin/registrations?${queryString}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toMatch(/(Invalid|must be|between)/);
      }
    });

    it('should sort registrations by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/admin/registrations')
        .expect(200);

      const registrations = response.body.data.registrations;
      if (registrations.length > 1) {
        const dates = registrations.map(reg => new Date(reg.createdAt));
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i-1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
        }
      }
    });

    it('should respond within performance requirement for large datasets', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/admin/registrations')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Constitutional requirement: Support 1000+ registrations
      expect(responseTime).toBeLessThan(2000);
    });
  });

  describe('GET /api/admin/stats', () => {
    beforeEach(async () => {
      const db = dbConnection.getDatabase();
      
      // Create test statistics data
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Insert access codes with different states and dates
      await db.collection('access_codes').insertMany([
        // Used codes
        { code: 'USED0001', isUsed: true, usedAt: now, expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), createdAt: now },
        { code: 'USED0002', isUsed: true, usedAt: oneDayAgo, expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), createdAt: oneDayAgo },
        // Unused codes
        { code: 'UNUSED01', isUsed: false, expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), createdAt: now },
        { code: 'UNUSED02', isUsed: false, expiresAt: new Date(now.getTime() + 72 * 60 * 60 * 1000), createdAt: oneDayAgo },
        // Expired codes
        { code: 'EXPIRED1', isUsed: false, expiresAt: oneWeekAgo, createdAt: oneWeekAgo },
      ]);

      // Insert participants and registrations
      const participants = await db.collection('participants').insertMany([
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+23276111111', age: 22, gender: 'Male', location: 'Freetown', churchAffiliation: 'Baptist Church', createdAt: now },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '+23276222222', age: 25, gender: 'Female', location: 'Bo', churchAffiliation: 'Methodist Church', createdAt: oneDayAgo },
      ]);

      await db.collection('registrations').insertMany([
        { accessCode: 'USED0001', participantId: participants.insertedIds[0], status: 'confirmed', qrCode: 'mock-qr-1', createdAt: now },
        { accessCode: 'USED0002', participantId: participants.insertedIds[1], status: 'confirmed', qrCode: 'mock-qr-2', createdAt: oneDayAgo },
      ]);
    });

    it('should return comprehensive statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const stats = response.body.data;
      expect(stats.totalRegistrations).toBe(2);
      expect(stats.accessCodes.total).toBe(5);
      expect(stats.accessCodes.used).toBe(2);
      expect(stats.accessCodes.unused).toBe(2);
      expect(stats.accessCodes.expired).toBe(1);
    });

    it('should include demographic breakdowns', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      const demographics = response.body.data.demographics;
      expect(demographics).toBeDefined();
      expect(demographics.gender).toBeDefined();
      expect(demographics.location).toBeDefined();
      expect(demographics.ageGroups).toBeDefined();
    });

    it('should include recent activity data', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      const recentActivity = response.body.data.recentActivity;
      expect(recentActivity).toBeDefined();
      expect(recentActivity.registrationsToday).toBeDefined();
      expect(recentActivity.registrationsThisWeek).toBeDefined();
      expect(recentActivity.registrationsThisMonth).toBeDefined();
    });

    it('should calculate statistics accurately', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      const stats = response.body.data;
      
      // Verify totals add up correctly
      expect(stats.accessCodes.used + stats.accessCodes.unused + stats.accessCodes.expired)
        .toBe(stats.accessCodes.total);
      
      // Verify demographic counts
      expect(stats.demographics.gender.Male).toBe(1);
      expect(stats.demographics.gender.Female).toBe(1);
    });

    it('should return zero stats when no data exists', async () => {
      // Clear all test data
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').deleteMany({});
      await db.collection('participants').deleteMany({});
      await db.collection('registrations').deleteMany({});

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      const stats = response.body.data;
      expect(stats.totalRegistrations).toBe(0);
      expect(stats.accessCodes.total).toBe(0);
      expect(stats.accessCodes.used).toBe(0);
      expect(stats.accessCodes.unused).toBe(0);
      expect(stats.accessCodes.expired).toBe(0);
    });

    it('should respond within performance requirement', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/admin/stats')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Statistics calculation should be fast
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('DELETE /api/admin/cleanup', () => {
    beforeEach(async () => {
      const db = dbConnection.getDatabase();
      
      // Create expired and valid codes
      const expiredDate = new Date(Date.now() - 1000);
      const validDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await db.collection('access_codes').insertMany([
        { code: 'CLEANUP1', isUsed: false, expiresAt: expiredDate, createdAt: new Date() },
        { code: 'CLEANUP2', isUsed: false, expiresAt: expiredDate, createdAt: new Date() },
        { code: 'CLEANUP3', isUsed: true, usedAt: new Date(), expiresAt: expiredDate, createdAt: new Date() },
        { code: 'VALID001', isUsed: false, expiresAt: validDate, createdAt: new Date() },
      ]);
    });

    it('should remove expired access codes', async () => {
      const response = await request(app)
        .delete('/api/admin/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(3); // All expired codes (used and unused)

      // Verify expired codes are removed
      const db = dbConnection.getDatabase();
      const remainingCodes = await db.collection('access_codes').find({}).toArray();
      expect(remainingCodes).toHaveLength(1);
      expect(remainingCodes[0].code).toBe('VALID001');
    });

    it('should return zero when no expired codes exist', async () => {
      // Remove all expired codes first
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').deleteMany({ 
        expiresAt: { $lt: new Date() }
      });

      const response = await request(app)
        .delete('/api/admin/cleanup')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(0);
    });

    it('should respond within performance requirement', async () => {
      const startTime = Date.now();
      
      await request(app)
        .delete('/api/admin/cleanup')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Cleanup operation should be fast
      expect(responseTime).toBeLessThan(500);
    });
  });
});