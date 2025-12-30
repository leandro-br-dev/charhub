import { useState, useEffect } from 'react';

export interface CharacterFilters {
  genders: string[];
  species: string[];
}

const DEFAULT_FILTERS: CharacterFilters = {
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
  const toggleArrayFilter = (key: 'genders' | 'species', value: string) => {
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
    filters.species.length;

  return {
    filters,
    updateFilter,
    toggleArrayFilter,
    clearFilters,
    activeFiltersCount,
  };
}
