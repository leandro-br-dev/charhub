import { prisma } from '../config/database';
import { curationQueue } from '../services/curation/curationQueue';

async function process() {
  console.log('Processing pending curated images...');

  const result = await curationQueue.processPendingItems(10);
  console.log('Result:', JSON.stringify(result, null, 2));

  // Check approved count
  const approved = await prisma.curatedImage.count({
    where: {
      status: 'APPROVED',
      generatedCharId: null
    }
  });

  console.log('\nApproved images available for generation:', approved);

  await prisma.$disconnect();
}

process().catch(console.error);
