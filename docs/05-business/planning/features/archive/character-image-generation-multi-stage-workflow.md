# Character Image Generation Multi-Stage Workflow - Feature Specification

**Status**: ✅ Implemented (Ready for Review)
**Version**: 1.0.0
**Date Created**: 2025-12-28
**Last Updated**: 2026-01-02
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD
**Dependencies**: CharhubComfyUI API capabilities (verify first)

---

## Overview

Melhorar o fluxo de geração de imagens de personagens para criar um **dataset progressivo** de referência que melhora a consistência visual em gerações subsequentes. Ao invés de gerar uma única imagem, criar um conjunto de 4 imagens (avatar → frente → lado → costas), cada uma usando as anteriores como referência, simulando um "LoRA" temporário sem necessidade de treinamento.

---

## Business Value

**Problema Atual**:
- Geração de imagens inconsistente (cada imagem pode ter estilo/aparência diferente)
- Falta de referência visual consistente para o mesmo personagem
- Cada nova geração "esquece" as características das gerações anteriores
- Usuários precisam usar LoRAs externos ou refazer imagens manualmente

**Impacto no Negócio**:
- 🎨 **Qualidade**: Imagens mais consistentes e profissionais
- 🔄 **Reutilização**: Dataset de referência permite gerações futuras melhores
- ⚡ **Eficiência**: Evita retrabalho manual de edição de imagens
- 💎 **Diferencial**: Feature única que concorrentes não possuem

**Solução**:
- **Estágio 1**: Gerar avatar (foco no rosto) com ou sem imagem de referência
- **Estágio 2**: Gerar corpo inteiro frontal usando avatar como referência
- **Estágio 3**: Gerar corpo inteiro lateral usando avatar + frontal
- **Estágio 4**: Gerar corpo inteiro de costas usando todas as anteriores
- Armazenar dataset no R2 como "reference images" do personagem
- Usar dataset em gerações futuras para manter consistência

**Impacto Esperado**:
- ✅ Consistência visual de 80-90% entre imagens do mesmo personagem
- ✅ Redução de 60% em retrabalho manual de imagens
- ✅ Qualidade percebida aumenta significativamente
- ✅ Usuários satisfeitos com a consistência dos personagens

---

## User Stories

### US-1: Geração Multi-Estágio com Feedback
**Como** usuário criando personagem
**Quero** ver o progresso de geração de 4 imagens sequenciais
**Para que** eu acompanhe a criação do dataset visual do personagem

**Acceptance Criteria**:
- [ ] UI mostra 4 etapas: Avatar → Frontal → Lateral → Costas
- [ ] Progress bar indica estágio atual (1/4, 2/4, etc.)
- [ ] Cada imagem aparece conforme é gerada
- [ ] Opção de cancelar processo a qualquer momento
- [ ] Estimativa de tempo (≈2-3 min por estágio = 8-12 min total)
- [ ] Notificação quando processo completa

### US-2: Referência Inicial Opcional
**Como** usuário
**Quero** opcionalmente fornecer imagem(ns) de referência
**Para que** as gerações sejam baseadas em um estilo/personagem existente

**Acceptance Criteria**:
- [ ] Upload de 1-5 imagens de referência (opcional)
- [ ] Imagens enviadas para pasta temporária no ComfyUI
- [ ] Primeira geração (avatar) usa referências fornecidas
- [ ] Indicador visual de que referências estão sendo usadas

### US-3: Dataset de Referência Persistente
**Como** desenvolvedor/sistema
**Quero** armazenar dataset de referência no R2
**Para que** gerações futuras mantenham consistência

**Acceptance Criteria**:
- [ ] 4 imagens armazenadas com tipo especial (`REFERENCE_AVATAR`, `REFERENCE_FRONT`, etc.)
- [ ] Não aparecem por padrão na galeria do personagem
- [ ] Visíveis apenas no modo de edição de personagem
- [ ] Usadas automaticamente em gerações futuras do mesmo personagem
- [ ] URL persistente no R2 (não dependem de pasta temporária ComfyUI)

### US-4: Modo de Edição Mostra Referências
**Como** usuário editando personagem
**Quero** ver as imagens de referência do dataset
**Para que** eu entenda quais imagens estão sendo usadas como base

