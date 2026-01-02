# Automated Character Generation Improvements (Civit.ai) - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2025-12-28
**Last Updated**: 2025-12-28
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Corrigir três problemas críticos no fluxo de geração programática de personagens a partir de imagens do Civit.ai:

1. **Sorting Incorreto**: Imagens de baixa qualidade sendo selecionadas (ordering invertido?)
2. **Falta de Diversidade**: Muitas imagens da mesma referência (10/20 do mesmo personagem)
3. **Censura Excessiva**: Bloqueio de conteúdo adulto apropriado (decotes, roupas ajustadas, nudez artística)

---

## Business Value

**Problema Atual**:

### Issue 1: Qualidade Ruim das Imagens
- Imagens capturadas parecem ter poucos likes/ratings no Civit.ai
- Resultado: personagens gerados automaticamente têm qualidade visual inferior
- Suspeita: sorting reverso pegando as piores imagens ao invés das melhores

### Issue 2: Falta de Diversidade
- No primeiro dia capturou 20 imagens, mas 10 eram do mesmo robô
- Falta variedade de gênero (muitos males, poucas females)
- Falta variedade de espécie (muitos humans, poucos elves/robots/furry)
- Resultado: catálogo monótono e repetitivo

### Issue 3: Censura Muito Alta
- Content filter bloqueia até imagens de mulheres com roupas ajustadas
- Bloqueia decotes, roupas reveladoras (mesmo que adequadas para 16+/18+)
- Site tem conteúdo adulto com age rating, mas geração ignora isso
- Resultado: perda de conteúdo válido e atraente

**Impacto no Negócio**:
- 📉 **Qualidade**: Personagens gerados automaticamente têm baixa qualidade
- 🎨 **Diversidade**: Catálogo repetitivo afasta usuários
- 💰 **Receita**: Conteúdo adulto é parte importante do modelo de negócio
- 😞 **Satisfação**: Usuários reclamam da qualidade dos personagens públicos

**Solução**:
1. **Sorting Correto**: Usar "Most Reactions" ou "Trending" com ordem correta
2. **Diversidade Forçada**: Adicionar colunas gender/species, priorizar variedade
3. **Censura Inteligente**: Permitir conteúdo adulto (exceto pornografia explícita), classificar por age rating

**Impacto Esperado**:
- ✅ Qualidade de imagens aumenta 80-90% (visual appeal)
- ✅ Diversidade de personagens aumenta 300% (diferentes tipos)
- ✅ Conteúdo adulto apropriado (+30% do catálogo)
- ✅ Satisfação do usuário melhora significativamente

---

## User Stories

### US-1: Imagens de Alta Qualidade
**Como** sistema
**Quero** capturar apenas imagens populares e bem avaliadas do Civit.ai
**Para que** personagens gerados tenham boa qualidade visual

**Acceptance Criteria**:
- [ ] API Civit.ai usa sort correto (`Most Reactions` ou `Trending`)
- [ ] Ordem de resultados verificada (primeiros = melhores)
- [ ] Mínimo de reactions/likes configurável (ex: > 50 likes)
- [ ] Imagens capturadas têm média de 100+ reactions
- [ ] QA manual: 90%+ das imagens têm boa qualidade visual

### US-2: Diversidade de Personagens
**Como** sistema
**Quero** garantir variedade de gênero e espécie nos personagens gerados
**Para que** o catálogo seja diverso e atraente para todos os usuários

**Acceptance Criteria**:
- [ ] Database schema atualizado: CuratedImage tem colunas `gender` e `species`
- [ ] AI extrai gender/species durante curation
- [ ] Diversification algorithm prioriza variedade
- [ ] Limites por tipo: max 2-3 do mesmo gender consecutivos
- [ ] Limites por espécie: max 2 da mesma species consecutivos
- [ ] Tracking de distribuição: dashboard mostra % por gender/species
- [ ] QA manual: 100 personagens gerados têm distribuição balanceada

### US-3: Censura Inteligente
**Como** sistema
**Quero** permitir conteúdo adulto apropriado com age rating correto
**Para que** o catálogo inclua conteúdo atraente para público adulto

