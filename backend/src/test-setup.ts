/**
 * Test setup file
 * Runs before all tests
 */

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
// Use localhost:5433 for tests running outside Docker (matches docker-compose port mapping)
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://charhub:charhub_dev_password@localhost:5433/charhub_db?schema=public';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// Disable external services that require API keys
process.env.OPENAI_API_KEY = 'test-key-disabled';
process.env.GEMINI_API_KEY = 'test-key-disabled';
process.env.XAI_API_KEY = 'test-key-disabled';

// Disable Redis/queues in tests
process.env.ENABLE_QUEUES = 'false';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380'; // Non-existent port to avoid connection attempts

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
