# Character Image Generation Fixes - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-02
**Last Updated**: 2026-01-02
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Correções críticas no sistema de geração de imagens de personagens:

1. **Reference Images Generation Error**: "prompt must contain positive and negative text"
2. **Credits Not Being Charged**: Verificar se créditos estão sendo debitados corretamente
3. **Cost Transparency**: Informar custo na tela antes da geração
4. **Cover Images Missing**: Imagens do tipo COVER não aparecem na galeria
5. **Image Deletion**: Não há opção de excluir imagens

---

## Business Value

### Problemas Atuais

**1. Reference Images Generation Error**:
- Usuário tenta gerar conjunto de imagens de referência (avatar, front, side, back)
- Sistema retorna erro: "prompt must contain positive and negative text"
- Geração falha completamente
- Impacto: Feature de geração de referências inutilizável

**2. Credits Not Being Charged**:
- Possível bug: créditos não são debitados ao gerar imagens
- Se confirmado: prejuízo financeiro para o negócio
- Usuários podem gerar imagens ilimitadas sem pagar
- Impacto: Perda de receita e abuse potencial

**3. Cost Not Displayed**:
- Usuário não sabe quanto vai custar antes de gerar
- Falta de transparência pode causar insatisfação
- Usuários podem gastar créditos sem querer
- Impacto: Experiência ruim, reclamações de suporte

**4. Cover Images Missing from Gallery**:
- Imagens do tipo COVER não aparecem na galeria de imagens
- Usuário não consegue ver ou gerenciar cover images
- Possível bug de filtro ou query
- Impacto: Usuário não consegue trocar/editar cover

**5. No Image Deletion Option**:
- Não há botão de exclusão nas imagens da galeria
- Usuário não consegue remover imagens indesejadas
- Galeria pode ficar poluída com gerações ruins
- Impacto: Experiência ruim, storage desperdiçado

**Overall Impact**:
- 🐛 **Critical Bugs**: Geração quebrada, credits não cobrados
- 💰 **Revenue Loss**: Se credits não estão sendo cobrados
- 😕 **User Frustration**: Sem transparência de custo, sem controle de galeria
- 🗑️ **Storage Waste**: Imagens ruins não podem ser deletadas

---

## User Stories

### US-1: Reference Images Generation Works
**Como** usuário
**Quero** gerar conjunto de imagens de referência (avatar, front, side, back)
**Para que** eu tenha dataset consistente do meu personagem

**Acceptance Criteria**:
- [ ] Botão "Gerar Imagens de Referência" funciona sem erros
- [ ] Prompt positivo e negativo são gerados automaticamente se não fornecidos
- [ ] Geração completa 4 estágios com sucesso
- [ ] Todas as 4 imagens são salvas com tipos corretos:
  - REFERENCE_AVATAR
  - REFERENCE_FRONT
  - REFERENCE_SIDE
  - REFERENCE_BACK
- [ ] Mensagem de erro clara se geração falhar

### US-2: Credits Are Charged Correctly
**Como** Product Owner
**Quero** garantir que créditos sejam cobrados em todas as gerações
**Para que** modelo de negócio seja sustentável

**Acceptance Criteria**:
- [ ] Créditos são debitados ANTES da geração (upfront)
- [ ] Se geração falhar, créditos são reembolsados
- [ ] Audit log registra débito e reembolso
- [ ] Dashboard de créditos mostra transação
- [ ] Backend testa validação de créditos insuficientes

### US-3: Cost is Transparent
**Como** usuário
**Quero** ver quanto vai custar antes de gerar imagens
**Para que** eu tome decisão informada

**Acceptance Criteria**:
- [ ] Tela de geração mostra custo em créditos
- [ ] Custo diferenciado se:
  - Geração simples (1 imagem): 50 créditos
  - Geração de referências (4 imagens): 100 créditos
  - Com imagem de entrada: +25 créditos
- [ ] Botão mostra custo: "Gerar (100 créditos)"
- [ ] Se créditos insuficientes, botão desabilitado com mensagem clara
- [ ] Link para comprar créditos visível

### US-4: Cover Images Appear in Gallery
**Como** usuário
**Quero** ver todas as imagens do personagem na galeria, incluindo cover
**Para que** eu gerencie todas as imagens

**Acceptance Criteria**:
- [ ] Galeria mostra imagens de todos os tipos:
  - AVATAR
  - COVER
  - REFERENCE_AVATAR
  - REFERENCE_FRONT
  - REFERENCE_SIDE
  - REFERENCE_BACK
  - OTHER
