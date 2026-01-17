import { prisma } from '../config/database';

async function analyzeCharacterStats() {
  console.log('=== CHARHUB CHARACTER STATISTICS ANALYSIS ===\n');

  // 1. Total active characters (PUBLIC, not system characters)
  const totalActive = await prisma.character.count({
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
    },
  });
  console.log(`📊 TOTAL ACTIVE CHARACTERS: ${totalActive}\n`);

  // 2. Gender distribution
  console.log('👤 GENDER DISTRIBUTION:');
  const genderDistribution = await prisma.character.groupBy({
    by: ['gender'],
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
    },
    _count: true,
  });

  const totalWithGender = genderDistribution.reduce((sum, g) => sum + g._count, 0);
  genderDistribution.forEach(g => {
    const percentage = totalWithGender > 0 ? ((g._count / totalWithGender) * 100).toFixed(1) : 0;
    console.log(`   ${g.gender}: ${g._count} (${percentage}%)`);
  });
  console.log(`   (Unknown/Null: ${totalActive - totalWithGender})\n`);

  // 3. Species distribution
  console.log('🦎 SPECIES DISTRIBUTION (Top 15):');
  const speciesDistribution = await prisma.species.findMany({
    select: {
      name: true,
      category: true,
      _count: {
        select: {
          characters: {
            where: {
              visibility: 'PUBLIC',
              isSystemCharacter: false,
            },
          },
        },
      },
    },
    orderBy: {
      characters: {
        _count: 'desc',
      },
    },
    take: 15,
  });

  speciesDistribution.forEach(s => {
    if (s._count.characters > 0) {
      const percentage = totalActive > 0 ? ((s._count.characters / totalActive) * 100).toFixed(1) : 0;
      console.log(`   ${s.name} (${s.category}): ${s._count.characters} (${percentage}%)`);
    }
  });

  // Count characters with no species
  const noSpecies = await prisma.character.count({
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
      speciesId: null,
    },
  });
  if (noSpecies > 0) {
    const percentage = totalActive > 0 ? ((noSpecies / totalActive) * 100).toFixed(1) : 0;
    console.log(`   (No Species): ${noSpecies} (${percentage}%)`);
  }
  console.log();

  // 4. Daily generation rate (last 30 days)
  console.log('📅 DAILY GENERATION RATE (Last 30 Days):');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyStats = await prisma.$queryRaw`
    SELECT
      DATE("createdAt") as date,
      COUNT(*) as count
    FROM "Character"
    WHERE "visibility" = 'PUBLIC'
      AND "isSystemCharacter" = false
      AND "createdAt" >= ${thirtyDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date DESC
  ` as { date: Date; count: bigint }[];

  if (dailyStats.length === 0) {
    console.log('   No data available for the last 30 days.');
  } else {
    const totalGenerated = dailyStats.reduce((sum, d) => sum + Number(d.count), 0);
    const avgDaily = totalGenerated / dailyStats.length;
    console.log(`   Average daily: ${avgDaily.toFixed(1)} characters/day`);
    console.log(`   Total last 30 days: ${totalGenerated} characters`);

    // Show last 7 days
    console.log('\n   Last 7 Days:');
    dailyStats.slice(0, 7).forEach(d => {
      const dateStr = new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      console.log(`     ${dateStr}: ${d.count} characters`);
    });
  }
  console.log();

  // 5. Visual Style distribution
  console.log('🎨 VISUAL STYLE DISTRIBUTION:');
  const styleDistribution = await prisma.character.groupBy({
    by: ['style'],
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
    },
    _count: true,
  });

  styleDistribution.forEach(s => {
    const percentage = totalActive > 0 ? ((s._count / totalActive) * 100).toFixed(1) : 0;
    console.log(`   ${s.style}: ${s._count} (${percentage}%)`);
  });
  console.log();

  // 6. Age Rating distribution
  console.log('🏷️ AGE RATING DISTRIBUTION:');
  const ageRatingDistribution = await prisma.character.groupBy({
    by: ['ageRating'],
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
    },
    _count: true,
  });

  ageRatingDistribution.forEach(ar => {
    const percentage = totalActive > 0 ? ((ar._count / totalActive) * 100).toFixed(1) : 0;
    console.log(`   ${ar.ageRating}: ${ar._count} (${percentage}%)`);
  });
  console.log();

  // 7. Characters with images
  console.log('🖼️ IMAGE STATISTICS:');
  const charactersWithAvatar = await prisma.character.count({
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
      images: {
        some: {
          type: 'AVATAR',
        },
      },
    },
  });

  const charactersWithCover = await prisma.character.count({
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
      images: {
        some: {
          type: 'COVER',
        },
      },
    },
  });

  console.log(`   With avatar image: ${charactersWithAvatar} (${((charactersWithAvatar / totalActive) * 100).toFixed(1)}%)`);
  console.log(`   With cover image: ${charactersWithCover} (${((charactersWithCover / totalActive) * 100).toFixed(1)}%)`);
  console.log();

  // 8. Generation trend (this week vs last week)
  console.log('📈 GENERATION TREND:');
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setMilliseconds(lastWeekEnd.getMilliseconds() - 1);

  const thisWeekCount = await prisma.character.count({
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
      createdAt: {
        gte: thisWeekStart,
      },
    },
  });

  const lastWeekCount = await prisma.character.count({
    where: {
      visibility: 'PUBLIC',
      isSystemCharacter: false,
      createdAt: {
        gte: lastWeekStart,
        lt: lastWeekEnd,
      },
    },
  });

  console.log(`   This week: ${thisWeekCount} characters`);
  console.log(`   Last week: ${lastWeekCount} characters`);

  if (lastWeekCount > 0) {
    const change = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
    const trend = change >= 0 ? '📈' : '📉';
    console.log(`   ${trend} Change: ${change >= 0 ? '+' : ''}${change.toFixed(1)}%`);
  }
  console.log();

  await prisma.$disconnect();
}

analyzeCharacterStats().catch(console.error);
