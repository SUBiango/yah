const Registration = require('../../src/models/Registration');
const AccessCode = require('../../src/models/AccessCode');
const Participant = require('../../src/models/Participant');
const dbConnection = require('../../src/utils/database');

describe('Registration Model', () => {
  let db;

  beforeAll(async () => {
    db = dbConnection.getDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.collection('registrations').deleteMany({});
    await db.collection('participants').deleteMany({});
    await db.collection('access_codes').deleteMany({});
  });

  describe('create', () => {
    let validAccessCode;
    let validParticipant;

    beforeEach(async () => {
      // Create valid access code and participant for testing
      validAccessCode = await AccessCode.generate();
      
      validParticipant = await Participant.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+23276123456',
        age: 22,
        gender: 'Male',
        location: 'Freetown',
        churchAffiliation: 'Grace Baptist Church',
      });
    });

    it('should create registration with valid data', async () => {
      const registration = await Registration.create(
        validAccessCode.code,
        validParticipant._id
      );
      
      expect(registration).toBeDefined();
      expect(registration._id).toBeDefined();
      expect(registration.accessCode).toBe(validAccessCode.code);
      expect(registration.participantId.toString()).toBe(validParticipant._id.toString());
      expect(registration.status).toBe('confirmed');
      expect(registration.qrCode).toBeDefined();
      expect(registration.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(registration.createdAt).toBeInstanceOf(Date);
    });

    it('should mark access code as used', async () => {
      await Registration.create(validAccessCode.code, validParticipant._id);
      
      const usedCode = await AccessCode.findByCode(validAccessCode.code);
      expect(usedCode.isUsed).toBe(true);
      expect(usedCode.usedAt).toBeInstanceOf(Date);
    });

    it('should save registration to database', async () => {
      const registration = await Registration.create(
        validAccessCode.code,
        validParticipant._id
      );
      
      const savedRegistration = await db.collection('registrations').findOne({
        _id: registration._id,
      });
      expect(savedRegistration).toBeDefined();
      expect(savedRegistration.accessCode).toBe(validAccessCode.code);
    });

    it('should generate unique QR codes', async () => {
      const accessCode2 = await AccessCode.generate();
      const participant2 = await Participant.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+23276987654',
        age: 25,
        gender: 'Female',
        location: 'Bo',
        churchAffiliation: 'Methodist Church',
      });

      const registration1 = await Registration.create(
        validAccessCode.code,
        validParticipant._id
      );
      const registration2 = await Registration.create(
        accessCode2.code,
        participant2._id
      );

      expect(registration1.qrCode).not.toBe(registration2.qrCode);
    });

    it('should fail with invalid access code', async () => {
      await expect(Registration.create('INVALID1', validParticipant._id))
        .rejects.toThrow('Invalid or expired access code');
    });

    it('should fail with expired access code', async () => {
      // Create expired code
      const expiredDate = new Date(Date.now() - 1000);
      await db.collection('access_codes').insertOne({
        code: 'EXPIRED1',
        isUsed: false,
        expiresAt: expiredDate,
        createdAt: new Date(),
      });

      await expect(Registration.create('EXPIRED1', validParticipant._id))
        .rejects.toThrow('Invalid or expired access code');
    });

    it('should fail with already used access code', async () => {
      // Use the access code first
      await Registration.create(validAccessCode.code, validParticipant._id);

      // Try to use it again with another participant
      const participant2 = await Participant.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+23276987654',
        age: 25,
        gender: 'Female',
        location: 'Bo',
        churchAffiliation: 'Methodist Church',
      });

      await expect(Registration.create(validAccessCode.code, participant2._id))
        .rejects.toThrow('Invalid or expired access code');
    });

    it('should fail with non-existent participant', async () => {
      const fakeParticipantId = '507f1f77bcf86cd799439011';
      
      await expect(Registration.create(validAccessCode.code, fakeParticipantId))
        .rejects.toThrow('Participant not found');
    });

    it('should prevent duplicate registration for same participant', async () => {
      await Registration.create(validAccessCode.code, validParticipant._id);
      
      const accessCode2 = await AccessCode.generate();
      
      await expect(Registration.create(accessCode2.code, validParticipant._id))
        .rejects.toThrow('Participant already registered');
    });

    it('should handle race conditions for access code usage', async () => {
      // This test simulates concurrent registration attempts
      const participant2 = await Participant.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+23276987654',
        age: 25,
        gender: 'Female',
        location: 'Bo',
        churchAffiliation: 'Methodist Church',
      });

      // Attempt to register both participants with the same access code simultaneously
      const promises = [
        Registration.create(validAccessCode.code, validParticipant._id),
        Registration.create(validAccessCode.code, participant2._id),
      ];

      const results = await Promise.allSettled(promises);
      
      // One should succeed, one should fail
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].reason.message).toMatch(/Invalid or expired access code/);
    });
  });

  describe('findByAccessCode', () => {
    let registration;
    let accessCode;
    let participant;

    beforeEach(async () => {
      accessCode = await AccessCode.generate();
      participant = await Participant.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        phone: '+23276111222',
        age: 20,
        gender: 'Other',
        location: 'Makeni',
        churchAffiliation: 'Baptist Church',
      });
      registration = await Registration.create(accessCode.code, participant._id);
    });

    it('should find registration by access code', async () => {
      const found = await Registration.findByAccessCode(accessCode.code);
      
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(registration._id.toString());
      expect(found.accessCode).toBe(accessCode.code);
    });

    it('should return null for non-existent access code', async () => {
      const found = await Registration.findByAccessCode('INVALID1');
      expect(found).toBeNull();
    });
  });

  describe('findByParticipantId', () => {
    let registration;
    let participant;

    beforeEach(async () => {
      const accessCode = await AccessCode.generate();
      participant = await Participant.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.participant@example.com',
        phone: '+23276333444',
        age: 28,
        gender: 'Male',
        location: 'Freetown',
        churchAffiliation: 'Catholic Church',
      });
      registration = await Registration.create(accessCode.code, participant._id);
    });

    it('should find registration by participant ID', async () => {
      const found = await Registration.findByParticipantId(participant._id);
      
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(registration._id.toString());
      expect(found.participantId.toString()).toBe(participant._id.toString());
    });

    it('should return null for non-existent participant ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const found = await Registration.findByParticipantId(fakeId);
      expect(found).toBeNull();
    });
  });

  describe('getAllRegistrations', () => {
    it('should return all registrations with participant details', async () => {
      // Create multiple registrations
      const participants = await Promise.all([
        Participant.create({
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          phone: '+23276111111',
          age: 19,
          gender: 'Female',
          location: 'Freetown',
          churchAffiliation: 'Presbyterian Church',
        }),
        Participant.create({
          firstName: 'Bob',
          lastName: 'Wilson',
          email: 'bob@example.com',
          phone: '+23276222222',
          age: 24,
          gender: 'Male',
          location: 'Bo',
          churchAffiliation: 'Anglican Church',
        }),
      ]);

      const accessCodes = await Promise.all([
        AccessCode.generate(),
        AccessCode.generate(),
      ]);

      await Registration.create(accessCodes[0].code, participants[0]._id);
      await Registration.create(accessCodes[1].code, participants[1]._id);

      const registrations = await Registration.getAllRegistrations();
      
      expect(registrations).toHaveLength(2);
      
      // Check that participant details are included
      registrations.forEach(reg => {
        expect(reg.participant).toBeDefined();
        expect(reg.participant.firstName).toBeDefined();
        expect(reg.participant.email).toBeDefined();
      });
    });

    it('should return empty array when no registrations exist', async () => {
      const registrations = await Registration.getAllRegistrations();
      expect(registrations).toHaveLength(0);
    });
  });

  describe('getRegistrationCount', () => {
    it('should return correct count of registrations', async () => {
      expect(await Registration.getRegistrationCount()).toBe(0);

      // Create registrations
      const participant = await Participant.create({
        firstName: 'Count',
        lastName: 'Test',
        email: 'count@example.com',
        phone: '+23276999999',
        age: 21,
        gender: 'Other',
        location: 'Kenema',
        churchAffiliation: 'Methodist Church',
      });

      const accessCode = await AccessCode.generate();
      await Registration.create(accessCode.code, participant._id);

      expect(await Registration.getRegistrationCount()).toBe(1);
    });
  });
});