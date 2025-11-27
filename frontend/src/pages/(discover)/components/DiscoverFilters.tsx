import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, X } from 'lucide-react';

export interface DiscoverFiltersState {
  search: string;
  gender: string;
  tags: string[];
  sortBy: 'popular' | 'recent' | 'newest';
}

interface DiscoverFiltersProps {
  filters: DiscoverFiltersState;
  onFiltersChange: (filters: DiscoverFiltersState) => void;
}

const AVAILABLE_TAGS = [
  'adventure',
  'romance',
  'fantasy',
  'sci-fi',
  'horror',
  'comedy',
  'drama',
  'mystery',
  'action',
];

export function DiscoverFilters({ filters, onFiltersChange }: DiscoverFiltersProps): JSX.Element {
  const { t } = useTranslation(['discover', 'common']);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleGenderChange = (value: string) => {
    onFiltersChange({ ...filters, gender: value });
  };

  const handleSortChange = (value: 'popular' | 'recent' | 'newest') => {
    onFiltersChange({ ...filters, sortBy: value });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      gender: '',
      tags: [],
      sortBy: 'popular',
    });
  };

  const hasActiveFilters = filters.search || filters.gender || filters.tags.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder={t('discover:searchPlaceholder')}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-light border border-border rounded-lg text-content placeholder-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Sort Dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) => handleSortChange(e.target.value as 'popular' | 'recent' | 'newest')}
          className="px-4 py-2 bg-light border border-border rounded-lg text-content focus:outline-none focus:border-primary transition-colors"
        >
          <option value="popular">{t('discover:sortPopular')}</option>
          <option value="recent">{t('discover:sortRecent')}</option>
          <option value="newest">{t('discover:sortNewest')}</option>
        </select>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showAdvanced || hasActiveFilters
              ? 'bg-primary text-black'
              : 'bg-light border border-border text-content hover:border-primary'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">{t('discover:filters')}</span>
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t('discover:clearFilters')}</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="p-4 bg-light border border-border rounded-lg space-y-4">
          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-medium text-title mb-2">
              {t('discover:gender')}
            </label>
            <div className="flex flex-wrap gap-2">
              {['', 'male', 'female', 'non-binary', 'other'].map((gender) => (
                <button
                  key={gender}
                  onClick={() => handleGenderChange(gender)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.gender === gender
                      ? 'bg-primary text-black'
                      : 'bg-dark text-content hover:bg-darker'
                  }`}
                >
                  {gender ? t(`discover:gender_${gender}`) : t('discover:allGenders')}
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-title mb-2">
              {t('discover:tags')}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-primary text-black'
                      : 'bg-dark text-content hover:bg-darker'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