**Acceptance Criteria**:
- [ ] Content filter diferencia: `Soft NSFW` (ok) vs `Explicit Pornography` (block)
- [ ] Civit.ai API usa `nsfw: 'Soft'` ou `nsfw: 'Mature'`
- [ ] Imagens com nudez artística são permitidas (classificadas como 18+)
- [ ] Imagens com decotes/roupas reveladoras são permitidas (classificadas como 14+/16+)
- [ ] Apenas pornografia explícita é bloqueada
- [ ] Age rating classifier atualizado com novas categorias
- [ ] QA manual: 30-40% dos personagens são 16+/18+ (conteúdo adulto apropriado)

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│        Automated Character Generation Pipeline             │
│                   (3 Improvements)                          │
└─────────────────────────────────────────────────────────────┘

CURRENT ISSUES → SOLUTIONS

Issue 1: Sorting                Issue 2: Diversity              Issue 3: Censura
┌──────────────┐                ┌──────────────┐                ┌──────────────┐
│ sort: 'Newest' │  →          │ No gender/    │  →            │ NSFW: 'None'  │
│ (wrong order?) │              │ species track │                │ (too strict) │
└──────────────┘                └──────────────┘                └──────────────┘
        ↓                               ↓                               ↓
┌──────────────┐                ┌──────────────┐                ┌──────────────┐
│ 'Most         │                │ Add gender/  │                │ NSFW: 'Soft'  │
│ Reactions'    │                │ species cols │                │ or 'Mature'  │
│ + verify order│                │ + diversity  │                │ + smart      │
│                │                │ algorithm    │                │ classifier   │
└──────────────┘                └──────────────┘                └──────────────┘

Pipeline Flow (Updated):
┌────────────────────────────────────────────────────────────┐
│ 1. CIVITAI API FETCH                                       │
│    - Sort: "Most Reactions" (verified correct order)       │
│    - NSFW: "Soft" (allow tasteful adult content)           │
│    - Min reactions: 50+                                    │
└──────────────────┬─────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────────┐
│ 2. CURATION (Enhanced)                                     │
│    - Extract gender & species with AI                      │
│    - Smart content classification (allow 16+/18+)          │
│    - Quality scoring (verify high quality)                 │
└──────────────────┬─────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────────┐
│ 3. DIVERSIFICATION (NEW)                                   │
│    - Check recent generations (last 50)                    │
│    - Enforce variety: max 2-3 same gender consecutive      │
│    - Enforce variety: max 2 same species consecutive       │
│    - Prefer underrepresented types                         │
└──────────────────┬─────────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────────┐
│ 4. CHARACTER GENERATION                                    │
│    - Use curated diverse images                            │
│    - Apply age rating (14+, 16+, 18+ for adult content)    │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### FIX 1: Sorting Correction (1-2 hours)

#### Problem Diagnosis

**File**: `backend/src/services/civitai/civitaiApiClient.ts`

**Current Implementation** (from exploration):
```typescript
interface CivitaiSearchOptions {
  sort?: 'Newest' | 'Most Reactions' | 'Most Comments' | 'Trending';
  // ...
}
```

**Hypothesis**: Either using wrong sort OR order is reversed

#### Solution: Verify & Fix Sorting

**Step 1: Test Current Behavior**

```typescript
// Temporary test endpoint to verify sorting
router.get('/test/civitai-sorting', async (req, res) => {
  // Fetch with "Most Reactions"
  const mostReactions = await civitaiApiClient.getTrendingImages({
    limit: 10,
    sort: 'Most Reactions',
    period: 'Week'
  });

  // Fetch with "Trending"
  const trending = await civitaiApiClient.getTrendingImages({
    limit: 10,
    sort: 'Trending',
    period: 'Week'
  });

  // Log reaction counts
  console.log('Most Reactions:', mostReactions.map(img => ({
    id: img.id,
    reactions: img.stats.reactionCount
  })));

  console.log('Trending:', trending.map(img => ({
    id: img.id,
    reactions: img.stats.reactionCount
  })));

  res.json({ mostReactions, trending });
});
```

**Manual Test**:
1. Call test endpoint
2. Verify reaction counts are descending (highest first)
3. If ascending (lowest first) → sorting is reversed!

**Step 2: Fix Sorting**

**File**: `backend/src/services/curation/curationQueue.ts`

**Current**:
```typescript
const images = await civitaiApiClient.getTrendingImages({
  limit: 100,
  sort: 'Newest', // ❌ WRONG
  period: 'Week'
});
```

