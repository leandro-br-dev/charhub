# Data Completeness Correction Service Documentation

**Purpose**: Automatic correction of incomplete bot-generated character data through intelligent fallback strategies and LLM-powered regeneration.

**Related Files**:
- Service: `backend/src/services/correction/dataCompletenessCorrectionService.ts`
- Controller: `backend/src/controllers/automatedCharacterGenerationController.ts`
- Database: `backend/prisma/schema.prisma` (Character, CorrectionJobLog models)
- Cron Job: `backend/src/scripts/cronJobs.ts` (scheduled execution)
- LLM Service: `backend/src/services/llm/` (character data compilation)

## Overview

The Data Completeness Correction Service identifies and fixes incomplete character data in bot-generated characters. It addresses common LLM fallback defaults and missing classifications through a multi-tier correction strategy.

### Problems It Solves

| Issue | Detection | Correction |
|-------|-----------|------------|
| Generic firstName | `firstName === 'Character'` | LLM regenerates proper name |
| Missing species | `speciesId === NULL` | 7-tier species resolution algorithm |
| Unknown gender | `gender === 'UNKNOWN'` (humanoids only) | Infer from description |
| Default theme | `theme === 'DARK_FANTASY'` | Re-evaluate from character data |
| Empty content tags | `contentTags = []` (non-L rating) | Infer from text analysis |

### Key Features

- **Random Selection**: Fisher-Yates shuffle for unbiased character processing
- **7-Day Cooldown**: Prevents reprocessing via `CorrectionJobLog` tracking
- **Intelligent Species Resolution**: Synonym mapping + fuzzy search + multi-tier fallback
- **Selective Field Correction**: Only corrects incomplete fields
- **Batch Processing**: Processes up to 50 characters per job
- **Comprehensive Logging**: Tracks before/after states and corrected fields

## Architecture

### Database Models

```prisma
model Character {
  id                       String              @id @default(uuid())
  userId                   String
  firstName                String
  lastName                 String?
  age                      Int?
  gender                   CharacterGender?
  speciesId                String?             // NULL = needs correction
  theme                    CharacterTheme?     // DARK_FANTASY = re-evaluate
  contentTags              ContentTag[]
  ageRating                AgeRating

  correctionJobLogs        CorrectionJobLog[] // Cooldown tracking
  // ... other fields
}

model CorrectionJobLog {
  id              String   @id @default(uuid())
  jobType         String   // 'data-completeness-correction'
  characterId     String?  // Individual correction
  targetCount     Int
  successCount    Int
  failureCount    Int
  duration        Int      // Seconds
  fieldsCorrected String[] // ['speciesId', 'firstName']
  details         Json?    // Before/after states
  completedAt     DateTime @default(now())

  character       Character? @relation(fields: [characterId], references: [id])
}
```

### Correction Flow

```
1. FIND (findCharactersWithIncompleteData)
   ├─ Query: userId = BOT_USER_ID
   ├─ Cooldown: NOT corrected in last 7 days
   ├─ Criteria: speciesId NULL OR firstName='Character' OR
   │             gender='UNKNOWN' OR theme='DARK_FANTASY' OR
   │             contentTags=[] AND ageRating!='L'
   └─ Selection: Random (Fisher-Yates shuffle)

2. CORRECT (correctCharacter)
   ├─ Identify incomplete fields
   ├─ speciesId: resolveSpeciesId() → 7-tier algorithm
   ├─ firstName: compileCharacterDataWithLLM()
   ├─ gender: inferGenderFromDescription()
   ├─ theme: inferThemeFromCharacter()
   └─ contentTags: inferContentTagsFromText()

3. LOG (CorrectionJobLog.create)
   ├─ Record: success/failure, duration, fields corrected
   ├─ Metadata: before/after states
   └─ Cooldown: Prevents reprocessing for 7 days
```

## Species Resolution: 7-Tier Algorithm

The core complexity of this service is the species identification algorithm. It uses a progressive fallback strategy to maximize correct classification.

### Tier 1: Synonym Mapping (140+ mappings)

Maps common species name variations to canonical names:

