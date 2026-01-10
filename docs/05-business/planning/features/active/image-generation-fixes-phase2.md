# Image Generation Fixes - Phase 2

**Status**: Active
**Priority**: High
**Branch**: `feature/character-image-generation-fixes`
**Created**: 2025-01-08
**Updated**: 2025-01-08

## Overview

This document outlines remaining fixes for character image generation features. Many of these were previously fixed but lost due to merge conflicts. This phase focuses on improving UX flow after image generation completion and fixing remaining issues.

## Completed in Phase 1

The following items were already implemented in the current branch:

- ✅ AvatarGenerationModal prompt is now optional
- ✅ Species field mapper fixed to extract name instead of UUID
- ✅ ReferenceGenerationModal layout fixed (no scroll issues)
- ✅ Cost calculation is now conditional based on selected view count
- ✅ Progress tracking stage indexing fixed (off-by-one correction)
- ✅ Image display during generation filters by timestamp
- ✅ Multi-stage modal has auto-close countdown (3 seconds)
- ✅ FaceDetailer added to cover workflows (cover.workflow.json, cover-with-references.workflow.json, cover-with-ipadapter.workflow.json)
- ✅ CharacterAvatarUploader updated to use modal system

## Remaining Issues

### 1. Avatar/Cover Post-Generation UX Enhancement

**Status**: ❌ NOT IMPLEMENTED
**Priority**: HIGH
**Files**: `AvatarGenerationModal.tsx`, `CoverGenerationModal.tsx`

**Problem**:
After image generation completes, the modal shows the preview but only has "Cancel" button. Users need:
1. A loading state during generation
2. After completion: show the generated image with 3 buttons
3. "Back" - return to form to regenerate with different settings
4. "Generate Again" - regenerate with same settings
5. "Close" - close modal and refresh images

**Current Behavior**:
```tsx
// AvatarGenerationModal.tsx & CoverGenerationModal.tsx
// Shows preview but only has "Cancel" button
{generatedImageUrl && (
  <div>
    <img src={generatedImageUrl} />
  </div>
)}
// Footer only has Cancel and Generate buttons
```

**Required Changes**:
1. Add state to track "completed" state separate from "generating"
2. Show different footer based on state:
   - Form state: Cancel + Generate buttons
   - Generating state: Only loading indicator
   - Completed state: Back + Regenerate + Close buttons
3. Add "handleRegenerate" function that keeps current settings
4. Add "handleBack" function that returns to form without closing
5. Ensure `onComplete()` is called to refresh parent component images

**UX Flow**:
```
[Form State]
  ├─ Prompt input (optional)
  ├─ Sample image upload (optional)
  └─ [Cancel] [Generate]
       ↓ Click Generate
[Generating State]
  ├─ Loading spinner
  ├─ Progress message
  └─ (No buttons - user must wait)
       ↓ Generation Complete
[Completed State]
  ├─ Generated image preview
  ├─ [Back to Form] [Regenerate] [Close]
       │
       ├─ Back → Form State
       ├─ Regenerate → Generating State (with same settings)
       └─ Close → Close modal + trigger onComplete()
```

---

### 2. Image Refresh After Generation

**Status**: ⚠️ PARTIALLY IMPLEMENTED
**Priority**: MEDIUM
**Files**: `AvatarGenerationModal.tsx`, `CoverGenerationModal.tsx`, `CharacterAvatarUploader.tsx`

**Problem**:
The `onComplete()` callback is called, but parent components may not be refreshing the image display properly.

**Current Implementation**:
```tsx
// AvatarGenerationModal.tsx:92
if (onComplete) {
  onComplete();
}
```

**Required Verification**:
1. Check `CharacterAvatarUploader.tsx` handleAvatarComplete implementation
2. Ensure it properly refreshes the avatar display
3. Verify image cache is invalidated

**Expected Behavior**:
When generation completes, the parent component should:
1. Receive the onComplete callback
2. Refetch the character data
3. Update the displayed avatar with the new image

---

### 3. Avatar Generation in Automated Character Creation Flow

**Status**: ❌ NEEDS INVESTIGATION
**Priority**: HIGH
**Backend**: Character creation service

**Problem**:
Avatars stopped being generated in the automated character creation flow.

