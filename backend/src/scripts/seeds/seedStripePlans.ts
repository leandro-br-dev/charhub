/**
 * Seed Stripe Plans
 *
 * This script creates Stripe Products and Prices and updates the database plans
 * Run with: npx ts-node src/scripts/seeds/seedStripePlans.ts
 */

import Stripe from 'stripe';
import { PrismaClient } from '../../generated/prisma';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function seedStripePlans() {
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  const stripe = new Stripe(apiKey, {
    apiVersion: '2025-12-15.clover',
  });

  console.log('🚀 Starting Stripe plans seeding...\n');

  try {
    // Get all active plans from database
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
    });

    console.log(`📋 Found ${plans.length} plans in database\n`);

    for (const plan of plans) {
      // Skip FREE tier (no payment required)
      if (plan.tier === 'FREE') {
        console.log(`⏭️  Skipping ${plan.name} (FREE tier)`);
        continue;
      }

      // Check if plan already has Stripe configuration
      if (plan.stripePriceId) {
        console.log(`✅ ${plan.name} already configured with Stripe`);
        console.log(`   Price ID: ${plan.stripePriceId}\n`);
        continue;
      }

      console.log(`🔧 Configuring ${plan.name} with Stripe...`);

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

      console.log(`   ✓ Product created: ${product.id}`);

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

      console.log(`   ✓ Price created: ${price.id}`);
      console.log(`   💰 Amount: $${plan.priceMonthly}/month`);

      // Update plan in database
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          paymentProvider: 'STRIPE',
          stripeProductId: product.id,
          stripePriceId: price.id,
        },
      });

      console.log(`   ✓ Database updated\n`);
    }

    console.log('✨ Stripe plans seeding completed successfully!\n');

    // Print summary
    const stripePlans = await prisma.plan.findMany({
      where: {
        stripePriceId: { not: null },
        isActive: true,
      },
    });

    console.log('📊 Summary:');
    console.log(`   Total Stripe plans: ${stripePlans.length}`);
    stripePlans.forEach((plan) => {
      console.log(`   - ${plan.name}: ${plan.stripePriceId}`);
    });

  } catch (error: any) {
    console.error('❌ Error seeding Stripe plans:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedStripePlans()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
