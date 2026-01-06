# Improved Image Generation Prompts - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-03
**Last Updated**: 2026-01-03
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Implementar sistema de prompts robusto e estruturado para melhorar significativamente a qualidade das imagens de personagens geradas pelo Stable Diffusion via ComfyUI.

**Problema Atual**:
- Prompts de geração são muito simples e genéricos
- Qualidade das imagens geradas é inconsistente
- Falta de detalhes e refinamento
- Não utiliza best practices de prompt engineering para Stable Diffusion

**Solução Proposta**:
- Prompts estruturados em seções (subject, quality, style, composition)
- Tags específicas para reforçar qualidade e detalhamento
- Negative prompts robustos para evitar artefatos
- Adaptação de prompts baseada em tipo de imagem e visual style

---

## Business Value

### Problemas Atuais

**Baixa Qualidade de Imagens**:
- Imagens geradas têm inconsistências visuais
- Anatomia e proporções às vezes incorretas
- Falta de detalhamento (skin texture, eyes, hair)
- Artefatos visuais comuns (deformidades, blur)

**Impacto no Produto**:
- 👎 **User Satisfaction**: Usuários insatisfeitos com qualidade
- 🔄 **High Regeneration Rate**: Usuários regeram múltiplas vezes
- 💸 **Wasted Credits**: Créditos gastos em gerações ruins
- 📉 **Lower Retention**: Qualidade ruim afasta usuários

**Oportunidade**:
- Qualidade superior = menos regenerações
- Economia de créditos dos usuários
- Maior satisfação e retenção
- Diferenciação competitiva

---

## User Stories

### US-1: High-Quality Image Generation
**Como** usuário
**Quero** que imagens geradas tenham alta qualidade e detalhamento
**Para que** meus personagens fiquem visualmente impressionantes

**Acceptance Criteria**:
- [ ] Imagens têm detalhes faciais de alta qualidade (eyes, skin, hair)
- [ ] Anatomia e proporções corretas
- [ ] Sem artefatos visuais comuns (extra fingers, deformed faces)
- [ ] Iluminação e composição profissional
- [ ] Consistência entre gerações do mesmo personagem

### US-2: Visual Style Compliance
**Como** Product Owner
**Quero** que prompts respeitem o visual style configurado
**Para que** imagens geradas correspondam ao estilo esperado (anime, realistic, etc)

**Acceptance Criteria**:
- [ ] Anime style: anime aesthetics, cell shading, vibrant colors
- [ ] Realistic style: photorealistic, detailed skin texture, natural lighting
- [ ] Semi-realistic: blend of both, painterly quality
- [ ] Prompts adaptam-se automaticamente ao style

### US-3: Reduced Regeneration Rate
**Como** Business Analyst
**Quero** reduzir taxa de regeneração em 40-50%
**Para que** usuários economizem créditos e fiquem mais satisfeitos

**Acceptance Criteria**:
- [ ] Baseline atual: ~3-4 gerações por personagem em média
- [ ] Target: ~2 gerações (primeira já boa qualidade)
- [ ] Monitor regeneration rate via analytics
- [ ] User feedback score ≥4/5 para qualidade de imagens

---

## Technical Implementation

### Current State Analysis

**Current Prompt Format** (❌ Too Simple):
```typescript
// Current implementation (hypothetical)
function buildPrompt(character: Character): string {
  const parts = [];

  if (character.gender) parts.push(character.gender);
  if (character.species) parts.push(character.species);
  if (character.physicalDescription) parts.push(character.physicalDescription);

  return parts.join(', ');
}

// Example output: "female, human, long black hair"
// ❌ Too generic, lacks quality tags and structure
```

**Problems**:
- Missing quality tags (masterpiece, best quality, etc)
- Missing composition details (close-up, cinematic, etc)
- Missing technical tags (detailed skin, sharp focus, etc)
- Weak negative prompt (missing common issues)

---

### Proposed Solution: Structured Prompt Builder

