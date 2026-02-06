import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { FavoriteButton } from '../../../../components/ui/FavoriteButton';
import { assetService } from '../../../../services/assetService';
import { useAuth } from '../../../../hooks/useAuth';
import type { Asset } from '../../../../types/assets';

type AssetListSidebarProps = {
  onLinkClick?: () => void;
};

interface AssetWithFavorite extends Asset {
  isFavorite: boolean;
  isOwn: boolean;
}

export function AssetListSidebar({ onLinkClick }: AssetListSidebarProps): JSX.Element {
  const { t } = useTranslation(['assets', 'navigation', 'common']);
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetWithFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      // Only load if user is authenticated
      if (!user) {
        setAssets([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch user's own assets and favorites in parallel
        const [ownResponse, favoriteResponse] = await Promise.all([
          assetService.list({ limit: 15 }),
          assetService.getFavorites(15),
        ]);

        // Track which IDs are already added to avoid duplicates
        const addedIds = new Set<string>();
        const combined: AssetWithFavorite[] = [];

        // Add favorite assets FIRST
        for (const asset of favoriteResponse) {
          if (!addedIds.has(asset.id)) {
            combined.push({
              ...asset,
              isOwn: asset.authorId === user.id,
              isFavorite: true,
            });
            addedIds.add(asset.id);
          }
        }

        // Add remaining own assets (not already in favorites)
        for (const asset of ownResponse.items) {
          if (!addedIds.has(asset.id)) {
            combined.push({
              ...asset,
              isOwn: true,
              isFavorite: false,
            });
            addedIds.add(asset.id);
          }
        }

        // Limit to 15 total
        const limited = combined.slice(0, 15);

        setAssets(limited);
      } catch (err) {
        setError('Failed to load assets.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [user]);

  const handleCreateAsset = () => {
    onLinkClick?.();
    window.location.href = '/assets/create';
  };

  const handleNavigateToHub = () => {
    onLinkClick?.();
    window.location.href = '/assets/hub';
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-col gap-4 py-6">
        <div className="px-6">
          <h2 className="text-base font-semibold text-content">
            {t('assets:hub.title', 'Assets')}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {t('assets:hub.sidebar.description', 'Browse and manage your creative assets.')}
          </p>
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-muted">Loading assets...</div>
        ) : error ? (
          <div className="p-4 text-sm text-danger">{error}</div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-muted px-6">{t('assets:sidebar.noAssetsFound', 'No assets found.')}</p>
        ) : (
          <ul className="space-y-1 px-2">
            {assets.map(asset => {
              const title = asset.name || t('assets:labels.untitledAsset', 'Unnamed Asset');
              const thumbnailUrl = asset.thumbnailUrl || asset.previewUrl;
              return (
                <li key={asset.id}>
                  <Link
                    to={`/assets/${asset.id}`}
                    onClick={onLinkClick}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {thumbnailUrl ? (
                      <CachedImage src={thumbnailUrl} alt={title} className="h-8 w-8 rounded-md object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg text-muted">inventory_2</span>
                      </div>
                    )}
                    <div className="flex flex-col flex-grow min-w-0">
                      <span className="text-sm font-medium text-content truncate">{title}</span>
                      <div className="flex items-center gap-1">
                        {asset.isOwn && (
                          <span className="text-xs text-muted">{t('assets:sidebar.myAsset', 'My asset')}</span>
                        )}
                      </div>
                    </div>
                    {asset.isFavorite && (
                      <FavoriteButton
                        assetId={asset.id}
                        initialIsFavorited={true}
                        size="small"
                        readOnly={true}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 p-4">
        <Button
          variant="primary"
          icon="add"
          onClick={handleCreateAsset}
        >
          {t('assets:hub.actions.newAsset', 'New Asset')}
        </Button>
        <Button
          variant="secondary"
          icon="inventory_2"
          onClick={handleNavigateToHub}
        >
          {t('assets:hub.sidebar.viewGallery', 'View Gallery')}
        </Button>
      </div>
    </div>
  );
}
