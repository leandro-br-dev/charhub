# Translation & i18n Fixes - Feature Specification

**Status**: 🏗️ Active (Ready for Implementation)
**Version**: 1.0.0
**Date Created**: 2026-01-02
**Last Updated**: 2026-01-02
**Priority**: Medium-High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Correções críticas no sistema de internacionalização (i18n):
1. **Gender tags mostrando ENUM** ao invés de tradução (ex: "MALE" em vez de "Masculino")
2. **Toasts hardcodeados em inglês** ao invés de usar chaves de tradução

Ambos problemas afetam experiência de usuários não-anglófonos.

---

## Business Value

### Problemas Atuais

**1. Gender Tags Showing Raw ENUMs**:
- Página de profile de personagem mostra "MALE", "FEMALE", "NON_BINARY" ao invés de traduzir
- Usuários pt-BR veem texto em inglês (inconsistente com resto do site)
- Impacto: Experiência de usuário quebrada em páginas de personagem
- Afeta: 100% dos personagens com gender definido

**2. Hardcoded Toasts in English**:
- Toasts (notificações) aparecem em inglês mesmo para usuários pt-BR
- Exemplo reportado: Auto-complete button gera toast sem tradução
- Provável padrão: múltiplos toasts hardcodeados em todo o codebase
- Impacto: Experiência inconsistente, usuários não entendem feedback

**Impacto Geral**:
- 🌍 **i18n Broken**: Sistema de tradução não está completo
- 😕 **User Confusion**: Usuários não-anglófonos recebem mensagens incompreensíveis
- 📉 **Churn Risk**: Usuários podem abandonar se não entenderem feedback
- 🐛 **Technical Debt**: Código não segue padrões de i18n estabelecidos

---

## User Stories

### US-1: Gender Tags Traduzidos
**Como** usuário brasileiro
**Quero** ver gêneros traduzidos em português
**Para que** eu entenda as informações do personagem

**Acceptance Criteria**:
- [ ] Gender tag na página de profile mostra tradução correta:
  - "MALE" → "Masculino"
  - "FEMALE" → "Feminino"
  - "NON_BINARY" → "Não-binário"
  - "OTHER" → "Outro"
  - "UNKNOWN" → "Não especificado"
- [ ] Tradução funciona em todos os 11 idiomas suportados
- [ ] Enum é usado apenas internamente (API, database)
- [ ] Frontend SEMPRE mostra tradução

### US-2: Toasts Traduzidos
**Como** usuário
**Quero** receber notificações no meu idioma
**Para que** eu entenda o feedback do sistema

**Acceptance Criteria**:
- [ ] Todos os toasts usam chaves de tradução (não hardcoded text)
- [ ] Toasts aparecem no idioma do usuário
- [ ] Tradução consistente em toda a aplicação
- [ ] Auditoria completa: 0 toasts hardcodeados restantes
- [ ] Documentação: Guia de como criar toasts traduzidos

---

## Technical Implementation

### Part 1: Gender Tag Translation Fix (1-2 hours)

#### Problem Analysis

**Current Implementation** (❌ BROKEN):

**File**: `frontend/src/pages/(characters)/[id]/CharacterProfile.tsx` (ou similar)

```tsx
// ❌ WRONG: Displaying raw ENUM
<div className="gender-tag">
  {character.gender} {/* Shows "MALE", "FEMALE", etc. */}
</div>
```

**Root Cause**:
- Gender value vem do backend como ENUM string
- Frontend não está traduzindo o ENUM para label humano
- Missing translation mapping

#### Solution Strategy

**Option 1: Translation Function (RECOMMENDED)**

**File**: `frontend/src/lib/i18n/formatters.ts` (create if not exists)

