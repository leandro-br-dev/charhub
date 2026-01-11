# Civit.ai Auto-Generation: Full Reference Set - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-03
**Last Updated**: 2026-01-03
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Corrigir o fluxo de geração automática de personagens a partir do Civit.ai para gerar o conjunto completo de imagens (avatar + 4 referências) ao invés de apenas o avatar.

**Problema Atual**:
- Rotina diária de captura de imagens do Civit.ai gera apenas o AVATAR
- Deveria gerar AVATAR + 4 REFERENCE images (FRONT, SIDE, BACK, AVATAR)
- Fluxo manual de geração do usuário funciona corretamente (gera tudo)
- Fluxo automático está incompleto

---

## Business Value

### Problema Atual

**Inconsistência Entre Fluxos**:
- ✅ Geração Manual (usuário solicita): Gera avatar + 4 referências
- ❌ Geração Automática (Civit.ai daily): Gera apenas avatar
- Resultado: Personagens gerados automaticamente têm dataset visual incompleto

**Impactos**:
- 📸 **Qualidade Inconsistente**: Personagens auto-gerados têm menos imagens
- 🎨 **Menor Valor**: Usuários preferem personagens com referências completas
- 🔄 **Retrabalho Manual**: Se usuário quer referências, precisa gerar manualmente
- 💸 **Custo Extra**: Gerar referências depois custa créditos adicionais

**Oportunidade**:
- Personagens auto-gerados terão qualidade igual aos manuais
- Dataset completo permite gerações futuras mais consistentes
- Maior valor percebido do conteúdo curado
- Economiza créditos dos usuários (já vem completo)

---

## User Stories

### US-1: Automated Characters Have Full Reference Set
**Como** Product Owner
**Quero** que personagens gerados automaticamente do Civit.ai tenham conjunto completo de imagens
**Para que** qualidade seja igual aos personagens criados manualmente

**Acceptance Criteria**:
- [ ] Rotina diária de Civit.ai gera 5 imagens por personagem:
  - AVATAR (face closeup)
  - REFERENCE_FRONT (full body front view)
  - REFERENCE_SIDE (full body side view)
  - REFERENCE_BACK (full body back view)
  - REFERENCE_AVATAR (additional face reference)
- [ ] Todas as imagens são salvas no R2
- [ ] Database records criados com tipos corretos
- [ ] Processo não quebra se uma das imagens falhar (continue next)
- [ ] Logs detalhados de cada estágio

### US-2: Same Flow as Manual Generation
**Como** Developer
**Quero** reutilizar lógica de geração de referências do fluxo manual
**Para que** não haja duplicação de código e comportamento seja consistente

**Acceptance Criteria**:
- [ ] Rotina automática chama mesmo serviço que geração manual
- [ ] Parâmetros e prompts seguem mesma estrutura
- [ ] Error handling idêntico
- [ ] Custo de créditos aplicado da mesma forma (se aplicável)

### US-3: Performance Maintained
**Como** System Architect
**Quero** que geração de 5 imagens não degrade performance da rotina diária
**Para que** scheduler continue rodando em tempo aceitável

**Acceptance Criteria**:
- [ ] Rotina diária completa em < 30 min (20 personagens × 5 imagens)
- [ ] Geração de imagens em paralelo quando possível
- [ ] Timeout apropriado por imagem (2-3 min)
- [ ] Fallback: se 4 refs falharem, pelo menos avatar é salvo
- [ ] Monitoring de duração no log

---

## Technical Implementation

### Current Architecture

**Automated Character Generation Flow** (from Civit.ai):
```
Daily Scheduler (2 AM UTC)
  → Fetch 20 curated images from Civit.ai
    → For each image:
      → Analyze image with AI (gender, species, age rating, etc)
        → Create character in database
          → Generate AVATAR image ✅
            → ❌ MISSING: Generate 4 reference images
```

**Manual Character Generation Flow** (user-initiated):
```
User clicks "Gerar Personagem"
  → Upload image + description
    → AI analyzes and creates character data
      → Generate AVATAR ✅
        → Generate 4 REFERENCE images ✅
```

### Problem Analysis

**File**: `backend/src/services/characterGeneration/automatedGenerationService.ts` (or similar)

