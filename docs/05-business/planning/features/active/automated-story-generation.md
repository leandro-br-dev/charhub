# Automated Story Generation - Feature Specification

**Status**: 📋 Active (Planning)
**Version**: 1.0.0
**Date Created**: 2025-12-27
**Last Updated**: 2025-12-27
**Priority**: High
**Assigned To**: Agent Coder

---

## Overview

Implementação de sistema completo de criação de histórias com duas modalidades:
1. **Criação Manual**: Interface organizada por abas (similar ao sistema de personagens)
2. **Geração Automática com IA**: Criação de histórias completas a partir de texto e/ou imagens

Este sistema visa aumentar o engajamento de usuários entrantes, aproveitando o sucesso do sistema de geração automática de personagens já implementado.

---

## Business Value

**Contexto**: Com a implementação recente da geração automática de personagens, temos maior engajamento inicial dos usuários que agora têm mais opções de conversação.

**Problema Atual**:
- Criação manual de histórias tem interface desorganizada (formulário único longo)
- Não existe opção de geração automática de histórias
- Barreira de entrada alta para usuários que querem testar histórias rapidamente

**Solução**:
- Reorganizar criação manual com abas (melhor UX e organização)
- Criar wizard de geração automática com IA (similar a personagens)
- Oferecer duas opções claras: criação manual vs automática

**Impacto Esperado**:
- 📈 Aumentar criação de histórias em ~60% (baseado no sucesso de personagens)
- ⚡ Reduzir tempo de criação de ~15 minutos para ~20 segundos (modo IA)
- 💰 Nova fonte de monetização através do sistema de créditos (75-100 créditos/história)
- 🎯 Maior retenção de usuários entrantes com conteúdo personalizado instantâneo

---

## User Stories

### US-1: Página de Seleção de Modo de Criação
**Como** usuário que deseja criar uma história
**Quero** escolher entre criação manual ou automática
**Para que** eu possa usar o método que melhor se adapta às minhas necessidades e tempo disponível

**Acceptance Criteria**:
- [ ] Página `/stories/create` exibe duas opções em cards side-by-side
- [ ] Card "Manual Creation" com descrição, features e botão "Create Manually"
- [ ] Card "AI-Powered Creation" com descrição, features, custo em créditos e botão "Create with AI"
- [ ] Design similar à página `/characters/create`
- [ ] Botão "Back" para voltar à listagem
- [ ] Responsivo (cards empilham em mobile)

### US-2: Criação Manual com Abas
**Como** usuário criando história manualmente
**Quero** preencher informações organizadas em abas
**Para que** o processo seja mais organizado e menos intimidador

**Acceptance Criteria**:
- [ ] Página `/stories/new` com layout de abas
- [ ] Aba 1: **Story Details** (título, sinopse, classificação etária, tags de conteúdo)
- [ ] Aba 2: **Plot & Setting** (texto inicial, objetivos da história)
- [ ] Aba 3: **Characters** (seletor de personagens, preview dos selecionados)
- [ ] Aba 4: **Media** (upload de imagem de capa, preview)
- [ ] Aba 5: **Visibility** (público, privado, não-listado)
- [ ] Abas desabilitadas até título ser preenchido
- [ ] Validação em tempo real com mensagens de erro claras
- [ ] Botões "Save Story" e "Cancel" fixos no bottom

### US-3: Geração Automática de História
**Como** usuário que quer criar história rapidamente
**Quero** gerar uma história completa a partir de uma descrição ou imagem
**Para que** eu possa começar a jogar em segundos sem esforço manual

**Acceptance Criteria**:
- [ ] Página `/stories/create-ai` com wizard de geração
- [ ] Input de texto (2000 caracteres): "Describe your story idea..."
- [ ] Upload de imagem opcional (análise de cenário, tema, estilo)
- [ ] Seleção de classificação etária (L, 10, 12, 14, 16, 18)
- [ ] Seleção de tags de conteúdo (violência, romance, etc.)
- [ ] Preview de custo em créditos antes de gerar
- [ ] Validação: pelo menos texto OU imagem obrigatório
- [ ] Botão "Generate Story" desabilitado se saldo insuficiente

### US-4: Wizard de Geração com Progress
**Como** usuário gerando história com IA
**Quero** ver o progresso da geração em tempo real
**Para que** eu saiba que o sistema está funcionando e quanto tempo vai levar

**Acceptance Criteria**:
- [ ] Animação de loading temática (similar ao magic circle de personagens)
- [ ] Progress bar com porcentagem (0-100%)
- [ ] Mensagens de progresso em etapas:
  - "Analyzing your input..." (0-15%)
  - "Generating story concept..." (15-30%)
  - "Creating plot structure..." (30-50%)
  - "Writing initial scene..." (50-70%)
  - "Generating cover image..." (70-90%)
  - "Finalizing story..." (90-100%)
- [ ] WebSocket real-time updates
- [ ] Tratamento de erros com mensagens claras

### US-5: Reveal Screen da História Gerada
**Como** usuário que gerou história com IA
**Quero** ver uma apresentação dramática da história criada
**Para que** a experiência seja recompensadora e empolgante

**Acceptance Criteria**:
- [ ] Reveal em fases com animações:
  - Fase 1: Título da história (fade-in)
  - Fase 2: Sinopse (fade-in após 1s)
  - Fase 3: Objetivos (fade-in após 1s)
  - Fase 4: Imagem de capa (fade-in após 1s)
- [ ] Card visual com preview da história
- [ ] Ações disponíveis:
  - "View Story" → redireciona para `/stories/{id}`
  - "Edit Story" → redireciona para `/stories/{id}/edit`
  - "Start Playing" → redireciona para chat/gameplay
  - "Discard" → deleta e volta para `/stories`
- [ ] Orientação portrait do card (como em personagens)

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Flow                        │
└─────────────────────────────────────────────────────────┘

