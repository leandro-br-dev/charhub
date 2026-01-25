# Character Image Analysis Agent Documentation

**Purpose**: Extract physical traits, metadata, and thematic classification from character images using vision-capable LLMs.

**Related Files**:
- Agent: `backend/src/agents/characterImageAnalysisAgent.ts`
- LLM Service: `backend/src/services/llm/` (LLM calls, usage tracking)
- Usage Tracker: `backend/src/services/llm/llmUsageTracker.ts`
- Used by: Character generation flow (future integration)

## Overview

The Character Image Analysis Agent uses multimodal LLMs (Grok-4-vision) to analyze character images and extract structured data. It provides detailed physical characteristics, theme classification, gender detection, ethnicity classification, and suggested personality traits.

### Key Capabilities

| Capability | Description | Use Case |
|------------|-------------|----------|
| **Physical Characteristics** | Hair, eyes, skin tone, height, build, age, species, distinctive features | Character profile generation |
| **Theme Classification** | FANTASY, DARK_FANTASY, FURRY, SCI_FI, GENERAL | Automatic theme assignment |
| **Gender Detection** | Male, female, non-binary (humanoids); ambiguous (non-humanoids) | Gender field population |
| **Ethnicity Classification** | Japanese, East Asian, European, African, etc. | Name generation guidance |
| **Visual Style** | Art style, color palette, mood | Asset categorization |
| **Clothing & Accessories** | Outfit description, style, items | Wardrobe system |
| **Suggested Traits** | Personality, archetype, occupation | Character depth generation |

### LLM Configuration

```typescript
const response = await callLLM({
  provider: 'grok',
  model: 'grok-4-1-fast-non-reasoning',
  systemPrompt,  // Detailed analysis instructions
  userPrompt,    // Image URL + analysis request
  images: [imageUrl],  // Vision input
  temperature: 0.3,    // Low temperature for consistency
  maxTokens: 1024,     // Sufficient for detailed response
});
```

**Why Grok-4**:
- Fast non-reasoning model (cost-effective)
- Strong vision capabilities for anime/art styles
- Good understanding of fantasy and anime tropes
- Lower latency than reasoning models

## Architecture

### Response Schema

```typescript
export type CharacterImageAnalysisResult = {
  // Physical Appearance
  physicalCharacteristics: {
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    skinTone?: string;
    height?: 'very short' | 'short' | 'average' | 'tall' | 'very tall';
    build?: 'slim' | 'average' | 'athletic' | 'muscular' | 'heavyset';
    age?: 'child' | 'teenager' | 'young adult' | 'adult' | 'middle-aged' | 'elderly';
    gender?: 'male' | 'female' | 'non-binary' | 'ambiguous';
    genderConfidence?: 'high' | 'medium' | 'low';
    species?: string;
    distinctiveFeatures?: string[];
  };

  // Ethnicity Classification (for name generation)
  ethnicity?: {
    primary: string;  // Japanese, East Asian, European, etc.
    confidence?: 'high' | 'medium' | 'low';
    features?: string[];  // Visual features supporting classification
  };

  // Theme Classification
  themeClassification?: {
    theme: 'FANTASY' | 'DARK_FANTASY' | 'FURRY' | 'SCI_FI' | 'GENERAL';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  };

  // Visual Style
  visualStyle: {
    artStyle?: 'anime' | 'realistic' | 'semi-realistic' | 'cartoon' | 'chibi' | 'pixel art' | 'other';
    colorPalette?: string;
    mood?: string;
  };

  // Clothing & Accessories
  clothing: {
    outfit?: string;
    style?: string;
    accessories?: string[];
  };

  // Suggested Character Traits
  suggestedTraits: {
    personality?: string[];
    archetype?: string;
    suggestedOccupation?: string;
  };

  // Overall Description
  overallDescription: string;  // 2-3 sentence description
};
```

### Analysis Flow

