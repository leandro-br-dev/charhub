# Discovery Enhanced Filters - Feature Specification

**Status**: ✅ Implemented (Ready for PR)
**Version**: 1.0.0
**Date Created**: 2025-12-28
**Last Updated**: 2025-12-30
**Priority**: High
**Assigned To**: Agent Coder
**GitHub Issue**: TBD

---

## Overview

Adicionar filtros avançados de **Gênero** e **Espécie** na aba "Descobrir" do dashboard, complementando os filtros existentes de **Populares** e **Favoritos**. Permitir que usuários filtrem personagens por características demográficas para melhor descoberta de conteúdo.

---

## Business Value

**Problema Atual**:
- Aba "Descobrir" tem apenas toggle Populares/Favoritos
- Usuários não conseguem filtrar por gênero (male, female, non-binary, etc.)
- Usuários não conseguem filtrar por espécie (human, elf, robot, etc.)
- Dificulta descoberta de personagens específicos em catálogo grande
- Usuários precisam rolar infinitamente para achar o tipo de personagem desejado

**Impacto no Negócio**:
- 🎯 **Discovery**: Usuários encontram personagens relevantes mais rapidamente
- 📊 **Engagement**: Aumento na taxa de interação com personagens descobertos
- 🎨 **Diversidade**: Destaca a variedade de personagens disponíveis
- ⚡ **UX**: Reduz tempo de busca e frustração do usuário

**Solução**:
- Adicionar filtro de **Gênero** (checkboxes múltiplos)
- Adicionar filtro de **Espécie** (checkboxes múltiplos ou dropdown)
- Integrar com filtros existentes (Age Rating, Tags, Populares/Favoritos)
- UI responsiva e intuitiva (desktop sidebar, mobile collapsible)

**Impacto Esperado**:
- ✅ Redução de 60-70% no tempo para encontrar personagens específicos
- ✅ Aumento de 30-40% na taxa de interação com personagens descobertos
- ✅ Melhor distribuição de visualizações entre diferentes tipos de personagens
- ✅ Feedback positivo de usuários sobre facilidade de descoberta

---

## User Stories

### US-1: Filtrar por Gênero
**Como** usuário
**Quero** filtrar personagens por gênero (male, female, non-binary, etc.)
**Para que** eu veja apenas personagens do(s) gênero(s) que me interessam

**Acceptance Criteria**:
- [ ] Filtro de gênero visível na aba "Descobrir"
- [ ] Opções disponíveis: Male, Female, Non-Binary, Other, Unknown (baseado em dados existentes)
- [ ] Seleção múltipla permitida (checkboxes)
- [ ] Filtro aplica-se imediatamente ao selecionar/desselecionar
- [ ] Número de personagens por gênero exibido (ex: "Male (342)")
- [ ] Filtro persiste na sessão (localStorage)
- [ ] Funciona em conjunto com outros filtros (age rating, populares/favoritos)

### US-2: Filtrar por Espécie
**Como** usuário
**Quero** filtrar personagens por espécie (human, elf, robot, furry, etc.)
**Para que** eu explore personagens de diferentes tipos/raças

**Acceptance Criteria**:
- [ ] Filtro de espécie visível na aba "Descobrir"
- [ ] Opções disponíveis: Human, Elf, Robot, Furry, Demon, Angel, Vampire, Other, Unknown
- [ ] Seleção múltipla permitida (checkboxes)
- [ ] Filtro aplica-se imediatamente
- [ ] Número de personagens por espécie exibido
- [ ] Filtro persiste na sessão
- [ ] Funciona em conjunto com outros filtros

### US-3: Filtros Combinados
**Como** usuário
**Quero** combinar múltiplos filtros (gênero + espécie + age rating + populares)
**Para que** eu tenha controle granular sobre o que vejo

**Acceptance Criteria**:
- [ ] Todos os filtros funcionam em conjunto (AND logic)
- [ ] Contadores atualizam dinamicamente conforme filtros mudam
- [ ] Botão "Limpar Filtros" para resetar tudo
- [ ] Loading state durante aplicação de filtros
- [ ] "Nenhum personagem encontrado" se combinação resultar vazio