**Architecture**:
```
Character Data + Visual Style + Image Type
           ↓
     Prompt Builder
           ↓
┌──────────────────────────┐
│ Positive Prompt (Sections)│
├──────────────────────────┤
│ 1. Quality Tags          │ masterpiece, best quality, 8k
│ 2. Subject Description   │ 1woman, black hair, detailed face
│ 3. Style Modifiers       │ anime style, vibrant colors
│ 4. Composition           │ close-up portrait, dynamic angle
│ 5. Technical Tags        │ sharp focus, detailed skin
└──────────────────────────┘
           +
┌──────────────────────────┐
│ Negative Prompt          │
├──────────────────────────┤
│ 1. Quality Avoidance     │ low quality, worst quality
│ 2. Common Artifacts      │ extra fingers, deformed
│ 3. Style Conflicts       │ 3d render (for anime)
└──────────────────────────┘
```

---

### Implementation Design

#### Part 1: Prompt Template System

**File**: `backend/src/services/imageGeneration/promptTemplates.ts`

```typescript
export interface PromptSection {
  quality: string[];
  subject: string[];
  style: string[];
  composition: string[];
  technical: string[];
}

export const QUALITY_TAGS = {
  HIGH: [
    'masterpiece',
    'best quality',
    'high detailed skin',
    'very aesthetic',
    'highly detailed',
    'ultra-detailed',
    'absurdres',
    'highres',
    '8k'
  ],
  STANDARD: [
    'high quality',
    'detailed',
    'good quality'
  ]
};

export const STYLE_TAGS = {
  ANIME: [
    'anime style',
    'anime coloring',
    'anime screencap',
    'vibrant colors',
    'cell shading',
    'colorful',
    'very aesthetic'
  ],
  REALISTIC: [
    'photorealistic',
    'realistic',
    'photo',
    'cinematic photography style',
    'sharp',
    'detailed',
    'natural lighting',
    'cinematic style'
  ],
  SEMI_REALISTIC: [
    'semi-realism',
    'semi-realistic',
    'painterly',
    'artistic',
    'stylized realistic'
  ],
  CARTOON: [
    'cartoon style',
    'WNS',
    'stylized',
    'illustrated',
    'vibrant'
  ]
};

export const COMPOSITION_TAGS = {
  PORTRAIT: [
    'close-up portrait',
    'face focus',
    'detailed face',
    'detailed eyes',
    'perfect eyes',
    'beautiful face',
    'beautiful eyes'
  ],
  FULL_BODY: [
    'full body',
    'full detailed',
    'standing pose',
    'dynamic angle',
    'perspective shot',
    'cinematic composition'
  ],
  DYNAMIC: [
    'dynamic angle',
    'dynamic pose',
    'perspective shot',
    'foreshortening',
    'cinematic composition',
    'off-shoulder'
  ]
};

export const TECHNICAL_TAGS = {
  DETAIL: [
    'detailed skin',
    'detailed face',
    'detailed eyes',
    'detailed hair',
    'sharp focus',
    'highest quality',
    'ultra HD',
    'high resolution'
  ],
  LIGHTING: [
    'soft lighting',
    'natural lighting',
    'warm atmosphere',
    'tonal balance',
    'shadow gradation',
    'visual harmony'
  ],
  RENDERING: [
    'hyper detailed',
    'cinematic',
    'official_anime_key_visual', // for anime
    'sharp lines',
    'vivid contrast',
    'glossy texture'
  ]
};

export const NEGATIVE_PROMPT_TAGS = {
  QUALITY: [
    'low quality',
    'worst quality',
    'normal quality',
    'jpeg artifacts',
    'blurry',
    'bad quality'
  ],
  ANATOMY: [
    'bad anatomy',
    'bad proportions',
    'extra fingers',
    'missing fingers',
    'extra digits',
    'fewer digits',
    'extra limbs',
    'deformed',
    'disfigured',
    'ugly',
    'bad hands',
    'bad feet',
    'large head'
  ],
  VISUAL: [
    'distorted',
    'duplicate',
    'mutation',
    'mutilated',
    'poorly drawn',
    'cropped',
    'cut off',
    'watermark',
    'signature',
    'username',
    'text',
    'error'
  ],
  STYLE_CONFLICTS: {
    // Use when style is ANIME
    ANIME: ['photorealistic', '3d render', 'realistic photo'],
    // Use when style is REALISTIC
    REALISTIC: ['anime', 'cartoon', 'illustration', 'painting'],
    // Use when style is CARTOON
    CARTOON: ['photorealistic', 'realistic photo']
  }
};
```

