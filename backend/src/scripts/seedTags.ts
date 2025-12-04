import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { PrismaClient } from '../generated/prisma';
import type { TagSourceFile } from '../types/tags';
import type { AgeRating, ContentTag, TagType } from '../generated/prisma';

const prisma = new PrismaClient();

// Data source for tag definitions (seed files)
const TAGS_DATA_DIR = path.resolve(__dirname, '../data/tags');

// Translation output directory
const TRANSLATIONS_ROOT = path.resolve(__dirname, '../../translations');
const SOURCE_FOLDER = '_source';

// Tag source files to process
const TAG_FILES = ['tags-character', 'tags-story', 'tags-asset'] as const;

interface SeedOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

interface SeedStats {
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
}

/**
 * Read tag definition file from data directory (seed source)
 */
async function readTagDataFile(namespace: string): Promise<TagSourceFile | null> {
  const filePath = path.join(TAGS_DATA_DIR, `${namespace}.json`);
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as TagSourceFile;
}

/**
 * Generate/sync translation source file from tag data
 * Ensures each tag key exists with object form: { name, description }
 * Never overwrites existing translator-provided values; only fills missing keys/fields.
 */
async function generateTranslationSourceFile(namespace: string, tagData: TagSourceFile): Promise<void> {
  const outputPath = path.join(TRANSLATIONS_ROOT, SOURCE_FOLDER, `${namespace}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const existing: any = { description: tagData.description, resources: {} as Record<string, any> };

  if (existsSync(outputPath)) {
    try {
      const raw = await fs.readFile(outputPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        existing.description = parsed.description || tagData.description;
        // Normalize resources to object form
        const res = parsed.resources || {};
        const normalized: Record<string, any> = {};
        Object.keys(res).forEach((key) => {
          const entry = (res as any)[key];
          if (typeof entry === 'string') {
            normalized[key] = { name: key, description: entry };
          } else if (entry && typeof entry === 'object') {
            normalized[key] = { ...entry };
            if (normalized[key].name == null) normalized[key].name = key;
            if (normalized[key].description == null) normalized[key].description = '';
          }
        });
        existing.resources = normalized;
      }
    } catch (_e) {
      // Keep defaults on parse error
      existing.resources = {};
    }
  }

  // Merge tag definitions
  let changed = false;
  for (const tag of tagData.tags) {
    const key = tag.name;
    const current = existing.resources[key];
    if (!current) {
      existing.resources[key] = { name: tag.name, description: tag.description || '' };
      changed = true;
    } else {
      // Fill missing fields only
      if (current.name == null) {
        current.name = tag.name;
        changed = true;
      }
      if (current.description == null) {
        current.description = tag.description || '';
        changed = true;
      }
    }
  }

  // Only write if new file or we filled fields/new keys
  if (!existsSync(outputPath) || changed) {
    const payload = JSON.stringify(
      { description: existing.description, resources: existing.resources },
      null,
      2
    ) + '\n';
    await fs.writeFile(outputPath, payload, 'utf8');
  }
}

/**
 * Seed tags from a data file into the database and generate translation source
 */
async function seedTagFile(namespace: string, options: SeedOptions): Promise<SeedStats> {
  const stats: SeedStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
  };

  const sourceFile = await readTagDataFile(namespace);
  if (!sourceFile) {
    throw new Error(`Tag data file "${namespace}" not found in ${TAGS_DATA_DIR}`);
  }

  // Generate translation source file
  if (!options.dryRun) {
    await generateTranslationSourceFile(namespace, sourceFile);
    if (options.verbose) {
      console.log(`  📝 Generated translation source: ${namespace}.json`);
    }
  }

  if (options.verbose) {
    console.log(`  Processing ${sourceFile.tags.length} tags from ${namespace}...`);
  }

  for (const tagDef of sourceFile.tags) {
    try {
      // Check if tag already exists
      const existing = await prisma.tag.findUnique({
        where: {
          name_type: {
            name: tagDef.name,
            type: tagDef.type as TagType,
          },
        },
      });

      if (existing) {
        // Check if update is needed
        const needsUpdate =
          existing.ageRating !== tagDef.ageRating ||
          JSON.stringify(existing.contentTags.sort()) !== JSON.stringify(tagDef.contentTags.sort());

        if (needsUpdate) {
          if (!options.dryRun) {
            await prisma.tag.update({
              where: { id: existing.id },
              data: {
                ageRating: tagDef.ageRating as AgeRating,
                contentTags: tagDef.contentTags as ContentTag[],
              },
            });
          }
          stats.updated++;
          if (options.verbose) {
            console.log(`    ✏️  Updated: ${tagDef.name} (${tagDef.type})`);
          }
        } else {
          stats.unchanged++;
          if (options.verbose) {
            console.log(`    ✓ Unchanged: ${tagDef.name} (${tagDef.type})`);
          }
        }
      } else {
        // Create new tag
        if (!options.dryRun) {
          await prisma.tag.create({
            data: {
              name: tagDef.name,
              type: tagDef.type as TagType,
              ageRating: tagDef.ageRating as AgeRating,
              contentTags: tagDef.contentTags as ContentTag[],
              searchable: true,
            },
          });
        }
        stats.created++;
        if (options.verbose) {
          console.log(`    ➕ Created: ${tagDef.name} (${tagDef.type})`);
        }
      }
    } catch (error) {
      stats.errors++;
      console.error(`    ❌ Error processing tag "${tagDef.name}":`, error);
    }
  }

  return stats;
}

/**
 * Seed all tag files into the database
 */
async function seedAllTags(options: SeedOptions = {}): Promise<void> {
  console.log('🏷️  Seeding tags to database...\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const totalStats: SeedStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
  };

  const startTime = Date.now();

  for (const tagFile of TAG_FILES) {
    console.log(`\n📄 Processing ${tagFile}...`);

    try {
      const stats = await seedTagFile(tagFile, options);

      totalStats.created += stats.created;
      totalStats.updated += stats.updated;
      totalStats.unchanged += stats.unchanged;
      totalStats.errors += stats.errors;

      console.log(`  ✅ Complete:`);
      console.log(`     Created: ${stats.created}`);
      console.log(`     Updated: ${stats.updated}`);
      console.log(`     Unchanged: ${stats.unchanged}`);
      if (stats.errors > 0) {
        console.log(`     Errors: ${stats.errors}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to process ${tagFile}:`, error);
      totalStats.errors++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`Total Created:   ${totalStats.created}`);
  console.log(`Total Updated:   ${totalStats.updated}`);
  console.log(`Total Unchanged: ${totalStats.unchanged}`);
  if (totalStats.errors > 0) {
    console.log(`Total Errors:    ${totalStats.errors}`);
  }
  console.log(`Duration:        ${duration}s`);

  if (options.dryRun) {
    console.log('\n⚠️  This was a dry run - no changes were made');
  } else {
    console.log('\n🎉 Tag seeding complete!');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
  };

  seedAllTags(options)
    .then(() => {
      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Seed failed:', error);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}

export { seedAllTags, seedTagFile };