### US-4: UI Responsiva
**Como** usuário mobile
**Quero** acessar filtros facilmente no meu dispositivo
**Para que** eu tenha a mesma experiência de desktop

**Acceptance Criteria**:
- [ ] **Desktop**: Filtros em sidebar persistente (lado esquerdo ou direito)
- [ ] **Mobile**: Filtros em bottom sheet ou collapsible panel
- [ ] Ícone de filtro com badge mostrando quantos filtros ativos
- [ ] Animações suaves ao abrir/fechar painel de filtros
- [ ] Touch-friendly (botões grandes o suficiente para mobile)

---

## Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Discovery Enhanced Filters                     │
└─────────────────────────────────────────────────────────────┘

Current State                        Target State
┌────────────────────┐              ┌──────────────────────────┐
│ Filters:           │              │ Filters:                 │
│ - Populares        │              │ - Populares              │
│ - Favoritos        │    →        │ - Favoritos              │
│ - Age Rating       │              │ - Age Rating             │
│                    │              │ - Gênero (NEW)           │
│                    │              │ - Espécie (NEW)          │
└────────────────────┘              └──────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Component Architecture                     │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ DiscoverTab Component                                   │
│  ├─ FilterPanel (Desktop: Sidebar, Mobile: Sheet)       │
│  │   ├─ ViewModeToggle (Populares/Favoritos)           │
│  │   ├─ AgeRatingFilter (existing)                      │
│  │   ├─ GenderFilter (NEW)                              │
│  │   ├─ SpeciesFilter (NEW)                             │
│  │   └─ ClearFiltersButton                              │
│  └─ CharacterGrid (filtered results)                    │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│ useCharacterFilters Hook                                │
│  ├─ Filter state management                             │
│  ├─ LocalStorage persistence                            │
│  ├─ Filter combination logic                            │
│  └─ API query builder                                   │
└─────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│ Character Service API                                    │
│  ├─ GET /api/v1/characters?gender[]=male&species[]=elf  │
│  └─ GET /api/v1/characters/filter-options              │
│       (returns available genders/species with counts)   │
└─────────────────────────────────────────────────────────┘

Data Flow:
1. Component mounts → Load filter options from API
2. User selects gender filter → Update filter state
3. Filter state change → Trigger API request with filters
4. API returns filtered characters → Update character grid
5. Update counts for other filter options (dynamic)
```

---

## Implementation Details

### Phase 1: Backend - Filter Options Endpoint (1 hour)

#### Create Filter Options Endpoint

**Purpose**: Return available filter values and their counts

**File**: `backend/src/routes/v1/characters.ts`

**New Endpoint**:
```typescript
/**
 * GET /api/v1/characters/filter-options
 *
 * Returns available filter values with counts
 * Respects user's age rating restrictions
 */