/stories/create (Selection Page)
    ├─→ Manual Creation ─→ /stories/new
    │                       ├─ StoryFormLayout (with tabs)
    │                       │   ├─ StoryDetailsTab
    │                       │   ├─ PlotSettingTab
    │                       │   ├─ CharactersTab
    │                       │   ├─ MediaTab
    │                       │   └─ VisibilityTab
    │                       └─ Submit → POST /api/v1/stories
    │
    └─→ AI Creation ─→ /stories/create-ai
                        ├─ GenerationWizard
                        │   ├─ Input Form (text + image + filters)
                        │   ├─ Credit Check
                        │   └─ Submit → POST /api/v1/stories/generate
                        ├─ LoadingAnimation (WebSocket progress)
                        ├─ StoryRevealScreen
                        └─ FinalRevealScreen

┌─────────────────────────────────────────────────────────┐
│                     Backend Flow                         │
└─────────────────────────────────────────────────────────┘

POST /api/v1/stories/generate
    ↓
Check user credits (75-100 credits)
    ↓
Deduct credits upfront
    ↓
Generate sessionId, emit WS events
    ↓
If image provided → analyzeStoryImage() [Vision AI]
    ├─ Extract: setting, theme, mood, visual style
    ├─ Identify: genre, era, atmosphere
    └─ Cost: 25 credits
    ↓
compileStoryDataWithLLM() [Single LLM Call]
    ├─ Input: text description + image analysis
    ├─ Output: {
    │     title,
    │     synopsis,
    │     initialText,
    │     objectives: [{ description }],
    │     ageRating,
    │     contentTags,
    │     stableDiffusionPrompt
    │   }
    ├─ Cost: 50 credits
    └─ Language: User's preferred language
    ↓
createStory() [Save to DB]
    ↓
Queue cover image generation
    ↓
ComfyUI generates cover (async)
    ├─ Based on SD prompt
    ├─ Landscape format (story cover)
    ├─ High resolution
    └─ Cost: 25 credits
    ↓
WebSocket: progress updates (8 steps)
    ↓
Return: { storyId, sessionId }
```

---

## Backend Components

### 1. API Endpoints

#### POST `/api/v1/stories/generate`

**Purpose**: Generate complete story from text/image input

**Authentication**: Required (JWT)

**Request Body**:
```typescript
{
  description?: string;        // Max 2000 chars
  imageFile?: File;            // Optional image upload
  ageRating: AgeRating;        // L, TEN, TWELVE, FOURTEEN, SIXTEEN, EIGHTEEN
  contentTags?: ContentTag[];  // VIOLENCE, GORE, SEXUAL, etc.
}
```

**Response**:
```typescript
{
  success: boolean;
  sessionId: string;
  storyId?: string;
  message?: string;
}
```

**Validation**:
- At least one of `description` or `imageFile` must be provided
- Description max 2000 characters
- Image max 10MB, formats: JPG, PNG, WEBP
- AgeRating is required
- ContentTags is optional array

**Credits Cost**:
- **With Image**: 100 credits (25 image analysis + 50 LLM + 25 cover generation)
- **Text Only**: 75 credits (50 LLM + 25 cover generation)
- **Deducted upfront** before processing

**Error Responses**:
- `400 Bad Request`: Invalid input (no text/image, invalid format)
- `402 Payment Required`: Insufficient credits
- `413 Payload Too Large`: Image > 10MB
- `500 Internal Server Error`: AI service failure

**Implementation File**: `backend/src/controllers/automatedStoryGenerationController.ts`

---

#### GET `/api/v1/stories/generate/:sessionId/status`

**Purpose**: Poll generation status (fallback if WebSocket fails)

**Response**:
```typescript
{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  storyId?: string;
  message?: string;
}
```

---

### 2. AI Agents

#### Story Image Analysis Agent

**File**: `backend/src/agents/storyImageAnalysisAgent.ts`

**Purpose**: Analyze uploaded image to extract story context

**Input**: Image buffer/URL

**Output**:
```typescript
{
  setting: {
    location: string;      // "medieval castle", "futuristic city", etc.
    era: string;           // "medieval", "modern", "sci-fi", etc.
    atmosphere: string;    // "dark and mysterious", "bright and cheerful"
  };
  theme: {
    genre: string;         // "fantasy", "sci-fi", "horror", "romance"
    mood: string;          // "tense", "adventurous", "romantic"
    tone: string;          // "serious", "lighthearted", "dramatic"
  };
  visualStyle: string;     // "anime", "realistic", "cartoon", "pixel-art"
  suggestedTags: string[]; // Suggested content tags
}
```

**LLM Prompt** (Vision Model - Gemini Pro Vision):
```
You are a story setting analyzer. Analyze this image and extract:

1. **Setting Details**:
   - Physical location and environment
   - Historical era or time period
   - Overall atmosphere and mood

2. **Theme & Genre**:
   - Primary genre (fantasy, sci-fi, horror, romance, adventure, mystery, etc.)
   - Emotional tone and mood
   - Narrative style suggestion

3. **Visual Style**: Art style of the image (anime, realistic, cartoon, etc.)

4. **Content Warnings**: Identify any mature themes visible (violence, gore, sexual content, etc.)

Return structured JSON only.
```

**Cost**: 25 credits (charged when image provided)

---

#### Story LLM Compilation Agent

**File**: `backend/src/controllers/automatedStoryGenerationController.ts` (function `compileStoryDataWithLLM`)

**Purpose**: Generate complete story data in single coherent LLM call

**Input**:
```typescript
{
  textDescription?: string;
  imageAnalysis?: StoryImageAnalysis;
  ageRating: AgeRating;
  contentTags?: ContentTag[];
  userLanguage: string;
}
```

**Output**:
```typescript
{
  title: string;                    // 5-100 chars
  synopsis: string;                 // 100-2000 chars
  initialText: string;              // Opening scene, 200-5000 chars
  objectives: StoryObjective[];     // 3-5 story goals
  ageRating: AgeRating;             // Validated/adjusted from input
  contentTags: ContentTag[];        // Auto-detected + user provided
  stableDiffusionPrompt: string;    // For cover image generation
}
```

**LLM Prompt** (Gemini 1.5 Pro):
```
You are a creative story writer and game master. Create an interactive story based on the following input:

