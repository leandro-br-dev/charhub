import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox, Transition } from '@headlessui/react';
import { type Asset, ASSET_TYPE_LABELS, ASSET_CATEGORY_LABELS, type AssetType, type AssetCategory } from '../../types/assets';

export interface AssetOption {
  value: string;
  label: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  type?: AssetType;
  category?: AssetCategory;
}

export interface AssetPickerProps {
  assets: Array<Asset | AssetOption>;
  selectedIds?: string[];
  onSelect: (assets: Array<Asset | AssetOption>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  loading?: boolean;
  enableFilters?: boolean;
  multiSelect?: boolean;
}

/**
 * AssetPicker - A reusable dropdown component for selecting assets
 *
 * Features:
 * - Displays thumbnail + name side by side
 * - Search/filter functionality
 * - Type and category filters
 * - Multi-select support
 * - Asset count display
 * - Visual feedback for hover and selection
 * - Accessible keyboard navigation
 *
 * @example
 * ```tsx
 * <AssetPicker
 *   assets={assetList}
 *   selectedIds={selectedAssetIds}
 *   onSelect={(assets) => setSelectedAssetIds(assets.map(a => a.id))}
 *   multiSelect={true}
 *   enableFilters={true}
 * />
 * ```
 */
export const AssetPicker = ({
  assets,
  selectedIds = [],
  onSelect,
  placeholder,
  disabled = false,
  className = '',
  searchable = true,
  loading = false,
  enableFilters = false,
  multiSelect = false,
}: AssetPickerProps) => {
  const { t } = useTranslation('assets');
  const [query, setQuery] = useState('');
  const [optionsStyle, setOptionsStyle] = useState({});
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const comboboxRef = useRef<HTMLDivElement>(null);

  const resolvedPlaceholder =
    placeholder ?? t('picker.searchPlaceholder', 'Search assets by name...');

  const calculatePosition = useCallback(() => {
    requestAnimationFrame(() => {
      if (comboboxRef.current) {
        const rect = comboboxRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeightEstimate = 400;
        const openUpwards =
          spaceBelow < dropdownHeightEstimate && rect.top > spaceBelow;

        setOptionsStyle({
          position: 'absolute',
          width: '100%',
          ...(openUpwards
            ? { bottom: 'calc(100% + 4px)' }
            : { top: 'calc(100% + 4px)' }),
        });
      }
    });
  }, []);

  // Normalize asset data to AssetOption format
  const normalizedOptions: AssetOption[] = assets.map((asset) => {
    if ('value' in asset && 'label' in asset) {
      return asset as AssetOption;
    }
    const fullAsset = asset as Asset;

    return {
      value: fullAsset.id,
      label: fullAsset.name,
      thumbnailUrl: fullAsset.thumbnailUrl,
      previewUrl: fullAsset.previewUrl,
      type: fullAsset.type,
      category: fullAsset.category,
    };
  });

  // Filter options based on search query, type, and category
  const filteredOptions = normalizedOptions.filter((option) => {
    // Search filter
    const matchesSearch =
      query === '' ||
      option.label.toLowerCase().includes(query.toLowerCase()) ||
      (option.type && ASSET_TYPE_LABELS[option.type].toLowerCase().includes(query.toLowerCase())) ||
      (option.category && ASSET_CATEGORY_LABELS[option.category].toLowerCase().includes(query.toLowerCase()));

    // Type filter
    const matchesType = typeFilter === 'all' || option.type === typeFilter;

    // Category filter
    const matchesCategory = categoryFilter === 'all' || option.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Get asset counts for display
  const totalCount = normalizedOptions.length;
  const filteredCount = filteredOptions.length;

  // Get selected assets
  const selectedOptions = normalizedOptions.filter((opt) => selectedIds.includes(opt.value));

  // Display value for single select
  const displayValue = multiSelect
    ? t('picker.selectedCount', { count: selectedOptions.length, defaultValue: '{{count}} selected' })
    : selectedOptions[0]?.label || '';

  const handleChange = (selectedOptions: AssetOption | AssetOption[] | null) => {
    if (!selectedOptions) {
      onSelect([]);
      return;
    }

    const optionsArray = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];

    // Find the original asset objects to pass back
    const originalAssets = optionsArray
      .map((selectedOption) => {
        return assets.find(
          (asset) =>
            (asset as Asset).id === selectedOption.value ||
            ('value' in asset && asset.value === selectedOption.value)
        );
      })
      .filter((asset): asset is Asset | AssetOption => asset !== undefined);

    onSelect(originalAssets);
  };

  const handleClearFilters = useCallback(() => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setQuery('');
  }, []);

  const wrapperBaseClasses = 'relative w-full';
  const inputBaseClasses =
    'w-full rounded-lg pl-3 pr-10 py-2.5 text-sm shadow-sm border focus:ring-2 focus:outline-none';
  const buttonBaseClasses =
    'absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer';
  const optionsBaseClasses =
    'absolute z-50 mt-1 w-full max-h-96 overflow-auto rounded-lg border border-border bg-light dark:bg-gray-800 py-1 text-sm shadow-lg';
  const optionBaseClasses = 'cursor-pointer select-none px-3 py-2';

  const variants = {
    input:
      'bg-light dark:bg-gray-700 text-content border-border focus:border-primary focus:ring-primary',
    button: 'text-muted hover:text-content',
    option: {
      active: 'bg-primary/10 dark:bg-primary/20 text-primary',
      inactive: 'text-content',
      selected: 'bg-primary/20 dark:bg-primary/30 text-primary font-medium',
    },
  };

  return (
    <div className={`${wrapperBaseClasses} ${className}`.trim()}>
      <Combobox
        value={multiSelect ? selectedOptions : selectedOptions[0] || null}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiSelect}
      >
        {({ open }) => {
          useEffect(() => {
            if (open) {
              calculatePosition();
              window.addEventListener('resize', calculatePosition);
              window.addEventListener('scroll', calculatePosition, true);
            }
            return () => {
              window.removeEventListener('resize', calculatePosition);
              window.removeEventListener('scroll', calculatePosition, true);
            };
          }, [open, calculatePosition]);

          return (
            <div className="relative" ref={comboboxRef}>
              <Combobox.Input
                className={`${inputBaseClasses} ${variants.input}`}
                onChange={(event) => {
                  if (searchable) {
                    setQuery(event.target.value);
                  }
                }}
                placeholder={resolvedPlaceholder}
                displayValue={() => displayValue}
                readOnly={!searchable}
              />
              <Combobox.Button className={`${buttonBaseClasses} ${variants.button}`}>
                <span className="material-symbols-outlined text-base">
                  unfold_more
                </span>
              </Combobox.Button>

              <Transition
                as={Fragment}
                show={open}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => {
                  setQuery('');
                  if (!enableFilters) {
                    setTypeFilter('all');
                    setCategoryFilter('all');
                  }
                }}
              >
                <Combobox.Options
                  static
                  className={optionsBaseClasses}
                  style={optionsStyle}
                >
                  {/* Filters Section */}
                  {enableFilters && (
                    <div className="px-3 py-2 border-b border-border dark:border-gray-600">
                      {/* Type Filter */}
                      <div className="mb-2">
                        <label className="text-xs text-muted mb-1 block">
                          {t('picker.filterByType', 'Filter by type')}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setTypeFilter('all')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              typeFilter === 'all'
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            {t('picker.allTypes', 'All')}
                          </button>
                          {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setTypeFilter(type)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                typeFilter === type
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              {t(`types.${type.toLowerCase()}`, ASSET_TYPE_LABELS[type])}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Category Filter */}
                      <div className="mb-2">
                        <label className="text-xs text-muted mb-1 block">
                          {t('picker.filterByCategory', 'Filter by category')}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setCategoryFilter('all')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              categoryFilter === 'all'
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500'
                            }`}
                          >
                            {t('picker.allCategories', 'All')}
                          </button>
                          {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => setCategoryFilter(category)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                categoryFilter === category
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              {t(`categories.${category.toLowerCase()}`, ASSET_CATEGORY_LABELS[category])}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Clear Filters */}
                      {(typeFilter !== 'all' || categoryFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="text-xs text-primary hover:underline"
                        >
                          {t('picker.clearFilters', 'Clear filters')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Asset Count */}
                  {!loading && totalCount > 0 && (
                    <div className="px-3 py-1 text-xs text-muted border-b border-border dark:border-gray-600">
                      {filteredCount === totalCount
                        ? t('picker.showingCount', {
                            count: filteredCount,
                            total: totalCount,
                            defaultValue: 'Showing {{count}} of {{total}}',
                          })
                        : `${filteredCount} / ${totalCount}`}
                    </div>
                  )}

                  {loading && (
                    <div className="px-3 py-4 text-center text-muted">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      <p className="text-xs mt-2">{t('picker.loading', 'Loading...')}</p>
                    </div>
                  )}

                  {!loading && filteredOptions.length === 0 && query !== '' && (
                    <div className="px-3 py-2 text-muted text-center">
                      {t('picker.noAssetsFound', 'No assets found')}
                    </div>
                  )}

                  {!loading && filteredOptions.length === 0 && query === '' && (typeFilter !== 'all' || categoryFilter !== 'all') && (
                    <div className="px-3 py-2 text-muted text-center">
                      {t('picker.noAssetsMatchFilters', 'No assets match your filters')}
                    </div>
                  )}

                  {!loading && filteredOptions.length === 0 && query === '' && typeFilter === 'all' && categoryFilter === 'all' && (
                    <div className="px-3 py-2 text-muted text-center">
                      {t('picker.noAssetsAvailable', 'No assets available')}
                    </div>
                  )}

                  {!loading &&
                    filteredOptions.map((option) => {
                      const isSelected = selectedIds.includes(option.value);
                      return (
                        <Combobox.Option
                          key={option.value}
                          value={option}
                          className={({ active }) =>
                            `${optionBaseClasses} flex items-center gap-3 ${
                              active
                                ? variants.option.active
                                : isSelected
                                ? variants.option.selected
                                : variants.option.inactive
                            }`
                          }
                        >
                          {option.thumbnailUrl || option.previewUrl ? (
                            <img
                              src={option.thumbnailUrl || option.previewUrl || undefined}
                              alt={option.label}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-lg text-slate-400">
                                image
                              </span>
                            </div>
                          )}
                          <div className="flex-grow min-w-0">
                            <span className="block truncate">{option.label}</span>
                            <span className="text-xs text-muted">
                              {option.type && ASSET_TYPE_LABELS[option.type]}
                              {option.type && option.category && ' • '}
                              {option.category && ASSET_CATEGORY_LABELS[option.category]}
                            </span>
                          </div>
                          {isSelected && !multiSelect && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              check
                            </span>
                          )}
                          {multiSelect && isSelected && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              check_box
                            </span>
                          )}
                          {multiSelect && !isSelected && (
                            <span className="material-symbols-outlined text-sm text-muted">
                              check_box_outline_blank
                            </span>
                          )}
                        </Combobox.Option>
                      );
                    })}
                </Combobox.Options>
              </Transition>
            </div>
          );
        }}
      </Combobox>
    </div>
  );
};

export default AssetPicker;
