# Visual Style Reference System (Checkpoints & LoRAs) - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-03
**Last Updated**: 2026-01-03
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Criar sistema robusto de gerenciamento de estilos visuais para geração de imagens no Stable Diffusion, incluindo checkpoints (modelos base), LoRAs (style enhancers), e configurações de prompts por estilo.

**Problema Atual**:
- Não há sistema centralizado de estilos visuais
- Checkpoint e LoRA são hardcoded ou escolhidos manualmente
- Falta de mapeamento entre estilo desejado e configuração técnica
- Impossível garantir consistência de estilo

**Solução Proposta**:
- Tabela de referência de estilos visuais
- Mapeamento de checkpoint + LoRAs por estilo
- Prompts positivos/negativos específicos por estilo
- Sistema de fallback (se estilo não tem checkpoint próprio)
- Extensível para adicionar novos modelos e LoRAs

---

## Business Value

### Problema Atual

**Falta de Sistema de Estilos**:
- Usuário seleciona "Anime" mas resultado pode variar muito
- Sem LoRA de reforço, estilo pode não ser consistente
- Checkpoints genéricos não otimizam para cada estilo
- Difícil adicionar novos estilos (requer code changes)

**Impactos**:
- 🎨 **Inconsistência Visual**: Mesmo estilo, resultados diferentes
- 🔧 **Manutenção Difícil**: Adicionar checkpoint requer deploy
- 📉 **Baixa Qualidade**: Checkpoints não otimizados para estilo
- 💡 **Falta de Flexibilidade**: Não permite experimentação rápida

**Oportunidade**:
- Estilos consistentes e previsíveis
- Fácil adição de novos checkpoints/LoRAs
- Configuração via database (sem deploy)
- Suporte a múltiplos estilos (Anime, Realistic, Cartoon, Manga, Furry, Hentai)

---

## User Stories

### US-1: Consistent Visual Styles
**Como** usuário
**Quero** que personagens gerados com estilo "Anime" tenham aparência anime consistente
**Para que** eu saiba o que esperar de cada estilo

**Acceptance Criteria**:
- [ ] Estilo "Anime" sempre usa checkpoint otimizado para anime
- [ ] LoRA de reforço aplicado automaticamente
- [ ] Prompts positivos/negativos adaptados ao estilo
- [ ] Resultados visualmente consistentes

### US-2: Multiple Styles Supported
**Como** Product Owner
**Quero** suportar múltiplos estilos visuais (Anime, Realistic, Cartoon, Manga, Furry, Hentai)
**Para que** atendamos diferentes públicos e preferências

**Acceptance Criteria**:
- [ ] Estilos suportados:
  - Anime (anime aesthetic, vibrant)
  - Realistic (photorealistic, detailed skin)
  - Semi-realistic (painterly blend)
  - Cartoon (illustrated, stylized)
  - Manga (black & white, screentones - future)
  - Furry (anthropomorphic characters)
  - Hentai (adult anime content)
- [ ] Cada estilo tem checkpoint + LoRAs configurados
- [ ] Fallback automático se checkpoint não disponível

### US-3: Easy Model Management
**Como** Developer/Admin
**Quero** adicionar novos checkpoints e LoRAs via database
**Para que** não seja necessário deploy para experimentar novos modelos

**Acceptance Criteria**:
- [ ] Checkpoints armazenados em tabela `StyleCheckpoint`
- [ ] LoRAs armazenados em tabela `StyleLora`
- [ ] Admin dashboard para CRUD (future)
- [ ] Seed script para popular modelos iniciais

---

## Technical Implementation

### Architecture Decision: Where to Store Style Config?

**Option 1: CharHub Backend (Database)** ✅ RECOMMENDED
- **Pros**:
  - Centralized configuration
  - Easy to query and update
  - Admin dashboard integration
  - Versioning and audit trail
  - No ComfyUI restart needed
- **Cons**:
  - Adds database tables
  - API call overhead (negligible)

**Option 2: CharHub-ComfyUI Middleware**
- **Pros**:
  - Closer to generation logic
  - Simpler API contract
- **Cons**:
  - Harder to manage (separate project)
  - Requires ComfyUI restart for changes
  - No admin UI integration
  - Duplicate logic if multiple ComfyUI instances

**Decision**: **Store in CharHub Backend** for better management and flexibility.

---

### Database Schema

**File**: `prisma/schema.prisma`

