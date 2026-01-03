import { useTranslation } from 'react-i18next';
import { GenderFilter } from './GenderFilter';
import { SpeciesFilter } from './SpeciesFilter';
import type { CharacterFilters } from '../../hooks/useCharacterFilters';

interface FilterPanelProps {
  filters: CharacterFilters;
  onUpdateFilter: <K extends keyof CharacterFilters>(
    key: K,
    value: CharacterFilters[K]
  ) => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export function FilterPanel({
  filters,
  onUpdateFilter,
  onClearFilters,
  activeFiltersCount,
}: FilterPanelProps) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      {/* Gender Filter - responsive width */}
      <div className="flex-1 min-w-[140px] sm:flex-shrink-0 sm:w-[200px] sm:max-w-[200px] md:w-[220px] md:max-w-[220px] lg:w-[240px] lg:max-w-[240px]">
        <GenderFilter
          selected={filters.genders}
          onChange={(genders) => onUpdateFilter('genders', genders)}
        />
      </div>

      {/* Species Filter - responsive width */}
      <div className="flex-1 min-w-[140px] sm:flex-shrink-0 sm:w-[200px] sm:max-w-[200px] md:w-[220px] md:max-w-[220px] lg:w-[240px] lg:max-w-[240px]">
        <SpeciesFilter
          selected={filters.species}
          onChange={(species) => onUpdateFilter('species', species)}
        />
      </div>

      {/* Clear button - icon on mobile, text on desktop */}
      {activeFiltersCount > 0 && (
        <button
          onClick={onClearFilters}
          className="flex-shrink-0 px-2 sm:px-3 py-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          aria-label={t('filters.clear', 'Clear')}
        >
          <span className="hidden sm:inline">{t('filters.clear', 'Clear')}</span>
          <span className="sm:hidden">✕</span>
          <span className="sm:inline ml-1">({activeFiltersCount})</span>
        </button>
      )}
    </div>
  );
}