---

#### Part 2: Prompt Builder Service

**File**: `backend/src/services/imageGeneration/promptBuilder.ts`

```typescript
import {
  QUALITY_TAGS,
  STYLE_TAGS,
  COMPOSITION_TAGS,
  TECHNICAL_TAGS,
  NEGATIVE_PROMPT_TAGS
} from './promptTemplates';

export interface PromptBuilderParams {
  character: Character;
  imageType: ImageType; // AVATAR, REFERENCE_FRONT, etc
  visualStyle: VisualStyle; // ANIME, REALISTIC, SEMI_REALISTIC, CARTOON
  qualityLevel?: 'HIGH' | 'STANDARD'; // Default: HIGH
}

export interface GeneratedPrompt {
  positive: string;
  negative: string;
  metadata: {
    sections: string[];
    tagCount: number;
  };
}

export function buildImagePrompt(params: PromptBuilderParams): GeneratedPrompt {
  const { character, imageType, visualStyle, qualityLevel = 'HIGH' } = params;

  // Build sections
  const sections = {
    quality: buildQualitySection(qualityLevel),
    subject: buildSubjectSection(character),
    style: buildStyleSection(visualStyle),
    composition: buildCompositionSection(imageType),
    technical: buildTechnicalSection(visualStyle)
  };

  // Combine sections with BREAK separators
  const positive = [
    sections.quality,
    'BREAK',
    sections.subject,
    'BREAK',
    sections.style,
    sections.composition,
    sections.technical
  ].filter(Boolean).join(', ');

  // Build negative prompt
  const negative = buildNegativePrompt(visualStyle);

  return {
    positive,
    negative,
    metadata: {
      sections: Object.keys(sections),
      tagCount: positive.split(',').length
    }
  };
}

function buildQualitySection(level: 'HIGH' | 'STANDARD'): string {
  return QUALITY_TAGS[level].join(', ');
}

function buildSubjectSection(character: Character): string {
  const parts = [];

  // Gender prefix (1woman, 1man, 1person)
  if (character.gender) {
    const genderPrefix = {
      'MALE': '1man',
      'FEMALE': '1woman',
      'NON_BINARY': '1person',
      'OTHER': '1person'
    }[character.gender] || '1person';

    parts.push(genderPrefix);
  }

  // Physical features
  if (character.hairColor && character.hairStyle) {
    parts.push(`${character.hairColor} hair`);
    parts.push(`${character.hairStyle} hair`);
  } else if (character.hairColor) {
    parts.push(`${character.hairColor} hair`);
  } else if (character.hairStyle) {
    parts.push(`${character.hairStyle} hair`);
  }

  if (character.eyeColor) {
    parts.push(`${character.eyeColor} eyes`);
  }

  // Personality reflected in expression
  if (character.personality) {
    const expressionMap = {
      'confident': 'smirk, confident expression',
      'evil': 'villainess, evil smile, evil grin',
      'gentle': 'gentle smile, soft expression',
      'cheerful': 'bright smile, cheerful',
      'serious': 'serious expression, focused'
    };

    const expression = expressionMap[character.personality.toLowerCase()];
    if (expression) {
      parts.push(expression);
    }
  }

  // Physical description (if provided)
  if (character.physicalDescription) {
    parts.push(character.physicalDescription);
  }

  // Body features
  if (character.bodyType) {
    parts.push(character.bodyType);
  }

  // Species
  if (character.species && character.species !== 'HUMAN') {
    parts.push(character.species.toLowerCase());
  }

  return parts.join(', ');
}

function buildStyleSection(visualStyle: VisualStyle): string {
  return STYLE_TAGS[visualStyle]?.join(', ') || '';
}

function buildCompositionSection(imageType: ImageType): string {
  const compositionMap = {
    'AVATAR': COMPOSITION_TAGS.PORTRAIT,
    'REFERENCE_AVATAR': COMPOSITION_TAGS.PORTRAIT,
    'REFERENCE_FRONT': COMPOSITION_TAGS.FULL_BODY,
    'REFERENCE_SIDE': COMPOSITION_TAGS.FULL_BODY,
    'REFERENCE_BACK': COMPOSITION_TAGS.FULL_BODY,
    'COVER': COMPOSITION_TAGS.DYNAMIC
  };

  const tags = compositionMap[imageType] || COMPOSITION_TAGS.PORTRAIT;
  return tags.join(', ');
}

function buildTechnicalSection(visualStyle: VisualStyle): string {
  const tags = [
    ...TECHNICAL_TAGS.DETAIL,
    ...TECHNICAL_TAGS.LIGHTING
  ];

  // Add rendering tags based on style
  if (visualStyle === 'ANIME') {
    tags.push('official_anime_key_visual', 'sharp lines', 'vivid contrast');
  } else if (visualStyle === 'REALISTIC') {
    tags.push('cinematic', 'ultra HD', 'sharp focus');
  }

  return tags.join(', ');
}

function buildNegativePrompt(visualStyle: VisualStyle): string {
  const tags = [
    ...NEGATIVE_PROMPT_TAGS.QUALITY,
    ...NEGATIVE_PROMPT_TAGS.ANATOMY,
    ...NEGATIVE_PROMPT_TAGS.VISUAL
  ];

  // Add style-specific conflicts
  const styleConflicts = NEGATIVE_PROMPT_TAGS.STYLE_CONFLICTS[visualStyle];
  if (styleConflicts) {
    tags.push(...styleConflicts);
  }

  return tags.join(', ');
}
```

