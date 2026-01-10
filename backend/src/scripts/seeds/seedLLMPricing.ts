import { prisma } from '../../config/database';
import { LLMProvider } from '../../generated/prisma';

interface LLMPricingData {
  provider: LLMProvider;
  model: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  source: string;
  notes?: string;
}

/**
 * LLM Pricing data (as of January 2026)
 *
 * Sources:
 * - Google Gemini: https://ai.google.dev/gemini-api/docs/pricing
 * - OpenAI: https://openai.com/api/pricing/
 * - X.AI Grok: https://x.ai/api
 * - OpenRouter: https://openrouter.ai/docs/quickstart
 */
const LLM_PRICING_DATA: LLMPricingData[] = [
  // Google Gemini Pricing (Updated January 2026)
  {
    provider: 'GEMINI',
    model: 'gemini-3-pro-preview',
    inputPricePerMillion: 2.00, // $2.00 for prompts <= 200K tokens, $4.00 for > 200K tokens
    outputPricePerMillion: 12.00, // $12.00 for prompts <= 200K tokens, $18.00 for > 200K tokens
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
    notes: 'The best model in the world for multimodal understanding and most advanced reasoning/coding model yet. Pre-release. Higher pricing for >200K tokens. DOES NOT support NSFW content.',
  },
  {
    provider: 'GEMINI',
    model: 'gemini-3-flash-preview',
    inputPricePerMillion: 0.50,
    outputPricePerMillion: 3.00,
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
    notes: 'Most intelligent model created for speed. Combines frontier intelligence with superior research and grounding. Better than gemini-2.5-pro. DOES NOT support NSFW content.',
  },
  {
    provider: 'GEMINI',
    model: 'gemini-2.5-pro',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10.00,
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
    notes: 'Latest-gen versatile model, excels at coding and complex reasoning tasks. Price increases for >200K tokens. NOT RECOMMENDED - gemini-3-flash-preview is better.',
  },
  {
    provider: 'GEMINI',
    model: 'gemini-2.5-flash',
    inputPricePerMillion: 0.30,
    outputPricePerMillion: 2.50,
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
    notes: 'First hybrid reasoning model with 1M token context window and thinking budgets. DOES NOT support NSFW content.',
  },
  {
    provider: 'GEMINI',
    model: 'gemini-2.5-flash-lite',
    inputPricePerMillion: 0.10,
    outputPricePerMillion: 0.40,
    source: 'https://ai.google.dev/gemini-api/docs/pricing',
    notes: 'Smaller, most economical model created for large-scale use. Default for chat and translation. DOES NOT support NSFW content.',
  },

  // XAI Grok Pricing (Updated January 2026)
  {
    provider: 'GROK',
    model: 'grok-4-1-fast-non-reasoning',
    inputPricePerMillion: 0.20,
    outputPricePerMillion: 0.50,
    source: 'https://x.ai/api',
    notes: 'Next generation tool-calling agents. 2M context window. Excellent for image analysis with very low censorship. RECOMMENDED for NSFW image analysis.',
  },
  {
    provider: 'GROK',
    model: 'grok-4-1-fast-reasoning',
    inputPricePerMillion: 0.20,
    outputPricePerMillion: 0.50,
    source: 'https://x.ai/api',
    notes: 'Next generation tool-calling agents with reasoning. 2M context window. Supports NSFW content. RECOMMENDED for story/character generation.',
  },

  // OpenRouter Venice AI (Free uncensored model)
  {
    provider: 'GROQ', // Using GROQ as placeholder for OpenRouter
    model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    inputPricePerMillion: 0.00,
    outputPricePerMillion: 0.00,
    source: 'https://openrouter.ai/docs/quickstart',
    notes: 'Venice: Uncensored (free) - cognitivecomputations/dolphin-mistral-24b-venice-edition:free. FREE since 07/2025. Uncensored model, great for NSFW chat. Used by JanitorAI, ChubAI, SillyTavern.',
  },

  // OpenAI Pricing (Updated January 2026 - NOT RECOMMENDED)
  {
    provider: 'OPENAI',
    model: 'gpt-5.2',
    inputPricePerMillion: 1.75,
    outputPricePerMillion: 14.00,
    source: 'https://openai.com/api/pricing/',
    notes: 'Latest GPT-5.2 model. NOT competitive with Gemini/Grok pricing.',
  },
  {
    provider: 'OPENAI',
    model: 'gpt-5.1',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10.00,
    source: 'https://openai.com/api/pricing/',
    notes: 'GPT-5.1 model. NOT competitive with Gemini/Grok pricing.',
  },
  {
    provider: 'OPENAI',
    model: 'gpt-5',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 10.00,
    source: 'https://openai.com/api/pricing/',
    notes: 'GPT-5 model. NOT competitive with Gemini/Grok pricing.',
  },
  {
    provider: 'OPENAI',
    model: 'gpt-5-mini',
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 2.00,
    source: 'https://openai.com/api/pricing/',
    notes: 'Smaller GPT-5 model. Still more expensive than Gemini Flash-Lite.',
  },
  {
    provider: 'OPENAI',
    model: 'gpt-5-nano',
    inputPricePerMillion: 0.05,
    outputPricePerMillion: 0.40,
    source: 'https://openai.com/api/pricing/',
    notes: 'Fastest and cheapest GPT-5 model. Competitive with Gemini Flash-Lite.',
  },

  // Anthropic Claude Pricing (for reference/future use)
  {
    provider: 'ANTHROPIC',
    model: 'claude-3.5-sonnet',
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    source: 'https://docs.anthropic.com/',
    notes: 'Most intelligent model for complex tasks',
  },
  {
    provider: 'ANTHROPIC',
    model: 'claude-3.5-haiku',
    inputPricePerMillion: 0.80,
    outputPricePerMillion: 4.00,
    source: 'https://docs.anthropic.com/',
    notes: 'Fast and cost-efficient model',
  },
  {
    provider: 'ANTHROPIC',
    model: 'claude-3-haiku',
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
    source: 'https://docs.anthropic.com/',
    notes: 'Fastest Claude model',
  },
];