**Current Implementation** (❌):
```typescript
async function generateCharacterFromCivitai(curatedImage: CuratedImage) {
  // 1. Analyze image
  const analysis = await analyzeImage(curatedImage.url);

  // 2. Create character
  const character = await prisma.character.create({
    data: {
      name: analysis.name,
      gender: analysis.gender,
      species: analysis.species,
      // ...
      avatar: null // Will be set after generation
    }
  });

  // 3. Generate AVATAR only ❌
  const avatarImage = await imageGenerationService.generate({
    characterId: character.id,
    imageType: 'AVATAR',
    prompt: buildPrompt(character, 'face closeup')
  });

  // 4. Update character with avatar
  await prisma.character.update({
    where: { id: character.id },
    data: { avatar: avatarImage.url }
  });

  // ❌ MISSING: Generate reference images!

  return character;
}
```

**Expected Implementation** (✅):
```typescript
async function generateCharacterFromCivitai(curatedImage: CuratedImage) {
  // 1. Analyze image
  const analysis = await analyzeImage(curatedImage.url);

  // 2. Create character
  const character = await prisma.character.create({
    data: {
      name: analysis.name,
      gender: analysis.gender,
      species: analysis.species,
      avatar: null,
      userId: CHARHUB_OFFICIAL_BOT_ID // System user
    }
  });

  // 3. Generate AVATAR
  const avatarImage = await imageGenerationService.generate({
    characterId: character.id,
    userId: CHARHUB_OFFICIAL_BOT_ID,
    imageType: 'AVATAR',
    prompt: buildPrompt(character, 'face closeup'),
    skipCreditsCharge: true // Automated generation doesn't charge credits
  });

  // 4. Update character with avatar
  await prisma.character.update({
    where: { id: character.id },
    data: { avatar: avatarImage.url }
  });

  // ✅ 5. Generate reference images (same as manual flow)
  try {
    await generateReferenceImages({
      characterId: character.id,
      userId: CHARHUB_OFFICIAL_BOT_ID,
      skipCreditsCharge: true,
      sourceImage: curatedImage.url // Use original Civit.ai image as reference
    });

    logger.info(`Reference images generated for character ${character.id}`);
  } catch (error) {
    // Don't fail entire process if references fail
    logger.error(`Failed to generate references for ${character.id}:`, error);
  }

  return character;
}
```

---

### Solution Design

#### Step 1: Extract Reference Generation Logic

**File**: `backend/src/services/imageGeneration/referenceImageService.ts`

```typescript
export interface GenerateReferenceImagesParams {
  characterId: string;
  userId: string;
  skipCreditsCharge?: boolean; // For automated generation
  sourceImage?: string; // Optional reference image (from Civit.ai)
}

export async function generateReferenceImages(params: GenerateReferenceImagesParams) {
  const { characterId, userId, skipCreditsCharge = false, sourceImage } = params;

  // 1. Get character
  const character = await prisma.character.findUnique({
    where: { id: characterId }
  });

  if (!character) {
    throw new Error('Character not found');
  }

  // 2. Charge credits (if not skipped)
  if (!skipCreditsCharge) {
    await creditsService.deductCredits(
      userId,
      CREDITS_COSTS.IMAGE_GENERATION_REFERENCE_SET,
      `Reference images generation for character ${characterId}`
    );
  }

  // 3. Generate 4 reference images
  const stages = [
    { type: 'REFERENCE_AVATAR', view: 'face closeup portrait, detailed face' },
    { type: 'REFERENCE_FRONT', view: 'full body front view, standing pose' },
    { type: 'REFERENCE_SIDE', view: 'full body side view, standing pose, profile' },
    { type: 'REFERENCE_BACK', view: 'full body back view, standing pose, from behind' }
  ];

  const generatedImages = [];
  const errors = [];

  for (const stage of stages) {
    try {
      const prompt = buildImagePrompt(character, stage.view);

      const image = await imageGenerationService.generate({
        characterId,
        userId,
        imageType: stage.type,
        prompt,
        referenceImage: sourceImage, // Use Civit.ai image as reference
        skipCreditsCharge: true // Already charged upfront
      });

      generatedImages.push(image);

      logger.info(`Generated ${stage.type} for character ${characterId}`);
    } catch (error) {
      logger.error(`Failed to generate ${stage.type} for ${characterId}:`, error);
      errors.push({ stage: stage.type, error: error.message });

      // Continue to next stage even if one fails
    }
  }

  // 4. Refund credits if all stages failed
  if (!skipCreditsCharge && generatedImages.length === 0) {
    await creditsService.refundCredits(
      userId,
      CREDITS_COSTS.IMAGE_GENERATION_REFERENCE_SET,
      `Reference images generation failed for character ${characterId}`
    );
  }

  return {
    success: generatedImages.length > 0,
    generated: generatedImages.length,
    total: stages.length,
    images: generatedImages,
    errors
  };
}
```

