# Dashboard Infinite Scroll - Feature Specification

**Status**: ✅ Implemented
**Version**: 1.0.0
**Date Created**: 2025-12-28
**Last Updated**: 2025-12-29
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Implementation Progress

### ✅ Completed Tasks

- [x] **Phase 1**: Created `useCardsPerRow` hook
  - File: `frontend/src/hooks/useCardsPerRow.ts`
  - Calculates cards per row based on viewport width
  - Handles window resize events
  - Returns 1-8 cards per row depending on screen size

- [x] **Phase 2**: Created `useInfiniteScroll` hook
  - File: `frontend/src/hooks/useInfiniteScroll.ts`
  - Uses IntersectionObserver API
  - Callback ref pattern for conditional rendering
  - Configurable threshold and rootMargin

- [x] **Phase 3**: Created loading UI components
  - `frontend/src/components/ui/CharacterCardSkeleton.tsx`
  - `frontend/src/components/ui/LoadingSpinner.tsx`
  - `frontend/src/components/ui/EndOfListMessage.tsx`

- [x] **Phase 4**: Updated backend API
  - Modified `backend/src/services/characterService.ts`
  - Added `CharacterListResult` with `total` and `hasMore`
  - Updated `getPublicCharacters` and `getPublicAndOwnCharacters`

- [x] **Phase 5**: Updated character service
  - File: `frontend/src/services/characterService.ts`
  - Added `CharacterListResult` interface
  - Added `listWithPagination` and `getPopularWithPagination` methods

- [x] **Phase 6**: Updated dashboard component
  - File: `frontend/src/pages/dashboard/index.tsx`
  - Integrated infinite scroll logic
  - Initial batch: 12-24 cards (responsive)
  - Scroll batch: 2 rows at a time
  - Loading states: initial skeleton + scroll spinner

- [x] **Phase 7**: Added translations
  - Updated `backend/translations/_source/dashboard.json`
  - Generated translations for all languages using LLM

### 🔧 Implementation Notes

**Deviations from spec**:
- `initialLimit` changed from `cardsPerRow * 4` to `Math.max(cardsPerRow * 6, 12)` for better UX
- `threshold` changed from `0.1` to `0.0` to trigger earlier
- `rootMargin` set to `400px` to start loading earlier
- Used callback ref pattern instead of useRef to handle conditional rendering

**Key fixes during implementation**:
- Fixed race condition in `useCardsPerRow` by calculating initial value immediately
- Fixed IntersectionObserver not detecting element by using callback ref pattern
- Added `min-h-[20px] w-full` to loadMoreRef element for proper detection

---

---

## Overview

Implementar scroll infinito na página de dashboard para carregar personagens sob demanda, substituindo o limite atual de 8 personagens. O sistema deve carregar inicialmente 4 fileiras completas de personagens (baseado no tamanho da tela/dispositivo) e depois continuar carregando conforme o usuário rola a página.

---

## Business Value

**Problema Atual**:
- Dashboard mostra apenas 8 personagens, mesmo quando há mais disponíveis
- Usuários não conseguem ver todo o catálogo sem navegar para outra página
- Experiência limitada em diferentes tamanhos de tela
- Não aproveita o espaço disponível em telas maiores

**Impacto no Negócio**:
- 📊 **Engajamento**: Usuários descobrem mais personagens sem sair da página
- 🎨 **UX**: Experiência fluida e moderna (padrão em plataformas de conteúdo)
- 📱 **Responsividade**: Adaptação inteligente ao dispositivo do usuário
- 🚀 **Performance**: Carregamento sob demanda evita overhead inicial

**Solução**:
- Calcular dinamicamente quantos personagens cabem por fileira
- Carregar inicialmente 4 fileiras completas
- Implementar scroll infinito com carregamento progressivo
- Loading states e feedback visual durante carregamento

**Impacto Esperado**:
- ✅ Aumento de 300-400% no número de personagens visíveis
- ✅ Melhor taxa de descoberta de personagens
- ✅ Experiência de usuário moderna e fluida
- ✅ Performance otimizada (carregamento sob demanda)

---

## User Stories

