import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { AssetPicker } from '../../../../components/ui/AssetPicker';
import { useCharacterAssetsQuery, useCharacterAssetMutations } from '../../../assets/shared/hooks/useAssetQueries';
import { useAssetListQuery } from '../../../assets/shared/hooks/useAssetQueries';
import { assetService } from '../../../../services/assetService';
import type { CharacterAsset } from '../../../../types/assets';
import { ASSET_PLACEMENT_ZONE_LABELS } from '../../../../types/assets';
import { CachedImage } from '../../../../components/ui/CachedImage';

export interface AssetsTabProps {
  characterId: string;
}

export function AssetsTab({ characterId }: AssetsTabProps): JSX.Element {
  const { t } = useTranslation(['assets', 'common']);
  const [showPicker, setShowPicker] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CharacterAsset | null>(null);

  const { data: characterAssets = [], isLoading, refetch } = useCharacterAssetsQuery(characterId);

  // Fetch available assets for the picker (exclude already linked ones)
  const linkedAssetIds = characterAssets.map(ca => ca.assetId);
  const { data: availableAssetsData } = useAssetListQuery(
    {
      public: false, // Get user's own assets
      limit: 100,
    },
    {
      enabled: showPicker,
    }
  );

  // Create AssetOption format from AssetSummary for the picker
  const availableAssets = (availableAssetsData?.items ?? [])
    .filter(asset => !linkedAssetIds.includes(asset.id))
    .map(asset => ({
      value: asset.id,
      label: asset.name,
      thumbnailUrl: asset.thumbnailUrl,
      previewUrl: asset.previewUrl,
      type: asset.type,
      category: asset.category,
    }));

  const { linkMutation, unlinkMutation, updateMutation } = useCharacterAssetMutations();

  const handleLinkAssets = useCallback(
    async (assets: Array<{ id: string } | { value: string }>) => {
      const assetIds = assets.map(a => ('id' in a ? a.id : a.value));

      for (const assetId of assetIds) {
        try {
          await linkMutation.mutateAsync({
            characterId,
            assetId,
            isVisible: true,
            displayOrder: characterAssets.length,
          });
        } catch (error) {
          console.error('[AssetsTab] Failed to link asset:', error);
        }
      }

      setShowPicker(false);
      refetch();
    },
    [characterId, characterAssets.length, linkMutation, refetch]
  );

  const handleUnlinkAsset = useCallback(
    async (characterAssetId: string) => {
      try {
        await unlinkMutation.mutateAsync({
          characterAssetId,
          characterId,
        });
        refetch();
      } catch (error) {
        console.error('[AssetsTab] Failed to unlink asset:', error);
      }
    },
    [characterId, unlinkMutation, refetch]
  );

  const handleUpdatePlacementZone = useCallback(
    async (characterAssetId: string, placementZone: string) => {
      try {
        await updateMutation.mutateAsync({
          characterAssetId,
          params: { placementZone },
        });
        refetch();
      } catch (error) {
        console.error('[AssetsTab] Failed to update placement zone:', error);
      }
    },
    [updateMutation, refetch]
  );

  const handleToggleVisibility = useCallback(
    async (characterAsset: CharacterAsset) => {
      try {
        await updateMutation.mutateAsync({
          characterAssetId: characterAsset.id,
          params: { isVisible: !characterAsset.isVisible },
        });
        refetch();
      } catch (error) {
        console.error('[AssetsTab] Failed to toggle visibility:', error);
      }
    },
    [updateMutation, refetch]
  );

  const handleReorder = useCallback(
    async (characterAsset: CharacterAsset, direction: 'up' | 'down') => {
      const currentIndex = characterAssets.findIndex(ca => ca.id === characterAsset.id);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= characterAssets.length) return;

      const targetAsset = characterAssets[newIndex];

      try {
        // Swap display orders
        await Promise.all([
          updateMutation.mutateAsync({
            characterAssetId: characterAsset.id,
            params: { displayOrder: newIndex },
          }),
          updateMutation.mutateAsync({
            characterAssetId: targetAsset.id,
            params: { displayOrder: currentIndex },
          }),
        ]);
        refetch();
      } catch (error) {
        console.error('[AssetsTab] Failed to reorder assets:', error);
      }
    },
    [characterAssets, updateMutation, refetch]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-title">
          {t('assets:tab.title', 'Linked Assets')}
        </h2>
        <Button
          type="button"
          icon="add"
          variant="secondary"
          size="small"
          onClick={() => setShowPicker(!showPicker)}
        >
          {showPicker
            ? t('assets:tab.cancel', 'Cancel')
            : t('assets:tab.addAsset', 'Add Asset')}
        </Button>
      </div>

      {/* Asset Picker */}
      {showPicker && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium text-content mb-3">
            {t('assets:tab.selectAsset', 'Select assets to link')}
          </h3>
          <AssetPicker
            assets={availableAssets}
            selectedIds={[]}
            onSelect={handleLinkAssets}
            multiSelect={true}
            enableFilters={true}
            placeholder={t('assets:tab.searchPlaceholder', 'Search assets...')}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3 text-description">
            <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
            <p>{t('assets:tab.loading', 'Loading assets...')}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && characterAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-description">
          <span className="material-symbols-outlined text-6xl mb-3">folder_open</span>
          <p>{t('assets:tab.empty', 'No assets linked to this character')}</p>
          <p className="text-sm text-muted mt-1">
            {t('assets:tab.emptyHint', 'Click "Add Asset" to link assets from your library')}
          </p>
        </div>
      )}

      {/* Assets List */}
      {!isLoading && characterAssets.length > 0 && (
        <div className="space-y-3">
          {characterAssets
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((characterAsset, index) => {
              const asset = characterAsset.asset;
              if (!asset) return null;

              return (
                <div
                  key={characterAsset.id}
                  className={`flex items-center gap-4 rounded-lg border p-3 transition ${
                    characterAsset.isVisible
                      ? 'border-border bg-card'
                      : 'border-border/50 bg-card/50 opacity-60'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0">
                    {asset.previewUrl || asset.thumbnailUrl ? (
                      <CachedImage
                        src={asset.previewUrl || asset.thumbnailUrl || ''}
                        alt={asset.name}
                        className="w-16 h-16 rounded object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-slate-400">
                          image
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Asset Info */}
                  <div className="flex-grow min-w-0">
                    <h4 className="font-medium text-content truncate">{asset.name}</h4>
                    {asset.description && (
                      <p className="text-sm text-description line-clamp-1">
                        {asset.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted">
                        {t(`assets:types.${asset.type.toLowerCase()}`, asset.type)}
                      </span>
                      {characterAsset.placementZone && (
                        <>
                          <span className="text-xs text-muted">•</span>
                          <span className="text-xs text-muted">
                            {t(`assets:placementZones.${characterAsset.placementZone}`,
                              ASSET_PLACEMENT_ZONE_LABELS[characterAsset.placementZone] || characterAsset.placementZone)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleReorder(characterAsset, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title={t('assets:tab.moveUp', 'Move up')}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(characterAsset, 'down')}
                        disabled={index === characterAssets.length - 1}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title={t('assets:tab.moveDown', 'Move down')}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>
                    </div>

                    {/* Visibility toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(characterAsset)}
                      className={`p-2 rounded transition ${
                        characterAsset.isVisible
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : 'bg-gray-200 dark:bg-gray-600 text-muted hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                      title={t(
                        characterAsset.isVisible ? 'assets:tab.hide' : 'assets:tab.show',
                        characterAsset.isVisible ? 'Hide' : 'Show'
                      )}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {characterAsset.isVisible ? 'visibility' : 'visibility_off'}
                      </span>
                    </button>

                    {/* Placement selector */}
                    <select
                      value={characterAsset.placementZone || ''}
                      onChange={(e) =>
                        e.target.value && handleUpdatePlacementZone(characterAsset.id, e.target.value)
                      }
                      className="text-xs rounded border border-border bg-background px-2 py-1 text-content focus:border-primary focus:outline-none"
                      title={t('assets:tab.placement', 'Placement')}
                    >
                      <option value="">{t('assets:tab.noPlacement', 'No placement')}</option>
                      {(Object.keys(ASSET_PLACEMENT_ZONE_LABELS) as string[]).map((zone) => (
                        <option key={zone} value={zone}>
                          {t(`assets:placementZones.${zone}`,
                            ASSET_PLACEMENT_ZONE_LABELS[zone])}
                        </option>
                      ))}
                    </select>

                    {/* Unlink button */}
                    <button
                      type="button"
                      onClick={() => handleUnlinkAsset(characterAsset.id)}
                      className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
                      title={t('assets:tab.unlink', 'Unlink asset')}
                    >
                      <span className="material-symbols-outlined text-sm">link_off</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Stats footer */}
      {!isLoading && characterAssets.length > 0 && (
        <div className="text-xs text-muted text-center">
          {t('assets:tab.stats', {
            count: characterAssets.length,
            visible: characterAssets.filter(ca => ca.isVisible).length,
            defaultValue: '{{count}} assets linked ({{visible}} visible)',
          })}
        </div>
      )}
    </div>
  );
}
