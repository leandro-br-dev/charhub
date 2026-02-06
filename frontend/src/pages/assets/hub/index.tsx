import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AssetCard } from '../shared/components/AssetCard';
import { useAssetListQuery, useAssetMutations } from '../shared/hooks/useAssetQueries';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { assetService } from '../../../services/assetService';
import type { AssetType, AssetCategory } from '../../../types/assets';

type ViewMode = 'private' | 'public';

export default function AssetHubPage(): JSX.Element {
  const { t } = useTranslation(['assets', 'common']);
  const navigate = useNavigate();
  const { setTitle } = usePageHeader();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('private');
  const [selectedTypes, setSelectedTypes] = useState<AssetType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<AssetCategory[]>([]);

  // Set page title
  useEffect(() => {
    setTitle(t('assets:hub.title', 'Assets'));
  }, [setTitle, t]);

  const filters = useMemo(() => {
    const params: {
      search?: string;
      types?: AssetType[];
      categories?: AssetCategory[];
      public?: boolean;
    } = {};

    if (search.trim()) {
      params.search = search.trim();
    }
    if (selectedTypes.length > 0) {
      params.types = selectedTypes;
    }
    if (selectedCategories.length > 0) {
      params.categories = selectedCategories;
    }
    if (viewMode === 'private') {
      params.public = false; // Request only user's own assets
    }
    // When viewMode is 'public', don't set any filter - backend will return public + own
    return params;
  }, [search, selectedTypes, selectedCategories, viewMode]);

  const { data, isLoading, isError, refetch } = useAssetListQuery(filters);
  const { deleteMutation } = useAssetMutations();

  const items = data?.items ?? [];

  const handleDelete = useCallback(
    async (assetId: string) => {
      try {
        await deleteMutation.mutateAsync(assetId);
        // Refetch to update the list
        refetch();
      } catch (error) {
        console.error('[AssetHub] Failed to delete asset:', error);
      }
    },
    [deleteMutation, refetch]
  );

  const toggleTypeFilter = useCallback((type: AssetType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const toggleCategoryFilter = useCallback((category: AssetCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSearch('');
  }, []);

  const hasActiveFilters = selectedTypes.length > 0 || selectedCategories.length > 0 || search.trim().length > 0;

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">{t('assets:hub.title')}</h1>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="max-w-2xl text-sm text-description">
            {t('assets:hub.subtitle')}
          </p>
          <div className="flex gap-2">
            <Button type="button" icon="add" onClick={() => navigate('/assets/create')}>
              {t('assets:hub.actions.newAsset', 'New Asset')}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 rounded-xl border border-border bg-normal p-4 sm:p-6">
        {/* Tabs and Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-2xl border border-border bg-background p-1 text-sm">
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${viewMode === 'private' ? 'bg-card text-title shadow' : 'text-description'}`}
              onClick={() => setViewMode('private')}
            >
              {t('assets:hub.tabs.myAssets')}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-4 py-2 font-medium transition ${viewMode === 'public' ? 'bg-card text-title shadow' : 'text-description'}`}
              onClick={() => setViewMode('public')}
            >
              {t('assets:hub.tabs.publicGallery')}
            </button>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <Input
                type="search"
                icon="search"
                placeholder={t('assets:hub.filters.searchPlaceholder', 'Search by name or tag')}
                value={search}
                onChange={event => setSearch((event.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        </div>

        {/* Type and Category Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted self-center">{t('assets:hub.filters.type')}</span>
            {(['CLOTHING', 'ACCESSORY', 'SCAR', 'HAIRSTYLE', 'OBJECT', 'WEAPON', 'VEHICLE', 'FURNITURE', 'PROP'] as AssetType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleTypeFilter(type)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  selectedTypes.includes(type)
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {t(`assets:types.${type}`, type)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted self-center">{t('assets:hub.filters.category')}</span>
            {(['WEARABLE', 'HOLDABLE', 'ENVIRONMENTAL'] as AssetCategory[]).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategoryFilter(category)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  selectedCategories.includes(category)
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {t(`assets:categories.${category}`, category)}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-primary hover:underline self-start"
            >
              {t('assets:hub.filters.clear', 'Clear filters')}
            </button>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-description">
            <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
            <p>{t('assets:hub.states.loading')}</p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
            <span className="material-symbols-outlined text-6xl text-red-500">error</span>
            <p>{t('assets:hub.states.error')}</p>
            <Button type="button" variant="secondary" icon="refresh" onClick={() => refetch()}>
              {t('assets:hub.actions.retry')}
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && items.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
            <span className="material-symbols-outlined text-6xl">folder_open</span>
            <div className="space-y-2">
              <p>{t('assets:hub.states.empty', { context: viewMode })}</p>
              <p className="text-xs text-muted">
                {search || hasActiveFilters ? t('assets:hub.states.emptySearchHint') : t('assets:hub.states.emptyHint')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" icon="add" onClick={() => navigate('/assets/create')}>
                {t('assets:hub.actions.newAsset', 'New Asset')}
              </Button>
            </div>
          </div>
        )}

        {/* Asset Grid */}
        {!isLoading && !isError && items.length > 0 && (
          <div className="flex flex-wrap items-stretch gap-4">
            {items.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <footer className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
            <span>{t(items.length === 1 ? 'assets:hub.labels.total' : 'assets:hub.labels.total_plural', { count: items.length })}</span>
            <Link to="/assets/create" className="text-primary underline-offset-2 hover:underline">
              {t('assets:hub.labels.quickCreateLink')}
            </Link>
          </footer>
        )}
      </div>
    </section>
  );
}
