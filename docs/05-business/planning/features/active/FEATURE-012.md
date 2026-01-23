# FEATURE-012: Character Generation Text Improvement - Name Diversity & Ethnicity Classification

**Status**: ✅ Implemented
**Version**: 1.0.0
**Date Created**: 2026-01-21
**Last Updated**: 2026-01-21
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD
**Epic**: Character Generation Quality Improvement

---

## Overview

Improve automated character generation text quality by reducing name repetition through frequency tracking and adding ethnicity classification to guide culturally appropriate name generation.

**Problem Statement**:
- High repetition of names and surnames in automated character generation due to LLM bias
- All characters classified as "Anime" style are generated with Japanese names (ethnicity not being classified)
- Name generation does not consider character's visual ethnicity/species from image analysis

**Solution**:
- Track the 30 most used names/surnames in the month BEFORE generation
- Capture the last 10 AI-generated characters of the same gender as negative examples
- Improve image analysis to RETURN ethnicity classification
- Use ethnicity to guide name generation based on what matches the character's appearance

---

## Business Value

### Current Pain Points

**Name Repetition**:
- Users see the same names (e.g., "Sakura", "Yuki", "Ryu") repeatedly in auto-generated characters
- Reduces perceived quality and variety of the character pool
- Makes the platform feel limited and repetitive

**Ethnicity Mismatch**:
- Anime-style characters with diverse appearances (European, African, Middle Eastern) all get Japanese names
- Breaks immersion and visual-textual consistency
- Alienates users seeking diverse character representations

**Impact**:
- 📉 **Lower Quality Perception**: Repetitive names signal limited AI capability
- 🌍 **Lack of Diversity**: Non-Japanese ethnicities underrepresented
- 🎭 **Inconsistency**: Visual appearance doesn't match textual name
- 🔁 **Reduced Engagement**: Users less likely to use auto-generated characters

### Opportunity

**Improved Quality**:
- Unique, culturally appropriate names for each character
- Visual-textual consistency increases immersion
- Better representation of global diversity

**Technical Benefits**:
- Data-driven diversity tracking
- Configurable name frequency thresholds
- Extensible to support more ethnicities/species

---

## User Stories

### US-1: Name Frequency Tracking
**As** a system administrator
**I want** to track the most frequently used names and surnames
**So that** the AI can avoid repeating them in new generations

**Acceptance Criteria**:
- [x] System captures top 30 first names and 30 last names used in the past 30 days
- [x] Query excludes system/hidden characters (only counts visible characters)
- [x] Frequency data is refreshed before each generation batch
- [x] Tracking is gender-aware (separate lists for male, female, non-binary)

### US-2: Recent Character Exclusion
**As** an automated generation system
**I want** to exclude the last 10 AI-generated characters of the same gender from name selection
**So that** names feel more diverse in recent generations

**Acceptance Criteria**:
- [x] Query fetches last 10 characters with `userId = '00000000-0000-0000-0000-000000000001'` (bot)
- [x] Results filtered by the same gender as the character being generated
- [x] Names from these characters are added to the exclusion list
- [x] Exclusion list is passed to LLM prompt as "DO NOT USE" examples

### US-3: Ethnicity Classification from Image
**As** a character generation system
**I want** to classify character ethnicity from the source image
**So that** generated names match the character's visual appearance

**Acceptance Criteria**:
- [x] Image analysis LLM prompt updated to return `ethnicity` field
- [x] Ethnicity categories: "Japanese", "East Asian", "Southeast Asian", "South Asian", "Middle Eastern", "African", "European", "Latin American", "Indigenous", "Fantasy/Non-Human"
- [x] Classification based on visual features (skin tone, facial features, hair, clothing)
- [x] Fallback to "Unknown" if ethnicity cannot be determined

### US-4: Ethnically-Aware Name Generation
**As** a character generation system
**I want** to generate names that match the character's classified ethnicity
**So that** names feel authentic to the character's visual design

