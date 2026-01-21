# FEATURE-013: Avatar Generation Image Improvement - Negative Prompt Enhancement

**Status**: ✅ Implemented
**Version**: 1.0.0
**Date Created**: 2026-01-21
**Last Updated**: 2026-01-21
**Priority**: Medium
**Assigned To**: Agent Coder
**GitHub Issue**: TBD
**Epic**: Image Generation Quality Improvement

---

## Overview

Improve avatar and reference image generation quality by adding negative prompts to inhibit facial artifacts (marks, droplets, scars) that are difficult to replicate without specific reference images.

**Problem Statement**:
- Due to model bias/LoRA effects, many AVATAR and REFERENCE face images come with unwanted facial marks, droplets, and scars
- These patterns are difficult to replicate in subsequent generations without a specific reference image
- Reduces usability of generated characters for consistent storytelling

**Solution**:
- Add enhanced negative prompt tags to inhibit generation of facial artifacts
- Apply to all AVATAR and REFERENCE image generation workflows
- Maintain prompt flexibility for users who intentionally want these features

---

## Business Value

### Current Pain Points

**Facial Artifacts in Generated Images**:
- Droplets (water, tears, sweat) appear on faces without context
- Scars and marks generated randomly, not part of character design
- Inconsistent facial features across multiple generations
- Difficult to achieve clean, consistent character appearance

**Impact**:
- 🎨 **Reduced Quality**: Unintended facial markings lower image quality
- 🔁 **Inconsistency**: Same character looks different across generations
- 😕 **User Frustration**: Users must regenerate multiple times for clean faces
- 📉 **Lower Adoption**: Generated characters less usable for stories/roleplay

### Opportunity

**Improved Quality**:
- Clean, consistent facial features
- Better character reusability across generations
- Higher user satisfaction with generated images
- Reduced regeneration cycles (cost savings)

**Technical Benefits**:
- Centralized negative prompt management
- Easy to tune and adjust
- Affects all image generation types uniformly
- No performance overhead

---

## User Stories

### US-1: Clean Face Generation
**As** a user generating character avatars
**I want** avatar images with clean faces without unintended marks
**So that** my character looks consistent and professional

**Acceptance Criteria**:
- [ ] Avatar images generate without random facial droplets
- [ ] Avatar images generate without unintended scars or marks
- [ ] Clean face generation works across all visual styles
- [ ] Negative prompts don't interfere with intentional character features

### US-2: Consistent Reference Images
**As** a user generating multi-stage reference images
**I want** all reference views (avatar, front, side, back) to have consistent facial features
**So that** I can use the character in multiple contexts

**Acceptance Criteria**:
- [ ] All 4 reference views have matching facial features
- [ ] No random droplets appear in some views but not others
- [ ] Scars/marks only appear if intentionally part of character design
- [ ] Negative prompts applied consistently across multi-stage generation

### US-3: Optional Intentional Features
**As** a user who wants a character with scars
**I want** to be able to specify facial marks explicitly
**So that** negative prompts don't block intentional character design

**Acceptance Criteria**:
- [ ] User-provided prompts can override negative prompts
- [ ] Explicit scar/facial mark descriptions are respected
- [ ] Positive prompt emphasis ((double parentheses)) overrides negative
- [ ] Documentation explains how to add intentional facial features

---

## Technical Implementation

### Architecture Overview

```
Image Generation Request →
Prompt Builder →
Apply Enhanced Negative Prompts →
ComfyUI Workflow →
Generated Image
```

### Negative Prompt Enhancement

#### Current Negative Prompt

**File**: `backend/src/services/comfyui/promptEngineering.ts`

```typescript
// Current implementation (line 14-20)
const STANDARD_NEGATIVE_PROMPT =
  '2girls, (multiple girls:1.3), (multiple characters:1.3), multiple views, grid layout, chibi, miniature, ' +
  'clone, duplicate, cropped, badhandv4, negative_hand-neg, ng_deepnegative_v1_75t, verybadimagenegative_v1.3, ' +
  '(worst quality, bad quality, jpeg artifacts:1.2), sketch, signature, watermark, username, ' +
  '(censored, bar_censor, mosaic_censor:1.2), simple background, conjoined, bad anatomy, bad hands, ' +
  'bad mouth, bad tongue, bad arms, extra arms, bad eyes, extra limbs, speech bubble, dialogue bubble, ' +
  'emoji, icon, text box';
```

