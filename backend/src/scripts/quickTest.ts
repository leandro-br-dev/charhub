import { prisma } from '../config/database';
import { CurationStatus } from '../generated/prisma';
import { curationQueue } from '../services/curation/curationQueue';
import { batchCharacterGenerator } from '../services/batch/batchCharacterGenerator';

async function quickTest() {
  // Use a timestamp-based unique ID
  const timestamp = Date.now();
  const uniqueUrl = `https://image.civitai.com/xG1nkqKTMzGDvpLrqFT7WA/633fcfb4-11fb-44e7-8529-e278bdf6a662/width=450/${timestamp}/633fcfb4-11fb-44e7-8529-e278bdf6a662.jpeg`;

  console.log('Creating curated image...');

  // Create curated image
  const curated = await prisma.curatedImage.create({
    data: {
      sourceUrl: uniqueUrl,
      sourceId: `test-${timestamp}`,
      sourcePlatform: 'civitai',
      status: CurationStatus.PENDING,
    },
  });

  console.log('Created:', curated.id.substring(0, 8));

  // Process curation
  console.log('Processing curation...');
  await curationQueue.processPendingItems();

  // Check result
  const updated = await prisma.curatedImage.findUnique({
    where: { id: curated.id },
    select: { status: true, qualityScore: true, gender: true },
  });

  console.log('Status:', updated?.status);
  console.log('Quality:', updated?.qualityScore);

  if (updated?.status === 'APPROVED') {
    console.log('Generating character...');
    const results = await batchCharacterGenerator.generateBatch({ count: 1 });

    if (results.results && results.results[0]) {
      const r = results.results[0];
      console.log('Success:', r.success);
      console.log('Character:', r.characterId?.substring(0, 8));

      if (r.characterId) {
        const images = await prisma.characterImage.findMany({
          where: { characterId: r.characterId },
          select: { type: true, content: true },
        });

        console.log('Images:', images.length);
        const refs = images.filter(i => i.type === 'REFERENCE');
        console.log('References:', refs.length, '/ 4');
      }
    }
  }

  await prisma.$disconnect();
}

quickTest().catch(console.error);
