import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DATABASE_URL = 'postgresql://taskuser:taskpassword@localhost:5432/taskdb_test';

// Global test timeout
jest.setTimeout(30000);