**Investigation Required**:
1. Check backend logs for avatar generation during character creation
2. Verify the character creation endpoint triggers avatar generation
3. Check if job queue is processing avatar jobs correctly
4. Review any recent changes to character creation flow

**Files to Check**:
- Backend: `src/services/characterService.ts`
- Backend: `src/services/imageGenerationService.ts`
- Backend: Job queue configuration

---

### 4. ReferenceGenerationModal Redundant "Start Generation" Button

**Status**: ❌ NOT IMPLEMENTED
**Priority**: MEDIUM
**Files**: `ReferenceGenerationModal.tsx`, `MultiStageProgress.tsx`

**Problem**:
When "Generate Dataset" is clicked in ReferenceGenerationModal, it shows MultiStageProgress component which has another "Start" button. This is redundant and confusing.

**Current Flow**:
```
ReferenceGenerationModal
  ├─ Form: prompt, sample image, view selection
  ├─ Cost display
  └─ [Cancel] [Generate Dataset] ← User clicks here
       ↓
       Shows MultiStageProgress
       └─ [Start Generation] ← WHY? User already clicked generate!
```

**Required Changes**:
1. Remove the "Start" button from MultiStageProgress when used in modal context
2. Auto-start generation when MultiStageProgress is shown
3. Add prop to MultiStageProgress: `autoStart?: boolean`
4. When `autoStart=true`, call `startGeneration()` on mount

**Or Alternative**:
Keep MultiStageProgress as-is but change the flow:
- ReferenceGenerationModal starts generation immediately
- Shows MultiStageProgress in "already started" state
- No redundant button

---

### 5. Modal Gets Stuck/Trapped

**Status**: ❌ BUG
**Priority**: HIGH
**Files**: `ReferenceGenerationModal.tsx`

**Problem**:
Modal cannot be closed during generation. User is forced to stay on screen until generation completes.

**Current Code**:
```tsx
// ReferenceGenerationModal.tsx
const handleClose = () => {
  if (!isGenerating && !isUploading && !jobStarted) {
    // Only allows closing if no job is running
    onClose();
  }
};
```

**Required Changes**:
1. Add warning when user tries to close during generation
2. Allow user to close modal even if generation is running
3. Show toast: "Generation is continuing in background. You can check progress in the Images tab."
4. Close modal but keep job running in background
5. Add progress indicator to Images tab to show background jobs

---

### 6. Multi-Stage Progress Stage Display Off-By-One

**Status**: ⚠️ PARTIALLY FIXED IN PHASE 1
**Priority**: MEDIUM
**Files**: `MultiStageProgress.tsx`

**Note**: Phase 1 addressed this with stage filtering and progress tracking, but user reports it may still have issues. Needs verification.

**Original Problem**:
When generating 4 images, progress indicator shows:
- Image 1 generating → shows "generating stage 1" ✅
- Image 1 complete, Image 2 generating → still shows "generating stage 1" ❌ (should show stage 2)
- Image 2 complete, Image 3 generating → shows "generating stage 2" ❌ (should show stage 3)
- Image 3 complete, Image 4 generating → shows "generating stage 3" ❌ (should show stage 4)
- All complete → Never shows stage 4 as completed ❌

**Fix Applied in Phase 1**:
```tsx
// MultiStageProgress.tsx lines 198-205
setStages(prev => prev.map((stage, idx) => {
  if (idx < progress.stage - 1) {
    return { ...stage, status: 'completed' as const };
  } else if (idx === progress.stage - 1) {
    return { ...stage, status: 'in_progress' as const };
  }
  return stage;
}));
```

**Verification Needed**:
- Test with actual generation to confirm fix works
- Check if backend `progress.stage` is 1-indexed correctly
- Verify final stage (4) shows as completed

---

### 7. Old Images Displayed During Generation

**Status**: ⚠️ PARTIALLY FIXED IN PHASE 1
**Priority**: MEDIUM
**Files**: `MultiStageProgress.tsx`

**Note**: Phase 1 added timestamp filtering, but user reports it still shows old images.

**Problem**:
When generating new images, the polling shows all existing images including old ones, not just the newly generated images.

**Current Fix (Phase 1)**:
```tsx
// MultiStageProgress.tsx lines 213-217
const recentImages = generationStartTime
  ? referenceImages.filter((img: any) => {
      const imgTime = new Date(img.createdAt).getTime();
      return imgTime >= generationStartTime;
    })
  : referenceImages;
```