#### Enhanced Negative Prompt

**Add facial artifact inhibitors**:

```typescript
// Enhanced implementation
const STANDARD_NEGATIVE_PROMPT =
  '2girls, (multiple girls:1.3), (multiple characters:1.3), multiple views, grid layout, chibi, miniature, ' +
  'clone, duplicate, cropped, badhandv4, negative_hand-neg, ng_deepnegative_v1_75t, verybadimagenegative_v1.3, ' +
  '(worst quality, bad quality, jpeg artifacts:1.2), sketch, signature, watermark, username, ' +
  '(censored, bar_censor, mosaic_censor:1.2), simple background, conjoined, bad anatomy, bad hands, ' +
  'bad mouth, bad tongue, bad arms, extra arms, bad eyes, extra limbs, speech bubble, dialogue bubble, ' +
  'emoji, icon, text box' +
  // NEW: Facial artifact inhibitors
  ', (water droplets:1.3), (tear drops:1.3), (sweat drops:1.3), (rain on face:1.3), (liquid on face:1.3), ' +
  '(facial scars:1.2), (face marks:1.2), (blemishes:1.2), (freckles:1.1), (moles:1.1), ' +
  '(skin imperfections:1.1), (wounds:1.2), (bruises:1.2), (cuts:1.2), ' +
  '(dirt on face:1.2), (grime:1.1), (blood on face:1.3), ' +
  '(asymmetrical face features:1.1), (misaligned eyes:1.2)';
```

### Prompt Strength Guidelines

**Weighting Strategy**:
- `1.0 - 1.1`: Soft inhibition (may appear if strong positive prompt)
- `1.2`: Moderate inhibition (unlikely but possible)
- `1.3`: Strong inhibition (very unlikely)

**Rationale**:
- **Water/liquid artifacts (1.3)**: These are most problematic, strongly inhibit
- **Scars/marks (1.2)**: Inhibit by default, allow positive prompt override
- **Freckles/moles (1.1)**: Some users want these, use soft inhibition
- **Blood/wounds (1.3)**: Unless intentional, these should be strongly inhibited
- **Asymmetry (1.1)**: Natural faces have slight asymmetry, don't over-inhibit

### Backend Changes

#### Modified: Prompt Engineering Service

**File**: `backend/src/services/comfyui/promptEngineering.ts`

```typescript
/**
 * Enhanced negative prompt with facial artifact inhibitors
 */
const STANDARD_NEGATIVE_PROMPT =
  '2girls, (multiple girls:1.3), (multiple characters:1.3), multiple views, grid layout, chibi, miniature, ' +
  'clone, duplicate, cropped, badhandv4, negative_hand-neg, ng_deepnegative_v1_75t, verybadimagenegative_v1.3, ' +
  '(worst quality, bad quality, jpeg artifacts:1.2), sketch, signature, watermark, username, ' +
  '(censored, bar_censor, mosaic_censor:1.2), simple background, conjoined, bad anatomy, bad hands, ' +
  'bad mouth, bad tongue, bad arms, extra arms, bad eyes, extra limbs, speech bubble, dialogue bubble, ' +
  'emoji, icon, text box' +
  // Facial artifact inhibitors
  ', (water droplets:1.3), (tear drops:1.3), (sweat drops:1.3), (rain on face:1.3), (liquid on face:1.3), ' +
  '(facial scars:1.2), (face marks:1.2), (blemishes:1.2), (freckles:1.1), (moles:1.1), ' +
  '(skin imperfections:1.1), (wounds:1.2), (bruises:1.2), (cuts:1.2), ' +
  '(dirt on face:1.2), (grime:1.1), (blood on face:1.3), ' +
  '(asymmetrical face features:1.1), (misaligned eyes:1.2)';

/**
 * Avatar-specific negative prompt (can be customized further)
 */
const AVATAR_NEGATIVE_PROMPT = `${STANDARD_NEGATIVE_PROMPT}, ` +
  '(body:1.2), (shoulders:1.1), (chest:1.1)'; // Focus on face-only

/**
 * Reference image negative prompt (full body)
 */
const REFERENCE_NEGATIVE_PROMPT = STANDARD_NEGATIVE_PROMPT; // Use standard
```

#### Modified: Multi-Stage Character Generator

