/**
 * Test environment setup
 * Runs BEFORE any modules are imported
 * Sets environment variables to prevent external service initialization
 */

// Load .env.local for DATABASE_URL_TEST
import dotenv from 'dotenv';
import path from 'path';

// Try to load .env.local from backend directory
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envLocalPath });

if (result.error) {
  // .env.local might not exist, that's ok - use defaults
  console.debug('Note: .env.local not loaded, using default test configuration');
}

// Mock environment variables for tests
process.env.NODE_ENV = 'test';

// Database configuration
// Priority: DATABASE_URL_TEST > DATABASE_URL > default
// - In CI: set by GitHub Actions workflow
// - Locally: set DATABASE_URL_TEST in .env.local or shell before running tests
// Default for local dev (only if nothing is set):
if (process.env.DATABASE_URL_TEST) {
  // Use test database URL if explicitly set
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
} else if (!process.env.DATABASE_URL) {
  // Default fallback (should not be used in production)
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
