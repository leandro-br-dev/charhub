"use strict";
/**
 * System Configuration Seed Script
 *
 * Populates the database with default system configuration parameters.
 * Uses upsert pattern to avoid overwriting existing database values.
 *
 * Format: type:<string|number|boolean|enum>|min:<n>|max:<n>|options:<a,b,c>|<human description>
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSystemConfiguration = seedSystemConfiguration;
const prisma_1 = require("../../src/generated/prisma");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg_1.Pool({ connectionString });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new prisma_1.PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
/**
 * All 20 configuration parameters to seed
 */
const CONFIG_PARAMETERS = [
    // ========================================
    // Category: translation (4 parameters)
    // ========================================
    {
        key: 'translation.default_provider',
        envVar: 'TRANSLATION_DEFAULT_PROVIDER',
        defaultValue: 'gemini',
        category: 'translation',
        description: 'type:string|options:gemini,openai,grok|LLM provider for translations',
    },
    {
        key: 'translation.default_model',
        envVar: 'TRANSLATION_DEFAULT_MODEL',
        defaultValue: 'gemini-2.5-flash-lite',
        category: 'translation',
        description: 'type:string|LLM model for translations',
    },
    {
        key: 'translation.cache_ttl',
        envVar: 'TRANSLATION_CACHE_TTL',
        defaultValue: 3600,
        category: 'translation',
        description: 'type:number|min:60|max:86400|Translation cache TTL in seconds',
    },
    {
        key: 'translation.enable_pre_translation',
        envVar: 'TRANSLATION_ENABLE_PRE_TRANSLATION',
        defaultValue: false,
        category: 'translation',
        description: 'type:boolean|Enable pre-translation of content',
    },
    // ========================================
    // Category: context (1 parameter)
    // ========================================
    {
        key: 'context.max_tokens',
        envVar: 'MAX_CONTEXT_TOKENS',
        defaultValue: 8000,
        category: 'context',
        description: 'type:number|min:1000|max:128000|Max context window tokens for chat memory',
    },
    // ========================================
    // Category: generation (5 parameters)
    // ========================================
    {
        key: 'generation.daily_limit',
        envVar: 'GENERATION_DAILY_LIMIT',
        defaultValue: 5,
        category: 'generation',
        description: 'type:number|min:0|max:100|Daily character generation limit per user',
    },
    {
        key: 'generation.batch_enabled',
        envVar: 'BATCH_GENERATION_ENABLED',
        defaultValue: false,
        category: 'generation',
        description: 'type:boolean|Enable automated batch character generation',
    },
    {
        key: 'generation.batch_size_per_run',
        envVar: 'BATCH_SIZE_PER_RUN',
        defaultValue: 24,
        category: 'generation',
        description: 'type:number|min:1|max:100|Max characters per batch generation run',
    },
    {
        key: 'generation.batch_retry_attempts',
        envVar: 'BATCH_RETRY_ATTEMPTS',
        defaultValue: 3,
        category: 'generation',
        description: 'type:number|min:0|max:10|Retry attempts for failed generations',
    },
    {
        key: 'generation.batch_timeout_minutes',
        envVar: 'BATCH_TIMEOUT_MINUTES',
        defaultValue: 5,
        category: 'generation',
        description: 'type:number|min:1|max:60|Timeout per generation job in minutes',
    },
    // ========================================
    // Category: correction (3 parameters)
    // ========================================
    {
        key: 'correction.enabled',
        envVar: 'CORRECTION_ENABLED',
        defaultValue: true,
        category: 'correction',
        description: 'type:boolean|Enable automated correction flows',
    },
    {
        key: 'correction.avatar_daily_limit',
        envVar: 'CORRECTION_AVATAR_DAILY_LIMIT',
        defaultValue: 5,
        category: 'correction',
        description: 'type:number|min:0|max:100|Daily avatar correction limit',
    },
    {
        key: 'correction.data_daily_limit',
        envVar: 'CORRECTION_DATA_DAILY_LIMIT',
        defaultValue: 10,
        category: 'correction',
        description: 'type:number|min:0|max:200|Daily data completeness correction limit',
    },
    // ========================================
    // Category: curation (4 parameters)
    // ========================================
    {
        key: 'curation.search_keywords',
        envVar: 'CIVITAI_SEARCH_KEYWORDS',
        defaultValue: 'anime,fantasy,sci-fi',
        category: 'curation',
        description: 'type:string|Comma-separated search keywords for Civitai curation',
    },
    {
        key: 'curation.anime_model_ids',
        envVar: 'CIVITAI_ANIME_MODEL_IDS',
        defaultValue: '',
        category: 'curation',
        description: 'type:string|Comma-separated Civitai model IDs for anime style',
    },
    {
        key: 'curation.auto_approval_threshold',
        envVar: 'AUTO_APPROVAL_THRESHOLD',
        defaultValue: 4.5,
        category: 'curation',
        description: 'type:number|min:0|max:5|Quality threshold for auto-approval (0-5)',
    },
    {
        key: 'curation.require_manual_review',
        envVar: 'REQUIRE_MANUAL_REVIEW',
        defaultValue: false,
        category: 'curation',
        description: 'type:boolean|Require manual review for curated images',
    },
    // ========================================
    // Category: moderation (2 parameters)
    // ========================================
    {
        key: 'moderation.nsfw_filter_enabled',
        envVar: 'NSFW_FILTER_ENABLED',
        defaultValue: true,
        category: 'moderation',
        description: 'type:boolean|Enable NSFW content filtering',
    },
    {
        key: 'moderation.nsfw_filter_strictness',
        envVar: 'NSFW_FILTER_STRICTNESS',
        defaultValue: 'medium',
        category: 'moderation',
        description: 'type:enum|options:low,medium,high|NSFW filter strictness level',
    },
    // ========================================
    // Category: scheduling (1 parameter)
    // ========================================
    {
        key: 'scheduling.daily_curation_hour',
        envVar: 'DAILY_CURATION_HOUR',
        defaultValue: 3,
        category: 'scheduling',
        description: 'type:number|min:0|max:23|Hour (UTC) for daily curation job',
    },
];
/**
 * Seed system configuration parameters
 * Uses upsert with empty update to preserve existing database values
 */
