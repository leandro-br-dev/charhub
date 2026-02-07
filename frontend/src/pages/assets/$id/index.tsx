import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Tag as UITag, Dialog } from '../../../components/ui';
import { AgeRatingBadge } from '../../../components/ui/AgeRatingBadge';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { useAssetDetailQuery, useAssetMutations } from '../shared/hooks/useAssetQueries';
import { useAuth } from '../../../hooks/useAuth';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';
import { Visibility } from '../../../types/common';
import type { Asset, AssetImage } from '../../../types/assets';
import type { ContentTag } from '../../../types/characters';

export default function AssetDetailPage(): JSX.Element {
  const { t } = useTranslation(['assets', 'common']);
  const navigate = useNavigate();
  const params = useParams<{ assetId: string }>();
  const assetId = params.assetId ?? '';
  const { user } = useAuth();
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  const { data, isLoading, isError } = useAssetDetailQuery(assetId);
  const { deleteMutation } = useAssetMutations();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const asset = data;

  const isOwner = useMemo(() => {
    if (!user || !asset) return false;
    return user.id === asset.authorId;
  }, [user, asset]);

  const visibilityLabel = useMemo(() => {
    if (!asset) return '';
    switch (asset.visibility) {
      case Visibility.PUBLIC:
        return t('assets:labels.public');
      case Visibility.PRIVATE:
        return t('assets:labels.private');
      case Visibility.UNLISTED:
        return t('assets:labels.unlisted');
      default:
        return asset.visibility;
    }
  }, [asset, t]);

  // Set page title
  useEffect(() => {
    if (asset) {
      setTitle(asset.name || t('assets:labels.untitledAsset'));
    }
  }, [setTitle, asset, t]);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!asset) return;
    try {
      await deleteMutation.mutateAsync(asset.id);
      addToast(t('assets:messages.deleted'), 'success');
      navigate('/assets/hub');
    } catch (error) {
      console.error('[AssetDetail] delete failed', error);
      addToast(t('assets:messages.errorDeleting'), 'error');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: asset?.name || t('assets:labels.untitledAsset'),
        text: asset?.description || '',
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        addToast(t('common:messages.linkCopied'), 'success');
      });
    } else {
      navigator.clipboard.writeText(url);
      addToast(t('common:messages.linkCopied'), 'success');
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('assets:detail.states.loading', 'Loading asset...')}</p>
      </section>
    );
  }

  if (isError || !asset) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined text-5xl text-danger">error</span>
        <p>{t('assets:detail.states.notFound', 'Asset not found')}</p>
        <Button type="button" onClick={() => navigate('/assets/hub')} icon="arrow_back">
          {t('assets:detail.actions.backToHub', 'Back to Assets')}
        </Button>
      </section>
    );
  }

  const imageCount = asset.images?.length ?? 0;
  const linkedCharacterCount = asset.characterAssets?.length ?? 0;

  return (
    <>
      <div className="-mx-4 -mt-8 md:mx-auto md:mt-0 md:max-w-7xl">
        <div className="grid gap-0 md:gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left side - Asset image */}
          <div className="w-full space-y-4 md:w-full">
            <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg border-2 border-border">
              <div className="relative aspect-[3/4] md:aspect-[3/4] w-full rounded-2xl overflow-hidden">
                {asset.previewImageUrl ? (
                  <CachedImage
                    src={asset.previewImageUrl}
                    alt={asset.name || t('assets:labels.untitledAsset')}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl">
                    <span className="material-symbols-outlined text-9xl text-muted/30">inventory_2</span>
                  </div>
                )}

                {/* Favorite button - top right corner of image */}
                <div className="absolute top-3 right-3 z-10">
                  <FavoriteButton assetId={asset.id} size="medium" />
                </div>

                {/* Gradient fade overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
              </div>
            </div>
          </div>

          {/* Right side - Asset info */}
          <div className="relative z-10 -mt-12 space-y-4 md:mt-0">
            {/* Title and stats */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-title lg:text-4xl">
                  {asset.name || t('assets:labels.untitledAsset')}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                    aria-label="Share asset"
                  >
                    <span className="material-symbols-outlined text-xl">share</span>
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => navigate(`/assets/${asset.id}/edit`)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                        aria-label="Edit asset"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        disabled={deleteMutation.isPending}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        aria-label="Delete asset"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6 flex flex-wrap gap-2">
                {/* Visibility badge */}
                <UITag
                  label={visibilityLabel}
                  tone="secondary"
                  selected
                  disabled
                />

                {/* Type badge */}
                <UITag
                  label={t(`assets:types.${asset.type}`, asset.type)}
                  tone="secondary"
                  selected
                  disabled
                />

                {/* Category badge */}
                <UITag
                  label={t(`assets:categories.${asset.category}`, asset.category)}
                  tone="secondary"
                  selected
                  disabled
                />

                {/* Age rating badge */}
                <AgeRatingBadge
                  ageRating={asset.ageRating}
                  variant="inline"
                  size="md"
                />

                {/* Content tags */}
                {asset.contentTags && asset.contentTags.length > 0 && asset.contentTags.map((ct: ContentTag) => (
                  <UITag
                    key={ct}
                    label={t(`assets:contentTags.${ct}`)}
                    tone="secondary"
                    selected
                    disabled
                  />
                ))}
              </div>

              {/* Stats row */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-content">
                    {imageCount}
                  </div>
                  <div className="text-sm text-muted">
                    {imageCount === 1 ? t('assets:stats.images') : t('assets:stats.images_plural')}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">
                    {linkedCharacterCount}
                  </div>
                  <div className="text-sm text-muted">
                    {linkedCharacterCount === 1 ? t('assets:stats.characters') : t('assets:stats.characters_plural')}
                  </div>
                </div>
              </div>

              {/* Action button */}
              {isOwner && (
                <Button
                  type="button"
                  variant="primary"
                  icon="edit"
                  onClick={() => navigate(`/assets/${asset.id}/edit`)}
                  className="w-full !rounded-xl !py-4 text-lg font-semibold shadow-lg transition-all hover:shadow-xl"
                >
                  {t('assets:detail.actions.edit', 'Edit Asset')}
                </Button>
              )}
            </div>

            {/* Description */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold text-title">
                {t('assets:detail.sections.description', 'Description')}
              </h2>
              <div className="space-y-4 text-sm leading-relaxed text-content">
                <p className="whitespace-pre-line text-content/80">{asset.description}</p>
              </div>
            </div>

            {/* Classification */}
            {(asset.style || asset.type || asset.category) && (
              <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('assets:detail.sections.classification', 'Classification')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {asset.type && (
                    <div>
                      <div className="text-sm text-muted">{t('assets:form.fields.type')}</div>
                      <div className="font-medium text-content">{t(`assets:types.${asset.type}`, asset.type)}</div>
                    </div>
                  )}
                  {asset.category && (
                    <div>
                      <div className="text-sm text-muted">{t('assets:form.fields.category')}</div>
                      <div className="font-medium text-content">{t(`assets:categories.${asset.category}`, asset.category)}</div>
                    </div>
                  )}
                  {asset.style && (
                    <div>
                      <div className="text-sm text-muted">{t('assets:form.fields.style')}</div>
                      <div className="font-medium text-content">{t(`assets:styles.${asset.style}`, asset.style)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Images preview */}
            {asset.images && asset.images.length > 0 && (
              <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-title">
                    {t('assets:detail.sections.images', 'Images')}
                  </h2>
                  <span className="text-sm text-muted">{asset.images.length}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {asset.images.slice(0, 6).map((image: AssetImage) => (
                    <div
                      key={image.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-background"
                    >
                      <CachedImage
                        src={image.imageUrl}
                        alt={t('assets:detail.labels.image')}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                  {asset.images.length > 6 && (
                    <div className="flex items-center justify-center rounded-lg bg-background text-muted">
                      <span className="text-sm">+{asset.images.length - 6}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Creator + Metadata */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-8 md:divide-x md:divide-border">
                {/* Creator info */}
                <div className="flex items-center gap-3 md:pr-6 min-w-0">
                  {asset.author?.avatarUrl ? (
                    <CachedImage
                      src={asset.author.avatarUrl}
                      alt={asset.author.username || asset.author.displayName || 'Creator'}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-base font-semibold text-primary">
                        {(asset.author?.username || asset.author?.displayName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted">{t('assets:detail.labels.createdBy', 'Created by')}</p>
                    <p className="font-medium text-content">
                      {asset.author?.username || t('common:anonymousUser', 'Anonymous')}
                    </p>
                  </div>
                </div>

                {/* Metadata (created/updated) */}
                <div className="min-w-0 md:pl-6">
                  <div className="space-y-2 text-sm text-content">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">event</span>
                      <span>
                        {t('assets:detail.labels.createdAt', 'Created')}: {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">update</span>
                      <span>
                        {t('assets:detail.labels.updatedAt', 'Updated')}: {asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t('assets:detail.confirmDelete.title', 'Delete Asset?')}
        description={t('assets:form.assetDeleteConfirm', 'Are you sure you want to delete this asset? This cannot be undone.')}
        severity="critical"
        actions={[
          {
            label: t('assets:detail.confirmDelete.cancel', 'Cancel'),
            onClick: () => setShowDeleteDialog(false),
          },
          {
            label: deleteMutation.isPending
              ? t('assets:detail.actions.deleting', 'Deleting...')
              : t('assets:detail.confirmDelete.confirm', 'Delete'),
            onClick: handleDeleteConfirm,
            disabled: deleteMutation.isPending,
          },
        ]}
      />
    </>
  );
}