**Acceptance Criteria**:
- [ ] Seção "Imagens de Referência" no modo de edição
- [ ] 4 imagens exibidas (se existirem)
- [ ] Indicação de qual estágio cada uma representa
- [ ] Opção de regenerar dataset completo (sobrescreve anterior)

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│        Multi-Stage Character Image Generation               │
└─────────────────────────────────────────────────────────────┘

Flow:
┌────────────────────────────────────────────────────────┐
│ User uploads reference images (optional)               │
└──────────────────┬─────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────┐
│ STAGE 1: Generate Avatar (face focus)                 │
│  - Upload references to ComfyUI temp folder            │
│  - Generate avatar with IP-Adapter (if refs exist)     │
│  - Save to R2 as REFERENCE_AVATAR                      │
└──────────────────┬─────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────┐
│ STAGE 2: Generate Front Full Body                     │
│  - Upload avatar to temp folder                        │
│  - Generate front view using avatar as reference       │
│  - Save to R2 as REFERENCE_FRONT                       │
└──────────────────┬─────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────┐
│ STAGE 3: Generate Side Full Body                      │
│  - Upload avatar + front to temp folder                │
│  - Generate side view using both as references         │
│  - Save to R2 as REFERENCE_SIDE                        │
└──────────────────┬─────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────┐
│ STAGE 4: Generate Back Full Body                      │
│  - Upload avatar + front + side to temp folder         │
│  - Generate back view using all as references          │
│  - Save to R2 as REFERENCE_BACK                        │
└──────────────────┬─────────────────────────────────────┘
                   ↓
┌────────────────────────────────────────────────────────┐
│ Complete - All 4 reference images stored in R2         │
│ Future generations use these 4 as references           │
└────────────────────────────────────────────────────────┘

ComfyUI Integration:
┌────────────────────────────────────────────────────────┐
│ ComfyUI API Requirements (VERIFY BEFORE IMPLEMENTING)  │
│  ✓ POST /upload/image - Upload image to temp folder    │
│  ✓ POST /upload/folder - Create temp folder (?)        │
│  ✓ Workflow with multiple IP-Adapter inputs (?)        │
│  ✓ Delete temp folder after completion (?)             │
└────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### PHASE 0: ComfyUI API Capabilities Assessment (30-60 min)

**CRITICAL FIRST STEP**: Verify ComfyUI API supports required operations

#### Required Capabilities

**Document Location**: Create `docs/technical/comfyui-api-limitations.md` if limitations found

**Capabilities to Verify**:

1. **Temporary Folder Creation**:
   ```
   POST /api/create-temp-folder
   Response: { folderId: "temp_abc123", path: "/temp/temp_abc123" }
   ```

2. **Upload Multiple Images to Folder**:
   ```
   POST /api/upload/image
   Body: {
     image: <binary>,
     folder: "temp_abc123",
     filename: "reference_01.png"
   }
   ```

3. **Workflow with Multiple IP-Adapter Inputs**:
   ```json
   {
     "nodes": {
       "ip_adapter_1": {
         "inputs": {
           "image": "temp_abc123/reference_01.png"
         }
       },
       "ip_adapter_2": {
         "inputs": {
           "image": "temp_abc123/reference_02.png"
         }
       }
     }
   }
   ```

4. **Cleanup Temp Folder**:
   ```
   DELETE /api/temp-folder/{folderId}
   ```

#### Action Based on Assessment

**If ALL capabilities exist**: Proceed with full implementation

**If SOME limitations exist**:
- Document limitations in `docs/technical/comfyui-api-limitations.md`
- Create GitHub issue for CharhubComfyUI team to implement
- Implement partial solution (e.g., single reference only)
- Schedule full implementation for after API enhancements

**If MAJOR limitations exist**:
- Document clearly what's needed
- Put this feature on hold until ComfyUI API is enhanced
- Create alternative spec (e.g., single reference image only)

---

### PHASE 1: Database Schema Updates (30 min)

#### Update Image Type Enum

**File**: `backend/prisma/schema.prisma`

**Current**:
```prisma
enum ImageType {
  AVATAR
  STICKER
  SAMPLE
  // ... others
}
```

