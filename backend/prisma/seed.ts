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

  // Create system narrator character
  const systemNarrator = await prisma.character.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' }, // Fixed UUID for system narrator
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      firstName: 'Narrator',
      lastName: null,
      gender: null,
      personality: 'An omniscient narrator that provides context, descriptions, and story progression. Speaks in third person with a descriptive and immersive tone.',
      history: 'The voice that guides the story, describing scenes, events, and transitions.',
      physicalCharacteristics: 'Invisible presence',
      ageRating: $Enums.AgeRating.L,
      contentTags: [],
      isPublic: false, // Not visible to users
      isSystemCharacter: true, // Mark as system character
      userId: systemUser.id,
    },
  });

  console.log(`✅ System narrator character created/verified: ${systemNarrator.firstName}`);

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
