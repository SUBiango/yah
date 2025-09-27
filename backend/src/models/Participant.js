const { ObjectId } = require('mongodb');
const Joi = require('joi');
const dbConnection = require('../utils/database');

class Participant {
  /**
   * Validation schema for participant data
   */
  static getValidationSchema() {
    return Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required()
        .messages({
          'string.empty': 'firstName is required',
          'any.required': 'firstName is required',
        }),
      lastName: Joi.string().trim().min(1).max(50).required()
        .messages({
          'string.empty': 'lastName is required', 
          'any.required': 'lastName is required',
        }),
      email: Joi.string().trim().email().max(100).required()
        .messages({
          'string.empty': 'email is required',
          'string.email': 'Invalid email format',
          'any.required': 'email is required',
        }),
      phone: Joi.string().trim().pattern(/^\+232\d{8}$/).required()
        .messages({
          'string.empty': 'phone is required',
          'string.pattern.base': 'Invalid phone format',
          'any.required': 'phone is required',
        }),
      age: Joi.number().integer().min(13).max(35).required()
        .messages({
          'number.base': 'Age must be between 13 and 35',
          'number.min': 'Age must be between 13 and 35',
          'number.max': 'Age must be between 13 and 35',
          'any.required': 'age is required',
        }),
      gender: Joi.string().valid('Male', 'Female').required()
        .messages({
          'any.only': 'Gender must be Male or Female',
          'any.required': 'gender is required',
          'string.empty': 'gender is required',
        }),
      district: Joi.string().trim().min(1).max(100).required()
        .messages({
          'string.empty': 'district is required',
          'any.required': 'district is required',
        }),
      occupation: Joi.string().trim().min(1).max(100).required()
        .messages({
          'string.empty': 'occupation is required',
          'any.required': 'occupation is required',
        }),
      interest: Joi.string().valid('Innovation & Entrepreneurship', 'Leadership Development', 'Networking').required()
        .messages({
          'any.only': 'Interest must be Innovation & Entrepreneurship, Leadership Development, or Networking',
          'any.required': 'interest is required',
        }),
      churchAffiliation: Joi.string().trim().max(100).optional().allow(''),
    });
  }

  /**
   * Create a new participant
   * @param {Object} participantData - The participant data
   * @returns {Object} The created participant
   */
  static async create(participantData) {
    // Validate input data
    const schema = this.getValidationSchema();
    const { error, value } = schema.validate(participantData, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const message = error.details[0].message;
      throw new Error(message);
    }

    const db = dbConnection.getDatabase();

    // Check if participant with email already exists
    const existingParticipant = await db.collection('participants').findOne({ 
      email: value.email.toLowerCase() 
    });

    if (existingParticipant) {
      throw new Error('Participant with this email already exists');
    }

    // Create participant object
    const participant = {
      ...value,
      email: value.email.toLowerCase(), // Store email in lowercase for consistency
      createdAt: new Date(),
    };

    // Insert into database
    const result = await db.collection('participants').insertOne(participant);
    
    // Return the participant with the generated _id
    return {
      _id: result.insertedId,
      ...participant,
    };
  }

  /**
   * Find participant by email (case-insensitive)
   * @param {string} email - The email to search for
   * @returns {Object|null} The participant or null if not found
   */
  static async findByEmail(email) {
    if (!email || typeof email !== 'string') {
      return null;
    }

    const db = dbConnection.getDatabase();
    return await db.collection('participants').findOne({ 
      email: email.toLowerCase() 
    });
  }

  /**
   * Find participant by ID
   * @param {string|ObjectId} id - The participant ID
   * @returns {Object|null} The participant or null if not found
   */
  static async findById(id) {
    if (!id) {
      return null;
    }

    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      throw new Error('Invalid participant ID format');
    }

    const db = dbConnection.getDatabase();
    return await db.collection('participants').findOne({ _id: objectId });
  }

  /**
   * Get all participants with pagination
   * @param {Object} options - Pagination options
   * @returns {Array} Array of participants
   */
  static async findAll(options = {}) {
    const { skip = 0, limit = 100 } = options;
    
    const db = dbConnection.getDatabase();
    return await db.collection('participants')
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  /**
   * Get participant count
   * @returns {number} Total number of participants
   */
  static async getCount() {
    const db = dbConnection.getDatabase();
    return await db.collection('participants').countDocuments({});
  }

  /**
   * Get demographic statistics
   * @returns {Object} Demographic breakdown
   */
  static async getDemographics() {
    const db = dbConnection.getDatabase();
    
    const [genderStats, locationStats, ageGroups] = await Promise.all([
      // Gender distribution
      db.collection('participants').aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } },
        { $project: { _id: 0, gender: '$_id', count: 1 } }
      ]).toArray(),
      
      // Location distribution
      db.collection('participants').aggregate([
        { $group: { _id: '$location', count: { $sum: 1 } } },
        { $project: { _id: 0, location: '$_id', count: 1 } }
      ]).toArray(),
      
      // Age group distribution
      db.collection('participants').aggregate([
        {
          $addFields: {
            ageGroup: {
              $switch: {
                branches: [
                  { case: { $lte: ['$age', 17] }, then: '13-17' },
                  { case: { $lte: ['$age', 24] }, then: '18-24' },
                  { case: { $lte: ['$age', 30] }, then: '25-30' },
                  { case: { $gte: ['$age', 31] }, then: '31-35' }
                ],
                default: 'Unknown'
              }
            }
          }
        },
        { $group: { _id: '$ageGroup', count: { $sum: 1 } } },
        { $project: { _id: 0, ageGroup: '$_id', count: 1 } }
      ]).toArray(),
    ]);

    // Convert arrays to objects for easier access
    const demographics = {
      gender: {},
      location: {},
      ageGroups: {},
    };

    genderStats.forEach(stat => {
      demographics.gender[stat.gender] = stat.count;
    });

    locationStats.forEach(stat => {
      demographics.location[stat.location] = stat.count;
    });

    ageGroups.forEach(stat => {
      demographics.ageGroups[stat.ageGroup] = stat.count;
    });

    return demographics;
  }

  /**
   * Update participant data
   * @param {string|ObjectId} id - The participant ID
   * @param {Object} updateData - Data to update
   * @returns {Object|null} Updated participant or null if not found
   */
  static async update(id, updateData) {
    // Validate update data (excluding required fields that shouldn't be updated)
    const updateSchema = this.getValidationSchema().fork(
      ['firstName', 'lastName', 'email', 'phone', 'age', 'gender', 'location'], 
      schema => schema.optional()
    );

    const { error, value } = updateSchema.validate(updateData, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const message = error.details[0].message;
      throw new Error(message);
    }

    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      throw new Error('Invalid participant ID format');
    }

    const db = dbConnection.getDatabase();
    
    // If email is being updated, check for uniqueness
    if (value.email) {
      const existingParticipant = await db.collection('participants').findOne({ 
        email: value.email.toLowerCase(),
        _id: { $ne: objectId }
      });

      if (existingParticipant) {
        throw new Error('Participant with this email already exists');
      }
      
      value.email = value.email.toLowerCase();
    }

    const result = await db.collection('participants').findOneAndUpdate(
      { _id: objectId },
      { 
        $set: {
          ...value,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value;
  }

  /**
   * Delete participant
   * @param {string|ObjectId} id - The participant ID
   * @returns {boolean} True if deleted, false if not found
   */
  static async delete(id) {
    let objectId;
    try {
      objectId = typeof id === 'string' ? new ObjectId(id) : id;
    } catch (error) {
      throw new Error('Invalid participant ID format');
    }

    const db = dbConnection.getDatabase();
    const result = await db.collection('participants').deleteOne({ _id: objectId });
    
    return result.deletedCount === 1;
  }
}

module.exports = Participant;