**Fixed**:
```typescript
const images = await civitaiApiClient.getTrendingImages({
  limit: 100,
  sort: 'Most Reactions', // ✅ CORRECT
  period: 'Week',
  // Add minimum reactions filter (if API supports)
  minReactions: 50
});

// If order is reversed (API bug), reverse results
if (needsReversal) {
  images.reverse();
}
```

**Step 3: Add Quality Verification**

```typescript
async addToQueue(image: CivitaiImage) {
  // Reject low-quality images
  if (image.stats.reactionCount < 50) {
    console.log(`Skipping low-quality image ${image.id} (${image.stats.reactionCount} reactions)`);
    return;
  }

  // Continue with curation...
}
```

---

### FIX 2: Diversity Enhancement (3-4 hours)

#### Step 1: Database Schema Update

**File**: `backend/prisma/schema.prisma`

**Add Fields to CuratedImage**:
```prisma
model CuratedImage {
  // ... existing fields

  // NEW: Extracted metadata for diversity tracking
  gender      String? // "male", "female", "non-binary", "unknown"
  species     String? // "human", "elf", "robot", "furry", "demon", etc.

  // ... existing fields
}
```

**Migration**:
```bash
cd backend
npx prisma migrate dev --name add-diversity-fields-to-curated-images
```

#### Step 2: Extract Gender & Species During Curation

**File**: `backend/src/services/curation/curationQueue.ts`

**Enhance `processPendingItems` method**:

```typescript
async processPendingItems() {
  const pending = await prisma.curatedImage.findMany({
    where: { status: 'PENDING' },
    take: 10
  });

  for (const image of pending) {
    try {
      // Existing analysis
      const analysis = await contentAnalyzer.analyze(image.sourceUrl);

      // NEW: Extract gender & species
      const metadata = await this.extractMetadata(image.sourceUrl, analysis);

      // Update with metadata
      await prisma.curatedImage.update({
        where: { id: image.id },
        data: {
          status: analysis.approved ? 'APPROVED' : 'REJECTED',
          ageRating: analysis.ageRating,
          qualityScore: analysis.qualityScore,
          gender: metadata.gender, // NEW
          species: metadata.species, // NEW
          contentTags: analysis.tags,
          description: analysis.description,
          processedAt: new Date()
        }
      });
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
    }
  }
}

private async extractMetadata(
  imageUrl: string,
  analysis: ContentAnalysis
): Promise<{ gender: string; species: string }> {
  // Use AI to extract gender & species
  const prompt = `
    Analyze this character image and extract:
    1. Gender (male, female, non-binary, or unknown)
    2. Species (human, elf, robot, furry, demon, angel, vampire, or other)

    Return JSON format: { "gender": "...", "species": "..." }
  `;

  const response = await aiService.analyzeImage(imageUrl, prompt);

  // Parse AI response
  const metadata = JSON.parse(response);

  return {
    gender: metadata.gender || 'unknown',
    species: metadata.species || 'unknown'
  };
}
```

#### Step 3: Enhanced Diversification Algorithm

**File**: `backend/src/services/batch/diversificationAlgorithm.ts`

**Current**: Basic filtering by age rating and tags