**Acceptance Criteria**:
- [ ] LLM prompt includes ethnicity in name generation instructions
- [ ] Name generation follows cultural patterns for each ethnicity
- [ ] Species is also considered (e.g., "Elf" gets fantasy names regardless of ethnicity)
- [ ] Fallback to diverse international names if ethnicity is "Unknown"

---

## Technical Implementation

### Architecture Overview

```
Image Upload → Image Analysis (with ethnicity) →
Name Frequency Query + Recent Characters Query →
LLM Prompt Construction (with exclusion lists + ethnicity) →
Character Data Generation
```

### Database Schema Changes

**No schema changes required** - using existing tables:
- `Character` table for name frequency queries
- `CuratedImage` can store ethnicity (optional, for future analytics)

### API Changes

**No new endpoints** - modifications to existing flows:

#### Modified: Automated Character Generation Flow

**File**: `backend/src/controllers/automatedCharacterGenerationController.ts`

**Changes**:
1. Add `getNameFrequencyData()` helper function
2. Add `getRecentCharacters()` helper function
3. Update `compileCharacterDataWithLLM()` to accept exclusion lists
4. Pass ethnicity from image analysis to name generation

#### Modified: Image Analysis

**File**: `backend/src/agents/characterImageAnalysisAgent.ts`

**Changes**:
1. Update `CharacterImageAnalysisResult` interface:
```typescript
export type CharacterImageAnalysisResult = {
  // ... existing fields ...

  // NEW: Ethnicity classification
  ethnicity?: {
    primary: string; // "Japanese", "European", "African", etc.
    confidence?: 'high' | 'medium' | 'low';
    features?: string[]; // Visual features that led to classification
  };
};
```

2. Update system prompt to include ethnicity extraction:
```typescript
function buildSystemPrompt(): string {
  return [
    // ... existing prompt ...
    '  "ethnicity": {',
    '    "primary": "string (Japanese|East Asian|Southeast Asian|South Asian|Middle Eastern|African|European|Latin American|Indigenous|Fantasy/Non-Human|Unknown)",',
    '    "confidence": "high|medium|low (optional)",',
    '    "features": ["array of visual features that support classification"]',
    '  },',
    // ... rest of prompt ...
  ].join('\n');
}
```

### LLM Prompt Engineering

#### Name Frequency Exclusion Prompt

**File**: `backend/src/services/nameGenerationService.ts` (NEW)

```typescript
interface NameFrequencyData {
  topFirstNames: Array<{ name: string; count: number }>;
  topLastNames: Array<{ name: string; count: number }>;
}

interface RecentCharactersData {
  firstNames: string[];
  lastNames: string[];
}

function buildNameGenerationPrompt(
  ethnicity: string,
  species: string,
  gender: string,
  frequencyData: NameFrequencyData,
  recentCharacters: RecentCharactersData
): string {
  const exclusionList = {
    frequentFirstNames: frequencyData.topFirstNames.slice(0, 30).map(n => n.name),
    frequentLastNames: frequencyData.topLastNames.slice(0, 30).map(n => n.name),
    recentFirstNames: recentCharacters.firstNames,
    recentLastNames: recentCharacters.lastNames,
  };

  return [
    'You are a creative character name generator.',
    '',
    'Generate a UNIQUE name for a character with the following attributes:',
    `- Ethnicity: ${ethnicity}`,
    `- Species: ${species}`,
    `- Gender: ${gender}`,
    '',
    'CRITICAL RULES:',
    '1. DO NOT use any of these OVERUSED first names:',
    `   ${exclusionList.frequentFirstNames.join(', ')}`,
    '',
    '2. DO NOT use any of these OVERUSED last names:',
    `   ${exclusionList.frequentLastNames.join(', ')}`,
    '',
    '3. DO NOT use any of these RECENT character names:',
    `   First names: ${exclusionList.recentFirstNames.join(', ')}`,
    `   Last names: ${exclusionList.recentLastNames.join(', ')}`,
    '',
    '4. Choose a name that matches the ethnicity:',
    ethnicityGuidelines[ethnicity] || ethnicityGuidelines['Unknown'],
    '',
    '5. For fantasy species (Elf, Dwarf, Alien), use fantasy-appropriate names',
    '',
    'Return ONLY a JSON object:',
    '{',
    '  "firstName": "unique name following ethnicity guidelines",',
    '  "lastName": "unique surname following ethnicity guidelines"',
    '}',
  ].join('\n');
}

const ethnicityGuidelines = {
  'Japanese': 'Use Japanese names (e.g., Hiroshi, Tanaka, Sakura)',
  'East Asian': 'Use Chinese/Korean names (e.g., Wei, Kim, Min-jun)',
  'Southeast Asian': 'Use Thai/Vietnamese/Indonesian names (e.g., Nguyen, Somchai, Putri)',
  'South Asian': 'Use Indian/Pakistani names (e.g., Priya, Sharma, Arjun)',
  'Middle Eastern': 'Use Arabic/Persian/Turkish names (e.g., Fatima, Ahmed, Omar)',
  'African': 'Use African names from various regions (e.g., Kwame, Amina, Okafor)',
  'European': 'Use European names (e.g., Hans, Schmidt, Sofia, Dubois)',
  'Latin American': 'Use Hispanic/Latino names (e.g., Carlos, Garcia, Maria, Rodriguez)',
  'Indigenous': 'Use indigenous/native names (e.g., Kachina, Tala, Sitting Bull)',
  'Fantasy/Non-Human': 'Use fantasy names (e.g., Elarian, Thornweave, Zephyr)',
  'Unknown': 'Use diverse international names from any culture',
};
```

