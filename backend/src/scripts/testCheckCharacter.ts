import { prisma } from '../config/database';

async function main() {
  const characters = await prisma.character.findMany({
    where: { firstName: { contains: 'Haruka' } },
    include: { images: { where: { isActive: true } } }
  });

  console.log('=== Found', characters.length, 'characters ===');
  for (const character of characters) {
    console.log('\nName:', character.firstName, character.lastName);
    console.log('Style:', character.style);
    console.log('Images:', character.images.length);
    for (const img of character.images) {
      console.log(`  ${img.type}: ${img.url?.substring(0, 70)}...`);
    }
  }
}

main().then(() => process.exit(0));