---

#### Part 3: Example Prompts

**Example 1: Anime Female Character (Avatar)**

```typescript
const character = {
  gender: 'FEMALE',
  hairColor: 'black',
  hairStyle: 'bob hair',
  eyeColor: 'black',
  personality: 'evil',
  species: 'HUMAN'
};

const prompt = buildImagePrompt({
  character,
  imageType: 'AVATAR',
  visualStyle: 'ANIME',
  qualityLevel: 'HIGH'
});

console.log(prompt.positive);
// Output:
// masterpiece, best quality, high detailed skin, very aesthetic, highly detailed, ultra-detailed, absurdres, highres, 8k, BREAK, 1woman, black hair, bob hair, black eyes, villainess, evil smile, evil grin, BREAK, anime style, anime coloring, anime screencap, vibrant colors, cell shading, colorful, very aesthetic, close-up portrait, face focus, detailed face, detailed eyes, perfect eyes, beautiful face, beautiful eyes, detailed skin, detailed face, detailed eyes, detailed hair, sharp focus, highest quality, ultra HD, high resolution, soft lighting, natural lighting, warm atmosphere, tonal balance, shadow gradation, visual harmony, official_anime_key_visual, sharp lines, vivid contrast

console.log(prompt.negative);
// Output:
// low quality, worst quality, normal quality, jpeg artifacts, blurry, bad quality, bad anatomy, bad proportions, extra fingers, missing fingers, extra digits, fewer digits, extra limbs, deformed, disfigured, ugly, bad hands, bad feet, large head, distorted, duplicate, mutation, mutilated, poorly drawn, cropped, cut off, watermark, signature, username, text, error, photorealistic, 3d render, realistic photo
```

**Example 2: Realistic Male Character (Full Body Front)**

```typescript
const character = {
  gender: 'MALE',
  hairColor: 'brown',
  hairStyle: 'short',
  eyeColor: 'blue',
  bodyType: 'athletic',
  species: 'HUMAN'
};

const prompt = buildImagePrompt({
  character,
  imageType: 'REFERENCE_FRONT',
  visualStyle: 'REALISTIC',
  qualityLevel: 'HIGH'
});

console.log(prompt.positive);
// Output:
// masterpiece, best quality, high detailed skin, very aesthetic, highly detailed, ultra-detailed, absurdres, highres, 8k, BREAK, 1man, brown hair, short hair, blue eyes, athletic, BREAK, photorealistic, realistic, photo, cinematic photography style, sharp, detailed, natural lighting, cinematic style, full body, full detailed, standing pose, dynamic angle, perspective shot, cinematic composition, detailed skin, detailed face, detailed eyes, detailed hair, sharp focus, highest quality, ultra HD, high resolution, soft lighting, natural lighting, warm atmosphere, tonal balance, shadow gradation, visual harmony, cinematic, ultra HD, sharp focus

console.log(prompt.negative);
// Output:
// low quality, worst quality, normal quality, jpeg artifacts, blurry, bad quality, bad anatomy, bad proportions, extra fingers, missing fingers, extra digits, fewer digits, extra limbs, deformed, disfigured, ugly, bad hands, bad feet, large head, distorted, duplicate, mutation, mutilated, poorly drawn, cropped, cut off, watermark, signature, username, text, error, anime, cartoon, illustration, painting
```