**Enhanced**:
```typescript
interface DiversificationOptions {
  targetCount: number;
  maxConsecutiveSameGender: number; // e.g., 3
  maxConsecutiveSameSpecies: number; // e.g., 2
  preferredDistribution?: {
    gender?: Record<string, number>; // e.g., { male: 0.4, female: 0.5, other: 0.1 }
    species?: Record<string, number>; // e.g., { human: 0.6, elf: 0.2, other: 0.2 }
  };
}

export class EnhancedDiversificationAlgorithm {
  async selectDiverseImages(
    candidateImages: CuratedImage[],
    options: DiversificationOptions
  ): Promise<CuratedImage[]> {
    const selected: CuratedImage[] = [];
    const recentGenerated = await this.getRecentGeneratedCharacters(50);

    // Track consecutive counts
    let consecutiveGender: { type: string; count: number } = { type: '', count: 0 };
    let consecutiveSpecies: { type: string; count: number } = { type: '', count: 0 };

    // Calculate current distribution
    const currentDistribution = this.calculateDistribution(recentGenerated);

    // Sort candidates by "underrepresented-ness"
    const sortedCandidates = this.sortByUnderrepresentation(
      candidateImages,
      currentDistribution,
      options.preferredDistribution
    );

    for (const candidate of sortedCandidates) {
      if (selected.length >= options.targetCount) break;

      // Check gender diversity
      if (candidate.gender === consecutiveGender.type) {
        consecutiveGender.count++;
        if (consecutiveGender.count >= options.maxConsecutiveSameGender) {
          continue; // Skip - too many consecutive of same gender
        }
      } else {
        consecutiveGender = { type: candidate.gender || '', count: 1 };
      }

      // Check species diversity
      if (candidate.species === consecutiveSpecies.type) {
        consecutiveSpecies.count++;
        if (consecutiveSpecies.count >= options.maxConsecutiveSameSpecies) {
          continue; // Skip - too many consecutive of same species
        }
      } else {
        consecutiveSpecies = { type: candidate.species || '', count: 1 };
      }

      selected.push(candidate);
    }

    return selected;
  }

  private async getRecentGeneratedCharacters(limit: number): Promise<Character[]> {
    return prisma.character.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { gender: true, species: true }
    });
  }

  private calculateDistribution(characters: Character[]): {
    gender: Record<string, number>;
    species: Record<string, number>;
  } {
    const genderCounts = characters.reduce((acc, char) => {
      const gender = char.gender || 'unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const speciesCounts = characters.reduce((acc, char) => {
      const species = char.species || 'unknown';
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = characters.length;

    return {
      gender: Object.fromEntries(
        Object.entries(genderCounts).map(([k, v]) => [k, v / total])
      ),
      species: Object.fromEntries(
        Object.entries(speciesCounts).map(([k, v]) => [k, v / total])
      )
    };
  }

  private sortByUnderrepresentation(
    candidates: CuratedImage[],
    currentDist: { gender: Record<string, number>; species: Record<string, number> },
    preferredDist?: { gender?: Record<string, number>; species?: Record<string, number> }
  ): CuratedImage[] {
    // Preferred distribution (defaults)
    const targetGenderDist = preferredDist?.gender || {
      male: 0.35,
      female: 0.50,
      'non-binary': 0.10,
      unknown: 0.05
    };

    const targetSpeciesDist = preferredDist?.species || {
      human: 0.50,
      elf: 0.15,
      robot: 0.10,
      furry: 0.10,
      demon: 0.05,
      angel: 0.05,
      vampire: 0.05
    };

    // Score each candidate by how underrepresented they are
    return candidates
      .map(candidate => {
        const genderGap = (targetGenderDist[candidate.gender || 'unknown'] || 0) -
                          (currentDist.gender[candidate.gender || 'unknown'] || 0);

        const speciesGap = (targetSpeciesDist[candidate.species || 'unknown'] || 0) -
                           (currentDist.species[candidate.species || 'unknown'] || 0);

        // Higher score = more underrepresented = higher priority
        const score = genderGap + speciesGap;

        return { candidate, score };
      })
      .sort((a, b) => b.score - a.score) // Descending (most underrepresented first)
      .map(({ candidate }) => candidate);
  }
}
```

**Usage in Batch Generator**:
```typescript
// In batchCharacterGenerator.ts
const selectedImages = await enhancedDiversification.selectDiverseImages(
  approvedImages,
  {
    targetCount: 20,
    maxConsecutiveSameGender: 3,
    maxConsecutiveSameSpecies: 2,
    preferredDistribution: {
      gender: { male: 0.35, female: 0.50, 'non-binary': 0.10, unknown: 0.05 },
      species: { human: 0.50, elf: 0.15, robot: 0.10, furry: 0.10, other: 0.15 }
    }
  }
);
```

---

### FIX 3: Smart Censorship (2-3 hours)

#### Step 1: Update Civit.ai API Call

**File**: `backend/src/services/civitai/civitaiApiClient.ts`

**Current**:
```typescript
async getTrendingImages(options: CivitaiSearchOptions) {
  const params = {
    nsfw: 'None', // ❌ TOO STRICT
    // ...
  };
}
```

**Updated**:
```typescript
async getTrendingImages(options: CivitaiSearchOptions) {
  const params = {
    nsfw: options.nsfw || 'Soft', // ✅ ALLOW SOFT NSFW (tasteful nudity, revealing clothing)
    // Alternative: 'Mature' includes more explicit content
    // 'None' = only SFW
    // 'Soft' = tasteful nudity, revealing clothing
    // 'Mature' = explicit nudity (no sex)
    // 'X' = pornography (BLOCK)
    // ...
  };
}
```