```typescript
import { useTranslation } from 'react-i18next';
import { Gender } from '@/types/character';

export const GENDER_TRANSLATION_KEYS: Record<Gender, string> = {
  MALE: 'character.gender.male',
  FEMALE: 'character.gender.female',
  NON_BINARY: 'character.gender.nonBinary',
  OTHER: 'character.gender.other',
  UNKNOWN: 'character.gender.unknown'
};

export function useGenderLabel(gender: Gender | undefined): string {
  const { t } = useTranslation();

  if (!gender) {
    return t('character.gender.unknown');
  }

  const translationKey = GENDER_TRANSLATION_KEYS[gender];
  return t(translationKey);
}
```

**Translation Files**:

**File**: `frontend/public/locales/pt-BR/translation.json`

```json
{
  "character": {
    "gender": {
      "male": "Masculino",
      "female": "Feminino",
      "nonBinary": "Não-binário",
      "other": "Outro",
      "unknown": "Não especificado"
    }
  }
}
```

**File**: `frontend/public/locales/en-US/translation.json`

```json
{
  "character": {
    "gender": {
      "male": "Male",
      "female": "Female",
      "nonBinary": "Non-binary",
      "other": "Other",
      "unknown": "Not specified"
    }
  }
}
```

**Repeat for all 11 languages**:
- pt-BR, en-US, es-ES, fr-FR, de-DE, it-IT, ja-JP, ko-KR, zh-CN, zh-TW, ru-RU

#### Updated Component

**File**: `frontend/src/pages/(characters)/[id]/CharacterProfile.tsx`

```tsx
import { useGenderLabel } from '@/lib/i18n/formatters';

export function CharacterProfile({ character }: CharacterProfileProps) {
  const genderLabel = useGenderLabel(character.gender);

  return (
    <div className="character-info">
      {/* Other fields... */}

      <div className="info-row">
        <span className="label">Gênero:</span>
        <span className="value">{genderLabel}</span> {/* ✅ Translated */}
      </div>
    </div>
  );
}
```

**Option 2: Inline Translation (Quick Fix)**

```tsx
import { useTranslation } from 'react-i18next';

export function CharacterProfile({ character }: CharacterProfileProps) {
  const { t } = useTranslation();

  const genderLabel = character.gender
    ? t(`character.gender.${character.gender.toLowerCase()}`)
    : t('character.gender.unknown');

  return (
    <div className="info-row">
      <span className="label">{t('character.fields.gender')}:</span>
      <span className="value">{genderLabel}</span>
    </div>
  );
}
```

#### Files to Update

**Search for all gender display locations**:

```bash
# Find all files displaying character.gender
grep -r "character\.gender" frontend/src --include="*.tsx" --include="*.ts"

# Common locations:
# - CharacterProfile.tsx (main page)
# - CharacterCard.tsx (grid/list view)
# - CharacterEditForm.tsx (edit page - dropdown labels)
# - CharacterDetailsModal.tsx (modal views)
```

**For Each File**:
1. Import `useGenderLabel` hook
2. Replace `character.gender` with `genderLabel`
3. Test visually in all languages

---

### Part 2: Toast Translation Audit & Fix (3-5 hours)

#### Problem Analysis

**Current Implementation** (❌ BROKEN):

```tsx
// ❌ WRONG: Hardcoded English text
toast.success("Character created successfully!");
toast.error("Failed to save changes");
toast.info("Auto-complete finished");
```

**Root Cause**:
- Developers hardcoding strings instead of using translation keys
- No lint rule to prevent hardcoded toasts
- No documentation/pattern for translated toasts

#### Solution Strategy

**Step 1: Create Toast Helper** (30 min)

**File**: `frontend/src/lib/toast.ts` (create if not exists)