- [ ] Cada imagem tem label do tipo
- [ ] Cover image tem badge "Capa atual"
- [ ] Filtro por tipo de imagem (opcional)

### US-5: Images Can Be Deleted
**Como** usuário
**Quero** excluir imagens indesejadas
**Para que** minha galeria fique organizada

**Acceptance Criteria**:
- [ ] Cada imagem na galeria tem botão "Excluir" (ícone trash)
- [ ] Ao clicar, modal de confirmação aparece
- [ ] Ao confirmar, imagem é deletada do R2 e database
- [ ] Galeria atualiza sem reload
- [ ] Não é possível excluir AVATAR atual (ou warning claro)
- [ ] Transação de créditos NÃO é reembolsada (imagem já foi gerada)

---

## Technical Implementation

### Part 1: Reference Images Generation Error Fix (1-2 hours)

#### Problem Analysis

**Error**: "prompt must contain positive and negative text"

**Hypothesis**:
- ComfyUI workflow expects both `positive_prompt` and `negative_prompt`
- Frontend está enviando apenas um ou outro
- OU backend não está populando ambos antes de enviar para ComfyUI

#### Root Cause Investigation

**File**: `backend/src/services/imageGeneration/comfyuiClient.ts` (ou similar)

**Check Current Implementation**:
```bash
# Find where reference images are generated
grep -r "REFERENCE_AVATAR" backend/src
grep -r "generateReferenceImages" backend/src
```

**Expected Flow**:
```
User clicks "Gerar Referências"
  → Frontend sends request to POST /api/v1/characters/:id/images/generate-references
    → Backend generates prompts (positive + negative)
      → ComfyUI workflow execution (Stage 1-4)
        → Images saved to R2
          → Database records created
            → Frontend displays images
```

#### Solution Strategy

**Option 1: Ensure Prompts Are Always Provided**

**File**: `backend/src/services/imageGeneration/promptBuilder.ts`

```typescript
export function buildImagePrompt(character: Character) {
  const positivePrompt = generatePositivePrompt(character);
  const negativePrompt = generateNegativePrompt(); // Default negative prompt

  return {
    positive: positivePrompt || 'a character portrait, high quality',
    negative: negativePrompt || 'low quality, blurry, distorted, ugly'
  };
}

function generatePositivePrompt(character: Character): string {
  const parts = [];

  // Gender
  if (character.gender) {
    parts.push(character.gender.toLowerCase());
  }

  // Species
  if (character.species) {
    parts.push(character.species.toLowerCase());
  }

  // Physical traits
  if (character.physicalDescription) {
    parts.push(character.physicalDescription);
  }

  // Fallback
  if (parts.length === 0) {
    parts.push('a character portrait');
  }

  parts.push('high quality, detailed, professional');

  return parts.join(', ');
}

function generateNegativePrompt(): string {
  return 'low quality, blurry, distorted, deformed, ugly, bad anatomy, bad proportions';
}
```

**Option 2: Validate Prompts Before ComfyUI Call**

**File**: `backend/src/services/imageGeneration/comfyuiClient.ts`

```typescript
export async function generateImage(params: ImageGenerationParams) {
  const { prompt } = params;

  // ✅ Validate prompts
  if (!prompt.positive || prompt.positive.trim() === '') {
    throw new Error('Positive prompt is required');
  }

  if (!prompt.negative || prompt.negative.trim() === '') {
    // Use default negative prompt if not provided
    prompt.negative = 'low quality, blurry, distorted';
  }

  // Call ComfyUI
  const result = await comfyuiApi.generate({
    positive_prompt: prompt.positive,
    negative_prompt: prompt.negative,
    // ... other params
  });

  return result;
}
```

