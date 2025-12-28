import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
import path from 'path';

// Load from root .env first (common config)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Load from local .env (overrides)
dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  // @ts-ignore
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