async function seedSystemConfiguration(options = {}) {
    const stats = { created: 0, skipped: 0, errors: [] };
    console.log('\n⚙️  Seeding system configuration parameters...');
    for (const param of CONFIG_PARAMETERS) {
        try {
            // Get value from .env or use default
            const envValue = process.env[param.envVar];
            const value = envValue ?? String(param.defaultValue);
            // Check if already exists
            const existing = await prisma.systemConfiguration.findUnique({
                where: { key: param.key },
            });
            if (existing) {
                stats.skipped++;
                if (options.verbose) {
                    console.log(`  ⏭️  Skipped (already exists): ${param.key}`);
                }
                continue;
            }
            if (options.dryRun) {
                stats.created++;
                if (options.verbose) {
                    console.log(`  [DRY RUN] Would create: ${param.key} = ${value}`);
                }
                continue;
            }
            // Create new configuration
            await prisma.systemConfiguration.create({
                data: {
                    key: param.key,
                    value: String(value),
                    description: param.description,
                    category: param.category,
                },
            });
            stats.created++;
            console.log(`  ✅ Created: ${param.key} = ${value}`);
        }
        catch (error) {
            const errorMsg = `Error processing "${param.key}": ${error}`;
            stats.errors.push(errorMsg);
            console.error(`  ❌ ${errorMsg}`);
        }
    }
    console.log(`\n⚙️  System configuration: ${stats.created} created, ${stats.skipped} skipped`);
    if (stats.errors.length > 0) {
        console.log(`  ⚠️  ${stats.errors.length} error(s) occurred`);
    }
    return stats;
}
// Run seed if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        dryRun: args.includes('--dry-run') || args.includes('--dry'),
    };
    seedSystemConfiguration(options)
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
//# sourceMappingURL=systemConfiguration.js.map