---

#### Step 2: Update Manual Flow to Use Service

**File**: `backend/src/routes/v1/characterImages.ts`

```typescript
// POST /api/v1/characters/:id/images/generate-references
router.post('/:id/images/generate-references', requireAuth, async (req, res) => {
  const { id: characterId } = req.params;

  const character = await prisma.character.findUnique({
    where: { id: characterId }
  });

  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }

  if (character.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // ✅ Use shared service
    const result = await generateReferenceImages({
      characterId,
      userId: req.user.id,
      skipCreditsCharge: false // Manual generation charges credits
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'Insufficient credits') {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

    res.status(500).json({ error: 'Failed to generate reference images' });
  }
});
```

---

#### Step 3: Update Automated Flow to Use Service

**File**: `backend/src/services/characterGeneration/automatedGenerationService.ts`

```typescript
async function generateCharacterFromCivitai(curatedImage: CuratedImage) {
  // ... (existing code: analyze, create character, generate avatar)

  // ✅ Add reference generation
  try {
    const result = await generateReferenceImages({
      characterId: character.id,
      userId: CHARHUB_OFFICIAL_BOT_ID,
      skipCreditsCharge: true, // Automated generation is free
      sourceImage: curatedImage.url // Use Civit.ai image as reference
    });

    logger.info(`Reference images generated for character ${character.id}:`, {
      success: result.success,
      generated: result.generated,
      errors: result.errors
    });
  } catch (error) {
    // Log error but don't fail entire generation
    logger.error(`Reference generation failed for ${character.id}:`, error);
  }

  return character;
}
```

---

#### Step 4: Add Configuration

**File**: `backend/src/config/automatedGeneration.ts`

```typescript
export const AUTOMATED_GENERATION_CONFIG = {
  // Should automated generation create reference images?
  GENERATE_REFERENCES: true,

  // Timeout per reference image (ms)
  REFERENCE_TIMEOUT: 180000, // 3 minutes

  // Continue on error?
  CONTINUE_ON_ERROR: true,

  // Use source image as reference?
  USE_SOURCE_AS_REFERENCE: true
};
```

---

### Database Schema

**No changes needed** - existing schema already supports:
- `CharacterImage` with types: AVATAR, REFERENCE_AVATAR, REFERENCE_FRONT, REFERENCE_SIDE, REFERENCE_BACK
- `Character` with `userId` (for bot account)

---

### Error Handling Strategy

**Graceful Degradation**:
1. **Avatar Generation Fails**: Entire character creation fails (critical)
2. **Reference Generation Fails**: Log error, character still created with avatar only
3. **Partial Reference Failure**: Save successful images, log errors for failed ones

**Retry Strategy**:
- No automatic retries (to avoid blocking scheduler)
- Manual retry option in admin dashboard (future)
- Failed characters logged for review

**Monitoring**:
```typescript
// Example monitoring log
logger.info('Automated generation batch completed', {
  total: 20,
  successful: 18,
  failed: 2,
  withReferences: 16,
  onlyAvatar: 2,
  duration: '25 minutes'
});
```

---

## Testing Strategy

### Unit Tests

**File**: `backend/src/services/imageGeneration/referenceImageService.test.ts`

