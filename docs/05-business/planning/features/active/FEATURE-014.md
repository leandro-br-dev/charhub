# FEATURE-014: Style Diversification - Theme System for Visual Variety

**Status**: ✅ Implemented
**Version**: 1.0.0
**Date Created**: 2026-01-21
**Last Updated**: 2026-01-21
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD
**Pull Request**: [PR #148](https://github.com/leandro-br-dev/charhub/pull/148)
**Epic**: Visual Style System Enhancement

---

## Overview

Implement a Style + Theme structure to diversify visual styles beyond the current single "Anime" configuration, enabling multiple checkpoint + LoRA combinations for greater visual variety in character and image generation.

**Problem Statement**:
- Currently using only "Anime" style with single model+LoRA: `ramthrustsNSFWPINK_alchemyMix176` + `iLLMythD4rkL1nesV2`
- All anime images look very similar due to same checkpoint/LoRA combination
- No flexibility for different anime sub-styles (fantasy, furry, realistic, etc.)
- Difficult to add new models without code changes

**Solution**:
- Separate **Style** (visual aesthetic) from **Theme** (content type/checkpoint)
- Create predefined Style + Theme combinations with different checkpoint + LoRA pairs
- Store combinations in database, seeded for initial diversity
- Apply to character edit screen, automated generation, and image analysis

---

## Business Value

### Current Pain Points

**Visual Monotony**:
- All anime characters have the same "look" (dark fantasy anime style)
- Users perceive limited variety regardless of character design
- Difficult to distinguish characters visually beyond hair/clothing

**Content Limitations**:
- Single checkpoint optimized for dark fantasy anime
- Furry characters look same as regular anime characters
- Fantasy and realistic content use same anime models

**Technical Constraints**:
- Adding new checkpoints requires code deployment
- No per-content-type model optimization
- Can't experiment with new models easily

### Opportunity

**Visual Variety**:
- Multiple anime sub-styles (dark fantasy, bright fantasy, furry, realistic anime)
- Better matching of checkpoint to content type
- Higher perceived quality through model specialization

**User Experience**:
- Style + Theme selector in character creation
- More creative control over visual output
- Ability to explore different visual aesthetics

**Technical Flexibility**:
- Database-driven model configuration
- Easy to add new checkpoints/LoRAs
- A/B testing different model combinations

---

## User Stories

### US-1: Style + Theme Selection
**As** a user creating or editing a character
**I want** to select both Style (ANIME, REALISTIC) and Theme (DARK_FANTASY, FANTASY, FURRY)
**So that** I can control the visual aesthetic of my character

**Acceptance Criteria**:
- [ ] Character edit screen has Style dropdown (ANIME, REALISTIC, etc.)
- [ ] Character edit screen has Theme dropdown (DARK_FANTASY, FANTASY, FURRY, etc.)
- [ ] Theme options update based on selected Style
- [ ] Current selection is displayed on character card
- [ ] Default: ANIME + DARK_FANTASY (current behavior)

### US-2: Automated Character Generation
**As** the automated character population system
**I want** to assign appropriate Style + Theme to each generated character
**So that** auto-generated characters have visual variety

**Acceptance Criteria**:
- [ ] Image analysis detects visual style and content type
- [ ] Analysis returns recommended Style + Theme combination
- [ ] Generated character is tagged with detected combination
- [ ] Generation uses correct checkpoint + LoRA for the combination
- [ ] Diversity algorithm ensures variety across combinations

### US-3: Image Generation with Style+Theme
**As** a user generating character images
**I want** the generation to use the checkpoint + LoRA configured for my Style + Theme
**So that** I get consistent visual results

**Acceptance Criteria**:
- [ ] Avatar generation uses character's Style + Theme
- [ ] Reference generation uses character's Style + Theme
- [ ] Sticker generation uses character's Style + Theme
- [ ] Cover generation uses character's Style + Theme
- [ ] Correct checkpoint is selected based on Theme
- [ ] Correct LoRA is applied based on Style + Theme

### US-4: Image Analysis Style Detection
**As** the image analysis system
**I want** to detect the Style + Theme of uploaded images
**So that** generated characters match the visual reference

**Acceptance Criteria**:
- [ ] Analysis classifies image as Anime, Realistic, Semi-Realistic, etc. (Style)
- [ ] Analysis detects content type (fantasy, furry, dark, etc.) (Theme)
- [ ] Returns recommended Style + Theme combination
- [ ] Confidence score for detection
- [ ] Fallback to default if confidence low

---

## Technical Implementation

### Architecture Overview

```
User Selection / Image Analysis →
Style + Theme Combination →
Checkpoint Lookup + LoRA Lookup →
ComfyUI Workflow Construction →
Image Generation
```

### Concept: Style vs Theme

**Style** = Visual Aesthetic
- ANIME (Japanese anime style)
- REALISTIC (Photorealistic)
- SEMI_REALISTIC (Painterly blend)
- CARTOON (Western cartoon)

**Theme** = Content Type / Checkpoint Selection
- DARK_FANTASY (Dark fantasy content, adult themes)
- FANTASY (High fantasy, bright, magical)
- FURRY (Anthropomorphic characters)
- GENERAL (General purpose, no specific content)

**Combination** = Style + Theme = Specific Checkpoint + LoRA

### Initial Combinations

**Current Configuration (Baseline)**:
```
Style: ANIME + Theme: DARK_FANTASY
├─ Checkpoint: ramthrustsNSFWPINK_alchemyMix176
└─ LoRA: iLLMythD4rkL1nesV2 (strength: 1.0)
```

**New Combinations to Add**:

```
Style: ANIME + Theme: FANTASY
├─ Checkpoint: waiIllustriousSDXL_v160
└─ LoRA: (none - checkpoint handles it)

Style: ANIME + Theme: FURRY
├─ Checkpoint: novaFurryXL_ilV140
└─ LoRA: (none - checkpoint handles it)

Style: REALISTIC + Theme: GENERAL
├─ Checkpoint: (TBD - realistic checkpoint)
└─ LoRA: (TBD)
```

### Database Schema Changes

**File**: `backend/prisma/schema.prisma`

#### Add Theme Enum

```prisma
// Theme enum for content type classification
enum Theme {
  DARK_FANTASY  // Dark fantasy content (current default)
  FANTASY       // High fantasy, bright, magical
  FURRY         // Anthropomorphic characters
  SCI_FI        // Science fiction
  GENERAL       // General purpose
}
```

#### Update VisualStyleConfig Model

```prisma
// Visual Style Configuration - manages checkpoints and LoRAs per visual style
model VisualStyleConfig {
  id        String      @id @default(uuid())
  style     VisualStyle @unique // ANIME, REALISTIC, etc
  name      String      // Display name
  description String?   // User-facing description
  isActive  Boolean     @default(true)

  // NEW: Theme support
  supportedThemes Theme[] // Themes this style supports

  // Default checkpoint for this style
  defaultCheckpointId String?
  defaultCheckpoint StyleCheckpoint? @relation("DefaultCheckpoint", fields: [defaultCheckpointId], references: [id])

  // Theme-specific checkpoint overrides
  themeCheckpoints StyleThemeCheckpoint[]

  // LoRAs to apply for this style
  styleLoras StyleLoraMapping[]

  // Style-specific prompt modifiers
  positivePromptSuffix String? // Tags to add for this style
  negativePromptSuffix String? // Tags to avoid for this style

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### New Model: StyleThemeCheckpoint

```prisma
// Theme-specific checkpoint overrides
// Replaces StyleContentCheckpoint for finer granularity
model StyleThemeCheckpoint {
  id          String   @id @default(uuid())

  styleId     String
  styleConfig VisualStyleConfig @relation(fields: [styleId], references: [id], onDelete: Cascade)

  checkpointId String
  checkpoint   StyleCheckpoint @relation(fields: [checkpointId], references: [id], onDelete: Cascade)

  theme       Theme // DARK_FANTASY, FANTASY, FURRY, etc

  // Optional: LoRA override for this theme
  loraId      String?
  loraOverride StyleLora? @relation("ThemeLora", fields: [loraId], references: [id], onDelete: SetNull)

  // Configuration
  loraStrength Float? // Override default LoRA strength

  @@unique([styleId, theme])
  @@index([styleId])
  @@index([theme])
  @@index([checkpointId])
}
```

#### Update Character Model

```prisma
model Character {
  // ... existing fields ...

  // NEW: Theme field (separate from style)
  theme       Theme?      @default(DARK_FANTASY) // Content type/theme
  style       VisualStyle @default(ANIME) // Visual style (existing)

  // ... rest of model ...
}
```

### Migration File

**File**: `backend/prisma/migrations/20260121120000_add_style_theme_system/migration.sql`

```sql
-- Create migration
-- Timestamp: 20260121120000
-- Description: Add Style + Theme diversification system

-- Step 1: Create Theme enum type (manual in PostgreSQL)
-- Note: Prisma handles enum creation, but verify it exists
DO $$ BEGIN
    CREATE TYPE "Theme" AS ENUM ('DARK_FANTASY', 'FANTASY', 'FURRY', 'SCI_FI', 'GENERAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add theme column to Character table
ALTER TABLE "Character" ADD COLUMN "theme" "Theme" DEFAULT 'DARK_FANTASY';

-- Step 3: Add supportedThemes array column to VisualStyleConfig
ALTER TABLE "VisualStyleConfig" ADD COLUMN "supportedThemes" "Theme"[];

-- Step 4: Create StyleThemeCheckpoint table
CREATE TABLE "StyleThemeCheckpoint" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "theme" "Theme" NOT NULL,
    "loraId" TEXT,
    "loraStrength" DECIMAL(65,30),

    CONSTRAINT "StyleThemeCheckpoint_pkey" PRIMARY KEY ("id")
);

-- Step 5: Create indexes
CREATE UNIQUE INDEX "StyleThemeCheckpoint_styleId_theme_key" ON "StyleThemeCheckpoint"("styleId", "theme");
CREATE INDEX "StyleThemeCheckpoint_styleId_idx" ON "StyleThemeCheckpoint"("styleId");
CREATE INDEX "StyleThemeCheckpoint_theme_idx" ON "StyleThemeCheckpoint"("theme");
CREATE INDEX "StyleThemeCheckpoint_checkpointId_idx" ON "StyleThemeCheckpoint"("checkpointId");

-- Step 6: Add foreign key constraints
ALTER TABLE "StyleThemeCheckpoint" ADD CONSTRAINT "StyleThemeCheckpoint_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "VisualStyleConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleThemeCheckpoint" ADD CONSTRAINT "StyleThemeCheckpoint_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "StyleCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StyleThemeCheckpoint" ADD CONSTRAINT "StyleThemeCheckpoint_loraId_fkey" FOREIGN KEY ("loraId") REFERENCES "StyleLora"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Update existing VisualStyleConfig entries
UPDATE "VisualStyleConfig" SET "supportedThemes" = ARRAY['DARK_FANTASY', 'FANTASY', 'FURRY', 'SCI_FI', 'GENERAL'] WHERE "style" = 'ANIME';

-- Step 8: Rename StyleContentCheckpoint to StyleThemeCheckpoint (conceptually)
-- Old table will be deprecated, new data goes to StyleThemeCheckpoint
```

### Database Seed Data

**File**: `backend/prisma/seed-style-themes.ts` (NEW)

```typescript
import { PrismaClient } from '@prisma/client';
import { VisualStyle, Theme } from '../src/generated/prisma';

const prisma = new PrismaClient();

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

  // 2. Get or create checkpoints
  const darkFantasyCheckpoint = await prisma.styleCheckpoint.upsert({
    where: { filename: 'ramthrustsNSFWPINK_alchemyMix176.safetensors' },
    update: {},
    create: {
      name: 'RAMTHRUST\'S-NSFW-PINK-ALCHEMY-MIX',
      filename: 'ramthrustsNSFWPINK_alchemyMix176.safetensors',
      path: '/models/checkpoints/ramthrustsNSFWPINK_alchemyMix176.safetensors',
      modelType: 'CHECKPOINT',
      isActive: true,
    },
  });

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

  // 3. Get or create LoRA
  const darkFantasyLora = await prisma.styleLora.upsert({
    where: { filename: 'iLLMythD4rkL1nesV2.safetensors' },
    update: {},
    create: {
      name: 'Velvet\'s Mythic Fantasy Styles',
      filename: 'iLLMythD4rkL1nesV2.safetensors',
      filepathRelative: 'loras/Illustrious/Style/iLLMythD4rkL1nesV2.safetensors',
      modelType: 'LORA_STYLE',
      triggerWords: 'D4rkL1nes',
      weight: 1.0,
      isActive: true,
    },
  });

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

  console.log('Style + Theme combinations seeded successfully!');
}

