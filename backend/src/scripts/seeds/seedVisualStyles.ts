/**
 * Visual Styles Seed Script
 *
 * Populates the database with visual style configurations,
 * checkpoints, and LoRAs for image generation.
 */

import { PrismaClient, VisualStyle, ModelType, ContentType } from '../../generated/prisma';

export interface SeedVisualStylesOptions {
  verbose?: boolean;
  dryRun?: boolean;
  prisma: PrismaClient;
}

export async function seedVisualStyles(options?: SeedVisualStylesOptions) {
  console.log('🎨 Seeding visual styles...');

  // Use provided prisma instance or create new one for standalone execution
  const prisma = options?.prisma;

  if (!prisma) {
    throw new Error('Prisma instance is required. Pass it via options.prisma');
  }

  // ========================================
  // CHECKPOINTS
  // ========================================

  // Anime Checkpoint
  const animeCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'ramthrustsNSFWPINK_alchemyMix176.safetensors' },
    update: {},
    create: {
      name: "RAMTHRUST'S-NSFW-PINK-ALCHEMY-MIX",
      filename: 'ramthrustsNSFWPINK_alchemyMix176.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\checkpoints\\ramthrustsNSFWPINK_alchemyMix176.safetensors',
      civitaiUrl: 'https://civitai.com/models/1465491/ramthrusts-nsfw-pink-alchemy-mix',
      modelType: ModelType.CHECKPOINT,
      config: {
        sampler: 'DPM++ 2M Karras',
        cfg: 6,
        steps: 30
      }
    }
  });

  // Realistic Checkpoint
  const realisticCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'illustriousRealismBy_v10VAE.safetensors' },
    update: {},
    create: {
      name: 'Illustrious Realism by klaabu',
      filename: 'illustriousRealismBy_v10VAE.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\checkpoints\\illustriousRealismBy_v10VAE.safetensors',
      civitaiUrl: 'https://civitai.com/models/1412827/illustrious-realism-by-klaabu',
      modelType: ModelType.CHECKPOINT,
      config: {
        sampler: 'DPM++ 2M Karras',
        cfg: 6,
        steps: 30
      }
    }
  });

  // Cartoon Checkpoint
  const cartoonCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'novaCartoonXL_v60.safetensors' },
    update: {},
    create: {
      name: 'Nova Cartoon XL',
      filename: 'novaCartoonXL_v60.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\checkpoints\\novaCartoonXL_v60.safetensors',
      civitaiUrl: 'https://civitai.com/models/1570391/nova-cartoon-xl',
      modelType: ModelType.CHECKPOINT,
      config: {
        sampler: 'Euler a',
        cfg: 4,
        steps: 25,
        clipSkip: 2
      }
    }
  });

  // Furry Checkpoint
  const furryCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'novaFurryXL_ilV140.safetensors' },
    update: {},
    create: {
      name: 'Nova Furry XL',
      filename: 'novaFurryXL_ilV140.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\checkpoints\\novaFurryXL_ilV140.safetensors',
      civitaiUrl: 'https://civitai.com/models/503815/nova-furry-xl',
      modelType: ModelType.CHECKPOINT,
      config: {
        sampler: 'DPM++ 2M Karras',
        cfg: 6.5,
        steps: 30
      }
    }
  });

  // Hentai Checkpoint
  const hentaiCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'ATRex_style-12V2Rev.safetensors' },
    update: {},
    create: {
      name: 'T-Rex Studio V2 - Hentai +18',
      filename: 'ATRex_style-12V2Rev.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\checkpoints\\ATRex_style-12V2Rev.safetensors',
      civitaiUrl: 'https://civitai.com/models/960593/t-rex-studio-v2-new-hentai-18',
      modelType: ModelType.CHECKPOINT,
      config: {
        sampler: 'DPM++ 2M Karras',
        cfg: 6,
        steps: 30
      }
    }
  });

  // ========================================
  // LORAs
  // ========================================

  // Anime LoRA - Mythic Fantasy
  const animeLora = await prisma.styleLora.upsert({
    where: { filename: 'iLLMythD4rkL1nesV2.safetensors' },
    update: {},
    create: {
      name: "Velvet's Mythic Fantasy Styles",
      filename: 'iLLMythD4rkL1nesV2.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\loras\\Illustrious\\Style\\iLLMythD4rkL1nesV2.safetensors',
      filepathRelative: 'Illustrious/Style/iLLMythD4rkL1nesV2.safetensors',
      civitaiUrl: 'https://civitai.com/models/599757/velvets-mythic-fantasy-styles',
      modelType: ModelType.LORA_STYLE,
      triggerWords: 'D4rkL1nes',
      weight: 0.8
    }
  });

  // Semi-Realistic LoRA
  const semiRealisticLora = await prisma.styleLora.upsert({
    where: { filename: 'Semi-realism_illustrious.safetensors' },
    update: {},
    create: {
      name: 'Niji Semi Realism',
      filename: 'Semi-realism_illustrious.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\loras\\Illustrious\\Style\\Semi-realism_illustrious.safetensors',
      filepathRelative: 'Illustrious/Style/Semi-realism_illustrious.safetensors',
      civitaiUrl: 'https://civitai.com/models/534506/niji-semi-realism',
      modelType: ModelType.LORA_STYLE,
      triggerWords: 'Semi-realism',
      weight: 0.9
    }
  });

  // Realistic LoRA - Detailed Skin
  const realisticLora = await prisma.styleLora.upsert({
    where: { filename: 'cinematic photography detailed illu xl v5.safetensors' },
    update: {},
    create: {
      name: 'Realistic Skin Texture Style',
      filename: 'cinematic photography detailed illu xl v5.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\loras\\Illustrious\\Style\\cinematic photography detailed illu xl v5.safetensors',
      filepathRelative: 'Illustrious/Style/cinematic photography detailed illu xl v5.safetensors',
      civitaiUrl: 'https://civitai.com/models/580857/realistic-skin-texture-style',
      modelType: ModelType.LORA_STYLE,
      triggerWords: 'sharp, detailed, cinematic style, cinematic photography style',
      weight: 0.85
    }
  });

  // Cartoon LoRA
  const cartoonLora = await prisma.styleLora.upsert({
    where: { filename: 'WhiteNightStyle_IXL.safetensors' },
    update: {},
    create: {
      name: 'CAT - Citron Styles (White Night)',
      filename: 'WhiteNightStyle_IXL.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\loras\\Illustrious\\Style\\WhiteNightStyle_IXL.safetensors',
      filepathRelative: 'Illustrious/Style/WhiteNightStyle_IXL.safetensors',
      civitaiUrl: 'https://civitai.com/models/362745/cat-citron-styles',
      modelType: ModelType.LORA_STYLE,
      triggerWords: 'WNS, night, foreshortening',
      weight: 0.7
    }
  });

  // ========================================
  // VISUAL STYLE CONFIGS
  // ========================================

  // ANIME Style
  const animeStyle = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.ANIME },
    update: {},
    create: {
      style: VisualStyle.ANIME,
      name: 'Anime',
      description: 'Japanese animation style with vibrant colors and expressive characters',
      defaultCheckpointId: animeCheckpoint.id,
      positivePromptSuffix: 'anime style, anime coloring, anime screencap, vibrant colors, cell shading',
      negativePromptSuffix: 'photorealistic, 3d render, realistic photo, western cartoon'
    }
  });

  // Map Anime LoRA
  await prisma.styleLoraMapping.upsert({
    where: {
      styleId_loraId: {
        styleId: animeStyle.id,
        loraId: animeLora.id
      }
    },
    update: {},
    create: {
      styleId: animeStyle.id,
      loraId: animeLora.id,
      weight: 0.8,
      priority: 1
    }
  });

  // REALISTIC Style
  const realisticStyle = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.REALISTIC },
    update: {},
    create: {
      style: VisualStyle.REALISTIC,
      name: 'Realistic',
      description: 'Photorealistic style with detailed skin texture and natural lighting',
      defaultCheckpointId: realisticCheckpoint.id,
      positivePromptSuffix: 'photorealistic, realistic, cinematic photography, detailed skin texture, natural lighting',
      negativePromptSuffix: 'anime, cartoon, illustration, painting, cell shading'
    }
  });

  await prisma.styleLoraMapping.upsert({
    where: {
      styleId_loraId: {
        styleId: realisticStyle.id,
        loraId: realisticLora.id
      }
    },
    update: {},
    create: {
      styleId: realisticStyle.id,
      loraId: realisticLora.id,
      weight: 0.85,
      priority: 1
    }
  });

  // SEMI_REALISTIC Style
  const semiRealisticStyle = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.SEMI_REALISTIC },
    update: {},
    create: {
      style: VisualStyle.SEMI_REALISTIC,
      name: 'Semi-Realistic',
      description: 'Blend of realistic and stylized art, painterly quality',
      defaultCheckpointId: animeCheckpoint.id,
      positivePromptSuffix: 'semi-realistic, semi-realism, painterly, artistic, stylized',
      negativePromptSuffix: 'low quality, over-stylized, too anime, too realistic'
    }
  });

  await prisma.styleLoraMapping.upsert({
    where: {
      styleId_loraId: {
        styleId: semiRealisticStyle.id,
        loraId: semiRealisticLora.id
      }
    },
    update: {},
    create: {
      styleId: semiRealisticStyle.id,
      loraId: semiRealisticLora.id,
      weight: 0.9,
      priority: 1
    }
  });

  // CARTOON Style
  const cartoonStyle = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.CARTOON },
    update: {},
    create: {
      style: VisualStyle.CARTOON,
      name: 'Cartoon',
      description: 'Western cartoon style, stylized and illustrated',
      defaultCheckpointId: cartoonCheckpoint.id,
      positivePromptSuffix: 'cartoon style, illustrated, stylized, vibrant, colorful',
      negativePromptSuffix: 'photorealistic, realistic photo, anime, manga'
    }
  });

  await prisma.styleLoraMapping.upsert({
    where: {
      styleId_loraId: {
        styleId: cartoonStyle.id,
        loraId: cartoonLora.id
      }
    },
    update: {},
    create: {
      styleId: cartoonStyle.id,
      loraId: cartoonLora.id,
      weight: 0.7,
      priority: 1
    }
  });

  // MANGA Style (uses Anime checkpoint with modified prompts)
  await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.MANGA },
    update: {},
    create: {
      style: VisualStyle.MANGA,
      name: 'Manga',
      description: 'Japanese manga style (currently uses anime checkpoint)',
      defaultCheckpointId: animeCheckpoint.id,
      positivePromptSuffix: 'manga style, monochrome, black and white, screentones, ink lines',
      negativePromptSuffix: 'colored, colorful, photorealistic, 3d'
    }
  });

  // MANHWA Style
  await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.MANHWA },
    update: {},
    create: {
      style: VisualStyle.MANHWA,
      name: 'Manhwa',
      description: 'Korean manhwa/webtoon style',
      defaultCheckpointId: animeCheckpoint.id,
      positivePromptSuffix: 'manhwa style, webtoon, vertical format, vibrant colors',
      negativePromptSuffix: 'photorealistic, manga black and white'
    }
  });

  // COMIC Style
  await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.COMIC },
    update: {},
    create: {
      style: VisualStyle.COMIC,
      name: 'Comic',
      description: 'Western comic book style',
      defaultCheckpointId: cartoonCheckpoint.id,
      positivePromptSuffix: 'comic book style, ink lines, vibrant colors, panels',
      negativePromptSuffix: 'photorealistic, anime, manga'
    }
  });

  // CHIBI Style
  await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.CHIBI },
    update: {},
    create: {
      style: VisualStyle.CHIBI,
      name: 'Chibi',
      description: 'Super deformed/cute style',
      defaultCheckpointId: animeCheckpoint.id,
      positivePromptSuffix: 'chibi, super deformed, cute, small body, large head',
      negativePromptSuffix: 'realistic proportions, serious, detailed anatomy'
    }
  });

  // PIXEL_ART Style
  await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.PIXEL_ART },
    update: {},
    create: {
      style: VisualStyle.PIXEL_ART,
      name: 'Pixel Art',
      description: 'Pixel art/retro game style',
      defaultCheckpointId: cartoonCheckpoint.id,
      positivePromptSuffix: 'pixel art, 8-bit, 16-bit, retro game style',
      negativePromptSuffix: 'photorealistic, smooth shading, gradient'
    }
  });

  // THREE_D Style
  await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.THREE_D },
    update: {},
    create: {
      style: VisualStyle.THREE_D,
      name: '3D Rendered',
      description: '3D rendered style',
      defaultCheckpointId: realisticCheckpoint.id,
      positivePromptSuffix: '3d render, cgi, octane render, blender',
      negativePromptSuffix: '2d, drawing, sketch, painting'
    }
  });

  // ========================================
  // CONTENT-SPECIFIC OVERRIDES
  // ========================================

  // Furry content: override checkpoint for all styles
  await prisma.styleContentCheckpoint.upsert({
    where: {
      styleId_contentType: {
        styleId: animeStyle.id,
        contentType: ContentType.FURRY
      }
    },
    update: {},
    create: {
      styleId: animeStyle.id,
      checkpointId: furryCheckpoint.id,
      contentType: ContentType.FURRY
    }
  });

  // Hentai content: use hentai checkpoint for anime
  await prisma.styleContentCheckpoint.upsert({
    where: {
      styleId_contentType: {
        styleId: animeStyle.id,
        contentType: ContentType.HENTAI
      }
    },
    update: {},
    create: {
      styleId: animeStyle.id,
      checkpointId: hentaiCheckpoint.id,
      contentType: ContentType.HENTAI
    }
  });

  // ========================================
  // STYLE + THEME COMBINATIONS (FEATURE-014)
  // ========================================

  const { Theme } = await import('../../generated/prisma');

  // Update ANIME style to support themes
  const animeStyleWithThemes = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.ANIME },
    update: {
      supportedThemes: [Theme.DARK_FANTASY, Theme.FANTASY, Theme.FURRY],
    },
    create: {
      style: VisualStyle.ANIME,
      name: 'Anime',
      description: 'Japanese anime art style',
      supportedThemes: [Theme.DARK_FANTASY, Theme.FANTASY, Theme.FURRY],
    },
  });

  // Wai Illustrious SDXL checkpoint (for FANTASY theme)
  const waiIllustriousCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'waiIllustriousSDXL_v160.safetensors' },
    update: {},
    create: {
      name: 'waiIllustriousSDXL',
      filename: 'waiIllustriousSDXL_v160.safetensors',
      path: '/models/checkpoints/waiIllustriousSDXL_v160.safetensors',
      modelType: ModelType.CHECKPOINT,
      isActive: true,
    },
  });

  // ANIME + DARK_FANTASY = ramthrustsNSFWPINK + iLLMythD4rkL1nesV2
  await prisma.styleThemeCheckpoint.upsert({
    where: {
      styleId_theme: {
        styleId: animeStyleWithThemes.id,
        theme: Theme.DARK_FANTASY,
      },
    },
    update: {},
    create: {
      styleId: animeStyleWithThemes.id,
      checkpointId: animeCheckpoint.id,
      theme: Theme.DARK_FANTASY,
      loraId: animeLora.id,
      loraStrength: 1.0,
    },
  });

  // ANIME + FANTASY = waiIllustriousSDXL (no LoRA)
  await prisma.styleThemeCheckpoint.upsert({
    where: {
      styleId_theme: {
        styleId: animeStyleWithThemes.id,
        theme: Theme.FANTASY,
      },
    },
    update: {},
    create: {
      styleId: animeStyleWithThemes.id,
      checkpointId: waiIllustriousCheckpoint.id,
      theme: Theme.FANTASY,
      loraId: null,
    },
  });

  // ANIME + FURRY = novaFurryXL (no LoRA)
  await prisma.styleThemeCheckpoint.upsert({
    where: {
      styleId_theme: {
        styleId: animeStyleWithThemes.id,
        theme: Theme.FURRY,
      },
    },
    update: {},
    create: {
      styleId: animeStyleWithThemes.id,
      checkpointId: furryCheckpoint.id,
      theme: Theme.FURRY,
      loraId: null,
    },
  });

  console.log('✅ Visual styles seeded successfully (including Style + Theme combinations)');
}