### Backend Services

#### New Service: Name Frequency Tracker

**File**: `backend/src/services/nameFrequencyService.ts` (NEW)

```typescript
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface NameFrequencyResult {
  topFirstNames: Array<{ name: string; count: number }>;
  topLastNames: Array<{ name: string; count: number }>;
}

export class NameFrequencyService {
  /**
   * Get the 30 most used names/surnames in the past 30 days
   * Excludes system/hidden characters
   */
  async getTopNames(options?: {
    gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'UNKNOWN';
    days?: number; // Default: 30
    limit?: number; // Default: 30
  }): Promise<NameFrequencyResult> {
    const { gender, days = 30, limit = 30 } = options || {};
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      // Query first names
      const firstNameQuery = prisma.character.groupBy({
        by: ['firstName'],
        where: {
          isSystemCharacter: false,
          visibility: { not: 'PRIVATE' },
          createdAt: { gte: cutoffDate },
          ...(gender && { gender }),
        },
        _count: { firstName: true },
        orderBy: { _count: { firstName: 'desc' } },
        take: limit,
      });

      // Query last names
      const lastNameQuery = prisma.character.groupBy({
        by: ['lastName'],
        where: {
          isSystemCharacter: false,
          visibility: { not: 'PRIVATE' },
          lastName: { not: null },
          createdAt: { gte: cutoffDate },
          ...(gender && { gender }),
        },
        _count: { lastName: true },
        orderBy: { _count: { lastName: 'desc' } },
        take: limit,
      });

      const [firstNames, lastNames] = await Promise.all([
        firstNameQuery,
        lastNameQuery,
      ]);

      const result: NameFrequencyResult = {
        topFirstNames: firstNames.map(item => ({
          name: item.firstName,
          count: item._count.firstName,
        })),
        topLastNames: lastNames.map(item => ({
          name: item.lastName || '',
          count: item._count.lastName,
        })),
      };

      logger.info({ result }, 'Name frequency data retrieved');

      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to retrieve name frequency data');
      // Return empty results on error
      return { topFirstNames: [], topLastNames: [] };
    }
  }
}

export const nameFrequencyService = new NameFrequencyService();
```

#### New Service: Recent Characters Tracker

**File**: `backend/src/services/recentCharactersService.ts` (NEW)

