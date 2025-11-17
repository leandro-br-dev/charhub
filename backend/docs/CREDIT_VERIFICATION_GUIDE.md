# Credit Verification System - Usage Guide

This guide explains how to use the credit verification system throughout the application.

## Overview

The credit verification system provides reusable functions to check user balance before executing paid operations. It's designed to be easily integrated into any service (chat, image generation, character creation, etc.).

## Core Functions

### 1. `requireCredits(userId, amount)`

Simplest function - throws error if insufficient credits.

**Use case**: When you know the exact credit cost upfront.

```typescript
import { requireCredits } from '../services/creditService';
import { InsufficientCreditsError } from '../errors/CreditErrors';

try {
  // Check if user has at least 10 credits
  const balance = await requireCredits(userId, 10);

  // Proceed with operation
  await generateCharacter(userId);

} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    return res.status(402).json({
      error: 'insufficient_credits',
      message: error.message,
      required: error.required,
      current: error.current
    });
  }
  throw error;
}
```

---

### 2. `checkAndReserveCredits(userId, serviceIdentifier, units)`

Estimates cost based on service configuration and units, then verifies balance.

**Use case**: Dynamic cost calculation based on usage (tokens, images, characters, etc.).

```typescript
import { checkAndReserveCredits, ServiceIdentifier } from '../services/creditService';

try {
  // Check for image generation (1 image)
  const { balance, estimatedCost } = await checkAndReserveCredits(
    userId,
    ServiceIdentifier.IMAGE_GENERATION,
    1  // 1 image
  );

  console.log(`User has ${balance} credits, will cost ${estimatedCost}`);

  // Generate image
  const image = await generateImage(prompt);

  // Charge actual cost after success
  await createTransaction(userId, 'CONSUMPTION', -estimatedCost, 'Image generation');

} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    // Handle insufficient credits
  }
}
```

---

### 3. `estimateServiceCost(serviceIdentifier, units)`

Calculates cost without checking balance.

**Use case**: Show estimated cost to user before they commit.

```typescript
import { estimateServiceCost, ServiceIdentifier } from '../services/creditService';

// Estimate cost for 1500 tokens of chat
const estimatedCost = await estimateServiceCost(
  ServiceIdentifier.LLM_CHAT_SAFE,
  1500  // tokens
);

console.log(`This message will cost approximately ${estimatedCost} credits`);
```

---

## Service Identifiers

Available service types (enum `ServiceIdentifier`):

```typescript
enum ServiceIdentifier {
  // Chat
  LLM_CHAT_SAFE = 'LLM_CHAT_SAFE',           // 2 credits per 1k tokens
  LLM_CHAT_NSFW = 'LLM_CHAT_NSFW',           // 3 credits per 1k tokens

  // Images
  IMAGE_GENERATION = 'IMAGE_GENERATION_COMFYUI',  // 10 credits per image
  LLM_SD_PROMPT = 'LLM_SD_PROMPT_GENERATION',     // 1 credit per prompt

  // Characters
  LLM_CHARACTER_SCRIPTING_SFW = 'LLM_CHARACTER_SCRIPTING_SFW',    // 10 credits
  LLM_CHARACTER_SCRIPTING_NSFW = 'LLM_CHARACTER_SCRIPTING_NSFW',  // 12 credits

  // Stories
  LLM_STORY_GENERATION_SFW = 'LLM_STORY_GENERATION_SFW',     // 15 credits
  LLM_STORY_GENERATION_NSFW = 'LLM_STORY_GENERATION_NSFW',   // 20 credits

  // Audio
  TTS_DEFAULT = 'TTS_DEFAULT',                               // 1 credit per 1k chars
  AUDIO_TRANSCRIPTION = 'AUDIO_TRANSCRIPTION_WHISPER',       // Cost TBD
}
```

---

## Integration Examples

### Example 1: Character Creation

```typescript
// routes/characters.ts
router.post('/characters', async (req, res) => {
  const { userId } = req.user;
  const { name, description, isNSFW } = req.body;

  try {
    // Determine service type
    const serviceId = isNSFW
      ? ServiceIdentifier.LLM_CHARACTER_SCRIPTING_NSFW
      : ServiceIdentifier.LLM_CHARACTER_SCRIPTING_SFW;

    // Check credits (1 character = 1 unit)
    const { balance, estimatedCost } = await checkAndReserveCredits(
      userId,
      serviceId,
      1
    );

    // Create character
    const character = await characterService.createCharacter({
      userId,
      name,
      description,
      isNSFW
    });

    // Charge credits after success
    await createTransaction(
      userId,
      'CONSUMPTION',
      -estimatedCost,
      `Character creation: ${character.name}`,
      undefined,
      undefined
    );

    res.json({
      success: true,
      character,
      creditsUsed: estimatedCost,
      remainingBalance: balance - estimatedCost
    });

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        error: 'insufficient_credits',
        message: 'Créditos insuficientes para criar personagem',
        required: error.required,
        current: error.current
      });
    }

    res.status(500).json({ error: 'Failed to create character' });
  }
});
```

### Example 2: Image Generation