```typescript
const SPECIES_SYNONYMS: Record<string, string> = {
  // Japanese/Asian mythological creatures
  'wolf yokai': 'Yokai',
  'fox spirit': 'Kitsune',
  'fox yokai': 'Kitsune',
  'cat girl': 'Nekomimi',
  'catgirl': 'Nekomimi',
  'tanuki': 'Tanuki',
  'kappa': 'Kappa',
  'tengu': 'Tengu',
  'oni': 'Oni',

  // Robot/Android variants
  'android': 'Robot',
  'cyborg': 'Robot',
  'gynoid': 'Robot',
  'mec': 'Robot',
  'mecha': 'Robot',
  'machine': 'Robot',
  'automaton': 'Robot',
  'ai': 'Robot',

  // Elf variants
  'half-elf': 'Elf',
  'dark elf': 'Elf',
  'drow': 'Elf',
  'high elf': 'Elf',
  'wood elf': 'Elf',

  // Demon/Vampire variants
  'succubus': 'Demon',
  'incubus': 'Demon',
  'devil': 'Demon',
  'vampire': 'Vampire',
  'dhampir': 'Vampire',

  // Dragon variants
  'dragon girl': 'Dragon',
  'dragonborn': 'Dragon',
  'dracokin': 'Dragon',
  'half-dragon': 'Dragon',
  'wyrm': 'Dragon',
  'drake': 'Dragon',

  // ... 140+ total mappings
};
```

**Why**: LLMs often generate creative species names. Synonym mapping ensures common variations map to canonical species names.

### Tier 2: Exact Match (case-insensitive)

```typescript
const species = allSpecies.find(
  s => s.name.toLowerCase() === normalizedSpeciesName
);
```

**Why**: Direct match is fastest and most reliable when names align perfectly.

### Tier 3: Fuzzy Search with Fuse.js

```typescript
const fuse = new Fuse(allSpecies, {
  keys: ['name'],
  threshold: 0.4,  // 40% difference allowed
  includeScore: true,
  ignoreLocation: true,  // Better for multi-word names
});

const fuzzyResults = fuse.search(speciesName);
if (fuzzyResults.length > 0 && fuzzyResults[0].score < 0.3) {
  return fuzzyResults[0].item.id;
}
```

**Why**: Handles typos and partial matches (e.g., "Elv" → "Elf", "Drgaon" → "Dragon"). Threshold 0.4 balances precision and recall.

### Tier 4: Partial Match (contains)

```typescript
const species = allSpecies.find(s =>
  normalizedSpeciesName.includes(s.name.toLowerCase()) ||
  s.name.toLowerCase().includes(normalizedSpeciesName)
);
```

**Why**: Handles compound species names (e.g., "Dark Elf" contains "Elf").

### Tier 5: Word-Based Matching

```typescript
const words = normalizedSpeciesName.split(/\s+/);
for (const word of words) {
  if (word.length < 3) continue;  // Skip short words

  const species = allSpecies.find(s =>
    s.name.toLowerCase() === word ||
    s.name.toLowerCase().includes(word) ||
    word.includes(s.name.toLowerCase())
  );

  if (species) return species.id;
}
```

**Why**: Extracts species from multi-word descriptions (e.g., "beautiful elf princess" → "Elf").

### Tier 6: Humanoid Fallback

```typescript
const humanoidTerms = ['girl', 'boy', 'woman', 'man', 'person', 'human', 'humanoid'];

if (humanoidTerms.some(term => normalizedSpeciesName.includes(term))) {
  const species = allSpecies.find(s => s.name.toLowerCase() === 'human');
  if (species) return species.id;
}
```

**Why**: Descriptions like "cat girl" or "dragon person" indicate humanoid species. Defaulting to "Human" is reasonable for anime-style characters.

### Tier 7: Unknown Fallback

```typescript
const UNKNOWN_SPECIES_ID = 'b09b64de-bc83-4c70-9008-0e4a6b43fa48';
return UNKNOWN_SPECIES_ID;
```

**Why**: Ensures every character has a valid species ID, preventing NULL foreign key errors.

## Random Selection: Fisher-Yates Shuffle

Replaced oldest-first selection with random selection to prevent bias:

```typescript
private shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Usage
const candidates = await prisma.character.findMany({ /* ... */ take: limit * 2 });
const shuffled = this.shuffleArray(candidates);
const characters = shuffled.slice(0, limit);
```