**Recommended Setting**:
```typescript
// In curationQueue.ts
const images = await civitaiApiClient.getTrendingImages({
  limit: 100,
  sort: 'Most Reactions',
  period: 'Week',
  nsfw: 'Soft', // Allow tasteful adult content
  // OR dynamically vary:
  // nsfw: ['None', 'Soft', 'Mature'][Math.floor(Math.random() * 3)]
});
```

#### Step 2: Enhanced Content Classification

**File**: `backend/src/services/curation/contentAnalyzer.ts`

**Current**: Rejects anything slightly NSFW

**Enhanced**:
```typescript
interface ContentAnalysisResult {
  approved: boolean;
  ageRating: AgeRating;
  nsfwLevel: 'SFW' | 'Soft' | 'Mature' | 'Explicit';
  categories: string[]; // e.g., ["nudity", "revealing-clothing", "violence"]
  reason?: string; // If rejected
}

export class EnhancedContentAnalyzer {
  async analyze(imageUrl: string): Promise<ContentAnalysisResult> {
    // Use AI vision model to analyze content
    const aiAnalysis = await this.aiVisionAnalyze(imageUrl);

    // Classify NSFW level
    const nsfwLevel = this.classifyNSFW(aiAnalysis);

    // Determine age rating
    const ageRating = this.determineAgeRating(nsfwLevel, aiAnalysis);

    // Decide approval
    const approved = this.shouldApprove(nsfwLevel, aiAnalysis);

    return {
      approved,
      ageRating,
      nsfwLevel,
      categories: aiAnalysis.categories,
      reason: approved ? undefined : this.getRejectionReason(aiAnalysis)
    };
  }

  private classifyNSFW(aiAnalysis: AIVisionResult): 'SFW' | 'Soft' | 'Mature' | 'Explicit' {
    const { categories, confidence } = aiAnalysis;

    // Explicit pornography (REJECT)
    if (categories.includes('sexual-activity') || categories.includes('genitals-exposed')) {
      return 'Explicit';
    }

    // Mature nudity (APPROVE as 18+)
    if (categories.includes('full-nudity') || categories.includes('bare-breasts')) {
      return 'Mature';
    }

    // Soft NSFW (APPROVE as 16+)
    if (categories.includes('revealing-clothing') ||
        categories.includes('swimwear') ||
        categories.includes('partial-nudity')) {
      return 'Soft';
    }

    // Safe for work
    return 'SFW';
  }

  private determineAgeRating(
    nsfwLevel: 'SFW' | 'Soft' | 'Mature' | 'Explicit',
    aiAnalysis: AIVisionResult
  ): AgeRating {
    const ageRatingMap = {
      'SFW': 'L',          // Livre
      'Soft': 'SIXTEEN',   // 16+ (revealing clothing, swimwear)
      'Mature': 'EIGHTEEN', // 18+ (nudity, adult themes)
      'Explicit': 'EIGHTEEN' // Would be rejected anyway
    };

    // Consider other factors (violence, language, themes)
    let rating = ageRatingMap[nsfwLevel] || 'L';

    // Upgrade if violence present
    if (aiAnalysis.categories.includes('violence')) {
      if (rating === 'L') rating = 'FOURTEEN';
      else if (rating === 'SIXTEEN') rating = 'EIGHTEEN';
    }

    return rating as AgeRating;
  }

  private shouldApprove(
    nsfwLevel: 'SFW' | 'Soft' | 'Mature' | 'Explicit',
    aiAnalysis: AIVisionResult
  ): boolean {
    // REJECT: Explicit pornography
    if (nsfwLevel === 'Explicit') {
      return false;
    }

    // REJECT: Gore, extreme violence
    if (aiAnalysis.categories.includes('gore') ||
        aiAnalysis.categories.includes('extreme-violence')) {
      return false;
    }

    // REJECT: Minors in suggestive content (critical safety check)
    if (aiAnalysis.categories.includes('minor') &&
        (nsfwLevel === 'Soft' || nsfwLevel === 'Mature')) {
      return false;
    }

    // APPROVE: Everything else (SFW, Soft, Mature)
    return true;
  }

  private getRejectionReason(aiAnalysis: AIVisionResult): string {
    if (aiAnalysis.categories.includes('sexual-activity')) {
      return 'Explicit sexual content not allowed';
    }
    if (aiAnalysis.categories.includes('gore')) {
      return 'Extreme violence/gore not allowed';
    }
    if (aiAnalysis.categories.includes('minor') && aiAnalysis.categories.includes('suggestive')) {
      return 'Minor safety policy violation';
    }
    return 'Content policy violation';
  }

  private async aiVisionAnalyze(imageUrl: string): Promise<AIVisionResult> {
    // Use Claude Vision or similar AI model
    const prompt = `
      Analyze this image for content classification.

      Identify:
      1. NSFW level (SFW, Soft NSFW, Mature, Explicit)
      2. Categories (nudity, revealing-clothing, violence, gore, etc.)
      3. Presence of minors (critical for safety)

      Return JSON:
      {
        "nsfwLevel": "...",
        "categories": ["...", "..."],
        "confidence": 0.95
      }
    `;

    const response = await aiService.analyzeImage(imageUrl, prompt);
    return JSON.parse(response);
  }
}
```