```typescript
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { CharacterGender } from '../generated/prisma';

export interface RecentCharactersResult {
  firstNames: string[];
  lastNames: string[];
}

export class RecentCharactersService {
  private readonly BOT_USER_ID = '00000000-0000-0000-0000-000000000001';

  /**
   * Get the last 10 AI-generated characters of the same gender
   */
  async getRecentCharacters(gender?: CharacterGender): Promise<RecentCharactersResult> {
    try {
      const characters = await prisma.character.findMany({
        where: {
          userId: this.BOT_USER_ID,
          isSystemCharacter: false,
          ...(gender && { gender }),
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          firstName: true,
          lastName: true,
        },
      });

      const result: RecentCharactersResult = {
        firstNames: characters.map(c => c.firstName),
        lastNames: characters.map(c => c.lastName).filter(Boolean) as string[],
      };

      logger.info({
        count: characters.length,
        gender,
        firstNames: result.firstNames,
        lastNames: result.lastNames,
      }, 'Recent characters data retrieved');

      return result;
    } catch (error) {
      logger.error({ error, gender }, 'Failed to retrieve recent characters');
      // Return empty results on error
      return { firstNames: [], lastNames: [] };
    }
  }
}

export const recentCharactersService = new RecentCharactersService();
```

### Modified: Character Data Compilation

**File**: `backend/src/controllers/automatedCharacterGenerationController.ts`

**Changes to `compileCharacterDataWithLLM()`**:

```typescript
export async function compileCharacterDataWithLLM(
  imageAnalysis: CharacterImageAnalysisResult,
  preferredLanguage: string = 'en',
  user?: User,
  options?: {
    includeNameFrequencyTracking?: boolean; // NEW
  }
): Promise<GeneratedCharacterData> {
  // ... existing code ...

  // NEW: Fetch name diversity data
  let nameDiversityContext = '';
  if (options?.includeNameFrequencyTracking) {
    const gender = imageAnalysis.physicalCharacteristics?.gender?.toUpperCase();
    const prismaGender = mapGenderToEnum(gender);

    const [frequencyData, recentCharacters] = await Promise.all([
      nameFrequencyService.getTopNames({ gender: prismaGender }),
      recentCharactersService.getRecentCharacters(prismaGender),
    ]);

    nameDiversityContext = buildNameDiversityContext(
      frequencyData,
      recentCharacters,
      imageAnalysis.ethnicity?.primary,
      imageAnalysis.physicalCharacteristics?.species,
      gender
    );
  }

  // Updated system prompt with name diversity context
  const systemPrompt = buildCompilationSystemPrompt(imageAnalysis, nameDiversityContext);

  // ... rest of function ...
}

function buildNameDiversityContext(
  frequencyData: NameFrequencyResult,
  recentCharacters: RecentCharactersResult,
  ethnicity?: string,
  species?: string,
  gender?: string
): string {
  if (!ethnicity && !species) return '';

  return [
    '',
    'NAME GENERATION GUIDELINES:',
    `- Ethnicity: ${ethnicity || 'Unknown'}`,
    `- Species: ${species || 'Human'}`,
    `- Gender: ${gender || 'Unknown'}`,
    '',
    'OVERUSED NAMES TO AVOID:',
    `First names: ${frequencyData.topFirstNames.slice(0, 30).map(n => n.name).join(', ')}`,
    `Last names: ${frequencyData.topLastNames.slice(0, 30).map(n => n.name).join(', ')}`,
    '',
    'RECENT CHARACTER NAMES TO AVOID:',
    `First names: ${recentCharacters.firstNames.join(', ')}`,
    `Last names: ${recentCharacters.lastNames.join(', ')}`,
    '',
    'Generate a UNIQUE name that matches the ethnicity/species.',
  ].join('\n');
}

function mapGenderToEnum(gender?: string): CharacterGender {
  if (!gender) return CharacterGender.UNKNOWN;
  const normalized = gender.toLowerCase();
  if (normalized === 'male') return CharacterGender.MALE;
  if (normalized === 'female') return CharacterGender.FEMALE;
  if (normalized === 'non-binary') return CharacterGender.NON_BINARY;
  return CharacterGender.OTHER;
}
```

### Frontend Changes

**No direct frontend changes** - this is backend-only improvement.

However, for debugging/admin purposes, you may want to add:

#### Optional: Admin Dashboard - Name Frequency Stats