**Why**: Oldest-first prioritized early bot characters, leaving newer ones uncorrected. Random selection ensures all incomplete characters have equal probability.

## Cooldown Mechanism

Prevents reprocessing characters via 7-day cooldown:

```typescript
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const candidates = await prisma.character.findMany({
  where: {
    userId: this.BOT_USER_ID,
    NOT: {
      correctionJobLogs: {
        some: {
          jobType: 'data-completeness-correction',
          startedAt: { gte: sevenDaysAgo },
        },
      },
    },
    // ... incomplete criteria
  },
});
```

**Why**: Prevents infinite correction loops and reduces LLM API costs. Characters that fail correction won't be retried immediately.

## Fields Corrected

### 1. Species ID (speciesId)

**Detection**: `speciesId === NULL`

**Correction**: 7-tier species resolution algorithm (see above)

**Example**:
```typescript
const speciesId = await this.resolveSpeciesId('wolf yokai', characterId);
// Returns: UUID for 'Yokai' species
```

### 2. First Name (firstName)

**Detection**: `firstName === 'Character'` (LLM fallback default)

**Correction**: Regenerate with LLM using empty user description

```typescript
const compiledData = await compileCharacterDataWithLLM(
  '',  // Empty to trigger LLM creativity
  null,  // No image analysis
  { firstName, lastName, age, gender, species: 'existing' },
  'en',
  undefined
);

if (compiledData.firstName && compiledData.firstName !== 'Character') {
  updates.firstName = compiledData.firstName;
}
```

**Why**: "Character" is the LLM's fallback when it cannot generate a name. Forcing regeneration with minimal context produces better results.

### 3. Gender (gender)

**Detection**: `gender === 'UNKNOWN'` (only for humanoid species)

**Correction**: Infer from physical characteristics description

```typescript
private async inferGenderFromDescription(
  physicalCharacteristics: string | null,
  speciesId: string | null
): Promise<CharacterGender> {
  // Check if species is humanoid
  const humanoidCategories = ['humanoid', 'human', 'elf', 'demon', 'angel', 'vampire'];
  const isHumanoid = /* ... check species category ... */;

  if (!isHumanoid) return 'UNKNOWN';

  // Infer from pronouns
  const desc = physicalCharacteristics.toLowerCase();
  if (desc.includes(' she ') || desc.includes(' her ') || desc.includes('female')) {
    return 'FEMALE';
  }
  if (desc.includes(' he ') || desc.includes(' his ') || desc.includes('male')) {
    return 'MALE';
  }
  if (desc.includes(' they ') || desc.includes(' non-binary')) {
    return 'NON_BINARY';
  }

  // Default humanoids to FEMALE (most common in anime)
  return 'FEMALE';
}
```

**Why**: "UNKNOWN" is acceptable for non-humanoids (slimes, robots), but humanoids should have a gender.

### 4. Theme (theme)

**Detection**: `theme === 'DARK_FANTASY'` AND `createdAt >= 2026-01-20`

**Correction**: Infer from character data (physicalCharacteristics, personality, history)

```typescript
private async inferThemeFromCharacter(character: IncompleteCharacter): Promise<string> {
  const desc = (
    (character.physicalCharacteristics || '') +
    ' ' +
    (character.personality || '') +
    ' ' +
    (character.history || '')
  ).toLowerCase();

  if (desc.includes('furry') || desc.includes('anthropomorphic')) {
    return 'FURRY';
  }
  if (desc.includes('robot') || desc.includes('cyborg') || desc.includes('sci-fi')) {
    return 'SCI_FI';
  }
  if (desc.includes('dark') || desc.includes('gothic') || desc.includes('vampire')) {
    return 'DARK_FANTASY';
  }
  if (desc.includes('magic') || desc.includes('fantasy') || desc.includes('wizard')) {
    return 'FANTASY';
  }

  return 'FANTASY';  // Default
}
```

**Why**: DARK_FANTASY was the default theme for auto-generated characters before theme detection. Re-evaluating ensures accurate classification.

### 5. Content Tags (contentTags)

**Detection**: `contentTags = []` AND `ageRating !== 'L'`

