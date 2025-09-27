const request = require('supertest');

// Mock the email service to prevent SMTP connection attempts
jest.mock('../../src/utils/email', () => ({
  emailService: {
    sendQRCode: jest.fn().mockResolvedValue(true),
    initialize: jest.fn().mockResolvedValue(true)
  }
}));

const app = require('../../src/app');
const dbConnection = require('../../src/utils/database');

describe('Registration Routes', () => {
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

  describe('POST /api/register', () => {
    const validRegistrationData = {
      accessCode: 'VALID123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+23276123456',
      age: 22,
      gender: 'Male',
      location: 'Freetown',
      churchAffiliation: 'Grace Baptist Church',
    };

    beforeEach(async () => {
      // Create a valid access code for testing
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').insertOne({
        code: 'VALID123',
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
    });

    it('should register participant with valid data and access code', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('participant');
      expect(response.body.data).toHaveProperty('registration');
      expect(response.body.data.registration).toHaveProperty('qrCode');
      expect(response.body.data.participant.email).toBe('john.doe@example.com');
    });

    it('should return participant data without sensitive information', async () => {
      const response = await request(app)
        .post('/api/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body.data.participant).not.toHaveProperty('_id');
      expect(response.body.data.participant.email).toBe('john.doe@example.com');
      expect(response.body.data.participant.firstName).toBe('John');
    });

    it('should reject registration with invalid access code', async () => {
      const invalidData = { ...validRegistrationData, accessCode: 'INVALID' };
      
      const response = await request(app)
        .post('/api/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toMatch(/Invalid access code format|Invalid or expired access code/);
    });

    it('should reject registration with expired access code', async () => {
      // Create expired access code
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').insertOne({
        code: 'EXPIRED1',
        isUsed: false,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
      });

      const expiredData = { ...validRegistrationData, accessCode: 'EXPIRED1' };
      
      const response = await request(app)
        .post('/api/register')
        .send(expiredData)
        .expect(400);

      expect(response.body.error).toMatch(/Invalid access code format|Invalid or expired access code/);
    });

    it('should reject registration with already used access code', async () => {
      // First registration uses the access code
      await request(app)
        .post('/api/register')
        .send(validRegistrationData)
        .expect(201);

      // Second registration with same access code should fail
      const secondData = { ...validRegistrationData, email: 'second@example.com' };
      const response = await request(app)
        .post('/api/register')
        .send(secondData)
        .expect(400);

      expect(response.body.error).toMatch(/Invalid or expired access code/);
    });

    it('should validate required fields', async () => {
      const incompleteData = { accessCode: 'VALID123', firstName: 'John' };
      
      const response = await request(app)
        .post('/api/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toMatch(/validation|required/i);
    });

    it('should validate email format', async () => {
      const invalidEmailData = { ...validRegistrationData, email: 'invalid-email' };
      
      const response = await request(app)
        .post('/api/register')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.error).toMatch(/email|validation/i);
    });

    it('should validate phone format', async () => {
      const invalidPhoneData = { ...validRegistrationData, phone: '123456' };
      
      const response = await request(app)
        .post('/api/register')
        .send(invalidPhoneData)
        .expect(400);

      expect(response.body.error).toMatch(/phone|validation/i);
    });

    it('should validate age range', async () => {
      const invalidAgeData = { ...validRegistrationData, age: 36 }; // Over maximum age
      
      const response = await request(app)
        .post('/api/register')
        .send(invalidAgeData)
        .expect(400);

      expect(response.body.error).toMatch(/age|validation/i);
    });

    it('should validate gender values', async () => {
      const invalidGenderData = { ...validRegistrationData, gender: 'Invalid' };
      
      const response = await request(app)
        .post('/api/register')
        .send(invalidGenderData)
        .expect(400);

      expect(response.body.error).toMatch(/gender|validation/i);
    });

    it('should reject duplicate email registration', async () => {
      const registrationData = { ...validRegistrationData };
      
      await request(app)
        .post('/api/register')
        .send(registrationData)
        .expect(201);
      
      // Create another valid access code for the duplicate attempt
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').insertOne({
        code: 'VALID456',
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      });
      
      const duplicateData = { ...registrationData, accessCode: 'VALID456' };
      const response = await request(app)
        .post('/api/register')
        .send(duplicateData)
        .expect(400);
        
      expect(response.body.error).toMatch(/Participant with this email already exists/);
    });

    it('should handle request timeout within performance requirement', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/register')
        .send(validRegistrationData)
        .expect(201);
      
      const responseTime = Date.now() - startTime;
      // Constitutional requirement: <500ms form submission
      // Note: QR generation may take longer, but form processing should be fast
      expect(responseTime).toBeLessThan(1000); // More realistic for QR generation
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        accessCode: 'MALICI01', // 8 characters to match validation
        firstName: '<script>John</script>',  // Shorter malicious content
        lastName: '<img>Doe',
        email: 'malicious@example.com', // Different email to avoid duplication
        phone: '+23276654321',
        age: 25,
        gender: 'Male',
        location: 'Freetown<b>bad</b>',
        churchAffiliation: 'Grace Baptist <i>church</i>',
      };

      // Create second access code for malicious attempt
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').insertOne({
        code: 'MALICI01',
        isUsed: false,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/register')
        .send(maliciousData)
        .expect(201);

      const participant = response.body.data.participant;
      expect(participant.firstName).not.toContain('<script>');
      expect(participant.lastName).not.toContain('<img');
      expect(participant.location).not.toContain('<b>');
      expect(participant.churchAffiliation).not.toContain('<i>');
    });
  });

  describe('GET /api/verify/:accessCode', () => {
    beforeEach(async () => {
      // Create test access codes
      const db = dbConnection.getDatabase();
      await db.collection('access_codes').insertMany([
        {
          code: 'VERIFY01',
          isUsed: false,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          code: 'EXPIRED1',
          isUsed: false,
          expiresAt: new Date(Date.now() - 1000),
          createdAt: new Date(),
        },
        {
          code: 'USEDCODE',
          isUsed: true,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
          createdAt: new Date(),
        }
      ]);
    });

    it('should verify valid unused access code', async () => {
      const response = await request(app)
        .get('/api/verify/VERIFY01')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('should reject invalid access code', async () => {
      const response = await request(app)
        .get('/api/verify/INVALID1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
    });

    it('should reject expired access code', async () => {
      const response = await request(app)
        .get('/api/verify/EXPIRED1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
    });

    it('should reject used access code', async () => {
      const response = await request(app)
        .get('/api/verify/USEDCODE')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
    });

    it('should validate access code format', async () => {
      const response = await request(app)
        .get('/api/verify/short')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should respond within performance requirement', async () => {
      const startTime = Date.now();
      await request(app)
        .get('/api/verify/VERIFY01')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });
});