// Load .env files:
// 1. Try .env.local first (for local CLI usage with localhost)
// 2. Fallback to project root .env (for Docker compose)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { env } = require('prisma/config');

module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
};