**User Input**:
- Description: {textDescription || "None provided"}
- Visual Analysis: {imageAnalysis || "None provided"}
- Target Age Rating: {ageRating}
- Content Preferences: {contentTags}
- Language: {userLanguage}

**Your Task**:
Generate a complete story specification with:

1. **Title**: Compelling, genre-appropriate title (5-100 characters)
   - Must be in {userLanguage}

2. **Synopsis**: Engaging story summary (100-2000 characters)
   - Hook the reader in first sentence
   - Describe setting, conflict, and stakes
   - Must be in {userLanguage}

3. **Initial Text**: Opening scene that drops the player into action (200-5000 characters)
   - Use vivid, immersive language
   - Set the scene with sensory details
   - End with a hook or decision point
   - Must be in {userLanguage}

4. **Objectives**: 3-5 story goals/milestones
   - Clear, achievable goals
   - Progressive difficulty
   - Mix of main quest and side objectives
   - Must be in {userLanguage}

5. **Age Rating**: Validate and adjust if needed
   - L (All ages): No violence, sexual content, or strong language
   - 10+: Mild fantasy violence
   - 12+: Moderate violence, mild language
   - 14+: Intense violence, suggestive themes
   - 16+: Strong violence, sexual themes, strong language
   - 18+: Extreme violence, explicit content

6. **Content Tags**: Auto-detect appropriate warnings
   - VIOLENCE, GORE, SEXUAL, NUDITY, LANGUAGE, DRUGS, ALCOHOL,
     HORROR, PSYCHOLOGICAL, DISCRIMINATION, CRIME, GAMBLING

7. **Stable Diffusion Prompt**: For cover image generation
   - Landscape format (16:9 or 3:2)
   - High detail, professional quality
   - Match visual style from input
   - Include: setting, mood, color palette, lighting
   - Example: "epic fantasy castle at sunset, dramatic lighting, high detail,
     cinematic composition, vibrant colors, professional digital art, 16:9"

**Constraints**:
- Respect age rating in all content
- Avoid stereotypes and harmful tropes
- Create inclusive, diverse characters when applicable
- If image analysis conflicts with text, prioritize text description
- Output ONLY valid JSON, no markdown or extra text

**JSON Structure**:
{
  "title": "...",
  "synopsis": "...",
  "initialText": "...",
  "objectives": [
    { "description": "..." },
    { "description": "..." },
    { "description": "..." }
  ],
  "ageRating": "L" | "TEN" | "TWELVE" | "FOURTEEN" | "SIXTEEN" | "EIGHTEEN",
  "contentTags": ["TAG1", "TAG2"],
  "stableDiffusionPrompt": "..."
}
```

**Cost**: 50 credits

**Error Handling**:
- Validate JSON structure
- Fallback to safe defaults if parsing fails
- Log malformed responses for debugging
- Retry once on network errors

---

### 3. WebSocket Handler

**File**: `backend/src/websocket/storyGenerationHandler.ts`

**Room Naming**: `story-generation:${userId}:${sessionId}`

**Events Emitted**:

```typescript
// Progress updates (8 steps)
{
  event: 'story-generation:progress',
  data: {
    sessionId: string;
    step: number;         // 1-8
    progress: number;     // 0-100
    message: string;      // i18n key: "stories.createAI.progress.step1"
  }
}

// Completion
{
  event: 'story-generation:complete',
  data: {
    sessionId: string;
    storyId: string;
    story: Story;
  }
}

// Error
{
  event: 'story-generation:error',
  data: {
    sessionId: string;
    message: string;
    code: string;
  }
}
```

**Progress Steps**:
1. **0-15%**: "Analyzing your input..." (`step1`)
2. **15-30%**: "Generating story concept..." (`step2`)
3. **30-50%**: "Creating plot structure..." (`step3`)
4. **50-70%**: "Writing initial scene..." (`step4`)
5. **70-85%**: "Generating objectives..." (`step5`)
6. **85-95%**: "Creating cover image..." (`step6`)
7. **95-99%**: "Finalizing story..." (`step7`)
8. **100%**: "Story ready!" (`step8`)

---

### 4. Cover Image Generation

**Service**: ComfyUI (Stable Diffusion)

**Workflow**: Use existing ComfyUI setup with landscape aspect ratio

**Input**: `stableDiffusionPrompt` from LLM

**Output**: Cover image URL (R2 storage)

**Aspect Ratio**: 16:9 or 3:2 (landscape, suitable for story covers)

**Resolution**: 1024x576 or 1024x683

**Processing**:
- Queue job asynchronously
- Poll for completion
- Upload to R2 on completion
- Update story record with `coverImage` URL

**Cost**: 25 credits

**Timeout**: 60 seconds max (same as character avatars)

**Error Handling**:
- If generation fails, save story without cover image
- User can upload manually later
- Log error for monitoring

---

### 5. Database Schema

**Model**: Use existing `Story` Prisma model - **NO schema changes required**

**Existing Fields** (all supported):
```prisma
model Story {
  id           String   @id @default(uuid())
  title        String
  synopsis     String?
  initialText  String?
  coverImage   String?
  objectives   Json?    // Array of StoryObjective
  ageRating    AgeRating
  contentTags  ContentTag[]
  visibility   Visibility
  authorId     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  author       User     @relation(...)
  characters   Character[]
  tags         Tag[]
}
```

**StoryObjective Structure** (stored in `objectives` JSON field):
```typescript
interface StoryObjective {
  id?: string;
  description: string;
  completed?: boolean;
}
```

---

### 6. Service Layer Updates

**File**: `backend/src/services/storyService.ts`

**New Functions**:

```typescript
async generateStoryWithAI(
  userId: string,
  input: {
    description?: string;
    imageFile?: File;
    ageRating: AgeRating;
    contentTags?: ContentTag[];
  }
): Promise<{ sessionId: string; storyId?: string }>;