interface SeedLLMPricingOptions {
  verbose?: boolean;
  dryRun?: boolean;
  force?: boolean;
}

/**
 * Seed LLM pricing data
 */
export async function seedLLMPricing(
  options: SeedLLMPricingOptions = {}
): Promise<{ created: number; updated: number; skipped: number }> {
  const stats = { created: 0, updated: 0, skipped: 0 };

  console.log(`\n💰 Seeding ${LLM_PRICING_DATA.length} LLM pricing configuration(s)...`);

  for (const pricingData of LLM_PRICING_DATA) {
    try {
      // Check if pricing exists for this provider/model
      const existing = await prisma.lLMPricing.findFirst({
        where: {
          provider: pricingData.provider,
          model: pricingData.model,
          isActive: true,
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } }
          ]
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (existing && !options.force) {
        stats.skipped++;
        if (options.verbose) {
          console.log(`  ⏭️  Skipped (already exists): ${pricingData.provider}:${pricingData.model}`);
        }
        continue;
      }

      if (options.dryRun) {
        stats.created++;
        if (options.verbose) {
          console.log(`  [DRY RUN] Would create: ${pricingData.provider}:${pricingData.model}`);
        }
        continue;
      }

      if (existing && options.force) {
        // Deactivate old pricing and create new
        await prisma.lLMPricing.update({
          where: { id: existing.id },
          data: {
            isActive: false,
            effectiveTo: new Date(),
          },
        });

        // Create new pricing entry
        await prisma.lLMPricing.create({
          data: {
            provider: pricingData.provider,
            model: pricingData.model,
            inputPricePerMillion: pricingData.inputPricePerMillion,
            outputPricePerMillion: pricingData.outputPricePerMillion,
            source: pricingData.source,
            notes: pricingData.notes,
            isActive: true,
          },
        });

        stats.updated++;
        console.log(`  ✏️  Updated: ${pricingData.provider}:${pricingData.model}`);
      } else {
        // Create new pricing entry
        await prisma.lLMPricing.create({
          data: {
            provider: pricingData.provider,
            model: pricingData.model,
            inputPricePerMillion: pricingData.inputPricePerMillion,
            outputPricePerMillion: pricingData.outputPricePerMillion,
            source: pricingData.source,
            notes: pricingData.notes,
            isActive: true,
          },
        });

        stats.created++;
        console.log(`  ✅ Created: ${pricingData.provider}:${pricingData.model}`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing pricing "${pricingData.provider}:${pricingData.model}":`, error);
      throw error;
    }
  }

  return stats;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedLLMPricingOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    force: args.includes('--force') || args.includes('-f'),
  };

  seedLLMPricing(options)
    .then((stats) => {
      console.log(`\n📊 LLM Pricing seeded: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);
      return prisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      return prisma.$disconnect().then(() => process.exit(1));
    });
}
