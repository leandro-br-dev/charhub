# UI Improvements: Sidebar Characters Filter & Age Rating Component - Feature Specification

**Status**: ✅ Implemented
**Version**: 1.0.0
**Date Created**: 2025-12-28
**Last Updated**: 2026-01-03
**Priority**: Medium
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Duas melhorias de UI que podem ser implementadas juntas na mesma PR:

1. **Sidebar Characters Filter Fix**: Corrigir filtro do sidebar para mostrar apenas personagens próprios + favoritos (atualmente mostra todos os públicos)

2. **Age Rating Component Unification**: Criar componente único e reutilizável de age rating badge para substituir implementações paralelas no código

---

## Business Value

### Problema 1: Sidebar Characters Filter

**Problema Atual**:
- Sidebar aba "Personagens" mostra todos os personagens públicos
- Deveria mostrar apenas: personagens próprios do usuário + personagens favoritados
- Usuário precisa rolar lista enorme para achar seus personagens
- Não faz sentido mostrar personagens públicos aleatórios no sidebar pessoal

**Impacto**:
- 🎯 **UX**: Acesso rápido aos personagens relevantes para o usuário
- ⚡ **Performance**: Menos dados carregados (lista menor)
- 🧭 **Navigation**: Sidebar se torna ferramenta de navegação pessoal

### Problema 2: Age Rating Component

**Problema Atual**:
- Implementações duplicadas de age rating badge em múltiplos lugares:
  - `CharacterCard.tsx` (linhas 54-65, 174-182)
  - Páginas de descrição de personagem/história
  - Outras localizações
- Código duplicado dificulta manutenção
- Inconsistências visuais entre diferentes implementações
- Mudanças precisam ser replicadas em vários arquivos

**Impacto**:
- 🔧 **Maintainability**: Componente único = mudanças em um só lugar
- 🎨 **Consistency**: Aparência uniforme em todo o app
- 📦 **Reusability**: Fácil usar em novos lugares

---

## User Stories

### US-1: Sidebar Mostra Apenas Personagens Relevantes
**Como** usuário
**Quero** ver apenas meus personagens + favoritos no sidebar
**Para que** eu acesse rapidamente os personagens que me interessam

**Acceptance Criteria**:
- [ ] Sidebar lista apenas personagens próprios do usuário autenticado
- [ ] Sidebar lista personagens favoritados pelo usuário
- [ ] Ordenação: próprios primeiro, depois favoritos
- [ ] Favoritos indicados visualmente (ícone de estrela)
- [ ] Limite de 10-15 personagens (os mais recentes/relevantes)
- [ ] Performance: carregamento < 500ms

### US-2: Age Rating Badge Unificado
**Como** desenvolvedor
**Quero** um componente único de age rating badge
**Para que** eu use em qualquer lugar com aparência consistente

**Acceptance Criteria**:
- [ ] Componente exportado de `components/ui/AgeRatingBadge.tsx`
- [ ] Props: `ageRating`, `size` (sm/md/lg), `variant` (overlay/inline)
- [ ] Sistema de cores consistente (L=green, 16+=orange, 18+=black)
- [ ] Texto formatado (ex: "18+" ao invés de "EIGHTEEN")
- [ ] Usado em CharacterCard, descrições, e outros lugares
- [ ] Remove implementações duplicadas antigas

---

## Technical Implementation

### Part 1: Sidebar Characters Filter Fix (1.5-2 hours)

#### Current Implementation

**File**: `frontend/src/pages/(characters)/shared/components/CharacterListSidebar.tsx`

**Current Logic** (from exploration):
- Fetches favorites and recent characters
- Shows 10 characters total
- Issue: Shows all public characters (incorrect)

#### New Implementation

**File**: `frontend/src/pages/(characters)/shared/components/CharacterListSidebar.tsx`

**Strategy**:
```typescript
// Fetch user's own characters + favorites
// Sort: own characters first, then favorites
// Deduplicate (if character is both own and favorite)
// Limit to 10-15 total
```

