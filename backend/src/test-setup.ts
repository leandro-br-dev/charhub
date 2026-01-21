/**
 * Test setup file
 * Runs before all tests
 */

// Mock ioredis to prevent Redis connection attempts during tests
jest.mock('ioredis');

// Extend Jest timeout for database operations
jest.setTimeout(10000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
// DATABASE_URL is configured in test-env-setup.ts (setupFiles) - do NOT override here
// This file (setupFilesAfterEnv) runs AFTER setupFiles, so any DATABASE_URL set here
// would override CI and environment variables

// Only set auth secrets if not already set
if (!process.env.SESSION_SECRET) process.env.SESSION_SECRET = 'test-secret-key';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-jwt-secret';

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
