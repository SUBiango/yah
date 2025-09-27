// Jest setup file for test environment
const { MongoMemoryServer } = require('mongodb-memory-server');
const dbConnection = require('../src/utils/database');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';

let mongoServer;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Override MongoDB URI for tests
  process.env.MONGODB_URI = mongoUri;
  
  // Connect to test database
  try {
    await dbConnection.connect(mongoUri);
    await dbConnection.createIndexes();
    console.log('Test database connected');
  } catch (error) {
    console.error('Test database connection failed:', error);
  }
}, 30000);

// Clean up after all tests
afterAll(async () => {
  try {
    // Clean up test database
    const db = dbConnection.getDatabase();
    await db.collection('access_codes').deleteMany({});
    await db.collection('participants').deleteMany({});
    await db.collection('registrations').deleteMany({});
    
    // Disconnect from database
    await dbConnection.disconnect();
    
    // Stop the in-memory MongoDB instance
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('Test database cleanup completed');
  } catch (error) {
    console.error('Test cleanup error:', error);
  }
}, 30000);