async getGenerationStatus(
  sessionId: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  storyId?: string;
}>;
```

---

## Frontend Components

### 1. Pages

#### `/stories/create` - Selection Page

**File**: `frontend/src/pages/story/create/index.tsx`

**Purpose**: Let user choose between manual or AI creation

**Layout**: Two cards side-by-side (similar to `/characters/create`)

**Components**:
- **Manual Creation Card**:
  - Icon: Pencil/Edit icon
  - Title: "Manual Creation"
  - Description: "Create your story step by step with full control"
  - Features:
    - Complete customization
    - Organized in tabs
    - Perfect for detailed stories
  - Cost: Free
  - Button: "Create Manually" → `/stories/new`

- **AI-Powered Creation Card**:
  - Icon: Lightning/AI icon
  - Badge: "AI" in purple
  - Title: "AI-Powered Creation"
  - Description: "Let AI generate your story from a description or image"
  - Features:
    - Automatic generation
    - Upload image or describe
    - Fast and creative
  - Cost: "75-100 credits" (dynamic based on image)
  - Button: "Create with AI" → `/stories/create-ai`
  - Gradient background (purple-indigo)

**Responsive**:
- Desktop: 2 columns
- Mobile: Stacked cards

**Back Button**: Navigate to `/stories`

---

#### `/stories/new` - Manual Creation with Tabs

**File**: `frontend/src/pages/story/new/index.tsx`

**Purpose**: Manual story creation with organized tab layout

**Layout**: Similar to `CharacterFormLayout`

```tsx
<StoryFormLayout>
  <LeftColumn>
    <CoverImageUploader />
  </LeftColumn>

  <RightColumn>
    <Tabs defaultTab="details">
      <Tab label="details">Story Details</Tab>
      <Tab label="plot">Plot & Setting</Tab>
      <Tab label="characters">Characters</Tab>
      <Tab label="media">Media</Tab>
      <Tab label="visibility">Visibility</Tab>
    </Tabs>
  </RightColumn>
