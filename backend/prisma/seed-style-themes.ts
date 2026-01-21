import { PrismaClient, VisualStyle, Theme } from '../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Use localhost for local development, postgres for Docker
const connectionString = process.env.DATABASE_URL?.includes('localhost')
  ? process.env.DATABASE_URL
  : 'postgresql://charhub:charhub_dev_password@localhost:5403/charhub_db?schema=public';

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

async function seedStyleThemes() {
  console.log('Seeding Style + Theme combinations...');

  // 1. Get or create VisualStyleConfig for ANIME
  const animeStyle = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.ANIME },
    update: {
      supportedThemes: [Theme.DARK_FANTASY, Theme.FANTASY, Theme.FURRY],
    },
    create: {
      style: VisualStyle.ANIME,
      name: 'Anime',
      description: 'Japanese anime art style',
      isActive: true,
      supportedThemes: [Theme.DARK_FANTASY, Theme.FANTASY, Theme.FURRY],
    },
  });

  console.log('✓ Anime style config created/updated');

  // 2. Get or create checkpoints
  const darkFantasyCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'ramthrustsNSFWPINK_alchemyMix176.safetensors' },
    update: {},
    create: {
      name: "RAMTHRUST'S-NSFW-PINK-ALCHEMY-MIX",
      filename: 'ramthrustsNSFWPINK_alchemyMix176.safetensors',
      path: '/models/checkpoints/ramthrustsNSFWPINK_alchemyMix176.safetensors',
      modelType: 'CHECKPOINT',
      isActive: true,
    },
  });

  console.log('✓ Dark Fantasy checkpoint created/updated');

  const fantasyCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'waiIllustriousSDXL_v160.safetensors' },
    update: {},
    create: {
      name: 'waiIllustriousSDXL',
      filename: 'waiIllustriousSDXL_v160.safetensors',
      path: '/models/checkpoints/waiIllustriousSDXL_v160.safetensors',
      modelType: 'CHECKPOINT',
      isActive: true,
    },
  });

  console.log('✓ Fantasy checkpoint created/updated');

  const furryCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'novaFurryXL_ilV140.safetensors' },
    update: {},
    create: {
      name: 'NovaFurryXL',
      filename: 'novaFurryXL_ilV140.safetensors',
      path: '/models/checkpoints/novaFurryXL_ilV140.safetensors',
      modelType: 'CHECKPOINT',
      isActive: true,
    },
  });

  console.log('✓ Furry checkpoint created/updated');

  // 3. Get or create LoRA
  const darkFantasyLora = await prisma.styleLora.upsert({
    where: { filename: 'iLLMythD4rkL1nesV2.safetensors' },
    update: {},
    create: {
      name: "Velvet's Mythic Fantasy Styles",
      filename: 'iLLMythD4rkL1nesV2.safetensors',
      path: '/models/loras/Illustrious/Style/iLLMythD4rkL1nesV2.safetensors',
      filepathRelative: 'loras/Illustrious/Style/iLLMythD4rkL1nesV2.safetensors',
      modelType: 'LORA_STYLE',
      triggerWords: 'D4rkL1nes',
      weight: 1.0,
      isActive: true,
    },
  });

  console.log('✓ Dark Fantasy LoRA created/updated');

  // 4. Create Style + Theme combinations
  // ANIME + DARK_FANTASY = ramthrustsNSFWPINK + iLLMythD4rkL1nesV2
  await prisma.styleThemeCheckpoint.upsert({
    where: {
      styleId_theme: {
        styleId: animeStyle.id,
        theme: Theme.DARK_FANTASY,
      },
    },
    update: {},
    create: {
      styleId: animeStyle.id,
      checkpointId: darkFantasyCheckpoint.id,
      theme: Theme.DARK_FANTASY,
      loraId: darkFantasyLora.id,
      loraStrength: 1.0,
    },
  });

  console.log('✓ ANIME + DARK_FANTASY combination created');

  // ANIME + FANTASY = waiIllustriousSDXL (no LoRA)
  await prisma.styleThemeCheckpoint.upsert({
    where: {
      styleId_theme: {
        styleId: animeStyle.id,
        theme: Theme.FANTASY,
      },
    },
    update: {},
    create: {
      styleId: animeStyle.id,
      checkpointId: fantasyCheckpoint.id,
      theme: Theme.FANTASY,
      loraId: null, // No LoRA for this combination
    },
  });

  console.log('✓ ANIME + FANTASY combination created');

  // ANIME + FURRY = novaFurryXL (no LoRA)
  await prisma.styleThemeCheckpoint.upsert({
    where: {
      styleId_theme: {
        styleId: animeStyle.id,
        theme: Theme.FURRY,
      },
    },
    update: {},
    create: {
      styleId: animeStyle.id,
      checkpointId: furryCheckpoint.id,
      theme: Theme.FURRY,
      loraId: null, // No LoRA for this combination
    },
  });

  console.log('✓ ANIME + FURRY combination created');
  console.log('\n✅ Style + Theme combinations seeded successfully!');
}

seedStyleThemes()
  .catch((e) => {
    console.error('❌ Error seeding style themes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