**Correction**: Infer from text analysis with age rating respect

```typescript
private async inferContentTagsFromText(
  personality: string | null,
  history: string | null,
  physicalCharacteristics: string | null,
  ageRating: string
): Promise<string[]> {
  if (ageRating === 'L') return [];  // Don't add tags for L-rated content

  const combinedText = `${personality} ${history} ${physicalCharacteristics}`.toLowerCase();
  const tags: string[] = [];

  const tagPatterns = [
    { tag: 'VIOLENCE', patterns: ['fight', 'battle', 'weapon'], minRating: 'TWELVE' },
    { tag: 'SEXUAL', patterns: ['love', 'romantic', 'affection'], minRating: 'TEN' },
    { tag: 'HORROR', patterns: ['terror', 'nightmare', 'horror'], minRating: 'FOURTEEN' },
    // ... more patterns
  ];

  for (const { tag, patterns, minRating } of tagPatterns) {
    if (patterns.some(p => combinedText.includes(p))) {
      const minRatingIndex = ratingOrder.indexOf(minRating);
      if (currentRatingIndex >= minRatingIndex) {
        tags.push(tag);
      }
    }
  }

  return tags;
}
```

**Why**: Empty content tags for mature content can lead to inappropriate exposure. Inferring tags from text ensures proper content warnings.

## API/Usage

### Finding Characters with Incomplete Data

```typescript
import { dataCompletenessCorrectionService } from '../services/correction/dataCompletenessCorrectionService';

// Find up to 50 characters needing correction
const characters = await dataCompletenessCorrectionService.findCharactersWithIncompleteData(50);

console.log(`Found ${characters.length} characters needing correction`);
```

### Correcting a Single Character

```typescript
const result = await dataCompletenessCorrectionService.correctCharacter(characterId);

if (result.success) {
  console.log(`Corrected fields: ${result.fieldsCorrected.join(', ')}`);
} else {
  console.error(`Correction failed: ${result.error}`);
}
```

### Running Batch Correction

```typescript
const result = await dataCompletenessCorrectionService.runBatchCorrection(50);

console.log(`
  Correction Results:
  - Target: ${result.targetCount}
  - Success: ${result.successCount}
  - Failed: ${result.failureCount}
  - Duration: ${result.duration}s
  - Error Rate: ${((result.failureCount / result.targetCount) * 100).toFixed(2)}%
`);

if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
}
```

### Resolving Species ID

```typescript
const speciesId = await dataCompletenessCorrectionService.resolveSpeciesId(
  'wolf yokai',  // Species name from LLM
  characterId     // For logging
);

console.log(`Resolved species ID: ${speciesId}`);
// Returns: UUID for 'Yokai' species
```

## Usage Example: Complete Flow

```typescript
import { dataCompletenessCorrectionService } from '../services/correction/dataCompletenessCorrectionService';
import { logger } from '../config/logger';

async function correctIncompleteCharacters() {
  try {
    logger.info('Starting data completeness correction job');

    // Run batch correction (max 50 characters)
    const result = await dataCompletenessCorrectionService.runBatchCorrection(50);

    // Log results
    logger.info({
      targetCount: result.targetCount,
      successCount: result.successCount,
      failureCount: result.failureCount,
      duration: result.duration,
      errorRate: `${((result.failureCount / result.targetCount) * 100).toFixed(2)}%`,
    }, 'Data completeness correction completed');

    // Handle failures
    if (result.errors.length > 0) {
      logger.error({ errors: result.errors }, 'Some characters failed correction');
    }

    return result;
  } catch (error) {
    logger.error({ error }, 'Data completeness correction job failed');
    throw error;
  }
}

// Scheduled execution (e.g., via cron job)
cron.schedule('0 */6 * * *', correctIncompleteCharacters);
// Runs every 6 hours
```

## Dependencies

- **Prisma**: Database ORM for character and correction job queries
- **compileCharacterDataWithLLM**: LLM-powered character data regeneration
- **Fuse.js**: Fuzzy search library for species matching
- **Logger**: Structured logging for debugging and monitoring

## Important Notes

### Best Practices