**Add**:
```prisma
enum ImageType {
  // ... existing types
  REFERENCE_AVATAR  // Stage 1: Face focus
  REFERENCE_FRONT   // Stage 2: Full body front
  REFERENCE_SIDE    // Stage 3: Full body side
  REFERENCE_BACK    // Stage 4: Full body back
}
```

**Migration**:
```bash
cd backend
npx prisma migrate dev --name add-reference-image-types
```

---

### PHASE 2: Backend - ComfyUI Service Enhancement (2-3 hours)

#### Extend ComfyUI Service with Temp Folder Support

**File**: `backend/src/services/comfyui/comfyuiService.ts`

**New Methods**:

```typescript
interface TempFolderResponse {
  folderId: string;
  path: string;
}

class ComfyUIService {
  // ... existing methods

  /**
   * Create temporary folder for reference images
   * Returns folder ID for subsequent uploads
   */
  async createTempFolder(): Promise<TempFolderResponse> {
    // IF SUPPORTED BY API:
    const response = await axios.post(`${this.baseUrl}/api/create-temp-folder`);
    return response.data;

    // IF NOT SUPPORTED:
    // Use timestamp-based folder name
    const folderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      folderId,
      path: `/temp/${folderId}`
    };
  }

  /**
   * Upload image to specific folder in ComfyUI
   * @param imageBuffer - Image binary data
   * @param folderId - Temp folder ID
   * @param filename - Image filename
   */
  async uploadImageToFolder(
    imageBuffer: Buffer,
    folderId: string,
    filename: string
  ): Promise<string> {
    const formData = new FormData();
    formData.append('image', imageBuffer, filename);
    formData.append('folder', folderId);

    const response = await axios.post(
      `${this.baseUrl}/upload/image`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    return `${folderId}/${response.data.name}`;
  }

  /**
   * Upload multiple reference images to temp folder
   * @param images - Array of image buffers
   * @param folderId - Temp folder ID
   * @returns Array of image paths in ComfyUI
   */
  async uploadReferenceImages(
    images: Buffer[],
    folderId: string
  ): Promise<string[]> {
    const uploadPromises = images.map((image, index) =>
      this.uploadImageToFolder(image, folderId, `ref_${index}.png`)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete temporary folder after generation completes
   * @param folderId - Temp folder ID to delete
   */
  async deleteTempFolder(folderId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/temp-folder/${folderId}`);
    } catch (error) {
      console.warn(`Failed to delete temp folder ${folderId}:`, error);
      // Non-critical - ComfyUI should have cleanup job
    }
  }

  /**
   * Generate image with multiple reference images
   * Uses IP-Adapter with folder of references
   */
  async generateWithMultipleReferences(
    prompt: SDPrompt,
    referencePaths: string[],
    options: {
      viewType: 'face' | 'front' | 'side' | 'back';
    }
  ): Promise<ImageGenerationResult> {
    // Load appropriate workflow based on viewType
    const workflowTemplate = await this.loadWorkflow(
      `multi-ref-${options.viewType}.workflow.json`
    );

    // Inject reference paths and prompt
    const workflow = this.prepareMultiRefWorkflow(
      workflowTemplate,
      prompt,
      referencePaths
    );

    // Execute workflow
    return this.executeWorkflow(workflow);
  }

  private prepareMultiRefWorkflow(
    template: ComfyWorkflow,
    prompt: SDPrompt,
    referencePaths: string[]
  ): ComfyWorkflow {
    // Deep clone workflow
    const workflow = JSON.parse(JSON.stringify(template));

    // Set random seed
    workflow.seed = Date.now();

    // Inject prompts
    workflow.positive_prompt = prompt.positive;
    workflow.negative_prompt = prompt.negative;

    // Inject reference image paths
    // Assuming workflow has IP-Adapter nodes with reference inputs
    if (referencePaths.length > 0) {
      workflow.ip_adapter_refs = referencePaths;
    }

    return workflow;
  }

  private async loadWorkflow(filename: string): Promise<ComfyWorkflow> {
    const workflowPath = path.join(__dirname, 'workflows', filename);
    const workflowData = await fs.readFile(workflowPath, 'utf-8');
    return JSON.parse(workflowData);
  }
}
```

---

### PHASE 3: Backend - Multi-Stage Generation Job (3-4 hours)

#### Create Multi-Stage Generation Service

**File**: `backend/src/services/image-generation/multiStageGenerator.ts`

**Purpose**: Orchestrate 4-stage generation process

```typescript
import { comfyuiService } from '../comfyui/comfyuiService';
import { r2Service } from '../storage/r2Service';
import { prisma } from '../prisma';