### US-1: Visualização Inicial Inteligente
**Como** usuário
**Quero** ver automaticamente 4 fileiras de personagens quando abro o dashboard
**Para que** eu tenha uma boa quantidade de opções sem precisar rolar imediatamente

**Acceptance Criteria**:
- [ ] Sistema calcula dinamicamente quantos cards cabem por fileira baseado na largura da tela
- [ ] Carrega automaticamente 4 fileiras completas (ex: 4×5=20 em desktop, 4×2=8 em mobile)
- [ ] Exibe loading skeleton durante carregamento inicial
- [ ] Personagens são exibidos respeitando filtros ativos (age rating, tags)

### US-2: Scroll Infinito
**Como** usuário
**Quero** que novos personagens carreguem automaticamente quando rolo a página
**Para que** eu possa explorar todo o catálogo sem clicar em botões

**Acceptance Criteria**:
- [ ] Detecta quando usuário está próximo do fim da lista (threshold configurável)
- [ ] Carrega próximo lote de personagens automaticamente
- [ ] Mostra loading indicator enquanto carrega
- [ ] Não faz requisições duplicadas (debouncing)
- [ ] Para de carregar quando não há mais personagens disponíveis
- [ ] Exibe mensagem "Todos os personagens foram carregados" ao final

### US-3: Responsividade por Dispositivo
**Como** usuário em diferentes dispositivos
**Quero** que o sistema se adapte ao meu tamanho de tela
**Para que** eu veja a quantidade ideal de personagens por fileira

**Acceptance Criteria**:
- [ ] Mobile (< 640px): 1-2 cards por fileira
- [ ] Tablet (640px - 1024px): 3-4 cards por fileira
- [ ] Desktop (1024px - 1440px): 4-5 cards por fileira
- [ ] Large Desktop (> 1440px): 6+ cards por fileira
- [ ] Recalcula fileiras se usuário redimensiona janela

### US-4: Performance e Feedback Visual
**Como** usuário
**Quero** feedback visual claro durante carregamentos
**Para que** eu saiba que o sistema está funcionando

**Acceptance Criteria**:
- [ ] Loading skeleton com shimmer effect durante carregamento inicial
- [ ] Spinner ou progress bar durante scroll infinito
- [ ] Transição suave ao adicionar novos cards
- [ ] Scroll mantém posição após carregamento (sem "jumps")
- [ ] Tempo de carregamento < 2 segundos por lote

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                Dashboard Infinite Scroll                    │
└─────────────────────────────────────────────────────────────┘

Current State                        Target State
┌────────────────────┐              ┌──────────────────────────┐
│ Static Grid        │              │ Dynamic Grid             │
│ Limit: 8 fixed     │    →        │ Initial: 4 rows dynamic  │
│ No pagination      │              │ Infinite: on scroll      │
└────────────────────┘              └──────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Component Architecture                     │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Dashboard Component (index.tsx)                         │
│  ├─ Calculate cards per row (useCardsPerRow hook)       │
│  ├─ Calculate initial batch size (4 × cards per row)    │
│  └─ Manage scroll state (useInfiniteScroll hook)        │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│ useInfiniteScroll Hook                                  │
│  ├─ IntersectionObserver API                            │
│  ├─ Load more trigger (90% scroll threshold)            │
│  ├─ Loading state management                            │
│  └─ Debouncing (prevent duplicate requests)             │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│ Character Service API                                    │
│  ├─ GET /api/v1/characters?skip=N&limit=M               │
│  ├─ Filters: ageRatings, tags, search                   │
│  └─ Response: { characters, total, hasMore }            │
└─────────────────────────────────────────────────────────┘

Flow:
1. Component mounts → Calculate cards per row (responsive)
2. Calculate initial limit = 4 × cards per row
3. Fetch initial batch with calculated limit
4. Render cards + setup intersection observer
5. User scrolls → Observer triggers at 90% viewport
6. Fetch next batch (skip = current count, limit = cards per row)
7. Append new characters to list
8. Repeat until hasMore = false
```

---

## Implementation Details

### Phase 1: Create Responsive Grid Calculation Hook (30-45 min)

#### Create `useCardsPerRow` Hook

**File**: `frontend/src/hooks/useCardsPerRow.ts`

**Purpose**: Calculate how many character cards fit per row based on viewport width

**Implementation**:
```typescript
import { useState, useEffect } from 'react';