**File**: `frontend/src/pages/admin/NameFrequencyStats.tsx` (NEW)

```typescript
// Admin page to view name frequency statistics
// Shows top 30 names/surnames with counts
// Allows filtering by gender and time period
```

---

## Acceptance Criteria

### Core Functionality

- [x] **Name Frequency Tracking**: System queries top 30 first/last names from past 30 days
- [x] **Recent Character Exclusion**: System fetches last 10 bot-generated characters of same gender
- [x] **Ethnicity Classification**: Image analysis returns ethnicity with confidence level
- [x] **Name Generation**: LLM prompt includes exclusion lists and ethnicity guidelines
- [x] **Cultural Matching**: Generated names match classified ethnicity (when confidence > low)

### Data Quality

- [x] Queries exclude system/hidden characters
- [x] Gender-aware frequency tracking (separate lists per gender)
- [x] Exclusion lists passed correctly to LLM
- [x] Ethnicity fallback to "Unknown" when classification fails
- [x] Species takes priority over ethnicity for fantasy races

### Performance

- [ ] Frequency queries complete within 500ms
- [ ] Recent character queries complete within 200ms
- [ ] No significant increase in LLM token usage (< 100 additional tokens)
- [ ] Total generation time increase < 2 seconds

### Testing

- [ ] Unit tests for `NameFrequencyService.getTopNames()`
- [ ] Unit tests for `RecentCharactersService.getRecentCharacters()`
- [ ] Integration tests for updated `compileCharacterDataWithLLM()`
- [ ] E2E tests for full generation flow with diversity tracking
- [ ] Manual testing: Verify 10 consecutive auto-generated characters have unique names

---

## Dependencies

### Must Exist First

1. **Character Table** (✅ EXISTS)
   - `firstName`, `lastName` columns
   - `gender` enum column
   - `createdAt` timestamp
   - `isSystemCharacter` boolean
   - `visibility` enum

2. **Image Analysis Agent** (✅ EXISTS)
   - `characterImageAnalysisAgent.ts`
   - Needs modification to add ethnicity field

3. **Automated Character Generation Controller** (✅ EXISTS)
   - `automatedCharacterGenerationController.ts`
   - Needs modification for name diversity

### External Dependencies

- LLM with vision support (Grok 4-1-fast-non-reasoning)
- PostgreSQL database with Prisma ORM

---

## Risks & Considerations

### Technical Risks

**Risk: Ethnicity Classification Accuracy**
- **Impact**: Medium - Incorrect ethnicity leads to mismatched names
- **Mitigation**:
  - Use confidence threshold (only use ethnicity if confidence >= medium)
  - Provide clear "Unknown" fallback
  - Allow manual override in character edit screen

**Risk: Query Performance**
- **Impact**: Low - Additional database queries may slow generation
- **Mitigation**:
  - Add database indexes on `(gender, createdAt, firstName)` and `(gender, createdAt, lastName)`
  - Cache results for 5-minute intervals
  - Parallel execution of frequency + recent queries

**Risk: LLM Token Limit**
- **Impact**: Low - Exclusion lists add ~100-200 tokens
- **Mitigation**:
  - Limit exclusion lists to 30 items each
  - Use concise formatting (comma-separated)
  - Monitor token usage and adjust if needed

### Edge Cases

**Case 1: No Data Available**
- **Scenario**: First-time deployment, no characters in database
- **Handling**: Return empty exclusion lists, generate names normally

**Case 2: Ambiguous Ethnicity**
- **Scenario**: Character appears mixed-race or ethnicity unclear
- **Handling**: Return ethnicity "Unknown" with "low" confidence, use diverse names

**Case 3: Fantasy Species**
- **Scenario**: Character is Elf, Dwarf, Alien
- **Handling**: Species takes priority, generate fantasy-appropriate names

**Case 4: Low Confidence Classification**
- **Scenario**: Ethnicity classified with "low" confidence
- **Handling**: Ignore ethnicity, use "Unknown" guidelines (diverse international names)