```
1. INPUT
   └─ imageUrl: Public URL to character image

2. LLM VISION ANALYSIS
   ├─ System prompt: Detailed extraction guidelines
   ├─ User prompt: "Analyze the character..."
   ├─ Image: Passed to vision model
   └─ Temperature: 0.3 (consistent results)

3. RESPONSE PROCESSING
   ├─ Parse JSON from LLM response
   ├─ Validate and sanitize data
   ├─ Track LLM usage (cost analysis)
   └─ Log results

4. OUTPUT
   └─ CharacterImageAnalysisResult object
```

## Theme Detection

Theme classification determines the appropriate character theme based on visual elements.

### Theme Types

| Theme | Description | Visual Indicators |
|-------|-------------|-------------------|
| **FANTASY** | Bright, magical, medieval/high fantasy | Elves, wizards, nature spirits, enchanted forests, magical effects |
| **DARK_FANTASY** | Dark color palette, gothic, horror | Demons, vampires, dark magic, shadows, corrupted aesthetics |
| **FURRY** | Anthropomorphic animal characters | Kemono style, beast-people, animal-human hybrids with fur/feathers/scales |
| **SCI_FI** | Futuristic, technological | Robots, androids, cybernetic enhancements, holographic displays |
| **GENERAL** | Modern/contemporary, no strong theme | Casual clothing, everyday scenarios |

### Classification Guidelines

**FANTASY**:
- Bright, saturated colors
- Magical elements (glowing effects, magic circles)
- Medieval clothing (robes, armor, tunics)
- Natural settings (forests, mountains, castles)
- Fantasy creatures (dragons, unicorns, fairies)
- Whimsical mood

**DARK_FANTASY**:
- Dark color palette (blacks, purples, reds)
- Gothic elements ( Victorian clothing, castles, gargoyles)
- Horror undertones (blood, shadows, skulls)
- Demons, vampires, undead
- Corrupted or decayed aesthetics
- Ominous mood

**FURRY**:
- Anthropomorphic animal features
- Animal head with human body
- Fur, feathers, or scales visible
- Animal-like eyes and ears
- Kemono art style (Japanese furry art)
- Hybrid species characteristics

**SCI_FI**:
- Futuristic clothing (tech wear, sleek suits)
- Cybernetic enhancements (robotic limbs, implants)
- Advanced technology (holograms, energy weapons)
- Space or futuristic backgrounds
- Robots, androids, AI characters
- Clean, metallic aesthetics

**GENERAL**:
- Modern casual clothing
- Contemporary settings (cities, schools, offices)
- No fantasy or sci-fi elements
- Everyday scenarios
- Neutral mood

### Confidence Levels

- **High**: Multiple clear visual indicators match the theme
- **Medium**: Some indicators present, theme is likely but not certain
- **Low**: Few or ambiguous indicators, theme is tentative

### Example Response

```json
{
  "themeClassification": {
    "theme": "FANTASY",
    "confidence": "high",
    "reasoning": "Character wears ornate medieval robes with magical runes, stands in enchanted forest with glowing particles, and holds a staff with light aura - clear high fantasy aesthetic"
  }
}
```

## Gender Classification

Gender detection follows strict rules based on character type (humanoid vs non-humanoid).

### Humanoid Characters

**Must classify as**: `male`, `female`, or `non-binary`
**Never use**: `ambiguous` (forbidden for humanoids)

**Humanoid species**:
- Humans, elves, demons, angels, vampires, yokai, kitsune, oni, etc.
- Characters with human-like anatomy and proportions

**Detection criteria**:
1. Facial structure (jawline, cheekbones, eye shape)
2. Body proportions (shoulder width, hip width, height)
3. Clothing and styling choices
4. Breast presence or absence (visible anatomy)
5. Overall presentation and expression

**Uncertainty handling**:
- If uncertain, make BEST GUESS based on visual cues
- Look for subtle cues in facial features
- Consider anime/manga art style conventions
- When in doubt, lean toward `female` (most common in anime art)