/**
 * Calculates how many character cards fit per row based on viewport width
 *
 * Card width: ~280px (240px card + 40px gap)
 * Breakpoints:
 * - Mobile (<640px): 1-2 cards
 * - Tablet (640-1024px): 3-4 cards
 * - Desktop (1024-1440px): 4-5 cards
 * - Large (>1440px): 6+ cards
 */
export function useCardsPerRow(): number {
  const [cardsPerRow, setCardsPerRow] = useState<number>(4); // default

  useEffect(() => {
    const calculateCardsPerRow = () => {
      const containerWidth = window.innerWidth - 64; // Subtract padding (32px each side)
      const cardWidth = 280; // Card + gap

      const calculated = Math.floor(containerWidth / cardWidth);

      // Min 1, max 8
      const clamped = Math.max(1, Math.min(8, calculated));

      setCardsPerRow(clamped);
    };

    calculateCardsPerRow();

    window.addEventListener('resize', calculateCardsPerRow);
    return () => window.removeEventListener('resize', calculateCardsPerRow);
  }, []);

  return cardsPerRow;
}
```

**Testing**:
```typescript
// Test in different viewports:
// - iPhone SE (375px) → 1 card
// - iPad (768px) → 2-3 cards
// - Desktop (1440px) → 5 cards
// - 4K (2560px) → 8 cards
```

---

### Phase 2: Create Infinite Scroll Hook (1-1.5 hours)

#### Create `useInfiniteScroll` Hook

**File**: `frontend/src/hooks/useInfiniteScroll.ts`

**Purpose**: Generic hook for infinite scrolling with IntersectionObserver

**Implementation**:
```typescript
import { useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // % of element visible (0-1)
  rootMargin?: string; // Trigger before reaching element
}

interface UseInfiniteScrollReturn {
  loadMoreRef: React.RefObject<HTMLDivElement>;
  isIntersecting: boolean;
}

/**
 * Hook for implementing infinite scroll with IntersectionObserver
 *
 * Usage:
 * const { loadMoreRef } = useInfiniteScroll({
 *   threshold: 0.1, // Trigger when 10% visible
 *   rootMargin: '100px' // Trigger 100px before element
 * });
 *
 * <div ref={loadMoreRef} />
 */
export function useInfiniteScroll(
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 0.1, rootMargin = '0px' } = options;

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return { loadMoreRef, isIntersecting };
}
```

**Key Features**:
- Uses modern `IntersectionObserver` API
- Configurable threshold and margin
- Automatic cleanup
- Ref-based (no additional DOM elements)

---

### Phase 3: Update Dashboard Component (1.5-2 hours)

#### Modify Dashboard Tab Component

**File**: `frontend/src/pages/dashboard/index.tsx`

**Current Implementation** (lines ~100-120):
```typescript
// Popular characters tab
const [popularCharacters, setPopularCharacters] = useState<Character[]>([]);

