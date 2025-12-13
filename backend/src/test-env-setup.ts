/**
 * Test environment setup
 * Runs BEFORE any modules are imported
 * Sets environment variables to prevent external service initialization
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test';

// Database configuration
// DO NOT set DATABASE_URL here - let it be configured via environment variables:
// - In CI: set by GitHub Actions workflow
// - Locally: set DATABASE_URL_TEST in .env or shell before running tests
// Default for local dev (only if nothing is set):
if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = 'postgresql://charhub:charhub_dev_password@localhost:5433/charhub_db?schema=public';
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
