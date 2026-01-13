import { prisma } from '../config/database';

async function analyze() {
  // Check all statuses
  const allStatuses = await prisma.curatedImage.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('=== ALL STATUS COUNTS ===');
  allStatuses.forEach(s => {
    console.log(`  ${s.status}: ${s._count}`);
  });

  // Check COMPLETED images details
  const completed = await prisma.curatedImage.findMany({
    where: { status: 'COMPLETED' },
    take: 5,
    select: {
      id: true,
      status: true,
      generatedCharId: true,
      gender: true,
      species: true,
      qualityScore: true,
      rejectionReason: true,
      createdAt: true,
    },
  });

  console.log('\n=== COMPLETED IMAGES (last 5) ===');
  completed.forEach(c => {
    console.log(`  [${c.id.substring(0, 8)}] status=${c.status}, charId=${c.generatedCharId}, gender=${c.gender}, Q=${c.qualityScore}`);
  });

  // Check PENDING images
  const pending = await prisma.curatedImage.count({ where: { status: 'PENDING' } });
  console.log(`\n  PENDING: ${pending}`);

  // Check PROCESSING images
  const processing = await prisma.curatedImage.count({ where: { status: 'PROCESSING' } });
  console.log(`  PROCESSING: ${processing}`);

  await prisma.$disconnect();
}

analyze().catch(console.error);
