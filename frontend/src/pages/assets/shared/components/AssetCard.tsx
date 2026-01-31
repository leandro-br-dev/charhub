import { useMemo, useState, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type AssetSummary, type Asset, ASSET_TYPE_LABELS, ASSET_CATEGORY_LABELS } from '../../../../types/assets';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { Tag as UITag } from '../../../../components/ui/Tag';

export interface AssetCardProps {
  asset: AssetSummary | Asset;
  to?: string;
  clickAction?: 'edit' | 'view';
  onDelete?: (assetId: string) => void;
  blurSensitive?: boolean;
  showActions?: boolean;
  linkedCharacterCount?: number;
  imageCount?: number;
}

export function AssetCard({
  asset,
  to,
  clickAction = 'view',
  onDelete,
  blurSensitive = false,
  showActions = true,
  linkedCharacterCount,
  imageCount,
}: AssetCardProps): JSX.Element | null {
  const { t } = useTranslation(['assets', 'common'], { useSuspense: false });
  const navigate = useNavigate();
  const destination = to ?? `/assets/${asset.id}`;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const title = useMemo(() => {
    return asset.name || t('assets:labels.untitledAsset');
  }, [asset.name, t]);

  const typeLabel = useMemo(() => {
    return ASSET_TYPE_LABELS[asset.type];
  }, [asset.type]);

  const categoryLabel = useMemo(() => {
    return ASSET_CATEGORY_LABELS[asset.category];
  }, [asset.category]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on actions
    if ((e.target as HTMLElement).closest('.asset-actions')) {
      return;
    }

    if (clickAction === 'edit') {
      startTransition(() => {
        navigate(`/assets/${asset.id}/edit`);
      });
    } else if (clickAction === 'view') {
      startTransition(() => {
        navigate(destination);
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showDeleteConfirm) {
      setIsDeleting(true);
      onDelete?.(asset.id);
    } else {
      setShowDeleteConfirm(true);
      // Auto-hide confirm after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(() => {
      navigate(`/assets/${asset.id}/edit`);
    });
  };

  const resolvedImageCount = imageCount ?? ('imageCount' in asset ? asset.imageCount : 0);
  const resolvedLinkedCount = linkedCharacterCount ?? ('linkedCharacterCount' in asset ? asset.linkedCharacterCount : 0);

  return (
    <article
      onClick={handleCardClick}
      className="flex basis-[calc(50%-0.5rem)] sm:w-[180px] md:w-[192px] lg:w-[192px] max-w-[192px] flex-none cursor-pointer flex-col overflow-hidden rounded-lg bg-light shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl self-stretch relative"
    >
      {showActions && (
        <div className="asset-actions absolute top-2 right-2 z-10 flex gap-1">
          <button
            type="button"
            onClick={handleEditClick}
            className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition"
            title={t('assets:actions.edit', 'Edit')}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`p-1.5 rounded-full transition ${
              showDeleteConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-black/50 hover:bg-black/70 text-white'
            }`}
            title={t('assets:actions.delete', 'Delete')}
          >
            {showDeleteConfirm ? (
              <span className="material-symbols-outlined text-sm">check</span>
            ) : (
              <span className="material-symbols-outlined text-sm">delete</span>
            )}
          </button>
        </div>
      )}

      <div className="relative">
        {asset.previewUrl || asset.thumbnailUrl ? (
          <CachedImage
            src={asset.previewUrl || asset.thumbnailUrl || ''}
            alt={title}
            loading="lazy"
            className={`h-40 w-full rounded-t-lg object-cover ${blurSensitive ? 'blur-sm brightness-75' : ''}`}
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-slate-100 text-6xl text-slate-400 dark:bg-slate-800 dark:text-slate-600">
            <span className="material-symbols-outlined text-6xl">image</span>
          </div>
        )}

        {/* Asset type badge */}
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {typeLabel}
        </div>

        {isDeleting && (
          <div className="absolute inset-0 rounded-t-lg bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold text-content" title={title}>
          {title}
        </h3>

        <p className="text-xs text-muted truncate mb-2">
          {categoryLabel}
        </p>

        {asset.description && (
          <p className={`text-sm text-description line-clamp-2 mb-2 ${blurSensitive ? 'blur-sm select-none' : ''}`}>
            {asset.description}
          </p>
        )}

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {asset.tags.slice(0, 3).map((tag, index) => (
              <UITag
                key={`${tag}-${index}`}
                label={tag}
                tone="default"
                selected
                disabled
                className="text-xs"
              />
            ))}
            {asset.tags.length > 3 && (
              <span className="text-xs text-muted">
                +{asset.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <div className="flex items-center gap-1" title={t('assets:labels.characters', 'Characters')}>
            <span className="material-symbols-outlined text-base">person</span>
            <span>{resolvedLinkedCount}</span>
          </div>
          <div className="flex items-center gap-1" title={t('assets:labels.images', 'Images')}>
            <span className="material-symbols-outlined text-base">photo_library</span>
            <span>{resolvedImageCount}</span>
          </div>
          <div className="flex items-center gap-1" title={t('assets:labels.format', 'Format')}>
            <span className="material-symbols-outlined text-base">extension</span>
            <span className="uppercase">{asset.format || '—'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
