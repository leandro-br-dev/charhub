import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PrismaClient, Visibility, AuthProvider, AgeRating, ContentTag, UserRole } from '../generated/prisma';
import { seedAllTags } from './seedTags';

const prisma = new PrismaClient();

const DATA_DIR = path.resolve(__dirname, '../data');

interface SeedOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

interface SeedStats {
  users: { created: number; skipped: number };
  characters: { created: number; skipped: number };
  tags: { created: number; updated: number; unchanged: number };
  errors: string[];
}

/**
 * Read JSON data file
 */
async function readDataFile<T>(filename: string): Promise<T | null> {
  const filePath = path.join(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

/**
 * Seed system users
 */
async function seedUsers(options: SeedOptions): Promise<{ created: number; skipped: number }> {
  const stats = { created: 0, skipped: 0 };

  interface SystemUser {
    id: string;
    provider: string;
    providerAccountId: string;
    username: string;
    displayName: string;
    email: string;
    role: string;
    fullName: string;
    preferredLanguage: string;
    maxAgeRating: string;
    blockedTags: string[];
    isSystemUser?: boolean;
  }

  const data = await readDataFile<{ description: string; users: SystemUser[] }>('system-users.json');

  if (!data || !data.users) {
    console.log('⚠️  No system users data found');
    return stats;
  }

  console.log(`\n👤 Seeding ${data.users.length} system user(s)...`);

  for (const userData of data.users) {
    try {
      const existing = await prisma.user.findUnique({
        where: { id: userData.id },
      });

      if (existing && !options.force) {
        stats.skipped++;
        if (options.verbose) {
          console.log(`  ⏭️  Skipped (already exists): ${userData.username}`);
        }
        continue;
      }

      if (options.dryRun) {
        stats.created++;
        if (options.verbose) {
          console.log(`  [DRY RUN] Would create: ${userData.username}`);
        }
        continue;
      }

      const now = new Date();

      if (existing && options.force) {
        // Update existing
        await prisma.user.update({
          where: { id: userData.id },
          data: {
            displayName: userData.displayName,
            email: userData.email,
            role: userData.role as UserRole,
            fullName: userData.fullName,
            preferredLanguage: userData.preferredLanguage,
            maxAgeRating: userData.maxAgeRating as AgeRating,
            blockedTags: userData.blockedTags as ContentTag[],
            updatedAt: now,
          },
        });
        console.log(`  ✏️  Updated: ${userData.username}`);
      } else {
        // Create new
        await prisma.user.create({
          data: {
            id: userData.id,
            provider: userData.provider as AuthProvider,
            providerAccountId: userData.providerAccountId,
            username: userData.username,
            displayName: userData.displayName,
            email: userData.email,
            role: userData.role as UserRole,
            fullName: userData.fullName,
            preferredLanguage: userData.preferredLanguage,
            maxAgeRating: userData.maxAgeRating as AgeRating,
            blockedTags: userData.blockedTags as ContentTag[],
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
          },
        });
        stats.created++;
        console.log(`  ✅ Created: ${userData.username}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing user "${userData.username}":`, error);
      throw error;
    }
  }

  return stats;
}

/**
 * Seed system characters
 */
async function seedCharacters(options: SeedOptions): Promise<{ created: number; skipped: number }> {
  const stats = { created: 0, skipped: 0 };

  interface SystemCharacter {
    id: string;
    userId: string;
    firstName: string;
    lastName: string | null;
    age: number | null;
    gender: string | null;
    species: string | null;
    style: string | null;
    avatar: string | null;
    physicalCharacteristics: string | null;
    personality: string | null;
    history: string | null;
    visibility: string;
    isSystemCharacter: boolean;
    ageRating: string;
    contentTags: string[];
  }

  const data = await readDataFile<{ description: string; characters: SystemCharacter[] }>(
    'system-characters.json'
  );

  if (!data || !data.characters) {
    console.log('⚠️  No system characters data found');
    return stats;
  }

  console.log(`\n🎭 Seeding ${data.characters.length} system character(s)...`);

  for (const charData of data.characters) {
    try {
      const existing = await prisma.character.findUnique({
        where: { id: charData.id },
      });

      if (existing && !options.force) {
        stats.skipped++;
        if (options.verbose) {
          console.log(`  ⏭️  Skipped (already exists): ${charData.firstName}`);
        }
        continue;
      }

      if (options.dryRun) {
        stats.created++;
        if (options.verbose) {
          console.log(`  [DRY RUN] Would create: ${charData.firstName}`);
        }
        continue;
      }

      const now = new Date();

      if (existing && options.force) {
        // Update existing
        await prisma.character.update({
          where: { id: charData.id },
          data: {
            firstName: charData.firstName,
            lastName: charData.lastName,
            age: charData.age,
            gender: charData.gender,
            species: charData.species,
            style: charData.style,
            avatar: charData.avatar,
            physicalCharacteristics: charData.physicalCharacteristics,
            personality: charData.personality,
            history: charData.history,
            visibility: charData.visibility as Visibility,
            ageRating: charData.ageRating as AgeRating,
            contentTags: charData.contentTags as ContentTag[],
            updatedAt: now,
          },
        });
        console.log(`  ✏️  Updated: ${charData.firstName}`);
      } else {
        // Create new
        await prisma.character.create({
          data: {
            id: charData.id,
            userId: charData.userId,
            firstName: charData.firstName,
            lastName: charData.lastName,
            age: charData.age,
            gender: charData.gender,
            species: charData.species,
            style: charData.style,
            avatar: charData.avatar,
            physicalCharacteristics: charData.physicalCharacteristics,
            personality: charData.personality,
            history: charData.history,
            visibility: charData.visibility as Visibility,
            isSystemCharacter: charData.isSystemCharacter,
            ageRating: charData.ageRating as AgeRating,
            contentTags: charData.contentTags as ContentTag[],
            createdAt: now,
            updatedAt: now,
          },
        });
        stats.created++;
        console.log(`  ✅ Created: ${charData.firstName}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing character "${charData.firstName}":`, error);
      throw error;
    }
  }

  return stats;
}

/**
 * Main seed function
 */
async function seed(options: SeedOptions = {}): Promise<void> {
  console.log('🌱 Starting database seed...\n');
  console.log('='.repeat(60));

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  if (options.force) {
    console.log('⚠️  FORCE MODE - Will overwrite existing data');
  }
  console.log('='.repeat(60));

  const stats: SeedStats = {
    users: { created: 0, skipped: 0 },
    characters: { created: 0, skipped: 0 },
    tags: { created: 0, updated: 0, unchanged: 0 },
    errors: [],
  };

  const startTime = Date.now();

  try {
    // 1. Seed system users first (required for character ownership)
    stats.users = await seedUsers(options);

    // 2. Seed system characters (narrator, etc)
    stats.characters = await seedCharacters(options);

    // 3. Seed tags (character, story, asset tags)
    console.log('\n🏷️  Seeding tags...');

    // Capture tag seeding output
    const tagOptions = {
      verbose: options.verbose,
      dryRun: options.dryRun,
    };

    // Run tag seeding (it prints its own output)
    await seedAllTags(tagOptions);

    // Note: seedAllTags prints its own stats, so we don't duplicate them here

  } catch (error) {
    stats.errors.push(String(error));
    console.error('\n❌ Seed failed:', error);
    throw error;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`Users:      ${stats.users.created} created, ${stats.users.skipped} skipped`);
  console.log(`Characters: ${stats.characters.created} created, ${stats.characters.skipped} skipped`);
  console.log(`Duration:   ${duration}s`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} error(s) occurred`);
  }

  if (options.dryRun) {
    console.log('\n⚠️  This was a dry run - no changes were made');
  } else {
    console.log('\n✅ Database seeded successfully!');
  }

  console.log('='.repeat(60));
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    force: args.includes('--force') || args.includes('-f'),
  };

  seed(options)
    .then(() => {
      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}

export { seed };