### Non-Humanoid Characters

**Use**: `ambiguous` if gender cannot be determined
**Or**: `male`/`female` for creatures with clear sexual dimorphism

**Non-humanoid species**:
- Animals, creatures, monsters
- Robots, androids (ambiguous features)
- Slimes, blob creatures
- Abstract beings

**Detection criteria**:
- Clear sexual dimorphism (male lion vs female lion)
- Gender-specific clothing or accessories
- Obvious masculine/feminine features

### Confidence Levels

- **High**: Clear gender-specific features visible
- **Medium**: Some gender indicators, but subtle
- **Low**: Ambiguous or androgynous features

### Example Responses

**Humanoid (Female)**:
```json
{
  "physicalCharacteristics": {
    "gender": "female",
    "genderConfidence": "high",
    "species": "elf",
    "distinctiveFeatures": ["pointed ears", "long blonde hair", "green eyes"]
  }
}
```

**Humanoid (Ambiguous - FORBIDDEN)**:
```json
// ❌ WRONG - Never use ambiguous for humanoids
{ "gender": "ambiguous", "species": "human" }

// ✅ CORRECT - Make a best guess
{ "gender": "female", "genderConfidence": "low", "species": "human" }
```

**Non-Humanoid (Ambiguous)**:
```json
{
  "physicalCharacteristics": {
    "gender": "ambiguous",
    "genderConfidence": "low",
    "species": "slime"
  }
}
```

## Ethnicity Classification

Ethnicity classification guides name generation by identifying visual features associated with ethnic groups.

### Supported Ethnicities

| Ethnicity | Visual Features |
|-----------|----------------|
| **Japanese** | East Asian features + Japanese cultural elements (kimono, school uniform) |
| **East Asian** | Chinese, Korean, or general East Asian features |
| **Southeast Asian** | Thai, Vietnamese, Filipino, Indonesian features |
| **South Asian** | Indian, Pakistani, Bangladeshi features |
| **Middle Eastern** | Arab, Persian, Turkish features |
| **African** | Sub-Saharan African features |
| **European** | Caucasian features (various regions) |
| **Latin American** | Hispanic/Latino features (mixed heritage) |
| **Indigenous** | Native/Aboriginal features |
| **Fantasy/Non-Human** | Clearly non-human species (elf, alien, etc.) |
| **Unknown** | Cannot determine or mixed/ambiguous features |

### Confidence Levels

- **High**: Clear features consistent with ethnicity
- **Medium**: Somewhat clear, but could be mixed heritage
- **Low**: Unclear, ambiguous, or mixed features

### Example Response

```json
{
  "ethnicity": {
    "primary": "Japanese",
    "confidence": "high",
    "features": ["East Asian facial features", "black hair", "dark eyes", "wearing Japanese school uniform"]
  }
}
```

## Physical Characteristics

### Basic Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `hairColor` | string | Natural or hair color (e.g., "black", "blonde", "pink") |
| `hairStyle` | string | Style description (e.g., "long straight", "ponytail", "spiky") |
| `eyeColor` | string | Eye color (e.g., "blue", "brown", "heterochromia") |
| `skinTone` | string | Skin tone description (e.g., "fair", "medium", "dark") |
| `height` | enum | Very short, short, average, tall, very tall |
| `build` | enum | Slim, average, athletic, muscular, heavyset |
| `age` | enum | Child, teenager, young adult, adult, middle-aged, elderly |
| `species` | string | Species name (e.g., "human", "elf", "demon", "android") |
| `distinctiveFeatures` | string[] | Notable features (e.g., "scars", "wings", "horns") |

### Example Response

```json
{
  "physicalCharacteristics": {
    "hairColor": "silver",
    "hairStyle": "long, flowing past shoulders",
    "eyeColor": "violet",
    "skinTone": "fair",
    "height": "tall",
    "build": "slim",
    "age": "young adult",
    "gender": "female",
    "genderConfidence": "high",
    "species": "elf",
    "distinctiveFeatures": ["pointed ears", "small fangs", "elaborate hair ornaments"]
  }
}
```

