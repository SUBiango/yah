const { MongoClient } = require('mongodb');
const { config } = require('./config');

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.database = null;
    this.isConnected = false;
  }

  async connect(mongoUri) {
    try {
      if (this.isConnected) {
        return this.database;
      }

      const uri = mongoUri || config.mongodb.uri;
      
      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
      });

      await this.client.connect();
      this.database = this.client.db();
      this.isConnected = true;

      console.log('Connected to MongoDB');
      return this.database;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.isConnected = false;
        console.log('Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }

  getDatabase() {
    if (!this.isConnected || !this.database) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.database;
  }

  async createIndexes() {
    const db = this.getDatabase();
    
    try {
      // Create indexes for AccessCode collection
      await db.collection('access_codes').createIndex(
        { code: 1 }, 
        { unique: true }
      );
      await db.collection('access_codes').createIndex(
        { isUsed: 1, expiresAt: 1 }
      );

      // Create indexes for Participant collection
      await db.collection('participants').createIndex(
        { email: 1 }, 
        { unique: true }
      );

      // Create indexes for Registration collection
      await db.collection('registrations').createIndex(
        { accessCode: 1 }, 
        { unique: true }
      );
      await db.collection('registrations').createIndex(
        { participantId: 1 }
      );
      await db.collection('registrations').createIndex(
        { createdAt: 1 }
      );

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating database indexes:', error);
      throw error;
    }
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;