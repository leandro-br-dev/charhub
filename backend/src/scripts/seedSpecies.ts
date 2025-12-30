import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { prisma } from '../config/database';
import type { AgeRating, ContentTag } from '../generated/prisma';

// Data source for species definitions (seed file)
const SPECIES_DATA_FILE = path.resolve(__dirname, '../data/species/species.json');

// Translation output directory
const TRANSLATIONS_ROOT = path.resolve(__dirname, '../../translations');
const SOURCE_FOLDER = '_source';

const SPECIES_NAMESPACE = 'species';

interface SpeciesDefinition {
  name: string;
  category: string;
  ageRating: string;
  contentTags: string[];
  description?: string;
  weight?: number;
}

interface SpeciesSourceFile {
  description: string;
  species: SpeciesDefinition[];
}

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
 * Read species definition file from data directory (seed source)
 */
async function readSpeciesDataFile(): Promise<SpeciesSourceFile> {
  const filePath = SPECIES_DATA_FILE;
  if (!existsSync(filePath)) {
    throw new Error(`Species data file not found: ${filePath}`);
  }
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as SpeciesSourceFile;
}

/**
 * Generate/sync translation source file from species data
 * Ensures each species key exists with object form: { name, description }
 * Never overwrites existing translator-provided values; only fills missing keys/fields.
 */
async function generateTranslationSourceFile(speciesData: SpeciesSourceFile): Promise<void> {
  const outputPath = path.join(TRANSLATIONS_ROOT, SOURCE_FOLDER, `${SPECIES_NAMESPACE}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const existing: any = {
    description: speciesData.description,
    resources: {} as Record<string, any>
  };

  if (existsSync(outputPath)) {
    try {
      const raw = await fs.readFile(outputPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        existing.description = parsed.description || speciesData.description;
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

  // Merge species definitions
  let changed = false;
  for (const spec of speciesData.species) {
    const key = spec.name;
    const current = existing.resources[key];
    if (!current) {
      existing.resources[key] = { name: spec.name, description: spec.description || '' };
      changed = true;
    } else {
      // Fill missing fields only
      if (current.name == null) {
        current.name = spec.name;
        changed = true;
      }
      if (current.description == null) {
        current.description = spec.description || '';
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
 * Seed species from the data file into the database
 */
async function seedSpecies(options: SeedOptions = {}): Promise<SeedStats> {
  const stats: SeedStats = {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
  };

  const sourceFile = await readSpeciesDataFile();

  // Generate translation source file
  if (!options.dryRun) {
    await generateTranslationSourceFile(sourceFile);
    if (options.verbose) {
      console.log(`  📝 Generated translation source: ${SPECIES_NAMESPACE}.json`);
    }
  }

  if (options.verbose) {
    console.log(`  Processing ${sourceFile.species.length} species...`);
  }

  for (const speciesDef of sourceFile.species) {
    try {
      // Check if species already exists
      const existing = await prisma.species.findUnique({
        where: { name: speciesDef.name },
      });

      if (existing) {
        // Check if update is needed
        const needsUpdate =
          existing.ageRating !== speciesDef.ageRating ||
          existing.category !== speciesDef.category ||
          (speciesDef.description !== undefined && existing.description !== speciesDef.description) ||
          (speciesDef.weight !== undefined && existing.weight !== speciesDef.weight) ||
          JSON.stringify(existing.contentTags.sort()) !== JSON.stringify((speciesDef.contentTags || []).sort());

        if (needsUpdate) {
          if (!options.dryRun) {
            await prisma.species.update({
              where: { id: existing.id },
              data: {
                ageRating: speciesDef.ageRating as AgeRating,
                category: speciesDef.category,
                description: speciesDef.description,
                weight: speciesDef.weight,
                contentTags: (speciesDef.contentTags || []) as ContentTag[],
              },
            });
          }
          stats.updated++;
          if (options.verbose) {
            console.log(`  ✏️  Updated: ${speciesDef.name}`);
          }
        } else {
          stats.unchanged++;
          if (options.verbose) {
            console.log(`  ✓ Unchanged: ${speciesDef.name}`);
          }
        }
      } else {
        // Create new species
        if (!options.dryRun) {
          await prisma.species.create({
            data: {
              name: speciesDef.name,
              category: speciesDef.category,
              ageRating: speciesDef.ageRating as AgeRating,
              description: speciesDef.description,
              weight: speciesDef.weight ?? 1,
              contentTags: (speciesDef.contentTags || []) as ContentTag[],
              searchable: true,
            },
          });
        }
        stats.created++;
        if (options.verbose) {
          console.log(`  ➕ Created: ${speciesDef.name}`);
        }
      }
    } catch (error) {
      stats.errors++;
      console.error(`  ❌ Error processing species "${speciesDef.name}":`, error);
    }
  }

  return stats;
}

/**
 * Seed all species into the database
 */
async function seedAllSpecies(options: SeedOptions = {}): Promise<void> {
  console.log('🧬 Seeding species to database...\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const startTime = Date.now();

  try {
    const stats = await seedSpecies(options);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log(`Total Created:   ${stats.created}`);
    console.log(`Total Updated:   ${stats.updated}`);
    console.log(`Total Unchanged: ${stats.unchanged}`);
    if (stats.errors > 0) {
      console.log(`Total Errors:    ${stats.errors}`);
    }
    console.log(`Duration:        ${duration}s`);

    if (options.dryRun) {
      console.log('\n⚠️  This was a dry run - no changes were made');
    } else {
      console.log('\n🎉 Species seeding complete!');
    }
  } catch (error) {
    console.error('❌ Failed to seed species:', error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
  };

  seedAllSpecies(options)
    .then(() => {
      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Seed failed:', error);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}

export { seedAllSpecies, seedSpecies };