</StoryFormLayout>
```

**Tab Locking**:
- All tabs unlocked immediately (no restrictions)
- Unlike characters, stories don't require firstName to unlock tabs

**Submit Behavior**:
- "Save Story" button at bottom
- "Cancel" returns to `/stories`
- On success → redirect to `/stories/{id}`
- Show toast notification on save

---

#### `/stories/create-ai` - AI Generation Wizard

**File**: `frontend/src/pages/story/create-ai/index.tsx`

**Purpose**: Generate story with AI using wizard flow

**Components**:
1. **GenerationWizard** (main container)
2. **InputForm** (step 1)
3. **LoadingAnimation** (step 2)
4. **StoryRevealScreen** (step 3)
5. **FinalRevealScreen** (step 4)

**Wizard Flow**:
```
InputForm → Submit → LoadingAnimation → RevealScreen → FinalRevealScreen
```

---

### 2. Components

#### `StoryFormLayout`

**File**: `frontend/src/pages/story/shared/components/StoryFormLayout.tsx`

**Purpose**: Layout container with tabs for manual creation

**Props**:
```typescript
{
  mode: 'create' | 'edit';
  storyTitle?: string;
  coverImage?: string;
  storyId?: string;
  form: UseStoryFormReturn;
  error?: string | null;
  isSubmitting: boolean;
  onSubmit: (event) => void;
  onCancel: () => void;
  submitLabel: string;
  cancelLabel: string;
}
```

**Structure**:
- Header with title and subtitle
- Error banner (if present)
- Grid layout: [CoverImageUploader] [Tabs]
- Tabs: StoryDetailsTab, PlotSettingTab, CharactersTab, MediaTab, VisibilityTab
- Footer with Submit/Cancel buttons

---

#### `StoryDetailsTab`

**File**: `frontend/src/pages/story/shared/components/StoryDetailsTab.tsx`

**Fields**:
- **Title** (Input, required, max 100 chars)
- **Synopsis** (Textarea, optional, max 2000 chars)
- **Age Rating** (Select: L, 10, 12, 14, 16, 18)
- **Content Tags** (Multi-select checkboxes)

**Validation**:
- Title required
- Title max 100 chars
- Synopsis max 2000 chars

---

#### `PlotSettingTab`

**File**: `frontend/src/pages/story/shared/components/PlotSettingTab.tsx`

**Fields**:
- **Initial Text** (Rich Textarea, optional, max 5000 chars)
  - Description: "Opening scene of your story"
  - Placeholder: "It was a dark and stormy night..."

- **Objectives List** (Dynamic list)
  - Add/Remove objectives
  - Each objective: description (max 500 chars)
  - Drag to reorder (optional enhancement)

**Component**: Reuse `ObjectivesList` from `frontend/src/pages/story/create/components/ObjectivesList.tsx`

---

#### `CharactersTab`

**File**: `frontend/src/pages/story/shared/components/CharactersTab.tsx`

**Purpose**: Select characters that participate in the story

**Components**:
- Character selector (search + add)
- Selected characters preview (cards with avatar, name, remove button)
- Empty state: "No characters selected yet"

**Component**: Reuse `CharacterSelector` from `frontend/src/pages/story/create/components/CharacterSelector.tsx`

---

#### `MediaTab`

**File**: `frontend/src/pages/story/shared/components/MediaTab.tsx`

**Fields**:
- **Cover Image** (Image uploader)
  - Upload via drag-drop or click
  - Preview uploaded image
  - Remove/Replace image
  - Max 10MB, JPG/PNG/WEBP

**Component**: Reuse `CoverImageUploader` from `frontend/src/pages/story/create/components/CoverImageUploader.tsx`

**Note**: This is redundant with left column cover uploader - consider removing or making it a reference

---

#### `VisibilityTab`

**File**: `frontend/src/pages/story/shared/components/VisibilityTab.tsx`

**Fields**:
- **Visibility** (Radio buttons)
  - Public: "Anyone can view and play"
  - Private: "Only you can access"
  - Unlisted: "Anyone with link can access"

**Component**: Reuse `VisibilitySelector` from `frontend/src/components/features/VisibilitySelector.tsx`

---

#### `GenerationWizard` (AI Creation)

**File**: `frontend/src/pages/story/create-ai/components/GenerationWizard.tsx`

**Purpose**: Main container for AI generation flow

**State Management**:
```typescript
const [step, setStep] = useState<'input' | 'loading' | 'reveal' | 'final'>('input');
const [sessionId, setSessionId] = useState<string | null>(null);
const [storyId, setStoryId] = useState<string | null>(null);
const [generatedStory, setGeneratedStory] = useState<Story | null>(null);
```

**Flow**:
1. Show `InputForm`
2. On submit → call API → transition to `loading`
3. WebSocket updates during loading
4. On complete → transition to `reveal`
5. After reveal animation → transition to `final`

---

#### `StoryInputForm`

**File**: `frontend/src/pages/story/create-ai/components/StoryInputForm.tsx`

**Purpose**: Input form for AI generation

**Fields**:
- **Description** (Textarea, 2000 chars max)
  - Label: "Describe your story idea"
  - Placeholder: "Example: A young wizard discovers a forbidden spell book in the academy library..."

- **Image Upload** (Optional, File input)
  - Label: "Or upload an image for inspiration"
  - Preview uploaded image
  - Max 10MB

- **Age Rating** (Select, required)
  - Default: "L"

- **Content Tags** (Multi-select, optional)
  - Checkboxes for VIOLENCE, GORE, SEXUAL, etc.

**Validation**:
- At least one of description or image required
- Description max 2000 chars
- Image max 10MB

**Credits Display**:
- Show estimated cost: "Estimated: 75-100 credits"
- Check user balance before enabling submit
- Disable submit if insufficient credits
- Link to "Buy Credits" if needed

**Submit Button**:
- "Generate Story" (primary, gradient purple)
- Disabled states:
  - No input provided
  - Insufficient credits
  - Image uploading

---

#### `GameLoadingAnimation`

**File**: `frontend/src/pages/story/create-ai/components/GameLoadingAnimation.tsx`

**Purpose**: Loading screen with progress during generation

**Design**: Similar to character generation
- Animated background (magic/book theme instead of magic circle)
- Progress bar with percentage
- Current step message (internationalized)
- Estimated time remaining (optional)

**Animation Ideas**:
- Floating books/pages
- Glowing orb/crystal ball
- Writing quill animation
- Page turning effect

**Messages** (i18n keys):
- `stories.createAI.progress.step1` → "Analyzing your input..."
- `stories.createAI.progress.step2` → "Generating story concept..."
- `stories.createAI.progress.step3` → "Creating plot structure..."
- `stories.createAI.progress.step4` → "Writing initial scene..."
- `stories.createAI.progress.step5` → "Generating objectives..."
- `stories.createAI.progress.step6` → "Creating cover image..."
- `stories.createAI.progress.step7` → "Finalizing story..."
- `stories.createAI.progress.step8` → "Story ready!"

---

#### `StoryRevealScreen`

**File**: `frontend/src/pages/story/create-ai/components/StoryRevealScreen.tsx`

**Purpose**: Phased reveal of generated story

**Animation Sequence**:
1. **Phase 1** (0s): Title fades in
2. **Phase 2** (+1.5s): Synopsis fades in below title
3. **Phase 3** (+1.5s): First objective appears
4. **Phase 4** (+1.5s): Cover image fades in
5. **Complete** (+1s): Show "Continue" button

**Design**:
- Dark gradient background
- Centered content
- Elegant typography
- Fade-in transitions (0.6s ease)

**Continue Button**: Transitions to `FinalRevealScreen`

---

#### `FinalRevealScreen`

**File**: `frontend/src/pages/story/create-ai/components/FinalRevealScreen.tsx`

**Purpose**: Final reveal with action buttons

**Layout**: Portrait-oriented story card

**Card Content**:
- Cover image (top, 16:9 aspect ratio)
- Title (overlay on cover or below)
- Synopsis (truncated with "Read more")
- Age rating badge
- Content tags (chips)
- Objectives preview (collapsible)

**Action Buttons** (4 buttons):
1. **View Story** (primary) → `/stories/{id}`
2. **Edit Story** (secondary) → `/stories/{id}/edit`
3. **Start Playing** (success/gradient) → `/chat/story/{id}` (or gameplay route)
4. **Discard** (danger, text link) → Confirm modal → Delete story → `/stories`

**Design**: Similar to character final reveal

---

### 3. Custom Hooks

#### `useStoryGenerationSocket`

**File**: `frontend/src/pages/story/create-ai/hooks/useStoryGenerationSocket.ts`

**Purpose**: WebSocket connection for real-time progress

**Usage**:
```typescript
const {
  progress,
  message,
  error,
  storyId,
  isComplete,
  connect,
  disconnect
} = useStoryGenerationSocket(sessionId);
```

**Events**:
- `story-generation:progress` → Update progress bar
- `story-generation:complete` → Set complete flag, store storyId
- `story-generation:error` → Show error message

---

#### `useStoryForm`

**File**: `frontend/src/pages/story/shared/hooks/useStoryForm.ts`

**Purpose**: Form state management for manual creation

**Usage**:
```typescript
const form = useStoryForm(initialData?);