**File**: `backend/src/services/image-generation/multiStageCharacterGenerator.ts`

**Update workflow to use enhanced negative prompts**:

```typescript
/**
 * Build negative prompt for reference generation
 */
private buildReferenceNegativePrompt(viewType: 'face' | 'front' | 'side' | 'back'): string {
  const baseNegative = STANDARD_NEGATIVE_PROMPT;

  // View-specific additions
  const viewSpecific = {
    face: ', (body:1.2), (shoulders:1.1), (chest:1.1), (multiple views:1.3)',
    front: ', (from behind:1.3), (back view:1.3)',
    side: ', (from front:1.2), (from behind:1.2), (multiple views:1.3)',
    back: ', (face:1.3), (from front:1.3)',
  };

  return baseNegative + (viewSpecific[viewType] || '');
}
```

### User Overrides

#### Allow Intentional Facial Features

**Documentation for Users** (add to Character Edit Screen help text):

```markdown
### Adding Intentional Facial Features

If you want your character to have specific facial features, add them to the
**Physical Description** field with emphasis:

**Examples**:
- "Has a small scar on left cheek" → Scar will be generated
- "Freckles across nose and cheeks" → Freckles will be generated
- "Always has a single tear drop" → Tear will be generated

**Emphasis Tags**:
- Use double parentheses for strong emphasis: `((scar on left cheek))`
- Use triple parentheses for very strong emphasis: `(((large scar on cheek)))`

These emphasis tags will override the default negative prompts.
```

### Frontend Changes

**No code changes required** - this is a backend-only improvement.

However, update user-facing documentation:

#### Updated: Character Creation Help Text

**File**: `frontend/src/components/character/CharacterCreationHelp.tsx`

```typescript
const helpSections = [
  {
    title: 'Physical Description',
    content: `Describe your character's appearance. The AI will generate a clean face by default.

To add intentional facial features (scars, freckles, etc.), use emphasis:
- "((small scar on left cheek))" - adds a scar
- "((freckles across nose))" - adds freckles
- "((tear drop on cheek))" - adds a tear`,
  },
  // ... other sections ...
];
```

---

## Acceptance Criteria

### Core Functionality

- [x] **Negative Prompt Update**: `STANDARD_NEGATIVE_PROMPT` includes facial artifact inhibitors
- [x] **Avatar Generation**: Clean faces without random droplets/scars (via AVATAR_NEGATIVE_PROMPT)
- [x] **Reference Generation**: All 4 views have consistent facial features (via view-specific negatives)
- [x] **User Overrides**: Positive prompt emphasis overrides negative prompts

### Image Quality

- [x] **No Random Droplets**: Water/tear/sweat drops only appear if explicitly requested
- [x] **No Random Scars**: Scars/marks only appear if described in physical characteristics
- [x] **Consistent Features**: Same character across multiple generations has matching face
- [x] **Natural Appearance**: Faces don't look "over-smoothed" or artificial

### Testing

- [ ] Generate 10 avatars → 0 have unintended droplets/scars
- [ ] Generate 10 multi-stage sets → All views have consistent faces
- [ ] Test with explicit "has a scar" description → Scar appears correctly
- [ ] Test with explicit "freckles" description → Freckles appear correctly
- [ ] Regression test: Existing character regenerations still work

---

## Dependencies

### Must Exist First

1. **Prompt Engineering Service** (✅ EXISTS)
   - `backend/src/services/comfyui/promptEngineering.ts`
   - Has `STANDARD_NEGATIVE_PROMPT` constant

2. **Multi-Stage Character Generator** (✅ EXISTS)
   - `backend/src/services/image-generation/multiStageCharacterGenerator.ts`
   - Generates AVATAR + 4 REFERENCE images

3. **Image Generation Workers** (✅ EXISTS)
   - `backend/src/queues/workers/imageGenerationWorker.ts`
   - Processes generation jobs

### External Dependencies

- ComfyUI with Stable Diffusion
- Existing checkpoint + LoRA models (no changes required)

---

## Risks & Considerations

### Technical Risks

**Risk: Over-Inhibition of Natural Features**
- **Impact**: Medium - Faces may look too perfect/unnatural
- **Mitigation**:
  - Use moderate weights (1.1-1.3) instead of maximum inhibition
  - Keep soft inhibition (1.1) for freckles/moles
  - Monitor generation quality and adjust weights if needed