```typescript
import { toast as baseToast, ToastOptions } from 'sonner'; // or react-hot-toast
import i18n from '@/lib/i18n';

/**
 * Translated toast wrapper
 * ALWAYS use this instead of toast.* directly
 *
 * @example
 * toast.success('character.created');
 * toast.error('character.saveFailed', { name: 'Alice' });
 */
export const toast = {
  success(translationKey: string, variables?: Record<string, any>, options?: ToastOptions) {
    const message = i18n.t(translationKey, variables);
    baseToast.success(message, options);
  },

  error(translationKey: string, variables?: Record<string, any>, options?: ToastOptions) {
    const message = i18n.t(translationKey, variables);
    baseToast.error(message, options);
  },

  info(translationKey: string, variables?: Record<string, any>, options?: ToastOptions) {
    const message = i18n.t(translationKey, variables);
    baseToast.info(message, options);
  },

  warning(translationKey: string, variables?: Record<string, any>, options?: ToastOptions) {
    const message = i18n.t(translationKey, variables);
    baseToast.warning(message, options);
  },

  loading(translationKey: string, variables?: Record<string, any>, options?: ToastOptions) {
    const message = i18n.t(translationKey, variables);
    return baseToast.loading(message, options);
  },

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) {
    return baseToast.promise(promise, {
      loading: i18n.t(messages.loading),
      success: i18n.t(messages.success),
      error: i18n.t(messages.error)
    });
  }
};
```

**Step 2: Audit All Toasts** (1 hour)

```bash
# Find all toast calls in codebase
grep -r "toast\." frontend/src --include="*.tsx" --include="*.ts" -n

# Common patterns to search:
# - toast.success("...")
# - toast.error("...")
# - toast.info("...")
# - toast.warning("...")
# - toast.loading("...")
# - toast.promise(...)

# Output to file for tracking
grep -r "toast\." frontend/src --include="*.tsx" --include="*.ts" -n > toast-audit.txt
```

**Step 3: Create Translation Keys** (1-2 hours)

**File**: `frontend/public/locales/pt-BR/translation.json`

```json
{
  "toasts": {
    "character": {
      "created": "Personagem criado com sucesso!",
      "updated": "Personagem atualizado!",
      "deleted": "Personagem excluído",
      "saveFailed": "Falha ao salvar alterações",
      "deleteFailed": "Falha ao excluir personagem",
      "imageUploadFailed": "Falha ao enviar imagem",
      "autoCompleteSuccess": "Auto-complete concluído!",
      "autoCompleteFailed": "Falha no auto-complete"
    },
    "story": {
      "created": "História criada com sucesso!",
      "updated": "História atualizada!",
      "deleted": "História excluída",
      "saveFailed": "Falha ao salvar história"
    },
    "auth": {
      "loginSuccess": "Login realizado!",
      "loginFailed": "Falha ao fazer login",
      "logoutSuccess": "Logout realizado",
      "signupSuccess": "Conta criada! Bem-vindo ao CharHub!"
    },
    "credits": {
      "purchaseSuccess": "Créditos comprados com sucesso!",
      "purchaseFailed": "Falha ao comprar créditos",
      "insufficientCredits": "Créditos insuficientes"
    },
    "image": {
      "generationStarted": "Gerando imagem...",
      "generationSuccess": "Imagem gerada!",
      "generationFailed": "Falha ao gerar imagem",
      "uploadSuccess": "Imagem enviada!",
      "uploadFailed": "Falha ao enviar imagem"
    },
    "generic": {
      "success": "Operação concluída!",
      "error": "Ocorreu um erro",
      "loading": "Carregando...",
      "copied": "Copiado para área de transferência",
      "invalidInput": "Entrada inválida"
    }
  }
}
```

**Repeat for en-US**:

```json
{
  "toasts": {
    "character": {
      "created": "Character created successfully!",
      "updated": "Character updated!",
      "deleted": "Character deleted",
      "saveFailed": "Failed to save changes",
      "deleteFailed": "Failed to delete character",
      "imageUploadFailed": "Failed to upload image",
      "autoCompleteSuccess": "Auto-complete finished!",
      "autoCompleteFailed": "Auto-complete failed"
    },
    "story": {
      "created": "Story created successfully!",
      "updated": "Story updated!",
      "deleted": "Story deleted",
      "saveFailed": "Failed to save story"
    },
    // ... rest of translations
  }
}
```

**Step 4: Replace All Hardcoded Toasts** (2-3 hours)

**Example Replacements**:

**Before** (❌):
```tsx
// CharacterForm.tsx
async function handleSave() {
  try {
    await saveCharacter(data);
    toast.success("Character saved successfully!");
  } catch (error) {
    toast.error("Failed to save character");
  }
}

// Auto-complete button
async function handleAutoComplete() {
  try {
    await autoComplete();
    toast.info("Auto-complete finished"); // ❌ Reported bug!
  } catch (error) {
    toast.error("Auto-complete failed");
  }
}
```

**After** (✅):
```tsx
import { toast } from '@/lib/toast'; // Our wrapper

// CharacterForm.tsx
async function handleSave() {
  try {
    await saveCharacter(data);
    toast.success('toasts.character.updated');
  } catch (error) {
    toast.error('toasts.character.saveFailed');
  }
}

// Auto-complete button
async function handleAutoComplete() {
  try {
    await autoComplete();
    toast.info('toasts.character.autoCompleteSuccess'); // ✅ Fixed!
  } catch (error) {
    toast.error('toasts.character.autoCompleteFailed');
  }
}
```

**With Variables**:

```tsx
// Before
toast.success(`Character "${character.name}" created!`);

// After
toast.success('toasts.character.createdWithName', { name: character.name });

// Translation:
// "createdWithName": "Personagem \"{{name}}\" criado!"
```

#### Step 5: Add ESLint Rule (Optional but Recommended)

**File**: `frontend/.eslintrc.js`

```js
module.exports = {
  rules: {
    // Prevent hardcoded strings in toast calls
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="toast"] > Literal',
        message: 'Use translation keys instead of hardcoded strings in toasts. Import from @/lib/toast and use i18n keys.'
      }
    ]
  }
};
```

---

## Testing Strategy

### Part 1: Gender Tags
**Manual Testing**:
- [ ] Create test characters with each gender (MALE, FEMALE, NON_BINARY, OTHER, UNKNOWN)
- [ ] View profile page in pt-BR → see Portuguese labels
- [ ] View profile page in en-US → see English labels
- [ ] Test all 11 languages
- [ ] Verify CharacterCard grid view also translated
- [ ] Verify edit form dropdown shows translated options

**Regression**:
- [ ] Backend still receives ENUM values (not translated strings)
- [ ] API unchanged
- [ ] Database unchanged

### Part 2: Toasts
**Manual Testing**:
- [ ] Test each toast scenario in pt-BR and en-US:
  - Create character
  - Update character
  - Delete character
  - Save failed
  - Auto-complete
  - Image upload
  - Credit purchase
- [ ] All toasts show correct language
- [ ] Variables interpolation works (e.g., "Character 'Alice' created")
- [ ] Toast timing and styling unchanged

**Audit Verification**:
```bash
# After fix, verify 0 hardcoded strings in toast calls
grep -r "toast\.\w\+(\"" frontend/src --include="*.tsx"

# Should return 0 results
```

---

## Rollout Strategy

### Development (4-7 hours)

**Part 1: Gender Tags** (1-2 hours):
1. Create `formatters.ts` with `useGenderLabel` hook (30 min)
2. Add translation keys to all 11 languages (45 min)
3. Update CharacterProfile.tsx (15 min)
4. Find and update other locations (30 min)
5. Manual testing in 2-3 languages (15 min)

**Part 2: Toasts** (3-5 hours):
1. Create toast wrapper in `lib/toast.ts` (30 min)
2. Audit all toast calls (grep search) (1 hour)
3. Create translation keys for all toasts (1-2 hours)
4. Replace all hardcoded toasts (2-3 hours)
5. Manual testing (30 min)
6. Add ESLint rule (optional, 15 min)

### Testing (1 hour)
- Manual testing in pt-BR and en-US
- Regression testing (ensure no breakage)
- Audit verification (grep for remaining hardcoded toasts)

### Code Review & Deploy (30 min)

**Total: 5.5-8.5 hours**

---

## Success Metrics

### Gender Tags
- [ ] 100% of gender displays show translated labels
- [ ] 0 raw ENUMs visible to users
- [ ] All 11 languages working correctly

### Toasts
- [ ] 0 hardcoded toast strings remaining
- [ ] 100% of toasts use translation keys
- [ ] ESLint rule prevents future regressions
- [ ] All 11 languages working correctly