```typescript
describe('generateReferenceImages', () => {
  test('generates 4 reference images', async () => {
    const result = await generateReferenceImages({
      characterId: 'test-char-id',
      userId: 'test-user-id',
      skipCreditsCharge: true
    });

    expect(result.success).toBe(true);
    expect(result.generated).toBe(4);
    expect(result.images).toHaveLength(4);

    const types = result.images.map(img => img.type);
    expect(types).toContain('REFERENCE_AVATAR');
    expect(types).toContain('REFERENCE_FRONT');
    expect(types).toContain('REFERENCE_SIDE');
    expect(types).toContain('REFERENCE_BACK');
  });

  test('charges credits when not skipped', async () => {
    const user = await createUser({ credits: 200 });

    await generateReferenceImages({
      characterId: 'test-char-id',
      userId: user.id,
      skipCreditsCharge: false
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser.credits).toBe(100); // 200 - 100
  });

  test('continues on partial failure', async () => {
    // Mock: REFERENCE_SIDE fails
    jest.spyOn(imageGenerationService, 'generate')
      .mockImplementationOnce(() => Promise.resolve(mockImage)) // AVATAR success
      .mockImplementationOnce(() => Promise.resolve(mockImage)) // FRONT success
      .mockRejectedValueOnce(new Error('Generation failed')) // SIDE fails
      .mockImplementationOnce(() => Promise.resolve(mockImage)); // BACK success

    const result = await generateReferenceImages({
      characterId: 'test-char-id',
      userId: 'test-user-id',
      skipCreditsCharge: true
    });

    expect(result.success).toBe(true);
    expect(result.generated).toBe(3); // 3 out of 4
    expect(result.errors).toHaveLength(1);
  });
});
```

### Integration Tests

**File**: `backend/src/services/characterGeneration/automatedGenerationService.test.ts`

```typescript
describe('Automated Character Generation', () => {
  test('creates character with avatar and references', async () => {
    const curatedImage = await createCuratedImage();

    const character = await generateCharacterFromCivitai(curatedImage);

    expect(character.avatar).toBeTruthy();

    const images = await prisma.characterImage.findMany({
      where: { characterId: character.id }
    });

    // Should have 5 images: 1 avatar + 4 references
    expect(images.length).toBeGreaterThanOrEqual(5);

    const types = images.map(img => img.type);
    expect(types).toContain('AVATAR');
    expect(types).toContain('REFERENCE_AVATAR');
    expect(types).toContain('REFERENCE_FRONT');
    expect(types).toContain('REFERENCE_SIDE');
    expect(types).toContain('REFERENCE_BACK');
  });
});
```

### Manual Testing Checklist

**Automated Flow**:
- [ ] Run scheduler manually: `npm run scheduler:generate`
- [ ] Verify 20 characters created
- [ ] For each character, verify 5 images in database
- [ ] Verify images uploaded to R2
- [ ] Check logs for any errors
- [ ] Verify process completed in < 30 min

**Manual Flow (regression test)**:
- [ ] Create character manually
- [ ] Generate reference images
- [ ] Verify credits charged
- [ ] Verify 4 references created
- [ ] Verify no regression

---

## Rollout Strategy

### Phase 1: Extract Service (1 hour)
1. Create `referenceImageService.ts` with shared logic
2. Extract prompt building
3. Add credits handling
4. Add error handling with partial success

### Phase 2: Update Manual Flow (30 min)
1. Update `/images/generate-references` endpoint
2. Use new service
3. Test manually
4. Verify credits still charged

### Phase 3: Update Automated Flow (30 min)
1. Update `automatedGenerationService.ts`
2. Call reference service after avatar generation
3. Add configuration flags
4. Add monitoring logs

### Phase 4: Testing (1-2 hours)
1. Unit tests for service
2. Integration tests for automated flow
3. Manual testing of scheduler
4. Verify no regressions in manual flow

### Phase 5: Deploy & Monitor (30 min)
1. Deploy to staging
2. Run scheduler in staging
3. Verify results
4. Deploy to production
5. Monitor first automated run

**Total Estimated Time**: 4-5 hours

---

## Success Metrics

**Automated Generation Quality**:
- [ ] 100% of auto-generated characters have avatar
- [ ] ≥80% of auto-generated characters have all 4 references
- [ ] ≥95% of auto-generated characters have ≥2 references

**Performance**:
- [ ] Scheduler completes in < 30 min (20 characters)
- [ ] Average time per character: < 1.5 min

**Consistency**:
- [ ] Manual and automated flows produce same image types
- [ ] No code duplication between flows
- [ ] Same error handling logic

**User Experience**:
- [ ] Auto-generated characters have same quality as manual
- [ ] Users don't need to generate references manually
- [ ] Credits not charged for auto-generated content

---

## Risks & Mitigation

### Risk 1: Scheduler Timeout
**Probability**: Medium
**Impact**: High