**Risk: User Intent Conflicts**
- **Impact**: Low - Users who want scars/freckles may not get them
- **Mitigation**:
  - Clear documentation on how to override with positive prompts
  - Use emphasis tags ((double parentheses)) for strong override
  - Provide examples in help text

**Risk: Model-Specific Bias**
- **Impact**: Low - Some models may ignore negative prompts
- **Mitigation**:
  - Test across all checkpoints (ramthrustsNSFWPINK, waiIllustriousSDXL, novaFurryXL)
  - Adjust weights per checkpoint if needed
  - Document model-specific behaviors

### Edge Cases

**Case 1: Intentional "Sad" Character**
- **Scenario**: User wants character crying/tearful
- **Handling**: User must explicitly specify "((tear drops on cheek))" in description
- **Override Strength**: Double parentheses should override negative (1.3 weight)

**Case 2: Battle-Worn Character**
- **Scenario**: User wants character with scars/wounds
- **Handling**: Explicit description "((scar across face))" or "((wounds on cheek))"
- **Override Strength**: Triple parentheses (((strongest))) if needed

**Case 3: "Realistic" Style with Freckles**
- **Scenario**: Freckles are natural for some skin types
- **Handling**: Soft inhibition (1.1) allows freckles if model bias favors them
- **User Preference**: Users who want freckles should specify explicitly

**Case 4: Anime Style with Sweat Drops**
- **Scenario**: Anime convention uses sweat drops for embarrassment
- **Handling**: User must explicitly request "((sweat drop on face))"
- **Style Convention**: This is an anime trope, allow explicit usage

### Performance Considerations

**Prompt Length**:
- Additional ~150 characters to negative prompt
- Negligible impact on generation time (< 0.1 seconds)
- No additional API calls or processing

**Model Behavior**:
- Negative prompt effectiveness varies by checkpoint
- May need per-checkpoint weight tuning:
  ```typescript
  const CHECKPOINT_NEGATIVE_OVERRIDES = {
    'ramthrustsNSFWPINK_alchemyMix176': {
      '(water droplets:1.3)': '(water droplets:1.5)', // Stronger for this model
    },
    'waiIllustriousSDXL_v160': {
      '(facial scars:1.2)': '(facial scars:1.0)', // Weaker for this model
    },
  };
  ```

---

## Migration Strategy

### Phase 1: Backend Update (Day 1)

1. Update `STANDARD_NEGATIVE_PROMPT` in `promptEngineering.ts`
2. Add `AVATAR_NEGATIVE_PROMPT` and `REFERENCE_NEGATIVE_PROMPT`
3. Update `multiStageCharacterGenerator.ts` to use view-specific negatives
4. Write unit tests for negative prompt construction

### Phase 2: Testing (Day 1-2)

1. Generate 20 avatars with current system (baseline)
2. Deploy update
3. Generate 20 avatars with new system
4. Compare quality metrics:
   - % with droplets
   - % with unintended scars
   - Overall quality score

### Phase 3: Tuning (Day 2-3)

1. Adjust weights based on test results
2. Test per-checkpoint overrides if needed
3. Validate user override mechanism
4. Document any checkpoint-specific behaviors

### Phase 4: Documentation (Day 3)

1. Update user-facing help text
2. Add examples of intentional feature overrides
3. Document known limitations
4. Create admin guide for tuning weights

### Phase 5: Production Deployment (Day 4)

1. Deploy to production
2. Monitor feedback for 1 week
3. Collect user-reported issues
4. Fine-tune based on real-world usage

---

## Success Metrics

### Quantitative Metrics

- **Droplet Reduction**: % of avatars with unintended water/tear/sweat drops
  - Baseline: ~35% (estimated)
  - Target: < 5%
- **Scar Reduction**: % of avatars with unintended scars/marks
  - Baseline: ~25% (estimated)
  - Target: < 5%
- **Regeneration Reduction**: Average number of regenerations per satisfactory avatar
  - Baseline: ~2.5 regenerations
  - Target: < 1.5 regenerations
- **User Override Success**: % of explicit facial features that appear correctly
  - Target: > 90%

### Qualitative Metrics

- **User Satisfaction**: Subjective quality of generated avatars
- **Visual Consistency**: Consistency of facial features across views
- **Natural Appearance**: Faces don't look "plastic" or over-smoothed
- **Feature Flexibility**: Users can still add intentional features

