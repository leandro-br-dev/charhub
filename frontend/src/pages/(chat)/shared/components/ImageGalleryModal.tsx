import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../../../components/ui/Tabs';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { characterService } from '../../../../services/characterService';

interface CharacterData {
  id: string;
  name: string;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  mode?: 'view' | 'select';
  imageUrls?: string[];
  loading?: boolean;
  error?: string | null;
  onImageSelect?: (url: string) => void;
  onUpload?: (file: File) => void;
  /**
   * Character-based gallery mode (new feature)
   */
  characters?: CharacterData[];
  /**
   * Legacy props kept for compatibility. They are ignored but prevent
   * React from forwarding them to DOM nodes, solving the warnings that
   * started this fix.
   */
  characterId?: string | null;
  conversationId?: string | null;
  participants?: Array<unknown>;
  initialImageType?: string | null;
}

interface ImageGalleryGridProps {
  images: string[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  onImageClick: (url: string, index: number) => void;
}

const ImageGalleryGrid = ({ images, loading, error, emptyLabel, onImageClick }: ImageGalleryGridProps) => {
  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">Loading images...</p>;
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-danger">{error}</p>;
  }

  if (!images.length) {
    return <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((url, index) => (
        <button
          key={url + index}
          type="button"
          className="group relative overflow-hidden rounded-lg border border-normal/30 bg-light shadow-sm transition hover:shadow-md"
          onClick={() => onImageClick(url, index)}
        >
          <CachedImage
            src={url}
            alt="Gallery asset"
            className="h-40 w-full object-cover transition duration-200 group-hover:scale-105"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
};

export default function ImageGalleryModal({
  isOpen,
  onClose,
  title,
  mode = 'view',
  imageUrls,
  loading = false,
  error = null,
  onImageSelect,
  onUpload,
  characters,
}: ImageGalleryModalProps) {
  const { t } = useTranslation(['imageGallery', 'common']);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [characterImages, setCharacterImages] = useState<Record<string, string[]>>({});
  const [loadingCharacters, setLoadingCharacters] = useState<Record<string, boolean>>({});
  const [characterErrors, setCharacterErrors] = useState<Record<string, string | null>>({});

  const images = useMemo(() => imageUrls ?? [], [imageUrls]);
  const computedTitle = title ?? t('imageGallery:title');
  const useCharacterMode = !!(characters && characters.length > 0);

  // Fetch character images when in character mode
  useEffect(() => {
    if (!isOpen || !useCharacterMode) return;

    const fetchCharacterImages = async () => {
      for (const character of characters!) {
        setLoadingCharacters(prev => ({ ...prev, [character.id]: true }));
        setCharacterErrors(prev => ({ ...prev, [character.id]: null }));

        try {
          const images = await characterService.getCharacterImages(character.id);
          setCharacterImages(prev => ({
            ...prev,
            [character.id]: images.map(img => img.url)
          }));
        } catch (err) {
          console.error(`[ImageGalleryModal] Failed to fetch images for character ${character.id}:`, err);
          setCharacterErrors(prev => ({
            ...prev,
            [character.id]: t('imageGallery:errorLoadingImages', 'Failed to load images')
          }));
          setCharacterImages(prev => ({ ...prev, [character.id]: [] }));
        } finally {
          setLoadingCharacters(prev => ({ ...prev, [character.id]: false }));
        }
      }
    };

    fetchCharacterImages();
  }, [isOpen, useCharacterMode, characters, t]);

  const handleImageClick = (url: string, index: number) => {
    if (mode === 'select' && onImageSelect) {
      onImageSelect(url);
      // Don't close the gallery here - let the parent handle closing
      // This allows the parent to set up image viewer before closing
    } else {
      setViewerIndex(index);
    }
  };

  const handleUploadClick = () => {
    if (!onUpload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (file) {
        onUpload(file);
      }
    };
    input.click();
  };

  const handleViewerClose = () => setViewerIndex(null);

  // Render character-based gallery with tabs
  if (useCharacterMode) {
    const defaultTab = characters![0]?.id || '';

    return (
      <>
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={computedTitle}
          size="xl"
          className="!max-w-5xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="text-sm text-muted">
              {t('imageGallery:selectCharacterImages', 'Select images from character gallery')}
            </div>
          </div>

          <Tabs defaultTab={defaultTab}>
            <TabList>
              {characters!.map(character => (
                <Tab key={character.id} label={character.id}>
                  {character.name}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              {characters!.map(character => (
                <TabPanel key={character.id} label={character.id}>
                  <ImageGalleryGrid
                    images={characterImages[character.id] || []}
                    loading={loadingCharacters[character.id] || false}
                    error={characterErrors[character.id]}
                    emptyLabel={t('imageGallery:noImages')}
                    onImageClick={handleImageClick}
                  />
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Modal>

        {viewerIndex !== null && (() => {
          // Find the image across all characters
          const allImages = Object.values(characterImages).flat();
          return allImages[viewerIndex] ? (
            <Modal
              isOpen={viewerIndex !== null}
              onClose={handleViewerClose}
              title={t('imageGallery:title')}
              size="xl"
              className="!max-w-5xl"
            >
              <div className="flex flex-col items-center justify-center">
                <CachedImage
                  src={allImages[viewerIndex]}
                  alt={t('imageGallery:title')}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
                />
              </div>
            </Modal>
          ) : null;
        })()}
      </>
    );
  }

  // Original simple gallery mode (backward compatible)
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={computedTitle}
        size="xl"
        className="!max-w-5xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="text-sm text-muted">
            {loading
              ? t('imageGallery:loading')
              : images.length
                ? t('imageGallery:title')
                : t('imageGallery:noImages')}
          </div>
          {onUpload && (
            <Button variant="secondary" size="small" icon="upload_file" onClick={handleUploadClick}>
              {t('imageGallery:upload')}
            </Button>
          )}
        </div>

        <ImageGalleryGrid
          images={images}
          loading={loading}
          error={error}
          emptyLabel={t('imageGallery:noImages')}
          onImageClick={handleImageClick}
        />
      </Modal>

      {viewerIndex !== null && images[viewerIndex] ? (
        <Modal
          isOpen={viewerIndex !== null}
          onClose={handleViewerClose}
          title={t('imageGallery:title')}
          size="xl"
          className="!max-w-5xl"
        >
          <div className="flex flex-col items-center justify-center">
            <CachedImage
              src={images[viewerIndex]}
              alt={t('imageGallery:title')}
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