---

#### Part 4: Integration with Image Generation Service

**File**: `backend/src/services/imageGeneration/imageGenerationService.ts`

```typescript
export async function generateImage(params: GenerateImageParams) {
  const { character, imageType, visualStyle = 'ANIME' } = params;

  // ✅ Use new prompt builder
  const prompt = buildImagePrompt({
    character,
    imageType,
    visualStyle,
    qualityLevel: 'HIGH'
  });

  logger.info('Generated prompt', {
    characterId: character.id,
    imageType,
    visualStyle,
    promptLength: prompt.positive.length,
    tagCount: prompt.metadata.tagCount
  });

  // Call ComfyUI with structured prompt
  const result = await comfyuiClient.generate({
    positive_prompt: prompt.positive,
    negative_prompt: prompt.negative,
    // ... other params
  });

  return result;
}
```

---

### Database Schema Updates

**Add Visual Style to Character**:

```prisma
model Character {
  id             String      @id @default(cuid())
  // ... existing fields
  visualStyle    VisualStyle @default(ANIME)
  // ...
}

enum VisualStyle {
  ANIME
  REALISTIC
  SEMI_REALISTIC
  CARTOON
  MANGA
  PIXEL_ART
}
```

**Migration**:
```sql
ALTER TABLE "Character" ADD COLUMN "visualStyle" TEXT NOT NULL DEFAULT 'ANIME';
```

---

## Testing Strategy

### Unit Tests

**File**: `backend/src/services/imageGeneration/promptBuilder.test.ts`

```typescript
describe('buildImagePrompt', () => {
  test('includes all quality tags for HIGH level', () => {
    const prompt = buildImagePrompt({
      character: mockCharacter,
      imageType: 'AVATAR',
      visualStyle: 'ANIME',
      qualityLevel: 'HIGH'
    });

    expect(prompt.positive).toContain('masterpiece');
    expect(prompt.positive).toContain('best quality');
    expect(prompt.positive).toContain('8k');
  });

  test('adapts composition based on image type', () => {
    const avatarPrompt = buildImagePrompt({
      character: mockCharacter,
      imageType: 'AVATAR',
      visualStyle: 'ANIME'
    });

    const fullBodyPrompt = buildImagePrompt({
      character: mockCharacter,
      imageType: 'REFERENCE_FRONT',
      visualStyle: 'ANIME'
    });

    expect(avatarPrompt.positive).toContain('close-up portrait');
    expect(fullBodyPrompt.positive).toContain('full body');
  });

  test('includes style-specific negative tags', () => {
    const animePrompt = buildImagePrompt({
      character: mockCharacter,
      imageType: 'AVATAR',
      visualStyle: 'ANIME'
    });

    const realisticPrompt = buildImagePrompt({
      character: mockCharacter,
      imageType: 'AVATAR',
      visualStyle: 'REALISTIC'
    });

    expect(animePrompt.negative).toContain('photorealistic');
    expect(realisticPrompt.negative).toContain('anime');
  });

  test('formats subject correctly', () => {
    const femaleCharacter = { ...mockCharacter, gender: 'FEMALE' };
    const prompt = buildImagePrompt({
      character: femaleCharacter,
      imageType: 'AVATAR',
      visualStyle: 'ANIME'
    });

    expect(prompt.positive).toContain('1woman');
  });
});
```

### A/B Testing Strategy

**Goal**: Measure improvement in image quality

**Metrics**:
- Regeneration rate (before: ~3-4, target: ~2)
- User satisfaction (1-5 rating)
- Credits per final image (before: 150-200, target: 100-150)