```prisma
// Visual Style Configuration
model VisualStyleConfig {
  id          String   @id @default(cuid())
  style       VisualStyle @unique // ANIME, REALISTIC, etc
  name        String   // Display name
  description String?  // User-facing description
  isActive    Boolean  @default(true)

  // Default checkpoint for this style
  defaultCheckpoint StyleCheckpoint? @relation("DefaultCheckpoint", fields: [defaultCheckpointId], references: [id])
  defaultCheckpointId String?

  // Content-specific overrides
  contentCheckpoints StyleContentCheckpoint[]

  // LoRAs to apply for this style
  styleLoras StyleLoraMapping[]

  // Style-specific prompt modifiers
  positivePromptSuffix String? // Tags to add for this style
  negativePromptSuffix String? // Tags to avoid for this style

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Stable Diffusion Checkpoints
model StyleCheckpoint {
  id          String   @id @default(cuid())
  name        String   // e.g., "RAMTHRUST'S-NSFW-PINK-ALCHEMY-MIX"
  filename    String   @unique // e.g., "ramthrustsNSFWPINK_alchemyMix176.safetensors"
  path        String   // Full path in ComfyUI
  civitaiUrl  String?  // Reference URL
  modelType   ModelType // CHECKPOINT

  // What styles use this checkpoint?
  defaultForStyles VisualStyleConfig[] @relation("DefaultCheckpoint")
  contentMappings  StyleContentCheckpoint[]

  // Configuration
  config      Json?    // { sampler: "DPM++ 2M Karras", cfg: 6, steps: 30 }

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// LoRA Models
model StyleLora {
  id          String   @id @default(cuid())
  name        String   // e.g., "Velvet's Mythic Fantasy Styles"
  filename    String   @unique // e.g., "iLLMythD4rkL1nesV2.safetensors"
  path        String   // Full path in ComfyUI
  civitaiUrl  String?
  modelType   ModelType // LORA_STYLE or LORA_CONTENT

  // Trigger words (comma-separated)
  triggerWords String? // e.g., "D4rkL1nes"

  // What styles use this LoRA?
  styleMappings StyleLoraMapping[]

  // Configuration
  weight      Float    @default(1.0) // Default weight (0.0-1.5)

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Maps LoRAs to Visual Styles
model StyleLoraMapping {
  id          String   @id @default(cuid())

  styleConfig VisualStyleConfig @relation(fields: [styleId], references: [id])
  styleId     String

  lora        StyleLora @relation(fields: [loraId], references: [id])
  loraId      String

  // Override default weight for this style
  weight      Float?

  // Application priority (lower = applied first)
  priority    Int      @default(0)

  @@unique([styleId, loraId])
}

// Content-specific checkpoint overrides
model StyleContentCheckpoint {
  id          String   @id @default(cuid())

  styleConfig VisualStyleConfig @relation(fields: [styleId], references: [id])
  styleId     String

  checkpoint  StyleCheckpoint @relation(fields: [checkpointId], references: [id])
  checkpointId String

  contentType ContentType // FURRY, HENTAI, etc

  @@unique([styleId, contentType])
}

enum ModelType {
  CHECKPOINT        // Base model
  LORA_STYLE        // Style enhancement (e.g., anime screencap)
  LORA_CONTENT      // Content-specific (e.g., furry, hentai)
}

enum ContentType {
  GENERAL
  FURRY
  HENTAI
  FANTASY
  SCI_FI
}

enum VisualStyle {
  ANIME
  REALISTIC
  SEMI_REALISTIC
  CARTOON
  MANGA
  PIXEL_ART
  FURRY       // Content type that works across styles
}
```

---

### Seed Data

**File**: `prisma/seed/visualStyles.ts`

```typescript
import { PrismaClient, VisualStyle, ModelType, ContentType } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedVisualStyles() {
  console.log('Seeding visual styles...');

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
  // LoRAs
  // ========================================

  // Anime LoRA - Mythic Fantasy
  const animeLora = await prisma.styleLora.upsert({
    where: { filename: 'iLLMythD4rkL1nesV2.safetensors' },
    update: {},
    create: {
      name: "Velvet's Mythic Fantasy Styles",
      filename: 'iLLMythD4rkL1nesV2.safetensors',
      path: 'C:\\Projects\\charhub-comfyui\\ComfyUI\\ComfyUI\\models\\loras\\Illustrious\\Style\\iLLMythD4rkL1nesV2.safetensors',
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
      defaultCheckpointId: animeCheckpoint.id, // Fallback to anime checkpoint
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
  const mangaStyle = await prisma.visualStyleConfig.upsert({
    where: { style: VisualStyle.MANGA },
    update: {},
    create: {
      style: VisualStyle.MANGA,
      name: 'Manga',
      description: 'Japanese manga style (currently uses anime checkpoint)',
      defaultCheckpointId: animeCheckpoint.id, // Fallback
      positivePromptSuffix: 'manga style, monochrome, black and white, screentones, ink lines',
      negativePromptSuffix: 'colored, colorful, photorealistic, 3d'
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

  console.log('✅ Visual styles seeded successfully');
}
```

