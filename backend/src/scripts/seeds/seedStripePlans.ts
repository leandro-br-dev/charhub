/**
 * Seed Stripe Plans
 *
 * This script creates Stripe Products and Prices and updates the database plans
 * Can be run standalone or as part of main seed
 */

import Stripe from 'stripe';
import { PrismaClient } from '../../generated/prisma';
import { prisma as dbPrisma } from '../../config/database';
import { config } from 'dotenv';

// Load environment variables
config();

interface SeedOptions {
  verbose?: boolean;
  dryRun?: boolean;
  prisma?: PrismaClient;
}

/**
 * Seed Stripe plans (create products and prices, update database)
 * Returns stats: { configured: number, skipped: number }
 */
export async function seedStripePlans(options: SeedOptions = {}): Promise<{ configured: number; skipped: number }> {
  const prisma = options.prisma || dbPrisma;
  const stats = { configured: 0, skipped: 0 };

  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    console.log('⚠️  STRIPE_SECRET_KEY not set - skipping Stripe plans configuration');
    return stats;
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2025-02-24.acacia',
  });

  if (options.verbose) {
    console.log('🚀 Starting Stripe plans seeding...\n');
  }

  try {
    // Get all active plans from database
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
    });

    if (options.verbose) {
      console.log(`📋 Found ${plans.length} plans in database\n`);
    }

    for (const plan of plans) {
      // Skip FREE tier (no payment required)
      if (plan.tier === 'FREE') {
        stats.skipped++;
        if (options.verbose) {
          console.log(`⏭️  Skipping ${plan.name} (FREE tier)`);
        }
        continue;
      }

      // Check if plan already has Stripe configuration
      if (plan.stripePriceId) {
        stats.skipped++;
        if (options.verbose) {
          console.log(`✅ ${plan.name} already configured with Stripe`);
          console.log(`   Price ID: ${plan.stripePriceId}\n`);
        }
        continue;
      }

      if (options.dryRun) {
        stats.configured++;
        if (options.verbose) {
          console.log(`[DRY RUN] Would configure ${plan.name} with Stripe`);
        }
        continue;
      }

      if (options.verbose) {
        console.log(`🔧 Configuring ${plan.name} with Stripe...`);
      }

      // Create Product in Stripe
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description || `${plan.name} subscription plan`,
        metadata: {
          planId: plan.id,
          tier: plan.tier,
          charhubEnvironment: process.env.NODE_ENV || 'development',
        },
      });

      if (options.verbose) {
        console.log(`   ✓ Product created: ${product.id}`);
      }

      // Create Price in Stripe
      const price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: Math.round(plan.priceMonthly * 100), // Convert to cents
        recurring: {
          interval: 'month',
        },
        metadata: {
          planId: plan.id,
          tier: plan.tier,
        },
      });

      if (options.verbose) {
        console.log(`   ✓ Price created: ${price.id}`);
        console.log(`   💰 Amount: $${plan.priceMonthly}/month`);
      }

      // Update plan in database
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          paymentProvider: 'STRIPE',
          stripeProductId: product.id,
          stripePriceId: price.id,
        },
      });

      stats.configured++;

      if (options.verbose) {
        console.log(`   ✓ Database updated\n`);
      }
    }

    if (options.verbose) {
      console.log('✨ Stripe plans configuration completed!\n');
    }

    return stats;

  } catch (error: any) {
    console.error('❌ Error seeding Stripe plans:', error.message);
    throw error;
  }
}

// CLI interface - run standalone
if (require.main === module) {
  seedStripePlans({ verbose: true })
    .then((stats) => {
      console.log('\n📊 Summary:');
      console.log(`   Configured: ${stats.configured}`);
      console.log(`   Skipped: ${stats.skipped}`);
      console.log('\n✅ Done!');
      return dbPrisma.$disconnect();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      return dbPrisma.$disconnect().then(() => process.exit(1));
    });
}
