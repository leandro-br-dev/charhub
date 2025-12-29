// Load .env files:
// 1. Try .env.local first (for local CLI usage with localhost)
// 2. Fallback to project root .env (for Docker compose)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    // Use DATABASE_URL from environment, or placeholder if not set (for 'prisma generate' in CI)
    // The placeholder allows 'npx prisma generate' to run without DATABASE_URL
    // (generation doesn't connect to DB, it just reads schema and generates types)
    // All actual DB operations (migrate, seed, runtime) will use real DATABASE_URL
    url: process.env.DATABASE_URL || 'postgresql://placeholder',
  },
};