---

### Service Layer

**File**: `backend/src/services/imageGeneration/visualStyleService.ts`

```typescript
export interface StyleConfiguration {
  checkpoint: StyleCheckpoint;
  loras: Array<{
    lora: StyleLora;
    weight: number;
  }>;
  positivePromptSuffix: string;
  negativePromptSuffix: string;
  config: any; // Checkpoint config (sampler, cfg, steps)
}

export async function getStyleConfiguration(
  visualStyle: VisualStyle,
  contentType: ContentType = ContentType.GENERAL
): Promise<StyleConfiguration> {
  // 1. Get style config
  const styleConfig = await prisma.visualStyleConfig.findUnique({
    where: { style: visualStyle },
    include: {
      defaultCheckpoint: true,
      contentCheckpoints: {
        where: { contentType },
        include: { checkpoint: true }
      },
      styleLoras: {
        where: { lora: { isActive: true } },
        include: { lora: true },
        orderBy: { priority: 'asc' }
      }
    }
  });

  if (!styleConfig) {
    throw new Error(`Style configuration not found for: ${visualStyle}`);
  }

  // 2. Determine checkpoint (content-specific or default)
  const checkpoint =
    styleConfig.contentCheckpoints[0]?.checkpoint || styleConfig.defaultCheckpoint;

  if (!checkpoint) {
    throw new Error(`No checkpoint configured for style: ${visualStyle}`);
  }

  // 3. Prepare LoRAs
  const loras = styleConfig.styleLoras.map(mapping => ({
    lora: mapping.lora,
    weight: mapping.weight ?? mapping.lora.weight
  }));

  // 4. Build configuration
  return {
    checkpoint,
    loras,
    positivePromptSuffix: styleConfig.positivePromptSuffix || '',
    negativePromptSuffix: styleConfig.negativePromptSuffix || '',
    config: checkpoint.config || {}
  };
}

export async function buildStyledPrompt(
  basePrompt: { positive: string; negative: string },
  visualStyle: VisualStyle,
  contentType: ContentType = ContentType.GENERAL
): Promise<{ positive: string; negative: string }> {
  const styleConfig = await getStyleConfiguration(visualStyle, contentType);

  // Add style-specific suffixes
  const positive = [
    basePrompt.positive,
    styleConfig.positivePromptSuffix
  ].filter(Boolean).join(', ');

  const negative = [
    basePrompt.negative,
    styleConfig.negativePromptSuffix
  ].filter(Boolean).join(', ');

  // Add LoRA trigger words
  const triggerWords = styleConfig.loras
    .map(l => l.lora.triggerWords)
    .filter(Boolean)
    .join(', ');

  return {
    positive: triggerWords ? `${positive}, ${triggerWords}` : positive,
    negative
  };
}
```

---

### Integration with ComfyUI

**File**: `backend/src/services/imageGeneration/comfyuiClient.ts`

```typescript
export interface ComfyUIGenerationParams {
  positive_prompt: string;
  negative_prompt: string;
  checkpoint: string; // Checkpoint filename
  loras: Array<{
    filename: string;
    weight: number;
  }>;
  config: {
    sampler?: string;
    cfg?: number;
    steps?: number;
    clipSkip?: number;
  };
  // ... other params
}

export async function generateWithStyle(
  basePrompt: { positive: string; negative: string },
  visualStyle: VisualStyle,
  contentType: ContentType = ContentType.GENERAL
) {
  // 1. Get style configuration
  const styleConfig = await visualStyleService.getStyleConfiguration(
    visualStyle,
    contentType
  );

  // 2. Build styled prompt
  const styledPrompt = await visualStyleService.buildStyledPrompt(
    basePrompt,
    visualStyle,
    contentType
  );

  // 3. Prepare ComfyUI params
  const params: ComfyUIGenerationParams = {
    positive_prompt: styledPrompt.positive,
    negative_prompt: styledPrompt.negative,
    checkpoint: styleConfig.checkpoint.filename,
    loras: styleConfig.loras.map(l => ({
      filename: l.lora.filename,
      weight: l.weight
    })),
    config: styleConfig.config
  };

  // 4. Call ComfyUI
  const result = await comfyuiApi.generate(params);

  return result;
}
```

---