**Updated Component**:
```typescript
export function CharacterListSidebar() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // Get current user

  useEffect(() => {
    const loadPersonalCharacters = async () => {
      if (!user) {
        setCharacters([]);
        return;
      }

      setLoading(true);
      try {
        // Fetch user's own characters (limit 10)
        const ownCharsPromise = characterService.getCharacters({
          userId: user.id,
          limit: 10,
          orderBy: 'updatedAt' // Most recently updated first
        });

        // Fetch user's favorite characters (limit 10)
        const favCharsPromise = characterService.getFavorites({
          limit: 10
        });

        const [ownChars, favChars] = await Promise.all([
          ownCharsPromise,
          favCharsPromise
        ]);

        // Combine and deduplicate
        const combined = [
          ...ownChars.characters,
          ...favChars.characters.filter(
            fav => !ownChars.characters.some(own => own.id === fav.id)
          )
        ];

        // Limit to 15 total
        const limited = combined.slice(0, 15);

        setCharacters(limited);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalCharacters();
  }, [user]);

  if (loading) {
    return <SidebarSkeleton />;
  }

  if (characters.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        Nenhum personagem ainda.
        <Link href="/characters/new" className="text-primary block mt-2">
          Criar meu primeiro personagem
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {characters.map((character) => (
        <CharacterSidebarItem
          key={character.id}
          character={character}
          isOwn={character.userId === user?.id}
          isFavorite={character.isFavorited} // From API
        />
      ))}
    </div>
  );
}

interface CharacterSidebarItemProps {
  character: Character;
  isOwn: boolean;
  isFavorite: boolean;
}

function CharacterSidebarItem({
  character,
  isOwn,
  isFavorite
}: CharacterSidebarItemProps) {
  return (
    <Link
      href={`/characters/${character.id}`}
      className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 transition"
    >
      <img
        src={character.avatar}
        alt={character.firstName}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {character.firstName} {character.lastName}
        </p>
        <div className="flex items-center gap-1">
          {isOwn && (
            <span className="text-xs text-gray-500">Meu personagem</span>
          )}
          {isFavorite && (
            <span className="text-yellow-500" title="Favorito">
              ⭐
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

#### Backend Changes (if needed)

**File**: `backend/src/routes/v1/characters.ts`

**Verify Endpoint**:
```
GET /api/v1/characters?userId={userId}&limit=10
```

Should return only characters owned by specified user.

**If not implemented**, add to controller:
```typescript
// Filter by userId if provided
if (userId) {
  filters.userId = userId;
}
```

---

### Part 2: Age Rating Component Unification (2-3 hours)

#### Step 1: Create Unified Component

**File**: `frontend/src/components/ui/AgeRatingBadge.tsx`

**Purpose**: Single source of truth for age rating badges

```typescript
import { AgeRating } from '@/types/character';

