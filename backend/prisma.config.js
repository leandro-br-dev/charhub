require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
require('dotenv').config();

module.exports = {
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
};