### API Endpoints

**File**: `backend/src/routes/v1/visualStyles.ts`

```typescript
// GET /api/v1/visual-styles
router.get('/', async (req, res) => {
  const styles = await prisma.visualStyleConfig.findMany({
    where: { isActive: true },
    select: {
      style: true,
      name: true,
      description: true
    }
  });

  res.json(styles);
});

// GET /api/v1/visual-styles/:style/configuration
router.get('/:style/configuration', async (req, res) => {
  const { style } = req.params;
  const { contentType = 'GENERAL' } = req.query;

  try {
    const config = await visualStyleService.getStyleConfiguration(
      style as VisualStyle,
      contentType as ContentType
    );

    res.json(config);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// POST /api/v1/visual-styles/:style/preview-prompt
router.post('/:style/preview-prompt', requireAuth, async (req, res) => {
  const { style } = req.params;
  const { basePrompt, contentType = 'GENERAL' } = req.body;

  try {
    const styledPrompt = await visualStyleService.buildStyledPrompt(
      basePrompt,
      style as VisualStyle,
      contentType as ContentType
    );

    res.json(styledPrompt);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('visualStyleService', () => {
  test('gets anime style configuration', async () => {
    const config = await getStyleConfiguration(VisualStyle.ANIME);

    expect(config.checkpoint.name).toContain('ALCHEMY-MIX');
    expect(config.loras).toHaveLength(1);
    expect(config.loras[0].lora.name).toContain('Mythic Fantasy');
  });

  test('overrides checkpoint for furry content', async () => {
    const config = await getStyleConfiguration(
      VisualStyle.ANIME,
      ContentType.FURRY
    );

    expect(config.checkpoint.name).toContain('Nova Furry');
  });

  test('builds styled prompt with suffixes', async () => {
    const basePrompt = {
      positive: '1woman, black hair',
      negative: 'low quality'
    };

    const styled = await buildStyledPrompt(
      basePrompt,
      VisualStyle.ANIME
    );

    expect(styled.positive).toContain('anime style');
    expect(styled.positive).toContain('D4rkL1nes'); // Trigger word
    expect(styled.negative).toContain('photorealistic');
  });
});
```

---

## Rollout Strategy

### Phase 1: Database Schema (1 hour)
1. Create Prisma models
2. Generate migration
3. Run migration

### Phase 2: Seed Data (2 hours)
1. Create seed script with all checkpoints/LoRAs
2. Test seed locally
3. Document paths and URLs

### Phase 3: Service Layer (2-3 hours)
1. Implement `visualStyleService`
2. Integrate with `comfyuiClient`
3. Unit tests

### Phase 4: API Endpoints (1 hour)
1. Create routes
2. Test with Postman

### Phase 5: Integration Testing (1-2 hours)
1. Generate test images with each style
2. Verify checkpoints and LoRAs applied
3. Visual quality review

**Total Estimated Time**: 7-9 hours

---

## Success Metrics

- [ ] All 6 styles working (Anime, Realistic, Semi-Realistic, Cartoon, Manga, Furry)
- [ ] Hentai content override working
- [ ] Visual consistency ≥90% same style
- [ ] Easy to add new checkpoint (< 5 min via seed)
- [ ] API response time < 100ms

---

## Future Enhancements

1. **Admin Dashboard**: CRUD for checkpoints/LoRAs
2. **A/B Testing**: Test multiple checkpoints for same style
3. **User Preferences**: Allow users to select preferred checkpoint
4. **Dynamic LoRA Weights**: Adjust based on prompt complexity
5. **Model Auto-Discovery**: Scan ComfyUI folders for new models

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Foundation for consistent visual quality

### Estimated Effort
- **Realistic**: 8-9 hours

**Recommendation**: Allocate 9 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/visual-style-reference-system

# 2. Update Prisma schema
# Edit: prisma/schema.prisma

# 3. Create migration
npx prisma migrate dev --name add_visual_style_system

# 4. Create seed script
# Create: prisma/seed/visualStyles.ts

# 5. Run seed
npm run seed

# 6. Implement service
# Create: backend/src/services/imageGeneration/visualStyleService.ts

# 7. Update ComfyUI client
# Update: backend/src/services/imageGeneration/comfyuiClient.ts

# 8. Create API routes
# Create: backend/src/routes/v1/visualStyles.ts

# 9. Tests
# Create: backend/src/services/imageGeneration/visualStyleService.test.ts

# 10. Integration testing
# Generate images with different styles

# 11. Create PR
```

---

**End of Specification**

🎨 Ready for implementation - Database-driven style management!