```typescript
// routes/images.ts
router.post('/images/generate', async (req, res) => {
  const { userId } = req.user;
  const { prompt, count = 1 } = req.body;

  try {
    // Check if user has enough credits for N images
    const { balance, estimatedCost } = await checkAndReserveCredits(
      userId,
      ServiceIdentifier.IMAGE_GENERATION,
      count  // number of images
    );

    // Generate images
    const images = await imageService.generateImages(prompt, count);

    // Charge credits
    await createTransaction(
      userId,
      'CONSUMPTION',
      -estimatedCost,
      `Image generation (${count} images)`,
      undefined,
      undefined
    );

    res.json({
      success: true,
      images,
      creditsUsed: estimatedCost,
      remainingBalance: balance - estimatedCost
    });

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        error: 'insufficient_credits',
        message: 'Créditos insuficientes para gerar imagens',
        required: error.required,
        current: error.current,
        suggestion: 'Visite /plans para adquirir mais créditos'
      });
    }

    res.status(500).json({ error: 'Image generation failed' });
  }
});
```

### Example 3: TTS (Text-to-Speech)

```typescript
// routes/tts.ts
router.post('/tts/generate', async (req, res) => {
  const { userId } = req.user;
  const { text } = req.body;

  try {
    // Calculate characters
    const charCount = text.length;

    // Check credits (cost is per 1000 characters)
    const { balance, estimatedCost } = await checkAndReserveCredits(
      userId,
      ServiceIdentifier.TTS_DEFAULT,
      charCount
    );

    // Generate audio
    const audioUrl = await ttsService.generateSpeech(text);

    // Charge credits
    await createTransaction(
      userId,
      'CONSUMPTION',
      -estimatedCost,
      `TTS generation (${charCount} chars)`,
      undefined,
      undefined
    );

    res.json({
      success: true,
      audioUrl,
      charactersProcessed: charCount,
      creditsUsed: estimatedCost,
      remainingBalance: balance - estimatedCost
    });

  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return res.status(402).json({
        error: 'insufficient_credits',
        message: 'Créditos insuficientes para gerar áudio',
        required: error.required,
        current: error.current
      });
    }

    res.status(500).json({ error: 'TTS generation failed' });
  }
});
```

---

## Error Handling

### InsufficientCreditsError

```typescript
{
  name: 'InsufficientCreditsError',
  code: 'INSUFFICIENT_CREDITS',
  message: 'Insufficient credits. Required: 10, Current: 5',
  statusCode: 402,
  required: 10,
  current: 5
}
```

### ServiceCostNotFoundError

```typescript
{
  name: 'ServiceCostNotFoundError',
  code: 'SERVICE_COST_NOT_FOUND',
  message: 'Service cost configuration not found: UNKNOWN_SERVICE',
  statusCode: 500,
  serviceType: 'UNKNOWN_SERVICE'
}
```

---

## Frontend Integration

### Show estimated cost before action

```typescript
// Before submitting
const response = await fetch('/api/v1/credits/estimate', {
  method: 'POST',
  body: JSON.stringify({
    serviceType: 'IMAGE_GENERATION_COMFYUI',
    units: 1
  })
});

const { estimatedCost } = await response.json();

// Show to user: "This will cost approximately {estimatedCost} credits"
```

### Handle insufficient credits error

```typescript
try {
  const response = await fetch('/api/v1/characters', {
    method: 'POST',
    body: JSON.stringify(characterData)
  });

  if (!response.ok) {
    const error = await response.json();

    if (error.error === 'insufficient_credits') {
      // Show upgrade modal
      showUpgradeModal({
        required: error.required,
        current: error.current,
        message: 'Você precisa de mais créditos para criar este personagem'
      });
      return;
    }
  }

  const character = await response.json();
  // Success

} catch (error) {
  console.error('Failed to create character:', error);
}
```

---

## Best Practices

1. **Always check credits BEFORE expensive operations**
   - Check balance before starting AI generation
   - Don't wait until after to discover insufficient balance

2. **Charge credits AFTER successful completion**
   - Only deduct if operation succeeds
   - Prevents charging for failed operations

3. **Provide clear error messages**
   - Tell user exactly how many credits they need
   - Show their current balance
   - Provide link to purchase more

4. **Log credit transactions**
   - Every check and charge should be logged
   - Helps with debugging and auditing

5. **Handle errors gracefully**
   - Don't crash if credit check fails
   - Provide fallback options when possible

---

## Testing

```typescript
import { requireCredits, checkAndReserveCredits } from '../services/creditService';

describe('Credit Verification', () => {
  it('should throw InsufficientCreditsError when balance too low', async () => {
    // User has 5 credits
    await expect(
      requireCredits(userId, 10)
    ).rejects.toThrow(InsufficientCreditsError);
  });

  it('should calculate correct cost for image generation', async () => {
    const { estimatedCost } = await checkAndReserveCredits(
      userId,
      ServiceIdentifier.IMAGE_GENERATION,
      3  // 3 images
    );

    expect(estimatedCost).toBe(30);  // 10 credits per image
  });
});
```

---

## Summary

- Use `requireCredits()` for fixed costs
- Use `checkAndReserveCredits()` for dynamic costs
- Use `estimateServiceCost()` to show costs to users
- Always handle `InsufficientCreditsError`
- Charge credits AFTER operation succeeds
- Provide clear user feedback

For more details, see `backend/src/services/creditService.ts` and `backend/src/errors/CreditErrors.ts`.
