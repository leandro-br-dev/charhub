import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { FavoriteButton } from '../../../../components/ui/FavoriteButton';
import { assetService } from '../../../../services/assetService';
import { useAuth } from '../../../../hooks/useAuth';
import type { Asset } from '../../../../types/assets';

type AssetListSidebarProps = {
  onLinkClick?: () => void;
};

interface AssetWithFavorite {
  id: string;
  name: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  authorId: string;
  isFavorite: boolean;
  isOwn: boolean;
}

export function AssetListSidebar({ onLinkClick }: AssetListSidebarProps) {
  const [assets, setAssets] = useState<AssetWithFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation('assets');

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
              id: asset.id,
              name: asset.name,
              thumbnailUrl: asset.thumbnailUrl,
              previewUrl: asset.previewUrl,
              authorId: asset.authorId,
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
              id: asset.id,
              name: asset.name,
              thumbnailUrl: asset.thumbnailUrl,
              previewUrl: asset.previewUrl,
              authorId: asset.authorId,
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
        setError(t('messages.errorLoading', 'Failed to load assets.'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssets();
  }, [user, t]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted">{t('hub.states.loading')}</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-danger">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <h3 className="text-xs font-semibold text-muted uppercase mb-3 px-4">
        {t('stats.assets')}
      </h3>
      {assets.length === 0 ? (
        <p className="text-sm text-muted px-4">
          {t('sidebar.noAssetsFound')}
        </p>
      ) : (
        <ul className="space-y-2">
          {assets.map(asset => {
            const title = asset.name || t('labels.untitledAsset');
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
                        <span className="text-xs text-muted">{t('sidebar.myAsset')}</span>
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
  );
}