---

## Risks & Mitigation

### Risk 1: Missing Translation Keys
**Probability**: Medium
**Impact**: Low

**Mitigation**:
- i18n library should fallback to key name if translation missing
- Systematically add keys for all 11 languages
- Test in at least 3 languages before deploy

### Risk 2: Developer Not Using New Toast Wrapper
**Probability**: Medium
**Impact**: Low

**Mitigation**:
- Add ESLint rule to prevent direct toast usage
- Document in CONTRIBUTING.md
- Code review checks

### Risk 3: Breaking Existing Toast Functionality
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Wrapper is thin layer over existing toast library
- Extensive manual testing
- Regression testing

---

## Dependencies

### Frontend
- i18next (translation library)
- react-i18next (React integration)
- Toast library (sonner, react-hot-toast, or similar)
- All 11 language files

### Translation Files Location
```
frontend/public/locales/
├── pt-BR/translation.json
├── en-US/translation.json
├── es-ES/translation.json
├── fr-FR/translation.json
├── de-DE/translation.json
├── it-IT/translation.json
├── ja-JP/translation.json
├── ko-KR/translation.json
├── zh-CN/translation.json
├── zh-TW/translation.json
└── ru-RU/translation.json
```

---

## Notes for Agent Coder

### Implementation Priority
**MEDIUM-HIGH** - Affects non-English users significantly

### Estimated Effort
- **Optimistic**: 5 hours
- **Realistic**: 6-7 hours
- **Pessimistic**: 9 hours

**Recommendation**: Allocate 7 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/translation-i18n-fixes

# 2. Part 1: Gender Tags
# Create lib/i18n/formatters.ts
# Add translation keys to all locales
# Update CharacterProfile.tsx
# Find other gender displays: grep -r "character\.gender" frontend/src
# Update all files

# 3. Part 2: Toasts
# Create lib/toast.ts wrapper
# Audit toasts: grep -r "toast\." frontend/src > toast-audit.txt
# Add toast translation keys to all locales
# Replace hardcoded toasts one by one
# Verify: grep -r "toast\.\w\+(\"" frontend/src (should be 0 results)

# 4. Test
npm run dev
# Test in pt-BR and en-US
# Test all toast scenarios
# Verify gender tags in character profiles

# 5. Create PR
```

### Key Considerations

1. **All 11 Languages**: Ensure all translation keys exist in all language files
2. **Consistency**: Use same translation key structure (toasts.*, character.gender.*)
3. **Testing**: Test in at least pt-BR and en-US before PR
4. **Documentation**: Update CONTRIBUTING.md with toast usage guide
5. **ESLint Rule**: Add rule to prevent future hardcoded toasts

### Common Toast Locations to Check

```
frontend/src/
├── pages/
│   ├── (characters)/
│   │   ├── new/CharacterForm.tsx (create, save, auto-complete)
│   │   ├── [id]/edit/CharacterEditForm.tsx (update, delete)
│   │   └── [id]/CharacterProfile.tsx (copy, share)
│   ├── (stories)/
│   │   ├── new/StoryForm.tsx (create, save)
│   │   └── [id]/edit/StoryEditForm.tsx (update, delete)
│   ├── (auth)/
│   │   ├── login/LoginForm.tsx (login)
│   │   └── signup/SignupForm.tsx (signup)
│   └── (settings)/
│       ├── profile/ProfileSettings.tsx (update)
│       └── credits/CreditsPurchase.tsx (purchase)
├── components/
│   ├── ImageUpload.tsx (upload success/fail)
│   └── CopyButton.tsx (copy success)
└── services/
    └── *.ts (API error toasts)
```

### Questions to Clarify

- Toast library: sonner, react-hot-toast, or other?
- Should we support toast with JSX content (not just strings)?
- Fallback strategy if translation key missing?
- Should we add analytics to track toast displays?

---

**End of Specification**

🌍 Ready for implementation - Focus on complete i18n coverage and toast audit!