interface MultiStageGenerationOptions {
  characterId: string;
  prompt: {
    positive: string;
    negative: string;
  };
  initialReferences?: Buffer[]; // Optional user-provided references
  userId: string;
}

interface StageResult {
  stage: number;
  type: 'REFERENCE_AVATAR' | 'REFERENCE_FRONT' | 'REFERENCE_SIDE' | 'REFERENCE_BACK';
  imageUrl: string;
  comfyPath: string;
}

export class MultiStageCharacterGenerator {
  async generateCharacterDataset(
    options: MultiStageGenerationOptions
  ): Promise<StageResult[]> {
    const {
      characterId,
      prompt,
      initialReferences = [],
      userId
    } = options;

    const results: StageResult[] = [];
    let tempFolderId: string | null = null;

    try {
      // Create temp folder in ComfyUI
      const { folderId } = await comfyuiService.createTempFolder();
      tempFolderId = folderId;

      // Upload initial references (if provided)
      let referencePaths: string[] = [];
      if (initialReferences.length > 0) {
        referencePaths = await comfyuiService.uploadReferenceImages(
          initialReferences,
          folderId
        );
      }

      // STAGE 1: Generate Avatar (face focus)
      const avatarResult = await this.generateStage({
        stage: 1,
        type: 'REFERENCE_AVATAR',
        viewType: 'face',
        prompt,
        referencePaths,
        characterId,
        userId,
        tempFolderId: folderId
      });
      results.push(avatarResult);
      referencePaths.push(avatarResult.comfyPath);

      // STAGE 2: Generate Front Full Body
      const frontResult = await this.generateStage({
        stage: 2,
        type: 'REFERENCE_FRONT',
        viewType: 'front',
        prompt,
        referencePaths,
        characterId,
        userId,
        tempFolderId: folderId
      });
      results.push(frontResult);
      referencePaths.push(frontResult.comfyPath);

      // STAGE 3: Generate Side Full Body
      const sideResult = await this.generateStage({
        stage: 3,
        type: 'REFERENCE_SIDE',
        viewType: 'side',
        prompt,
        referencePaths,
        characterId,
        userId,
        tempFolderId: folderId
      });
      results.push(sideResult);
      referencePaths.push(sideResult.comfyPath);

      // STAGE 4: Generate Back Full Body
      const backResult = await this.generateStage({
        stage: 4,
        type: 'REFERENCE_BACK',
        viewType: 'back',
        prompt,
        referencePaths,
        characterId,
        userId,
        tempFolderId: folderId
      });
      results.push(backResult);

      return results;
    } finally {
      // Cleanup temp folder (non-blocking)
      if (tempFolderId) {
        comfyuiService.deleteTempFolder(tempFolderId).catch(console.error);
      }
    }
  }

  private async generateStage(options: {
    stage: number;
    type: ImageType;
    viewType: 'face' | 'front' | 'side' | 'back';
    prompt: { positive: string; negative: string };
    referencePaths: string[];
    characterId: string;
    userId: string;
    tempFolderId: string;
  }): Promise<StageResult> {
    const {
      stage,
      type,
      viewType,
      prompt,
      referencePaths,
      characterId,
      userId,
      tempFolderId
    } = options;

    console.log(`Starting stage ${stage}: ${type}`);

    // Adjust prompt for viewType
    const adjustedPrompt = this.adjustPromptForView(prompt, viewType);

    // Generate image with ComfyUI
    const generationResult = await comfyuiService.generateWithMultipleReferences(
      adjustedPrompt,
      referencePaths,
      { viewType }
    );

    // Download generated image
    const imageBuffer = await comfyuiService.fetchImage(generationResult.imageUrl);

    // Upload to R2
    const r2Key = `characters/${characterId}/references/${type.toLowerCase()}.png`;
    const r2Url = await r2Service.uploadImage(imageBuffer, r2Key);

    // Save to database
    await prisma.characterImage.create({
      data: {
        characterId,
        type,
        url: r2Url,
        generationData: {
          prompt: adjustedPrompt,
          stage,
          referencesUsed: referencePaths.length
        }
      }
    });

    // Upload generated image to temp folder for next stage
    const comfyPath = await comfyuiService.uploadImageToFolder(
      imageBuffer,
      tempFolderId,
      `stage_${stage}.png`
    );

    console.log(`Completed stage ${stage}: ${type}`);

    return {
      stage,
      type,
      imageUrl: r2Url,
      comfyPath
    };
  }

