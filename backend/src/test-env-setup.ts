/**
 * Test environment setup
 * Runs BEFORE any modules are imported
 * Sets environment variables to prevent external service initialization
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test';

// Database configuration
// Respect existing DATABASE_URL (used in CI), otherwise use DATABASE_URL_TEST, or fallback to local dev
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://charhub:charhub_dev_password@localhost:5433/charhub_db?schema=public';
}

// Authentication secrets
process.env.SESSION_SECRET = 'test-secret-key';
process.env.JWT_SECRET = 'test-jwt-secret';

// Disable external services that require API keys
process.env.OPENAI_API_KEY = 'sk-test-key-disabled-for-testing';
process.env.GEMINI_API_KEY = 'test-key-disabled';
process.env.XAI_API_KEY = 'test-key-disabled';

// Disable Redis/queues in tests
process.env.ENABLE_QUEUES = 'false';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6380'; // Non-existent port to avoid connection attempts
