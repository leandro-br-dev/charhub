# FEATURE-017: Fix Skipped Tests from PR #148

**Status**: Backlog
**Priority**: Medium
**Assigned To**: TBD
**Created**: 2026-01-25
**Last Updated**: 2026-01-25
**Epic**: Technical Debt - Test Suite

**GitHub Issue**: #149
**Related PRs**: #148 (FEATURE-012/013/014)

---

## Problem Statement

During implementation of FEATURES 012, 013, and 014 (Name Diversity, Negative Prompts, Style + Theme System), 11 tests were skipped using `test.skip()`. These tests were dependent on mocks of the old `detectContentType()` function, which was replaced by the new Style + Theme system.

### Current Pain Points

- **Pass rate stuck at 97.8%** - 11 tests skipped, blocking 100% coverage
- **Technical debt** - skipped tests accumulate and are often forgotten
- **CI/CD noise** - skipped tests appear in test output, reducing clarity
- **Uncertain test validity** - unclear if tests are still applicable post-refactor

### Test Results (Current)

```
Test Suites: 31 passed, 1 failed (WASM environment issue)
Tests:       749 passed, 5 failed (WASM), 11 skipped
Pass Rate:   97.8%
```

### Root Cause

The **Style + Theme diversification system** (FEATURE-014) replaced the content type detection logic:

```
OLD: detectContentType() → returns "FURRY", "HENTAI", etc.
NEW: style + theme → VisualStyle.ANIME + Theme.FANTASY
```

Tests that mocked `detectContentType()` now fail because the function signature and behavior changed.

---

## User Stories

### US-1: Update Mocks for Style + Theme
**As a** developer maintaining the test suite,
**I want** test mocks to reflect the new Style + Theme system,
**So that** existing tests pass without being rewritten.

**Acceptance Criteria**:
- [ ] Mocks updated for `dataCompletenessCorrectionService.test.ts`
- [ ] Mocks updated for `avatarCorrectionService.test.ts`
- [ ] Mocks use new Style + Theme return types
- [ ] All 11 tests enabled with `test()` instead of `test.skip()`

### US-2: Remove Obsolete Tests
**As a** developer maintaining the test suite,
**I want** tests that are no longer applicable removed,
**So that** the test suite only contains valid assertions.

**Acceptance Criteria**:
- [ ] Obsolete tests identified and documented
- [ ] Non-applicable tests removed with explanation
- [ ] Test count reflects only valid tests

### US-3: Achieve 100% Pass Rate
**As a** developer running the test suite,
**I want** all tests to pass without skips,
**So that** CI/CD shows clean results.

**Acceptance Criteria**:
- [ ] Zero skipped tests in output
- [ ] Pass rate: 100% (excluding WASM environment issues)
- [ ] All correction service tests pass

---

## Technical Approach

### Files Affected

| File | Skipped Tests | Issue |
|------|---------------|-------|
| `dataCompletenessCorrectionService.test.ts` | 5 tests | Mocks of old content type detection |
| `avatarCorrectionService.test.ts` | 6 tests | Mocks of old content type detection |

### Test Details

#### dataCompletenessCorrectionService.test.ts (5 tests)

1. `should handle individual character errors gracefully`
2. `should calculate duration in seconds`
3. `should handle character with partial data`
4. `should handle character with all NULL fields except firstName`
5. `should update last correction timestamp`

#### avatarCorrectionService.test.ts (6 tests)

1. `should detect FURRY content type`
2. `should handle visual style application errors gracefully`
3. `should handle character with no tags`
4. `should detect FURRY from species name`
5. `should detect FURRY from physical characteristics`
6. `should detect HENTAI from content tags`

### Mock Updates Required

**Before (OLD):**

```typescript
// Mock for detectContentType function
jest.mock('../services/contentTypeDetectionService', () => ({
  detectContentType: jest.fn(),
}));

import { detectContentType } from '../services/contentTypeDetectionService';

(detectContentType as jest.Mock).mockReturnValue('FURRY');
```

**After (NEW - Style + Theme):**

```typescript
// Mock for style + theme detection
jest.mock('../services/styleThemeService', () => ({
  styleThemeService: {
    getCombination: jest.fn(),
    getAvailableThemes: jest.fn(),
  },
}));

import { styleThemeService } from '../services/styleThemeService';

(styleThemeService.getCombination as jest.Mock).mockResolvedValue({
  style: VisualStyle.ANIME,
  theme: Theme.FURRY,
  checkpoint: { /* ... */ },
  lora: { /* ... */ },
});
```

### Implementation Steps

#### Step 1: Analyze Existing Tests

Read each skipped test to determine:

1. **Is the test still valid?**
   - Yes: Update mocks and enable
   - No: Remove with comment explaining why

2. **What behavior is being tested?**
   - Error handling → keep, update mocks
   - Content type detection → replace with style + theme assertions
   - Edge cases → likely still valid

#### Step 2: Update Mocks

Create a shared mock file for Style + Theme:

**File**: `backend/src/services/__mocks__/styleThemeService.mock.ts`