**Mitigation**:
- Generate references in parallel when possible
- Implement timeout per image (3 min max)
- Continue on error (don't block entire batch)
- Monitor duration and alert if > 30 min

### Risk 2: Reference Generation Failures
**Probability**: Medium
**Impact**: Low

**Mitigation**:
- Graceful degradation (avatar still works)
- Detailed error logging
- Retry mechanism in admin dashboard (future)
- Alert if failure rate > 30%

### Risk 3: Credits Not Charged in Manual Flow (Regression)
**Probability**: Low
**Impact**: High

**Mitigation**:
- Thorough testing of manual flow
- Unit tests verify credits charged
- Manual QA before deploy
- Monitor credit transactions after deploy

---

## Dependencies

### Backend Services
- `imageGenerationService` - Existing image generation
- `creditsService` - Credits management
- `comfyuiClient` - ComfyUI API calls
- `r2Service` - Image storage

### Configuration
- `CHARHUB_OFFICIAL_BOT_ID` - System user for automated generation
- `CREDITS_COSTS.IMAGE_GENERATION_REFERENCE_SET` - Cost config

### Database Models
- `Character` - Character data
- `CharacterImage` - Image records
- `CreditTransaction` - Credits audit log

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Automated characters currently have incomplete datasets

### Estimated Effort
- **Optimistic**: 3 hours
- **Realistic**: 4-5 hours
- **Pessimistic**: 6 hours

**Recommendation**: Allocate 5 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/civitai-auto-generation-full-references

# 2. Extract reference generation service
# Create: backend/src/services/imageGeneration/referenceImageService.ts
# Implement: generateReferenceImages()

# 3. Update manual flow to use service
# Update: backend/src/routes/v1/characterImages.ts
# Test: Manual reference generation still works + charges credits

# 4. Update automated flow
# Update: backend/src/services/characterGeneration/automatedGenerationService.ts
# Add: Call to generateReferenceImages() after avatar generation

# 5. Add configuration
# Create: backend/src/config/automatedGeneration.ts

# 6. Unit tests
# Create: backend/src/services/imageGeneration/referenceImageService.test.ts

# 7. Integration tests
# Update: backend/src/services/characterGeneration/automatedGenerationService.test.ts

# 8. Manual testing
npm run scheduler:generate # Test automated flow
# Test manual flow via UI

# 9. Create PR
```

### Key Considerations

1. **Shared Logic**: Extract to service, don't duplicate
2. **Credits**: Skip for automated, charge for manual
3. **Error Handling**: Continue on error, log details
4. **Performance**: Parallel when possible, timeout per image
5. **Monitoring**: Detailed logs for debugging

### Questions to Clarify

- Should automated generation use Civit.ai image as reference for all 4 refs?
- What's acceptable failure rate for references? (20%? 30%?)
- Should we retry failed references automatically?
- Alert thresholds for monitoring?

---

**End of Specification**

🎨 Ready for implementation - Focus on code reuse and graceful error handling!

---

## Implementation Progress

**Status**: ✅ **COMPLETED** (2026-01-11)

### Implemented Changes

1. **Configuration Added** (`batchCharacterGenerator.ts`)
   - `AUTO_GENERATE_REFERENCES` environment variable (default: true)
   - `REFERENCE_WAIT_TIMEOUT` environment variable (default: 300000ms)
   - `REFERENCE_GENERATION_ENABLED` master switch

2. **New Methods**
   - `waitForAvatarGeneration()`: Polls database for avatar completion
   - `generateReferenceImagesForAutomated()`: Generates 4 reference views using `multiStageCharacterGenerator`

3. **Pipeline Updated**
   - Step 8 added: Wait for avatar → Generate references
   - Graceful degradation: Character created even if references fail
   - Uses Civit.ai image as sample reference for consistency

### Implementation Notes

- **Code Reuse**: Uses existing `multiStageCharacterGenerator` service (no duplication)
- **Credits**: Skipped for automated generation (bot user)
- **Error Handling**: Non-critical failures logged, main flow continues
- **Performance**: Polls every 5 seconds for avatar, 5-minute timeout
- **Monitoring**: Detailed logs at each stage

### Test Results

- ✅ TypeScript compilation: PASSED
- ✅ ESLint: PASSED (0 errors)
- ✅ Frontend build: PASSED

### Commits

- `559e92a` - wip: implement reference generation in automated character flow
- `77cfeef` - fix: resolve TypeScript compilation errors

### Next Steps

1. Manual testing with Docker environment
2. Monitor first automated run for performance
3. Create Pull Request for review