form.values;              // Current form values
form.updateField(field, value);
form.errors;              // Validation errors
form.validate();          // Run validation
form.reset();             // Reset to initial
```

**Validation Rules**:
- Title: required, 1-100 chars
- Synopsis: optional, max 2000 chars
- InitialText: optional, max 5000 chars
- Objectives: each max 500 chars
- AgeRating: required
- ContentTags: optional array
- Visibility: required

---

#### `useCoverPolling`

**File**: `frontend/src/pages/story/create-ai/hooks/useCoverPolling.ts`

**Purpose**: Poll for cover image completion (if async)

**Usage**: Similar to `useAvatarPolling` for characters

**Behavior**:
- Poll every 2s for max 60s
- Check if story.coverImage is populated
- Stop polling when image available or timeout

---

## Credits System Integration

### Pricing

| Scenario | Credits | Components |
|----------|---------|------------|
| **Text Only** | 75 | LLM (50) + Cover Image (25) |
| **With Image** | 100 | Image Analysis (25) + LLM (50) + Cover Image (25) |

### Credit Deduction Flow

```typescript
// 1. Check balance before processing
const userCredits = await getUserCredits(userId);
const requiredCredits = input.imageFile ? 100 : 75;

if (userCredits < requiredCredits) {
  throw new Error('INSUFFICIENT_CREDITS');
}

// 2. Deduct credits upfront (prevent abuse)
await deductCredits(userId, requiredCredits, {
  type: 'STORY_GENERATION',
  metadata: { sessionId, hasImage: !!input.imageFile }
});

// 3. If generation fails, refund credits (optional, generous policy)
try {
  const story = await generateStory(...);
  return story;
} catch (error) {
  await refundCredits(userId, requiredCredits, { reason: 'GENERATION_FAILED' });
  throw error;
}
```

### Frontend Credit Display

- **Before Generation**: Show estimated cost and current balance
- **Insufficient Balance**: Disable button, show "Buy Credits" link
- **After Generation**: Show updated balance in toast/notification

---

## Internationalization

### Translation Keys

**New namespace**: `stories.createAI`

**Required translations** (11 languages):
- English, Portuguese, Spanish, French, German
- Chinese, Hindi, Arabic, Russian, Japanese, Korean, Italian

**Key structure**:
```yaml
stories:
  create:
    title: "Create Story"
    chooseMethod:
      title: "How would you like to create your story?"
      manual:
        title: "Manual Creation"
        description: "Create your story step by step with full control"
        features:
          - "Complete customization"
          - "Organized in tabs"
          - "Perfect for detailed stories"
        cost: "Free"
        button: "Create Manually"
      ai:
        title: "AI-Powered Creation"
        description: "Let AI generate your story from a description or image"
        features:
          - "Automatic generation"
          - "Upload image or describe"
          - "Fast and creative"
        cost: "{{credits}} credits"
        button: "Create with AI"

  createAI:
    title: "Generate Story with AI"
    subtitle: "Describe your story or upload an image"

    form:
      description:
        label: "Story Description"
        placeholder: "Example: A young wizard discovers a forbidden spell book..."
        help: "Describe your story idea (max 2000 characters)"
      image:
        label: "Or upload an image"
        help: "Optional: Upload an image for visual inspiration"
      ageRating:
        label: "Age Rating"
      contentTags:
        label: "Content Warnings"
      estimatedCost: "Estimated: {{credits}} credits"
      insufficientCredits: "Insufficient credits. You need {{required}} but have {{current}}."
      buyCredits: "Buy Credits"
      generateButton: "Generate Story"

    progress:
      step1: "Analyzing your input..."
      step2: "Generating story concept..."
      step3: "Creating plot structure..."
      step4: "Writing initial scene..."
      step5: "Generating objectives..."
      step6: "Creating cover image..."
      step7: "Finalizing story..."
      step8: "Story ready!"

    reveal:
      title: "Your Story is Ready!"
      continue: "Continue"

    final:
      viewStory: "View Story"
      editStory: "Edit Story"
      startPlaying: "Start Playing"
      discard: "Discard"
      confirmDiscard:
        title: "Discard Story?"
        message: "This will permanently delete the generated story."
        confirm: "Yes, discard"
        cancel: "Keep it"

  new:
    title: "Create Story Manually"
    subtitle: "Fill in the details step by step"
    tabs:
      details: "Story Details"
      plot: "Plot & Setting"
      characters: "Characters"
      media: "Media"
      visibility: "Visibility"
    saveButton: "Save Story"
    cancelButton: "Cancel"
