import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Add your seed data here when you have models defined
  // Example:
  // await prisma.user.create({
  //   data: {
  //     email: 'admin@example.com',
  //     name: 'Admin User',
  //   },
  // });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