## Visual Style

### Art Styles

| Style | Description |
|-------|-------------|
| **anime** | Japanese animation style |
| **realistic** | Photorealistic or semi-realistic rendering |
| **semi-realistic** | Stylized but proportionally accurate |
| **cartoon** | Western cartoon style |
| **chibi** | Super-deformed, cute style |
| **pixel art** | Pixel-based art |
| **other** | Other styles not listed |

### Color Palette & Mood

- **Color Palette**: Description (e.g., "warm tones", "cool tones", "monochrome", "vibrant")
- **Mood**: Emotional atmosphere (e.g., "cheerful", "mysterious", "intense", "melancholic")

### Example Response

```json
{
  "visualStyle": {
    "artStyle": "anime",
    "colorPalette": "vibrant with pastel accents",
    "mood": "whimsical and cheerful"
  }
}
```

## Clothing & Accessories

### Outfit Description

Brief description of main clothing items (e.g., "flowing white robes with gold trim", "school uniform with plaid skirt").

### Style Categories

| Style | Description |
|-------|-------------|
| **casual** | Everyday wear |
| **formal** | Suits, dresses, formal attire |
| **fantasy** | Robes, armor, magical clothing |
| **sci-fi** | Tech wear, futuristic outfits |
| **modern** | Contemporary fashion |

### Accessories

Items like weapons, jewelry, hats, bags, etc. (e.g., "sword", "necklace", "hat", "staff").

### Example Response

```json
{
  "clothing": {
    "outfit": "Elaborate white and gold ceremonial robes with flowing sleeves",
    "style": "fantasy",
    "accessories": ["ornate staff with crystal", "golden circlet crown", "silver earrings"]
  }
}
```

## Suggested Traits

### Personality Traits

Observed personality characteristics based on visual cues (e.g., "confident", "mysterious", "friendly", "serious").

### Archetypes

Character archetype based on appearance (e.g., "warrior", "mage", "scholar", "rebel", "princess", "villain").

### Suggested Occupation

Likely occupation based on clothing and accessories (e.g., "knight", "student", "detective", "merchant").

### Example Response

```json
{
  "suggestedTraits": {
    "personality": ["confident", "mysterious", "intelligent"],
    "archetype": "mage",
    "suggestedOccupation": "court wizard"
  }
}
```

## API/Usage

### Analyzing Character Image

```typescript
import { analyzeCharacterImage } from '../agents/characterImageAnalysisAgent';

const imageUrl = 'https://example.com/character-image.jpg';

try {
  const analysis = await analyzeCharacterImage(imageUrl);

  console.log('Theme:', analysis.themeClassification?.theme);
  console.log('Gender:', analysis.physicalCharacteristics.gender);
  console.log('Species:', analysis.physicalCharacteristics.species);
  console.log('Ethnicity:', analysis.ethnicity?.primary);
  console.log('Description:', analysis.overallDescription);
} catch (error) {
  console.error('Analysis failed:', error);
}
```

### Integration with Character Generation

```typescript
import { analyzeCharacterImage } from '../agents/characterImageAnalysisAgent';
import { compileCharacterDataWithLLM } from '../controllers/automatedCharacterGenerationController';

async function generateCharacterFromImage(imageUrl: string) {
  // 1. Analyze image
  const imageAnalysis = await analyzeCharacterImage(imageUrl);

  // 2. Compile character data with image analysis
  const characterData = await compileCharacterDataWithLLM(
    '',  // Empty user description (let image guide)
    imageAnalysis,  // Pass image analysis results
    undefined,  // No existing text data
    'en',  // Language
    undefined  // No user context
  );

  // 3. Create character in database
  const character = await prisma.character.create({
    data: {
      firstName: characterData.firstName,
      lastName: characterData.lastName,
      age: characterData.age,
      gender: characterData.gender,
      speciesId: await resolveSpeciesId(characterData.species),
      theme: imageAnalysis.themeClassification?.theme || 'FANTASY',
      physicalCharacteristics: characterData.physicalCharacteristics,
      personality: characterData.personality,
      history: characterData.history,
      // ... other fields
    },
  });

  return character;
}
```