useEffect(() => {
  const loadPopular = async () => {
    const data = await characterService.getPopular({
      limit: 8,  // ❌ HARDCODED LIMIT
      ageRatings
    });
    setPopularCharacters(data);
  };
  loadPopular();
}, [ageRatings]);
```

**New Implementation**:
```typescript
import { useCardsPerRow } from '@/hooks/useCardsPerRow';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// Inside component:
const cardsPerRow = useCardsPerRow();
const [popularCharacters, setPopularCharacters] = useState<Character[]>([]);
const [isLoadingMore, setIsLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [initialLoading, setInitialLoading] = useState(true);

// Calculate initial batch size (4 rows)
const initialLimit = cardsPerRow * 4;
const batchSize = cardsPerRow * 2; // Load 2 rows at a time on scroll

// Load initial batch
useEffect(() => {
  const loadInitial = async () => {
    setInitialLoading(true);
    try {
      const data = await characterService.getPopular({
        limit: initialLimit,
        ageRatings
      });
      setPopularCharacters(data.characters);
      setHasMore(data.hasMore);
    } finally {
      setInitialLoading(false);
    }
  };

  loadInitial();
}, [initialLimit, ageRatings]); // Re-run if cards per row changes or filters change

// Load more on scroll
const loadMore = async () => {
  if (isLoadingMore || !hasMore) return;

  setIsLoadingMore(true);
  try {
    const data = await characterService.getPopular({
      skip: popularCharacters.length,
      limit: batchSize,
      ageRatings
    });

    setPopularCharacters(prev => [...prev, ...data.characters]);
    setHasMore(data.hasMore);
  } finally {
    setIsLoadingMore(false);
  }
};

// Setup infinite scroll observer
const { loadMoreRef, isIntersecting } = useInfiniteScroll({
  threshold: 0.1,
  rootMargin: '200px' // Start loading 200px before reaching element
});

// Trigger load more when observer fires
useEffect(() => {
  if (isIntersecting && !initialLoading) {
    loadMore();
  }
}, [isIntersecting]);

// Render
return (
  <div>
    {initialLoading ? (
      <LoadingSkeleton count={initialLimit} />
    ) : (
      <>
        <CharacterGrid characters={popularCharacters} />

        {/* Infinite scroll trigger element */}
        <div ref={loadMoreRef}>
          {isLoadingMore && <LoadingSpinner />}
          {!hasMore && <EndOfListMessage />}
        </div>
      </>
    )}
  </div>
);
```

**Key Changes**:
1. ✅ Dynamic initial limit based on screen size
2. ✅ Infinite scroll with intersection observer
3. ✅ Proper loading states (initial + more)
4. ✅ Prevent duplicate requests
5. ✅ End of list detection

---

### Phase 4: Update Character Service API Response (30 min)

#### Modify Character Service

**File**: `frontend/src/services/characterService.ts`

**Current**:
```typescript
async getPopular(params: { limit: number; ageRatings?: string[] }) {
  // Returns Character[]
}
```

**New**:
```typescript
interface CharacterListResponse {
  characters: Character[];
  total: number;
  hasMore: boolean;
}

async getPopular(params: {
  limit: number;
  skip?: number;
  ageRatings?: string[]
}): Promise<CharacterListResponse> {
  const { skip = 0, limit, ageRatings } = params;

  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  if (ageRatings?.length) {
    ageRatings.forEach(rating => queryParams.append('ageRatings', rating));
  }

  const response = await api.get(`/characters?${queryParams}`);

  return {
    characters: response.data.characters,
    total: response.data.total,
    hasMore: response.data.hasMore || (skip + limit < response.data.total)
  };
}
```

**Same for Favorites**:
```typescript
async getFavorites(params: {
  limit: number;
  skip?: number
}): Promise<CharacterListResponse> {
  // Similar implementation
}
```

---

### Phase 5: Backend API Update (if needed) (30 min)

#### Verify Backend Response Format

**File**: `backend/src/routes/v1/characters.ts`

**Ensure Response Includes**:
```typescript
{
  characters: Character[],
  total: number,  // Total count of matching characters
  hasMore: boolean  // skip + limit < total
}
```

**Current Implementation** (from exploration):
- `GET /api/v1/characters` already supports `skip` and `limit` ✅
- **Check if response includes `total` and `hasMore`**

**If not present, modify controller**:

**File**: `backend/src/controllers/characterController.ts`

```typescript
async getPublicCharacters(req, res) {
  const { skip = 0, limit = 20, ageRatings, tags, search } = req.query;

  const filters = { /* ... */ };

  // Get total count (for hasMore calculation)
  const total = await prisma.character.count({ where: filters });

  // Get characters
  const characters = await prisma.character.findMany({
    where: filters,
    skip: Number(skip),
    take: Number(limit),
    include: { /* ... */ }
  });

  res.json({
    characters,
    total,
    hasMore: Number(skip) + Number(limit) < total
  });
}
```

**Note**: This requires adding a `count()` query. For better performance, consider caching the total or using cursor-based pagination.

---

### Phase 6: Loading States UI Components (45 min)

#### Create Loading Skeleton Component

**File**: `frontend/src/components/ui/CharacterCardSkeleton.tsx`

```typescript
export function CharacterCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-gray-200 rounded-lg" />
      <div className="mt-2 h-4 bg-gray-200 rounded w-3/4" />
      <div className="mt-1 h-3 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export function CharacterGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CharacterCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

#### Create Loading Spinner Component

**File**: `frontend/src/components/ui/LoadingSpinner.tsx`

```typescript
export function LoadingSpinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
```

#### Create End of List Message

**File**: `frontend/src/components/ui/EndOfListMessage.tsx`

```typescript
export function EndOfListMessage() {
  return (
    <div className="text-center py-8 text-gray-500">
      <p>Todos os personagens foram carregados</p>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**File**: `frontend/src/hooks/__tests__/useCardsPerRow.test.ts`

```typescript
describe('useCardsPerRow', () => {
  test('calculates correctly for mobile', () => {
    global.innerWidth = 375;
    const { result } = renderHook(() => useCardsPerRow());
    expect(result.current).toBe(1);
  });

  test('calculates correctly for tablet', () => {
    global.innerWidth = 768;
    const { result } = renderHook(() => useCardsPerRow());
    expect(result.current).toBeGreaterThanOrEqual(2);
  });

  test('recalculates on window resize', () => {
    // Test resize event listener
  });
});
```

### Integration Tests

**File**: `frontend/src/pages/dashboard/__tests__/infiniteScroll.test.tsx`

```typescript
describe('Dashboard Infinite Scroll', () => {
  test('loads initial batch of 4 rows', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('character-card');
      // Assuming 5 cards per row, should load 20
      expect(cards.length).toBeGreaterThanOrEqual(16);
    });
  });

  test('loads more on scroll', async () => {
    render(<Dashboard />);

    const initialCards = await screen.findAllByTestId('character-card');

    // Scroll to bottom
    fireEvent.scroll(window, { target: { scrollY: 1000 } });

    await waitFor(() => {
      const newCards = screen.getAllByTestId('character-card');
      expect(newCards.length).toBeGreaterThan(initialCards.length);
    });
  });

  test('shows loading spinner while loading more', async () => {
    // Test loading state visibility
  });

  test('shows end message when no more characters', async () => {
    // Mock API to return hasMore: false
    // Verify end message appears
  });
});
```

### Manual Testing Checklist

- [ ] **Desktop (1920×1080)**: Loads ~20 characters initially (4×5)
- [ ] **Tablet (768×1024)**: Loads ~12 characters initially (4×3)
- [ ] **Mobile (375×667)**: Loads 4-8 characters initially (4×1 or 4×2)
- [ ] **Scroll to bottom**: New characters load automatically
- [ ] **Scroll fast**: No duplicate requests (debouncing works)
- [ ] **Resize window**: Recalculates cards per row
- [ ] **No more characters**: Shows "end of list" message
- [ ] **Slow network**: Loading spinner appears
- [ ] **Filter change**: Resets scroll and loads fresh data

---

## Performance Considerations

### Optimization Strategies

1. **Debouncing**:
   - Prevent duplicate load requests
   - Wait 300ms after scroll stops before triggering

2. **Batch Size**:
   - Initial: 4 rows (good first impression)
   - Subsequent: 2 rows (faster loading)

3. **Virtual Scrolling** (Future Enhancement):
   - For catalogs with 1000+ characters
   - Use `react-window` or `react-virtualized`
   - Renders only visible cards

4. **Image Lazy Loading**:
   - Character cards should use `loading="lazy"`
   - Already implemented in `CharacterCard.tsx`

5. **API Response Optimization**:
   - Backend should use indexed queries
   - Consider caching total count
   - Cursor-based pagination for very large datasets

### Expected Performance Metrics

- **Initial Load**: < 1 second (4 rows)
- **Load More**: < 500ms (2 rows)
- **Time to Interactive**: < 2 seconds
- **Scroll Performance**: 60fps (no jank)

---

## Rollout Strategy

### Phase 1: Development (4-6 hours)

**Tasks**:
1. Create `useCardsPerRow` hook (45 min)
2. Create `useInfiniteScroll` hook (1.5 hours)
3. Update Dashboard component (2 hours)
4. Create loading UI components (45 min)
5. Update character service (30 min)
6. Backend API check/update (30 min)

### Phase 2: Testing (2-3 hours)

**Tasks**:
1. Unit tests for hooks (1 hour)
2. Integration tests (1 hour)
3. Manual testing on devices (1 hour)

### Phase 3: Code Review & Staging (1-2 hours)

**Tasks**:
1. Self-review
2. Create PR
3. Deploy to staging
4. Smoke test

### Phase 4: Production (30 min)

**Tasks**:
1. Merge to main
2. Deploy to production
3. Monitor metrics

**Total Estimated Time**: 8-12 hours

---

## Success Metrics

### Quantitative Metrics
- **Characters Visible (Initial)**: 8 → 16-24 (2-3× increase)
- **Discovery Rate**: Track % of users who scroll and view more characters
- **API Performance**: Load time < 1s for initial, < 500ms for more
- **Scroll Performance**: 60fps maintained

### Qualitative Metrics
- **User Feedback**: Positive feedback on discovery experience
- **Bounce Rate**: Decrease in users leaving dashboard immediately
- **Engagement**: Increase in character views and interactions

### Validation Criteria
- [ ] Initial load shows 4 full rows of characters
- [ ] Scroll infinito funciona em todos os dispositivos
- [ ] Loading states são claros e responsivos
- [ ] Performance mantida (< 2s initial load)
- [ ] No duplicate API requests
- [ ] Works with all existing filters (age rating, tags, search)

---

## Risks & Mitigation

### Risk 1: Performance Degradation with Large Lists
**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- Implement debouncing on scroll events
- Limit batch size to reasonable number
- Consider virtual scrolling for future (if list > 500 items)
- Monitor performance metrics in production

### Risk 2: Complex State Management
**Probability**: Low
**Impact**: Low

**Mitigation**:
- Use well-tested hooks pattern
- Clear separation of concerns
- Comprehensive unit tests
- Code review before deployment

### Risk 3: Backend Performance Issues
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Ensure database queries are indexed
- Cache total count when possible
- Monitor backend performance metrics
- Have rollback plan ready

---

## Dependencies

### Frontend
- React hooks (useState, useEffect, useRef)
- IntersectionObserver API (modern browsers)
- Existing character service
- Existing character card component

### Backend
- `GET /api/v1/characters` endpoint
- Support for `skip` and `limit` parameters
- Return `total` and `hasMore` in response

### Testing
- Jest + React Testing Library
- Mock IntersectionObserver (for tests)

---

## Related Documentation

- **Dashboard Component**: `frontend/src/pages/dashboard/index.tsx`
- **Character Service**: `frontend/src/services/characterService.ts`
- **Character API**: `backend/src/routes/v1/characters.ts`
- **Character Card**: `frontend/src/pages/(characters)/shared/components/CharacterCard.tsx`

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Directly impacts user experience and content discovery

### Estimated Effort
- **Optimistic**: 6 hours (smooth implementation)
- **Realistic**: 8-10 hours (including testing)
- **Pessimistic**: 12 hours (backend changes + issues)

**Recommendation**: Allocate 10 hours

### Quick Start

```bash
# 1. Create feature branch
git checkout -b feature/dashboard-infinite-scroll

# 2. Create hooks
mkdir -p frontend/src/hooks
# Create useCardsPerRow.ts
# Create useInfiniteScroll.ts

# 3. Update dashboard component
# Modify frontend/src/pages/dashboard/index.tsx

# 4. Test locally
cd frontend
npm run dev
# Test on different screen sizes (use browser dev tools)

# 5. Run tests
npm test

# 6. Create PR
```

### Key Considerations

1. **Mobile First**: Test on mobile viewport first
2. **Performance**: Use browser Performance tab to monitor
3. **Loading States**: Clear visual feedback is critical
4. **Filter Integration**: Must work with existing filters
5. **Accessibility**: Ensure screen readers work with infinite scroll

### Questions to Clarify

- Current backend response format (includes `total` and `hasMore`?)
- Average number of public characters in database?
- Any existing pagination implementation to reference?
- Performance requirements (target load time)?

---

**End of Specification**

🚀 Ready for implementation - Focus on responsive calculation and smooth UX!
