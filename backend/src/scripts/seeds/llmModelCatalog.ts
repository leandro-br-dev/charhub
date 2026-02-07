/**
 * LLM Model Catalog Seed Script
 *
 * Populates the database with LLM models from the llm-models.json configuration.
 * Uses upsert pattern to avoid overwriting existing database values.
 */

import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ============================================================================
// Load models from JSON file
// ============================================================================

interface LLMModelJson {
  providers: {
    [key: string]: {
      name: string;
      baseUrl: string;
      models: {
        [key: string]: {
          name: string;
          performance: string;
          contextWindow: number;
          maxOutput: number;
          description: string;
        };
      };
    };
  };
}

function loadLLMModelsFromJson(): LLMModelJson {
  try {
    const jsonPath = join(__dirname, '../../../src/data/llm-models.json');
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('Failed to load llm-models.json:', error);
    return { providers: {} };
  }
}

// ============================================================================
// Model Category and Type Mapping
// ============================================================================

/**
 * Map performance rating to model category
 */
function mapPerformanceToCategory(performance: string): string {
  switch (performance) {
    case 'high':
      return 'REASONING';
    case 'medium':
      return 'CHAT';
    case 'fast':
      return 'CHAT';
    default:
      return 'CHAT';
  }
}

/**
 * Map model name to type
 */
function getModelType(_provider: string, modelName: string): string {
  // Vision models
  if (modelName.includes('vision') || modelName.includes('multimodal')) {
    return 'MULTIMODAL';
  }

  // Reasoning models
  if (modelName.includes('reasoning')) {
    return 'REASONING';
  }

  // Speech models
  if (modelName.includes('realtime') || modelName.includes('speech') || modelName.includes('tts') || modelName.includes('stt')) {
    return 'SPEECH';
  }

  // Default to text
  return 'TEXT';
}

/**
 * Determine if model supports tools based on name/description
 */
function supportsTools(modelName: string, description: string): boolean {
  const toolKeywords = ['tool', 'agent', 'function', 'gpt-4', 'gpt-5', 'gemini-2', 'gemini-3', 'grok'];
  const lowerName = modelName.toLowerCase();
  const lowerDesc = description.toLowerCase();

  return toolKeywords.some((keyword) => lowerName.includes(keyword) || lowerDesc.includes(keyword));
}

/**
 * Determine if model supports vision based on name/description
 */
function supportsVision(modelName: string, description: string): boolean {
  const visionKeywords = ['vision', 'multimodal', 'image', 'photo', 'visual'];
  const lowerName = modelName.toLowerCase();
  const lowerDesc = description.toLowerCase();

  return visionKeywords.some((keyword) => lowerName.includes(keyword) || lowerDesc.includes(keyword));
}

/**
 * Determine if model supports reasoning based on name/description
 */
function supportsReasoning(modelName: string, description: string): boolean {
  const reasoningKeywords = ['reasoning', 'thinking', 'o1', 'o3'];
  const lowerName = modelName.toLowerCase();
  const lowerDesc = description.toLowerCase();

  return reasoningKeywords.some((keyword) => lowerName.includes(keyword) || lowerDesc.includes(keyword));
}

// ============================================================================
// Seed Function
// ============================================================================

interface ModelSeedData {
  provider: string;
  name: string;
  displayName: string;
  category: string;
  type: string;
  contextWindow: number;
  maxOutput: number;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  description: string;
}

export async function seedLLMModelCatalog(options: { verbose?: boolean; dryRun?: boolean } = {}): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const stats: { created: number; skipped: number; errors: string[] } = { created: 0, skipped: 0, errors: [] };

  console.log('\n🤖 Seeding LLM model catalog...');

  // Load models from JSON
  const jsonData = loadLLMModelsFromJson();

  if (Object.keys(jsonData.providers).length === 0) {
    console.log('  ⚠️  No providers found in llm-models.json');
    return stats;
  }

  // Build array of model data
  const modelsToSeed: ModelSeedData[] = [];

  for (const [providerKey, providerData] of Object.entries(jsonData.providers)) {
    for (const [modelKey, modelData] of Object.entries(providerData.models)) {
      modelsToSeed.push({
        provider: providerKey,
        name: modelKey,
        displayName: modelData.name,
        category: mapPerformanceToCategory(modelData.performance),
        type: getModelType(providerKey, modelKey),
        contextWindow: modelData.contextWindow,
        maxOutput: modelData.maxOutput,
        supportsTools: supportsTools(modelKey, modelData.description),
        supportsVision: supportsVision(modelKey, modelData.description),
        supportsReasoning: supportsReasoning(modelKey, modelData.description),
        description: modelData.description,
      });
    }
  }

  console.log(`  Found ${modelsToSeed.length} models in configuration`);

  // Seed each model
  for (const modelData of modelsToSeed) {
    try {
      // Check if already exists
      const existing = await prisma.lLMModelCatalog.findFirst({
        where: {
          provider: modelData.provider,
          name: modelData.name,
        },
      });

      if (existing) {
        stats.skipped++;
        if (options.verbose) {
          console.log(`  ⏭️  Skipped (already exists): ${modelData.provider}/${modelData.name}`);
        }
        continue;
      }

      if (options.dryRun) {
        stats.created++;
        if (options.verbose) {
          console.log(`  [DRY RUN] Would create: ${modelData.provider}/${modelData.name}`);
        }
        continue;
      }

      // Create new model
      await prisma.lLMModelCatalog.create({
        data: {
          provider: modelData.provider,
          name: modelData.name,
          displayName: modelData.displayName,
          category: modelData.category as any,
          type: modelData.type as any,
          contextWindow: modelData.contextWindow,
          maxOutput: modelData.maxOutput,
          supportsTools: modelData.supportsTools,
          supportsVision: modelData.supportsVision,
          supportsReasoning: modelData.supportsReasoning,
          description: modelData.description,
          isActive: true,
          isAvailable: true,
        },
      });

      stats.created++;
      console.log(`  ✅ Created: ${modelData.provider}/${modelData.name} (${modelData.displayName})`);
    } catch (error) {
      const errorMsg = `Error processing "${modelData.provider}/${modelData.name}": ${error}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }

  console.log(`\n🤖 LLM model catalog: ${stats.created} created, ${stats.skipped} skipped`);

  if (stats.errors.length > 0) {
    console.log(`  ⚠️  ${stats.errors.length} error(s) occurred`);
  }

  return stats;
}

// ============================================================================
// Run seed if called directly
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
  };

  seedLLMModelCatalog(options)
    .then(() => {
      return prisma.$disconnect();
    })
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      return prisma.$disconnect()
        .then(() => pool.end())
        .then(() => process.exit(1));
    });
}
