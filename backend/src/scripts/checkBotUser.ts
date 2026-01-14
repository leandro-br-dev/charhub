import { prisma } from '../config/database';

async function checkBotUser() {
  const botUsers = await prisma.user.findMany({
    where: { role: 'BOT' },
    select: { id: true, username: true, role: true },
  });

  console.log('BOT users in database:');
  console.log(JSON.stringify(botUsers, null, 2));

  const officialBot = await prisma.user.findFirst({
    where: { username: 'CharHub Official' },
    select: { id: true, username: true, role: true },
  });

  console.log('\nCharHub Official user:');
  console.log(JSON.stringify(officialBot, null, 2));

  // Check by expected IDs
  const systemUsers = await prisma.user.findMany({
    where: {
      id: {
        in: ['00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001']
      }
    },
    select: { id: true, username: true, role: true },
  });

  console.log('\nSystem users by expected IDs:');
  console.log(JSON.stringify(systemUsers, null, 2));

  await prisma.$disconnect();
}

checkBotUser().catch(console.error);
