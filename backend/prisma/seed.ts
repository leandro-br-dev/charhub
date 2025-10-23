import { PrismaClient, $Enums } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const systemUser = await prisma.user.upsert({
    where: { username: '@system' },
    update: {},
    create: {
      username: '@system',
      displayName: 'System',
      provider: $Enums.AuthProvider.GOOGLE, // This is required, but not used for the system user
      providerAccountId: 'system', // This is required, but not used for the system user
      role: 'ADMIN',
    },
  });

  console.log(`✅ System user created/verified: ${systemUser.username}`);

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