  private adjustPromptForView(
    prompt: { positive: string; negative: string },
    viewType: 'face' | 'front' | 'side' | 'back'
  ): { positive: string; negative: string } {
    const viewPrompts = {
      face: {
        prefix: 'portrait, headshot, face focus, detailed facial features,',
        negative: 'full body, multiple views,'
      },
      front: {
        prefix: 'full body, standing, front view, looking at camera,',
        negative: 'cropped, headshot only,'
      },
      side: {
        prefix: 'full body, standing, side view, profile,',
        negative: 'front view, back view,'
      },
      back: {
        prefix: 'full body, standing, back view, rear view,',
        negative: 'front view, face visible,'
      }
    };

    const viewConfig = viewPrompts[viewType];

    return {
      positive: `${viewConfig.prefix} ${prompt.positive}`,
      negative: `${prompt.negative}, ${viewConfig.negative}`
    };
  }
}

export const multiStageGenerator = new MultiStageCharacterGenerator();
```

---

### PHASE 4: Backend - API Endpoint (1 hour)

#### Create Multi-Stage Generation Endpoint

**File**: `backend/src/routes/v1/image-generation.ts`

**Add Route**:
```typescript
/**
 * POST /api/v1/image-generation/character-dataset
 *
 * Generate complete 4-stage reference dataset for character
 * Long-running operation - returns job ID for polling
 */
router.post('/character-dataset', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      characterId,
      prompt,
      referenceImages = [] // Optional: base64 encoded images
    } = req.body;

    // Validate character ownership
    const character = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character || character.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Decode reference images if provided
    const referenceBuffers = referenceImages.map((img: string) =>
      Buffer.from(img, 'base64')
    );

    // Queue job (long-running)
    const job = await imageGenerationQueue.add('multi-stage-dataset', {
      characterId,
      prompt,
      referenceBuffers,
      userId
    });

    res.json({
      jobId: job.id,
      message: 'Dataset generation started',
      estimatedTime: '8-12 minutes',
      pollUrl: `/api/v1/image-generation/job/${job.id}`
    });
  } catch (error) {
    console.error('Dataset generation error:', error);
    res.status(500).json({ error: 'Failed to start generation' });
  }
});

/**
 * GET /api/v1/image-generation/job/:jobId
 *
 * Poll job status
 */