**DO**:
- Monitor correction job logs for failure patterns
- Add new species synonyms to `SPECIES_SYNONYMS` as needed
- Adjust fuzzy threshold (0.4) if species resolution is too strict/loose
- Test corrections in development before running in production
- Review corrected fields before committing to database

**DON'T**:
- Override the cooldown mechanism (prevents infinite loops)
- Skip validation for bot user ownership (security risk)
- Modify LLM temperature (0.3 is optimized for correction)
- Forget to log corrections (audit trail requirement)
- Process more than 50 characters per batch (performance impact)

### Performance Considerations

- **Random selection** queries `limit * 2` candidates to allow for cooldown filtering
- **Fuzzy search** adds ~50-100ms per species resolution
- **LLM calls** are the bottleneck (~2-5 seconds per character)
- **Batch processing** continues on individual failures (doesn't stop entire job)

### Monitoring

Key metrics to track:

```typescript
// From CorrectionJobLog
const recentJobs = await prisma.correctionJobLog.findMany({
  where: {
    jobType: 'data-completeness-correction',
    completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  },
  orderBy: { completedAt: 'desc' }
});

// Calculate success rate
const totalProcessed = recentJobs.reduce((sum, job) => sum + job.targetCount, 0);
const totalSuccess = recentJobs.reduce((sum, job) => sum + job.successCount, 0);
const successRate = (totalSuccess / totalProcessed) * 100;

console.log(`24h Success Rate: ${successRate.toFixed(2)}%`);
```

### Extending Species Synonyms

To add new species synonym mappings:

```typescript
// In dataCompletenessCorrectionService.ts
const SPECIES_SYNONYMS: Record<string, string> = {
  // ... existing mappings

  // Add new mappings
  'your new synonym': 'CanonicalSpeciesName',
  'another variation': 'CanonicalSpeciesName',
};
```

After adding mappings:
1. Restart the backend service
2. Run batch correction to fix affected characters
3. Monitor logs for successful resolutions

## Testing

```typescript
import { dataCompletenessCorrectionService } from '../services/correction/dataCompletenessCorrectionService';

describe('DataCompletenessCorrectionService', () => {
  describe('Species Resolution', () => {
    it('should resolve species via synonym mapping', async () => {
      const speciesId = await dataCompletenessCorrectionService.resolveSpeciesId(
        'wolf yokai',
        'test-character-id'
      );

      const species = await prisma.species.findUnique({ where: { id: speciesId } });
      expect(species?.name).toBe('Yokai');
    });

    it('should fallback to Unknown for unrecognizable species', async () => {
      const UNKNOWN_SPECIES_ID = 'b09b64de-bc83-4c70-9008-0e4a6b43fa48';
      const speciesId = await dataCompletenessCorrectionService.resolveSpeciesId(
        'xyz123 unrecognizable',
        'test-character-id'
      );

      expect(speciesId).toBe(UNKNOWN_SPECIES_ID);
    });
  });

  describe('Batch Correction', () => {
    it('should correct incomplete fields', async () => {
      const result = await dataCompletenessCorrectionService.runBatchCorrection(10);

      expect(result.targetCount).toBeGreaterThan(0);
      expect(result.successCount).toBeGreaterThanOrEqual(0);
      expect(result.failureCount).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
```

## Troubleshooting

**High failure rate**
- Check logs for common error patterns
- Verify LLM API is accessible
- Review species synonym mappings for gaps

**Species resolution always returns Unknown**
- Verify fuzzy search threshold (0.4)
- Check Fuse.js configuration
- Ensure Species table is populated

**Characters not being selected for correction**
- Verify cooldown period (7 days)
- Check bot user ID is correct
- Review incomplete criteria logic

**LLM regeneration produces generic names**
- Verify user description is empty string
- Check temperature setting (0.3)
- Review LLM provider response logs

## See Also

- **Feature Spec**: `docs/05-business/planning/features/active/FEATURE-016.md`
- **Character Generation**: `backend/src/controllers/automatedCharacterGenerationController.ts`
- **Image Analysis Agent**: `backend/src/agents/characterImageAnalysisAgent.ts`
- **Species Routes**: `backend/src/routes/v1/species.ts`
- **Correction Job Logs**: Database model `CorrectionJobLog`