```

**File**: `frontend/public/locales/{lang}/stories.json`

---

## Testing Strategy

### Manual Testing Checklist

#### Selection Page
- [ ] Both cards render correctly
- [ ] Manual card navigates to `/stories/new`
- [ ] AI card navigates to `/stories/create-ai`
- [ ] Back button works
- [ ] Responsive layout (mobile + desktop)
- [ ] Dark mode compatibility

#### Manual Creation
- [ ] All 5 tabs render
- [ ] Tab switching works
- [ ] All form fields work correctly
- [ ] Validation shows errors in real-time
- [ ] Cover image upload works
- [ ] Character selector works
- [ ] Objectives can be added/removed
- [ ] Save creates story and redirects
- [ ] Cancel returns to `/stories`

#### AI Generation - Input Form
- [ ] Text input works (2000 char limit)
- [ ] Image upload works (drag-drop + click)
- [ ] Age rating selection works
- [ ] Content tags selection works
- [ ] Validation: requires text OR image
- [ ] Credits check works
- [ ] Insufficient credits disables submit
- [ ] Estimated cost displays correctly

#### AI Generation - WebSocket
- [ ] WebSocket connects on submit
- [ ] Progress updates in real-time
- [ ] All 8 progress steps show
- [ ] Loading animation plays
- [ ] Progress percentage updates
- [ ] Error handling works

#### AI Generation - Reveal
- [ ] Title reveals first
- [ ] Synopsis reveals second
- [ ] Objectives reveal third
- [ ] Cover image reveals last
- [ ] Continue button appears
- [ ] Animations are smooth

#### AI Generation - Final Screen
- [ ] Story card displays correctly
- [ ] All action buttons work:
  - View Story → navigates
  - Edit Story → navigates
  - Start Playing → navigates
  - Discard → shows confirm modal → deletes

#### Cross-Browser
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

#### Internationalization
- [ ] All labels translate
- [ ] Progress messages translate
- [ ] Error messages translate
- [ ] Test in Portuguese (primary)
- [ ] Test in at least 2 other languages

### Automated Tests (COMPLETED ✅)

**Unit Tests**:
- [x] `storyImageAnalysisAgent` - test image analysis (24 tests)
- [x] `storyCoverPromptAgent` - test cover prompt generation (52 tests)
- [x] `useStoryGenerationSocket` - test WebSocket hook (16 tests)

**Integration Tests**:
- [x] Automated story generation business logic (40 tests)
- [x] POST `/api/v1/stories/generate` - full flow (44 tests)
- [x] Credits deduction logic
- [x] WebSocket events (20 tests)
- [x] Cover image generation queue

**E2E Tests** (Playwright):
- [x] Complete manual creation flow (10 tests)
- [x] Complete AI generation flow (10 tests)
- [x] Error scenarios (insufficient credits, failed generation)

**Test Results**: 116 tests added, all passing. PR #68 created.

---

## Performance Considerations

### Backend
- **LLM Call**: ~5-8 seconds (single call, optimized)
- **Image Analysis**: ~2-3 seconds (if image provided)
- **Cover Generation**: ~30-60 seconds (async, doesn't block)
- **Total User Wait**: ~10-15 seconds (until story is saved)

### Frontend
- **Initial Load**: Lazy load AI creation page
- **Image Upload**: Show progress bar for large images
- **WebSocket**: Reconnect logic if connection drops
- **Reveal Animations**: 60fps, GPU-accelerated

### Optimization
- Cache common prompts (future enhancement)
- Batch credit checks
- Preload images during reveal
- Code splitting for AI wizard

---

## Security Considerations

### Input Validation
- **Description**: Max 2000 chars, sanitize HTML
- **Image**: Max 10MB, verify MIME type, scan for malicious content
- **Age Rating**: Validate against enum
- **Content Tags**: Validate against allowed list

### Rate Limiting
- **AI Generation**: Max 10 per hour per user (prevent abuse)
- **Image Upload**: Max 5MB/minute per user

### Credit Protection
- **Deduct Upfront**: Prevent retry attacks
- **Idempotency**: Use sessionId to prevent double-charging
- **Refund Policy**: Auto-refund if generation fails

### Content Moderation
- **LLM Safety**: Use content filtering in Gemini API
- **Image Analysis**: Flag inappropriate content
- **User Reports**: Allow reporting generated content
- **Manual Review**: Queue for review if AI detects violations

---

## Rollout Strategy

### Phase 1: Manual Creation Refactor (Week 1)
**Goal**: Improve existing manual creation UX

**Tasks**:
1. Create `StoryFormLayout` with tabs
2. Implement all 5 tabs (Details, Plot, Characters, Media, Visibility)
3. Update `/stories/create` selection page
4. Create `/stories/new` route
5. Test and QA

**Acceptance**:
- [ ] Manual creation works with tabs
- [ ] All existing features preserved
- [ ] No regressions in story editing

### Phase 2: AI Generation Backend (Week 2)
**Goal**: Build AI generation infrastructure

**Tasks**:
1. Implement `storyImageAnalysisAgent`
2. Implement `compileStoryDataWithLLM`
3. Create POST `/api/v1/stories/generate` endpoint
4. Integrate credits system
5. Setup WebSocket handler
6. Queue cover image generation
7. Unit tests

**Acceptance**:
- [ ] API endpoint works end-to-end
- [ ] Credits deducted correctly
- [ ] WebSocket events emit
- [ ] Cover images generate

### Phase 3: AI Generation Frontend (Week 2-3)
**Goal**: Build AI generation UI

**Tasks**:
1. Create `/stories/create-ai` route
2. Implement `GenerationWizard` components
3. Implement `useStoryGenerationSocket` hook
4. Build loading animation
5. Build reveal screens
6. Internationalization
7. E2E tests

**Acceptance**:
- [ ] Full wizard flow works
- [ ] Real-time progress updates
- [ ] Reveal animations work
- [ ] All languages supported

### Phase 4: Polish & Launch (Week 3-4)
**Goal**: Final touches and production launch

**Tasks**:
1. User testing with 5-10 beta testers
2. Fix bugs from testing
3. Performance optimization
4. Documentation updates
5. Marketing assets (screenshots, videos)
6. Analytics instrumentation
7. Launch announcement

**Acceptance**:
- [ ] No critical bugs
- [ ] Performance meets targets
- [ ] Analytics tracking works
- [ ] Documentation complete

---

## Success Metrics

### Engagement Metrics
- **Stories Created**: Track manual vs AI
- **Completion Rate**: % of AI generations that complete
- **Time to Create**: Average time for manual vs AI
- **Story Plays**: How many times generated stories are played

### Business Metrics
- **Credits Spent**: Total credits on story generation
- **Conversion Rate**: Free users → credit purchases
- **User Retention**: 7-day/30-day retention after creating story

### Quality Metrics
- **AI Success Rate**: % of generations without errors
- **User Satisfaction**: Survey after generation (thumbs up/down)
- **Edit Rate**: % of AI stories edited after generation
- **Discard Rate**: % of AI stories discarded immediately

### Technical Metrics
- **API Latency**: P50, P95, P99 for `/api/v1/stories/generate`
- **WebSocket Reliability**: Connection success rate
- **Error Rate**: % of failed generations
- **Cover Gen Time**: Average time for cover image generation

**Targets** (First Month):
- 500+ AI story generations
- <5% error rate
- >80% completion rate (users finish wizard)
- <10% discard rate
- P95 latency <15s for story generation

---

## Future Enhancements

### Short-term (1-3 months)
- [ ] "Regenerate" button to tweak AI results before saving
- [ ] Edit story before finalizing (interim step)
- [ ] Multiple cover image styles (realistic, anime, cartoon, pixel-art)
- [ ] Story templates (adventure, romance, mystery, sci-fi)
- [ ] Character suggestions based on story (auto-generate characters for story)

### Medium-term (3-6 months)
- [ ] Collaborative story creation (multiple authors)
- [ ] Story branching/chapters system
- [ ] AI-assisted story continuation (generate next chapter)
- [ ] Story remix (fork and modify existing stories)
- [ ] Advanced analytics (story performance dashboard)

### Long-term (6-12 months)
- [ ] Voice input for story description
- [ ] Multi-modal generation (video → story)
- [ ] Story marketplace (sell/buy premium stories)
- [ ] Story contests and community challenges
- [ ] AI game master mode (dynamic storytelling in real-time)

---

## Dependencies

### Required Services
- **LLM Provider**: Gemini 1.5 Pro (story generation)
- **Vision AI**: Gemini Pro Vision (image analysis)
- **ComfyUI**: Stable Diffusion (cover image generation)
- **R2 Storage**: Cover images and uploaded images
- **WebSocket Infrastructure**: Real-time progress updates

### Environment Variables
```bash
GEMINI_API_KEY=your_key
COMFYUI_API_BASE_URL=http://comfyui:8188
COMFYUI_ENABLED=true
R2_BUCKET_NAME=charhub-media
R2_PUBLIC_URL=https://media.charhub.app
```

### CORS Configuration
R2 bucket must allow:
- `http://localhost:8082`, `http://localhost:5175` (dev)
- `https://charhub.app`, `https://*.charhub.app` (prod)

