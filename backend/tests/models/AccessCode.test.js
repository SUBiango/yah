const AccessCode = require('../../src/models/AccessCode');
const dbConnection = require('../../src/utils/database');

describe('AccessCode Model', () => {
  let db;

  beforeAll(async () => {
    db = dbConnection.getDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.collection('access_codes').deleteMany({});
  });

  describe('generate', () => {
    it('should generate a unique 8-character access code', async () => {
      const accessCode = await AccessCode.generate();
      
      expect(accessCode).toBeDefined();
      expect(accessCode.code).toMatch(/^[A-Z0-9]{8}$/);
      expect(accessCode.isUsed).toBe(false);
      expect(accessCode.expiresAt).toBeInstanceOf(Date);
      expect(accessCode.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique codes across multiple calls', async () => {
      const codes = await Promise.all([
        AccessCode.generate(),
        AccessCode.generate(),
        AccessCode.generate(),
      ]);

      const codeStrings = codes.map(c => c.code);
      const uniqueCodes = new Set(codeStrings);
      expect(uniqueCodes.size).toBe(3);
    });

    it('should set expiration to 72 hours from creation', async () => {
      const beforeGeneration = new Date();
      const accessCode = await AccessCode.generate();
      const afterGeneration = new Date();

      const expectedExpiry = new Date(beforeGeneration.getTime() + 72 * 60 * 60 * 1000);
      const maxExpectedExpiry = new Date(afterGeneration.getTime() + 72 * 60 * 60 * 1000);

      expect(accessCode.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime());
      expect(accessCode.expiresAt.getTime()).toBeLessThanOrEqual(maxExpectedExpiry.getTime());
    });

    it('should save the access code to database', async () => {
      const accessCode = await AccessCode.generate();
      
      const savedCode = await db.collection('access_codes').findOne({ code: accessCode.code });
      expect(savedCode).toBeDefined();
      expect(savedCode.code).toBe(accessCode.code);
      expect(savedCode.isUsed).toBe(false);
    });
  });

  describe('findByCode', () => {
    it('should find an existing access code', async () => {
      const generatedCode = await AccessCode.generate();
      
      const foundCode = await AccessCode.findByCode(generatedCode.code);
      expect(foundCode).toBeDefined();
      expect(foundCode.code).toBe(generatedCode.code);
      expect(foundCode.isUsed).toBe(false);
    });

    it('should return null for non-existent code', async () => {
      const foundCode = await AccessCode.findByCode('INVALID1');
      expect(foundCode).toBeNull();
    });

    it('should validate code format', async () => {
      await expect(AccessCode.findByCode('invalid')).rejects.toThrow('Invalid access code format');
      await expect(AccessCode.findByCode('123')).rejects.toThrow('Invalid access code format');
      await expect(AccessCode.findByCode('ABCD123E9')).rejects.toThrow('Invalid access code format');
    });
  });

  describe('isValid', () => {
    it('should return true for valid unused code', async () => {
      const accessCode = await AccessCode.generate();
      const isValid = await AccessCode.isValid(accessCode.code);
      expect(isValid).toBe(true);
    });

    it('should return false for used code', async () => {
      const accessCode = await AccessCode.generate();
      await AccessCode.markAsUsed(accessCode.code);
      
      const isValid = await AccessCode.isValid(accessCode.code);
      expect(isValid).toBe(false);
    });

    it('should return false for expired code', async () => {
      // Create an expired code by setting expiry in the past
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      await db.collection('access_codes').insertOne({
        code: 'EXPIRED1',
        isUsed: false,
        expiresAt: expiredDate,
        createdAt: new Date(),
      });

      const isValid = await AccessCode.isValid('EXPIRED1');
      expect(isValid).toBe(false);
    });

    it('should return false for non-existent code', async () => {
      const isValid = await AccessCode.isValid('INVALID1');
      expect(isValid).toBe(false);
    });
  });

  describe('markAsUsed', () => {
    it('should mark code as used atomically', async () => {
      const accessCode = await AccessCode.generate();
      
      const result = await AccessCode.markAsUsed(accessCode.code);
      expect(result).toBe(true);

      const updatedCode = await AccessCode.findByCode(accessCode.code);
      expect(updatedCode.isUsed).toBe(true);
      expect(updatedCode.usedAt).toBeInstanceOf(Date);
    });

    it('should prevent double usage', async () => {
      const accessCode = await AccessCode.generate();
      
      // First usage should succeed
      const firstResult = await AccessCode.markAsUsed(accessCode.code);
      expect(firstResult).toBe(true);

      // Second usage should fail
      const secondResult = await AccessCode.markAsUsed(accessCode.code);
      expect(secondResult).toBe(false);
    });

    it('should fail for non-existent code', async () => {
      const result = await AccessCode.markAsUsed('INVALID1');
      expect(result).toBe(false);
    });

    it('should fail for expired code', async () => {
      // Create an expired code
      const expiredDate = new Date(Date.now() - 1000);
      await db.collection('access_codes').insertOne({
        code: 'EXPIRED2',
        isUsed: false,
        expiresAt: expiredDate,
        createdAt: new Date(),
      });

      const result = await AccessCode.markAsUsed('EXPIRED2');
      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove expired codes', async () => {
      // Insert expired and valid codes
      const expiredDate = new Date(Date.now() - 1000);
      const validDate = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await db.collection('access_codes').insertMany([
        { code: 'EXPIRED3', isUsed: false, expiresAt: expiredDate, createdAt: new Date() },
        { code: 'EXPIRED4', isUsed: false, expiresAt: expiredDate, createdAt: new Date() },
        { code: 'VALID001', isUsed: false, expiresAt: validDate, createdAt: new Date() },
      ]);

      const deletedCount = await AccessCode.cleanup();
      expect(deletedCount).toBe(2);

      // Verify expired codes are gone
      const expiredCode = await AccessCode.findByCode('EXPIRED3');
      expect(expiredCode).toBeNull();

      // Verify valid code remains
      const validCode = await AccessCode.findByCode('VALID001');
      expect(validCode).toBeDefined();
    });
  });
});