#### Update Reference Images Endpoint

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

  // Build prompts
  const prompts = buildImagePrompt(character);

  // Generate 4 reference images
  const stages = [
    { type: 'REFERENCE_AVATAR', view: 'face closeup' },
    { type: 'REFERENCE_FRONT', view: 'full body front' },
    { type: 'REFERENCE_SIDE', view: 'full body side' },
    { type: 'REFERENCE_BACK', view: 'full body back' }
  ];

  const images = [];

  for (const stage of stages) {
    const stagePrompt = {
      positive: `${prompts.positive}, ${stage.view}`,
      negative: prompts.negative
    };

    // ✅ Both positive and negative are always provided
    const result = await imageGenerationService.generate({
      characterId,
      prompt: stagePrompt,
      imageType: stage.type
    });

    images.push(result);
  }

  res.json({ images });
});
```

---

### Part 2: Credits Charging Verification (1-2 hours)

#### Investigation Steps

**Step 1: Find Credits Deduction Logic**

```bash
# Find where credits are deducted
grep -r "deductCredits" backend/src
grep -r "credits" backend/src/services/imageGeneration
```

**Step 2: Check Current Implementation**

**File**: `backend/src/services/credits/creditsService.ts`

**Expected Logic**:
```typescript
export async function deductCredits(userId: string, amount: number, reason: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user.credits < amount) {
    throw new Error('Insufficient credits');
  }

  // Deduct credits
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { decrement: amount } }
  });

  // Create transaction record
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      type: 'DEDUCTION',
      reason,
      balanceAfter: user.credits - amount
    }
  });

  return { success: true, newBalance: user.credits - amount };
}
```

**Step 3: Verify Image Generation Calls deductCredits**

**File**: `backend/src/services/imageGeneration/imageGenerationService.ts`

**Current Implementation** (❌ POSSIBLY BROKEN):
```typescript
export async function generateImage(params: GenerateImageParams) {
  // ❌ Missing: Credit deduction
  const result = await comfyuiClient.generate(params);

  // Save image
  await saveImage(result);

  return result;
}
```

**Fixed Implementation** (✅):
```typescript
export async function generateImage(params: GenerateImageParams) {
  const { userId, characterId, creditCost = 50 } = params;

  // ✅ CRITICAL: Deduct credits BEFORE generation
  try {
    await creditsService.deductCredits(
      userId,
      creditCost,
      `Image generation for character ${characterId}`
    );
  } catch (error) {
    if (error.message === 'Insufficient credits') {
      throw new InsufficientCreditsError();
    }
    throw error;
  }

  // Generate image
  let result;
  try {
    result = await comfyuiClient.generate(params);
  } catch (error) {
    // ✅ IMPORTANT: Refund credits if generation fails
    await creditsService.refundCredits(
      userId,
      creditCost,
      `Image generation failed for character ${characterId}`
    );
    throw error;
  }

  // Save image
  await saveImage(result);

  return result;
}
```

#### Add Credits Cost Configuration

**File**: `backend/src/config/credits.ts`

```typescript
export const CREDITS_COSTS = {
  // Character generation
  CHARACTER_GENERATION_TEXT_ONLY: 75,
  CHARACTER_GENERATION_WITH_IMAGE: 100,

  // Image generation
  IMAGE_GENERATION_SINGLE: 50,
  IMAGE_GENERATION_WITH_REFERENCE: 75,
  IMAGE_GENERATION_REFERENCE_SET: 100, // 4 images

  // Story generation
  STORY_GENERATION_TEXT_ONLY: 75,
  STORY_GENERATION_WITH_IMAGE: 100
};
```

**Use in Service**:
```typescript
import { CREDITS_COSTS } from '@/config/credits';

export async function generateReferenceImages(params) {
  const creditCost = CREDITS_COSTS.IMAGE_GENERATION_REFERENCE_SET;

  await creditsService.deductCredits(
    userId,
    creditCost,
    'Reference images generation (4 images)'
  );

  // ... generation logic
}
```

---

### Part 3: Cost Display on Frontend (1 hour)

#### Update Image Generation UI

**File**: `frontend/src/pages/(characters)/[id]/edit/components/ImageGenerationPanel.tsx`

**Before** (❌):
```tsx
<Button onClick={handleGenerateReferences}>
  Gerar Imagens de Referência
</Button>
```

**After** (✅):
```tsx
import { CREDITS_COSTS } from '@/config/credits';
import { useAuth } from '@/contexts/AuthContext';