```typescript
import { VisualStyle, Theme } from '../../generated/prisma';
import { StyleThemeCombination } from '../styleThemeService';

export const mockStyleThemeCombination: StyleThemeCombination = {
  style: VisualStyle.ANIME,
  theme: Theme.FANTASY,
  checkpoint: {
    id: 'mock-checkpoint-id',
    name: 'Mock Checkpoint',
    filename: 'mock.safetensors',
    path: '/models/checkpoints/mock.safetensors',
  },
  lora: {
    id: 'mock-lora-id',
    name: 'Mock LoRA',
    filename: 'mock-lora.safetensors',
    filepathRelative: 'loras/mock.safetensors',
    strength: 1.0,
  },
};

export const mockFurryCombination: StyleThemeCombination = {
  ...mockStyleThemeCombination,
  theme: Theme.FURRY,
};

export const mockDarkFantasyCombination: StyleThemeCombination = {
  ...mockStyleThemeCombination,
  theme: Theme.DARK_FANTASY,
};
```

#### Step 3: Update Test Files

**File**: `backend/src/services/correction/__tests__/avatarCorrectionService.test.ts`

```typescript
// Remove skip and update for Style + Theme
describe('AvatarCorrectionService - Style + Theme', () => {
  beforeEach(() => {
    // Setup mock for style theme service
    (styleThemeService.getCombination as jest.Mock)
      .mockResolvedValue(mockFurryCombination);
  });

  // OLD: should detect FURRY content type
  // NEW: should detect FURRY theme from character
  it('should use FURRY theme for furry characters', async () => {
    const character = createMockCharacter({
      theme: Theme.FURRY,
      species: { name: 'Furry' },
    });

    const result = await service.generateAvatar(character);

    expect(result).toBeDefined();
    expect(styleThemeService.getCombination).toHaveBeenCalledWith(
      VisualStyle.ANIME,
      Theme.FURRY
    );
  });

  // Remove obsolete tests that checked for HENTAI detection
  // HENTAI is now handled by ageRating + contentTags, not content type
});
```

#### Step 4: Remove Obsolete Tests

Tests that are no longer applicable after Style + Theme refactor:

| Test | Reason | Action |
|------|--------|--------|
| `should detect HENTAI from content tags` | HENTAI detection replaced by ageRating + contentTags | **Remove** |
| `should return undefined for safe content` | No longer relevant - all content has style + theme | **Remove** |

---

## Acceptance Criteria

### Core Functionality

- [ ] All 11 tests addressed (updated or removed)
- [ ] Zero `test.skip()` in both test files
- [ ] Mocks use Style + Theme system
- [ ] Tests pass when run individually
- [ ] Tests pass when run in full suite

### Test Coverage

- [ ] Pass rate: 100% (excluding WASM issues)
- [ ] No skipped tests in output
- [ ] Test count reflects only valid tests

### Code Quality

- [ ] TypeScript compilation successful
- [ ] No linting errors
- [ ] Comments explain any removed tests

---

## Testing Requirements

### Before Changes

```bash
cd backend
npm test -- --listTests | grep -E "(dataCompleteness|avatarCorrection)"

# Verify current state: 11 tests skipped
npm test
# Expected: 749 passed, 5 failed (WASM), 11 skipped
```

### After Changes

```bash
cd backend

# Run specific test files
npm test -- dataCompletenessCorrectionService.test.ts
npm test -- avatarCorrectionService.test.ts

# Run full suite
npm test

# Expected: 760+ passed, 5 failed (WASM), 0 skipped
```

### Verification Checklist

- [ ] All 5 `dataCompletenessCorrectionService` tests pass
- [ ] All 6 `avatarCorrectionService` tests pass (or removed)
- [ ] No new test failures introduced
- [ ] Zero skipped tests in output

---

## Dependencies

### Internal

- FEATURE-014: Style + Theme diversification (completed, PR #148)
- Test files: `dataCompletenessCorrectionService.test.ts`, `avatarCorrectionService.test.ts`

### External

- Jest test framework
- TypeScript compiler

---

## Risks & Mitigations

### Risk 1: Tests Were Skipped for Valid Reason
**Impact**: Low
**Description**: Tests may have been skipped because behavior changed significantly
**Mitigation**:
- Review each test's original intent
- Document why tests are removed
- Update tests if behavior is still relevant

### Risk 2: Mock Updates Don't Match Real Behavior
**Impact**: Low
**Description**: Mocks may not accurately reflect Style + Theme service
**Mitigation**:
- Reference actual `styleThemeService` implementation
- Use shared mock constants
- Verify mocks match real return types

---

## Implementation Phases

### Phase 1: Analysis (30 min)
1. Read all 11 skipped tests
2. Identify which tests are still valid
3. Map old `detectContentType()` behavior to new Style + Theme

### Phase 2: Create Mocks (30 min)
1. Create `styleThemeService.mock.ts`
2. Define mock combinations (FANTASY, FURRY, DARK_FANTASY)
3. Update imports in test files

### Phase 3: Update Tests (1 hour)
1. Remove `test.skip()` from valid tests
2. Update assertions to use Style + Theme
3. Remove obsolete tests with comments

### Phase 4: Verification (30 min)
1. Run tests individually
2. Run full test suite
3. Verify pass rate is 100%

---

## Notes

- The 5 WASM failures are environment issues (Prisma WASM) and not related to this fix
- Focus on the 11 **skipped** tests, not the 5 **failed** WASM tests
- Reference PR #148 for Style + Theme implementation details

---

## References

- GitHub Issue: [#149](https://github.com/leandro-br-dev/charhub/issues/149)
- Related PR: [#148](https://github.com/leandro-br-dev/charhub/pull/148)
- Test files:
  - `backend/src/services/correction/__tests__/dataCompletenessCorrectionService.test.ts`
  - `backend/src/services/correction/__tests__/avatarCorrectionService.test.ts`
- Feature specs:
  - `docs/05-business/planning/features/active/FEATURE-014.md`

---

**End of FEATURE-017 Specification**