router.get('/job/:jobId', authenticate, async (req, res) => {
  const { jobId } = req.params;

  const job = await imageGenerationQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress;

  res.json({
    jobId,
    state, // waiting, active, completed, failed
    progress, // { stage: 2, total: 4, message: "Generating front view..." }
    result: state === 'completed' ? job.returnvalue : null
  });
});
```

**Job Processor**:
```typescript
// In queue processor file
imageGenerationQueue.process('multi-stage-dataset', async (job) => {
  const { characterId, prompt, referenceBuffers, userId } = job.data;

  // Update progress
  job.progress({ stage: 0, total: 4, message: 'Starting generation...' });

  const results = [];

  try {
    // Generate each stage
    for (let stage = 1; stage <= 4; stage++) {
      job.progress({
        stage,
        total: 4,
        message: `Generating stage ${stage}/4...`
      });

      // ... generation logic (simplified for brevity)

      results.push(/* stage result */);
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    throw error; // Job will be marked as failed
  }
});
```

---

### PHASE 5: Frontend - Multi-Stage UI (3-4 hours)

#### Create Multi-Stage Progress Component

**File**: `frontend/src/components/image-generation/MultiStageProgress.tsx`

```typescript
interface Stage {
  id: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  imageUrl?: string;
}

export function MultiStageProgress() {
  const [stages, setStages] = useState<Stage[]>([
    { id: 1, name: 'Avatar (Rosto)', status: 'pending' },
    { id: 2, name: 'Corpo Frontal', status: 'pending' },
    { id: 3, name: 'Corpo Lateral', status: 'pending' },
    { id: 4, name: 'Corpo Costas', status: 'pending' }
  ]);

  const [jobId, setJobId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);

  // Start generation
  const startGeneration = async (prompt: string, references?: File[]) => {
    const response = await api.post('/image-generation/character-dataset', {
      characterId,
      prompt,
      referenceImages: references
        ? await Promise.all(references.map(fileToBase64))
        : []
    });

    setJobId(response.data.jobId);
  };

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      const status = await api.get(`/image-generation/job/${jobId}`);

      if (status.data.state === 'completed') {
        clearInterval(interval);
        // Update all stages to completed
        // ... handle completion
      } else if (status.data.state === 'failed') {
        clearInterval(interval);
        // Handle error
      } else {
        // Update progress
        const progress = status.data.progress;
        setOverallProgress((progress.stage / progress.total) * 100);

        // Update stage statuses
        setStages(prev => prev.map((stage, idx) => ({
          ...stage,
          status: idx < progress.stage ? 'completed' :
                  idx === progress.stage ? 'in_progress' : 'pending'
        })));
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Gerando dataset de imagens...</span>
          <span>{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Individual Stages */}
      <div className="grid grid-cols-2 gap-4">
        {stages.map(stage => (
          <div
            key={stage.id}
            className={`border-2 rounded-lg p-4 ${
              stage.status === 'completed' ? 'border-green-500' :
              stage.status === 'in_progress' ? 'border-blue-500' :
              'border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{stage.name}</span>
              {stage.status === 'completed' && <span>✓</span>}
              {stage.status === 'in_progress' && <Spinner />}
            </div>

            {stage.imageUrl ? (
              <img
                src={stage.imageUrl}
                alt={stage.name}
                className="w-full aspect-square object-cover rounded"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center">
                <span className="text-gray-400">Aguardando...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Backend Tests

```typescript
describe('MultiStageCharacterGenerator', () => {
  test('generates all 4 stages successfully', async () => {
    const results = await multiStageGenerator.generateCharacterDataset({
      characterId: 'char-123',
      prompt: { positive: 'elf warrior', negative: 'blurry' },
      userId: 'user-1'
    });

    expect(results).toHaveLength(4);
    expect(results[0].type).toBe('REFERENCE_AVATAR');
    expect(results[3].type).toBe('REFERENCE_BACK');
  });

  test('uses initial references if provided', async () => {
    const mockRefs = [Buffer.from('image1'), Buffer.from('image2')];

    const results = await multiStageGenerator.generateCharacterDataset({
      characterId: 'char-123',
      prompt: { positive: 'elf warrior', negative: 'blurry' },
      initialReferences: mockRefs,
      userId: 'user-1'
    });

    // Verify first stage used initial references
    // ... assertions
  });
});
```

---

## Success Metrics

- **Consistency Score**: 80-90% visual similarity between images (manual QA)
- **Generation Success Rate**: > 95% (all 4 stages complete)
- **User Satisfaction**: Positive feedback on image quality
- **Usage Rate**: 60%+ of character creations use multi-stage

---

## Risks & Mitigation

### Risk 1: ComfyUI API Limitations
**Probability**: High
**Impact**: High

**Mitigation**:
- **Phase 0 Assessment** (CRITICAL)
- Document limitations clearly
- Create issues for ComfyUI team
- Implement fallback (single reference only)

### Risk 2: Long Generation Time (8-12 min)
**Probability**: High
**Impact**: Medium

**Mitigation**:
- Clear progress feedback
- Allow navigation away (background job)
- Email notification when complete
- Option to cancel

### Risk 3: Storage Cost (4 images per character)
**Probability**: Low
**Impact**: Low

**Mitigation**:
- Images are reference quality (can be lower resolution)
- R2 storage is cheap
- Monitor storage costs

---

## Notes for Agent Coder

### CRITICAL: Start with Phase 0
**DO NOT proceed with implementation until ComfyUI API capabilities are verified!**

Create `docs/technical/comfyui-api-limitations.md` documenting findings.

### Estimated Effort
- **Phase 0 (Assessment)**: 1-2 hours ✅ COMPLETED
- **If limitations found**: STOP, document, create issues
- **If capabilities exist**: 12-16 hours implementation ✅ COMPLETED

### Alternative (If Limited API)
If ComfyUI doesn't support multiple references:
- Implement single-reference workflow
- Delay full multi-stage until API ready

---

## Implementation Progress

**Branch**: `feature/multi-stage-character-generation`
**Status**: ✅ **FRONTEND IMPLEMENTATION COMPLETE** (Ready for Testing)
**Date**: 2026-01-01

### Completed Phases

#### ✅ Phase 0: ComfyUI API Capabilities Assessment
- Created `docs/technical/comfyui-api-assessment-multi-stage.md`
- **Result**: ComfyUI Middleware v2.0 API is sufficient
- No changes to Middleware needed
- Recommendation: Proceed with Option A (High-Level API)

#### ✅ Phase 1: Database Schema Updates
- Added new `ImageType` enum values:
  - `REFERENCE_AVATAR`
  - `REFERENCE_FRONT`
  - `REFERENCE_SIDE`
  - `REFERENCE_BACK`
- Migration applied successfully
- Added image processing defaults for reference types

#### ✅ Phase 2: Backend - ComfyUI Service Enhancement
**File**: `backend/src/services/comfyui/comfyuiService.ts`

Added High-Level API methods:
- `prepareReferences()` - Call `/api/prepare`
- `generateWithReferences()` - Call `/api/generate`
- `cleanupReferences()` - Call `/api/cleanup`
- `generateMultiRef()` - Multi-reference workflow execution

Added types in `types.ts`:
- `ReferenceImage`
- `PrepareReferencesRequest/Response`
- `GenerateWithReferencesRequest/Response`
- `CleanupRequest/Response`
- Extended `ImageGenerationType` enum

#### ✅ Phase 3: Backend - Workflow Templates
Created 4 workflow templates in `backend/src/services/comfyui/workflows/`:
- `multi-ref-face.workflow.json` - Avatar (768x768)
- `multi-ref-front.workflow.json` - Front with FaceDetailer (768x1152)
- `multi-ref-side.workflow.json` - Side with FaceDetailer (768x1152)
- `multi-ref-back.workflow.json` - Back with FaceDetailer (768x1152)

All workflows use `LoadImagesFromDir //Inspire` node with `@REFERENCE_PATH@` placeholder.

#### ✅ Phase 4: Backend - Multi-Stage Generator Service
**File**: `backend/src/services/image-generation/multiStageCharacterGenerator.ts`

Created `MultiStageCharacterGenerator` service:
- Sequential 4-stage orchestration
- Cumulative reference management
- Progress tracking callbacks
- Automatic cleanup on error
- View-specific prompt adjustments

#### ✅ Phase 5: Backend - API Endpoints
**File**: `backend/src/routes/v1/image-generation.ts`

Added endpoints:
- `POST /api/v1/image-generation/character-dataset` - Start generation
- `GET /api/v1/image-generation/characters/:characterId/reference-dataset` - Get dataset

#### ✅ Phase 6: Backend - Queue & Job Processor
**Files**:
- `backend/src/queues/jobs/imageGenerationJob.ts` - Added `MultiStageDatasetGenerationJobData`
- `backend/src/queues/workers/imageGenerationWorker.ts` - Added `processMultiStageDatasetGeneration()`

Job processor:
- Updates progress after each stage
- Returns all 4 generated images
- Handles errors gracefully

#### ✅ Build Verification
- Backend compiles successfully (`npm run build`)
- TypeScript compilation passes
- No lint errors

#### ✅ Phase 7: Frontend - Multi-Stage Progress Component
**File**: `frontend/src/components/features/image-generation/MultiStageProgress.tsx`

Created `MultiStageProgress` component:
- 4 stages with status tracking (pending/in_progress/completed/error)
- Job polling every 3 seconds
- Real-time progress bar and stage status updates
- Image preview as each stage completes
- Error handling and retry functionality
- TypeScript with proper type annotations

#### ✅ Phase 8: Frontend - Service Extensions
**File**: `frontend/src/services/imageGenerationService.ts`

Added service methods:
- `generateMultiStageDataset()` - Start multi-stage generation
- `getReferenceDataset()` - Get reference dataset for character
- `getMultiStageJobStatus()` - Poll job status
- `pollMultiStageJobStatus()` - Auto-poll until completion

Added TypeScript interfaces:
- `MultiStageDatasetRequest`
- `MultiStageDatasetResponse`
- `MultiStageJobStatus`
- `ReferenceDataset`
- Extended `GeneratedImage` type with `REFERENCE_*` types

#### ✅ Phase 9: Frontend - i18n Translations
**File**: `backend/translations/_source/characters.json`

Added translations for multi-stage generation:
- Title and description
- Stage names (avatar, front, side, back)
- Status messages (generating, ready, waiting, failed)
- Error messages
- Progress messages

Compiled to all language files (pt-br, en, es, fr, de, ja, ko, zh-cn, ru, hi-in, ar-sa)

#### ✅ Phase 10: Frontend - UI Integration
**File**: `frontend/src/pages/(characters)/shared/components/ImagesTab.tsx`

Integrated `MultiStageProgress` component:
- Added new "Reference Dataset" section after Cover section
- Uses character description for prompt
- Refreshes gallery on completion
- Triggers avatar activated callback

#### ✅ Frontend Build Verification
- Frontend builds successfully (`npm run build`)
- TypeScript compilation passes
- No critical errors

### Next Steps

1. **Manual Testing** (TODO)
   - Test with ComfyUI Middleware v2.0
   - Verify sequential generation works
   - Test with initial reference images
   - Test without initial references
   - Verify cleanup works correctly

2. **Deployment** (TODO)
   - Deploy to staging environment
   - Test with real ComfyUI instance
   - Monitor generation times
   - Verify image quality

### Files Created/Modified

**Created:**
- `docs/technical/comfyui-api-assessment-multi-stage.md`
- `backend/src/services/image-generation/multiStageCharacterGenerator.ts`
- `backend/src/services/comfyui/workflows/multi-ref-face.workflow.json`
- `backend/src/services/comfyui/workflows/multi-ref-front.workflow.json`
- `backend/src/services/comfyui/workflows/multi-ref-side.workflow.json`
- `backend/src/services/comfyui/workflows/multi-ref-back.workflow.json`
- `frontend/src/components/features/image-generation/MultiStageProgress.tsx`
- `frontend/src/components/features/image-generation/index.ts`

**Modified:**
- `backend/prisma/schema.prisma` - Added ImageType values
- `backend/src/services/comfyui/types.ts` - Added types
- `backend/src/services/comfyui/comfyuiService.ts` - Added methods
- `backend/src/services/imageProcessingService.ts` - Added processing defaults
- `backend/src/routes/v1/image-generation.ts` - Added endpoints
- `backend/src/queues/jobs/imageGenerationJob.ts` - Added job types
- `backend/src/queues/workers/imageGenerationWorker.ts` - Added processor
- `backend/translations/_source/characters.json` - Added i18n keys
- `backend/translations/*/characters.json` - Compiled translations
- `frontend/src/services/imageGenerationService.ts` - Added methods
- `frontend/src/pages/(characters)/shared/components/ImagesTab.tsx` - Integrated component

---

**End of Specification**

⚠️ **CRITICAL**: Verify ComfyUI API capabilities (Phase 0) before proceeding!

---

## Implementation Log

**2026-01-01** - Backend Implementation Complete
- Phase 0: Assessment completed - Middleware v2.0 is sufficient
- Phase 1-6: All backend phases implemented
- Build verification: PASSED

**2026-01-01** - Frontend Implementation Complete
- Phase 7-10: All frontend phases implemented
- MultiStageProgress component created
- Service extensions added
- i18n translations added to all languages
- UI integration complete
- Build verification: PASSED (backend + frontend)
- Ready for manual testing

**2026-01-02** - Feature Restructure & PR Preparation
- Simplified ImageType enum from 10 types (REFERENCE_*) to single REFERENCE type with `content` field
- Updated backend schema, services, and types to use new structure
- Updated frontend types, services, and components to use new structure
- Fixed API endpoint to include `content` field in response
- Added complete i18n for ImagesTab (dropdown labels, stats, etc.)
- Translations compiled to all 11 languages
- Merged main branch into feature branch
- Resolved Prisma migration conflict (StoryFavorite table)
- All tests passed: Backend build ✅ Frontend build ✅ Lint ✅
- All containers healthy and verified
- Feature spec moved to implemented/
- Ready for PR creation