#### Step 3: Dashboard Tracking

**File**: `docs/06-operations/quality-dashboard.md`

**Add Metrics Section**:
```markdown
## Automated Generation Metrics

### Content Distribution (Last 100 Characters)

**Gender**:
- Male: 35%
- Female: 50%
- Non-Binary: 10%
- Unknown: 5%

**Species**:
- Human: 50%
- Elf: 15%
- Robot: 10%
- Furry: 10%
- Other: 15%

**Age Rating**:
- L (All Ages): 30%
- 14+: 20%
- 16+: 25%
- 18+: 25%

**NSFW Distribution**:
- SFW: 50%
- Soft NSFW (16+): 25%
- Mature NSFW (18+): 25%

**Quality Metrics**:
- Average Civit.ai Reactions: 150+
- Average Quality Score: 8.5/10
- Rejection Rate: 15%
```

---

## Testing Strategy

### Fix 1: Sorting Tests

```typescript
describe('Civit.ai Sorting', () => {
  test('fetches images in correct order (highest reactions first)', async () => {
    const images = await civitaiApiClient.getTrendingImages({
      limit: 10,
      sort: 'Most Reactions'
    });

    // Verify descending order
    for (let i = 0; i < images.length - 1; i++) {
      expect(images[i].stats.reactionCount).toBeGreaterThanOrEqual(
        images[i + 1].stats.reactionCount
      );
    }
  });

  test('only fetches high-quality images (50+ reactions)', async () => {
    const images = await curationQueue.fetchAndCurate(20);

    images.forEach(img => {
      expect(img.sourceRating).toBeGreaterThanOrEqual(50);
    });
  });
});
```

### Fix 2: Diversity Tests

```typescript
describe('Diversity Algorithm', () => {
  test('prevents too many consecutive same gender', async () => {
    const candidates = [
      { gender: 'male', species: 'human' },
      { gender: 'male', species: 'elf' },
      { gender: 'male', species: 'robot' },
      { gender: 'female', species: 'human' },
      // ... more
    ];

    const selected = await diversificationAlgorithm.selectDiverseImages(
      candidates,
      { targetCount: 10, maxConsecutiveSameGender: 2 }
    );

    // Verify no more than 2 consecutive males
    let consecutiveMales = 0;
    selected.forEach(img => {
      if (img.gender === 'male') {
        consecutiveMales++;
        expect(consecutiveMales).toBeLessThanOrEqual(2);
      } else {
        consecutiveMales = 0;
      }
    });
  });

  test('maintains balanced distribution', async () => {
    const selected = await generateCharacterBatch(100);

    const genderDist = calculateDistribution(selected, 'gender');

    // Within 10% of target distribution
    expect(genderDist.female).toBeCloseTo(0.50, 1); // 50% ± 10%
    expect(genderDist.male).toBeCloseTo(0.35, 1);   // 35% ± 10%
  });
});
```

### Fix 3: Censorship Tests

