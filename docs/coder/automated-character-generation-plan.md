# Automated Character Generation - Development Plan

**Feature Branch**: `feature/automated-character-generation`
**Agent**: Agent Coder
**Status**: Planning Phase
**Created**: 2025-12-03

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [CORS Issue - CRITICAL FIX](#cors-issue---critical-fix)
4. [Feature Requirements](#feature-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Implementation Plan](#implementation-plan)
7. [API Endpoints](#api-endpoints)
8. [Database Changes](#database-changes)
9. [Frontend Components](#frontend-components)
10. [Testing Strategy](#testing-strategy)
11. [Risks and Mitigation](#risks-and-mitigation)

---

## Overview

### Goal
Implement an automated character generation flow that allows users to create characters by:
1. Providing a text description
2. Uploading a reference image
3. Or both

The system will:
- Extract character information from text/image using AI
- Generate a complete character profile
- Automatically generate and assign an avatar
- Create the character in the database

### Two Creation Paths

| Path | Description | User Input |
|------|-------------|------------|
| **Manual** | Existing form-based flow | All fields filled manually + AI autocomplete |
| **Automated** | New AI-powered flow | Description text + Reference image |

---

## Current State Analysis

### Existing Features (Already Implemented)

#### 1. Character Creation API
**File**: `backend/src/routes/v1/characters.ts`

```typescript
POST /api/v1/characters
- Creates character with validated data
- Uses createCharacterSchema for validation
- Supports all character fields
```

#### 2. Character Autocomplete Agent
**File**: `backend/src/agents/characterAutocompleteAgent.ts`

```typescript
POST /api/v1/characters/autocomplete
- Mode: 'ai' or 'web'
- Fills missing character fields
- Uses LLM to generate suggestions
- Supports web search for real characters
```

**Features**:
- AI-based completion (using Gemini/OpenAI)
- Web search-based completion (using web_search tool)
- Fills: firstName, lastName, age, gender, species, physicalCharacteristics, personality, history
- Language-aware (uses user's preferred language)

#### 3. Image Classification Agent
**File**: `backend/src/agents/imageClassificationAgent.ts`

```typescript
function classifyImageViaLLM(imageUrl: string): Promise<ImageClassificationResult>
- Returns: ageRating, contentTags, description
- Uses Grok LLM for image analysis
```

#### 4. Image Upload & Processing
**File**: `backend/src/routes/v1/characters.ts`

```typescript
POST /api/v1/characters/:id/images
- Supports: AVATAR, COVER, SAMPLE, STICKER, OTHER
- Auto compression and WebP conversion
- Uploads to Cloudflare R2
- Processes different sizes per type
```

#### 5. Avatar Generation Queue
**File**: `backend/src/routes/v1/image-generation.ts`

```typescript
POST /api/v1/image-generation/avatar
- Queues avatar generation job
- Uses ComfyUI service
- Async processing via Bull queue
```

**Worker**: `backend/src/queues/workers/imageGenerationWorker.ts`

#### 6. Character Service
**File**: `backend/src/services/characterService.ts`

Contains:
- `createCharacter(data)` - Creates character in database
- `isCharacterOwner(id, userId)` - Checks ownership
- Other CRUD operations

---

## CORS Issue - CRITICAL FIX

### Problem Identified

**Current Configuration** (`backend/src/index.ts:29-31`):
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [process.env.FRONTEND_URL || 'http://localhost'];
```

**Current .env**:
```bash
FRONTEND_URL=http://localhost
ALLOWED_ORIGINS=http://localhost,https://dev.charhub.app
```

**Docker Override Ports** (Coder environment):
- Frontend: `5175:80` → Accessible at `http://localhost:5175`
- Nginx: `8082:80` → Accessible at `http://localhost:8082`
- Backend: `3002:3000` → Accessible at `http://localhost:3002`

**Issue**:
- Frontend runs on port **5175** but CORS only allows `http://localhost` (port 80)
- Nginx runs on port **8082** but CORS doesn't include it
- All requests from `http://localhost:5175` are **BLOCKED by CORS**

### Solution

Update `.env` to include Coder-specific ports:

```bash
# Current (WRONG for Coder)
ALLOWED_ORIGINS=http://localhost,https://dev.charhub.app

# Fixed (Coder-compatible)
ALLOWED_ORIGINS=http://localhost,http://localhost:5175,http://localhost:8082,https://dev.charhub.app
```

**Alternative**: Use wildcard for localhost development:
```bash
ALLOWED_ORIGINS=http://localhost:*,https://dev.charhub.app
```

Note: The CORS middleware in index.ts would need to be updated to support port wildcards.

### Priority
🔴 **CRITICAL** - Must fix before implementing new features

---

## Feature Requirements

### User Stories

#### Story 1: Automated Character from Description
```
As a user
I want to create a character by writing a description
So that I don't have to fill out a lengthy form
```

**Acceptance Criteria**:
- User provides a text description (e.g., "A wise old wizard with a long white beard, master of fire magic")
- System extracts: firstName, personality, physicalCharacteristics, species, age, gender
- System generates an avatar automatically
- Character is created and ready to use

#### Story 2: Automated Character from Image
```
As a user
I want to create a character by uploading an image
So that the character matches the visual reference
```

**Acceptance Criteria**:
- User uploads a character image
- System analyzes image to extract: physicalCharacteristics, ageRating, contentTags
- System generates a description
- Avatar is generated based on the image characteristics
- Character is created

#### Story 3: Combined Description + Image
```
As a user
I want to provide both a description and an image
So that the character has rich details from both sources
```

**Acceptance Criteria**:
- User provides text + image
- System merges information from both sources
- Text takes priority for personality/history
- Image takes priority for physical characteristics
- Avatar is generated combining both

### Functional Requirements

1. **New API Endpoint**: `POST /api/v1/characters/generate-automated`
   - Input: `{ description?: string, imageFile?: File }`
   - Output: Complete character object

2. **Image Analysis Agent**: Extract character details from image
   - Physical characteristics
   - Approximate age/gender
   - Style/aesthetic

3. **Text Parsing Agent**: Extract structured data from description
   - Use existing autocomplete agent
   - Mode: 'ai'
   - Extract all available fields

4. **Avatar Auto-generation**: Trigger avatar generation automatically
   - Queue avatar generation job
   - Wait for completion (or return job ID)
   - Set as default avatar

5. **UI Components**:
   - New route: `/characters/create/automated`
   - Text input area (description)
   - Image upload dropzone
   - Preview/review step before final creation
   - Loading states for AI processing

---

## Technical Architecture

### Flow Diagram

```
User Input (Text + Image)
        ↓
[Frontend: /characters/create/automated]
        ↓
POST /api/v1/characters/generate-automated
        ↓
    ┌───────┴────────┐
    ↓                ↓
[Analyze Image]  [Analyze Text]
    ↓                ↓
imageClassification  characterAutocomplete
    ↓                ↓
    └───────┬────────┘
            ↓
    [Merge Results]
            ↓
    [Create Character]
            ↓
    [Queue Avatar Generation]
            ↓
    [Return Character + Job ID]
            ↓
    [Frontend: Poll job status]
            ↓
    [Avatar Complete]
```

### Key Components

#### Backend

1. **New Agent**: `characterImageAnalysisAgent.ts`
   - Analyzes character reference images
   - Extracts: physicalCharacteristics, style, gender, age, species
   - Uses vision-capable LLM (Gemini/Grok)
   - Returns structured character data

2. **New Controller**: `automatedCharacterGenerationController.ts`
   - Handles `POST /api/v1/characters/generate-automated`
   - Orchestrates image + text analysis
   - Merges results intelligently
   - Creates character
   - Queues avatar generation

3. **Enhanced Service**: `characterService.ts`
   - New method: `createAutomatedCharacter(data)`
   - Handles avatar auto-generation
   - Returns character + job ID

#### Frontend

1. **New Page**: `pages/characters/create-automated/index.tsx`
   - Clean UI with description textarea
   - Image dropzone
   - Real-time preview
   - Submit button

2. **New Component**: `components/features/characters/AutomatedCharacterForm.tsx`
   - Handles form state
   - File upload logic
   - API communication

3. **New Hook**: `hooks/useAutomatedCharacterCreation.ts`
   - Manages creation flow
   - Polls avatar generation status
   - Error handling

---

## Implementation Plan

### Phase 1: CORS Fix (CRITICAL) ✅
**Priority**: 🔴 **MUST DO FIRST**

- [ ] Update `.env` with correct ALLOWED_ORIGINS
- [ ] Test frontend can connect to backend
- [ ] Verify no CORS errors in console
- [ ] Document port configuration in README

**Time**: 15 minutes

### Phase 2: Backend - Image Analysis Agent 🎨

**File**: `backend/src/agents/characterImageAnalysisAgent.ts`

```typescript
export type CharacterImageAnalysisResult = {
  physicalCharacteristics: string;
  style: string;
  approximateAge?: number;
  gender?: string;
  species?: string;
  clothing?: string;
  visualDescription: string; // Full description for avatar generation
};

export async function analyzeCharacterImage(
  imageUrl: string,
  userDescription?: string
): Promise<CharacterImageAnalysisResult>
```

**Tasks**:
- [ ] Create agent file
- [ ] Write system prompt for character extraction
- [ ] Use vision LLM (Gemini Vision or Grok)
- [ ] Parse and validate response
- [ ] Add error handling
- [ ] Write unit tests

**Time**: 2 hours

### Phase 3: Backend - Automated Generation Endpoint 🚀

**File**: `backend/src/controllers/automatedCharacterGenerationController.ts`

```typescript
export async function generateAutomatedCharacter(req, res) {
  // 1. Parse request (text + optional image)
  // 2. If image: analyze with characterImageAnalysisAgent
  // 3. If text: analyze with characterAutocompleteAgent
  // 4. Merge results (text takes priority for personality, image for physical)
  // 5. Create character via characterService.createCharacter
  // 6. Queue avatar generation
  // 7. Return character + job ID
}
```

**Tasks**:
- [ ] Create controller file
- [ ] Implement request parsing (multer for image)
- [ ] Call image analysis agent
- [ ] Call text analysis agent
- [ ] Implement intelligent merging logic
- [ ] Create character
- [ ] Queue avatar generation
- [ ] Add comprehensive error handling
- [ ] Write integration tests

**Time**: 3 hours

### Phase 4: Backend - Route Registration 🛣️

**File**: `backend/src/routes/v1/characters.ts`

```typescript
router.post(
  '/generate-automated',
  requireAuth,
  asyncMulterHandler(upload.single('image')),
  automatedCharacterGenerationController.generateAutomatedCharacter
);
```

**Tasks**:
- [ ] Add route
- [ ] Configure multer for optional image
- [ ] Add validation
- [ ] Test with Postman/curl

**Time**: 30 minutes

### Phase 5: Frontend - Automated Creation Page 🖼️

**Files**:
- `frontend/src/pages/characters/create-automated/index.tsx`
- `frontend/src/components/features/characters/AutomatedCharacterForm.tsx`
- `frontend/src/hooks/useAutomatedCharacterCreation.ts`

**UI Mockup**:
```
┌────────────────────────────────────────┐
│  Create Character - Automated Mode     │
├────────────────────────────────────────┤
│                                        │
│  Describe your character:              │
│  ┌──────────────────────────────────┐ │
│  │ A wise old wizard with a long   │ │
│  │ white beard, master of fire...  │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Upload reference image (optional):    │
│  ┌──────────────────────────────────┐ │
│  │  [📷 Drop image here or click]   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Cancel]           [Generate] ➜      │
└────────────────────────────────────────┘
```

**Tasks**:
- [ ] Create page component
- [ ] Create form component with textarea
- [ ] Add image dropzone (react-dropzone)
- [ ] Implement form validation
- [ ] Add loading states
- [ ] Create custom hook for API calls
- [ ] Implement avatar job polling
- [ ] Add success/error notifications
- [ ] Add redirect to character profile after creation

**Time**: 4 hours

### Phase 6: Frontend - Navigation Updates 🧭

**Files**:
- `frontend/src/pages/characters/index.tsx` (or wherever "Create Character" button is)

**Tasks**:
- [ ] Add "Quick Create" or "AI Create" button
- [ ] Link to `/characters/create/automated`
- [ ] Update existing "Create Character" to clarify it's "Manual Mode"

**Time**: 30 minutes

### Phase 7: Testing & Polish ✨

**Backend Tests**:
- [ ] Unit tests for image analysis agent
- [ ] Integration tests for automated generation endpoint
- [ ] Test error scenarios (invalid image, missing data)

**Frontend Tests**:
- [ ] Component tests
- [ ] E2E test for complete flow

**Manual Testing**:
- [ ] Test text-only creation
- [ ] Test image-only creation
- [ ] Test combined text + image
- [ ] Test error handling
- [ ] Test avatar generation polling

**Time**: 3 hours

### Phase 8: Documentation 📚

**Tasks**:
- [ ] Update `docs/BACKEND.md` with new endpoint
- [ ] Update `docs/FRONTEND.md` with new page
- [ ] Add usage examples
- [ ] Update API documentation

**Time**: 1 hour

---

## API Endpoints

### New Endpoint

#### `POST /api/v1/characters/generate-automated`

**Description**: Generates a complete character from text description and/or reference image.

**Authentication**: Required (`requireAuth`)

**Request**:
```typescript
// Content-Type: multipart/form-data

{
  description?: string;  // Optional text description
  image?: File;          // Optional reference image
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    character: Character;  // Complete character object
    avatarJobId?: string;  // Avatar generation job ID (if queued)
  }
}
```

**Error Responses**:
- `400` - No description or image provided
- `401` - Unauthorized
- `413` - Image too large
- `415` - Unsupported image format
- `500` - Processing error

**Example**:
```bash
curl -X POST http://localhost:3002/api/v1/characters/generate-automated \
  -H "Authorization: Bearer <token>" \
  -F "description=A wise old wizard with fire magic" \
  -F "image=@wizard.png"
```

### Existing Endpoints Used

1. `POST /api/v1/characters` - Creates character
2. `POST /api/v1/characters/autocomplete` - Fills missing fields
3. `POST /api/v1/image-generation/avatar` - Generates avatar
4. `GET /api/v1/image-generation/status/:jobId` - Checks avatar status

---

## Database Changes

### No Schema Changes Required ✅

The existing `Character` model supports all necessary fields:
- `firstName`, `lastName`
- `physicalCharacteristics`
- `personality`
- `history`
- `age`, `gender`, `species`
- `ageRating`, `contentTags`
- `avatar` (default image URL)

### Potential Future Enhancement

Add a `creationMode` field to track how character was created:

```prisma
model Character {
  // ... existing fields
  creationMode String? // 'MANUAL' | 'AUTOMATED_TEXT' | 'AUTOMATED_IMAGE' | 'AUTOMATED_BOTH'
}
```

**Decision**: Not required for MVP, can add later for analytics.

---

## Frontend Components

### Component Tree

```
pages/characters/create-automated/
└── index.tsx
    └── <AutomatedCharacterForm />
        ├── <TextInput description />
        ├── <ImageDropzone />
        ├── <LoadingState />
        └── <PreviewCard />
```

### New Components

#### 1. `AutomatedCharacterForm.tsx`

**Props**:
```typescript
interface AutomatedCharacterFormProps {
  onSuccess?: (character: Character) => void;
  onCancel?: () => void;
}
```

**State**:
```typescript
{
  description: string;
  imageFile: File | null;
  isLoading: boolean;
  error: string | null;
  avatarJobId: string | null;
  avatarStatus: 'pending' | 'processing' | 'completed' | 'failed';
}
```

**Features**:
- Textarea for description
- Image dropzone with preview
- Submit button with loading state
- Error display
- Avatar generation progress

#### 2. `ImageDropzone.tsx` (Reusable)

**Props**:
```typescript
interface ImageDropzoneProps {
  onFileSelected: (file: File) => void;
  maxSize?: number;
  accept?: string[];
}
```

**Features**:
- Drag and drop support
- Click to upload
- Image preview
- File size validation
- Format validation

---

## Testing Strategy

### Backend Tests

#### Unit Tests

**File**: `backend/src/agents/characterImageAnalysisAgent.test.ts`
```typescript
describe('characterImageAnalysisAgent', () => {
  it('should extract physical characteristics from image');
  it('should handle images without clear characters');
  it('should merge user description with image analysis');
});
```

**File**: `backend/src/controllers/automatedCharacterGenerationController.test.ts`
```typescript
describe('automatedCharacterGenerationController', () => {
  it('should create character from text only');
  it('should create character from image only');
  it('should merge text and image data');
  it('should queue avatar generation');
  it('should handle missing inputs');
});
```

#### Integration Tests

```typescript
describe('POST /api/v1/characters/generate-automated', () => {
  it('should return 401 without auth');
  it('should create character with text');
  it('should create character with image');
  it('should return avatarJobId');
  it('should handle invalid image format');
});
```

### Frontend Tests

#### Component Tests

```typescript
describe('AutomatedCharacterForm', () => {
  it('should render description textarea');
  it('should render image dropzone');
  it('should validate description length');
  it('should handle file upload');
  it('should show loading state during creation');
  it('should display errors');
});
```

#### E2E Tests (Playwright/Cypress)

```typescript
test('Create character via automated mode', async () => {
  await page.goto('/characters/create/automated');
  await page.fill('textarea', 'A brave knight');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/characters\/.+/);
});
```

### Manual Testing Checklist

- [ ] Text only: "A wise old wizard with fire magic"
- [ ] Image only: Upload anime character image
- [ ] Both: Text + Image
- [ ] Invalid image format (upload .txt file)
- [ ] Large image (>10MB)
- [ ] Empty submission (no text, no image)
- [ ] CORS: Verify no console errors
- [ ] Avatar generation completes successfully
- [ ] Character appears in user's character list

---

## Risks and Mitigation

### Risk 1: Image Analysis Quality 🎨
**Risk**: LLM may misinterpret images or extract incorrect character details.

**Mitigation**:
- Use high-quality vision model (Gemini Pro Vision or Grok Vision)
- Allow user to review and edit extracted data before final creation
- Implement confidence scoring
- Fall back to text-only if image analysis fails

### Risk 2: Avatar Generation Delays ⏱️
**Risk**: Avatar generation may take 30-60 seconds, poor UX if blocking.

**Mitigation**:
- Use async job queue (already implemented)
- Return immediately with job ID
- Poll for status in frontend
- Show progress indicator
- Allow user to use character before avatar completes

### Risk 3: CORS Continues to Block 🚫
**Risk**: CORS fix may not work correctly.

**Mitigation**:
- Test CORS immediately after fix
- Add comprehensive logging for CORS failures
- Document all required ports in README
- Consider using nginx proxy to avoid CORS entirely

### Risk 4: Cost of LLM API Calls 💰
**Risk**: Image analysis + text parsing = 2x LLM calls per character.

**Mitigation**:
- Implement rate limiting per user
- Cache common character archetypes
- Optimize prompts to reduce token usage
- Consider offering "quick" vs "detailed" analysis modes

### Risk 5: User Expects Perfect Results ✨
**Risk**: Users may expect AI to perfectly understand vague descriptions.

**Mitigation**:
- Set clear expectations in UI ("AI will do its best...")
- Always show preview/review step before final creation
- Allow editing of all fields after generation
- Provide examples of good descriptions

---

## Success Metrics

### Technical Metrics
- [ ] CORS errors reduced to 0
- [ ] Character creation success rate > 95%
- [ ] Avatar generation completion rate > 90%
- [ ] Average creation time < 5 seconds (excluding avatar)
- [ ] Image analysis accuracy > 80% (subjective, user feedback)

### User Metrics
- [ ] % of users using automated mode vs manual
- [ ] Average time to create character (automated vs manual)
- [ ] User satisfaction rating (post-creation survey)

---

## Next Steps

### Immediate Actions
1. ✅ Create this plan document
2. ⏭️ Fix CORS issue (critical)
3. ⏭️ Get user approval for plan
4. ⏭️ Begin Phase 2 implementation

### Questions for User
1. Should we add a "review" step before final character creation?
2. What should happen if avatar generation fails? (use placeholder?)
3. Should automated mode replace manual mode, or coexist?
4. Any specific character types to prioritize testing? (anime, realistic, cartoon)

---

## Appendix

### Related Files Reference

#### Backend
- `backend/src/routes/v1/characters.ts` - Character routes
- `backend/src/agents/characterAutocompleteAgent.ts` - Autocomplete logic
- `backend/src/agents/imageClassificationAgent.ts` - Image rating/tags
- `backend/src/routes/v1/image-generation.ts` - Avatar generation
- `backend/src/services/characterService.ts` - Character CRUD
- `backend/src/index.ts` - CORS configuration

#### Frontend
- `frontend/src/pages/characters/` - Character pages
- `frontend/src/components/features/characters/` - Character components
- `frontend/src/hooks/` - Custom hooks

### Useful Commands

```bash
# Start development environment
docker compose up --build

# Backend lint
cd backend && npm run lint

# Frontend dev
cd frontend && npm run dev

# Run tests
cd backend && npm test
cd frontend && npm test

# Check CORS
curl -H "Origin: http://localhost:5175" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:3002/api/v1/characters
```

---

**Plan Version**: 1.0
**Last Updated**: 2025-12-03
**Author**: Agent Coder
**Review Required**: Yes