**See**: [R2 CORS Configuration Guide](../../../02-guides/operations/r2-cors-configuration.md)

---

## Related Documentation

- **Character Generation System**: [automated-character-generation.md](./automated-character-generation.md)
- **Credits System**: [credits-system.md](./credits-system.md)
- **ComfyUI Setup**: [comfyui-setup.md](../../../02-guides/operations/comfyui-setup.md)
- **WebSocket Infrastructure**: [websocket-setup.md](../../../02-guides/operations/websocket-setup.md) (if exists)
- **System Architecture**: [system-overview.md](../../../04-architecture/system-overview.md)

---

## Pull Request Template

**Title**: `feat: Automated Story Generation System (Manual + AI)`

**Branch**: `feature/automated-story-generation`

**Description**:
```markdown
## Summary
Implements complete story creation system with two modes:
1. Manual creation with organized tab layout
2. AI-powered generation from text/image inputs

## Features
✨ Manual Creation
- Organized 5-tab interface (Details, Plot, Characters, Media, Visibility)
- Improved UX over previous single-form approach

✨ AI Generation
- Text or image input
- Real-time WebSocket progress (8 steps)
- Automatic cover image generation
- Dramatic reveal animations
- Credits integration (75-100 credits)

## Technical Changes
**Backend**:
- New endpoint: POST /api/v1/stories/generate
- Story image analysis agent
- LLM story compilation
- WebSocket progress handler
- Cover image generation queue

**Frontend**:
- Selection page: /stories/create
- Manual creation: /stories/new (with tabs)
- AI creation: /stories/create-ai (wizard)
- Custom hooks: useStoryGenerationSocket, useStoryForm
- 11 language translations

## Testing
- [x] Manual creation flow tested
- [x] AI generation flow tested
- [x] Credits deduction verified
- [x] WebSocket real-time updates working
- [x] Cover image generation successful
- [x] Cross-browser compatibility
- [x] Mobile responsive
- [x] Dark mode support
- [x] Internationalization verified

## Screenshots
[Add screenshots of selection page, tab interface, and AI generation flow]

## Migration Notes
- No database migrations required (uses existing Story model)
- Existing stories unaffected
- Backward compatible with existing story creation

## Rollout Plan
1. Deploy backend changes
2. Deploy frontend changes
3. Monitor error rates and performance
4. Gradual rollout to 100% users over 3 days

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## Notes for Agent Coder

### Implementation Priority
1. **Start with Manual Creation** (lower risk, no AI dependencies)
   - Easier to test and validate
   - Provides immediate UX improvement
   - Foundation for AI mode

2. **Then AI Generation** (more complex, needs testing)
   - Reuse patterns from character generation
   - Test extensively with various inputs
   - Monitor credit usage carefully

### Code Reuse Opportunities
- **Character generation components**: Adapt LoadingAnimation, RevealScreen
- **Character form layout**: Copy tab structure and styling
- **WebSocket hooks**: Similar pattern to character generation
- **Credits integration**: Existing credit check/deduction logic

### Key Files to Reference
- `frontend/src/pages/(characters)/create/index.tsx` - Selection page pattern
- `frontend/src/pages/(characters)/shared/components/CharacterFormLayout.tsx` - Tab layout
- `backend/src/agents/characterImageAnalysisAgent.ts` - Image analysis pattern
- `backend/src/controllers/automatedCharacterGenerationController.ts` - LLM compilation pattern
- `backend/src/websocket/characterGenerationHandler.ts` - WebSocket pattern

### Testing Focus Areas
1. **Credits deduction**: Ensure no double-charging or bypass vulnerabilities
2. **Input validation**: Prevent injection attacks and malformed input
3. **WebSocket reliability**: Handle disconnects and reconnects gracefully
4. **Error handling**: Clear messages for all failure scenarios
5. **Performance**: Monitor LLM latency and optimize prompts

### Questions to Clarify
- Should we generate suggested characters for the story? (Future enhancement?)
- Do we want story history/versioning? (Not in v1)
- Should discard return credits? (Suggest: No, to prevent abuse)
- Cover image aspect ratio preference? (Recommend: 16:9 landscape)

---

**End of Specification**

For questions or clarifications, consult Agent Planner or review related documentation.

🚀 Ready for implementation!