router.get('/filter-options', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { ageRatings } = req.query;

    // Base filters (age rating, public visibility)
    const baseFilters = {
      visibility: 'PUBLIC',
      ageRating: {
        in: ageRatings ? ageRatings.split(',') : ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN']
      }
    };

    // Get gender distribution
    const genderCounts = await prisma.character.groupBy({
      by: ['gender'],
      where: baseFilters,
      _count: { gender: true },
    });

    // Get species distribution
    const speciesCounts = await prisma.character.groupBy({
      by: ['species'],
      where: baseFilters,
      _count: { species: true },
    });

    res.json({
      genders: genderCounts.map(g => ({
        value: g.gender || 'unknown',
        label: formatGenderLabel(g.gender),
        count: g._count.gender
      })),
      species: speciesCounts.map(s => ({
        value: s.species || 'unknown',
        label: formatSpeciesLabel(s.species),
        count: s._count.species
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load filter options' });
  }
});

// Helper functions
function formatGenderLabel(gender: string | null): string {
  if (!gender) return 'Unknown';
  const labels: Record<string, string> = {
    'male': 'Male',
    'female': 'Female',
    'non-binary': 'Non-Binary',
    'other': 'Other'
  };
  return labels[gender.toLowerCase()] || gender;
}

function formatSpeciesLabel(species: string | null): string {
  if (!species) return 'Unknown';
  const labels: Record<string, string> = {
    'human': 'Human',
    'elf': 'Elf',
    'robot': 'Robot',
    'furry': 'Furry',
    'demon': 'Demon',
    'angel': 'Angel',
    'vampire': 'Vampire',
    'other': 'Other'
  };
  return labels[species.toLowerCase()] || species;
}
```

**Response Example**:
```json
{
  "genders": [
    { "value": "female", "label": "Female", "count": 342 },
    { "value": "male", "label": "Male", "count": 289 },
    { "value": "non-binary", "label": "Non-Binary", "count": 45 },
    { "value": "unknown", "label": "Unknown", "count": 12 }
  ],
  "species": [
    { "value": "human", "label": "Human", "count": 456 },
    { "value": "elf", "label": "Elf", "count": 123 },
    { "value": "robot", "label": "Robot", "count": 89 },
    { "value": "furry", "label": "Furry", "count": 67 },
    { "value": "unknown", "label": "Unknown", "count": 23 }
  ]
}
```

---

### Phase 2: Backend - Update Character List Endpoint (30 min)

#### Add Gender & Species Filters to Existing Endpoint

**File**: `backend/src/controllers/characterController.ts`

**Modify `getPublicCharacters` method**:

```typescript
async getPublicCharacters(req, res) {
  const {
    skip = 0,
    limit = 20,
    ageRatings,
    tags,
    search,
    gender, // NEW: can be single or array
    species, // NEW: can be single or array
  } = req.query;

  // Build filters
  const filters: any = {
    visibility: 'PUBLIC',
  };

  // Age rating filter (existing)
  if (ageRatings) {
    filters.ageRating = {
      in: Array.isArray(ageRatings) ? ageRatings : [ageRatings]
    };
  }

  // Gender filter (NEW)
  if (gender) {
    const genderArray = Array.isArray(gender) ? gender : [gender];
    filters.gender = {
      in: genderArray.map(g => g === 'unknown' ? null : g)
    };
  }

  // Species filter (NEW)
  if (species) {
    const speciesArray = Array.isArray(species) ? species : [species];
    filters.species = {
      in: speciesArray.map(s => s === 'unknown' ? null : s)
    };
  }

  // Search filter (existing)
  if (search) {
    filters.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  // Tags filter (existing)
  if (tags) {
    filters.tags = {
      hasSome: Array.isArray(tags) ? tags : [tags]
    };
  }

  // Get total count
  const total = await prisma.character.count({ where: filters });

  // Get characters
  const characters = await prisma.character.findMany({
    where: filters,
    skip: Number(skip),
    take: Number(limit),
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          conversations: true,
          favoritedBy: true,
          images: true
        }
      }
    }
  });

  res.json({
    characters,
    total,
    hasMore: Number(skip) + Number(limit) < total
  });
}
```

**API Examples**:
```
GET /api/v1/characters?gender=female&species=elf
GET /api/v1/characters?gender[]=female&gender[]=non-binary
GET /api/v1/characters?species[]=human&species[]=elf&ageRatings[]=L&ageRatings[]=TEN
```

---

### Phase 3: Frontend - Filter State Management Hook (1-1.5 hours)

#### Create `useCharacterFilters` Hook

**File**: `frontend/src/hooks/useCharacterFilters.ts`

**Purpose**: Centralized filter state management with localStorage persistence

```typescript
import { useState, useEffect } from 'react';

export interface CharacterFilters {
  viewMode: 'popular' | 'favorites';
  ageRatings: string[];
  genders: string[];
  species: string[];
  search?: string;
  tags?: string[];
}

const DEFAULT_FILTERS: CharacterFilters = {
  viewMode: 'popular',
  ageRatings: [],
  genders: [],
  species: [],
};

const STORAGE_KEY = 'charhub-character-filters';

export function useCharacterFilters() {
  const [filters, setFilters] = useState<CharacterFilters>(() => {
    // Load from localStorage on mount
    if (typeof window === 'undefined') return DEFAULT_FILTERS;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_FILTERS, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_FILTERS;
      }
    }
    return DEFAULT_FILTERS;
  });

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Update specific filter
  const updateFilter = <K extends keyof CharacterFilters>(
    key: K,
    value: CharacterFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Toggle array filters (checkboxes)
  const toggleArrayFilter = (key: 'ageRatings' | 'genders' | 'species', value: string) => {
    setFilters(prev => {
      const current = prev[key];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Count active filters
  const activeFiltersCount =
    filters.genders.length +
    filters.species.length +
    filters.ageRatings.length;

  return {
    filters,
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    activeFiltersCount,
  };
}
```

---

### Phase 4: Frontend - Filter Components (2-3 hours)

#### Create `GenderFilter` Component

**File**: `frontend/src/components/filters/GenderFilter.tsx`

```typescript
import { useEffect, useState } from 'react';
import { characterService } from '@/services/characterService';

interface GenderOption {
  value: string;
  label: string;
  count: number;
}

interface GenderFilterProps {
  selected: string[];
  onChange: (genders: string[]) => void;
}

export function GenderFilter({ selected, onChange }: GenderFilterProps) {
  const [options, setOptions] = useState<GenderOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const data = await characterService.getFilterOptions();
        setOptions(data.genders);
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, []);

  const handleToggle = (value: string) => {
    const updated = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value];
    onChange(updated);
  };

  if (loading) {
    return <div className="animate-pulse">Loading genders...</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Gênero</h3>
      <div className="space-y-1">
        {options.map(option => (
          <label
            key={option.value}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700 flex-1">
              {option.label}
            </span>
            <span className="text-xs text-gray-500">
              ({option.count})
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

#### Create `SpeciesFilter` Component

**File**: `frontend/src/components/filters/SpeciesFilter.tsx`

```typescript
// Similar implementation to GenderFilter
// Replace "gender" with "species" throughout
// Use species icons if available (optional enhancement)
```

#### Create `FilterPanel` Component

**File**: `frontend/src/components/filters/FilterPanel.tsx`

**Purpose**: Container for all filters with responsive layout

```typescript
import { CharacterFilters } from '@/hooks/useCharacterFilters';
import { GenderFilter } from './GenderFilter';
import { SpeciesFilter } from './SpeciesFilter';
import { AgeRatingFilter } from '@/components/ui/AgeRatingFilter';

interface FilterPanelProps {
  filters: CharacterFilters;
  onUpdateFilter: <K extends keyof CharacterFilters>(
    key: K,
    value: CharacterFilters[K]
  ) => void;
  onToggleArrayFilter: (
    key: 'ageRatings' | 'genders' | 'species',
    value: string
  ) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export function FilterPanel({
  filters,
  onUpdateFilter,
  onToggleArrayFilter,
  onClearFilters,
  activeFiltersCount,
}: FilterPanelProps) {
  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Filtros</h2>
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-primary hover:underline"
          >
            Limpar ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Age Rating Filter (existing) */}
      <AgeRatingFilter
        selected={filters.ageRatings}
        onChange={(ratings) => onUpdateFilter('ageRatings', ratings)}
      />

      {/* Gender Filter (NEW) */}
      <GenderFilter
        selected={filters.genders}
        onChange={(genders) => onUpdateFilter('genders', genders)}
      />

      {/* Species Filter (NEW) */}
      <SpeciesFilter
        selected={filters.species}
        onChange={(species) => onUpdateFilter('species', species)}
      />
    </div>
  );
}
```

---

### Phase 5: Frontend - Mobile Filter Sheet (1 hour)

#### Create `MobileFilterSheet` Component

**File**: `frontend/src/components/filters/MobileFilterSheet.tsx`

**Purpose**: Bottom sheet for mobile filter access

```typescript
import { useState } from 'react';
import { FilterPanel } from './FilterPanel';

interface MobileFilterSheetProps {
  // Same props as FilterPanel
}

export function MobileFilterSheet(props: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-primary text-white rounded-full p-4 shadow-lg"
      >
        <FilterIcon className="w-6 h-6" />
        {props.activeFiltersCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {props.activeFiltersCount}
          </span>
        )}
      </button>

      {/* Bottom Sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet Content */}
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-xl shadow-xl max-h-[80vh] overflow-y-auto transform transition-transform">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold">Filtros</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <FilterPanel {...props} />
            </div>

            {/* Apply Button */}
            <div className="sticky bottom-0 bg-white border-t p-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
```

---

### Phase 6: Frontend - Integrate Filters into Dashboard (1.5 hours)

#### Update Dashboard Component

**File**: `frontend/src/pages/dashboard/index.tsx`

**Current Structure**:
```typescript
// Discover Tab
<Tab label="discover">
  <ViewModeToggle /> {/* Populares/Favoritos */}
  <CharacterGrid characters={characters} />
</Tab>
```

**New Structure**:
```typescript
import { useCharacterFilters } from '@/hooks/useCharacterFilters';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { MobileFilterSheet } from '@/components/filters/MobileFilterSheet';

function DiscoverTab() {
  const {
    filters,
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    activeFiltersCount,
  } = useCharacterFilters();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  // Load characters when filters change
  useEffect(() => {
    const loadCharacters = async () => {
      setLoading(true);
      try {
        const data = filters.viewMode === 'popular'
          ? await characterService.getPopular({
              limit: 20,
              ageRatings: filters.ageRatings,
              genders: filters.genders,
              species: filters.species,
            })
          : await characterService.getFavorites({
              limit: 20,
              ageRatings: filters.ageRatings,
              genders: filters.genders,
              species: filters.species,
            });

        setCharacters(data.characters);
      } finally {
        setLoading(false);
      }
    };

    loadCharacters();
  }, [filters]);

  return (
    <div className="flex gap-6">
      {/* Desktop Sidebar Filters */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <FilterPanel
          filters={filters}
          onUpdateFilter={updateFilter}
          onToggleArrayFilter={toggleArrayFilter}
          onClearFilters={clearFilters}
          activeFiltersCount={activeFiltersCount}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* View Mode Toggle */}
        <div className="mb-4">
          <ViewModeToggle
            mode={filters.viewMode}
            onChange={(mode) => updateFilter('viewMode', mode)}
          />
        </div>

        {/* Characters Grid */}
        {loading ? (
          <LoadingSkeleton />
        ) : characters.length === 0 ? (
          <EmptyState message="Nenhum personagem encontrado com os filtros selecionados" />
        ) : (
          <CharacterGrid characters={characters} />
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <div className="lg:hidden">
        <MobileFilterSheet
          filters={filters}
          onUpdateFilter={updateFilter}
          onToggleArrayFilter={toggleArrayFilter}
          onClearFilters={clearFilters}
          activeFiltersCount={activeFiltersCount}
        />
      </div>
    </div>
  );
}
```

---

### Phase 7: Frontend - Update Character Service (30 min)

#### Add Filter Parameters to Service Methods

**File**: `frontend/src/services/characterService.ts`

```typescript
interface GetCharactersParams {
  limit: number;
  skip?: number;
  ageRatings?: string[];
  genders?: string[]; // NEW
  species?: string[]; // NEW
  tags?: string[];
  search?: string;
}

async getPopular(params: GetCharactersParams): Promise<CharacterListResponse> {
  const queryParams = new URLSearchParams({
    skip: (params.skip || 0).toString(),
    limit: params.limit.toString(),
  });

  // Age ratings
  params.ageRatings?.forEach(rating =>
    queryParams.append('ageRatings', rating)
  );

  // Genders (NEW)
  params.genders?.forEach(gender =>
    queryParams.append('gender', gender)
  );

  // Species (NEW)
  params.species?.forEach(species =>
    queryParams.append('species', species)
  );

  const response = await api.get(`/characters?${queryParams}`);

  return {
    characters: response.data.characters,
    total: response.data.total,
    hasMore: response.data.hasMore,
  };
}

// NEW: Get filter options
async getFilterOptions(): Promise<{
  genders: Array<{ value: string; label: string; count: number }>;
  species: Array<{ value: string; label: string; count: number }>;
}> {
  const response = await api.get('/characters/filter-options');
  return response.data;
}
```

---

## Testing Strategy

### Unit Tests

**File**: `frontend/src/hooks/__tests__/useCharacterFilters.test.ts`

```typescript
describe('useCharacterFilters', () => {
  test('initializes with default filters', () => {
    const { result } = renderHook(() => useCharacterFilters());
    expect(result.current.filters.genders).toEqual([]);
    expect(result.current.filters.species).toEqual([]);
  });

  test('toggles gender filter', () => {
    const { result } = renderHook(() => useCharacterFilters());

    act(() => {
      result.current.toggleArrayFilter('genders', 'female');
    });

    expect(result.current.filters.genders).toContain('female');
  });

  test('persists filters to localStorage', () => {
    const { result } = renderHook(() => useCharacterFilters());

    act(() => {
      result.current.toggleArrayFilter('species', 'elf');
    });

    const stored = JSON.parse(localStorage.getItem('charhub-character-filters')!);
    expect(stored.species).toContain('elf');
  });
});
```

### Integration Tests

**File**: `frontend/src/pages/dashboard/__tests__/filters.test.tsx`

```typescript
describe('Discovery Filters', () => {
  test('applies gender filter and updates results', async () => {
    render(<DiscoverTab />);

    // Select female gender
    const femaleCheckbox = screen.getByLabelText(/Female/i);
    fireEvent.click(femaleCheckbox);

    await waitFor(() => {
      // Verify API was called with gender filter
      expect(mockCharacterService.getPopular).toHaveBeenCalledWith(
        expect.objectContaining({ genders: ['female'] })
      );
    });
  });

  test('combines multiple filters (gender + species + age)', async () => {
    render(<DiscoverTab />);

    // Select filters
    fireEvent.click(screen.getByLabelText(/Female/i));
    fireEvent.click(screen.getByLabelText(/Elf/i));
    fireEvent.click(screen.getByLabelText(/18\+/i));

    await waitFor(() => {
      expect(mockCharacterService.getPopular).toHaveBeenCalledWith(
        expect.objectContaining({
          genders: ['female'],
          species: ['elf'],
          ageRatings: ['EIGHTEEN']
        })
      );
    });
  });

  test('clears all filters', async () => {
    render(<DiscoverTab />);

    // Apply filters
    fireEvent.click(screen.getByLabelText(/Female/i));

    // Clear
    fireEvent.click(screen.getByText(/Limpar/i));

    await waitFor(() => {
      expect(mockCharacterService.getPopular).toHaveBeenCalledWith(
        expect.objectContaining({
          genders: [],
          species: []
        })
      );
    });
  });
});
```

### Backend Tests

**File**: `backend/src/routes/v1/__tests__/characters.test.ts`

```typescript
describe('GET /api/v1/characters with filters', () => {
  test('filters by gender', async () => {
    const response = await request(app)
      .get('/api/v1/characters?gender=female')
      .expect(200);

    expect(response.body.characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gender: 'female' })
      ])
    );
  });

  test('filters by species', async () => {
    const response = await request(app)
      .get('/api/v1/characters?species=elf')
      .expect(200);

    expect(response.body.characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ species: 'elf' })
      ])
    );
  });

  test('combines gender + species filters', async () => {
    const response = await request(app)
      .get('/api/v1/characters?gender=female&species=elf')
      .expect(200);

    expect(response.body.characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gender: 'female',
          species: 'elf'
        })
      ])
    );
  });
});

describe('GET /api/v1/characters/filter-options', () => {
  test('returns gender and species counts', async () => {
    const response = await request(app)
      .get('/api/v1/characters/filter-options')
      .expect(200);

    expect(response.body).toHaveProperty('genders');
    expect(response.body).toHaveProperty('species');
    expect(response.body.genders[0]).toHaveProperty('count');
  });
});
```

---

## Success Metrics

### Quantitative Metrics
- **Filter Usage**: % of users who use gender/species filters
- **Discovery Improvement**: Reduction in time to find desired character (target: 60-70%)
- **Engagement**: Increase in character interactions after using filters (target: 30-40%)
- **API Performance**: Filter queries < 300ms

### Qualitative Metrics
- **User Feedback**: Positive feedback on filter usefulness
- **UX**: Smooth and intuitive filter experience
- **Accessibility**: Keyboard navigation and screen reader support

### Validation Criteria
- [ ] Gender and species filters visible and functional
- [ ] Multi-select works correctly
- [ ] Filters combine properly (AND logic)
- [ ] Counts update dynamically
- [ ] Mobile filter sheet works smoothly
- [ ] localStorage persistence works
- [ ] No performance degradation

---

## Rollout Strategy

### Phase 1: Development (6-8 hours)

**Backend** (2 hours):
1. Create filter-options endpoint (1 hour)
2. Update character list endpoint (30 min)
3. Write backend tests (30 min)

**Frontend** (4-6 hours):
1. Create useCharacterFilters hook (1.5 hours)
2. Create filter components (2-3 hours)
3. Create mobile filter sheet (1 hour)
4. Integrate into dashboard (1.5 hours)
5. Update character service (30 min)

### Phase 2: Testing (2-3 hours)

**Tasks**:
1. Unit tests (1 hour)
2. Integration tests (1 hour)
3. Manual testing (1 hour)

### Phase 3: Staging & Production (1 hour)

**Tasks**:
1. Deploy to staging
2. Smoke test
3. Deploy to production
4. Monitor metrics

**Total Estimated Time**: 9-12 hours

---

## Risks & Mitigation

### Risk 1: Inconsistent Gender/Species Data
**Probability**: Medium
**Impact**: Medium

**Mitigation**:
- Handle null/undefined values gracefully ("Unknown" category)
- Data cleanup script to standardize existing values
- Add validation on character creation

### Risk 2: Performance with Many Filters
**Probability**: Low
**Impact**: Low

**Mitigation**:
- Ensure database indexes on gender and species columns
- Monitor query performance
- Consider caching filter options

### Risk 3: Mobile UX Complexity
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- Extensive mobile testing
- Simple, intuitive bottom sheet design
- Clear visual feedback

---

## Dependencies

### Backend
- Prisma ORM (groupBy queries)
- Existing character model (gender, species fields)

### Frontend
- React hooks
- localStorage API
- Existing character service
- Existing age rating filter component

---

## Related Documentation

- **Dashboard**: `frontend/src/pages/dashboard/index.tsx`
- **Character Service**: `frontend/src/services/characterService.ts`
- **Character API**: `backend/src/routes/v1/characters.ts`
- **Database Schema**: `backend/prisma/schema.prisma` (lines 309-310)

---

## Notes for Agent Coder

### Implementation Priority
**HIGH** - Critical for content discovery and user experience

### Estimated Effort
- **Optimistic**: 8 hours
- **Realistic**: 10 hours
- **Pessimistic**: 14 hours

**Recommendation**: Allocate 10 hours

### Quick Start

```bash
# 1. Create branch
git checkout -b feature/discovery-enhanced-filters

# 2. Backend first
cd backend
# Create filter-options endpoint
# Update character list endpoint
npm test

# 3. Frontend
cd frontend
# Create hooks and components
# Integrate into dashboard
npm test

# 4. Test end-to-end
npm run dev
# Test filters in browser

# 5. Create PR
```

### Key Considerations

1. **Data Quality**: Check current gender/species data distribution
2. **Performance**: Ensure database indexes exist
3. **Mobile UX**: Test on real mobile devices
4. **Accessibility**: Keyboard navigation and ARIA labels
5. **i18n**: Consider internationalization for filter labels

---

**End of Specification**

🎯 Ready for implementation - Focus on clean filter UX and responsive design!