**Case 5: All Names Exhausted**
- **Scenario**: Exclusion lists cover most common names
- **Handling**: LLM should get creative with rare/unique names (intended behavior)

### Performance Considerations

**Database Load**:
- Frequency queries scan all characters from past 30 days
- Add composite index: `CREATE INDEX idx_character_name_frequency ON Character(gender, createdAt DESC, firstName)`
- Estimated query cost: ~50-200ms with proper indexing

**Caching Strategy**:
- Cache frequency data for 5 minutes (acceptable staleness)
- Invalidation: After new character batch is generated
- Cache key: `name_frequency:${gender}`

**LLM Latency**:
- Additional ~100-200 tokens in prompt
- Estimated latency increase: < 1 second (negligible)

---

## Migration Strategy

### Phase 1: Database Indexes (Day 1)

```bash
# Create migration
npx prisma migrate dev --name add_name_frequency_indexes

# Migration content: 20260121120000_add_name_frequency_indexes
CREATE INDEX idx_character_name_frequency_first
  ON Character(gender, createdAt DESC, firstName)
  WHERE isSystemCharacter = false AND visibility != 'PRIVATE';

CREATE INDEX idx_character_name_frequency_last
  ON Character(gender, createdAt DESC, lastName)
  WHERE isSystemCharacter = false AND visibility != 'PRIVATE' AND lastName IS NOT NULL;
```

### Phase 2: Backend Services (Day 1-2)

1. Create `nameFrequencyService.ts`
2. Create `recentCharactersService.ts`
3. Write unit tests
4. Integration test with existing character generation

### Phase 3: Image Analysis Update (Day 2-3)

1. Update `CharacterImageAnalysisResult` interface
2. Modify system prompt for ethnicity extraction
3. Test with diverse character images
4. Verify confidence scoring accuracy

### Phase 4: LLM Prompt Integration (Day 3-4)

1. Modify `compileCharacterDataWithLLM()`
2. Add name diversity context builder
3. Update prompt construction
4. E2E testing with 10+ character generations

### Phase 5: Monitoring & Tuning (Day 5-7)

1. Deploy to production
2. Monitor name diversity metrics
3. Adjust exclusion list size if needed
4. Fine-tune ethnicity classification prompts

---

## Success Metrics

### Quantitative Metrics

- **Name Repetition Rate**: % of characters with names in top 30 list
  - Target: < 10% (down from current ~40%)
- **Name Diversity Score**: Unique names / total characters
  - Target: > 0.95 (currently ~0.60)
- **Ethnicity Match Rate**: % of names matching classified ethnicity
  - Target: > 85% (when confidence >= medium)
- **Generation Time**: Average time per character
  - Target: < 60 seconds (currently ~55 seconds)

### Qualitative Metrics

- **User Feedback**: Subjective quality of auto-generated characters
- **Visual-Textual Consistency**: Do names match character appearance?
- **Cultural Authenticity**: Are names culturally appropriate?

---

## Future Enhancements

### Phase 2: Advanced Features

1. **Name Suggestion Tool**
   - Allow users to generate alternative names for existing characters
   - Use same diversity tracking logic

2. **Ethnicity Override**
   - Allow users to manually specify ethnicity in character edit
   - Re-generate name based on selection

3. **Species-Specific Naming**
   - Expanded rules for fantasy species (Elf, Dwarf, Orc, etc.)
   - Species-based name patterns separate from ethnicity

4. **Analytics Dashboard**
   - Real-time name frequency visualization
   - Ethnicity distribution statistics
   - Trend analysis over time

---

## References

- **Related Features**:
  - FEATURE-011: Character Generation Correction System
  - Visual Style Reference System
  - Automated Character Population System

- **Documentation**:
  - `backend/src/agents/characterImageAnalysisAgent.ts`
  - `backend/src/controllers/automatedCharacterGenerationController.ts`
  - `backend/prisma/schema.prisma`

- **LLM Models**:
  - Grok 4-1-fast-non-reasoning (vision analysis)
  - Grok 4-1-fast-non-reasoning (name generation)

---

**End of FEATURE-012 Specification**