**Image Naming Pattern**:
New images should have timestamp in filename:
```
https://media.charhub.app/characters/{id}/references/front_1767861886256.webp
```

**Verification Needed**:
1. Confirm backend is setting `createdAt` correctly on new images
2. Verify timestamp filtering logic is working
3. Check if `img.createdAt` is present and valid
4. May need to also filter by filename pattern as fallback

---

### 8. 403 Forbidden Error (Issue #108)

**Status**: ❌ OUT OF SCOPE
**Priority**: HIGH (but separate issue)
**Related Issue**: #108 in leandro-br-dev/charhub

**Problem**:
When trying to generate avatar for official bot characters (CharHub Official bot), API returns 403 Forbidden.

**Error**:
```
POST http://localhost:8403/api/v1/image-generation/avatar 403 (Forbidden)
```

**Root Cause**:
Official bot characters require ADMIN permissions to modify. This is a permission system issue, not an image generation issue.

**Resolution**:
Handle this separately in issue #108. Add better error message in avatar generation to inform users.

---

## New Feature Requirements

### 9. FaceDetailer for Multi-Ref Workflows (Avatar Only)

**Status**: ✅ ALREADY IMPLEMENTED
**Files**: `multi-ref-front.workflow.json`, `multi-ref-side.workflow.json`, `multi-ref-back.workflow.json`

**Note**: The multi-reference workflows already have FaceDetailer nodes implemented. This was verified in Phase 1.

---

## Implementation Priority Order

### Phase 2.1 - Critical UX Issues (Do First)
1. **#1**: Avatar/Cover Post-Generation UX Enhancement
2. **#5**: Modal Gets Stuck - Allow closing during generation

### Phase 2.2 - Functional Fixes
3. **#4**: Remove redundant "Start Generation" button
4. **#3**: Investigate avatar generation in automated flow
5. **#2**: Verify image refresh after generation

### Phase 2.3 - Verification & Polish
6. **#6**: Verify multi-stage progress display
7. **#7**: Verify old images not showing during generation

---

## Testing Checklist

After implementing changes, verify:

### Avatar Generation
- [ ] Modal shows loading state during generation
- [ ] After completion, shows image with 3 buttons
- [ ] "Back" returns to form keeping settings
- [ ] "Regenerate" starts new generation with same settings
- [ ] "Close" closes modal and refreshes parent
- [ ] Avatar display in parent updates after generation

### Cover Generation
- [ ] Same as Avatar Generation above

### Reference Generation
- [ ] Modal can be closed during generation
- [ ] Shows warning when closing with active job
- [ ] Job continues in background
- [ ] No redundant "Start" button
- [ ] Cost shows correctly based on selected views
- [ ] Progress shows correct stage being generated
- [ ] Only new images shown during generation

### Issue #108 (403 Error)
- [ ] Better error message shown for official characters
- [ ] User informed about permission requirement
- [ ] Link to issue #108 provided

---

## Related Files

### Frontend
- `frontend/src/pages/(characters)/shared/components/AvatarGenerationModal.tsx`
- `frontend/src/pages/(characters)/shared/components/CoverGenerationModal.tsx`
- `frontend/src/pages/(characters)/shared/components/CharacterAvatarUploader.tsx`
- `frontend/src/pages/(characters)/shared/components/ReferenceGenerationModal.tsx`
- `frontend/src/pages/(characters)/shared/components/ImageGalleryModal.tsx` (for background job progress)
- `frontend/src/components/features/image-generation/MultiStageProgress.tsx`
- `frontend/src/components/features/image-generation/ImageViewModal.tsx`

### Backend
- `backend/src/services/characterService.ts`
- `backend/src/services/imageGenerationService.ts`
- `backend/src/services/comfyui/workflows/*.workflow.json`

---

## Notes

- Many of these fixes were previously implemented but lost in merge conflicts
- Check git history for previous implementations if needed
- All workflows already have FaceDetailer for body images (front, side, back)
- Avatar workflows do NOT have FaceDetailer (by design - face-only)
- Image timestamp pattern: `{type}_{timestamp}.webp` (e.g., `front_1767861886256.webp`)
