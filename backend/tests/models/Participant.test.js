const Participant = require('../../src/models/Participant');
const dbConnection = require('../../src/utils/database');

describe('Participant Model', () => {
  let db;

  beforeAll(async () => {
    db = dbConnection.getDatabase();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.collection('participants').deleteMany({});
  });

  describe('create', () => {
    const validParticipantData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+23276123456',
      age: 22,
      gender: 'Male',
      location: 'Freetown',
      churchAffiliation: 'Grace Baptist Church',
    };

    it('should create a participant with valid data', async () => {
      const participant = await Participant.create(validParticipantData);
      
      expect(participant).toBeDefined();
      expect(participant._id).toBeDefined();
      expect(participant.firstName).toBe('John');
      expect(participant.lastName).toBe('Doe');
      expect(participant.email).toBe('john.doe@example.com');
      expect(participant.phone).toBe('+23276123456');
      expect(participant.age).toBe(22);
      expect(participant.gender).toBe('Male');
      expect(participant.location).toBe('Freetown');
      expect(participant.churchAffiliation).toBe('Grace Baptist Church');
      expect(participant.createdAt).toBeInstanceOf(Date);
    });

    it('should save participant to database', async () => {
      const participant = await Participant.create(validParticipantData);
      
      const savedParticipant = await db.collection('participants').findOne({ _id: participant._id });
      expect(savedParticipant).toBeDefined();
      expect(savedParticipant.email).toBe(validParticipantData.email);
    });

    it('should enforce unique email constraint', async () => {
      await Participant.create(validParticipantData);
      
      await expect(Participant.create(validParticipantData))
        .rejects.toThrow('Participant with this email already exists');
    });

    it('should validate required fields', async () => {
      const testCases = [
        { field: 'firstName', data: { ...validParticipantData, firstName: '' } },
        { field: 'lastName', data: { ...validParticipantData, lastName: '' } },
        { field: 'email', data: { ...validParticipantData, email: '' } },
        { field: 'phone', data: { ...validParticipantData, phone: '' } },
        { field: 'age', data: { ...validParticipantData, age: undefined } },
        { field: 'location', data: { ...validParticipantData, location: '' } },
      ];

      for (const testCase of testCases) {
        await expect(Participant.create(testCase.data))
          .rejects.toThrow(`${testCase.field} is required`);
      }
      
      // Test missing gender separately - empty string is treated as invalid enum value
      await expect(Participant.create({ ...validParticipantData, gender: '' }))
        .rejects.toThrow('Gender must be Male, Female, or Other');
    });

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'missing@domain',
        '@missinglocal.com',
        'spaces @domain.com',
        'toolong' + 'a'.repeat(200) + '@domain.com',
      ];

      for (const email of invalidEmails) {
        await expect(Participant.create({ ...validParticipantData, email }))
          .rejects.toThrow('Invalid email format');
      }
    });

    it('should validate phone format', async () => {
      const invalidPhones = [
        '123',
        'not-a-phone',
        '+232761234', // too short
        '+232761234567890', // too long
        '076123456', // missing country code
      ];

      for (const phone of invalidPhones) {
        await expect(Participant.create({ ...validParticipantData, phone }))
          .rejects.toThrow('Invalid phone format');
      }
    });

    it('should validate age range', async () => {
      const invalidAges = [12, 36, -5, 'not-a-number'];

      for (const age of invalidAges) {
        await expect(Participant.create({ ...validParticipantData, age }))
          .rejects.toThrow('Age must be between 13 and 35');
      }
    });

    it('should validate gender values', async () => {
      const invalidGenders = ['Invalid', 'M', 'F', ''];

      for (const gender of invalidGenders) {
        await expect(Participant.create({ ...validParticipantData, gender }))
          .rejects.toThrow('Gender must be Male, Female, or Other');
      }
    });

    it('should accept valid gender values', async () => {
      const validGenders = ['Male', 'Female', 'Other'];

      for (const gender of validGenders) {
        const participant = await Participant.create({
          ...validParticipantData,
          email: `test-${gender}@example.com`,
          gender,
        });
        expect(participant.gender).toBe(gender);
      }
    });

    it('should trim whitespace from string fields', async () => {
      const dataWithWhitespace = {
        ...validParticipantData,
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: '  john.whitespace@example.com  ',
        phone: '  +23276123456  ',
        location: '  Freetown  ',
        churchAffiliation: '  Grace Baptist Church  ',
      };

      const participant = await Participant.create(dataWithWhitespace);
      
      expect(participant.firstName).toBe('John');
      expect(participant.lastName).toBe('Doe');
      expect(participant.email).toBe('john.whitespace@example.com');
      expect(participant.phone).toBe('+23276123456');
      expect(participant.location).toBe('Freetown');
      expect(participant.churchAffiliation).toBe('Grace Baptist Church');
    });
  });

  describe('findByEmail', () => {
    const testParticipant = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+23276987654',
      age: 25,
      gender: 'Female',
      location: 'Bo',
      churchAffiliation: 'Methodist Church',
    };

    it('should find existing participant by email', async () => {
      const created = await Participant.create(testParticipant);
      
      const found = await Participant.findByEmail(testParticipant.email);
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(created._id.toString());
      expect(found.email).toBe(testParticipant.email);
    });

    it('should return null for non-existent email', async () => {
      const found = await Participant.findByEmail('nonexistent@example.com');
      expect(found).toBeNull();
    });

    it('should be case-insensitive', async () => {
      await Participant.create(testParticipant);
      
      const found = await Participant.findByEmail('JANE.SMITH@EXAMPLE.COM');
      expect(found).toBeDefined();
      expect(found.email).toBe(testParticipant.email);
    });
  });

  describe('findById', () => {
    it('should find participant by ID', async () => {
      const testParticipant = {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        phone: '+23276555666',
        age: 30,
        gender: 'Male',
        location: 'Kenema',
        churchAffiliation: 'Pentecostal Church',
      };

      const created = await Participant.create(testParticipant);
      
      const found = await Participant.findById(created._id);
      expect(found).toBeDefined();
      expect(found._id.toString()).toBe(created._id.toString());
      expect(found.email).toBe(testParticipant.email);
    });

    it('should return null for non-existent ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const found = await Participant.findById(fakeId);
      expect(found).toBeNull();
    });

    it('should handle invalid ObjectId format', async () => {
      await expect(Participant.findById('invalid-id'))
        .rejects.toThrow('Invalid participant ID format');
    });
  });
});