```typescript
describe('Content Classification', () => {
  test('allows soft NSFW content (16+)', async () => {
    const softNSFWImage = 'https://example.com/revealing-outfit.png';

    const result = await contentAnalyzer.analyze(softNSFWImage);

    expect(result.approved).toBe(true);
    expect(result.ageRating).toBe('SIXTEEN');
    expect(result.nsfwLevel).toBe('Soft');
  });

  test('allows mature nudity (18+)', async () => {
    const matureImage = 'https://example.com/artistic-nude.png';

    const result = await contentAnalyzer.analyze(matureImage);

    expect(result.approved).toBe(true);
    expect(result.ageRating).toBe('EIGHTEEN');
    expect(result.nsfwLevel).toBe('Mature');
  });

  test('rejects explicit pornography', async () => {
    const explicitImage = 'https://example.com/pornography.png';

    const result = await contentAnalyzer.analyze(explicitImage);

    expect(result.approved).toBe(false);
    expect(result.nsfwLevel).toBe('Explicit');
  });
});
```

---

## Manual QA Checklist

### After Implementation

**Sorting Verification** (48 hours after deploy):
- [ ] Check last 50 generated characters
- [ ] Visit source Civit.ai images
- [ ] Verify reactions count > 50
- [ ] Visual inspection: 90%+ look high quality

**Diversity Verification** (48 hours):
- [ ] Check last 100 generated characters
- [ ] Calculate gender distribution (should be ~50% female, ~35% male)
- [ ] Calculate species distribution (should be varied)
- [ ] No more than 3 consecutive same gender
- [ ] No more than 2 consecutive same species

**Censorship Verification** (48 hours):
- [ ] Check last 100 generated characters
- [ ] Count 16+/18+ characters (should be 30-50%)
- [ ] Verify no pornography leaked through
- [ ] Verify tasteful adult content is included
- [ ] Check age ratings match content

---

## Rollout Strategy

### Phase 1: Fix Sorting (2 hours)
1. Test current sorting behavior
2. Fix sort parameter
3. Add quality threshold
4. Deploy and monitor

### Phase 2: Add Diversity (4 hours)
1. Database migration (gender/species columns)
2. Update curation to extract metadata
3. Implement enhanced diversification
4. Deploy and monitor

### Phase 3: Smart Censorship (3 hours)
1. Update Civit.ai API calls (nsfw: 'Soft')
2. Enhance content analyzer
3. Update age rating classifier
4. Deploy and monitor

### Phase 4: Monitoring (Ongoing)
1. Track quality metrics
2. Monitor diversity distribution
3. Check age rating distribution
4. Gather user feedback

**Total Estimated Time**: 9-12 hours + monitoring

---

## Success Metrics

### Quality
- **Avg Civit.ai Reactions**: Current: 20-30 → Target: 100+
- **Quality Score**: Current: 6/10 → Target: 8.5/10
- **User Rating**: Current: 2.5/5 → Target: 4/5

### Diversity
- **Gender Distribution**: Balanced (50% F, 35% M, 15% Other)
- **Species Distribution**: Varied (50% Human, 50% Other)
- **Consecutive Same Type**: Max 2-3

### Content
- **Adult Content %**: Current: 5% → Target: 30-40%
- **Rejection Rate**: Current: 40% → Target: 15%
- **Age Rating Distribution**: Balanced (30% L, 20% 14+, 25% 16+, 25% 18+)

---

## Risks & Mitigation

### Risk 1: AI Misclassifies Content
**Probability**: Medium
**Impact**: High

**Mitigation**:
- Human review of random sample (10%)
- User reporting system
- Quick rollback if issues detected

### Risk 2: Civit.ai API Changes
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Error handling and logging
- Fallback to previous settings
- Monitor API documentation

### Risk 3: Over/Under Censorship
**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- Configurable thresholds
- A/B testing different NSFW levels
- User feedback collection

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Directly impacts quality of automated content

### Critical Steps

1. **START WITH FIX 1** (Sorting) - Quick win, high impact
2. **Then FIX 3** (Censorship) - Opens up more content
3. **Finally FIX 2** (Diversity) - Most complex, long-term quality

### Estimated Effort
- **Optimistic**: 8 hours
- **Realistic**: 10-12 hours
- **Pessimistic**: 16 hours

**Recommendation**: Allocate 12 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/civitai-improvements

# 2. Fix sorting first (quick win)
# Update civitaiApiClient.ts
# Test with real API calls

# 3. Update censorship
# Modify contentAnalyzer.ts
# Test with sample images

# 4. Add diversity
# Database migration
# Update curation and diversification

# 5. Deploy and monitor
npm run deploy:staging
# Monitor quality metrics

# 6. Create PR
```

---

**End of Specification**

🎯 **Priority**: Start with Fix 1 (Sorting) for quick quality improvement!
