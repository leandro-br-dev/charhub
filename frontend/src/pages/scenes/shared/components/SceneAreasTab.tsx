import { useTranslation } from 'react-i18next';
import { useState, useCallback, useEffect } from 'react';
import { Dialog } from '../../../../components/ui/Dialog';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../contexts/ToastContext';
import { sceneService } from '../../../../services/sceneService';
import type { SceneArea, SceneAreaImage, SceneAreaImageType } from '../../../../types/scenes';
import { SceneImageUploader } from './SceneImageUploader';

interface SceneAreasTabProps {
  sceneId?: string;
}

interface NewAreaForm {
  name: string;
  description: string;
  shortDescription: string;
}

export function SceneAreasTab({ sceneId }: SceneAreasTabProps): JSX.Element {
  const { t } = useTranslation(['scenes', 'common']);
  const { addToast } = useToast();
  const [areas, setAreas] = useState<SceneArea[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [areaImages, setAreaImages] = useState<Record<string, SceneAreaImage[]>>({});
  const [showAddAreaForm, setShowAddAreaForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
  const [isUploadingArea, setIsUploadingArea] = useState<string | null>(null);
  const [deleteAreaDialogOpen, setDeleteAreaDialogOpen] = useState<string | null>(null);
  const [deleteImageDialogOpen, setDeleteImageDialogOpen] = useState<string | null>(null);

  // Form state for new area
  const [newAreaForm, setNewAreaForm] = useState<NewAreaForm>({
    name: '',
    description: '',
    shortDescription: '',
  });

  // Selected image type and caption for each area
  const [selectedImageTypes, setSelectedImageTypes] = useState<Record<string, SceneAreaImageType>>({});
  const [areaCaptions, setAreaCaptions] = useState<Record<string, string>>({});

  // Image type options
  const imageTypes: SceneAreaImageType[] = ['ENVIRONMENT', 'MAP', 'DETAIL', 'PANORAMA', 'MISC'];

  // Load areas when sceneId is available
  const loadAreas = useCallback(async () => {
    if (!sceneId) return;
    try {
      const data = await sceneService.listSceneAreas(sceneId);
      setAreas(data);

      // Load images for all areas immediately
      for (const area of data) {
        try {
          const images = await sceneService.listAreaImages(sceneId, area.id);
          setAreaImages(prev => ({ ...prev, [area.id]: images }));
        } catch (error) {
          console.error(`[SceneAreasTab] Failed to load images for area ${area.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[SceneAreasTab] Failed to load areas:', error);
    }
  }, [sceneId]);

  // Load areas and images on mount
  useEffect(() => {
    if (sceneId) {
      loadAreas();
    }
  }, [sceneId, loadAreas]);

  const handleCreateArea = async () => {
    if (!sceneId) return;

    const { name, description, shortDescription } = newAreaForm;

    if (!name.trim() || !description.trim()) {
      addToast(t('scenes:validation.areaNameRequired'), 'error');
      return;
    }

    setIsCreating(true);
    try {
      const newArea = await sceneService.addArea(sceneId, {
        name: name.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim() || undefined,
        displayOrder: areas.length,
        isAccessible: true,
      });

      setAreas(prev => [...prev, newArea]);
      setShowAddAreaForm(false);
      addToast(t('scenes:messages.areaCreated'), 'success');

      // Reset form
      setNewAreaForm({ name: '', description: '', shortDescription: '' });
    } catch (error) {
      console.error('[SceneAreasTab] Create area failed:', error);
      addToast(t('scenes:areas.createFailed'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAreaClick = (areaId: string) => {
    setDeleteAreaDialogOpen(areaId);
  };

  const handleDeleteAreaConfirm = async () => {
    const areaId = deleteAreaDialogOpen;
    if (!areaId) return;

    setIsDeleting(areaId);
    setDeleteAreaDialogOpen(null);

    try {
      await sceneService.deleteSceneArea(areaId);
      setAreas(prev => prev.filter(area => area.id !== areaId));
      setAreaImages(prev => {
        const next = { ...prev };
        delete next[areaId];
        return next;
      });
      setSelectedImageTypes(prev => {
        const next = { ...prev };
        delete next[areaId];
        return next;
      });
      setAreaCaptions(prev => {
        const next = { ...prev };
        delete next[areaId];
        return next;
      });
      addToast(t('scenes:areas.deleteSuccess'), 'success');
    } catch (error) {
      console.error('[SceneAreasTab] Delete area failed:', error);
      addToast(t('scenes:areas.deleteFailed'), 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUploadAreaImageComplete = (areaId: string) => (imageUrl: string, imageType: string, uploadedCaption?: string) => {
    setAreaImages(prev => ({
      ...prev,
      [areaId]: [...(prev[areaId] || []), {
        id: `temp-${Date.now()}`,
        areaId,
        imageUrl,
        imageType: imageType as SceneAreaImageType,
        caption: uploadedCaption || areaCaptions[areaId] || null,
        createdAt: new Date().toISOString(),
      }],
    }));
    // Clear caption after upload
    setAreaCaptions(prev => ({ ...prev, [areaId]: '' }));
  };

  const handleDeleteImageClick = (imageId: string) => {
    setDeleteImageDialogOpen(imageId);
  };

  const handleDeleteImageConfirm = async () => {
    const imageId = deleteImageDialogOpen;
    if (!imageId) return;

    setIsDeletingImage(imageId);
    setDeleteImageDialogOpen(null);

    try {
      await sceneService.deleteAreaImage(imageId);
      setAreaImages(prev => {
        const next = { ...prev };
        for (const areaId in next) {
          next[areaId] = next[areaId]?.filter(img => img.id !== imageId) || [];
        }
        return next;
      });
      addToast(t('scenes:images.imageDeleted'), 'success');
    } catch (error) {
      console.error('[SceneAreasTab] Delete area image failed:', error);
      addToast(t('scenes:images.deleteFailed'), 'error');
    } finally {
      setIsDeletingImage(null);
    }
  };

  const toggleAreaExpanded = async (areaId: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(areaId)) {
      newExpanded.delete(areaId);
    } else {
      newExpanded.add(areaId);
      // Initialize selected image type and caption if not exists
      if (!selectedImageTypes[areaId]) {
        setSelectedImageTypes(prev => ({ ...prev, [areaId]: 'ENVIRONMENT' }));
      }
      if (areaCaptions[areaId] === undefined) {
        setAreaCaptions(prev => ({ ...prev, [areaId]: '' }));
      }
    }
    setExpandedAreas(newExpanded);
  };

  const areaToDelete = areas.find(area => area.id === deleteAreaDialogOpen);
  const imageToDelete = Object.values(areaImages).flat().find(img => img.id === deleteImageDialogOpen);

  if (!sceneId) {
    return (
      <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-title">
            {t('scenes:areas.title')}
          </h2>
          <p className="mt-2 text-sm text-description">
            {t('scenes:form.sections.areasHint')}
          </p>
        </div>
        <div className="rounded-lg bg-normal/50 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-muted">location_off</span>
          <p className="mt-3 text-sm text-content">
            {t('scenes:form.areas.comingSoon', 'Save the scene first to add areas')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-title">
            {t('scenes:areas.title')}
          </h2>
          <p className="mt-2 text-sm text-description">
            {t('scenes:form.sections.areasHint')}
          </p>
        </div>
        <Button
          type="button"
          variant="light"
          size="small"
          icon="add_location"
          onClick={() => setShowAddAreaForm(!showAddAreaForm)}
        >
          {t('scenes:areas.addArea')}
        </Button>
      </div>

      {/* Add area form */}
      {showAddAreaForm && (
        <div className="rounded-lg bg-normal/50 p-4 space-y-4">
          <h3 className="font-medium text-content">
            {t('scenes:areas.addArea')}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm sm:col-span-2">
              <span className="font-medium text-content">
                {t('scenes:areas.areaName')}
              </span>
              <input
                type="text"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={t('scenes:areas.areaNamePlaceholder') ?? ''}
                value={newAreaForm.name}
                onChange={(e) => setNewAreaForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm sm:col-span-2">
              <span className="font-medium text-content">
                {t('scenes:areas.description')}
              </span>
              <textarea
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={t('scenes:areas.descriptionPlaceholder') ?? ''}
                rows={3}
                value={newAreaForm.description}
                onChange={(e) => setNewAreaForm(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm sm:col-span-2">
              <span className="font-medium text-content">
                {t('scenes:areas.shortDescription')}
              </span>
              <input
                type="text"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder={t('scenes:areas.shortDescriptionPlaceholder') ?? ''}
                value={newAreaForm.shortDescription}
                onChange={(e) => setNewAreaForm(prev => ({ ...prev, shortDescription: e.target.value }))}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleCreateArea}
              disabled={isCreating}
            >
              {isCreating ? t('scenes:labels.submitting') : t('scenes:areas.addArea')}
            </Button>
            <Button
              type="button"
              variant="light"
              size="small"
              onClick={() => {
                setShowAddAreaForm(false);
                setNewAreaForm({ name: '', description: '', shortDescription: '' });
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {areas.length === 0 ? (
        <div className="rounded-lg bg-normal/50 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-muted">place</span>
          <p className="mt-3 text-sm text-content">
            {t('scenes:areas.noAreas')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {areas.map(area => {
            const isExpanded = expandedAreas.has(area.id);
            const images = areaImages[area.id] || [];
            const selectedImageType = selectedImageTypes[area.id] || 'ENVIRONMENT';
            const areaCaption = areaCaptions[area.id] || '';

            return (
              <div
                key={area.id}
                className="rounded-lg border border-border overflow-hidden bg-card"
              >
                {/* Area header */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-normal/30 transition-colors"
                  onClick={() => toggleAreaExpanded(area.id)}
                >
                  <span className="material-symbols-outlined text-muted">
                    {isExpanded ? 'expand_more' : 'chevron_right'}
                  </span>

                  {images.length > 0 && images[0] && (
                    <img
                      src={images[0].imageUrl}
                      alt={area.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-content truncate">
                      {area.name}
                    </h3>
                    {area.shortDescription && (
                      <p className="text-xs text-muted truncate">
                        {area.shortDescription}
                      </p>
                    )}
                  </div>

                  <span className="text-xs text-muted">
                    {images.length} {images.length === 1 ? 'image' : 'images'}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAreaClick(area.id);
                    }}
                    disabled={isDeleting === area.id}
                    className="rounded-full p-1 text-muted hover:text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border p-3 space-y-4">
                    {area.description && (
                      <div>
                        <h4 className="text-sm font-medium text-content mb-1">
                          {t('scenes:areas.description')}
                        </h4>
                        <p className="text-sm text-description">
                          {area.description}
                        </p>
                      </div>
                    )}

                    {/* Image upload form */}
                    <div className="rounded-lg bg-normal/50 p-4 space-y-4">
                      <h4 className="text-sm font-medium text-content">
                        {t('scenes:areas.images')}
                      </h4>

                      <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto] items-end">
                        {/* Type selector */}
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-medium text-content">
                            {t('scenes:images.selectType')}
                          </span>
                          <select
                            value={selectedImageType}
                            onChange={(e) => setSelectedImageTypes(prev => ({
                              ...prev,
                              [area.id]: e.target.value as SceneAreaImageType,
                            }))}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          >
                            {imageTypes.map(type => (
                              <option key={type} value={type}>
                                {t(`scenes:areaImageTypes.${type}`)}
                              </option>
                            ))}
                          </select>
                        </label>

                        {/* Caption input */}
                        <label className="flex flex-col gap-2 text-sm">
                          <span className="font-medium text-content">
                            {t('scenes:images.caption')}
                          </span>
                          <input
                            type="text"
                            value={areaCaption}
                            onChange={(e) => setAreaCaptions(prev => ({
                              ...prev,
                              [area.id]: e.target.value,
                            }))}
                            placeholder={t('scenes:images.captionPlaceholder') ?? ''}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </label>

                        {/* Add button */}
                        <SceneImageUploader
                          sceneId={sceneId}
                          areaId={area.id}
                          imageType={selectedImageType}
                          caption={areaCaption}
                          setCaption={(value) => setAreaCaptions(prev => ({ ...prev, [area.id]: value }))}
                          onUploadComplete={handleUploadAreaImageComplete(area.id)}
                          isUploading={isUploadingArea === area.id}
                          setIsUploading={(value) => setIsUploadingArea(value ? area.id : null)}
                        />
                      </div>
                    </div>

                    {/* Images list */}
                    {images.length === 0 ? (
                      <p className="text-xs text-muted text-center py-4">
                        {t('scenes:areas.noAreaImages')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {images.map(image => (
                          <div
                            key={image.id}
                            className="flex gap-4 rounded-lg border border-border overflow-hidden bg-card hover:bg-normal/30 transition-colors"
                          >
                            {/* Image */}
                            <div className="relative flex-shrink-0">
                              <img
                                src={image.imageUrl}
                                alt={image.caption || t(`scenes:areaImageTypes.${image.imageType}`)}
                                className="w-24 h-24 object-cover"
                              />
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                    {t(`scenes:areaImageTypes.${image.imageType}`)}
                                  </span>
                                  <span className="text-xs text-muted">
                                    {new Date(image.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {image.caption && (
                                  <p className="text-sm text-content">
                                    {image.caption}
                                  </p>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteImageClick(image.id)}
                                  disabled={isDeletingImage === image.id}
                                  className="rounded-full px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm align-middle mr-1">delete</span>
                                  {t('common:delete', 'Delete')}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete area confirmation dialog */}
      <Dialog
        isOpen={deleteAreaDialogOpen !== null}
        onClose={() => setDeleteAreaDialogOpen(null)}
        title={t('scenes:areas.deleteConfirm', 'Delete this area and all its images?')}
        severity="critical"
        actions={[
          {
            label: t('common:cancel', 'Cancel'),
            onClick: () => setDeleteAreaDialogOpen(null),
            variant: 'light',
          },
          {
            label: isDeleting
              ? (t('common:deleting', 'Deleting...') as string) || 'Deleting...'
              : (t('common:delete', 'Delete') as string) || 'Delete',
            onClick: handleDeleteAreaConfirm,
            disabled: isDeleting !== null,
            variant: 'danger',
          },
        ]}
      >
        {areaToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-description">
              {t('scenes:areas.deleteAreaWarning', 'This action cannot be undone. The area and all its images will be permanently deleted.')}
            </p>
            <p className="text-sm text-content font-medium">
              {areaToDelete.name}
            </p>
          </div>
        )}
      </Dialog>

      {/* Delete image confirmation dialog */}
      <Dialog
        isOpen={deleteImageDialogOpen !== null}
        onClose={() => setDeleteImageDialogOpen(null)}
        title={t('scenes:images.deleteConfirm', 'Delete this image?')}
        severity="critical"
        actions={[
          {
            label: t('common:cancel', 'Cancel'),
            onClick: () => setDeleteImageDialogOpen(null),
            variant: 'light',
          },
          {
            label: isDeletingImage
              ? t('common:deleting', 'Deleting...')
              : t('common:delete', 'Delete'),
            onClick: handleDeleteImageConfirm,
            disabled: isDeletingImage !== null,
            variant: 'danger',
          },
        ]}
      >
        {imageToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-description">
              {t('scenes:images.deleteImageWarning', 'This action cannot be undone. The image will be permanently deleted.')}
            </p>
            {imageToDelete.caption && (
              <p className="text-sm text-content font-medium">
                {imageToDelete.caption}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