seedStyleThemes()
  .catch((e) => {
    console.error('Error seeding style themes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Backend Services

#### New Service: Style Theme Service

**File**: `backend/src/services/styleThemeService.ts` (NEW)

```typescript
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { VisualStyle, Theme } from '../generated/prisma';

export interface StyleThemeCombination {
  style: VisualStyle;
  theme: Theme;
  checkpoint: {
    id: string;
    name: string;
    filename: string;
    path: string;
  };
  lora?: {
    id: string;
    name: string;
    filename: string;
    filepathRelative: string;
    strength: number;
  };
}

export class StyleThemeService {
  /**
   * Get checkpoint + LoRA configuration for a Style + Theme combination
   */
  async getCombination(style: VisualStyle, theme: Theme): Promise<StyleThemeCombination | null> {
    try {
      const combo = await prisma.styleThemeCheckpoint.findUnique({
        where: {
          styleId_theme: {
            styleId: (await this.getStyleConfigId(style)),
            theme,
          },
        },
        include: {
          checkpoint: true,
          loraOverride: true,
        },
      });

      if (!combo) {
        logger.warn({ style, theme }, 'Style + Theme combination not found');
        return null;
      }

      return {
        style,
        theme,
        checkpoint: {
          id: combo.checkpoint.id,
          name: combo.checkpoint.name,
          filename: combo.checkpoint.filename,
          path: combo.checkpoint.path,
        },
        lora: combo.loraOverride ? {
          id: combo.loraOverride.id,
          name: combo.loraOverride.name,
          filename: combo.loraOverride.filename,
          filepathRelative: combo.loraOverride.filepathRelative!,
          strength: combo.loraStrength || combo.loraOverride.weight,
        } : undefined,
      };
    } catch (error) {
      logger.error({ error, style, theme }, 'Failed to get Style + Theme combination');
      return null;
    }
  }

  /**
   * Get all available themes for a style
   */
  async getAvailableThemes(style: VisualStyle): Promise<Theme[]> {
    try {
      const styleConfig = await prisma.visualStyleConfig.findUnique({
        where: { style },
        select: { supportedThemes: true },
      });

      return styleConfig?.supportedThemes || [];
    } catch (error) {
      logger.error({ error, style }, 'Failed to get available themes');
      return [];
    }
  }

  /**
   * Get style config ID from enum
   */
  private async getStyleConfigId(style: VisualStyle): Promise<string> {
    const styleConfig = await prisma.visualStyleConfig.findUnique({
      where: { style },
      select: { id: true },
    });

    if (!styleConfig) {
      throw new Error(`Style config not found for: ${style}`);
    }

    return styleConfig.id;
  }
}

export const styleThemeService = new StyleThemeService();
```

#### Modified: Image Analysis for Style+Theme Detection

**File**: `backend/src/agents/characterImageAnalysisAgent.ts`

**Update `CharacterImageAnalysisResult` interface**:

```typescript
export type CharacterImageAnalysisResult = {
  // ... existing fields ...

  // NEW: Style and Theme classification
  styleClassification?: {
    style: 'ANIME' | 'REALISTIC' | 'SEMI_REALISTIC' | 'CARTOON' | 'CHIBI' | 'OTHER';
    theme: 'DARK_FANTASY' | 'FANTASY' | 'FURRY' | 'SCI_FI' | 'GENERAL';
    confidence: 'high' | 'medium' | 'low';
  };
};
```

**Update system prompt**:

```typescript
function buildSystemPrompt(): string {
  return [
    // ... existing fields ...
    '  "styleClassification": {',
    '    "style": "ANIME|REALISTIC|SEMI_REALISTIC|CARTOON|CHIBI|OTHER",',
    '    "theme": "DARK_FANTASY|FANTASY|FURRY|SCI_FI|GENERAL",',
    '    "confidence": "high|medium|low"',
    '  },',
    // ... rest of prompt ...
    '',
    'Style Classification Guidelines:',
    '- ANIME: Japanese anime art style (cel shading, anime eyes)',
    '- REALISTIC: Photorealistic or highly detailed art',
    '- SEMI_REALISTIC: Blend of anime and realistic',
    '- CARTOON: Western cartoon style',
    '- CHIBI: Super deformed/cute style',
    '-',
    '- Theme Classification Guidelines:',
    '- DARK_FANTASY: Dark themes, adult content, moody atmosphere',
    '- FANTASY: High fantasy, bright, magical, medieval',
    '- FURRY: Anthropomorphic animal characters',
    '- SCI_FI: Science fiction, futuristic, tech',
    '- GENERAL: No specific theme, general purpose',
  ].join('\n');
}
```

#### Modified: Multi-Stage Character Generator

**File**: `backend/src/services/image-generation/multiStageCharacterGenerator.ts`

**Update to use Style + Theme**:

```typescript
async generateReferences(character: Character): Promise<MultiStageGenerationResult> {
  // Get checkpoint + LoRA based on character's Style + Theme
  const combo = await styleThemeService.getCombination(
    character.style,
    character.theme || Theme.DARK_FANTASY
  );

  if (!combo) {
    throw new Error(`No Style + Theme combination found for ${character.style} + ${character.theme}`);
  }

  // Build ComfyUI workflow with correct checkpoint + LoRA
  const workflow = this.buildWorkflow({
    checkpoint: combo.checkpoint,
    lora: combo.lora,
    // ... other parameters
  });

  // ... rest of generation logic
}
```

### Frontend Changes

#### Modified: Character Edit Screen

**File**: `frontend/src/components/character/CharacterEditForm.tsx`

```typescript
import { VisualStyle, Theme } from '@/generated/prisma';

export function CharacterEditForm({ character }: { character: Character }) {
  const [style, setStyle] = useState<VisualStyle>(character.style);
  const [theme, setTheme] = useState<Theme>(character.theme || Theme.DARK_FANTASY);
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);

  // Fetch available themes when style changes
  useEffect(() => {
    api.get(`/api/v1/styles/${style}/themes`)
      .then(res => setAvailableThemes(res.data.themes));
  }, [style]);

  return (
    <form>
      {/* Style Selector */}
      <FormField label="Visual Style">
        <select value={style} onChange={(e) => setStyle(e.target.value as VisualStyle)}>
          <option value={VisualStyle.ANIME}>Anime</option>
          <option value={VisualStyle.REALISTIC}>Realistic</option>
          <option value={VisualStyle.SEMI_REALISTIC}>Semi-Realistic</option>
          {/* ... other styles */}
        </select>
      </FormField>

      {/* Theme Selector */}
      <FormField label="Theme">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          disabled={!availableThemes.length}
        >
          {availableThemes.map(t => (
            <option key={t} value={t}>{formatTheme(t)}</option>
          ))}
        </select>
        <HelpText>
          {theme === Theme.DARK_FANTASY && 'Dark fantasy with adult themes'}
          {theme === Theme.FANTASY && 'Bright, magical fantasy'}
          {theme === Theme.FURRY && 'Anthropomorphic characters'}
        </HelpText>
      </FormField>

      {/* Preview of current combination */}
      <StyleThemePreview style={style} theme={theme} />
    </form>
  );
}

function formatTheme(theme: Theme): string {
  const labels = {
    [Theme.DARK_FANTASY]: 'Dark Fantasy',
    [Theme.FANTASY]: 'Fantasy',
    [Theme.FURRY]: 'Furry',
    [Theme.SCI_FI]: 'Sci-Fi',
    [Theme.GENERAL]: 'General',
  };
  return labels[theme] || theme;
}
```

#### New Component: StyleThemePreview

**File**: `frontend/src/components/character/StyleThemePreview.tsx` (NEW)

```typescript
interface StyleThemePreviewProps {
  style: VisualStyle;
  theme: Theme;
}

export function StyleThemePreview({ style, theme }: StyleThemePreviewProps) {
  const [combo, setCombo] = useState<StyleThemeCombination | null>(null);

  useEffect(() => {
    api.get(`/api/v1/styles/${style}/themes/${theme}`)
      .then(res => setCombo(res.data));
  }, [style, theme]);

  if (!combo) return <div>Loading...</div>;

  return (
    <div className="style-theme-preview">
      <h4>Current Configuration</h4>
      <p><strong>Checkpoint:</strong> {combo.checkpoint.name}</p>
      {combo.lora && (
        <p><strong>LoRA:</strong> {combo.lora.name} (strength: {combo.lora.strength})</p>
      )}
      {!combo.lora && (
        <p><strong>LoRA:</strong> None (checkpoint-only)</p>
      )}
    </div>
  );
}
```

#### Modified: Character Creation Screen

**File**: `frontend/src/components/character/AutomatedCharacterCreation.tsx`

```typescript
export function AutomatedCharacterCreation() {
  const [style, setStyle] = useState<VisualStyle>(VisualStyle.ANIME);
  const [theme, setTheme] = useState<Theme>(Theme.DARK_FANTASY);

  // ... existing code ...

  return (
    <div>
      {/* Image upload */}
      {/* ... */}

      {/* Style + Theme selectors (NEW) */}
      <StyleThemeSelector
        style={style}
        theme={theme}
        onStyleChange={setStyle}
        onThemeChange={setTheme}
      />

      {/* Generate button */}
      <button onClick={() => generateCharacter({ style, theme })}>
        Generate Character
      </button>
    </div>
  );
}
```

### API Changes

#### New Endpoints

**File**: `backend/src/routes/v1/style-themes.ts` (NEW)

```typescript
import { Router } from 'express';
import { styleThemeService } from '../../services/styleThemeService';

const router = Router();

/**
 * GET /api/v1/styles/:style/themes
 * Get all available themes for a style
 */
router.get('/styles/:style/themes', async (req, res) => {
  const { style } = req.params;
  const themes = await styleThemeService.getAvailableThemes(style as VisualStyle);
  res.json({ style, themes });
});

/**
 * GET /api/v1/styles/:style/themes/:theme
 * Get checkpoint + LoRA configuration for a Style + Theme combination
 */
router.get('/styles/:style/themes/:theme', async (req, res) => {
  const { style, theme } = req.params;
  const combo = await styleThemeService.getCombination(
    style as VisualStyle,
    theme as Theme
  );

  if (!combo) {
    return res.status(404).json({ error: 'Combination not found' });
  }

  res.json(combo);
});

/**
 * GET /api/v1/styles
 * List all available styles with their themes
 */
router.get('/styles', async (_req, res) => {
  const styles = await prisma.visualStyleConfig.findMany({
    where: { isActive: true },
    include: {
      themeCheckpoints: {
        include: {
          checkpoint: true,
          loraOverride: true,
        },
      },
    },
  });

  res.json(styles);
});

export default router;
```

**Register router**:

**File**: `backend/src/routes/v1/index.ts`

```typescript
import styleThemesRouter from './style-themes';

router.use('/style-themes', styleThemesRouter);
```

---

## Acceptance Criteria

### Core Functionality

- [x] **Database Schema**: Theme enum, StyleThemeCheckpoint table, Character.theme column
- [x] **Style + Theme Selection**: UI dropdowns for both Style and Theme
- [x] **Combination Lookup**: Service retrieves checkpoint + LoRA for Style + Theme
- [x] **Image Generation**: Uses correct checkpoint + LoRA based on character's Style + Theme
- [x] **Seed Data**: Initial combinations (ANIME + DARK_FANTASY, ANIME + FANTASY, ANIME + FURRY)

### Data Quality

- [x] **Combination Uniqueness**: Each (Style, Theme) pair has unique checkpoint configuration
- [x] **Fallback Handling**: Graceful fallback when combination not found
- [x] **Theme Validation**: Only available themes shown for selected style
- [x] **Default Values**: New characters default to ANIME + DARK_FANTASY

### User Experience

- [x] **UI Clarity**: Users understand difference between Style and Theme
- [x] **Preview**: Shows which checkpoint + LoRA will be used
- [x] **Help Text**: Explanations for each theme type
- [x] **Responsive Design**: Works on mobile and desktop

### Testing

- [ ] Unit tests for `styleThemeService.getCombination()`
- [ ] Unit tests for `styleThemeService.getAvailableThemes()`
- [ ] Integration tests for image generation with Style + Theme
- [ ] E2E tests for character creation flow with Style + Theme selection
- [ ] Visual regression tests for each Style + Theme combination

---

## Dependencies

### Must Exist First

1. **VisualStyleConfig System** (✅ EXISTS from FEATURE-011)
   - Checkpoint and LoRA management
   - Style configuration database tables

2. **Visual Style Enum** (✅ EXISTS)
   - ANIME, REALISTIC, SEMI_REALISTIC, etc.

3. **Multi-Stage Character Generator** (✅ EXISTS)
   - Needs modification to use Style + Theme

### External Dependencies

- ComfyUI with multiple checkpoints installed:
  - `ramthrustsNSFWPINK_alchemyMix176.safetensors` (existing)
  - `waiIllustriousSDXL_v160.safetensors` (to be installed)
  - `novaFurryXL_ilV140.safetensors` (to be installed)

---

## Risks & Considerations

### Technical Risks

**Risk: Checkpoint Availability**
- **Impact**: High - System fails if checkpoint file doesn't exist
- **Mitigation**:
  - Validate checkpoint files exist before creating combinations
  - Add health check endpoint to verify checkpoint availability
  - Graceful fallback to default combination if checkpoint missing

**Risk: LoRA Compatibility**
- **Impact**: Medium - Some LoRAs may not work with all checkpoints
- **Mitigation**:
  - Test each combination before deploying
  - Document known incompatible combinations
  - Allow `null` LoRA (checkpoint-only mode)

**Risk: Performance Degradation**
- **Impact**: Low - Additional database query for combination lookup
- **Mitigation**:
  - Cache combination lookups in memory
  - Add database indexes on `(styleId, theme)`
  - Estimated overhead: < 50ms

### Edge Cases

**Case 1: Invalid Style + Theme Combination**
- **Scenario**: User requests REALISTIC + FURRY (not configured)
- **Handling**: Return 404 with available themes for REALISTIC
- **UI**: Disable invalid theme options in dropdown

**Case 2: Missing Checkpoint File**
- **Scenario**: Database references checkpoint but file doesn't exist
- **Handling**: Fallback to default combination, log error
- **Admin**: Alert for missing checkpoint files

**Case 3: Character with Old Schema**
- **Scenario**: Character created before Theme field existed
- **Handling**: Default to DARK_FANTASY, migration adds Theme field
- **Migration**: One-time migration to set Theme for existing characters

**Case 4: Image Analysis Returns Unknown Style/Theme**
- **Scenario**: Confidence too low to classify
- **Handling**: Default to ANIME + DARK_FANTASY
- **UI**: Show "Unknown" label, allow user to override

**Case 5: User Wants LoRA-Free Generation**
- **Scenario**: User doesn't want any LoRA applied
- **Handling**: Select combination with `loraId: null`
- **Future**: Add "No LoRA" theme option per style

---

## Migration Strategy

### Phase 1: Prisma Schema & Migration (Day 1)

1. Update `schema.prisma` with Theme enum and StyleThemeCheckpoint model
2. Generate migration: `npx prisma migrate dev --name add_style_theme_system`
3. Run migration in development
4. Verify schema changes

### Phase 2: Seed Data (Day 1)

1. Create `seed-style-themes.ts` script
2. Run seed script: `npm run seed:style-themes`
3. Verify combinations in database
4. Test combination lookups

### Phase 3: Backend Services (Day 2)

1. Create `styleThemeService.ts`
2. Write unit tests
3. Update `multiStageCharacterGenerator.ts` to use Style + Theme
4. Update image analysis agent to detect Style + Theme
5. Integration testing

### Phase 4: API Endpoints (Day 2)

1. Create `style-themes.ts` router
2. Add endpoints for Style + Theme queries
3. Test endpoints with Postman/Thunder Client
4. Document API in OpenAPI spec

### Phase 5: Frontend Implementation (Day 3-4)

1. Update character edit form with Style + Theme selectors
2. Create `StyleThemePreview` component
3. Update automated character creation flow
4. Add help text and documentation
5. UI/UX testing

### Phase 6: End-to-End Testing (Day 4-5)

1. Test character creation with each Style + Theme
2. Verify correct checkpoint + LoRA used
3. Test image generation for each combination
4. Visual quality assessment
5. Performance testing

### Phase 7: Production Deployment (Day 6-7)

1. Install missing checkpoint files in ComfyUI
2. Run database migration in production
3. Run seed script in production
4. Deploy backend changes
5. Deploy frontend changes
6. Monitor for errors
7. Collect user feedback

---

## Success Metrics

### Quantitative Metrics

- **Style + Theme Adoption**: % of characters with non-default Theme
  - Target: > 20% within 1 month
- **Visual Diversity**: Measured difference in visual features across combinations
  - Target: > 50% increase in visual diversity
- **User Satisfaction**: Rating of generated character quality
  - Target: > 4.0/5.0
- **Combination Usage**: Distribution of Style + Theme selections
  - Target: No single combination > 70% of usage

### Qualitative Metrics

- **Visual Distinctiveness**: Can users distinguish between Style + Theme combinations?
- **User Understanding**: Do users understand the difference between Style and Theme?
- **Creative Control**: Do users feel more control over character appearance?
- **System Flexibility**: How easy is it to add new combinations?

---

## Future Enhancements

### Phase 2: Additional Styles and Themes

**Expand to Realistic Style**:
```
Style: REALISTIC + Theme: GENERAL
├─ Checkpoint: (TBD - realistic SDXL checkpoint)
└─ LoRA: (TBD - skin texture enhancer)

Style: REALISTIC + Theme: FANTASY
├─ Checkpoint: (TBD - realistic fantasy)
└─ LoRA: (TBD)
```

**Expand to Semi-Realistic Style**:
```
Style: SEMI_REALISTIC + Theme: GENERAL
├─ Checkpoint: (TBD - semi-realistic mix)
└─ LoRA: (TBD)
```

### Phase 3: User-Configurable Combinations

**Goal**: Allow power users to create custom Style + Theme combinations

**UI**:
- Admin dashboard for checkpoint + LoRA management
- Create/edit/delete combinations
- Test generation with custom combinations
- A/B testing interface

### Phase 4: Intelligent Style+Theme Recommendation

**Goal**: Suggest Style + Theme based on character attributes

**Algorithm**:
```typescript
function recommendStyleTheme(character: Character): { style: VisualStyle; theme: Theme } {
  if (character.species?.category === 'beast') {
    return { style: VisualStyle.ANIME, theme: Theme.FURRY };
  }

  if (character.ageRating === AgeRating.EIGHTEEN) {
    return { style: VisualStyle.ANIME, theme: Theme.DARK_FANTASY };
  }

  if (character.tags.some(t => t.name.includes('magic'))) {
    return { style: VisualStyle.ANIME, theme: Theme.FANTASY };
  }

  return { style: VisualStyle.ANIME, theme: Theme.DARK_FANTASY };
}
```

---

## References

- **Related Features**:
  - FEATURE-011: Visual Style Reference System (prerequisite)
  - FEATURE-012: Character Generation Text Improvement
  - FEATURE-013: Avatar Generation Image Improvement

- **Documentation**:
  - `backend/prisma/schema.prisma`
  - `backend/src/services/image-generation/multiStageCharacterGenerator.ts`
  - `backend/src/agents/characterImageAnalysisAgent.ts`

- **Checkpoint Sources**:
  - [Civitai - Ramthrust's NSFW Pink Alchemy Mix](https://civitai.com/models/10427)
  - [Civitai - wai Illustrious SDXL](https://civitai.com/models/65082)
  - [Civitai - Nova Furry XL](https://civitai.com/models/66506)

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] Unit test: `styleThemeService.getCombination()` returns correct checkpoint
- [ ] Unit test: `styleThemeService.getAvailableThemes()` filters correctly
- [ ] Integration test: Image generation uses correct checkpoint
- [ ] Integration test: Image generation applies correct LoRA
- [ ] Integration test: LoRA-less combinations work correctly
- [ ] Manual test: Generate character with ANIME + FANTASY
- [ ] Manual test: Generate character with ANIME + FURRY
- [ ] Visual test: Compare outputs from different combinations

### Post-Deployment Monitoring

- [ ] Monitor generation success rate per combination
- [ ] Track user Style + Theme preferences
- [ ] Collect visual quality feedback
- [ ] Measure generation time per checkpoint
- [ ] Alert on missing checkpoint files

---

**End of FEATURE-014 Specification**