interface AgeRatingBadgeProps {
  ageRating: AgeRating;
  variant?: 'overlay' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AGE_RATING_CONFIG: Record<
  AgeRating,
  {
    label: string;
    color: string; // Tailwind class
    description: string;
  }
> = {
  L: {
    label: 'L',
    color: 'bg-success text-white',
    description: 'Livre para todas as idades'
  },
  TEN: {
    label: '10+',
    color: 'bg-success text-white',
    description: 'Não recomendado para menores de 10 anos'
  },
  TWELVE: {
    label: '12+',
    color: 'bg-success text-white',
    description: 'Não recomendado para menores de 12 anos'
  },
  FOURTEEN: {
    label: '14+',
    color: 'bg-success text-white',
    description: 'Não recomendado para menores de 14 anos'
  },
  SIXTEEN: {
    label: '16+',
    color: 'bg-accent text-white',
    description: 'Não recomendado para menores de 16 anos'
  },
  EIGHTEEN: {
    label: '18+',
    color: 'bg-black text-white',
    description: 'Conteúdo adulto - Apenas para maiores de 18 anos'
  }
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-3 py-1.5'
};

const VARIANT_CLASSES = {
  overlay: 'absolute left-2 top-2 shadow-lg',
  inline: 'inline-block'
};

export function AgeRatingBadge({
  ageRating,
  variant = 'inline',
  size = 'md',
  className = ''
}: AgeRatingBadgeProps) {
  const config = AGE_RATING_CONFIG[ageRating] || AGE_RATING_CONFIG.L;

  return (
    <span
      className={`
        ${config.color}
        ${SIZE_CLASSES[size]}
        ${VARIANT_CLASSES[variant]}
        rounded-full
        font-semibold
        uppercase
        tracking-wide
        ${className}
      `}
      title={config.description}
      aria-label={config.description}
    >
      {config.label}
    </span>
  );
}

// Export config for use elsewhere
export { AGE_RATING_CONFIG };
```

#### Step 2: Replace Implementation in CharacterCard

**File**: `frontend/src/pages/(characters)/shared/components/CharacterCard.tsx`

**Before** (lines 54-65):
```typescript
const getAgeRatingClass = (ageRating: string | undefined): string => {
  const ratingMap: Record<string, string> = {
    SIXTEEN: 'bg-accent',
    EIGHTEEN: 'bg-black',
  };
  return ratingMap[ageRating] || 'bg-success';
};

// In JSX:
<div className={`absolute left-2 top-2 rounded-full px-2 py-0.5
                text-[10px] font-semibold uppercase tracking-wide
                text-white shadow ${getAgeRatingClass(character.ageRating)}`}>
  {overlayAgeLabel}
</div>
```

**After**:
```typescript
import { AgeRatingBadge } from '@/components/ui/AgeRatingBadge';

// In JSX:
<AgeRatingBadge
  ageRating={character.ageRating}
  variant="overlay"
  size="sm"
/>
```

**Simplification**:
- Remove `getAgeRatingClass` function (no longer needed)
- Remove `overlayAgeLabel` calculation (handled by component)
- Remove manual className building

#### Step 3: Find and Replace Other Implementations

**Strategy**:
```bash
# Find all age rating badge implementations
grep -r "ageRating" frontend/src --include="*.tsx" -A 5 -B 5

# Common patterns to search:
# - "bg-success" + "bg-accent" + "bg-black" (color system)
# - "SIXTEEN" or "EIGHTEEN" (age rating checks)
# - Manual label formatting (L, 10+, 12+, etc.)
```

**Files to Update** (based on spec):
1. `frontend/src/pages/(characters)/shared/components/CharacterCard.tsx` ✅
2. Character description pages
3. Story description pages
4. Any modals/dialogs showing character info

**For Each File**:
1. Import `AgeRatingBadge`
2. Replace manual implementation with `<AgeRatingBadge />`
3. Remove old helper functions
4. Test visually

#### Step 4: Create Storybook/Documentation (Optional)

**File**: `frontend/src/components/ui/AgeRatingBadge.stories.tsx`

```typescript
import { AgeRatingBadge } from './AgeRatingBadge';

export default {
  title: 'UI/AgeRatingBadge',
  component: AgeRatingBadge,
};

export const AllRatings = () => (
  <div className="space-y-4">
    <AgeRatingBadge ageRating="L" />
    <AgeRatingBadge ageRating="TEN" />
    <AgeRatingBadge ageRating="TWELVE" />
    <AgeRatingBadge ageRating="FOURTEEN" />
    <AgeRatingBadge ageRating="SIXTEEN" />
    <AgeRatingBadge ageRating="EIGHTEEN" />
  </div>
);

export const Sizes = () => (
  <div className="space-x-4">
    <AgeRatingBadge ageRating="EIGHTEEN" size="sm" />
    <AgeRatingBadge ageRating="EIGHTEEN" size="md" />
    <AgeRatingBadge ageRating="EIGHTEEN" size="lg" />
  </div>
);

export const Variants = () => (
  <div className="space-y-4">
    <div className="relative w-64 h-40 bg-gray-200">
      <AgeRatingBadge ageRating="EIGHTEEN" variant="overlay" />
    </div>
    <AgeRatingBadge ageRating="EIGHTEEN" variant="inline" />
  </div>
);
```

---

## Testing Strategy

### Part 1: Sidebar Filter Tests

**Manual Testing**:
- [ ] Login as user with characters
- [ ] Verify sidebar shows only own + favorited characters
- [ ] Own characters appear first
- [ ] Favorited characters have star icon
- [ ] Max 15 characters shown
- [ ] No duplicates (character that is both own and favorite)
- [ ] Empty state shows when user has no characters

**Unit Test**:
```typescript
describe('CharacterListSidebar', () => {
  test('shows only own and favorited characters', async () => {
    const mockUser = { id: 'user-1' };
    const mockOwnChars = [{ id: '1', userId: 'user-1', name: 'Own' }];
    const mockFavChars = [{ id: '2', userId: 'user-2', name: 'Fav' }];

    render(<CharacterListSidebar />);

    await waitFor(() => {
      expect(screen.getByText('Own')).toBeInTheDocument();
      expect(screen.getByText('Fav')).toBeInTheDocument();
    });
  });

  test('deduplicates characters that are both own and favorite', () => {
    // Test deduplication logic
  });
});
```

### Part 2: Age Rating Component Tests

**Visual Regression**:
- [ ] All age ratings render correctly (L, 10+, 12+, 14+, 16+, 18+)
- [ ] Colors match spec (green, orange, black)
- [ ] Sizes work (sm, md, lg)
- [ ] Variants work (overlay, inline)

**Unit Test**:
```typescript
describe('AgeRatingBadge', () => {
  test('renders correct label for each age rating', () => {
    const { rerender } = render(<AgeRatingBadge ageRating="L" />);
    expect(screen.getByText('L')).toBeInTheDocument();

    rerender(<AgeRatingBadge ageRating="EIGHTEEN" />);
    expect(screen.getByText('18+')).toBeInTheDocument();
  });

  test('applies correct color classes', () => {
    const { container } = render(<AgeRatingBadge ageRating="EIGHTEEN" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-black');
  });

  test('respects size prop', () => {
    const { container } = render(
      <AgeRatingBadge ageRating="L" size="lg" />
    );
    expect(container.firstChild).toHaveClass('text-sm');
  });
});
```

---

## Rollout Strategy

### Development (4-5 hours)

**Part 1: Sidebar** (1.5-2 hours):
1. Update CharacterListSidebar component (1 hour)
2. Update character service if needed (30 min)
3. Manual testing (30 min)

**Part 2: Age Rating Component** (2.5-3 hours):
1. Create AgeRatingBadge component (1 hour)
2. Replace in CharacterCard (30 min)
3. Find and replace other occurrences (1 hour)
4. Visual testing (30 min)

### Testing (1 hour)
- Unit tests
- Integration tests
- Visual regression

### Code Review & Deploy (30 min)

**Total: 5.5-6.5 hours**

---

## Success Metrics

### Sidebar
- [ ] Sidebar loads < 500ms
- [ ] Shows only relevant characters (own + favorites)
- [ ] Users can access characters faster (qualitative feedback)

### Age Rating Component
- [ ] Code deduplication: -100 lines of duplicate code
- [ ] Visual consistency: All badges look identical
- [ ] Maintainability: Changes in one place

---

## Risks & Mitigation

### Risk 1: Breaking Existing Age Rating Display
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Thorough visual testing
- Test all screen sizes
- Gradual rollout (replace one file at a time)

### Risk 2: Sidebar Performance with Large Datasets
**Probability**: Low
**Impact**: Low

**Mitigation**:
- Limit to 15 characters
- Optimize DB queries
- Add loading skeleton

---

## Dependencies

### Frontend
- React
- Existing character service
- Auth context (for current user)

### Backend
- Character API with userId filter
- Favorites API

---

## Notes for Agent Coder

### Implementation Priority
**MEDIUM** - Quality of life improvements, not critical

### Estimated Effort
- **Optimistic**: 4 hours
- **Realistic**: 5-6 hours
- **Pessimistic**: 8 hours

**Recommendation**: Allocate 6 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/ui-improvements-sidebar-age-tags

# 2. Part 1: Sidebar
# Update CharacterListSidebar.tsx
# Test locally

# 3. Part 2: Age Rating
# Create AgeRatingBadge.tsx
# Replace in CharacterCard.tsx
# Find other occurrences: grep -r "ageRating" frontend/src
# Replace one by one

# 4. Test
npm test
npm run dev
# Visual testing

# 5. Create PR
```

### Key Considerations

1. **Sidebar**: Ensure deduplication logic works correctly
2. **Age Rating**: Maintain exact visual appearance (colors, sizes)
3. **Accessibility**: ARIA labels for screen readers
4. **Performance**: Sidebar should load quickly

### Questions to Clarify

- Current sidebar performance with large character lists?
- Any other places using age rating badges we should check?
- Design preferences for sidebar empty state?

---

**End of Specification**

🎨 Ready for implementation - Focus on consistency and UX polish!

---

## Status Update

**Status**: ✅ Implemented
**PR Created**: 2026-01-03
**Branch**: feature/ui-improvements-sidebar-age-tags
**Agent**: Coder

### Implementation Summary

**Part 1: Sidebar Characters Filter Fix**
- [x] Sidebar now shows only user's own characters + favorites
- [x] Favorites appear first, then own characters
- [x] Avatar extraction from images array for favorites
- [x] i18n support for "My character" label
- [x] Deduplication logic (no duplicates when character is both own and favorite)
- [x] Limited to 15 characters total

**Part 2: Age Rating Badge Component Unification**
- [x] Created `components/ui/AgeRatingBadge.tsx` component
- [x] Props: `ageRating`, `variant` (overlay/inline), `size` (sm/md/lg)
- [x] Consistent color scheme (green for L-14+, orange for 16+, black for 18+)
- [x] ARIA labels for accessibility
- [x] Replaced in:
  - CharacterCard.tsx
  - Character detail page ([characterId]/index.tsx)
  - Story detail page ([storyId]/index.tsx) - 2 locations
  - StoryCard.tsx
  - Dashboard story card (story-card.tsx)

**Testing Completed:**
- [x] TypeScript compilation (frontend)
- [x] Frontend build successful
- [x] Docker containers verified healthy
- [x] Manual testing completed

**PR**: https://github.com/leandro-br-dev/charhub/pull/90

**Ready for Agent Reviewer** ✅