**Test Groups**:
- **Control**: Old simple prompts (10% of users)
- **Treatment**: New structured prompts (90% of users)

**Duration**: 2 weeks

**Success Criteria**:
- Regeneration rate reduced by ≥30%
- User satisfaction ≥4/5
- No increase in generation failures

---

## Rollout Strategy

### Phase 1: Implementation (3-4 hours)
1. Create prompt templates file (1 hour)
2. Implement prompt builder service (1.5 hours)
3. Integrate with image generation service (30 min)
4. Unit tests (1 hour)

### Phase 2: Database Migration (30 min)
1. Add `visualStyle` column to Character
2. Default existing characters to 'ANIME'
3. Update character creation to include style selection

### Phase 3: Testing (1-2 hours)
1. Unit tests
2. Manual testing (generate 10 characters with different styles)
3. Visual quality review
4. Compare with old prompts

### Phase 4: Deploy & Monitor (ongoing)
1. Deploy to staging
2. A/B test setup
3. Monitor metrics
4. Deploy to production
5. Track regeneration rate and user feedback

**Total Estimated Time**: 5-7 hours implementation + 2 weeks A/B testing

---

## Success Metrics

**Quality Metrics**:
- [ ] Regeneration rate: 3-4 → 2 (33-50% reduction)
- [ ] User satisfaction: ≥4/5
- [ ] Visual quality score (internal review): ≥4/5

**Technical Metrics**:
- [ ] Prompt length: 100-200 tokens (optimal for SD)
- [ ] Generation success rate: ≥95%
- [ ] No increase in generation time

**Business Metrics**:
- [ ] Credits per final image: 150-200 → 100-150 (25-33% reduction)
- [ ] User retention (D7): +10-15%
- [ ] Positive feedback on image quality: +40-50%

---

## Risks & Mitigation

### Risk 1: Prompts Too Long (Token Limit)
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Keep prompts under 200 tokens
- Test with various SD models
- Monitor generation failures
- Trim less important tags if needed

### Risk 2: Style Conflicts
**Probability**: Medium
**Impact**: Low

**Mitigation**:
- Clear negative tags for each style
- Test all style combinations
- User feedback mechanism
- Allow manual prompt override (future)

### Risk 3: No Quality Improvement
**Probability**: Low
**Impact**: High

**Mitigation**:
- A/B testing to measure impact
- Iterate on prompts based on results
- Expert review of generated images
- Rollback plan if no improvement

---

## Dependencies

### Backend
- `imageGenerationService` - Image generation orchestration
- `comfyuiClient` - ComfyUI API calls
- Character model with `visualStyle` field

### Frontend (Future)
- Visual style selector in character creation
- Preview of prompt (for advanced users)

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Significant quality improvement with low risk

### Estimated Effort
- **Optimistic**: 5 hours
- **Realistic**: 6-7 hours
- **Pessimistic**: 8 hours

**Recommendation**: Allocate 7 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/improved-image-generation-prompts

# 2. Create prompt templates
# Create: backend/src/services/imageGeneration/promptTemplates.ts

# 3. Implement prompt builder
# Create: backend/src/services/imageGeneration/promptBuilder.ts

# 4. Database migration
# Add: visualStyle column to Character model
npx prisma migrate dev --name add_visual_style

# 5. Integrate with image generation
# Update: backend/src/services/imageGeneration/imageGenerationService.ts

# 6. Unit tests
# Create: backend/src/services/imageGeneration/promptBuilder.test.ts

# 7. Manual testing
# Generate test images with different styles and types

# 8. Create PR
```

### Key Considerations

1. **Prompt Length**: Keep under 200 tokens for compatibility
2. **BREAK Usage**: Use BREAK to separate major sections
3. **Tag Order**: Quality → Subject → Style → Composition → Technical
4. **Negative Tags**: Be comprehensive, avoid common artifacts
5. **Style Conflicts**: Prevent style mixing via negative tags

### Reference Prompts

Use these proven prompts as inspiration:
- Anime: https://civitai.com/models/... (example from your message)
- Realistic: Focus on "cinematic photography", "detailed skin"
- Semi-realistic: "painterly", "artistic", "stylized"

---

**End of Specification**

🎨 Ready for implementation - Focus on quality tags and style adaptation!