## Usage Example: Complete Flow

```typescript
import { analyzeCharacterImage } from '../agents/characterImageAnalysisAgent';
import { trackFromLLMResponse } from '../services/llm/llmUsageTracker';
import { logger } from '../config/logger';

async function processCharacterImage(imageUrl: string, characterId: string) {
  try {
    logger.info({ imageUrl, characterId }, 'Starting character image analysis');

    // Analyze image
    const analysis = await analyzeCharacterImage(imageUrl);

    // Log results
    logger.info({
      characterId,
      theme: analysis.themeClassification?.theme,
      gender: analysis.physicalCharacteristics.gender,
      species: analysis.physicalCharacteristics.species,
      ethnicity: analysis.ethnicity?.primary,
    }, 'Character image analysis completed');

    // Update character with analysis results
    await prisma.character.update({
      where: { id: characterId },
      data: {
        theme: analysis.themeClassification?.theme,
        gender: analysis.physicalCharacteristics.gender,
        speciesId: await resolveSpeciesId(analysis.physicalCharacteristics.species),
        // Store full analysis in metadata if needed
        metadata: {
          imageAnalysis: analysis,
        },
      },
    });

    return analysis;
  } catch (error) {
    logger.error({ error, imageUrl, characterId }, 'Character image analysis failed');
    throw error;
  }
}
```

## Error Handling

### Parse Failure

If LLM returns invalid JSON:

```typescript
try {
  const parsed = parseJsonSafe<CharacterImageAnalysisResult>(raw);

  // Validate and sanitize
  const result: CharacterImageAnalysisResult = {
    physicalCharacteristics: parsed.physicalCharacteristics || {},
    ethnicity: parsed.ethnicity,
    themeClassification: parsed.themeClassification,
    visualStyle: parsed.visualStyle || {},
    clothing: parsed.clothing || {},
    suggestedTraits: parsed.suggestedTraits || {},
    overallDescription: typeof parsed.overallDescription === 'string'
      ? parsed.overallDescription
      : 'Character analysis completed',
  };

  return result;
} catch (parseError) {
  logger.warn({ raw, error: parseError }, 'character_image_analysis_parse_failed');

  // Return minimal valid result
  return {
    physicalCharacteristics: {},
    ethnicity: undefined,
    themeClassification: undefined,
    visualStyle: {},
    clothing: {},
    suggestedTraits: {},
    overallDescription: 'Unable to parse character analysis from image',
  };
}
```

### LLM API Failure

If LLM API call fails:

```typescript
try {
  const response = await callLLM({ /* ... */ });
  // ... process response
} catch (error) {
  logger.error({ error, imageUrl }, 'character_image_analysis_error');

  // Return minimal valid result on error
  return {
    physicalCharacteristics: {},
    ethnicity: undefined,
    themeClassification: undefined,
    visualStyle: {},
    clothing: {},
    suggestedTraits: {},
    overallDescription: 'Error analyzing character image',
  };
}
```

### Unable to Analyze

If image is unclear or character cannot be identified:

```json
{
  "overallDescription": "Unable to analyze character from image",
  "physicalCharacteristics": {},
  "ethnicity": null,
  "themeClassification": null
}
```

## Dependencies

- **LLM Service**: Grok-4-vision API for image analysis
- **Usage Tracker**: LLM usage tracking for cost analysis
- **Logger**: Structured logging for debugging
- **JSON Parser**: Safe JSON parsing with error handling

## Important Notes

### Best Practices