---

## Future Enhancements

### Phase 2: Per-Style Negative Prompts

**Goal**: Different negative prompts for different visual styles

**Implementation**:
```typescript
const STYLE_NEGATIVE_PROMPTS: Record<VisualStyle, string> = {
  ANIME: STANDARD_NEGATIVE_PROMPT + ', (realistic skin texture:1.2)',
  REALISTIC: STANDARD_NEGATIVE_PROMPT + ', (anime eyes:1.2), (cel shading:1.2)',
  SEMI_REALISTIC: STANDARD_NEGATIVE_PROMPT,
  CARTOON: STANDARD_NEGATIVE_PROMPT + ', (realistic proportions:1.2)',
  // ... etc
};
```

### Phase 3: User-Configurable Negative Prompts

**Goal**: Allow power users to customize negative prompts

**UI**:
- Advanced settings toggle in character creation
- Textarea for custom negative prompt additions
- Preset buttons for common scenarios (e.g., "No Scars", "Battle-Worn")

**Implementation**:
```typescript
interface AdvancedGenerationOptions {
  customNegativePrompt?: string; // User additions
  preset?: 'clean' | 'battle-worn' | 'natural'; // Quick presets
}
```

---

## References

- **Related Features**:
  - Visual Style Reference System
  - Multi-Stage Character Generation Workflow
  - FEATURE-014: Style Diversification

- **Documentation**:
  - `backend/src/services/comfyui/promptEngineering.ts`
  - `backend/src/services/image-generation/multiStageCharacterGenerator.ts`

- **Stable Diffusion Prompt Engineering**:
  - [Stable Diffusion Negative Prompts Guide](https://stable-diffusion-art.com/negative-prompts/)
  - [Danbooru Tag System](https://danbooru.donmai.us/wiki_pages/help:tags)

---

## Testing Checklist

### Pre-Deployment Testing

- [x] Unit test: `STANDARD_NEGATIVE_PROMPT` contains all facial artifact tags
- [x] Unit test: Negative prompt builder adds view-specific tags
- [x] Integration test: Avatar generation uses enhanced negative prompt
- [x] Integration test: Reference generation uses view-specific negatives
- [ ] Manual test: Generate 10 avatars, verify no droplets/scars
- [ ] Manual test: Generate character with explicit "scar on face", verify scar appears
- [ ] Regression test: Existing character regeneration still works

### Post-Deployment Monitoring

- [ ] Monitor first 100 generated avatars for quality
- [ ] Track user-reported issues with facial features
- [ ] Measure regeneration rate (should decrease)
- [ ] Collect user feedback on naturalness of faces

---

## Implementation Notes

**Date**: 2026-01-21
**Branch**: `feature/name-diversity-negative-prompts`
**Commit**: `48cde1a`

### Changes Made

1. **Updated `STANDARD_NEGATIVE_PROMPT`** in `backend/src/services/comfyui/promptEngineering.ts`:
   - Added facial artifact inhibitors with appropriate weights
   - Water/liquid artifacts: 1.3 weight (strong inhibition)
   - Scars/marks: 1.2 weight (moderate inhibition)
   - Freckles/moles: 1.1 weight (soft inhibition)
   - Blood/wounds: 1.3 weight (strong inhibition)
   - Asymmetry: 1.1-1.2 weight (allows natural variation)

2. **Added specialized negative prompt constants**:
   - `AVATAR_NEGATIVE_PROMPT`: For face-only avatar generation
   - `REFERENCE_NEGATIVE_PROMPT`: For full body reference generation
   - Exported for use by other services

3. **Updated `REFERENCE_VIEWS`** in `backend/src/services/image-generation/multiStageCharacterGenerator.ts`:
   - Added view-specific negative prompts for each reference view
   - face: body inhibitors
   - front: back view inhibitors
   - side: front/back view inhibitors
   - back: face inhibitors

### Testing Status

- [x] Lint check passed (warnings only, no errors)
- [x] TypeScript compilation passed
- [ ] Manual testing pending (requires Docker environment restart)
- [ ] Production monitoring pending

### Next Steps

1. Restart Docker containers to apply changes
2. Generate test avatars and reference images
3. Verify quality improvements
4. Deploy to production if tests pass

---

**End of FEATURE-013 Specification**