export function ImageGenerationPanel() {
  const { user } = useAuth();
  const cost = CREDITS_COSTS.IMAGE_GENERATION_REFERENCE_SET;
  const hasEnoughCredits = user.credits >= cost;

  return (
    <div>
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Custo de Geração</h3>
        <ul className="text-sm space-y-1">
          <li>Imagem simples: {CREDITS_COSTS.IMAGE_GENERATION_SINGLE} créditos</li>
          <li>Com imagem de referência: {CREDITS_COSTS.IMAGE_GENERATION_WITH_REFERENCE} créditos</li>
          <li className="font-semibold">
            Conjunto de referências (4 imagens): {cost} créditos
          </li>
        </ul>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm">
            Seus créditos: <strong>{user.credits}</strong>
          </span>
          {!hasEnoughCredits && (
            <a href="/credits/purchase" className="text-primary text-sm underline">
              Comprar créditos
            </a>
          )}
        </div>
      </div>

      <Button
        onClick={handleGenerateReferences}
        disabled={!hasEnoughCredits || loading}
        className="w-full"
      >
        {loading ? (
          'Gerando...'
        ) : hasEnoughCredits ? (
          `Gerar Imagens de Referência (${cost} créditos)`
        ) : (
          'Créditos insuficientes'
        )}
      </Button>
    </div>
  );
}
```

#### Sync Credits Config Between Backend/Frontend

**Option 1: Frontend imports from API constants**

**File**: `frontend/src/config/credits.ts`

```typescript
// Mirror backend config
export const CREDITS_COSTS = {
  CHARACTER_GENERATION_TEXT_ONLY: 75,
  CHARACTER_GENERATION_WITH_IMAGE: 100,
  IMAGE_GENERATION_SINGLE: 50,
  IMAGE_GENERATION_WITH_REFERENCE: 75,
  IMAGE_GENERATION_REFERENCE_SET: 100,
  STORY_GENERATION_TEXT_ONLY: 75,
  STORY_GENERATION_WITH_IMAGE: 100
};
```

**Option 2: Fetch from API** (better but more complex)

**File**: `backend/src/routes/v1/credits.ts`

```typescript
// GET /api/v1/credits/costs
router.get('/costs', (req, res) => {
  res.json(CREDITS_COSTS);
});
```

**Frontend**:
```typescript
const { data: costs } = useQuery('creditsCosts', () =>
  api.get('/credits/costs')
);
```

---

### Part 4: Cover Images in Gallery (30 min)

#### Problem Analysis

**Hypothesis**:
- Gallery query filters out COVER images
- OR frontend filters COVER type

#### Investigation

**Backend Query**:

**File**: `backend/src/routes/v1/characterImages.ts`

```typescript
// GET /api/v1/characters/:id/images
router.get('/:id/images', async (req, res) => {
  const { id } = req.params;

  const images = await prisma.characterImage.findMany({
    where: {
      characterId: id,
      // ❌ Check if there's a filter excluding COVER
      // type: { not: 'COVER' } // If this exists, REMOVE IT
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(images);
});
```

**Frontend Component**:

**File**: `frontend/src/pages/(characters)/[id]/edit/components/ImageGallery.tsx`

```tsx
export function ImageGallery({ characterId }: ImageGalleryProps) {
  const { data: images } = useQuery(['character-images', characterId], () =>
    characterService.getImages(characterId)
  );

  // ❌ Check if there's a filter
  // const filteredImages = images.filter(img => img.type !== 'COVER'); // REMOVE THIS

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map(image => (
        <ImageCard
          key={image.id}
          image={image}
          isCurrentAvatar={image.url === character.avatar}
          isCurrentCover={image.url === character.cover} // ✅ Add this
        />
      ))}
    </div>
  );
}
```

#### Solution

**Remove Filter** (if exists) + **Add Type Badges**:

```tsx
<div className="grid grid-cols-3 gap-4">
  {images.map(image => (
    <div key={image.id} className="relative">
      <img src={image.url} alt="" className="w-full h-40 object-cover rounded" />

      {/* Type badge */}
      <Badge className="absolute top-2 left-2">
        {formatImageType(image.type)}
      </Badge>

      {/* Current avatar badge */}
      {image.url === character.avatar && (
        <Badge variant="success" className="absolute top-2 right-2">
          Avatar Atual
        </Badge>
      )}

      {/* Current cover badge */}
      {image.url === character.cover && (
        <Badge variant="success" className="absolute bottom-2 right-2">
          Capa Atual
        </Badge>
      )}
    </div>
  ))}
</div>
```

**Helper Function**:
```typescript
function formatImageType(type: ImageType): string {
  const labels = {
    AVATAR: 'Avatar',
    COVER: 'Capa',
    REFERENCE_AVATAR: 'Ref: Avatar',
    REFERENCE_FRONT: 'Ref: Frente',
    REFERENCE_SIDE: 'Ref: Lado',
    REFERENCE_BACK: 'Ref: Costas',
    OTHER: 'Outra'
  };

  return labels[type] || type;
}
```

---

### Part 5: Image Deletion (1-2 hours)

#### Add Delete Button to Gallery

**File**: `frontend/src/pages/(characters)/[id]/edit/components/ImageGallery.tsx`

```tsx
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

export function ImageGallery({ characterId, character }: ImageGalleryProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<CharacterImage | null>(null);

  const deleteMutation = useMutation(
    (imageId: string) => characterService.deleteImage(characterId, imageId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['character-images', characterId]);
        toast.success('toasts.image.deleted');
        setDeleteModalOpen(false);
      },
      onError: () => {
        toast.error('toasts.image.deleteFailed');
      }
    }
  );

  const handleDeleteClick = (image: CharacterImage) => {
    // Prevent deleting current avatar
    if (image.url === character.avatar) {
      toast.warning('toasts.image.cannotDeleteCurrentAvatar');
      return;
    }

    setImageToDelete(image);
    setDeleteModalOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {images.map(image => (
          <div key={image.id} className="relative group">
            <img src={image.url} alt="" className="w-full h-40 object-cover rounded" />

            {/* Badges... */}

            {/* Delete button (appears on hover) */}
            <button
              onClick={() => handleDeleteClick(image)}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full
                         opacity-0 group-hover:opacity-100 transition-opacity"
              title="Excluir imagem"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Imagem</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita.
              Os créditos usados na geração não serão reembolsados.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(imageToDelete.id)}
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### Backend Delete Endpoint

**File**: `backend/src/routes/v1/characterImages.ts`

```typescript
// DELETE /api/v1/characters/:characterId/images/:imageId
router.delete('/:characterId/images/:imageId', requireAuth, async (req, res) => {
  const { characterId, imageId } = req.params;

  const character = await prisma.character.findUnique({ where: { id: characterId } });

  if (!character) {
    return res.status(404).json({ error: 'Character not found' });
  }

  if (character.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const image = await prisma.characterImage.findUnique({ where: { id: imageId } });

  if (!image) {
    return res.status(404).json({ error: 'Image not found' });
  }

  if (image.characterId !== characterId) {
    return res.status(400).json({ error: 'Image does not belong to this character' });
  }

  // ⚠️ Prevent deleting current avatar
  if (image.url === character.avatar) {
    return res.status(400).json({
      error: 'Cannot delete current avatar',
      message: 'Please set a different avatar first'
    });
  }

  // Delete from R2
  await r2Service.deleteFile(image.r2Key);

  // Delete from database
  await prisma.characterImage.delete({ where: { id: imageId } });

  // NOTE: Credits are NOT refunded (image was already generated)

  res.json({ success: true });
});
```

---

## Testing Strategy

### Part 1: Reference Images Generation
**Manual Testing**:
- [ ] Click "Gerar Imagens de Referência"
- [ ] Verify 4 images generated without error
- [ ] Verify all 4 types present (REFERENCE_AVATAR, REFERENCE_FRONT, REFERENCE_SIDE, REFERENCE_BACK)
- [ ] Test with character with minimal info (only name)
- [ ] Test with character with full info (all fields populated)

### Part 2: Credits Charging
**Manual Testing**:
- [ ] Check credits before generation (e.g., 200)
- [ ] Generate reference images (cost: 100)
- [ ] Check credits after generation (should be 100)
- [ ] Check credit transaction log (should show -100 deduction)
- [ ] Try generating with insufficient credits (should show error)

**Unit Tests**:
```typescript
describe('Image Generation Credits', () => {
  test('deducts credits before generation', async () => {
    const user = await createUser({ credits: 200 });
    await generateReferenceImages(user.id, characterId);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser.credits).toBe(100); // 200 - 100
  });

  test('refunds credits if generation fails', async () => {
    const user = await createUser({ credits: 200 });

    // Mock ComfyUI to fail
    jest.spyOn(comfyuiClient, 'generate').mockRejectedValue(new Error('ComfyUI error'));

    await expect(generateReferenceImages(user.id, characterId)).rejects.toThrow();

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updatedUser.credits).toBe(200); // Refunded
  });
});
```

### Part 3: Cost Display
**Manual Testing**:
- [ ] Open image generation panel
- [ ] Verify costs are displayed
- [ ] Verify current credits shown
- [ ] If insufficient credits, button is disabled
- [ ] "Comprar créditos" link is visible
- [ ] Button text shows cost: "Gerar (100 créditos)"

### Part 4: Cover Images
**Manual Testing**:
- [ ] Upload a cover image
- [ ] Go to image gallery
- [ ] Verify cover image appears
- [ ] Verify "Capa Atual" badge on current cover
- [ ] Verify all image types show correct labels

### Part 5: Image Deletion
**Manual Testing**:
- [ ] Hover over image → delete button appears
- [ ] Click delete → confirmation modal opens
- [ ] Cancel → modal closes, image remains
- [ ] Confirm → image deleted, gallery updates
- [ ] Try deleting current avatar → warning message
- [ ] Verify image deleted from R2 (check storage)

---

## Rollout Strategy

### Development (5-8 hours)

**Part 1: Reference Images Error Fix** (1-2 hours):
1. Investigate error (30 min)
2. Ensure prompts always provided (30 min)
3. Update endpoint (30 min)
4. Test generation (30 min)

**Part 2: Credits Charging** (1-2 hours):
1. Audit current implementation (30 min)
2. Add credits deduction if missing (1 hour)
3. Add refund on failure (30 min)
4. Unit tests (30 min)

**Part 3: Cost Display** (1 hour):
1. Create credits config (15 min)
2. Update UI component (30 min)
3. Test insufficient credits flow (15 min)

**Part 4: Cover Images** (30 min):
1. Remove filter if exists (10 min)
2. Add type badges (15 min)
3. Test gallery (5 min)

**Part 5: Image Deletion** (1-2 hours):
1. Add delete button to gallery (30 min)
2. Create delete endpoint (30 min)
3. Add confirmation modal (30 min)
4. Test deletion flow (30 min)

### Testing (1-2 hours)
- Unit tests for credits
- Integration tests for API
- Manual testing all flows

### Code Review & Deploy (30 min)

**Total: 6.5-10.5 hours**

---

## Success Metrics

- [ ] Reference images generation: 0 errors
- [ ] Credits charged: 100% accuracy
- [ ] Cost displayed: 100% of generation UIs
- [ ] Cover images visible: 100% in galleries
- [ ] Image deletion: 100% success rate
- [ ] User satisfaction: Fewer support tickets about image management

---

## Risks & Mitigation

### Risk 1: Credits Double-Charging
**Probability**: Low
**Impact**: High

**Mitigation**:
- Deduct credits in single transaction
- Add idempotency key to prevent duplicate charges
- Thorough testing

### Risk 2: Deleting Wrong Image
**Probability**: Medium
**Impact**: Low

**Mitigation**:
- Confirmation modal
- Prevent deleting current avatar
- Clear warning about no refund

### Risk 3: R2 Deletion Fails but DB Record Deleted
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Delete R2 first, then DB (fail early)
- Transaction rollback if R2 delete fails
- Cleanup job for orphaned DB records

---

## Dependencies

### Backend
- ComfyUI client
- Credits service
- R2 storage client
- Prisma (CharacterImage, CreditTransaction)

### Frontend
- Image gallery component
- Credits display component
- Confirmation modal (Dialog)
- React Query (mutations)

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Critical bugs blocking image generation feature

### Estimated Effort
- **Optimistic**: 6 hours
- **Realistic**: 8-9 hours
- **Pessimistic**: 11 hours

**Recommendation**: Allocate 9 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/character-image-generation-fixes

# 2. Part 1: Reference Images Error
# Investigate error: grep -r "prompt must contain positive and negative" backend/src
# Ensure prompts always provided (promptBuilder.ts)
# Update endpoint (characterImages.ts)
# Test generation

# 3. Part 2: Credits Charging
# Audit: grep -r "deductCredits" backend/src/services/imageGeneration
# Add credits deduction if missing
# Add refund on failure
# Unit tests

# 4. Part 3: Cost Display
# Create config/credits.ts
# Update ImageGenerationPanel.tsx
# Test UI

# 5. Part 4: Cover Images
# Find and remove filter in backend/frontend
# Add type badges
# Test gallery

# 6. Part 5: Image Deletion
# Add delete button to ImageGallery.tsx
# Create DELETE /api/v1/characters/:id/images/:imageId
# Add confirmation modal
# Test deletion

# 7. Test
npm run test # Backend tests
npm run dev  # Manual testing

# 8. Create PR
```

### Key Considerations

1. **Credits First**: Always deduct credits BEFORE generation
2. **Refund on Failure**: If generation fails, refund credits
3. **Clear Prompts**: Always provide both positive and negative prompts
4. **Avatar Protection**: Cannot delete current avatar
5. **No Refund on Delete**: Deleting image does not refund credits

### Questions to Clarify

- Should we add bulk delete for images?
- Should admins be able to delete without confirmation?
- Should we add image type filter in gallery?
- Refund policy: partial refund if some stages fail?

---

**End of Specification**

🖼️ Ready for implementation - Focus on credits accuracy and error handling!