**DO**:
- Use public image URLs (accessible to LLM API)
- Validate image URLs before passing to agent
- Handle analysis failures gracefully
- Track LLM usage for cost monitoring
- Log analysis results for debugging
- Test with various image types (anime, realistic, etc.)

**DON'T**:
- Pass private/authenticated image URLs
- Assume all fields will be populated (many are optional)
- Override temperature (0.3 is optimized for consistency)
- Forget to handle parse errors
- Use for real-time analysis (too slow, ~2-5 seconds)

### Performance Considerations

- **Latency**: ~2-5 seconds per image analysis
- **Cost**: Grok-4-vision is cost-effective but adds up
- **Rate Limits**: Respect API rate limits
- **Batching**: Not supported (one image per call)

### Image Requirements

- **Format**: JPEG, PNG, WebP, GIF
- **Size**: < 10MB recommended
- **Resolution**: 512x512 minimum, 1920x1080 optimal
- **Accessibility**: Public URL (no authentication)

## Testing

```typescript
import { analyzeCharacterImage } from '../agents/characterImageAnalysisAgent';

describe('CharacterImageAnalysisAgent', () => {
  it('should analyze character image', async () => {
    const imageUrl = 'https://example.com/test-character.jpg';

    const analysis = await analyzeCharacterImage(imageUrl);

    expect(analysis.overallDescription).toBeDefined();
    expect(analysis.physicalCharacteristics).toBeDefined();
    expect(analysis.visualStyle).toBeDefined();
  });

  it('should classify theme correctly', async () => {
    const imageUrl = 'https://example.com/fantasy-character.jpg';

    const analysis = await analyzeCharacterImage(imageUrl);

    expect(analysis.themeClassification?.theme).toBeDefined();
    expect(['FANTASY', 'DARK_FANTASY', 'FURRY', 'SCI_FI', 'GENERAL'])
      .toContain(analysis.themeClassification?.theme);
  });

  it('should handle parse errors gracefully', async () => {
    const invalidImageUrl = 'https://example.com/invalid.jpg';

    const analysis = await analyzeCharacterImage(invalidImageUrl);

    expect(analysis.overallDescription).toBe('Error analyzing character image');
  });
});
```

## Troubleshooting

**Analysis returns generic description**
- Verify image URL is accessible
- Check image quality and resolution
- Ensure image contains a visible character

**Theme classification is wrong**
- Review theme detection guidelines in system prompt
- Adjust theme examples in prompt
- Consider using lower temperature (0.1) for more strict classification

**Gender detection is incorrect**
- Verify humanoid vs non-humanoid rules are followed
- Check gender confidence level
- Review visual cues in system prompt

**Parse errors occur frequently**
- Verify LLM is returning valid JSON
- Check temperature setting (0.3 recommended)
- Review system prompt for clarity

**API rate limit errors**
- Implement backoff/retry logic
- Reduce concurrent requests
- Consider upgrading API tier

## Future Enhancements

Potential improvements for the image analysis agent:

1. **Batch Processing**: Analyze multiple images in parallel
2. **Face Detection**: Extract facial landmarks for precise analysis
3. **Color Extraction**: Extract dominant colors for palette matching
4. **Pose Detection**: Identify character pose and gesture
5. **Object Detection**: Identify specific items (weapons, accessories)
6. **Style Transfer**: Suggest style filters based on analysis
7. **Confidence Scores**: Add confidence scores to all fields
8. **Multi-Language**: Support non-English character descriptions

## See Also

- **Feature Spec**: `docs/05-business/planning/features/active/FEATURE-017.md`
- **Character Generation**: `backend/src/controllers/automatedCharacterGenerationController.ts`
- **LLM Service**: `backend/src/services/llm/.docs.md`
- **Data Completeness Service**: `backend/src/services/correction/dataCompletenessCorrectionService.docs.md`
- **Usage Tracker**: `backend/src/services/llm/llmUsageTracker.ts`
